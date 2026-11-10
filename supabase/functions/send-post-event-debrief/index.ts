// supabase/functions/send-post-event-debrief/index.ts
//
// Post-Event "Host Wrapped & Win-Win Debrief" Automation
// Dispatched the evening of the event (or next morning) after an event concludes.
// Delivers the official Host Summary Card (Checked-in stats, gate efficiency, gross revenue),
// invites 1-click feedback/NPS rating, links to the downloadable Host Achievement Flyer,
// and prompts the organizer to schedule their next experience.
// Strictly high-contrast, editorial styling — zero AI slop, zero rainbow gradients.

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

interface EventSummaryData {
  eventId: string;
  eventTitle: string;
  eventDateStr: string;
  venueName: string;
  organiserName: string;
  totalTickets: number;
  checkedInCount: number;
  checkinPercentage: number;
  grossRevenue: number;
  topTicketTier: string;
  appUrl: string;
}

function buildPostEventEmailHtml(data: EventSummaryData): string {
  const cleanAppUrl = data.appUrl.replace(/\/+$/, "");
  const formattedRevenue = `₦${data.grossRevenue.toLocaleString()}`;
  const hostName = escapeHtml(data.organiserName || "Host");
  const eventTitle = escapeHtml(data.eventTitle);
  const venue = escapeHtml(data.venueName);
  const dateStr = escapeHtml(data.eventDateStr);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Official Host Summary — ${eventTitle}</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A; line-height: 1.5;">
  
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.05);">
    
    <!-- Top Header Brand Bar -->
    <div style="background-color: #0F172A; padding: 22px 24px; text-align: left; border-bottom: 3px solid #0058BE;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="vertical-align: middle;">
            <div style="font-size: 20px; font-weight: 900; letter-spacing: 1px; color: #FFFFFF; text-transform: uppercase;">
              EVENTGURU
            </div>
            <div style="font-size: 10px; font-family: monospace; font-weight: bold; color: #38BDF8; text-transform: uppercase; margin-top: 4px; letter-spacing: 1.5px;">
              OFFICIAL HOST SUMMARY &amp; DEBRIEF
            </div>
          </td>
          <td style="vertical-align: middle; text-align: right;">
            <a href="${cleanAppUrl}/dashboard/events/${data.eventId}" style="background-color: #0058BE; color: #FFFFFF; font-size: 11px; font-weight: 800; text-decoration: none; padding: 8px 14px; border-radius: 6px; display: inline-block;">
              View Event &rarr;
            </a>
          </td>
        </tr>
      </table>
    </div>

    <!-- Main Body Container -->
    <div style="padding: 28px 24px;">
      
      <!-- Celebration Hero -->
      <div style="margin-bottom: 24px;">
        <span style="background-color: #EFF6FF; border: 1px solid #BFDBFE; color: #1D4ED8; font-size: 10px; font-family: monospace; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; border-radius: 4px; display: inline-block; margin-bottom: 12px;">
          EVENT CONCLUDED &bull; MISSION ACCOMPLISHED
        </span>
        <h1 style="color: #0F172A; font-size: 24px; margin: 0 0 8px 0; font-weight: 900; line-height: 1.25;">
          You pulled it off, ${hostName}! 🎉
        </h1>
        <p style="color: #64748B; font-size: 15px; margin: 0; line-height: 1.5;">
          Congratulations on successfully hosting <strong>${eventTitle}</strong>. Here is your official performance debrief and gate admissions report.
        </p>
      </div>

      <!-- Event Context Snippet -->
      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; font-size: 12px; color: #475569;">
        <strong>Date:</strong> ${dateStr} &nbsp;&bull;&nbsp; <strong>Venue:</strong> ${venue}
      </div>

      <!-- 4 Key Performance Metric Boxes -->
      <table style="width: 100%; border-collapse: separate; border-spacing: 8px; margin-left: -8px; margin-right: -8px; margin-bottom: 24px;">
        <tr>
          <td style="width: 50%; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px 14px; text-align: left; vertical-align: top;">
            <div style="font-size: 10px; font-family: monospace; font-weight: 800; color: #0058BE; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
              GATE CHECK-INS
            </div>
            <div style="font-size: 26px; font-weight: 900; color: #0F172A; line-height: 1.1;">
              ${data.checkedInCount} <span style="font-size: 14px; font-weight: 600; color: #64748B;">/ ${data.totalTickets}</span>
            </div>
            <div style="font-size: 11px; color: #64748B; margin-top: 4px;">
              Verified Door Admissions
            </div>
          </td>

          <td style="width: 50%; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px 14px; text-align: left; vertical-align: top;">
            <div style="font-size: 10px; font-family: monospace; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
              GATE TURNOUT RATE
            </div>
            <div style="font-size: 26px; font-weight: 900; color: #059669; line-height: 1.1;">
              ${data.checkinPercentage}%
            </div>
            <div style="font-size: 11px; color: #64748B; margin-top: 4px;">
              Attendance Conversion
            </div>
          </td>
        </tr>
        <tr>
          <td style="width: 50%; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px 14px; text-align: left; vertical-align: top;">
            <div style="font-size: 10px; font-family: monospace; font-weight: 800; color: #7C3AED; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
              GROSS TICKET SALES
            </div>
            <div style="font-size: 22px; font-weight: 900; color: #0F172A; line-height: 1.1;">
              ${formattedRevenue}
            </div>
            <div style="font-size: 11px; color: #64748B; margin-top: 4px;">
              Platform Gross Revenue
            </div>
          </td>

          <td style="width: 50%; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px 14px; text-align: left; vertical-align: top;">
            <div style="font-size: 10px; font-family: monospace; font-weight: 800; color: #EA580C; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
              TOP TIER
            </div>
            <div style="font-size: 18px; font-weight: 900; color: #0F172A; line-height: 1.2; word-break: break-word;">
              ${escapeHtml(data.topTicketTier || "General")}
            </div>
            <div style="font-size: 11px; color: #64748B; margin-top: 4px;">
              Most Popular Admission Pass
            </div>
          </td>
        </tr>
      </table>

      <!-- Host Achievement Flyer Spotlight -->
      <div style="background-color: #0F172A; border-radius: 10px; padding: 22px 20px; margin-bottom: 28px; color: #FFFFFF;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="vertical-align: middle;">
              <div style="font-size: 10px; font-family: monospace; font-weight: 800; color: #38BDF8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                VERIFIED HOST BADGE &amp; FLYER
              </div>
              <div style="font-size: 16px; font-weight: 900; color: #FFFFFF; margin-bottom: 6px;">
                Claim Your Official Host Achievement Flyer
              </div>
              <div style="font-size: 12px; color: #94A3B8; line-height: 1.45; margin-bottom: 14px;">
                A clean, agency-grade social flyer with your event stats is ready for download. Share on WhatsApp Status, Instagram, and LinkedIn to build social proof for your brand.
              </div>
              <div>
                <a href="${cleanAppUrl}/dashboard/events/${data.eventId}?view=host-summary" style="display: inline-block; background-color: #0058BE; color: #FFFFFF; font-weight: 800; font-size: 12px; text-decoration: none; padding: 10px 20px; border-radius: 6px;">
                  Download Host Flyer &rarr;
                </a>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- 1-Click Rating & Feedback (Win-Win Loop) -->
      <div style="border: 1px solid #CBD5E1; background-color: #F8FAFC; border-radius: 10px; padding: 22px 20px; margin-bottom: 28px; text-align: center;">
        <div style="font-size: 11px; font-family: monospace; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
          HOW WAS YOUR EVENTGURU EXPERIENCE?
        </div>
        <div style="font-size: 16px; font-weight: 900; color: #0F172A; margin-bottom: 12px;">
          Rate your overall host experience with 1 tap:
        </div>
        
        <!-- 5-Star Rating Row -->
        <table style="width: 100%; border-collapse: separate; border-spacing: 6px; max-width: 380px; margin: 0 auto 14px auto;">
          <tr>
            <td style="width: 20%; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 4px; text-align: center;">
              <a href="${cleanAppUrl}/review?event_id=${data.eventId}&rating=1" style="text-decoration: none; display: block; color: #0F172A; font-weight: 800; font-size: 14px;">
                1<br><span style="font-size: 9px; font-weight: 600; color: #64748B;">Poor</span>
              </a>
            </td>
            <td style="width: 20%; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 4px; text-align: center;">
              <a href="${cleanAppUrl}/review?event_id=${data.eventId}&rating=2" style="text-decoration: none; display: block; color: #0F172A; font-weight: 800; font-size: 14px;">
                2<br><span style="font-size: 9px; font-weight: 600; color: #64748B;">Fair</span>
              </a>
            </td>
            <td style="width: 20%; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 4px; text-align: center;">
              <a href="${cleanAppUrl}/review?event_id=${data.eventId}&rating=3" style="text-decoration: none; display: block; color: #0F172A; font-weight: 800; font-size: 14px;">
                3<br><span style="font-size: 9px; font-weight: 600; color: #64748B;">Good</span>
              </a>
            </td>
            <td style="width: 20%; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 4px; text-align: center;">
              <a href="${cleanAppUrl}/review?event_id=${data.eventId}&rating=4" style="text-decoration: none; display: block; color: #0F172A; font-weight: 800; font-size: 14px;">
                4<br><span style="font-size: 9px; font-weight: 600; color: #64748B;">Great</span>
              </a>
            </td>
            <td style="width: 20%; background-color: #EFF6FF; border: 1px solid #0058BE; border-radius: 6px; padding: 10px 4px; text-align: center;">
              <a href="${cleanAppUrl}/review?event_id=${data.eventId}&rating=5" style="text-decoration: none; display: block; color: #0058BE; font-weight: 800; font-size: 14px;">
                5<br><span style="font-size: 9px; font-weight: 800; color: #0058BE;">Superb</span>
              </a>
            </td>
          </tr>
        </table>
        
        <p style="font-size: 12px; color: #64748B; margin: 0;">
          Your feedback directly shapes our product and door check-in tools.
        </p>
      </div>

      <!-- Plan Next Event Prompt -->
      <div style="border-top: 1px solid #E2E8F0; padding-top: 20px; text-align: left;">
        <h3 style="font-size: 15px; font-weight: 900; color: #0F172A; margin: 0 0 6px 0;">
          Keep Your Momentum Going
        </h3>
        <p style="font-size: 13px; color: #64748B; margin: 0 0 14px 0; line-height: 1.5;">
          Top event organizers announce their upcoming dates while their community's enthusiasm is at its peak. Ready for your next experience?
        </p>
        <a href="${cleanAppUrl}/dashboard/events/create" style="display: inline-block; background-color: #0F172A; color: #FFFFFF; font-weight: 800; font-size: 12px; text-decoration: none; padding: 10px 18px; border-radius: 6px;">
          Draft Next Event &rarr;
        </a>
      </div>

    </div>

    <!-- Standard Newsletter Footer -->
    <div style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 24px; text-align: center; font-size: 11px; color: #94A3B8; line-height: 1.6;">
      <p style="margin: 0 0 6px 0;">
        You are receiving this debrief because you hosted <strong>${eventTitle}</strong> on <strong>EventGuru</strong>.
      </p>
      <p style="margin: 0;">
        &copy; 2026 EventGuru &bull; The Event Operating System. 
        <a href="${cleanAppUrl}/dashboard" style="color: #64748B; text-decoration: underline; margin-left: 8px;">Organizer Studio</a>
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
    const APP_URL = Deno.env.get("APP_URL") || Deno.env.get("PUBLIC_APP_URL") || "https://eventguru.ng";

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Missing Supabase server credentials" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Parse options from body
    const body = await req.json().catch(() => ({}));
    const { testEmail, targetEventId, force = false, limit = 50 } = body;

    // Check authorization: admin JWT or service_role key
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

    if (!isCallerAdmin && !testEmail) {
      return new Response(JSON.stringify({ error: "Unauthorized: Admin or Service Role required to dispatch debriefs" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("DEBRIEF_FROM_EMAIL") || Deno.env.get("TICKETS_FROM_EMAIL") || "EventGuru Host Wrap-Up <host-recap@eventguru.ng>";

    const now = new Date();
    // Look back up to 72 hours for concluded events
    const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 3600 * 1000).toISOString();
    const oneHourAgo = new Date(now.getTime() - 1 * 3600 * 1000).toISOString();

    let candidateEvents: any[] = [];

    if (targetEventId) {
      const { data, error } = await supabaseAdmin
        .from("events")
        .select("id, title, date, end_date, venue, city, organiser_id, status")
        .eq("id", targetEventId)
        .single();

      if (error || !data) {
        return new Response(JSON.stringify({ error: "Event not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      candidateEvents = [data];
    } else {
      // Find published events where the end_date (or date) has passed within past 72h
      const { data: events, error } = await supabaseAdmin
        .from("events")
        .select("id, title, date, end_date, venue, city, organiser_id, status")
        .eq("status", "published")
        .lte("date", oneHourAgo)
        .gte("date", seventyTwoHoursAgo)
        .limit(Number(limit) || 50);

      if (error) {
        throw error;
      }
      candidateEvents = events || [];
    }

    const results: Array<{ eventId: string; organiserId: string; email: string; status: string; error?: string }> = [];

    for (const evt of candidateEvents) {
      try {
        // Check if debrief has already been sent (idempotency check)
        if (!force && !testEmail) {
          const { data: existingLog } = await supabaseAdmin
            .from("organizer_email_logs")
            .select("id")
            .eq("event_id", evt.id)
            .eq("email_type", "post_event_debrief")
            .in("status", ["sent", "mock_sent"])
            .maybeSingle();

          if (existingLog) {
            results.push({ eventId: evt.id, organiserId: evt.organiser_id, email: "", status: "skipped_already_sent" });
            continue;
          }
        }

        // Get organiser's email
        let recipientEmail = testEmail;
        if (!recipientEmail) {
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(evt.organiser_id);
          recipientEmail = userData?.user?.email;
        }

        if (!recipientEmail) {
          results.push({ eventId: evt.id, organiserId: evt.organiser_id, email: "", status: "skipped_no_email" });
          continue;
        }

        // Get organiser profile name
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("full_name")
          .eq("user_id", evt.organiser_id)
          .maybeSingle();

        const organiserName = profile?.full_name || "Event Organizer";

        // Query event registration metrics
        const { data: regs } = await supabaseAdmin
          .from("registrations")
          .select("id, ticket_type_id, checked_in, amount_paid")
          .eq("event_id", evt.id);

        const totalTickets = regs?.length ?? 0;
        const checkedInCount = regs?.filter((r) => r.checked_in).length ?? 0;
        const checkinPercentage = totalTickets > 0 ? Math.round((checkedInCount / totalTickets) * 100) : 0;
        const grossRevenue = regs?.reduce((sum, r) => sum + (Number(r.amount_paid) || 0), 0) ?? 0;

        // Query ticket types to find top selling tier
        const { data: tiers } = await supabaseAdmin
          .from("ticket_types")
          .select("name, sold")
          .eq("event_id", evt.id)
          .order("sold", { ascending: false })
          .limit(1);

        const topTicketTier = tiers && tiers.length > 0 ? tiers[0].name : "Standard Pass";

        const evtDate = new Date(evt.date);
        const eventDateStr = evtDate.toLocaleDateString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        const venueName = [evt.venue, evt.city].filter(Boolean).join(", ") || "Venue TBA";

        const emailHtml = buildPostEventEmailHtml({
          eventId: evt.id,
          eventTitle: evt.title,
          eventDateStr,
          venueName,
          organiserName,
          totalTickets,
          checkedInCount,
          checkinPercentage,
          grossRevenue,
          topTicketTier,
          appUrl: APP_URL,
        });

        if (!RESEND_API_KEY) {
          console.log(`[MOCK] Would send post-event debrief to ${recipientEmail} for event ${evt.title}`);
          results.push({ eventId: evt.id, organiserId: evt.organiser_id, email: recipientEmail, status: "mock_sent" });

          await supabaseAdmin.from("organizer_email_logs").insert({
            event_id: evt.id,
            organiser_id: evt.organiser_id,
            email_type: "post_event_debrief",
            recipient_email: recipientEmail,
            status: "mock_sent",
            metadata: {
              totalTickets,
              checkedInCount,
              checkinPercentage,
              grossRevenue,
              topTicketTier,
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
            subject: `Official Host Summary: ${evt.title} (${checkedInCount} checked in)`,
            html: emailHtml,
          }),
        });

        if (!emailRes.ok) {
          const errText = await emailRes.text();
          results.push({ eventId: evt.id, organiserId: evt.organiser_id, email: recipientEmail, status: "failed", error: errText });

          await supabaseAdmin.from("organizer_email_logs").insert({
            event_id: evt.id,
            organiser_id: evt.organiser_id,
            email_type: "post_event_debrief",
            recipient_email: recipientEmail,
            status: "failed",
            error: errText,
            metadata: { totalTickets, checkedInCount, grossRevenue },
          });
        } else {
          results.push({ eventId: evt.id, organiserId: evt.organiser_id, email: recipientEmail, status: "sent" });

          await supabaseAdmin.from("organizer_email_logs").insert({
            event_id: evt.id,
            organiser_id: evt.organiser_id,
            email_type: "post_event_debrief",
            recipient_email: recipientEmail,
            status: "sent",
            metadata: {
              totalTickets,
              checkedInCount,
              checkinPercentage,
              grossRevenue,
              topTicketTier,
            },
          });
        }
      } catch (err: any) {
        results.push({ eventId: evt.id, organiserId: evt.organiser_id, email: "", status: "error", error: err?.message || String(err) });
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
    console.error("send-post-event-debrief fatal error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

