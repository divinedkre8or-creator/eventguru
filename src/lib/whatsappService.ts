// Frontend client service for WhatsApp ticket delivery & deep-link sharing

import { supabase } from "@/integrations/supabase/client";

export interface SendWhatsAppTicketParams {
  registrationId: string;
  phone?: string;
  paymentReference?: string;
}

export interface SendWhatsAppTicketResult {
  ok: boolean;
  provider?: string;
  mode?: "live" | "simulated";
  message?: string;
  error?: string;
}

export const sendTicketViaWhatsApp = async (
  params: SendWhatsAppTicketParams
): Promise<SendWhatsAppTicketResult> => {
  try {
    const { data, error } = await supabase.functions.invoke("send-whatsapp-ticket", {
      body: params,
    });

    if (error) throw error;
    return {
      ok: data?.ok ?? true,
      provider: data?.provider,
      mode: data?.mode,
      message: data?.notice || data?.message || "WhatsApp dispatch initiated",
    };
  } catch (err: any) {
    console.error("WhatsApp dispatch request error:", err);
    return {
      ok: false,
      error: err.message || "Unable to reach WhatsApp gateway",
    };
  }
};

// Generates a pre-formatted direct WhatsApp sharing link (works in any browser / phone)
export const getDirectWhatsAppTicketUrl = (
  eventTitle: string,
  ticketTier: string,
  ticketUrl: string,
  targetPhone?: string
): string => {
  const text = `🎟️ *Admission Pass for ${eventTitle}*\nTier: ${ticketTier}\n\nView and scan your digital QR pass at the gate:\n${ticketUrl}`;
  const encodedText = encodeURIComponent(text);
  if (targetPhone) {
    const cleanPhone = targetPhone.replace(/\D/g, "");
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
};
