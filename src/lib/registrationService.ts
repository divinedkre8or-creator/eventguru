// src/lib/registrationService.ts
//
// Single entrypoint the checkout uses to record a registration.
//
// Strategy (live-safe rollout):
//   1. Try the secure `complete-registration` edge function first.
//   2. If the function is deployed and returns a HARD business rejection
//      (HTTP 200 { ok: false }), surface that error and DO NOT fall back —
//      falling back would recreate the exact forgery we are closing.
//   3. If the function is unreachable / not yet deployed / misconfigured
//      (network error or non-2xx), fall back to the legacy direct insert so the
//      live site keeps working until the backend is deployed. Once the RLS
//      hardening migration is applied, that fallback is blocked at the database
//      and the system fails closed.
import { supabase } from "@/integrations/supabase/client";

export interface SubmitRegistrationInput {
  eventId: string;
  ticketTypeId: string | null;
  fullName: string;
  email: string;
  phone?: string | null;
  quantity: number;
  /** Client-computed total; used for free tickets and as the fallback record amount. */
  amountPaid: number;
  paymentReference?: string | null;
  /** Optional linked user id, used only on the legacy fallback path. */
  userId?: string | null;
}

export interface SubmitRegistrationResult {
  registrationId: string;
  amountPaid: number;
  viaSecureFunction: boolean;
}

/** Hard rejection from the server (payment unverified, sold out, …). Not retried, not fallen back. */
export class RegistrationRejectedError extends Error {}

export async function submitRegistration(input: SubmitRegistrationInput): Promise<SubmitRegistrationResult> {
  // 1. Secure path — server verifies payment and records the row.
  try {
    const { data, error } = await supabase.functions.invoke("complete-registration", {
      body: {
        eventId: input.eventId,
        ticketTypeId: input.ticketTypeId,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone ?? null,
        quantity: input.quantity,
        paymentReference: input.paymentReference ?? null,
      },
    });

    if (!error && data) {
      if (data.ok === false) {
        // HTTP 200 + ok:false => hard business rejection. Propagate, never fall back.
        throw new RegistrationRejectedError(data.reason || "Registration could not be verified.");
      }
      if (data.ok && data.registrationId) {
        return {
          registrationId: data.registrationId,
          amountPaid: typeof data.amountPaid === "number" ? data.amountPaid : input.amountPaid,
          viaSecureFunction: true,
        };
      }
    }
    // `error` set (non-2xx / network) or unexpected shape -> fall through to legacy.
  } catch (err) {
    if (err instanceof RegistrationRejectedError) throw err; // do not fall back on hard rejections
    // Any other throw (network/invoke failure) -> fall through to legacy.
  }

  // 2. Legacy fallback — direct insert + sold increment (pre-deploy behavior).
  return legacyDirectInsert(input);
}

async function legacyDirectInsert(input: SubmitRegistrationInput): Promise<SubmitRegistrationResult> {
  // Pre-generate the id so we never depend on RETURNING-select RLS policies.
  const registrationId = crypto.randomUUID();

  const { error: regError } = await supabase.from("registrations").insert({
    id: registrationId,
    event_id: input.eventId,
    user_id: input.userId ?? null,
    ticket_type_id: input.ticketTypeId,
    full_name: input.fullName,
    email: input.email,
    phone: input.phone || null,
    amount_paid: input.amountPaid,
    payment_reference: input.paymentReference ?? null,
    status: "completed",
    checked_in: false,
  });

  if (regError) throw regError;

  // Best-effort sold-count increment (mirrors the original checkout behavior).
  if (input.ticketTypeId) {
    try {
      const { data: tData } = await supabase
        .from("ticket_types")
        .select("sold")
        .eq("id", input.ticketTypeId)
        .maybeSingle();
      if (tData) {
        await supabase
          .from("ticket_types")
          .update({ sold: (tData.sold || 0) + input.quantity })
          .eq("id", input.ticketTypeId);
      }
    } catch (tErr) {
      console.warn("Notice: Ticket sold count update deferred:", tErr);
    }
  }

  return { registrationId, amountPaid: input.amountPaid, viaSecureFunction: false };
}
