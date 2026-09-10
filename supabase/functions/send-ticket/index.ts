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

    const eventTitle = registration.events?.title || 'Your Event';
    const eventSlug = slugify(eventTitle);
    const ticketName = registration.ticket_types?.name || 'General Admission';
    const venueName = [registration.events?.venue, registration.events?.city, registration.events?.country].filter(Boolean).join(", ") || "Venue TBA";
    const eventDate = registration.events?.date ? new Date(registration.events.date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'TBA';

    const dpUrl = `https://eventrally.com/events/${eventSlug}/dp`;
    const eventUrl = `https://eventrally.com/events/${eventSlug}`;

    console.log(`Sending ticket for ${eventTitle} to ${registration.email}`);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "EventRally Tickets <tickets@eventrally.com>",
        to: registration.email,
        subject: `Your Official Ticket for ${eventTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 24px; color: #0A0D12; max-width: 600px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 16px; background-color: #ffffff;">
            
            <div style="border-bottom: 2px solid #F5A623; padding-bottom: 16px; margin-bottom: 20px; text-align: center;">
              <h2 style="font-size: 20px; font-weight: 900; letter-spacing: -0.5px; margin: 0; color: #0A0D12;">EVENTRALLY</h2>
              <span style="font-size: 11px; font-family: monospace; color: #64748B; text-transform: uppercase;">OFFICIAL TICKET CONFIRMATION</span>
            </div>

            <h1 style="color: #0A0D12; font-size: 22px; margin-top: 0; font-weight: 800;">You're Confirmed for ${eventTitle}!</h1>
            <p style="color: #475569; font-size: 14px; margin-top: 4px;">Hi <strong>${registration.full_name}</strong>, your registration has been successfully confirmed.</p>

            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; margin: 20px 0;">
               <div style="font-size: 11px; font-family: monospace; font-weight: bold; color: #64748B; text-transform: uppercase; margin-bottom: 8px;">TICKET DETAILS</div>
               <p style="margin: 4px 0; font-size: 14px; color: #0A0D12;"><strong>Ticket Type:</strong> ${ticketName}</p>
               <p style="margin: 4px 0; font-size: 14px; color: #0A0D12;"><strong>Date & Time:</strong> ${eventDate}</p>
               <p style="margin: 4px 0; font-size: 14px; color: #0A0D12;"><strong>Venue:</strong> ${venueName}</p>
               <p style="margin: 4px 0; font-size: 14px; color: #0A0D12;"><strong>Order Reference:</strong> <code style="background-color: #E2E8F0; padding: 2px 6px; border-radius: 4px; font-size: 13px;">${registration.payment_reference || registrationId.slice(0, 8)}</code></p>
            </div>

            <!-- Signature DP Generator Callout -->
            <div style="background-color: #FFFBEB; border: 1px solid #FCD34D; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0;">
               <h3 style="font-size: 16px; font-weight: 800; color: #B45309; margin: 0 0 6px 0;">Generate Your Event DP Picture</h3>
               <p style="font-size: 13px; color: #78350F; margin: 0 0 14px 0; line-height: 1.4;">Let your friends and network know you are attending! Create your personalized event DP flier in 1-click.</p>
               <a href="${dpUrl}" style="display: inline-block; background-color: #F5A623; color: #0A0D12; font-weight: 800; font-size: 13px; text-decoration: none; padding: 12px 24px; border-radius: 8px;">Create My Event DP &rarr;</a>
            </div>

            <div style="text-align: center; border-top: 1px solid #E2E8F0; pt-16; margin-top: 24px; padding-top: 16px;">
               <a href="${eventUrl}" style="color: #3B5BFF; text-decoration: underline; font-size: 13px; font-weight: bold;">View Event Page & Order Details &rarr;</a>
            </div>

            <div style="text-align: center; margin-top: 30px; font-size: 11px; color: #94A3B8;">
               &copy; 2026 EventRally &bull; Where Everyone's Going.
            </div>
          </div>
        `
      })
    });

    const body = await res.json();
    if (!res.ok) {
       console.error("Resend API failed:", body);
       throw new Error("Failed to send email via Resend API");
    }

    return new Response(JSON.stringify({ message: "Ticket dispatched", data: body }), {
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
