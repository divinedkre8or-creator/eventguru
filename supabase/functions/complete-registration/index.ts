// supabase/functions/complete-registration/index.ts
//
// Authoritative Server-Side Registration & Payment Engine for EventRally.
//
// Dual capability:
//   1. Action 'initialize': Creates/reserves the authoritative order in `public.orders`
//      BEFORE the payment modal opens. Calculates unit price, quantity, platform fee,
//      and binds metadata { purpose: 'event_ticket', order_id } to the reference.
//   2. Action 'finalize': Verifies the Paystack payment directly with PAYSTACK_SECRET_KEY,
//      validates currency ('NGN'), amount, and purpose, and calls the atomic RPC
//      `finalize_order_payment` to issue tickets and update inventory in one transaction.
//
// Backward Compatibility:
//   Genuinely free tickets (unitPrice = 0) are provisioned directly server-side with
//   status 'completed' and amount_paid = 0.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

const reject = (reason: string) => json({ ok: false, reason }, 200);

interface PaystackVerification {
  success: boolean;
  status: string;
  amountKobo: number;
  amountMajor: number;
  currency: string;
  feesKobo: number;
  gatewayId: string;
  metadata: Record<string, any>;
  customerEmail?: string;
}

/**
 * Verify a payment reference directly with Paystack REST API using the secret key.
 */
