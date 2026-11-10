// supabase/functions/send-organizer-digest/index.ts
//
// EventRally — Weekly Organizer Performance Report
// Automated Monday morning digest delivering deterministic metrics
// (weekly tickets, revenue, event countdown) and curated operational guidance.
// Strictly professional editorial styling — stacked for mobile responsiveness.
// Zero AI slop: no gradients, no pills, no splash emojis, strictly on-brand colors.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const escapeHtml = (s: string): string =>
  String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

interface GrowthPlaybook {
  stage: string;
  headline: string;
  content: string;
  actionText: string;
  actionPath: string;
}

const GROWTH_PLAYBOOKS: Record<string, GrowthPlaybook> = {
  countdown_48h: {
    stage: "48 Hours Out",
    headline: "Send an SMS Reminder to All Attendees",
    content: "Direct SMS delivers a 98% open rate. Send a concise reminder with entrance gate timing, venue parking instructions, and check-in details to prevent front-gate bottlenecks.",
    actionText: "Compose SMS Broadcast",
    actionPath: "/dashboard/campaigns?channel=sms",
  },
  qr_rapid: {
    stage: "Event Week Preparation",
    headline: "Equip Door Staff with Fast QR Check-In",
    content: "Avoid entrance delays. Open the rapid QR scanner on any smartphone or tablet to validate digital passes in under 1 second per attendee.",
    actionText: "Open Door Check-In",
    actionPath: "/dashboard/checkin",
  },
  dp_viral: {
    stage: "2-3 Weeks Out",
    headline: "Deploy Your Custom Event DP Generator",
    content: "Attendees enjoy sharing that they are attending. Generate your branded attendee flyer on EventRally and distribute the link across WhatsApp and social channels.",
    actionText: "Configure DP Generator",
    actionPath: "/dashboard/dp",
  },
  early_bird: {
    stage: "Ticket Sales Strategy",
    headline: "Create Urgency with Tiered Pricing",
    content: "Events with limited-quantity early tiers sell out faster. Reward early supporters with a temporary discounted tier before releasing regular passes.",
    actionText: "Manage Ticket Tiers",
    actionPath: "/dashboard/tickets",
  },
  create_first: {
    stage: "Getting Started",
    headline: "Publish Your Next Event Experience",
    content: "Ready to gather your community? EventRally gives you ticketing, automated payouts, digital admission passes, and attendee broadcasting in one platform.",
    actionText: "Create an Event Now",
    actionPath: "/dashboard/events/create",
  },
};

function selectPlaybook(daysUntilEvent: number | null, hasEvents: boolean): GrowthPlaybook {
  if (!hasEvents) return GROWTH_PLAYBOOKS.create_first;
  if (daysUntilEvent === null) return GROWTH_PLAYBOOKS.early_bird;
  if (daysUntilEvent <= 2) return GROWTH_PLAYBOOKS.countdown_48h;
  if (daysUntilEvent <= 7) return GROWTH_PLAYBOOKS.qr_rapid;
  if (daysUntilEvent <= 21) return GROWTH_PLAYBOOKS.dp_viral;
  return GROWTH_PLAYBOOKS.early_bird;
}

