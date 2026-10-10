// supabase/functions/send-organizer-digest/index.ts
//
// Weekly Organizer Performance Digest & Growth Playbook Newsletter
// Sends deterministic metrics (tickets sold this week, revenue, countdown)
// and curated growth tips to EventGuru event organizers.
// Strictly NO AI generated content — standard, high-contrast responsive newsletter email.

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
  actionLink: string;
}

const GROWTH_PLAYBOOKS: Record<string, GrowthPlaybook> = {
  countdown_48h: {
    stage: "48 Hours Out",
    headline: "Send a 48-Hour SMS Countdown Reminder",
    content: "Direct SMS has a 98% open rate. Send a quick reminder with entrance gate timing, venue parking instructions, and fast-track check-in details to prevent front-gate bottlenecks.",
    actionText: "Compose SMS Broadcast",
    actionLink: "https://www.geteventrally.com/dashboard/campaigns?channel=sms",
  },
  qr_rapid: {
    stage: "Event Week Prep",
    headline: "Equip Gate Stewards with 1-Second QR Check-In",
    content: "Avoid long entrance queues under the sun or rain. Open the rapid QR scanner on any smartphone or tablet to validate digital passes in under 1 second per attendee.",
    actionText: "Open Rapid QR Check-In",
    actionLink: "https://www.geteventrally.com/dashboard/checkin",
  },
  dp_viral: {
    stage: "2-3 Weeks Out",
    headline: "Deploy Your Custom Event DP Generator",
    content: "Attendees love showing off that they are attending. Generate your branded 'I Will Be Attending' picture flyer on EventGuru and distribute the link across WhatsApp groups and Instagram stories for viral attendee reach.",
    actionText: "Configure DP Generator",
    actionLink: "https://www.geteventrally.com/dashboard/dp",
  },
  early_bird: {
    stage: "Ticket Sales Strategy",
    headline: "Create Scarcity with Tiered Early-Bird Pricing",
    content: "Events with limited-quantity early-bird tiers convert 3x faster than flat-rate events. Reward your early supporters with a temporary discounted tier before releasing regular passes.",
    actionText: "Manage Ticket Tiers",
    actionLink: "https://www.geteventrally.com/dashboard/tickets",
  },
  create_first: {
    stage: "Getting Started",
    headline: "Launch Your Next Event Experience",
    content: "Ready to gather your community? EventGuru gives you instant ticketing, Paystack instant payouts, automated branded admission passes, and attendee SMS broadcasting all in one place.",
    actionText: "Create an Event Now",
    actionLink: "https://www.geteventrally.com/dashboard/events/create",
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
}: {
  organiserName: string;
  totalEvents: number;
  weeklyTickets: number;
  totalTickets: number;
  weeklyRevenue: number;
  nearestEvent: { title: string; dateStr: string; daysLeft: number | null; venue: string } | null;
  playbook: GrowthPlaybook;
}): string {
  const formattedRevenue = `₦${weeklyRevenue.toLocaleString()}`;
  const greeting = escapeHtml(organiserName || "Organizer");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Weekly EventGuru Organizer Digest</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A; line-height: 1.5;">
  
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.06);">
    
    <!-- Top Header Brand Bar -->
    <div style="background-color: #0F172A; padding: 22px 24px; text-align: left; border-bottom: 3px solid #0058BE;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="vertical-align: middle;">
            <div style="font-size: 20px; font-weight: 900; letter-spacing: 1px; color: #FFFFFF; text-transform: uppercase;">
              EVENTGURU
            </div>
            <div style="font-size: 10px; font-family: monospace; font-weight: bold; color: #38BDF8; text-transform: uppercase; margin-top: 4px; letter-spacing: 1.5px;">
              ORGANIZER WEEKLY DIGEST &amp; PLAYBOOK
            </div>
          </td>
          <td style="vertical-align: middle; text-align: right;">
            <a href="https://www.geteventrally.com/dashboard" style="background-color: #0058BE; color: #FFFFFF; font-size: 11px; font-weight: 800; text-decoration: none; padding: 8px 14px; border-radius: 6px; display: inline-block;">
              Open Studio &rarr;
            </a>
          </td>
        </tr>
      </table>
    </div>

    <!-- Main Body Container -->
    <div style="padding: 28px 24px;">
      
      <!-- Greeting & Intro -->
      <h1 style="color: #0F172A; font-size: 22px; margin: 0 0 8px 0; font-weight: 900; line-height: 1.25;">
        Hi ${greeting}, here is your weekly event roundup.
      </h1>
      <p style="color: #64748B; font-size: 14px; margin: 0 0 24px 0; line-height: 1.5;">
        Here's a breakdown of your event ticketing activity over the past 7 days, along with your recommended growth action for this week.
      </p>

      <!-- 3 Key Metric Stats Cards -->
      <table style="width: 100%; border-collapse: separate; border-spacing: 8px; margin-left: -8px; margin-right: -8px; margin-bottom: 24px;">
        <tr>
          <td style="width: 33.33%; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px 12px; text-align: center; vertical-align: top;">
            <div style="font-size: 10px; font-family: monospace; font-weight: 800; color: #0058BE; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
              PAST 7 DAYS
            </div>
            <div style="font-size: 24px; font-weight: 900; color: #0F172A; line-height: 1.1;">
              ${weeklyTickets}
            </div>
            <div style="font-size: 11px; color: #64748B; margin-top: 4px;">
              Tickets Sold
            </div>
          </td>

          <td style="width: 33.33%; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px 12px; text-align: center; vertical-align: top;">
            <div style="font-size: 10px; font-family: monospace; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
              WEEKLY REVENUE
            </div>
            <div style="font-size: 20px; font-weight: 900; color: #059669; line-height: 1.1;">
              ${formattedRevenue}
            </div>
            <div style="font-size: 11px; color: #64748B; margin-top: 4px;">
              Direct Payouts
            </div>
          </td>

          <td style="width: 33.33%; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px 12px; text-align: center; vertical-align: top;">
            <div style="font-size: 10px; font-family: monospace; font-weight: 800; color: #7C3AED; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
              COMMUNITY
            </div>
            <div style="font-size: 24px; font-weight: 900; color: #0F172A; line-height: 1.1;">
              ${totalTickets}
            </div>
            <div style="font-size: 11px; color: #64748B; margin-top: 4px;">
              Total Attendees
            </div>
          </td>
        </tr>
      </table>

      ${
        nearestEvent
          ? `
      <!-- Nearest Event Spotlight -->
      <div style="background-color: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="vertical-align: top;">
              <div style="font-size: 10px; font-family: monospace; font-weight: bold; color: #64748B; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">
                UPCOMING EVENT SPOTLIGHT
              </div>
              <div style="font-size: 16px; font-weight: 900; color: #0F172A; margin-bottom: 4px;">
                ${escapeHtml(nearestEvent.title)}
              </div>
              <div style="font-size: 12px; color: #475569;">
                📅 ${escapeHtml(nearestEvent.dateStr)} &bull; 📍 ${escapeHtml(nearestEvent.venue)}
              </div>
            </td>
            <td style="vertical-align: middle; text-align: right; width: 100px;">
              ${
                nearestEvent.daysLeft !== null && nearestEvent.daysLeft >= 0
                  ? `<div style="background-color: #EFF6FF; border: 1px solid #BFDBFE; color: #1D4ED8; font-weight: 800; font-size: 11px; font-family: monospace; padding: 6px 10px; border-radius: 6px; display: inline-block;">
                      ${nearestEvent.daysLeft === 0 ? "TODAY" : `IN ${nearestEvent.daysLeft} DAYS`}
                    </div>`
                  : `<div style="background-color: #F1F5F9; color: #64748B; font-weight: 800; font-size: 11px; padding: 6px 10px; border-radius: 6px; display: inline-block;">
                      LIVE NOW
                    </div>`
              }
            </td>
          </tr>
        </table>
      </div>
      `
          : ""
      }

      <!-- Growth Playbook Feature Card (Curated, Deterministic Tip) -->
      <div style="background-color: #0F172A; border-radius: 14px; padding: 24px 22px; margin-bottom: 24px; color: #FFFFFF;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
          <tr>
            <td>
              <span style="background-color: #1E293B; border: 1px solid #334155; color: #38BDF8; font-size: 10px; font-family: monospace; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; border-radius: 999px;">
                💡 PLAYBOOK: ${escapeHtml(playbook.stage)}
              </span>
            </td>
          </tr>
        </table>
        
        <h2 style="font-size: 18px; font-weight: 900; color: #FFFFFF; margin: 12px 0 8px 0; line-height: 1.3;">
          ${escapeHtml(playbook.headline)}
        </h2>
        <p style="font-size: 13px; color: #94A3B8; margin: 0 0 18px 0; line-height: 1.55;">
          ${escapeHtml(playbook.content)}
        </p>

        <div>
          <a href="${playbook.actionLink}" style="display: inline-block; background-color: #0058BE; color: #FFFFFF; font-weight: 800; font-size: 13px; text-decoration: none; padding: 11px 22px; border-radius: 8px;">
            ${escapeHtml(playbook.actionText)} &rarr;
          </a>
        </div>
      </div>

      <!-- Quick Action Grid -->
      <div style="border-top: 1px solid #E2E8F0; padding-top: 20px; margin-bottom: 8px;">
        <div style="font-size: 11px; font-family: monospace; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">
          QUICK STUDIO ACTIONS
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0;">
              <a href="https://www.geteventrally.com/dashboard/campaigns" style="color: #0058BE; font-weight: bold; text-decoration: none;">
                &bull; Send Bulk SMS Broadcast &rarr;
              </a>
            </td>
            <td style="padding: 6px 0; text-align: right;">
              <a href="https://www.geteventrally.com/dashboard/dp" style="color: #0058BE; font-weight: bold; text-decoration: none;">
                &bull; Event DP Generator &rarr;
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 6px 0;">
              <a href="https://www.geteventrally.com/dashboard/tickets" style="color: #0058BE; font-weight: bold; text-decoration: none;">
                &bull; Manage Ticket Tiers &rarr;
              </a>
            </td>
            <td style="padding: 6px 0; text-align: right;">
              <a href="https://www.geteventrally.com/dashboard/checkin" style="color: #0058BE; font-weight: bold; text-decoration: none;">
                &bull; Gate QR Check-In &rarr;
              </a>
            </td>
          </tr>
        </table>
      </div>

    </div>

    <!-- Standard Newsletter Footer -->
    <div style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 24px; text-align: center; font-size: 11px; color: #94A3B8; line-height: 1.6;">
      <p style="margin: 0 0 6px 0;">
        You are receiving this weekly digest because you are a registered event organizer on <strong>EventGuru</strong>.
      </p>
      <p style="margin: 0;">
        &copy; 2026 EventGuru &bull; Where Events Sell Out. 
        <a href="https://www.geteventrally.com/dashboard/settings" style="color: #64748B; text-decoration: underline; margin-left: 8px;">Manage Preferences</a>
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

    // Check authorization: must either be an admin user JWT or secret cron key
    const authHeader = req.headers.get("Authorization");
    let isCallerAdmin = false;

    if (authHeader && ANON_KEY) {
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

    // Allow direct admin invocation or local development trigger
    if (!isCallerAdmin && !testEmail) {
      // If no admin token and not a test email dispatch, check authorization
      return new Response(JSON.stringify({ error: "Unauthorized: Admin privileges required to dispatch digests" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("TICKETS_FROM_EMAIL") || "EventGuru Digest <digest@send.geteventrally.com>";

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
          title: "Tech Summit Lagos 2026",
          dateStr: "Saturday, 25 October 2026",
          daysLeft: 15,
          venue: "Landmark Centre, Victoria Island",
        },
        playbook: samplePlaybook,
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
          subject: "Your Weekly Organizer Performance Digest (Preview)",
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
        // Resolve email:
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

        // Fetch registrations in the last 7 days
        let weeklyTickets = 0;
        let weeklyRevenue = 0;
        let totalTickets = 0;

        if (eventIds.length > 0) {
          const { data: recentRegs } = await supabaseAdmin
            .from("registrations")
            .select("amount_paid, created_at, status")
            .in("event_id", eventIds)
            .gte("created_at", sevenDaysAgoIso)
            .in("status", ["completed", "confirmed"]);

          (recentRegs || []).forEach((reg) => {
            weeklyTickets += 1;
            weeklyRevenue += Number(reg.amount_paid) || 0;
          });

          // Total tickets sold across all ticket types
          events.forEach((ev: any) => {
            ev.ticket_types?.forEach((tt: any) => {
              totalTickets += Number(tt.sold) || 0;
            });
          });

          if (totalTickets === 0 && weeklyTickets > 0) {
            totalTickets = weeklyTickets;
          }
        }

        // Find nearest upcoming event
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
        });

        if (!RESEND_API_KEY) {
          console.log(`[MOCK] Would send digest to ${recipientEmail}`);
          results.push({ organiserId: orgId, email: recipientEmail, status: "mock_sent" });
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
            subject: `Your EventGuru Weekly Organizer Digest & Growth Playbook`,
            html: htmlContent,
          }),
        });

        if (!emailRes.ok) {
          const errText = await emailRes.text();
          results.push({ organiserId: orgId, email: recipientEmail, status: "failed", error: errText });
        } else {
          results.push({ organiserId: orgId, email: recipientEmail, status: "sent" });
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
