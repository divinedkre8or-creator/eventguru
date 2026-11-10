// supabase/functions/send-ticket/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const slugify = (text: string): string => {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const escapeHtml = (s: string): string =>
  String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { registrationId, paymentReference } = await req.json().catch(() => ({}));

    if (!registrationId) {
      return new Response(JSON.stringify({ error: "Missing 'registrationId' payload" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const supabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: registration, error: dbError } = await supabaseClient
      .from('registrations')
      .select('*, events(title, date, venue, city, country, organiser_id), ticket_types(name)')
      .eq('id', registrationId)
      .single();

    if (dbError || !registration) {
      console.error("Database query failed:", dbError);
      return new Response(JSON.stringify({ error: "Registration not found" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    if (!['completed', 'confirmed'].includes(registration.status)) {
      return new Response(JSON.stringify({ error: "Cannot dispatch ticket for an unpaid/incomplete registration" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Caller authorization: verify that the caller is authorized to trigger this ticket dispatch
    const authHeader = req.headers.get("Authorization") ?? "";
    let isAuthorized = false;

    if (authHeader && ANON_KEY) {
      try {
        const authScoped = createClient(SUPABASE_URL, ANON_KEY, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: userData } = await authScoped.auth.getUser();
        const callerId = userData?.user?.id;
        const callerEmail = userData?.user?.email?.toLowerCase().trim();

        if (callerId) {
          if (
            callerId === registration.user_id ||
            callerId === registration.events?.organiser_id ||
            (callerEmail && callerEmail === registration.email?.toLowerCase().trim())
          ) {
            isAuthorized = true;
          }
        }
      } catch (_e) {
        // Fall back to reference check
      }
    }

    // Guest checkout authorization: match payment_reference or recent creation window
    if (!isAuthorized) {
      if (paymentReference && registration.payment_reference && paymentReference === registration.payment_reference) {
        isAuthorized = true;
      } else {
        const createdAt = new Date(registration.created_at).getTime();
        const now = Date.now();
        // Allow automatic dispatch within 30 minutes of registration creation
        if (now - createdAt < 30 * 60 * 1000) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Unauthorized ticket dispatch request" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.log("No RESEND_API_KEY defined. Mocking success.");
      return new Response(JSON.stringify({ message: 'Ticket MOCK sent successfully (No Key)', registrationId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const FROM_EMAIL = Deno.env.get('TICKETS_FROM_EMAIL') || 'EventRally Tickets <tickets@send.geteventrally.com>';
    const eventTitle = registration.events?.title || 'Your Event';
    const eventSlug = slugify(eventTitle);
    const ticketName = registration.ticket_types?.name || 'General Admission';
    const venueName = [registration.events?.venue, registration.events?.city, registration.events?.country].filter(Boolean).join(", ") || "Venue TBA";
    const eventDate = registration.events?.date ? new Date(registration.events.date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Date TBA';

    const orderRef = registration.payment_reference || registrationId.slice(0, 8).toUpperCase();
    const dpUrl = `https://www.geteventrally.com/events/${eventSlug}/dp`;
    const ticketUrl = `https://www.geteventrally.com/tickets/${registrationId}`;
    const eventUrl = `https://www.geteventrally.com/events/${eventSlug}`;

    console.log(`Sending branded ticket for ${eventTitle} to ${registration.email}`);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [registration.email],
        subject: `Your Admission Ticket: ${eventTitle} (${orderRef})`,
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Your Ticket for ${eventTitle}</title>
          </head>
          <body style="margin: 0; padding: 16px 8px; background-color: #F9FAFB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827; line-height: 1.5;">
            
            <div style="max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 4px; overflow: hidden;">
              
              <!-- Top Brand Bar -->
              <div style="background-color: #111827; padding: 20px 24px; text-align: left; border-bottom: 2px solid #0058BE;">
                <div style="font-size: 18px; font-weight: 800; letter-spacing: 1px; color: #FFFFFF; text-transform: uppercase;">
                  EVENTRALLY
                </div>
                <div style="font-size: 10px; font-weight: 600; color: #9CA3AF; text-transform: uppercase; margin-top: 3px; letter-spacing: 1px;">
                  OFFICIAL ADMISSION PASS &amp; RECEIPT
                </div>
              </div>

              <!-- Main Content -->
              <div style="padding: 24px 20px;">
                
                <h1 style="color: #111827; font-size: 20px; margin: 0 0 6px 0; font-weight: 800; line-height: 1.3;">
                  You are registered for ${escapeHtml(eventTitle)}
                </h1>
                <p style="color: #4B5563; font-size: 13px; margin: 0 0 20px 0; line-height: 1.5;">
                  Hello <strong>${escapeHtml(registration.full_name || 'there')}</strong>, your admission has been verified. Present your digital pass or QR code at the entrance on event day.
                </p>

                <!-- Stacked Ticket Pass Box -->
                <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 4px; padding: 18px; margin-bottom: 20px;">
                  <div style="font-size: 10px; font-weight: 700; color: #0058BE; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">
                    ADMISSION DETAILS
                  </div>

                  <div style="font-size: 13px; color: #111827; line-height: 1.8;">
                    <div><span style="color: #6B7280; font-weight: 600;">Pass Tier:</span> <strong>${escapeHtml(ticketName)}</strong></div>
                    <div><span style="color: #6B7280; font-weight: 600;">Date:</span> <strong>${escapeHtml(eventDate)}</strong></div>
                    <div><span style="color: #6B7280; font-weight: 600;">Venue:</span> <strong>${escapeHtml(venueName)}</strong></div>
                    <div><span style="color: #6B7280; font-weight: 600;">Reference ID:</span> <span style="font-family: monospace; font-weight: 700; color: #0058BE;">${escapeHtml(orderRef)}</span></div>
                  </div>

                  <div style="margin-top: 16px; padding-top: 14px; border-top: 1px solid #E5E7EB;">
                    <a href="${ticketUrl}" style="display: block; background-color: #0058BE; color: #FFFFFF; font-weight: 700; font-size: 13px; text-decoration: none; padding: 11px 18px; border-radius: 3px; text-align: center;">
                      Open Digital Pass &amp; QR Code &rarr;
                    </a>
                  </div>
                </div>

                <!-- Attendee DP Generator Callout -->
                <div style="background-color: #111827; border-radius: 4px; padding: 18px; margin-bottom: 20px; color: #FFFFFF;">
                  <div style="font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                    ATTENDEE EVENT FLYER
                  </div>
                  <div style="font-size: 15px; font-weight: 800; color: #FFFFFF; margin-bottom: 4px;">
                    Create Your Personalized Attendee Flyer
                  </div>
                  <p style="font-size: 12px; color: #D1D5DB; margin: 0 0 14px 0; line-height: 1.5;">
                    Add your photo and name to the official event graphic to share on WhatsApp Status and social channels.
                  </p>
                  <div>
                    <a href="${dpUrl}" style="display: inline-block; background-color: #FFFFFF; color: #111827; font-weight: 700; font-size: 12px; text-decoration: none; padding: 9px 18px; border-radius: 3px;">
                      Create My Event Flyer &rarr;
                    </a>
                  </div>
                </div>

                <!-- Offline Note -->
                <div style="padding: 12px 14px; background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 4px; font-size: 11px; color: #6B7280; line-height: 1.5;">
                  <strong>Offline Access:</strong> EventRally passes can be viewed offline. Open and bookmark your pass before arriving at the venue.
                </div>

                <div style="text-align: center; margin-top: 20px; padding-top: 14px; border-top: 1px solid #E5E7EB;">
                  <a href="${eventUrl}" style="color: #0058BE; text-decoration: underline; font-size: 12px; font-weight: 600;">
                    View Event Details &amp; Schedule &rarr;
                  </a>
                </div>

              </div>

              <!-- Footer -->
              <div style="background-color: #F9FAFB; border-top: 1px solid #E5E7EB; padding: 16px 20px; text-align: center; font-size: 11px; color: #6B7280; line-height: 1.5;">
                &copy; 2026 EventRally &bull; The Event Operating System.
              </div>

            </div>
          </body>
          </html>
        `
      })
    });

    const body = await res.json();
    if (!res.ok) {
      console.error("Resend API failed:", body);
      throw new Error(`Failed to send email via Resend API: ${(body as any)?.message || JSON.stringify(body)}`);
    }

    // Optional instant gate pass SMS notification (non-blocking)
    const rawPhone = (registration.phone_number || registration.phone || "").trim().replace(/[\s\-\(\)]/g, "");
    const TEXTFLOW_API_TOKEN = Deno.env.get("TEXTFLOW_API_TOKEN");
    const TEXTFLOW_SENDER_ID = Deno.env.get("TEXTFLOW_SENDER_ID") || "Textflow";
    const TERMII_API_KEY = Deno.env.get("TERMII_API_KEY");
    const TERMII_SENDER_ID = Deno.env.get("TERMII_SENDER_ID") || "EventRally";

    if (rawPhone && rawPhone.length >= 10 && (TEXTFLOW_API_TOKEN || TERMII_API_KEY)) {
      try {
        let normalizedPhone = rawPhone;
        if (normalizedPhone.startsWith("0")) {
          normalizedPhone = "234" + normalizedPhone.slice(1);
        } else if (normalizedPhone.startsWith("+")) {
          normalizedPhone = normalizedPhone.slice(1);
        }

        const attendeeFirst = (registration.full_name || "there").split(" ")[0];
        const smsMessage = `[EventRally] Hi ${attendeeFirst}, your pass for ${eventTitle} is confirmed! Pass ID: ${orderRef}. View your ticket: ${ticketUrl}`;

        if (TEXTFLOW_API_TOKEN) {
          await fetch("https://textflow.ng/api/v1/sms/send", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${TEXTFLOW_API_TOKEN}`,
              "Content-Type": "application/json",
              "Accept": "application/json",
            },
            body: JSON.stringify({
              sender_id: TEXTFLOW_SENDER_ID,
              recipients: normalizedPhone,
              message: smsMessage,
            }),
          });
        } else if (TERMII_API_KEY) {
          await fetch("https://api.ng.termii.com/api/sms/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: normalizedPhone,
              from: TERMII_SENDER_ID,
              sms: smsMessage,
              type: "plain",
              channel: "generic",
              api_key: TERMII_API_KEY,
            }),
          });
        }
      } catch (smsErr) {
        console.warn("Gate pass SMS dispatch warning (non-blocking):", smsErr);
      }
    }

    return new Response(JSON.stringify({ message: "Ticket dispatched successfully", data: body }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("Edge Function Error:", error?.message || error);
    return new Response(JSON.stringify({ error: "Failed to dispatch ticket. Please try again or contact support." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
