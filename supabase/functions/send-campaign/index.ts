// supabase/functions/send-campaign/index.ts
//
// Server-side EMAIL broadcast sender for the EventRally Campaign Studio.
// Uses Resend API with verified sender domain: send.geteventrally.com

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const reject = (reason: string, message: string, extra: Record<string, unknown> = {}) =>
  json({ ok: false, reason, message, ...extra }, 200);

const DEFAULT_FREE_EMAIL_MONTHLY_LIMIT = 100;

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM = Deno.env.get("CAMPAIGN_FROM_EMAIL") || "EventRally <news@send.geteventrally.com>";
    const REPLY_TO = Deno.env.get("CAMPAIGN_REPLY_TO") || "support@geteventrally.com";
    const FREE_LIMIT = parseInt(
      Deno.env.get("FREE_EMAIL_MONTHLY_LIMIT") || `${DEFAULT_FREE_EMAIL_MONTHLY_LIMIT}`,
      10,
    );

    // 1. Authenticate caller via JWT
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) return json({ ok: false, reason: "unauthorized" }, 401);

    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) return json({ ok: false, reason: "unauthorized" }, 401);
    const organiserId = userData.user.id;

    // 2. Parse body & load campaign
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return reject("bad_request", "Invalid request body.");
    }
    const campaignId = body?.campaignId;
    if (!campaignId) return reject("bad_request", "campaignId is required.");

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: campaign, error: campErr } = await admin
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .maybeSingle();

    if (campErr) return json({ ok: false, reason: "server_error", message: campErr.message }, 500);
    if (!campaign) return reject("not_found", "Campaign not found.");

    // 3. Ownership & status guards
    if (campaign.organiser_id !== organiserId) {
      return reject("forbidden", "You do not own this campaign.");
    }
    if (campaign.status !== "draft" && campaign.status !== "failed") {
      return reject("already_processed", `This campaign is '${campaign.status}' and cannot be sent again.`);
    }
    const TERMII_API_KEY = Deno.env.get("TERMII_API_KEY");
    const TERMII_SENDER_ID = Deno.env.get("TERMII_SENDER_ID") || "EventRally";
    const SMS_UNIT_PRICE_NAIRA = 6.5; // Retail price per SMS charged to organiser wallet

    await admin.from("campaigns").update({ status: "sending", error: null }).eq("id", campaignId);

    // 4. Resolve target events
    let eventIds: string[] = [];
    if (campaign.event_id) {
      const { data: ev } = await admin
        .from("events")
        .select("id")
        .eq("id", campaign.event_id)
        .eq("organiser_id", organiserId)
        .maybeSingle();
      if (!ev) {
        await admin.from("campaigns").update({ status: "failed", error: "Target event not owned by organiser" }).eq("id", campaignId);
        return reject("forbidden", "The target event does not belong to you.");
      }
      eventIds = [ev.id];
    } else {
      const { data: evs } = await admin.from("events").select("id").eq("organiser_id", organiserId);
      eventIds = (evs || []).map((e: any) => e.id);
    }

    if (eventIds.length === 0) {
      await admin.from("campaigns").update({ status: "failed", error: "No events to target", recipient_count: 0 }).eq("id", campaignId);
      return reject("no_recipients", "You have no events with registrations yet.");
    }

    // 5. Load registrations & deduplicate based on channel
    const isSms = campaign.channel === "sms";

    const { data: regs, error: regErr } = await admin
      .from("registrations")
      .select("id, full_name, email, phone_number, phone")
      .in("event_id", eventIds);
    if (regErr) {
      await admin.from("campaigns").update({ status: "failed", error: regErr.message }).eq("id", campaignId);
      return json({ ok: false, reason: "server_error", message: regErr.message }, 500);
    }

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const seen = new Set<string>();
    const recipients: { registration_id: string; contact: string; name: string }[] = [];

    if (isSms) {
      // Clean and normalize phone numbers (e.g. 08012345678 -> 2348012345678)
      for (const r of regs || []) {
        const rawPhone = (r.phone_number || r.phone || "").trim().replace(/[\s\-\(\)]/g, "");
        if (!rawPhone || rawPhone.length < 10) continue;
        let normalized = rawPhone;
        if (normalized.startsWith("0")) {
          normalized = "234" + normalized.slice(1);
        } else if (normalized.startsWith("+")) {
          normalized = normalized.slice(1);
        }
        if (seen.has(normalized)) continue;
        seen.add(normalized);
        recipients.push({ registration_id: r.id, contact: normalized, name: r.full_name || "" });
      }
    } else {
      const { data: unsubs } = await admin
        .from("email_unsubscribes")
        .select("email")
        .eq("organiser_id", organiserId);
      const suppressed = new Set((unsubs || []).map((u: any) => (u.email || "").toLowerCase().trim()));

      for (const r of regs || []) {
        const email = (r.email || "").toLowerCase().trim();
        if (!email || !emailRe.test(email)) continue;
        if (suppressed.has(email)) continue;
        if (seen.has(email)) continue;
        seen.add(email);
        recipients.push({ registration_id: r.id, contact: email, name: r.full_name || "" });
      }
    }

    if (recipients.length === 0) {
      const msg = isSms 
        ? "No eligible recipients with registered phone numbers found."
        : "No eligible recipients (all unsubscribed or missing email).";
      await admin.from("campaigns").update({ status: "failed", error: msg, recipient_count: 0 }).eq("id", campaignId);
      return reject("no_recipients", msg);
    }

    // 6. Quota & Wallet Balance Checks
    const period = new Date().toISOString().slice(0, 7); // YYYY-MM
    const { data: wallet } = await admin
      .from("organiser_wallets")
      .select("sms_balance, plan")
      .eq("organiser_id", organiserId)
      .maybeSingle();
    const plan = wallet?.plan || "free";
    const currentSmsBalance = Number(wallet?.sms_balance) || 0;

    if (isSms) {
      const requiredCost = recipients.length * SMS_UNIT_PRICE_NAIRA;
      if (currentSmsBalance < requiredCost) {
        const msg = `Insufficient SMS balance. This send requires ₦${requiredCost.toLocaleString()} (${recipients.length} SMS units), but your wallet balance is ₦${currentSmsBalance.toLocaleString()}. Please top up your wallet.`;
        await admin.from("campaigns").update({ status: "failed", error: msg, recipient_count: recipients.length }).eq("id", campaignId);
        return reject("insufficient_funds", msg, { required: requiredCost, balance: currentSmsBalance });
      }

      if (!TERMII_API_KEY) {
        await admin.from("campaigns").update({ status: "failed", error: "TERMII_API_KEY is not configured", recipient_count: recipients.length }).eq("id", campaignId);
        return reject("sms_not_configured", "SMS delivery service is being connected. Please set the TERMII_API_KEY secret.");
      }
    } else {
      const { data: usageRow } = await admin
        .from("organiser_email_usage")
        .select("sent_count")
        .eq("organiser_id", organiserId)
        .eq("period", period)
        .maybeSingle();
      const usedThisMonth = usageRow?.sent_count || 0;

      if (plan !== "pro" && usedThisMonth + recipients.length > FREE_LIMIT) {
        const remaining = Math.max(0, FREE_LIMIT - usedThisMonth);
        await admin
          .from("campaigns")
          .update({ status: "failed", error: "Monthly free email limit exceeded", recipient_count: recipients.length })
          .eq("id", campaignId);
        return reject(
          "limit_exceeded",
          `This send needs ${recipients.length} emails but only ${remaining} of your ${FREE_LIMIT} free monthly emails remain. Upgrade to Pro or contact support.`,
          { limit: FREE_LIMIT, used: usedThisMonth, remaining, needed: recipients.length },
        );
      }

      if (!RESEND_API_KEY) {
        await admin
          .from("campaigns")
          .update({ status: "failed", error: "Email not configured (RESEND_API_KEY missing)", recipient_count: recipients.length })
          .eq("id", campaignId);
        return reject(
          "email_not_configured",
          "Email sending is not configured yet. Set the RESEND_API_KEY secret.",
        );
      }
    }

    // 7. Stash recipients with tracking tokens
    const rows = recipients.map((r) => ({
      campaign_id: campaignId,
      registration_id: r.registration_id,
      contact: r.contact,
      name: r.name,
      status: "pending",
      unsubscribe_token: crypto.randomUUID(),
    }));
    const { data: inserted, error: insErr } = await admin
      .from("campaign_recipients")
      .insert(rows)
      .select("id, contact, name, unsubscribe_token");
    if (insErr || !inserted) {
      await admin.from("campaigns").update({ status: "failed", error: insErr?.message || "recipient insert failed" }).eq("id", campaignId);
      return json({ ok: false, reason: "server_error", message: insErr?.message || "Failed to stage recipients" }, 500);
    }

    // 8. Dispatch based on channel
    let sent = 0;
    let failed = 0;
    const sentIds: string[] = [];

    if (isSms) {
      // Dispatch SMS via Termii
      for (const rec of inserted as any[]) {
        const smsContent = campaign.body.replace(/\{\{name\}\}/gi, rec.name || "there");
        try {
          const res = await fetch("https://api.ng.termii.com/api/sms/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: rec.contact,
              from: TERMII_SENDER_ID,
              sms: smsContent,
              type: "plain",
              channel: "generic",
              api_key: TERMII_API_KEY,
            }),
          });
          const termiiRes = await res.json().catch(() => ({}));
          if (res.ok && termiiRes.code === "ok") {
            sent++;
            sentIds.push(rec.id);
          } else {
            failed++;
            await admin.from("campaign_recipients").update({ 
              status: "failed", 
              error: termiiRes.message || `Termii Error (HTTP ${res.status})` 
            }).eq("id", rec.id);
          }
        } catch (e) {
          failed++;
          await admin.from("campaign_recipients").update({ status: "failed", error: (e as Error).message }).eq("id", rec.id);
        }
      }

      // Deduct spent funds from wallet
      if (sent > 0) {
        const amountDebited = sent * SMS_UNIT_PRICE_NAIRA;
        const newBalance = Math.max(0, currentSmsBalance - amountDebited);
        await admin.from("organiser_wallets").update({ sms_balance: newBalance, updated_at: new Date().toISOString() }).eq("organiser_id", organiserId);
        await admin.from("wallet_transactions").insert({
          organiser_id: organiserId,
          type: "debit",
          amount: amountDebited,
          balance_after: newBalance,
          description: `SMS Broadcast: ${sent} messages sent (₦${amountDebited.toFixed(2)})`,
        });
      }
    } else {
      // Dispatch emails via Resend
      const subject = campaign.subject || "A message from your event organiser";
      for (const rec of inserted as any[]) {
        const unsubUrl = `${SUPABASE_URL}/functions/v1/unsubscribe?t=${rec.unsubscribe_token}`;
        const emailHtml = buildHtml(campaign.body, rec.name, subject, unsubUrl);
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: FROM,
              to: [rec.contact],
              subject,
              html: emailHtml,
              reply_to: REPLY_TO,
              headers: { 
                "List-Unsubscribe": `<${unsubUrl}>`, 
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" 
              },
            }),
          });
          if (res.ok) {
            sent++;
            sentIds.push(rec.id);
          } else {
            const errBody = await res.json().catch(() => ({}));
            failed++;
            await admin.from("campaign_recipients").update({ status: "failed", error: (errBody as any)?.message || `Resend HTTP ${res.status}` }).eq("id", rec.id);
          }
        } catch (e) {
          failed++;
          await admin.from("campaign_recipients").update({ status: "failed", error: (e as Error).message }).eq("id", rec.id);
        }
      }
    }

    if (sentIds.length > 0) {
      await admin
        .from("campaign_recipients")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .in("id", sentIds);
    }

    // 9. Update campaign status & usage
    const finalStatus = sent > 0 ? "sent" : "failed";
    await admin
      .from("campaigns")
      .update({
        status: finalStatus,
        recipient_count: recipients.length,
        sent_count: sent,
        failed_count: failed,
        error: sent === 0 ? "All sends failed" : null,
        sent_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    if (!isSms && sent > 0) {
      const { data: usageRow } = await admin
        .from("organiser_email_usage")
        .select("sent_count")
        .eq("organiser_id", organiserId)
        .eq("period", period)
        .maybeSingle();
      const usedThisMonth = usageRow?.sent_count || 0;

      await admin
        .from("organiser_email_usage")
        .upsert(
          { organiser_id: organiserId, period, sent_count: usedThisMonth + sent, updated_at: new Date().toISOString() },
          { onConflict: "organiser_id,period" },
        );
    }

    return json({ ok: true, sent, failed, total: recipients.length, status: finalStatus });
  } catch (e) {
    console.error("send-campaign fatal:", e);
    return json({ ok: false, reason: "server_error", message: (e as Error).message }, 500);
  }
});

