// supabase/functions/bachs-checkout/index.ts
//
// Authoritative Multi-Currency & Local Checkout Engine for EventGuru via Bachs.io.
//
// Capabilities:
// 1. Action 'initialize': Creates/reserves the order in public.orders, calculates ticket pricing
//    and fees server-side, and generates a hosted Bachs checkout session with cards, transfer,
//    mobile money, and crypto rails.
// 2. Action 'verify': Verifies the checkout session state directly against Bachs REST API using
//    BACHS_SECRET_KEY and calls the atomic RPC finalize_order_payment to issue tickets.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const reject = (reason: string, status = 200) => jsonResponse({ ok: false, reason }, status);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const BACHS_SECRET_KEY = Deno.env.get("BACHS_SECRET_KEY") ?? "";
    const BACHS_BASE_URL = Deno.env.get("BACHS_BASE_URL") || "https://api.bachs.io/v1";

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Server infrastructure misconfigured" }, 500);
    }

    if (!BACHS_SECRET_KEY) {
      console.error("bachs-checkout: BACHS_SECRET_KEY is missing from environment.");
      return jsonResponse({ error: "Bachs checkout gateway unconfigured. Please contact support." }, 500);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));

    const {
      action = "initialize", // 'initialize' | 'verify'
      eventId,
      ticketTypeId = null,
      fullName,
      email,
      phone = null,
      quantity: rawQuantity = 1,
      paymentReference = null,
      checkoutId = null,
      customAnswers = null,
      originUrl = "https://geteventrally.com",
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
    // ACTION: INITIALIZE_WALLET (Create Bachs Session for SMS Wallet Top-up)
    // =========================================================================
    if (action === "initialize_wallet") {
      const {
        organiserId = userId,
        units = 100,
        amount = 1000,
        customerName = "Event Organiser",
        customerEmail,
        originUrl = "https://geteventrally.com",
      } = body ?? {};

      if (!organiserId) {
        return jsonResponse({ error: "Missing required field: organiserId" }, 400);
      }
      if (!customerEmail) {
        return jsonResponse({ error: "Missing required field: customerEmail" }, 400);
      }

      const numUnits = Math.max(1, Math.floor(Number(units) || 1));
      const amountNgn = Math.max(1, Math.floor(Number(amount) || 1));
      const authoritativeRef = `SMS-WLT-${String(organiserId).slice(0, 8)}-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

      console.log(`bachs-checkout: Creating Bachs wallet topup session for organiser ${organiserId}, ₦${amountNgn}...`);
      const sessionPayload = {
        pricing: {
          amount: String(amountNgn.toFixed(2)),
          currency: "NGN",
        },
        reference: authoritativeRef,
        customer: {
          name: customerName.trim(),
          email: customerEmail.trim(),
        },
        metadata: {
          purpose: "sms_wallet",
          organiser_id: organiserId,
          sms_units: numUnits,
          amount: amountNgn,
        },
        success_url: `${originUrl}/dashboard/campaigns?session_id={CHECKOUT_SESSION_ID}&wallet_ref=${authoritativeRef}&wallet_topup=true`,
        cancel_url: `${originUrl}/dashboard/campaigns`,
      };

      const bachsRes = await fetch(`${BACHS_BASE_URL}/checkout-sessions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${BACHS_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sessionPayload),
      });

      const bachsJson = await bachsRes.json().catch(() => ({}));
      if (!bachsRes.ok || !bachsJson?.checkout_url) {
        console.error("bachs-checkout: Failed to create wallet top-up session:", bachsJson);
        return reject("Failed to initialize Bachs checkout session: " + (bachsJson?.message || `HTTP ${bachsRes.status}`));
      }

      return jsonResponse({
        ok: true,
        paymentReference: authoritativeRef,
        checkoutId: bachsJson.checkout_id,
        checkoutUrl: bachsJson.checkout_url,
        amountMajor: amountNgn,
        currency: "NGN",
        units: numUnits,
      });
    }

    // =========================================================================
    // ACTION: VERIFY_WALLET (Verify Bachs Session & Credit SMS Wallet Atomically)
    // =========================================================================
    if (action === "verify_wallet") {
      const targetSessionId = checkoutId || body?.sessionId;
      const targetRef = paymentReference || body?.walletRef;

      if (!targetSessionId && !targetRef) {
        return reject("Missing checkoutId/sessionId or paymentReference for wallet verification.");
      }

      // 1. Check idempotency in wallet_transactions table first
      if (targetRef) {
        const { data: existingTx } = await admin
          .from("wallet_transactions")
          .select("id, balance_after, amount")
          .eq("reference", targetRef)
          .maybeSingle();

        if (existingTx) {
          return jsonResponse({
            ok: true,
            alreadyCredited: true,
            message: "Wallet has already been credited.",
            newBalance: existingTx.balance_after,
            amountPaid: existingTx.amount,
          });
        }
      }

      if (!targetSessionId) {
        return reject("Cannot verify without Bachs session ID.");
      }

      // 2. Fetch session from Bachs
      console.log(`bachs-checkout: Verifying wallet session ${targetSessionId} with Bachs API...`);
      const sessionRes = await fetch(`${BACHS_BASE_URL}/checkout-sessions/${encodeURIComponent(targetSessionId)}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${BACHS_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      });

      const sessionData = await sessionRes.json().catch(() => ({}));
      if (!sessionRes.ok) {
        return reject("Unable to verify session with Bachs: " + (sessionData?.message || `HTTP ${sessionRes.status}`));
      }

      const paymentStatus = sessionData.payment_status || sessionData.status;
      const chargeStatus = sessionData.charge?.status;
      const isPaid = paymentStatus === "paid" || paymentStatus === "succeeded" || chargeStatus === "succeeded";

      if (!isPaid) {
        return jsonResponse({
          ok: false,
          reason: `Wallet payment is not completed. Current status: ${paymentStatus || "open"}`,
          status: paymentStatus,
        });
      }

      const metadata = sessionData.metadata || sessionData.charge?.meta || {};
      const organiserId = metadata.organiser_id || userId;
      const smsUnits = Number(metadata.sms_units || 0);
      const amountPaidNgn = Math.round(Number(sessionData.amount || metadata.amount || 0));
      const authoritativeReference = sessionData.reference || targetRef || targetSessionId;

      if (!organiserId) {
        return reject("Session missing organiser_id in metadata.");
      }

      // 3. Atomically credit SMS wallet using credit_sms_wallet RPC
      console.log(`bachs-checkout: Invoking credit_sms_wallet RPC for organiser ${organiserId}, ₦${amountPaidNgn}...`);
      const { data: rpcResult, error: rpcError } = await admin.rpc("credit_sms_wallet", {
        p_organiser_id: organiserId,
        p_amount: amountPaidNgn,
        p_reference: authoritativeReference,
        p_units: smsUnits,
        p_source: "bachs_checkout",
      });

      if (rpcError) {
        console.error("bachs-checkout: credit_sms_wallet error:", rpcError);
        return reject("Database error crediting wallet: " + rpcError.message, 500);
      }

      return jsonResponse({
        ok: true,
        alreadyCredited: rpcResult?.already_credited,
        amountPaid: amountPaidNgn,
        unitsAdded: smsUnits,
        newBalance: rpcResult?.new_balance,
        reference: authoritativeReference,
      });
    }

    // =========================================================================
    // ACTION 1: INITIALIZE (Create Order & Bachs Checkout Session)
    // =========================================================================
    if (action === "initialize") {
      if (!eventId || !fullName || !email) {
        return jsonResponse({ error: "Missing required fields (eventId, fullName, email)" }, 400);
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

        if (t.quantity != null && Number(t.sold) + quantity > Number(t.quantity)) {
          return reject("This ticket tier is sold out.");
        }

        unitPrice = Math.max(0, Number(t.price) || 0);
        ticketTierName = t.name || ticketTierName;
      } else {
        if (!eventRow.is_free) {
          return reject("A ticket tier must be selected for this event.");
        }
      }

      const isFree = unitPrice === 0;
      const subtotal = unitPrice * quantity;
      const platformFeePercent = 2.5; // 2.5% platform commission
      const platformFee = isFree ? 0 : Math.round(subtotal * (platformFeePercent / 100));
      const organiserNet = Math.max(0, subtotal - platformFee);

      // Handle Free ticket directly
      if (isFree) {
        const orderId = crypto.randomUUID();
        const freeRef = `FREE-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

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

        return jsonResponse({
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
      const authoritativeRef = `EVR-ORD-${Date.now()}-${crypto.randomUUID().slice(0, 10).toUpperCase()}`;

      // 1. Create Bachs Checkout Session
      console.log(`bachs-checkout: Creating Bachs checkout session for order ${orderId}, amount ₦${subtotal}...`);
      const sessionPayload = {
        pricing: {
          amount: String(subtotal.toFixed(2)),
          currency: "NGN",
        },
        reference: authoritativeRef,
        customer: {
          name: fullName.trim(),
          email: email.trim(),
        },
        metadata: {
          purpose: "event_ticket",
          order_id: orderId,
          event_id: eventId,
          ticket_type_id: ticketTypeId,
          ticket_name: ticketTierName,
          quantity,
        },
        success_url: `${originUrl}/ticket/${authoritativeRef}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${originUrl}/events/${eventId}`,
      };

      const bachsRes = await fetch(`${BACHS_BASE_URL}/checkout-sessions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${BACHS_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sessionPayload),
      });

      const bachsJson = await bachsRes.json().catch(() => ({}));
      if (!bachsRes.ok || !bachsJson?.checkout_url) {
        console.error("bachs-checkout: Failed to create session:", bachsJson);
        return reject("Failed to initialize Bachs checkout session: " + (bachsJson?.message || `HTTP ${bachsRes.status}`));
      }

      const generatedCheckoutId = bachsJson.checkout_id;
      const checkoutUrl = bachsJson.checkout_url;

      // 2. Persist order row with checkout session ID
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
        amount_expected: subtotal,
        amount_paid: 0,
        currency: "NGN",
        platform_fee: platformFee,
        organiser_net: organiserNet,
        payment_reference: authoritativeRef,
        gateway_transaction_id: generatedCheckoutId,
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
          gateway: "bachs",
          checkout_id: generatedCheckoutId,
        },
      });

      if (orderErr) {
        console.error("bachs-checkout: Failed to save pending order:", orderErr);
        throw orderErr;
      }

      return jsonResponse({
        ok: true,
        isFree: false,
        orderId,
        paymentReference: authoritativeRef,
        checkoutId: generatedCheckoutId,
        checkoutUrl,
        amountMajor: subtotal,
        currency: "NGN",
      });
    }

    // =========================================================================
    // ACTION 2: VERIFY (Check Bachs Session & Issue Tickets Atomically)
    // =========================================================================
    let targetCheckoutId = checkoutId;
    let targetRef = paymentReference;

    // Resolve order from reference or checkoutId
    let orderRow: any = null;
    if (targetRef) {
      const { data: o } = await admin.from("orders").select("*").eq("payment_reference", targetRef).maybeSingle();
      orderRow = o;
    } else if (targetCheckoutId) {
      const { data: o } = await admin.from("orders").select("*").eq("gateway_transaction_id", targetCheckoutId).maybeSingle();
      orderRow = o;
    }

    if (!orderRow) {
      return reject("Order record not found for verification.");
    }

    // Fast-path: Check if order is already completed
    if (orderRow.order_status === "completed" && orderRow.payment_status === "paid") {
      const { data: tickets } = await admin.from("registrations").select("id").eq("order_id", orderRow.id);
      const ticketIds = (tickets || []).map((t: any) => t.id);
      return jsonResponse({
        ok: true,
        orderId: orderRow.id,
        registrationId: ticketIds[0] || null,
        ticketIds,
        amountPaid: Number(orderRow.amount_paid) || 0,
      });
    }

    targetCheckoutId = targetCheckoutId || orderRow.gateway_transaction_id;

    if (!targetCheckoutId) {
      return reject("No Bachs checkout session ID associated with this order.");
    }

    // Query Bachs REST API to verify session status
    console.log(`bachs-checkout: Verifying session ${targetCheckoutId} with Bachs API...`);
    const sessionRes = await fetch(`${BACHS_BASE_URL}/checkout-sessions/${encodeURIComponent(targetCheckoutId)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${BACHS_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const sessionData = await sessionRes.json().catch(() => ({}));
    if (!sessionRes.ok) {
      return reject("Unable to verify session with Bachs: " + (sessionData?.message || `HTTP ${sessionRes.status}`));
    }

    const paymentStatus = sessionData.payment_status || sessionData.status;
    const chargeStatus = sessionData.charge?.status;
    const isPaid = paymentStatus === "paid" || paymentStatus === "succeeded" || chargeStatus === "succeeded";

    if (!isPaid) {
      return jsonResponse({
        ok: false,
        reason: `Payment is not completed. Current status: ${paymentStatus || "open"}`,
        status: paymentStatus,
      });
    }

    // Amount paid in Major units and Kobo
    const amountPaidMajor = Number(sessionData.amount) || Number(orderRow.amount_expected) || 0;
    const amountKobo = Math.round(amountPaidMajor * 100);
    const feesKobo = Math.round(Number(sessionData.charge?.fees || 0) * 100);

    // Call atomic RPC
    console.log(`bachs-checkout: Finalizing order ${orderRow.id} via finalize_order_payment RPC...`);
    const { data: rpcResult, error: rpcError } = await admin.rpc("finalize_order_payment", {
      p_payment_reference: orderRow.payment_reference,
      p_gateway_transaction_id: targetCheckoutId,
      p_gateway_amount_kobo: amountKobo,
      p_gateway_currency: (sessionData.currency || "NGN").toUpperCase(),
      p_gateway_fee_kobo: feesKobo,
      p_actor_type: "bachs_checkout",
    });

    if (rpcError) {
      console.error("bachs-checkout: finalize_order_payment RPC failed:", rpcError);
      throw rpcError;
    }

    const ticketIds: string[] = rpcResult?.ticket_ids || [];
    const primaryTicketId = rpcResult?.registration_id || ticketIds[0];

    // Trigger ticket confirmation email / SMS via send-ticket function
    if (primaryTicketId) {
      admin.functions.invoke("send-ticket", {
        body: { registrationId: primaryTicketId, paymentReference: orderRow.payment_reference },
      }).catch((err: any) => console.warn("bachs-checkout: send-ticket notice:", err));
    }

    return jsonResponse({
      ok: true,
      orderId: orderRow.id,
      registrationId: primaryTicketId,
      ticketIds,
      amountPaid: amountPaidMajor,
      message: "Order verified and tickets provisioned successfully.",
    });
  } catch (err: any) {
    console.error("bachs-checkout fatal error:", err);
    return jsonResponse({ error: err.message || "Internal server error" }, 500);
  }
});
