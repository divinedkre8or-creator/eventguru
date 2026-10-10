// supabase/functions/fund-wallet/index.ts
//
// Secure Server-side SMS Wallet Top-up Endpoint.
// Verifies Paystack transactions with PAYSTACK_SECRET_KEY and atomically credits organiser_wallets.

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Missing Supabase server configuration" }, 500);
    }

    // 1. Authenticate caller JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized: Missing Authorization header" }, 401);
    }

    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser();

    if (userError || !userData?.user) {
      return jsonResponse({ error: "Unauthorized: Invalid session" }, 401);
    }

    const organiserId = userData.user.id;

    // 2. Parse request
    const body = await req.json().catch(() => ({}));
    const { paymentReference } = body;

    if (!paymentReference || typeof paymentReference !== "string") {
      return jsonResponse({ error: "Missing or invalid paymentReference" }, 400);
    }

    // 3. Verify transaction with Paystack API
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) {
      console.error("fund-wallet: PAYSTACK_SECRET_KEY secret is not set in environment.");
      return jsonResponse(
        { error: "Payment verification gateway is not configured (missing PAYSTACK_SECRET_KEY). Please contact support." },
        500
      );
    }

    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(paymentReference.trim())}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          Accept: "application/json",
        },
      }
    );

    const paystackJson = await paystackRes.json().catch(() => ({}));

    if (!paystackRes.ok || !paystackJson?.status) {
      return jsonResponse(
        {
          error: "Paystack transaction verification failed: " + (paystackJson?.message || `HTTP ${paystackRes.status}`),
        },
        400
      );
    }

    const txData = paystackJson.data;

    if (txData?.status !== "success") {
      return jsonResponse(
        {
          error: `Payment is not marked successful. Status: ${txData?.status || "unknown"}`,
        },
        400
      );
    }

    if (txData?.currency !== "NGN") {
      return jsonResponse(
        {
          error: `Unexpected currency: ${txData?.currency}. Expected NGN.`,
        },
        400
      );
    }

    // Amount in Naira (Paystack returns in kobo)
    const amountPaidNaira = Math.floor(Number(txData.amount) / 100);
    if (amountPaidNaira <= 0) {
      return jsonResponse({ error: "Invalid payment amount recorded by gateway." }, 400);
    }

    // Cross-Service Isolation: Reject event ticket transactions from being used as SMS wallet funding
    const trimmedRef = paymentReference.trim();
    if (trimmedRef.startsWith("EVR-") || txData?.metadata?.purpose === "event_ticket") {
      return jsonResponse(
        { error: "Invalid payment reference: Event ticket transactions cannot be credited to the SMS messaging wallet." },
        400
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Cross-Service Double Check: verify reference has not been used in orders
    const { data: existingOrder } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("payment_reference", trimmedRef)
      .maybeSingle();

    if (existingOrder) {
      return jsonResponse(
        { error: "This payment reference is already bound to an event ticket order and cannot be credited to SMS wallet." },
        400
      );
    }

    // 4. Idempotency Check: verify reference has not already been credited
    const { data: existingTx } = await supabaseAdmin
      .from("wallet_transactions")
      .select("id, balance_after")
      .eq("reference", paymentReference.trim())
      .maybeSingle();

    if (existingTx) {
      return jsonResponse({
        ok: true,
        message: "Payment reference has already been credited.",
        alreadyCredited: true,
        newBalance: existingTx.balance_after,
      });
    }

    // Resolve units added from Paystack metadata or volume-tiered pricing
    let unitsAdded = 0;
    const metaUnits = txData?.metadata?.custom_fields?.find(
      (f: any) => f.variable_name === "sms_units"
    )?.value;
    if (metaUnits && !isNaN(Number(metaUnits)) && Number(metaUnits) > 0) {
      unitsAdded = Math.floor(Number(metaUnits));
    } else {
      const fallbackRate = amountPaidNaira > 4000 ? 8 : amountPaidNaira > 900 ? 9 : 10;
      unitsAdded = Math.floor(amountPaidNaira / fallbackRate);
    }

    // 5. Call atomic database RPC: idempotent and concurrency-safe
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc("credit_sms_wallet", {
      p_organiser_id: organiserId,
      p_amount: amountPaidNaira,
      p_reference: trimmedRef,
      p_units: unitsAdded,
      p_source: "paystack_client",
    });

    if (rpcError) {
      return jsonResponse(
        { error: "Failed to update wallet: " + rpcError.message },
        500
      );
    }

    return jsonResponse({
      ok: true,
      message: `Successfully credited ₦${amountPaidNaira.toLocaleString()} to SMS wallet`,
      amountPaidNaira,
      unitsAdded,
      newBalance: rpcResult?.new_balance,
      alreadyCredited: rpcResult?.already_credited,
      reference: trimmedRef,
    });
  } catch (err) {
    return jsonResponse(
      { error: "Internal Server Error: " + (err as Error).message },
      500
    );
  }
});
