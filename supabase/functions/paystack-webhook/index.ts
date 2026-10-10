// supabase/functions/paystack-webhook/index.ts
//
// Authoritative Server-to-Server Paystack Webhook Handler for EventRally.
//
// Security & Invariants:
//   1. Cryptographic Authentication: Verifies the HMAC SHA-512 signature in
//      `x-paystack-signature` using the server-only `PAYSTACK_SECRET_KEY`. Unsigned or
//      invalid signatures are rejected with HTTP 401.
//   2. Atomic & Idempotent: Delegates finalization to the database RPC
//      `finalize_order_payment`, which holds row locks, verifies currency and amount,
//      increments stock, and issues tickets in a single PostgreSQL transaction.
//   3. Dual-Trigger Resilient: If the browser callback finalized the order first,
//      this webhook safely acknowledges it as already completed. If the browser closed
//      before callback, this webhook finalizes the order and issues tickets.
//   4. Cross-Service Isolation: Validates that metadata.purpose matches 'event_ticket'
//      to prevent SMS wallet transactions from issuing event tickets.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

/**
 * Computes the HMAC SHA-512 hex digest of the raw payload using Web Crypto API.
 */
async function verifyPaystackSignature(rawBody: string, signature: string, secretKey: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      encoder.encode(rawBody)
    );
    const hashHex = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return hashHex.toLowerCase() === signature.trim().toLowerCase();
  } catch (err) {
    console.error("Signature verification exception:", err);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!PAYSTACK_SECRET_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("paystack-webhook: Missing critical server configuration");
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 1. Read raw body as text for HMAC validation
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature") || "";

  if (!signature) {
    console.warn("paystack-webhook: Request missing x-paystack-signature header");
    return new Response(JSON.stringify({ error: "Missing signature header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const isValidSignature = await verifyPaystackSignature(rawBody, signature, PAYSTACK_SECRET_KEY);
  if (!isValidSignature) {
    console.error("paystack-webhook: Invalid webhook signature received!");
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2. Parse authenticated payload
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch (_e) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const eventName = payload?.event;
  const eventData = payload?.data;

  console.log(`paystack-webhook: Authenticated event received: ${eventName}, ref=${eventData?.reference}`);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 3. Handle charge.success
  if (eventName === "charge.success" && eventData?.status === "success") {
    const reference = eventData.reference;
    const gatewayId = String(eventData.id || "");
    const amountKobo = Number(eventData.amount) || 0;
    const currency = eventData.currency || "NGN";
    const feesKobo = Number(eventData.fees) || 0;
    const metadata = eventData.metadata || {};
    const purpose = metadata.purpose;

    // Isolate Event Tickets from SMS Wallet or external transactions
    if (purpose === "event_ticket" || reference.startsWith("EVR-")) {
      console.log(`paystack-webhook: Finalizing event ticket order for ref: ${reference}`);

      try {
        const { data: rpcResult, error: rpcError } = await admin.rpc("finalize_order_payment", {
          p_payment_reference: reference,
          p_gateway_transaction_id: gatewayId,
          p_gateway_amount_kobo: amountKobo,
          p_gateway_currency: currency,
          p_gateway_fee_kobo: feesKobo,
          p_actor_type: "webhook",
        });

        if (rpcError) {
          console.error("paystack-webhook: finalize_order_payment RPC error:", rpcError);
          // Return 200 so Paystack does not retry business logic exceptions indefinitely,
          // but log to audit log for admin review
          await admin.from("financial_audit_logs").insert({
            entity_type: "order",
            entity_id: reference,
            action: "WEBHOOK_FINALIZATION_ERROR",
            actor_type: "webhook",
            reference,
            metadata: { error: rpcError.message, payload: eventData },
          });
          return new Response(JSON.stringify({ ok: false, error: rpcError.message }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log("paystack-webhook: Order finalization result:", rpcResult);

        // Dispatch ticket delivery email if new tickets were created
        if (rpcResult?.ok && Array.isArray(rpcResult?.ticket_ids) && rpcResult.ticket_ids.length > 0) {
          const firstTicketId = rpcResult.ticket_ids[0];
          try {
            await admin.functions.invoke("send-ticket", {
              body: { registrationId: firstTicketId, paymentReference: reference },
            });
          } catch (dispatchErr) {
            console.warn("paystack-webhook: Ticket email dispatch deferred:", dispatchErr);
          }
        }

        return new Response(JSON.stringify({ ok: true, processed: true, result: rpcResult }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err: any) {
        console.error("paystack-webhook: Unexpected processing error:", err);
        return new Response(JSON.stringify({ ok: false, error: err.message }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (
      reference.startsWith("SMS-WALLET-") ||
      purpose === "SMS Messaging Wallet Top-up" ||
      metadata?.custom_fields?.some((f: any) => f.variable_name === "sms_units")
    ) {
      console.log(`paystack-webhook: Processing SMS wallet top-up for ref: ${reference}`);

      try {
        // Resolve Organiser ID from metadata custom_fields or customer email lookup
        let organiserId = metadata?.custom_fields?.find(
          (f: any) => f.variable_name === "organiser_id"
        )?.value;

        if (!organiserId && eventData.customer?.email) {
          const { data: profile } = await admin
            .from("profiles")
            .select("id")
            .ilike("email", eventData.customer.email.trim())
            .maybeSingle();
          if (profile?.id) {
            organiserId = profile.id;
          }
        }

        if (!organiserId) {
          console.error(`paystack-webhook: Unable to resolve organiser ID for SMS wallet ref: ${reference}`);
          await admin.from("financial_audit_logs").insert({
            entity_type: "wallet",
            entity_id: reference,
            action: "WEBHOOK_WALLET_UNRESOLVED_ORGANISER",
            actor_type: "webhook",
            reference,
            metadata: { error: "Missing organiser_id", payload: eventData },
          });
          return new Response(JSON.stringify({ ok: false, error: "Unresolved organiser" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Amount in Naira (Paystack returns amount in kobo)
        const amountPaidNaira = Math.floor(amountKobo / 100);
        if (amountPaidNaira <= 0) {
          return new Response(JSON.stringify({ ok: false, error: "Invalid amount" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Units added from metadata or tiered pricing
        let unitsAdded = 0;
        const metaUnits = metadata?.custom_fields?.find(
          (f: any) => f.variable_name === "sms_units"
        )?.value;
        if (metaUnits && !isNaN(Number(metaUnits)) && Number(metaUnits) > 0) {
          unitsAdded = Math.floor(Number(metaUnits));
        } else {
          const fallbackRate = amountPaidNaira > 4000 ? 8 : amountPaidNaira > 900 ? 9 : 10;
          unitsAdded = Math.floor(amountPaidNaira / fallbackRate);
        }

        // Call atomic database RPC: idempotent and concurrency-safe
        const { data: rpcResult, error: rpcError } = await admin.rpc("credit_sms_wallet", {
          p_organiser_id: organiserId,
          p_amount: amountPaidNaira,
          p_reference: reference.trim(),
          p_units: unitsAdded,
          p_source: "paystack_webhook",
        });

        if (rpcError) {
          console.error("paystack-webhook: credit_sms_wallet RPC error:", rpcError);
          await admin.from("financial_audit_logs").insert({
            entity_type: "wallet",
            entity_id: organiserId,
            action: "WEBHOOK_WALLET_CREDIT_ERROR",
            actor_type: "webhook",
            reference,
            metadata: { error: rpcError.message, payload: eventData },
          });
          return new Response(JSON.stringify({ ok: false, error: rpcError.message }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log(`paystack-webhook: SMS wallet credit result for ref ${reference}:`, rpcResult);

        return new Response(JSON.stringify({ ok: true, processed: true, result: rpcResult }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err: any) {
        console.error("paystack-webhook: SMS wallet processing error:", err);
        return new Response(JSON.stringify({ ok: false, error: err.message }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.log(`paystack-webhook: Ignored non-ticket/non-wallet purpose: ${purpose}, ref=${reference}`);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
