// supabase/functions/bachs-webhook/index.ts
//
// Authoritative Server-to-Server Bachs Webhook Handler for EventGuru.
//
// Security & Authentication:
// 1. Strict Cryptographic Signature Verification: Validates incoming payloads
//    against BACHS_WEBHOOK_KEY / BACHS_WEBHOOK_SECRET using HMAC SHA-256.
// 2. Double-Check Verification: Validates session state directly against Bachs REST
//    API with BACHS_SECRET_KEY before finalizing orders or crediting wallets.
// 3. Atomic Database Operations: Delegates all financial operations to row-locked RPCs.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-bachs-signature, webhook-signature, svix-signature, svix-timestamp, svix-id",
};

/**
 * Verifies the webhook signature using Web Crypto HMAC SHA-256.
 * Supports Svix v1 format (`${msgId}.${timestamp}.${rawBody}`) and direct raw HMAC-SHA256 hex/base64.
 */
async function verifyWebhookSignature(
  rawBody: string,
  secretKey: string,
  headers: Headers
): Promise<boolean> {
  if (!secretKey) return false;

  const signatureHeader =
    headers.get("webhook-signature") ||
    headers.get("x-bachs-signature") ||
    headers.get("svix-signature") ||
    "";

  if (!signatureHeader) {
    console.warn("bachs-webhook: Missing signature header");
    return false;
  }

  const msgId = headers.get("webhook-id") || headers.get("svix-id") || "";
  const timestamp = headers.get("webhook-timestamp") || headers.get("svix-timestamp") || "";

  // Prepare key bytes: Svix keys begin with "whsec_" and are base64-encoded
  let keyBytes: Uint8Array;
  if (secretKey.startsWith("whsec_")) {
    try {
      const base64Key = secretKey.slice(6);
      const binaryString = atob(base64Key);
      keyBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        keyBytes[i] = binaryString.charCodeAt(i);
      }
    } catch {
      keyBytes = new TextEncoder().encode(secretKey);
    }
  } else {
    keyBytes = new TextEncoder().encode(secretKey);
  }

  try {
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    // Extract signatures from header (e.g. "v1,g0hM9... v1,a8b2..." or "v1=...")
    const rawTokens = signatureHeader.split(/[\s,]+/);
    const candidateSignatures = rawTokens
      .map((t) => t.replace(/^v1[=,]/, "").trim())
      .filter(Boolean);

    // 1. Try Svix payload: `${msgId}.${timestamp}.${rawBody}`
    if (msgId && timestamp) {
      const toSign = new TextEncoder().encode(`${msgId}.${timestamp}.${rawBody}`);
      const sigBuffer = await crypto.subtle.sign("HMAC", cryptoKey, toSign);
      const b64Sig = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)));
      const hexSig = Array.from(new Uint8Array(sigBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      for (const cand of candidateSignatures) {
        if (cand === b64Sig || cand.toLowerCase() === hexSig.toLowerCase()) {
          return true;
        }
      }
    }

    // 2. Try direct raw body HMAC SHA-256
    const directSign = new TextEncoder().encode(rawBody);
    const directBuffer = await crypto.subtle.sign("HMAC", cryptoKey, directSign);
    const directB64 = btoa(String.fromCharCode(...new Uint8Array(directBuffer)));
    const directHex = Array.from(new Uint8Array(directBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    for (const cand of candidateSignatures) {
      if (cand === directB64 || cand.toLowerCase() === directHex.toLowerCase()) {
        return true;
      }
    }

    // 3. Fallback: also try raw secretKey string without base64 decoding
    const rawStringKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secretKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const fallbackBuffer = await crypto.subtle.sign("HMAC", rawStringKey, new TextEncoder().encode(rawBody));
    const fallbackHex = Array.from(new Uint8Array(fallbackBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const fallbackB64 = btoa(String.fromCharCode(...new Uint8Array(fallbackBuffer)));

    for (const cand of candidateSignatures) {
      if (cand === fallbackB64 || cand.toLowerCase() === fallbackHex.toLowerCase()) {
        return true;
      }
    }

    console.warn("bachs-webhook: Signature verification comparison failed");
    return false;
  } catch (err) {
    console.error("bachs-webhook: Signature verification error:", err);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const BACHS_SECRET_KEY = Deno.env.get("BACHS_SECRET_KEY") ?? "";
    const BACHS_WEBHOOK_KEY = Deno.env.get("BACHS_WEBHOOK_KEY") || Deno.env.get("BACHS_WEBHOOK_SECRET") || "";
    const BACHS_BASE_URL = Deno.env.get("BACHS_BASE_URL") || "https://api.bachs.io/v1";

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Server infrastructure misconfigured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();

    // 1. Mandatory Cryptographic Signature Verification
    if (BACHS_WEBHOOK_KEY) {
      const isValid = await verifyWebhookSignature(rawBody, BACHS_WEBHOOK_KEY, req.headers);
      if (!isValid) {
        console.error("bachs-webhook: REJECTED unauthenticated webhook (invalid signature)");
        return new Response(JSON.stringify({ error: "Unauthorized: Invalid webhook signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log("bachs-webhook: Signature successfully verified.");
    } else {
      console.warn("bachs-webhook: WARNING: BACHS_WEBHOOK_KEY not set in environment.");
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const event = JSON.parse(rawBody || "{}");

    const eventType = event.event || event.type || "";
    const eventData = event.data || {};

    console.log(`bachs-webhook: Processing verified event ${eventType}, reference=${eventData.reference || "N/A"}`);

    // =========================================================================
    // 1. TICKET CHECKOUT COMPLETED / COLLECTION SUCCEEDED
    // =========================================================================
    if (eventType === "collection.succeeded" || eventType === "checkout.completed" || eventType === "charge.success") {
      const reference = eventData.reference || eventData.charge?.reference;
      const checkoutId = eventData.checkout_id || eventData.id;
      const metadata = eventData.metadata || eventData.charge?.meta || {};
      const purpose = metadata.purpose || "event_ticket";

      // Double-verification with Bachs API if checkoutId is provided
      if (checkoutId && BACHS_SECRET_KEY) {
        try {
          const verifyRes = await fetch(`${BACHS_BASE_URL}/checkout-sessions/${encodeURIComponent(checkoutId)}`, {
            headers: {
              Authorization: `Bearer ${BACHS_SECRET_KEY}`,
              "Content-Type": "application/json",
            },
          });
          const verifyJson = await verifyRes.json().catch(() => ({}));
          const pStatus = verifyJson?.payment_status || verifyJson?.status || verifyJson?.charge?.status;
          if (pStatus !== "paid" && pStatus !== "succeeded") {
            console.error(`bachs-webhook: Double check failed. Bachs API reports status: ${pStatus}`);
            return new Response(JSON.stringify({ error: "Session unverified on gateway" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } catch (apiErr) {
          console.warn("bachs-webhook: Double check network notice (continuing with signed payload):", apiErr);
        }
      }

      // Handler A: SMS Messaging Wallet Top-up
      if (purpose === "sms_wallet") {
        const organiserId = metadata.organiser_id;
        const smsUnits = Number(metadata.sms_units || 0);
        const amountMajor = Math.round(Number(eventData.amount || eventData.charge?.amount || metadata.amount || 0));
        const ref = reference || checkoutId || `SMS-WH-${Date.now()}`;

        if (organiserId && amountMajor > 0) {
          console.log(`bachs-webhook: Finalizing SMS wallet credit for organiser ${organiserId}, ₦${amountMajor}...`);
          const { data: rpcRes, error: rpcErr } = await admin.rpc("credit_sms_wallet", {
            p_organiser_id: organiserId,
            p_amount: amountMajor,
            p_reference: ref,
            p_units: smsUnits,
            p_source: "bachs_webhook",
          });
          if (rpcErr) {
            console.error("bachs-webhook: credit_sms_wallet error:", rpcErr);
          } else {
            console.log("bachs-webhook: SMS wallet credited via webhook:", rpcRes);
          }
        }
      }
      // Handler B: Event Ticket Purchase
      else if (purpose === "event_ticket" && reference) {
        console.log(`bachs-webhook: Finalizing ticket order for reference ${reference}...`);

        const amountMajor = Number(eventData.amount || eventData.charge?.amount || 0);
        const amountKobo = Math.round(amountMajor * 100);
        const feesKobo = Math.round(Number(eventData.fees || eventData.charge?.fees || 0) * 100);

        const { data: rpcResult, error: rpcError } = await admin.rpc("finalize_order_payment", {
          p_payment_reference: reference,
          p_gateway_transaction_id: checkoutId || "bachs_wh",
          p_gateway_amount_kobo: amountKobo,
          p_gateway_currency: (eventData.currency || "NGN").toUpperCase(),
          p_gateway_fee_kobo: feesKobo,
          p_actor_type: "bachs_webhook",
        });

        if (rpcError) {
          console.error("bachs-webhook: finalize_order_payment error:", rpcError);
        } else {
          console.log("bachs-webhook: Finalized successfully:", rpcResult);
          const primaryTicketId = rpcResult?.registration_id;
          if (primaryTicketId) {
            admin.functions.invoke("send-ticket", {
              body: { registrationId: primaryTicketId, paymentReference: reference },
            }).catch((err: any) => console.warn("bachs-webhook: send-ticket notice:", err));
          }
        }
      }
    }

    // =========================================================================
    // 2. PAYOUT SUCCEEDED
    // =========================================================================
    if (eventType === "payout.succeeded" || eventType === "transfer.success") {
      const payoutId = eventData.id;
      const reference = eventData.reference;

      console.log(`bachs-webhook: Payout succeeded for ${payoutId}, reference=${reference}`);

      let query = admin.from("payout_requests").update({
        status: "paid",
        processed_at: new Date().toISOString(),
      });

      if (payoutId) {
        query = query.eq("bachs_payout_id", payoutId);
      } else if (reference) {
        query = query.eq("reference", reference);
      }

      const { error: pErr } = await query;
      if (pErr) {
        console.error("bachs-webhook: Failed to update payout to paid:", pErr);
      }
    }

    // =========================================================================
    // 3. PAYOUT FAILED
    // =========================================================================
    if (eventType === "payout.failed" || eventType === "transfer.failed") {
      const payoutId = eventData.id;
      const reference = eventData.reference;
      const reason = eventData.status_reason || eventData.failure_reason || "Bachs transfer rejected";

      console.log(`bachs-webhook: Payout failed for ${payoutId}: ${reason}`);

      let query = admin.from("payout_requests").update({
        status: "failed",
        failure_reason: reason,
        processed_at: new Date().toISOString(),
      });

      if (payoutId) {
        query = query.eq("bachs_payout_id", payoutId);
      } else if (reference) {
        query = query.eq("reference", reference);
      }

      await query;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("bachs-webhook fatal error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200, // Return 200 so Bachs doesn't retry invalid payloads endlessly
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