async function verifyPaystack(reference: string, secretKey: string): Promise<PaystackVerification> {
  const url = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`;
  let lastErr: unknown = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      const payload = await res.json().catch(() => ({}));

      const gatewayOk = payload?.status === true;
      const data = payload?.data;
      const txnStatus = data?.status;

      if (gatewayOk && txnStatus === "success") {
        const kobo = Number(data?.amount) || 0;
        return {
          success: true,
          status: txnStatus,
          amountKobo: kobo,
          amountMajor: Math.round(kobo) / 100,
          currency: (data?.currency || "NGN").toUpperCase(),
          feesKobo: Number(data?.fees) || 0,
          gatewayId: String(data?.id || ""),
          metadata: data?.metadata || {},
          customerEmail: data?.customer?.email,
        };
      }
      return {
        success: false,
        status: txnStatus || "unknown",
        amountKobo: 0,
        amountMajor: 0,
        currency: "NGN",
        feesKobo: 0,
        gatewayId: "",
        metadata: {},
      };
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`Paystack verification unreachable: ${String(lastErr)}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return json({ error: "Server infrastructure misconfigured" }, 500);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    const {
      action = "finalize", // 'initialize' | 'finalize'
      eventId,
      ticketTypeId = null,
      fullName,
      email,
      phone = null,
      quantity: rawQuantity = 1,
      paymentReference = null,
      customAnswers = null,
    } = body ?? {};

    // Derive authenticated user if token present
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader && ANON_KEY) {
      try {
        const authScoped = createClient(SUPABASE_URL, ANON_KEY, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: userData } = await authScoped.auth.getUser();
        userId = userData?.user?.id ?? null;
      } catch (_e) {
        userId = null;
      }
    }

    // =========================================================================
    // ACTION: INITIALIZE (Order pre-creation before Paystack opens)
    // =========================================================================
    if (action === "initialize") {
      if (!eventId || !fullName || !email) {
        return json({ error: "Missing required fields (eventId, fullName, email)" }, 400);
      }

      const quantity = Math.max(1, Math.floor(Number(rawQuantity) || 1));

      // Resolve event & organizer
      const { data: eventRow, error: evErr } = await admin
        .from("events")
        .select("id, organiser_id, title, status, is_free")
        .eq("id", eventId)
        .maybeSingle();

      if (evErr || !eventRow) return reject("The requested event was not found.");

      // Resolve ticket tier server-side
      let unitPrice = 0;
      let ticketTierName = "General Admission";

      if (ticketTypeId) {
        const { data: t, error: tErr } = await admin
          .from("ticket_types")
          .select("id, price, event_id, name, quantity, sold")
          .eq("id", ticketTypeId)
          .maybeSingle();

        if (tErr || !t) return reject("This ticket tier no longer exists.");
        if (t.event_id !== eventId) return reject("Ticket tier does not belong to this event.");

        // Capacity guard
        if (t.quantity != null && Number(t.sold) + quantity > Number(t.quantity)) {
          return reject("This ticket tier is sold out.");
        }

        unitPrice = Math.max(0, Number(t.price) || 0);
        ticketTierName = t.name || ticketTierName;
      } else {
        // If no ticket tier provided, only allow if event is genuinely marked free
        if (!eventRow.is_free) {
          return reject("A ticket tier must be selected for this event.");
        }
      }

      const isFree = unitPrice === 0;
      const subtotal = unitPrice * quantity;
      const platformFeePercent = 2.5; // standard 2.5% platform commission
      const platformFee = isFree ? 0 : Math.round(subtotal * (platformFeePercent / 100));
      const organiserNet = Math.max(0, subtotal - platformFee);
      const amountExpected = subtotal;

      // Handle genuinely Free ticket directly during initialization
      if (isFree) {
        const orderId = crypto.randomUUID();
        const freeRef = `FREE-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

        // 1. Insert completed free order
        await admin.from("orders").insert({
          id: orderId,
          event_id: eventId,
          organiser_id: eventRow.organiser_id,
          ticket_type_id: ticketTypeId,
          user_id: userId,
          customer_name: fullName,
          customer_email: email,
          customer_phone: phone,
          quantity,
          unit_price: 0,
          subtotal: 0,
          amount_expected: 0,
          amount_paid: 0,
          currency: "NGN",
          platform_fee: 0,
          organiser_net: 0,
          payment_reference: freeRef,
          payment_status: "free",
          order_status: "completed",
          custom_answers: customAnswers || {},
          paid_at: new Date().toISOString(),
          ticket_issued_at: new Date().toISOString(),
        });

        // 2. Issue ticket(s)
        const ticketIds: string[] = [];
        for (let i = 1; i <= quantity; i++) {
          const tId = crypto.randomUUID();
          const tCode = `TKT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
          await admin.from("registrations").insert({
            id: tId,
            order_id: orderId,
            event_id: eventId,
            ticket_type_id: ticketTypeId,
            user_id: userId,
            full_name: fullName,
            email,
            phone,
            amount_paid: 0,
            payment_reference: freeRef,
            status: "completed",
            checked_in: false,
            ticket_index: i,
            ticket_code: tCode,
            custom_answers: customAnswers || {},
          });
          ticketIds.push(tId);
        }

        // Increment sold count
        if (ticketTypeId) {
          try {
            const { data: tRow } = await admin.from("ticket_types").select("sold").eq("id", ticketTypeId).single();
            if (tRow) {
              await admin.from("ticket_types").update({ sold: (tRow.sold || 0) + quantity }).eq("id", ticketTypeId);
            }
          } catch (_e) {
            // deferred
          }
        }

        return json({
          ok: true,
          isFree: true,
          orderId,
          registrationId: ticketIds[0],
          ticketIds,
          amountPaid: 0,
        });
      }

      // Paid ticket: Generate authoritative reference and create pending order
      const orderId = crypto.randomUUID();
      const authoritativeRef = `EVR-ORD-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

      const { error: orderErr } = await admin.from("orders").insert({
        id: orderId,
        event_id: eventId,
        organiser_id: eventRow.organiser_id,
        ticket_type_id: ticketTypeId,
        user_id: userId,
        customer_name: fullName,
        customer_email: email,
        customer_phone: phone,
        quantity,
        unit_price: unitPrice,
        subtotal,
        amount_expected: amountExpected,
        amount_paid: 0,
        currency: "NGN",
        platform_fee: platformFee,
        organiser_net: organiserNet,
        payment_reference: authoritativeRef,
        payment_status: "pending",
        order_status: "pending",
        custom_answers: customAnswers || {},
        metadata: {
          purpose: "event_ticket",
          order_id: orderId,
          event_id: eventId,
          ticket_type_id: ticketTypeId,
          ticket_name: ticketTierName,
          quantity,
        },
      });

      if (orderErr) {
        console.error("complete-registration: Failed to create pending order:", orderErr);
        throw orderErr;
      }

      return json({
        ok: true,
        isFree: false,
        orderId,
        paymentReference: authoritativeRef,
        amountKobo: Math.round(amountExpected * 100),
        amountMajor: amountExpected,
        currency: "NGN",
        metadata: {
          purpose: "event_ticket",
          order_id: orderId,
          event_id: eventId,
          quantity,
        },
      });
    }

    // =========================================================================
    // ACTION: FINALIZE (Verifying payment & issuing multi-tickets atomically)
    // =========================================================================
    if (!paymentReference || typeof paymentReference !== "string") {
      return reject("Payment reference is required for payment confirmation.");
    }

    const cleanRef = paymentReference.trim();

    // Prevent cross-service reuse of SMS wallet references
    if (cleanRef.startsWith("SMS-") || cleanRef.startsWith("SMS-WALLET-")) {
      return reject("Invalid payment reference: This reference belongs to SMS messaging top-up.");
    }

    // Fast-path: Check if order is already completed
    const { data: existingOrder } = await admin
      .from("orders")
      .select("id, order_status, payment_status, amount_paid")
      .eq("payment_reference", cleanRef)
      .maybeSingle();

    if (existingOrder && existingOrder.order_status === "completed" && existingOrder.payment_status === "paid") {
      const { data: existingTickets } = await admin
        .from("registrations")
        .select("id")
        .eq("order_id", existingOrder.id);

      const ticketIds = (existingTickets || []).map((t) => t.id);
      return json({
        ok: true,
        orderId: existingOrder.id,
        registrationId: ticketIds[0] || null,
        ticketIds,
        amountPaid: Number(existingOrder.amount_paid) || 0,
      });
    }

    // Verify directly with Paystack API
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) {
      console.error("complete-registration: PAYSTACK_SECRET_KEY is missing from environment.");
      return json({ error: "Payment gateway verification is unconfigured. Please contact support." }, 500);
    }

    const verification = await verifyPaystack(cleanRef, PAYSTACK_SECRET_KEY);
    if (!verification.success) {
      return reject(`Payment could not be verified with gateway. Status: ${verification.status}`);
    }

    // Currency verification: Reject non-NGN payments
    if (verification.currency !== "NGN") {
      return reject(`Unsupported payment currency (${verification.currency}). Expected NGN.`);
    }

    // Purpose verification: Ensure payment belongs to an event ticket
    const metaPurpose = verification.metadata?.purpose;
    if (metaPurpose && metaPurpose !== "event_ticket") {
      return reject(`Invalid transaction purpose (${metaPurpose}). Payment cannot be used for tickets.`);
    }

    // Atomic Finalization via PostgreSQL RPC function
    const { data: rpcResult, error: rpcErr } = await admin.rpc("finalize_order_payment", {
      p_payment_reference: cleanRef,
      p_gateway_transaction_id: verification.gatewayId,
      p_gateway_amount_kobo: verification.amountKobo,
      p_gateway_currency: verification.currency,
      p_gateway_fee_kobo: verification.feesKobo,
      p_actor_type: "client_callback",
    });

    if (rpcErr) {
      console.error("complete-registration: finalize_order_payment RPC error:", rpcErr);
      return reject(rpcErr.message || "Order finalization failed.");
    }

    const ticketIds: string[] = rpcResult?.ticket_ids || [];
    const firstTicketId = ticketIds[0] || null;

    return json({
      ok: true,
      orderId: rpcResult?.order_id,
      registrationId: firstTicketId,
      ticketIds,
      amountPaid: rpcResult?.amount_paid || verification.amountMajor,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("complete-registration error:", message);
    return json({ error: "Payment processing failed. Please contact support with your payment reference." }, 500);
  }
});
