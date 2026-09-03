// supabase/functions/send-ticket/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { registrationId } = await req.json();

    if (!registrationId) {
      throw new Error("Missing 'registrationId' payload");
    }

    // Initialize Supabase Client (Service Role for bypass RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Securely pull the Registration metadata from our trusted DB source
    // Do NOT rely on client-side provided emails (prevent spam relaying)
    const { data: registration, error: dbError } = await supabaseClient
      .from('registrations')
      .select('*, events(title), ticket_types(name)')
      .eq('id', registrationId)
      .single();

    if (dbError || !registration) {
      console.error("Database query failed:", dbError);
      throw new Error(`Registration not found or unreadable`);
    }
    
    // Safety constraint: Must be confirmed/completed or at least checked in
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

    // Build Email payload
    const eventTitle = registration.events?.title || 'Your Event';
    const ticketName = registration.ticket_types?.name || 'General Ticket';
    
    console.log(`Sending ticket for ${eventTitle} to ${registration.email}`);

    // Call Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "tickets@eventstack.events", // IMPORTANT: The user must verify this domain in Resend
        to: registration.email,
        subject: `Your ticket for ${eventTitle}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #111827; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px;">
            <h1 style="color: #F97316; font-size: 24px; margin-bottom: 5px;">You're going to ${eventTitle}!</h1>
            <p style="color: #6b7280; font-size: 14px; margin-top: 0;">Hi ${registration.full_name}, this is your ticket confirmation.</p>
            
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
               <strong>Ticket Details:</strong>
               <p style="margin: 5px 0;">Type: ${ticketName}</p>
               <p style="margin: 5px 0;">Order Ref: ${registration.payment_reference || registrationId.split('-')[0]}</p>
               <p style="margin: 5px 0;">Status: <span style="color: #10B981;">Confirmed</span></p>
            </div>
            
            <p style="font-size: 14px; margin-top: 30px;">Keep this email safe and present it at the venue for scanning.</p>
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
