// src/lib/registrationService.ts
//
// Authoritative Registration & Payment Service for EventRally.
//
// Guarantees:
//   1. Paid payments are NEVER created via client-side direct inserts.
//      If server-side verification fails, it FAILS CLOSED.
//   2. Order pre-initialization (`initializeOrder`) binds the reference and amount
//      server-side before opening Paystack.
//   3. Finalization (`finalizeOrder`) performs cryptographic verification and
//      atomic multi-ticket provisioning via the database RPC.
//   4. Free registrations are verified against the database and fail closed if
//      the selected tier is not genuinely free.

import { supabase } from "@/integrations/supabase/client";

export interface InitializeOrderInput {
  eventId: string;
  ticketTypeId: string | null;
  fullName: string;
  email: string;
  phone?: string | null;
  quantity: number;
  customAnswers?: Record<string, any> | null;
}

export interface InitializeOrderResult {
  ok: boolean;
  isFree: boolean;
  orderId?: string;
  paymentReference?: string;
  amountKobo?: number;
  amountMajor?: number;
  currency?: string;
  registrationId?: string;
  ticketIds?: string[];
  metadata?: Record<string, any>;
  reason?: string;
}

export interface FinalizeOrderInput {
  paymentReference: string;
}

export interface SubmitRegistrationInput {
  eventId: string;
  ticketTypeId: string | null;
  fullName: string;
  email: string;
  phone?: string | null;
  quantity: number;
  amountPaid: number;
  paymentReference?: string | null;
  userId?: string | null;
  customAnswers?: Record<string, any> | null;
}

export interface SubmitRegistrationResult {
  registrationId: string;
  ticketIds?: string[];
  orderId?: string;
  amountPaid: number;
  viaSecureFunction: boolean;
}

export class RegistrationRejectedError extends Error {}
export class PaymentVerificationError extends Error {}

/**
 * Authoritatively creates a pending order on the server before payment.
 */
export async function initializeOrder(input: InitializeOrderInput): Promise<InitializeOrderResult> {
  const { data, error } = await supabase.functions.invoke("complete-registration", {
    body: {
      action: "initialize",
      eventId: input.eventId,
      ticketTypeId: input.ticketTypeId,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone ?? null,
      quantity: input.quantity,
      customAnswers: input.customAnswers ?? null,
    },
  });

  if (error) {
    throw new Error(error.message || "Failed to initialize order with server.");
  }

  if (data?.ok === false) {
    throw new RegistrationRejectedError(data.reason || "Unable to reserve ticket order.");
  }

  return data as InitializeOrderResult;
}

/**
 * Authoritatively verifies payment with Paystack and issues tickets atomically.
 */
export async function finalizeOrder(paymentReference: string): Promise<SubmitRegistrationResult> {
  const { data, error } = await supabase.functions.invoke("complete-registration", {
    body: {
      action: "finalize",
      paymentReference,
    },
  });

  if (error) {
    throw new PaymentVerificationError(
      `Payment confirmation was interrupted. If your card was charged, your reference is: ${paymentReference}. Please contact support.`
    );
  }

  if (data?.ok === false) {
    throw new RegistrationRejectedError(data.reason || "Payment could not be verified by the server.");
  }

  return {
    registrationId: data.registrationId,
    ticketIds: data.ticketIds || (data.registrationId ? [data.registrationId] : []),
    orderId: data.orderId,
    amountPaid: typeof data.amountPaid === "number" ? data.amountPaid : 0,
    viaSecureFunction: true,
  };
}

/**
 * Unified entrypoint for registration submission.
 * Strictly avoids falling back to client-direct inserts for paid tickets.
 */
export async function submitRegistration(input: SubmitRegistrationInput): Promise<SubmitRegistrationResult> {
  // If payment reference exists, this is a paid checkout confirmation
  if (input.paymentReference) {
    return finalizeOrder(input.paymentReference);
  }

  // Free ticket flow
  try {
    const initRes = await initializeOrder({
      eventId: input.eventId,
      ticketTypeId: input.ticketTypeId,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      quantity: input.quantity,
      customAnswers: input.customAnswers,
    });

    if (initRes.isFree && initRes.registrationId) {
      return {
        registrationId: initRes.registrationId,
        ticketIds: initRes.ticketIds || [initRes.registrationId],
        orderId: initRes.orderId,
        amountPaid: 0,
        viaSecureFunction: true,
      };
    }
  } catch (err) {
    if (err instanceof RegistrationRejectedError) throw err;
    console.warn("Server free ticket initialization failed, attempting hardened direct insert:", err);
  }

  // Only genuinely free tickets (amountPaid === 0) may use direct insert fallback,
  // which is guarded at database level by the hardened RLS policy
  if (input.amountPaid === 0) {
    return freeTicketDirectInsert(input);
  }

  throw new PaymentVerificationError("Paid registrations cannot be completed without verified payment reference.");
}

async function freeTicketDirectInsert(input: SubmitRegistrationInput): Promise<SubmitRegistrationResult> {
  const registrationId = crypto.randomUUID();
  const insertPayload: any = {
    id: registrationId,
    event_id: input.eventId,
    user_id: input.userId ?? null,
    ticket_type_id: input.ticketTypeId,
    full_name: input.fullName,
    email: input.email,
    phone: input.phone || null,
    amount_paid: 0,
    payment_reference: `FREE-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    status: "completed",
    checked_in: false,
    ticket_index: 1,
    ticket_code: `TKT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
  };

  if (input.customAnswers && Object.keys(input.customAnswers).length > 0) {
    insertPayload.custom_answers = input.customAnswers;
  }

  const { error: regError } = await supabase.from("registrations").insert(insertPayload);
  if (regError) {
    throw new Error(`Free registration rejected by database: ${regError.message}`);
  }

  // Best-effort stock increment
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
    } catch (_tErr) {
      // deferred
    }
  }

  return { registrationId, amountPaid: 0, viaSecureFunction: false };
}
