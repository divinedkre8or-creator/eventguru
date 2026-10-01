// supabase/functions/admin-sms-ops/index.ts
//
// Super Admin Operations & Telemetry Gateway for Textflow & In-App SMS Wallets.
// Requires authenticated caller with role 'admin' in user_roles.

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

    const adminUser = userData.user;
    const adminEmail = adminUser.email || "Admin";

    // 2. Authorize Super Admin role
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      return jsonResponse({ error: "Forbidden: Super Admin privileges required" }, 403);
    }

    // 3. Parse action and payload
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    const TEXTFLOW_API_TOKEN = Deno.env.get("TEXTFLOW_API_TOKEN");
    const TEXTFLOW_SENDER_ID = Deno.env.get("TEXTFLOW_SENDER_ID") || "Textflow";

    // ACTION: get_provider_status
    if (action === "get_provider_status") {
      if (!TEXTFLOW_API_TOKEN) {
        return jsonResponse({
          ok: true,
          configured: false,
          balance: 0,
          currency: "NGN",
          senderId: TEXTFLOW_SENDER_ID,
          accountName: "Unconfigured",
          message: "TEXTFLOW_API_TOKEN is not configured in Supabase environment secrets.",
        });
      }

      try {
        const [balanceRes, userRes] = await Promise.all([
          fetch("https://textflow.ng/api/v1/balance", {
            headers: {
              Authorization: `Bearer ${TEXTFLOW_API_TOKEN}`,
              Accept: "application/json",
            },
          }),
          fetch("https://textflow.ng/api/v1/user", {
            headers: {
              Authorization: `Bearer ${TEXTFLOW_API_TOKEN}`,
              Accept: "application/json",
            },
          }),
        ]);

        const balanceData = await balanceRes.json().catch(() => ({}));
        const userDataJson = await userRes.json().catch(() => ({}));

        const balance = balanceData?.data?.balance ?? 0;
        const currency = balanceData?.data?.currency ?? "NGN";
        const account = userDataJson?.data?.user;
        const senderIds = userDataJson?.data?.sender_ids || [];

        return jsonResponse({
          ok: true,
          configured: true,
          balance: Number(balance) || 0,
          currency,
          accountName: account?.name || account?.email || "EventRally Textflow",
          senderId: TEXTFLOW_SENDER_ID,
          availableSenderIds: senderIds.map((s: any) => s.sender_id || s),
        });
      } catch (err) {
        return jsonResponse({
          ok: false,
          configured: true,
          error: "Failed to connect to Textflow upstream API: " + (err as Error).message,
        }, 502);
      }
    }

    // ACTION: send_test_sms
    if (action === "send_test_sms") {
      const { recipientPhone, message, customSenderId } = body;
      if (!recipientPhone) {
        return jsonResponse({ error: "Missing recipientPhone" }, 400);
      }

      if (!TEXTFLOW_API_TOKEN) {
        return jsonResponse({ error: "TEXTFLOW_API_TOKEN secret is not set." }, 500);
      }

      // Clean and normalize phone number
      const cleanPhone = String(recipientPhone).replace(/[\s\-\(\)]/g, "");
      let normalized = cleanPhone;
      if (normalized.startsWith("0")) {
        normalized = "234" + normalized.slice(1);
      } else if (normalized.startsWith("+")) {
        normalized = normalized.slice(1);
      }

      const senderId = customSenderId || TEXTFLOW_SENDER_ID;
      const testMsg = message || `[EventRally Admin Test] Live SMS connectivity verified at ${new Date().toLocaleTimeString("en-GB")}.`;

      const tfRes = await fetch("https://textflow.ng/api/v1/sms/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TEXTFLOW_API_TOKEN}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          recipient: normalized,
          sender_id: senderId,
          message: testMsg,
        }),
      });

      const tfJson = await tfRes.json().catch(() => ({}));

      if (!tfRes.ok || tfJson.status === "error") {
        return jsonResponse({
          ok: false,
          error: tfJson.message || `Textflow HTTP ${tfRes.status}`,
          details: tfJson,
        }, 400);
      }

      return jsonResponse({
        ok: true,
        message: "Test SMS sent successfully",
        recipient: normalized,
        providerResponse: tfJson,
      });
    }

    // ACTION: adjust_wallet_balance
    if (action === "adjust_wallet_balance") {
      const { organiserId, amount, type, reason } = body;

      if (!organiserId) return jsonResponse({ error: "organiserId is required" }, 400);
      if (!amount || Number(amount) <= 0) return jsonResponse({ error: "Valid amount is required" }, 400);
      if (type !== "credit" && type !== "debit") return jsonResponse({ error: "type must be 'credit' or 'debit'" }, 400);
      if (!reason || !String(reason).trim()) return jsonResponse({ error: "An audit reason is required" }, 400);

      const delta = Number(amount);

      // Fetch current wallet
      const { data: existingWallet } = await supabaseAdmin
        .from("organiser_wallets")
        .select("sms_balance, plan")
        .eq("organiser_id", organiserId)
        .maybeSingle();

      const currentBalance = Number(existingWallet?.sms_balance) || 0;
      const newBalance = type === "credit"
        ? currentBalance + delta
        : Math.max(0, currentBalance - delta);

      // Upsert wallet
      const { error: upsertErr } = await supabaseAdmin
        .from("organiser_wallets")
        .upsert(
          {
            organiser_id: organiserId,
            sms_balance: newBalance,
            plan: existingWallet?.plan || "free",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "organiser_id" }
        );

      if (upsertErr) {
        return jsonResponse({ error: "Failed to update wallet: " + upsertErr.message }, 500);
      }

      // Record transaction ledger
      const ref = `ADMIN-${type.toUpperCase()}-${Date.now().toString().slice(-6)}`;
      const desc = `[Admin ${type === "credit" ? "Credit" : "Debit"}] ${reason.trim()} (Auth: ${adminEmail})`;

      await supabaseAdmin.from("wallet_transactions").insert({
        organiser_id: organiserId,
        type: type === "credit" ? "fund" : "debit",
        amount: delta,
        balance_after: newBalance,
        reference: ref,
        description: desc,
      });

      return jsonResponse({
        ok: true,
        message: `Wallet successfully ${type === "credit" ? "credited" : "debited"}`,
        organiserId,
        previousBalance: currentBalance,
        newBalance,
        reference: ref,
      });
    }

    // ACTION: send_admin_broadcast
    if (action === "send_admin_broadcast") {
      const { recipients, message, title } = body;

      if (!Array.isArray(recipients) || recipients.length === 0) {
        return jsonResponse({ error: "Recipients array is required" }, 400);
      }
      if (!message || !String(message).trim()) {
        return jsonResponse({ error: "Message text is required" }, 400);
      }
      if (!TEXTFLOW_API_TOKEN) {
        return jsonResponse({ error: "TEXTFLOW_API_TOKEN is not configured" }, 500);
      }

      // Limit to 500 recipients per broadcast for safety
      if (recipients.length > 500) {
        return jsonResponse({ error: "Broadcast limit exceeded. Maximum 500 recipients per blast." }, 400);
      }

      // Deduplicate & normalize
      const seen = new Set<string>();
      const validNumbers: string[] = [];

      for (const raw of recipients) {
        const cleaned = String(raw).replace(/[\s\-\(\)]/g, "");
        if (cleaned.length < 10) continue;
        let norm = cleaned;
        if (norm.startsWith("0")) norm = "234" + norm.slice(1);
        else if (norm.startsWith("+")) norm = norm.slice(1);
        if (!seen.has(norm)) {
          seen.add(norm);
          validNumbers.push(norm);
        }
      }

      let sent = 0;
      let failed = 0;
      const errors: string[] = [];

      // Send via Textflow in batches of 10
      const fullText = title ? `[${title}] ${message}` : message;

      for (const phone of validNumbers) {
        try {
          const res = await fetch("https://textflow.ng/api/v1/sms/send", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${TEXTFLOW_API_TOKEN}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              recipient: phone,
              sender_id: TEXTFLOW_SENDER_ID,
              message: fullText,
            }),
          });
          const resJson = await res.json().catch(() => ({}));
          if (res.ok && resJson.status !== "error") {
            sent++;
          } else {
            failed++;
            if (errors.length < 5) {
              errors.push(`${phone}: ${resJson.message || `HTTP ${res.status}`}`);
            }
          }
        } catch (e) {
          failed++;
          if (errors.length < 5) {
            errors.push(`${phone}: ${(e as Error).message}`);
          }
        }
      }

      return jsonResponse({
        ok: true,
        total: validNumbers.length,
        sent,
        failed,
        errors,
      });
    }

    return jsonResponse({ error: `Unknown action '${action}'` }, 400);
  } catch (error) {
    return jsonResponse({ error: "Internal Server Error: " + (error as Error).message }, 500);
  }
});
