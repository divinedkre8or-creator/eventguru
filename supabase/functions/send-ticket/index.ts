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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { registrationId } = await req.json();

    if (!registrationId) {
      throw new Error("Missing 'registrationId' payload");
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: registration, error: dbError } = await supabaseClient
      .from('registrations')
      .select('*, events(title, date, venue, city, country), ticket_types(name)')
      .eq('id', registrationId)
      .single();

    if (dbError || !registration) {
      console.error("Database query failed:", dbError);
      throw new Error(`Registration not found or unreadable`);
    }

    if (!['completed', 'confirmed'].includes(registration.status)) {
      throw new Error(`Cannot dispatch ticket for an unpaid/incomplete registration`);
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
          <body style="margin: 0; padding: 24px; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A;">
            
            <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              
              <!-- Top Accent Brand Bar -->
              <div style="background-color: #000000; padding: 20px 24px; text-align: center; border-bottom: 3px solid #0058BE;">
                <div style="font-size: 20px; font-weight: 900; letter-spacing: 1px; color: #FFFFFF; text-transform: uppercase;">
                  EVENTRALLY
                </div>
                <div style="font-size: 10px; font-family: monospace; font-weight: bold; color: #94A3B8; text-transform: uppercase; margin-top: 4px; letter-spacing: 1.5px;">
                  OFFICIAL ADMISSION PASS & RECEIPT
                </div>
              </div>

              <!-- Main Content -->
              <div style="padding: 32px 24px;">
                
                <h1 style="color: #0F172A; font-size: 22px; margin: 0 0 8px 0; font-weight: 900; line-height: 1.2;">
                  You're going to ${eventTitle}!
                </h1>
                <p style="color: #64748B; font-size: 14px; margin: 0 0 24px 0; line-height: 1.5;">
                  Hi <strong>${registration.full_name}</strong>, your registration has been successfully confirmed. Present your digital pass at the entrance on event day.
                </p>

                <!-- Ticket Pass Box -->
                <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                  <div style="font-size: 10px; font-family: monospace; font-weight: 800; color: #0058BE; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 1px;">
                    ADMISSION DETAILS
                  </div>

                  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                      <td style="padding: 6px 0; color: #64748B; width: 35%;">Pass Type:</td>
                      <td style="padding: 6px 0; color: #0F172A; font-weight: bold;">${ticketName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748B;">Date & Time:</td>
                      <td style="padding: 6px 0; color: #0F172A; font-weight: bold;">${eventDate}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748B;">Venue:</td>
                      <td style="padding: 6px 0; color: #0F172A; font-weight: bold;">${venueName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748B;">Reference ID:</td>
                      <td style="padding: 6px 0; font-family: monospace; font-weight: bold; color: #0058BE;">${orderRef}</td>
                    </tr>
                  </table>

                  <div style="margin-top: 18px; pt-4; border-top: 1px dashed #CBD5E1; text-align: center;">
                    <a href="${ticketUrl}" style="display: block; background-color: #0058BE; color: #FFFFFF; font-weight: 800; font-size: 13px; text-decoration: none; padding: 12px 20px; border-radius: 8px; text-align: center; margin-top: 14px;">
                      Open My Digital Pass & QR Code &rarr;
                    </a>
                  </div>
                </div>

                <!-- Signature DP Generator Callout (Growth Loop) -->
                <div style="background-color: #0F172A; border-radius: 12px; padding: 22px; text-align: center; margin-bottom: 24px; color: #FFFFFF;">
                  <div style="font-size: 10px; font-family: monospace; font-weight: bold; color: #38BDF8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                    VIRAL EVENT FLYER
                  </div>
                  <h3 style="font-size: 16px; font-weight: 900; color: #FFFFFF; margin: 0 0 6px 0;">
                    Generate Your "I Will Be Attending" Flyer
                  </h3>
                  <p style="font-size: 12px; color: #94A3B8; margin: 0 0 16px 0; line-height: 1.4;">
                    Let your friends and network know you are attending! Create your custom branded picture flyer in 1 click for WhatsApp Status, Instagram & X.
                  </p>
                  <a href="${dpUrl}" style="display: inline-block; background-color: #FFFFFF; color: #0F172A; font-weight: 800; font-size: 12px; text-decoration: none; padding: 10px 22px; border-radius: 8px;">
                    Create My Event DP &rarr;
                  </a>
                </div>

                <!-- Offline Note -->
                <div style="padding: 12px 16px; background-color: #F1F5F9; border-radius: 8px; font-size: 11px; color: #64748B; line-height: 1.5; text-align: center;">
                  <strong>Pro Tip:</strong> EventRally stores your admission pass offline. Save your ticket link on your phone before arriving at the venue for instant gate entry even with weak internet.
                </div>

                <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #E2E8F0;">
                  <a href="${eventUrl}" style="color: #0058BE; text-decoration: underline; font-size: 12px; font-weight: bold;">
                    View Event Details & Schedule &rarr;
                  </a>
                </div>

              </div>

              <!-- Footer -->
              <div style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 18px 24px; text-align: center; font-size: 11px; color: #94A3B8;">
                &copy; 2026 EventRally (geteventrally.com) &bull; Where Everyone's Going.
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

    return new Response(JSON.stringify({ message: "Ticket dispatched successfully", data: body }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("Edge Function Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
