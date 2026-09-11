// supabase/functions/complete-registration/index.ts
//
// Secure, server-authoritative registration entrypoint for EventRally.
//
// Why this exists:
//   The browser previously inserted rows directly into `registrations` with a
//   client-chosen `status: 'completed'` and a client-supplied `amount_paid`.
//   That let anyone forge a "paid" ticket without ever paying. This function
//   moves the trust boundary to the server:
//     - Paid tickets are only recorded AFTER the payment reference is verified
//       against Paystack's own API using the secret key (never shipped to the
//       browser).
//     - `amount_paid` is taken from Paystack's verified amount, not the client.
//     - Free tickets are only recorded when the ticket's server-side price is 0.
//     - Replayed payment references return the original ticket (idempotent)
//       instead of minting duplicates.
//
// Response contract (consumed by src/lib/registrationService.ts):
//   HTTP 200 { ok: true,  registrationId, amountPaid }  -> success
//   HTTP 200 { ok: false, reason }                       -> HARD business
//        rejection; the client shows the reason and MUST NOT fall back.
//   HTTP 4xx/5xx                                         -> infrastructure /
//        misconfiguration; the client MAY fall back to the legacy direct-insert
//        path so the live site keeps working until this function + the RLS
//        migration are deployed. After the migration the fallback is blocked at
//        the database, so the system fails closed.
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

// HTTP 200 + ok:false => hard business rejection (client must NOT fall back).
const reject = (reason: string) => json({ ok: false, reason }, 200);

interface PaystackVerification {
  success: boolean;
  amountMajor: number; // in major units (e.g. Naira), converted from kobo
}

// Verify a payment reference directly with Paystack. Retries once on transient
// network failure. Throws on infrastructure errors (missing key / unreachable)
// so the caller returns a non-2xx and the client can fall back pre-migration.
async function verifyPaystack(reference: string, secretKey: string): Promise<PaystackVerification> {
  const url = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`;
  let lastErr: unknown = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      const payload = await res.json().catch(() => ({}));

      // A well-formed Paystack response that says the charge did not succeed is
      // a definitive answer, not a transient error — do not retry.
      const gatewayOk = payload?.status === true;
      const txnStatus = payload?.data?.status;
      if (gatewayOk && txnStatus === "success") {
        const kobo = Number(payload?.data?.amount) || 0;
        return { success: true, amountMajor: Math.round(kobo) / 100 };
      }
      return { success: false, amountMajor: 0 };
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`Paystack verification unreachable: ${String(lastErr)}`);
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
      // Infra misconfiguration -> non-2xx so the client falls back pre-migration.
      return json({ error: "Server not configured" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const {
      eventId,
      ticketTypeId = null,
      fullName,
      email,
      phone = null,
      quantity: rawQuantity = 1,
      paymentReference = null,
    } = body ?? {};

    if (!eventId || !fullName || !email) {
      // Bad request -> non-2xx (legacy path validates too).
      return json({ error: "Missing required fields (eventId, fullName, email)" }, 400);
    }

    const quantity = Math.max(1, Math.floor(Number(rawQuantity) || 1));

    // Service-role client performs the privileged writes (bypasses RLS).
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Derive the authenticated user (if any) from the caller's own JWT rather
    // than trusting a client-supplied user_id. Guests remain user_id = null.
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader && ANON_KEY) {
      try {
        const authScoped = createClient(SUPABASE_URL, ANON_KEY, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: userData } = await authScoped.auth.getUser();
        userId = userData?.user?.id ?? null;
      } catch (_e) {
        userId = null; // anon / invalid token => treat as guest
      }
    }

    // Resolve the ticket tier server-side to learn the authoritative price.
    let unitPrice = 0;
    let ticketRow: { id: string; price: number; event_id: string; quantity: number | null; sold: number } | null = null;

    if (ticketTypeId) {
      const { data: t, error: tErr } = await admin
        .from("ticket_types")
        .select("id, price, event_id, quantity, sold")
        .eq("id", ticketTypeId)
        .maybeSingle();

      if (tErr) throw tErr;
      if (!t) return reject("This ticket type no longer exists.");
      if (t.event_id !== eventId) return reject("Ticket type does not belong to this event.");

      ticketRow = t as typeof ticketRow;
      unitPrice = Number(t.price) || 0;

      // Optional capacity guard (quantity NULL = unlimited).
      if (t.quantity != null && Number(t.sold) + quantity > Number(t.quantity)) {
        return reject("This ticket type is sold out.");
      }
    }

    const isPaid = unitPrice > 0;
    let amountPaid = 0;

    if (isPaid) {
      if (!paymentReference) {
        // A paid ticket with no payment reference must never become 'completed'.
        return reject("Payment reference is required for a paid ticket.");
      }

      // Idempotency / anti-replay: if this reference was already recorded,
      // return the existing ticket instead of creating a duplicate.
      const { data: existing } = await admin
        .from("registrations")
        .select("id, amount_paid")
        .eq("payment_reference", paymentReference)
        .maybeSingle();

      if (existing) {
        return json({ ok: true, registrationId: existing.id, amountPaid: Number(existing.amount_paid) || 0 });
      }

      const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
      if (!PAYSTACK_SECRET_KEY) {
        // We cannot verify payment without the secret key. Fail as infra (non-2xx)
        // rather than silently trusting the client. Pre-migration the client
        // falls back; post-migration the DB blocks the fallback (fail closed).
        return json({ error: "Payment verification is not configured (PAYSTACK_SECRET_KEY missing)" }, 500);
      }

      const verification = await verifyPaystack(paymentReference, PAYSTACK_SECRET_KEY);
      if (!verification.success) {
        return reject("Payment could not be verified. If you were charged, contact support with your reference.");
      }

      amountPaid = verification.amountMajor;

      // Observability only: a verified payment below the undiscounted list price
      // may be a legitimate coupon OR an underpayment. We record the true amount
      // and log the shortfall. Fully closing this requires a server-side coupon
      // table (see the deploy runbook).
      const listPrice = unitPrice * quantity;
      if (amountPaid + 0.001 < listPrice) {
        console.warn(
          `Underpayment notice: ref=${paymentReference} paid=${amountPaid} listPrice=${listPrice} eventId=${eventId}`,
        );
      }
    }

    // Record the registration authoritatively via the service role.
    const registrationId = crypto.randomUUID();
    const { error: insertErr } = await admin.from("registrations").insert({
      id: registrationId,
      event_id: eventId,
      user_id: userId,
      ticket_type_id: ticketTypeId,
      full_name: fullName,
      email,
      phone: phone || null,
      amount_paid: amountPaid,
      payment_reference: paymentReference,
      status: "completed",
      checked_in: false,
    });

    if (insertErr) throw insertErr;

    // Increment sold count (best-effort; mirrors prior client behavior).
    if (ticketRow) {
      const { error: soldErr } = await admin
        .from("ticket_types")
        .update({ sold: (Number(ticketRow.sold) || 0) + quantity })
        .eq("id", ticketRow.id);
      if (soldErr) console.warn("Sold-count update deferred:", soldErr.message);
    }

    return json({ ok: true, registrationId, amountPaid });
  } catch (error) {
    // Unexpected/infra error -> non-2xx so the client can fall back pre-migration.
    const message = error instanceof Error ? error.message : String(error);
    console.error("complete-registration error:", message);
    return json({ error: message }, 500);
  }
});