function buildHtml(rawBody: string, recipientName: string, subject: string, unsubUrl: string): string {
  const personalised = escapeHtml(rawBody).replace(/\{\{name\}\}/gi, escapeHtml(recipientName || "there"));
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
    <body style="margin:0; padding:24px; background-color:#F8FAFC; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:#0F172A;">
      <div style="max-width:580px; margin:0 auto; background-color:#FFFFFF; border:1px solid #E2E8F0; border-radius:12px; padding:28px; box-shadow:0 2px 4px rgba(0,0,0,0.04);">
        <div style="font-size:11px; font-family:monospace; font-weight:bold; color:#0058BE; text-transform:uppercase; margin-bottom:8px; letter-spacing:1px;">
          EVENTRALLY &bull; ORGANISER BROADCAST
        </div>
        <h2 style="font-size:20px; font-weight:900; margin:0 0 16px 0; color:#0F172A;">
          ${escapeHtml(subject)}
        </h2>
        <div style="font-size:14px; line-height:1.7; color:#334155; white-space:pre-line;">
          ${personalised}
        </div>
        <div style="margin-top:28px; border-top:1px solid #E2E8F0; padding-top:14px; font-size:11px; color:#94A3B8; line-height:1.6;">
          You received this message because you registered for an event on <a href="https://www.geteventrally.com" style="color:#0058BE; text-decoration:none; font-weight:bold;">EventRally</a>.
          <br />
          <a href="${unsubUrl}" style="color:#64748B; text-decoration:underline;">Unsubscribe from this organiser's broadcasts</a>
        </div>
      </div>
    </body>
    </html>
  `;
}