function buildDigestEmailHtml({
  organiserName,
  totalEvents,
  weeklyTickets,
  totalTickets,
  weeklyRevenue,
  nearestEvent,
  playbook,
  appUrl,
}: {
  organiserName: string;
  totalEvents: number;
  weeklyTickets: number;
  totalTickets: number;
  weeklyRevenue: number;
  nearestEvent: { title: string; dateStr: string; daysLeft: number | null; venue: string } | null;
  playbook: GrowthPlaybook;
  appUrl: string;
}): string {
  const formattedRevenue = `₦${weeklyRevenue.toLocaleString()}`;
  const greeting = escapeHtml(organiserName || "Organizer");
  const cleanAppUrl = appUrl.replace(/\/+$/, "");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Weekly EventRally Performance Report</title>
</head>
<body style="margin: 0; padding: 16px 8px; background-color: #F9FAFB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827; line-height: 1.5;">
  
  <div style="max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 4px; overflow: hidden;">
    
    <!-- Header Brand Bar -->
    <div style="background-color: #111827; padding: 20px 24px; text-align: left; border-bottom: 2px solid #0058BE;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="vertical-align: middle;">
            <div style="font-size: 18px; font-weight: 800; letter-spacing: 1px; color: #FFFFFF; text-transform: uppercase;">
              EVENTRALLY
            </div>
            <div style="font-size: 10px; font-weight: 600; color: #9CA3AF; text-transform: uppercase; margin-top: 3px; letter-spacing: 1px;">
              WEEKLY ORGANIZER REPORT
            </div>
          </td>
          <td style="vertical-align: middle; text-align: right;">
            <a href="${cleanAppUrl}/dashboard" style="background-color: #0058BE; color: #FFFFFF; font-size: 11px; font-weight: 700; text-decoration: none; padding: 8px 14px; border-radius: 3px; display: inline-block;">
              Open Dashboard
            </a>
          </td>
        </tr>
      </table>
    </div>

    <!-- Main Content Container -->
    <div style="padding: 24px 20px;">
      
      <!-- Greeting -->
      <h1 style="color: #111827; font-size: 20px; margin: 0 0 6px 0; font-weight: 800; line-height: 1.3;">
        Hello ${greeting}, here is your weekly performance summary.
      </h1>
      <p style="color: #4B5563; font-size: 13px; margin: 0 0 20px 0; line-height: 1.5;">
        A deterministic summary of your ticket registrations and revenue over the past 7 days on EventRally.
      </p>

      <!-- Stacked Metric Cards for 100% Mobile Responsiveness -->
      <div style="margin-bottom: 20px;">
        
        <!-- Card 1: Tickets Sold -->
        <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 4px; padding: 16px 18px; margin-bottom: 12px;">
          <div style="font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
            PAST 7 DAYS &bull; TICKETS SOLD
          </div>
          <div style="font-size: 28px; font-weight: 800; color: #111827; line-height: 1.1;">
            ${weeklyTickets}
          </div>
          <div style="font-size: 12px; color: #6B7280; margin-top: 4px;">
            Confirmed registrations this past week
          </div>
        </div>

        <!-- Card 2: Weekly Gross Revenue -->
        <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 4px; padding: 16px 18px; margin-bottom: 12px;">
          <div style="font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
            PAST 7 DAYS &bull; GROSS REVENUE
          </div>
          <div style="font-size: 28px; font-weight: 800; color: #0058BE; line-height: 1.1;">
            ${formattedRevenue}
          </div>
          <div style="font-size: 12px; color: #6B7280; margin-top: 4px;">
            Direct gross ticket sales
          </div>
        </div>

        <!-- Card 3: Total Community Size -->
        <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 4px; padding: 16px 18px;">
          <div style="font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
            ALL-TIME &bull; REGISTERED ATTENDEES
          </div>
          <div style="font-size: 28px; font-weight: 800; color: #111827; line-height: 1.1;">
            ${totalTickets}
          </div>
          <div style="font-size: 12px; color: #6B7280; margin-top: 4px;">
            Total registered guests across your active events
          </div>
        </div>

      </div>

      ${
        nearestEvent
          ? `
      <!-- Nearest Event Spotlight -->
      <div style="background-color: #FFFFFF; border: 1px solid #D1D5DB; border-radius: 4px; padding: 16px 18px; margin-bottom: 20px;">
        <div style="font-size: 10px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
          NEAREST UPCOMING EVENT
        </div>
        <div style="font-size: 16px; font-weight: 800; color: #111827; margin-bottom: 4px;">
          ${escapeHtml(nearestEvent.title)}
        </div>
        <div style="font-size: 12px; color: #4B5563; margin-bottom: 10px;">
          Date: ${escapeHtml(nearestEvent.dateStr)} &bull; Venue: ${escapeHtml(nearestEvent.venue)}
        </div>
        <div>
          <span style="display: inline-block; border: 1px solid #0058BE; color: #0058BE; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 3px;">
            ${
              nearestEvent.daysLeft !== null && nearestEvent.daysLeft >= 0
                ? nearestEvent.daysLeft === 0
                  ? "SCHEDULED FOR TODAY"
                  : `SCHEDULED IN ${nearestEvent.daysLeft} DAYS`
                : "STATUS: ACTIVE"
            }
          </span>
        </div>
      </div>
      `
          : ""
      }

      <!-- Operational Recommendation -->
      <div style="background-color: #111827; border-radius: 4px; padding: 20px 18px; margin-bottom: 20px; color: #FFFFFF;">
        <div style="font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
          RECOMMENDED ACTION &bull; ${escapeHtml(playbook.stage)}
        </div>
        <h2 style="font-size: 16px; font-weight: 800; color: #FFFFFF; margin: 0 0 6px 0; line-height: 1.3;">
          ${escapeHtml(playbook.headline)}
        </h2>
        <p style="font-size: 13px; color: #D1D5DB; margin: 0 0 16px 0; line-height: 1.5;">
          ${escapeHtml(playbook.content)}
        </p>
        <div>
          <a href="${cleanAppUrl}${playbook.actionPath}" style="display: inline-block; background-color: #0058BE; color: #FFFFFF; font-weight: 700; font-size: 12px; text-decoration: none; padding: 9px 18px; border-radius: 3px;">
            ${escapeHtml(playbook.actionText)} &rarr;
          </a>
        </div>
      </div>

      <!-- Quick Operational Links -->
      <div style="border-top: 1px solid #E5E7EB; padding-top: 16px; margin-bottom: 6px;">
        <div style="font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px;">
          ORGANIZER STUDIO ACTIONS
        </div>
        <div style="font-size: 13px; line-height: 1.8;">
          <div>
            <a href="${cleanAppUrl}/dashboard/campaigns" style="color: #0058BE; font-weight: 600; text-decoration: none;">
              &bull; Send SMS Broadcast to Guests &rarr;
            </a>
          </div>
          <div>
            <a href="${cleanAppUrl}/dashboard/dp" style="color: #0058BE; font-weight: 600; text-decoration: none;">
              &bull; Manage Event DP Frame &rarr;
            </a>
          </div>
          <div>
            <a href="${cleanAppUrl}/dashboard/tickets" style="color: #0058BE; font-weight: 600; text-decoration: none;">
              &bull; Adjust Ticket Tiers &amp; Pricing &rarr;
            </a>
          </div>
          <div>
            <a href="${cleanAppUrl}/dashboard/checkin" style="color: #0058BE; font-weight: 600; text-decoration: none;">
              &bull; Open Fast Door Check-In &rarr;
            </a>
          </div>
        </div>
      </div>

    </div>

    <!-- Footer -->
    <div style="background-color: #F9FAFB; border-top: 1px solid #E5E7EB; padding: 16px 20px; text-align: center; font-size: 11px; color: #6B7280; line-height: 1.5;">
      <p style="margin: 0 0 4px 0;">
        You are receiving this report because you host events on <strong>EventRally</strong>.
      </p>
      <p style="margin: 0;">
        &copy; 2026 EventRally &bull; The Event Operating System. 
        <a href="${cleanAppUrl}/dashboard/settings" style="color: #4B5563; text-decoration: underline; margin-left: 6px;">Notification Settings</a>
      </p>
    </div>

  </div>

</body>
</html>
  `.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const APP_URL = Deno.env.get("APP_URL") || Deno.env.get("PUBLIC_APP_URL") || "https://www.geteventrally.com";

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Missing Supabase server credentials" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Parse options from body
    const body = await req.json().catch(() => ({}));
    const { testEmail, targetOrganiserId, limit = 50 } = body;

    // Check authorization: must either be an admin user JWT, secret service_role key, or test trigger
    const authHeader = req.headers.get("Authorization") || "";
    const isServiceRole = authHeader.replace(/^Bearer\s+/i, "") === SERVICE_ROLE_KEY;
    let isCallerAdmin = isServiceRole;

    if (!isCallerAdmin && authHeader && ANON_KEY) {
      try {
        const authClient = createClient(SUPABASE_URL, ANON_KEY, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: userData } = await authClient.auth.getUser();
        if (userData?.user?.id) {
          const { data: roleRow } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", userData.user.id)
            .eq("role", "admin")
            .maybeSingle();

          if (roleRow) isCallerAdmin = true;
        }
      } catch (_authErr) {
        // Fall back
      }
    }

    // Allow direct admin/service-role invocation or local development preview trigger
    if (!isCallerAdmin && !testEmail) {
      return new Response(JSON.stringify({ error: "Unauthorized: Admin or Service Role required to dispatch digests" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("DIGEST_FROM_EMAIL") || Deno.env.get("CAMPAIGN_FROM_EMAIL") || "EventRally <news@send.geteventrally.com>";

    // Calculate past 7 days timestamp
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoIso = sevenDaysAgo.toISOString();

    // 1. Identify Target Organizers
    let targetOrganiserIds: string[] = [];

    if (targetOrganiserId) {
      targetOrganiserIds = [targetOrganiserId];
    } else {
      // Find all distinct organizers from user_roles and events
      const [roleOrganisers, eventOrganisers] = await Promise.all([
        supabaseAdmin.from("user_roles").select("user_id").eq("role", "organiser"),
        supabaseAdmin.from("events").select("organiser_id"),
      ]);

      const idSet = new Set<string>();
      roleOrganisers.data?.forEach((r) => r.user_id && idSet.add(r.user_id));
      eventOrganisers.data?.forEach((e) => e.organiser_id && idSet.add(e.organiser_id));
      targetOrganiserIds = Array.from(idSet).slice(0, Number(limit) || 50);
    }

    if (targetOrganiserIds.length === 0 && !testEmail) {
      return new Response(JSON.stringify({ message: "No organizers found", count: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch Profiles for Names
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", targetOrganiserIds.length > 0 ? targetOrganiserIds : ["none"]);

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));

    // 3. Process each organizer
    const results: Array<{ organiserId: string; email: string; status: string; error?: string }> = [];

    // If testEmail is specified without organizer IDs, dispatch a preview digest with mock/sample metrics
    if (testEmail && targetOrganiserIds.length === 0) {
      const samplePlaybook = GROWTH_PLAYBOOKS.early_bird;
      const htmlContent = buildDigestEmailHtml({
        organiserName: "Preview Organizer",
        totalEvents: 2,
        weeklyTickets: 14,
        totalTickets: 120,
        weeklyRevenue: 105000,
        nearestEvent: {
          title: "Tech Summit 2026",
          dateStr: "Saturday, 25 October 2026",
          daysLeft: 15,
          venue: "Landmark Centre, Lagos",
        },
        playbook: samplePlaybook,
        appUrl: APP_URL,
      });

      if (!RESEND_API_KEY) {
        return new Response(
          JSON.stringify({
            message: "Digest MOCK dispatched (No RESEND_API_KEY set)",
            testEmail,
            preview: true,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [testEmail],
          subject: "Your Weekly EventRally Performance Report (Preview)",
          html: htmlContent,
        }),
      });

      const resData = await res.json();
      return new Response(
        JSON.stringify({ message: "Test digest sent successfully", to: testEmail, resData }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    for (const orgId of targetOrganiserIds) {
      try {
        let recipientEmail = testEmail;
        if (!recipientEmail) {
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(orgId);
          recipientEmail = userData?.user?.email;
        }

        if (!recipientEmail) {
          results.push({ organiserId: orgId, email: "", status: "skipped_no_email" });
          continue;
        }

        // Fetch organizer's events
        const { data: orgEvents } = await supabaseAdmin
          .from("events")
          .select("id, title, date, venue, city, status, created_at, ticket_types(sold)")
          .eq("organiser_id", orgId)
          .order("date", { ascending: true });

        const events = orgEvents || [];
        const eventIds = events.map((e) => e.id);

        let weeklyTickets = 0;
        let weeklyRevenue = 0;
        let totalTickets = 0;

        if (eventIds.length > 0) {
          const { data: recentRegs } = await supabaseAdmin
            .from("registrations")
            .select("id, amount_paid, created_at")
            .in("event_id", eventIds)
            .gte("created_at", sevenDaysAgoIso);

          if (recentRegs) {
            weeklyTickets = recentRegs.length;
            weeklyRevenue = recentRegs.reduce((sum, r) => sum + (Number(r.amount_paid) || 0), 0);
          }

          const { count } = await supabaseAdmin
            .from("registrations")
            .select("id", { count: "exact", head: true })
            .in("event_id", eventIds);

          totalTickets = count ?? 0;
        }

        const nowMs = Date.now();
        const upcoming = events.filter((e) => new Date(e.date).getTime() >= nowMs - 24 * 3600 * 1000);
        const nearest = upcoming[0] || null;

        let nearestEventData = null;
        let daysUntilEvent: number | null = null;

        if (nearest) {
          const evtDate = new Date(nearest.date);
          daysUntilEvent = Math.ceil((evtDate.getTime() - nowMs) / (1000 * 3600 * 24));
          nearestEventData = {
            title: nearest.title,
            dateStr: evtDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
            daysLeft: daysUntilEvent,
            venue: [nearest.venue, nearest.city].filter(Boolean).join(", ") || "Venue TBA",
          };
        }

        const playbook = selectPlaybook(daysUntilEvent, events.length > 0);
        const orgName = profileMap.get(orgId) || "Organizer";

        const htmlContent = buildDigestEmailHtml({
          organiserName: orgName,
          totalEvents: events.length,
          weeklyTickets,
          totalTickets,
          weeklyRevenue,
          nearestEvent: nearestEventData,
          playbook,
          appUrl: APP_URL,
        });

        if (!RESEND_API_KEY) {
          console.log(`[MOCK] Would send digest to ${recipientEmail}`);
          results.push({ organiserId: orgId, email: recipientEmail, status: "mock_sent" });

          await supabaseAdmin.from("organizer_email_logs").insert({
            organiser_id: orgId,
            email_type: "weekly_digest",
            recipient_email: recipientEmail,
            status: "mock_sent",
            metadata: {
              weeklyTickets,
              weeklyRevenue,
              totalTickets,
              nearestEventTitle: nearestEventData?.title,
            },
          });

          continue;
        }

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [recipientEmail],
            subject: `Your Weekly EventRally Performance Report`,
            html: htmlContent,
          }),
        });

        if (!emailRes.ok) {
          const errText = await emailRes.text();
          results.push({ organiserId: orgId, email: recipientEmail, status: "failed", error: errText });

          await supabaseAdmin.from("organizer_email_logs").insert({
            organiser_id: orgId,
            email_type: "weekly_digest",
            recipient_email: recipientEmail,
            status: "failed",
            error: errText,
            metadata: { weeklyTickets, weeklyRevenue },
          });
        } else {
          results.push({ organiserId: orgId, email: recipientEmail, status: "sent" });

          await supabaseAdmin.from("organizer_email_logs").insert({
            organiser_id: orgId,
            email_type: "weekly_digest",
            recipient_email: recipientEmail,
            status: "sent",
            metadata: {
              weeklyTickets,
              weeklyRevenue,
              totalTickets,
              nearestEventTitle: nearestEventData?.title,
            },
          });
        }
      } catch (err: any) {
        results.push({ organiserId: orgId, email: "", status: "error", error: err?.message || String(err) });
      }
    }

    const sentCount = results.filter((r) => r.status === "sent" || r.status === "mock_sent").length;

    return new Response(
      JSON.stringify({
        success: true,
        totalProcessed: results.length,
        sentCount,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("send-organizer-digest fatal error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
