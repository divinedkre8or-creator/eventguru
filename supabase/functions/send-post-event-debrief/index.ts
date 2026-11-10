// supabase/functions/send-post-event-debrief/index.ts
//
// EventRally — Post-Event Host Summary & Performance Debrief
// Dispatched the evening of the event (or next morning) after an event concludes.
// Delivers the official Host Summary Card (Checked-in stats, gate efficiency, gross revenue),
// invites 1-click feedback/NPS rating, links to the downloadable Host Achievement Flyer,
// and prompts the organizer to schedule their next experience.
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
  const hostName = escapeHtml(data.organiserName || "Organizer");
  const eventTitle = escapeHtml(data.eventTitle);
  const venue = escapeHtml(data.venueName);
  const dateStr = escapeHtml(data.eventDateStr);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Host Debrief: ${eventTitle} — EventRally</title>
</head>
<body style="margin: 0; padding: 16px 8px; background-color: #F9FAFB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827; line-height: 1.5;">
  
  <div style="max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 4px; overflow: hidden;">
    
    <!-- Top Header Brand Bar -->
    <div style="background-color: #111827; padding: 20px 24px; text-align: left; border-bottom: 2px solid #0058BE;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="vertical-align: middle;">
            <div style="font-size: 18px; font-weight: 800; letter-spacing: 1px; color: #FFFFFF; text-transform: uppercase;">
              EVENTRALLY
            </div>
            <div style="font-size: 10px; font-weight: 600; color: #9CA3AF; text-transform: uppercase; margin-top: 3px; letter-spacing: 1px;">
              OFFICIAL HOST SUMMARY &amp; DEBRIEF
            </div>
          </td>
          <td style="vertical-align: middle; text-align: right;">
            <a href="${cleanAppUrl}/dashboard/events" style="background-color: #0058BE; color: #FFFFFF; font-size: 11px; font-weight: 700; text-decoration: none; padding: 8px 14px; border-radius: 3px; display: inline-block;">
              View Event
            </a>
          </td>
        </tr>
      </table>
    </div>

    <!-- Main Body Container -->
    <div style="padding: 24px 20px;">
      
      <!-- Headline & Context -->
      <div style="margin-bottom: 20px;">
        <div style="font-size: 10px; font-weight: 700; color: #0058BE; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
          EVENT CONCLUDED &bull; ADMISSION AUDIT
        </div>
        <h1 style="color: #111827; font-size: 20px; margin: 0 0 6px 0; font-weight: 800; line-height: 1.3;">
          Event debrief for ${hostName}: ${eventTitle}
        </h1>
        <p style="color: #4B5563; font-size: 13px; margin: 0; line-height: 1.5;">
          Here is your official gate admissions report and ticketing performance for <strong>${eventTitle}</strong>.
        </p>
      </div>

      <!-- Event Context Line -->
      <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 4px; padding: 12px 14px; margin-bottom: 20px; font-size: 12px; color: #4B5563;">
        <strong>Date:</strong> ${dateStr} &bull; <strong>Venue:</strong> ${venue}
      </div>

      <!-- Stacked Metric Cards for 100% Mobile Responsiveness -->
      <div style="margin-bottom: 20px;">
        
        <!-- Metric 1: Gate Check-Ins -->
        <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 4px; padding: 14px 16px; margin-bottom: 10px;">
          <div style="font-size: 10px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
            GATE ADMISSIONS &bull; VERIFIED CHECK-INS
          </div>
          <div style="font-size: 24px; font-weight: 800; color: #111827; line-height: 1.1;">
            ${data.checkedInCount} <span style="font-size: 14px; font-weight: 500; color: #6B7280;">/ ${data.totalTickets} total</span>
          </div>
          <div style="font-size: 12px; color: #6B7280; margin-top: 2px;">
            Unique tickets scanned and validated at the gate
          </div>
        </div>

        <!-- Metric 2: Turnout Rate -->
        <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 4px; padding: 14px 16px; margin-bottom: 10px;">
          <div style="font-size: 10px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
            TURNOUT CONVERSION &bull; GATE ATTENDANCE RATE
          </div>
          <div style="font-size: 24px; font-weight: 800; color: #0058BE; line-height: 1.1;">
            ${data.checkinPercentage}%
          </div>
          <div style="font-size: 12px; color: #6B7280; margin-top: 2px;">
            Percentage of registered guests who checked in at the door
          </div>
        </div>

        <!-- Metric 3: Gross Revenue -->
        <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 4px; padding: 14px 16px; margin-bottom: 10px;">
          <div style="font-size: 10px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
            GROSS TICKET SALES &bull; TOTAL REVENUE
          </div>
          <div style="font-size: 24px; font-weight: 800; color: #111827; line-height: 1.1;">
            ${formattedRevenue}
          </div>
          <div style="font-size: 12px; color: #6B7280; margin-top: 2px;">
            Total gross volume processed through platform checkout
          </div>
        </div>

        <!-- Metric 4: Top Tier -->
        <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 4px; padding: 14px 16px;">
          <div style="font-size: 10px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
            TOP ADMISSION TIER
          </div>
          <div style="font-size: 18px; font-weight: 800; color: #111827; line-height: 1.2;">
            ${escapeHtml(data.topTicketTier || "General Admission")}
          </div>
          <div style="font-size: 12px; color: #6B7280; margin-top: 2px;">
            Highest converting ticket category for this event
          </div>
        </div>

      </div>

      <!-- Host Flyer Download Card -->
      <div style="background-color: #111827; border-radius: 4px; padding: 18px; margin-bottom: 24px; color: #FFFFFF;">
        <div style="font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
          VERIFIED HOST SUMMARY CARD
        </div>
        <div style="font-size: 15px; font-weight: 800; color: #FFFFFF; margin-bottom: 4px;">
          Export Your Official Host Certificate &amp; Flyer
        </div>
        <div style="font-size: 12px; color: #D1D5DB; line-height: 1.45; margin-bottom: 14px;">
          An agency-grade performance certificate with your verified attendee metrics is ready for download in your dashboard.
        </div>
        <div>
          <a href="${cleanAppUrl}/dashboard/events" style="display: inline-block; background-color: #0058BE; color: #FFFFFF; font-weight: 700; font-size: 12px; text-decoration: none; padding: 9px 18px; border-radius: 3px;">
            Download Host Flyer &rarr;
          </a>
        </div>
      </div>

      <!-- 1-Click Rating & Feedback Row -->
      <div style="border: 1px solid #D1D5DB; background-color: #F9FAFB; border-radius: 4px; padding: 18px; margin-bottom: 24px; text-align: center;">
        <div style="font-size: 10px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
          PLATFORM HOST EXPERIENCE
        </div>
        <div style="font-size: 14px; font-weight: 800; color: #111827; margin-bottom: 12px;">
          How was your overall experience running this event on EventRally?
        </div>
        
        <!-- 5-Box Rating Grid -->
        <table style="width: 100%; border-collapse: separate; border-spacing: 6px; margin: 0 auto 12px auto; max-width: 420px;">
          <tr>
            <td style="width: 20%; background-color: #FFFFFF; border: 1px solid #D1D5DB; border-radius: 3px; padding: 10px 4px; text-align: center;">
              <a href="${cleanAppUrl}/review?event_id=${data.eventId}&rating=1" style="text-decoration: none; display: block; color: #111827; font-weight: 800; font-size: 14px;">
                1<br><span style="font-size: 9px; font-weight: 600; color: #6B7280;">Poor</span>
              </a>
            </td>
            <td style="width: 20%; background-color: #FFFFFF; border: 1px solid #D1D5DB; border-radius: 3px; padding: 10px 4px; text-align: center;">
              <a href="${cleanAppUrl}/review?event_id=${data.eventId}&rating=2" style="text-decoration: none; display: block; color: #111827; font-weight: 800; font-size: 14px;">
                2<br><span style="font-size: 9px; font-weight: 600; color: #6B7280;">Fair</span>
              </a>
            </td>
            <td style="width: 20%; background-color: #FFFFFF; border: 1px solid #D1D5DB; border-radius: 3px; padding: 10px 4px; text-align: center;">
              <a href="${cleanAppUrl}/review?event_id=${data.eventId}&rating=3" style="text-decoration: none; display: block; color: #111827; font-weight: 800; font-size: 14px;">
                3<br><span style="font-size: 9px; font-weight: 600; color: #6B7280;">Good</span>
              </a>
            </td>
            <td style="width: 20%; background-color: #FFFFFF; border: 1px solid #D1D5DB; border-radius: 3px; padding: 10px 4px; text-align: center;">
              <a href="${cleanAppUrl}/review?event_id=${data.eventId}&rating=4" style="text-decoration: none; display: block; color: #111827; font-weight: 800; font-size: 14px;">
                4<br><span style="font-size: 9px; font-weight: 600; color: #6B7280;">Great</span>
              </a>
            </td>
            <td style="width: 20%; background-color: #FFFFFF; border: 1px solid #0058BE; border-radius: 3px; padding: 10px 4px; text-align: center;">
              <a href="${cleanAppUrl}/review?event_id=${data.eventId}&rating=5" style="text-decoration: none; display: block; color: #0058BE; font-weight: 800; font-size: 14px;">
                5<br><span style="font-size: 9px; font-weight: 700; color: #0058BE;">Superb</span>
              </a>
            </td>
          </tr>
        </table>
        
        <p style="font-size: 11px; color: #6B7280; margin: 0;">
          One tap to record your rating and give direct operational feedback.
        </p>
      </div>

      <!-- Plan Next Event Prompt -->
      <div style="border-top: 1px solid #E5E7EB; padding-top: 16px;">
        <h3 style="font-size: 14px; font-weight: 800; color: #111827; margin: 0 0 4px 0;">
          Plan Your Next Gathering
        </h3>
        <p style="font-size: 12px; color: #4B5563; margin: 0 0 12px 0; line-height: 1.5;">
          Most organizers maintain community engagement by scheduling their next date within 7 days of event completion.
        </p>
        <a href="${cleanAppUrl}/dashboard/events/create" style="display: inline-block; background-color: #111827; color: #FFFFFF; font-weight: 700; font-size: 12px; text-decoration: none; padding: 8px 16px; border-radius: 3px;">
          Draft Next Event &rarr;
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background-color: #F9FAFB; border-top: 1px solid #E5E7EB; padding: 16px 20px; text-align: center; font-size: 11px; color: #6B7280; line-height: 1.5;">
      <p style="margin: 0 0 4px 0;">
        You are receiving this summary because you hosted <strong>${eventTitle}</strong> on <strong>EventRally</strong>.
      </p>
      <p style="margin: 0;">
        &copy; 2026 EventRally &bull; The Event Operating System. 
        <a href="${cleanAppUrl}/dashboard" style="color: #4B5563; text-decoration: underline; margin-left: 6px;">Organizer Studio</a>
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
    const FROM_EMAIL = Deno.env.get("DEBRIEF_FROM_EMAIL") || Deno.env.get("CAMPAIGN_FROM_EMAIL") || "EventRally <news@send.geteventrally.com>";

    const now = new Date();
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

        let recipientEmail = testEmail;
        if (!recipientEmail) {
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(evt.organiser_id);
          recipientEmail = userData?.user?.email;
        }

        if (!recipientEmail) {
          results.push({ eventId: evt.id, organiserId: evt.organiser_id, email: "", status: "skipped_no_email" });
          continue;
        }

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("full_name")
          .eq("user_id", evt.organiser_id)
          .maybeSingle();

        const organiserName = profile?.full_name || "Event Organizer";

        const { data: regs } = await supabaseAdmin
          .from("registrations")
          .select("id, ticket_type_id, checked_in, amount_paid")
          .eq("event_id", evt.id);

        const totalTickets = regs?.length ?? 0;
        const checkedInCount = regs?.filter((r) => r.checked_in).length ?? 0;
        const checkinPercentage = totalTickets > 0 ? Math.round((checkedInCount / totalTickets) * 100) : 0;
        const grossRevenue = regs?.reduce((sum, r) => sum + (Number(r.amount_paid) || 0), 0) ?? 0;

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
