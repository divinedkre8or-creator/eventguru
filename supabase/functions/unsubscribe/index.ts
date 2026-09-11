// supabase/functions/unsubscribe/index.ts
//
// Public one-click unsubscribe endpoint (verify_jwt = false).
//
// Linked from every campaign email's footer and its List-Unsubscribe header.
// The per-recipient token identifies the row; from it we derive the email +
// owning organiser and add them to that organiser's suppression list. Suppression
// is per-organiser (unsubscribing from one organiser does not opt you out of
// others). Idempotent: re-visiting the link is harmless.
//
// Returns a small self-contained HTML page (no SPA routing needed), so the link
// works from any mail client.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const page = (title: string, message: string, ok: boolean) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title></head>
<body style="margin:0; padding:0; background:#F8FAFC; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:#0F172A;">
  <div style="max-width:480px; margin:64px auto; background:#FFFFFF; border:1px solid #E2E8F0; border-radius:16px; padding:36px; text-align:center;">
    <div style="width:48px; height:48px; border-radius:12px; margin:0 auto 16px; display:flex; align-items:center; justify-content:center; font-size:24px; background:${ok ? "#ECFDF5" : "#FEF2F2"}; color:${ok ? "#065F46" : "#991B1B"};">${ok ? "✓" : "!"}</div>
    <h1 style="font-size:20px; font-weight:900; margin:0 0 8px;">${title}</h1>
    <p style="font-size:14px; line-height:1.6; color:#475569; margin:0;">${message}</p>
    <div style="margin-top:24px; font-size:11px; color:#94A3B8;">EventRally</div>
  </div>
</body></html>`;

const html = (body: string, status = 200) =>
  new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("t");
    if (!token) {
      return html(page("Invalid link", "This unsubscribe link is missing its token.", false), 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve the recipient row -> email + owning organiser (via its campaign).
    const { data: rec } = await admin
      .from("campaign_recipients")
      .select("contact, campaign_id, campaigns(organiser_id)")
      .eq("unsubscribe_token", token)
      .maybeSingle();

    const email = (rec as any)?.contact;
    const organiserId = (rec as any)?.campaigns?.organiser_id;

    if (!rec || !email || !organiserId) {
      return html(page("Link expired", "We could not match this unsubscribe link. It may have expired.", false), 404);
    }

    // Add to the organiser's suppression list (idempotent).
    await admin
      .from("email_unsubscribes")
      .upsert(
        { organiser_id: organiserId, email: (email as string).toLowerCase().trim() },
        { onConflict: "organiser_id,email" },
      );

    return html(
      page(
        "You're unsubscribed",
        "You will no longer receive marketing emails from this event organiser. Ticket and account emails are unaffected.",
        true,
      ),
    );
  } catch (e) {
    console.error("unsubscribe error:", e);
    return html(page("Something went wrong", "Please try again later.", false), 500);
  }
});
