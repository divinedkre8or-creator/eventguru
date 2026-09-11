// supabase/functions/get-ticket/index.ts
//
// Public ticket lookup by exact id OR payment_reference, using the service role.
//
// Why this exists:
//   The RLS hardening migration removes the "user_id IS NULL" clause that made
//   every guest registration world-readable (a PII leak: anyone could read any
//   guest's name/email/phone). Guests still need to open their ticket link, so
//   this function performs a narrow, exact-match lookup server-side and returns
//   only the single matching registration. It never accepts a filter expression
//   from the client (the previous ".or(id.eq.${id},...)" was string-injectable).
//
// Response contract:
//   HTTP 200 { ok: true, registration }   -> found (joined with event + tier)
//   HTTP 200 { ok: false, reason }         -> not found
//   HTTP 4xx/5xx                           -> infra error; the client may fall
//        back to a hardened, exact-match direct query (which post-migration only
//        returns rows the caller is actually allowed to see).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return json({ error: "Server not configured" }, 500);
    }

    // Accept the identifier from a JSON body (functions.invoke) or a query param.
    let id: string | null = null;
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      id = body?.id ?? null;
    }
    if (!id) {
      id = new URL(req.url).searchParams.get("id");
    }
    if (!id || typeof id !== "string") {
      return json({ error: "Missing ticket identifier" }, 400);
    }

    // Exact-match only. A UUID looks up by primary key; anything else is treated
    // as a payment reference. No user-controlled operators reach the query.
    const lookupColumn = UUID_RE.test(id) ? "id" : "payment_reference";

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data, error } = await admin
      .from("registrations")
      .select("*, events(*), ticket_types(*)")
      .eq(lookupColumn, id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return json({ ok: false, reason: "not_found" }, 200);

    return json({ ok: true, registration: data }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("get-ticket error:", message);
    return json({ error: message }, 500);
  }
});
