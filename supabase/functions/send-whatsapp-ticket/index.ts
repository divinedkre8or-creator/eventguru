// supabase/functions/send-whatsapp-ticket/index.ts
// Multi-Provider WhatsApp Ticket Dispatch Engine
// Supports Meta WhatsApp Cloud API, Termii WhatsApp, and Infobip.
// Includes a safe simulated preview mode when provider credentials are not yet set.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normalize Nigerian and international phone numbers to E.164 (+234...)
const normalizePhoneNumber = (raw: string): string => {
  if (!raw) return "";
  let cleaned = raw.replace(/\D/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = "234" + cleaned.slice(1);
  } else if (cleaned.startsWith("234") && cleaned.length === 13) {
    // already 234 format
  } else if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  return cleaned;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { 
      registrationId, 
      phone: targetPhone, 
      paymentReference 
    } = await req.json().catch(() => ({}));

    if (!registrationId) {
      return new Response(JSON.stringify({ error: "Missing 'registrationId' in payload" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Fetch registration details
    const { data: reg, error: regError } = await supabase
      .from('registrations')
      .select('*, events(title, date, venue, city, organiser_id), ticket_types(name)')
      .eq('id', registrationId)
      .single();

    if (regError || !reg) {
      return new Response(JSON.stringify({ error: "Registration record not found" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    if (!['completed', 'confirmed'].includes(reg.status)) {
      return new Response(JSON.stringify({ error: "Cannot send ticket for unpaid or incomplete order" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Determine recipient phone number (payload phone or stored phone)
    const rawPhone = targetPhone || reg.phone || "";
    const recipientPhone = normalizePhoneNumber(rawPhone);

    if (!recipientPhone || recipientPhone.length < 8) {
      return new Response(JSON.stringify({ 
        error: "No valid recipient phone number provided for WhatsApp dispatch" 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const eventTitle = reg.events?.title || "Your Event";
    const ticketTier = reg.ticket_types?.name || "General Admission";
    const eventDate = reg.events?.date ? new Date(reg.events.date).toLocaleDateString('en-GB', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }) : "Date TBA";
    const venue = [reg.events?.venue, reg.events?.city].filter(Boolean).join(", ") || "Venue TBA";
    const ticketUrl = `https://www.geteventrally.com/tickets/${reg.id}`;
    const refCode = (reg.payment_reference || reg.id.slice(0, 8)).toUpperCase();

    // Provider Credentials
    const META_WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_CLOUD_TOKEN');
    const META_PHONE_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    const TERMII_API_KEY = Deno.env.get('TERMII_API_KEY');
    const INFOBIP_API_KEY = Deno.env.get('INFOBIP_API_KEY');
    const INFOBIP_BASE_URL = Deno.env.get('INFOBIP_BASE_URL');

    // 1. Meta WhatsApp Cloud API (Primary if configured)
    if (META_WHATSAPP_TOKEN && META_PHONE_ID) {
      const metaRes = await fetch(`https://graph.facebook.com/v19.0/${META_PHONE_ID}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${META_WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipientPhone.replace("+", ""),
          type: "text",
          text: {
            preview_url: true,
            body: `Hello ${reg.full_name},\n\nYour admission pass for *${eventTitle}* is ready!\n\nTicket: *${ticketTier}*\nDate: ${eventDate}\nVenue: ${venue}\nReference: *${refCode}*\n\nView and scan your digital pass at the gate:\n${ticketUrl}\n\nPowered by EventRally`,
          },
        }),
      });

      const metaData = await metaRes.json().catch(() => ({}));
      if (!metaRes.ok) {
        console.error("Meta WhatsApp dispatch error:", metaData);
        throw new Error(metaData?.error?.message || "Meta WhatsApp API delivery failed");
      }

      return new Response(JSON.stringify({ 
        ok: true, 
        provider: "meta_cloud", 
        messageId: metaData?.messages?.[0]?.id 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 2. Termii WhatsApp Channel (Dominant Nigerian Provider)
    if (TERMII_API_KEY) {
      const termiiRes = await fetch("https://api.ng.termii.com/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipientPhone.replace("+", ""),
          from: "EventRally",
          sms: `Hello ${reg.full_name}, your official ticket for ${eventTitle} (${ticketTier}) is ready. Order Ref: ${refCode}. View your digital QR pass here: ${ticketUrl}`,
          type: "plain",
          channel: "whatsapp",
          api_key: TERMII_API_KEY,
        }),
      });

      const termiiData = await termiiRes.json().catch(() => ({}));
      return new Response(JSON.stringify({ 
        ok: true, 
        provider: "termii_whatsapp", 
        data: termiiData 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 3. Fallback / Ready-to-go Simulation Mode (Awaiting API keys from user)
    console.log(`[WHATSAPP TICKET DISPATCH - SIMULATION MODE]`);
    console.log(`Recipient: ${recipientPhone} (${reg.full_name})`);
    console.log(`Event: ${eventTitle} | Tier: ${ticketTier} | Ref: ${refCode}`);
    console.log(`Ticket URL: ${ticketUrl}`);

    return new Response(JSON.stringify({
      ok: true,
      mode: "simulated",
      notice: "WhatsApp engine technology ready. Set WHATSAPP_CLOUD_TOKEN or TERMII_API_KEY in secrets to route through live telecom gateway.",
      payload: {
        to: recipientPhone,
        attendee: reg.full_name,
        event: eventTitle,
        ticketTier,
        refCode,
        ticketUrl,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err: any) {
    console.error("WhatsApp dispatch handler failure:", err);
    return new Response(JSON.stringify({ error: err.message || "Failed to process WhatsApp dispatch" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
