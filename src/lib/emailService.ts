// src/lib/emailService.ts
// Centralized Email Dispatcher & Template Engine powered by Resend
// Reads API key, sender address, and display name directly from Super Admin Platform Settings.

import { getPlatformSettings } from "@/lib/platformSettings";

export interface SendEmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface TicketEmailData {
  attendeeName: string;
  attendeeEmail: string;
  eventTitle: string;
  eventDate: string;
  venueName: string;
  ticketName: string;
  orderReference: string;
  amountPaid: number;
  currency?: string;
  eventUrl: string;
  dpUrl: string;
}

export interface OrganizerAlertData {
  organizerEmail: string;
  organizerName: string;
  eventTitle: string;
  attendeeName: string;
  attendeeEmail: string;
  ticketTier: string;
  amountPaid: number;
  currency?: string;
  orderReference: string;
  dashboardUrl: string;
}

export interface BroadcastCampaignData {
  recipientEmail: string;
  recipientName: string;
  eventTitle: string;
  subject: string;
  messageBody: string;
  organizerName?: string;
}

/**
 * Dispatches an email via Resend API using the Super Admin configured API key.
 * Falls back to safe mock logging if no key is entered yet.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}: SendEmailPayload): Promise<{ success: boolean; id?: string; error?: string }> {
  const settings = getPlatformSettings();
  const apiKey = settings.resend_api_key?.trim();

  if (!apiKey) {
    console.info(`[Resend Mock Dispatch] To: ${Array.isArray(to) ? to.join(", ") : to} | Subject: "${subject}" (No Resend API Key configured in Super Admin)`);
    return { success: true, id: `mock-${Date.now()}` };
  }

  try {
    const from = `${settings.email_sender_name} <${settings.email_sender_address}>`;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text: text || html.replace(/<[^>]*>?/gm, ""),
        reply_to: replyTo || settings.email_reply_to,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend API dispatch error:", data);
      return { success: false, error: data.message || `Resend HTTP ${response.status}` };
    }

    return { success: true, id: data.id };
  } catch (err: any) {
    console.error("Failed to execute email dispatch:", err);
    return { success: false, error: err.message || "Network dispatch failure" };
  }
}

/**
 * 1. ATTENDEE TICKET & QR CONFIRMATION EMAIL
 * Designed with anti-spam headers, high text-to-code ratio, and inline responsive layout.
 */
export async function sendTicketConfirmationEmail(data: TicketEmailData) {
  const settings = getPlatformSettings();
  const subject = `Your Official Pass: ${data.eventTitle}`;
  const priceDisplay = data.amountPaid === 0 ? "Free Pass" : `${data.currency || "NGN"} ${data.amountPaid.toLocaleString()}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 24px; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A;">
      <div style="max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        
        <!-- Header Bar -->
        <div style="background-color: #0F172A; padding: 24px; text-align: center; border-bottom: 3px solid #0058BE;">
          <div style="font-size: 20px; font-weight: 900; letter-spacing: -0.5px; color: #FFFFFF; margin: 0;">
            ${settings.platform_name.toUpperCase()}
          </div>
          <div style="font-size: 11px; font-family: monospace; color: #94A3B8; text-transform: uppercase; margin-top: 4px; letter-spacing: 1px;">
            VERIFIED REGISTRATION MANIFEST
          </div>
        </div>

        <!-- Body -->
        <div style="padding: 28px;">
          <div style="display: inline-block; padding: 4px 10px; background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 6px; font-size: 11px; font-weight: bold; color: #065F46; text-transform: uppercase; margin-bottom: 12px;">
            ENTRY CONFIRMED
          </div>

          <h1 style="font-size: 22px; font-weight: 900; color: #0F172A; margin: 0 0 8px 0; line-height: 1.3;">
            You are registered for ${data.eventTitle}
          </h1>

          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
            Hello <strong>${data.attendeeName}</strong>, your pass has been registered on the gate verification system. Present this confirmation or reference code at the entrance.
          </p>

          <!-- Ticket Pass Box -->
          <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <div style="font-size: 11px; font-family: monospace; font-weight: bold; color: #64748B; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
              PASS SPECIFICATIONS
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #64748B; width: 35%;">Pass Type:</td>
                <td style="padding: 6px 0; font-weight: bold; color: #0F172A;">${data.ticketName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748B;">Date & Time:</td>
                <td style="padding: 6px 0; font-weight: bold; color: #0F172A;">${data.eventDate}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748B;">Venue:</td>
                <td style="padding: 6px 0; font-weight: bold; color: #0F172A;">${data.venueName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748B;">Pass Fee:</td>
                <td style="padding: 6px 0; font-weight: bold; color: #0F172A;">${priceDisplay}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748B;">Gate Order Ref:</td>
                <td style="padding: 6px 0; font-family: monospace; font-weight: bold; color: #0058BE;">${data.orderReference}</td>
              </tr>
            </table>
          </div>

          <!-- CTAs -->
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${data.dpUrl}" style="display: inline-block; background-color: #0058BE; color: #FFFFFF; font-size: 13px; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin-bottom: 10px;">
              Generate Your Event Profile DP
            </a>
            <div style="font-size: 11px; color: #64748B; margin-top: 6px;">
              Share your custom personalized flyer on WhatsApp, Instagram & X
            </div>
          </div>

          <!-- Notice -->
          <div style="border-top: 1px solid #E2E8F0; padding-top: 16px; font-size: 12px; color: #64748B; line-height: 1.5;">
            Need help or have questions regarding this booking? Reply directly to this email or contact the host at <a href="mailto:${settings.support_email}" style="color: #0058BE; text-decoration: none;">${settings.support_email}</a>.
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #F1F5F9; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748B; border-top: 1px solid #E2E8F0;">
          <div>© ${new Date().getFullYear()} ${settings.platform_name}. All rights reserved.</div>
          <div style="margin-top: 4px;">Sent from verified gateway infrastructure. No spam.</div>
        </div>

      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: data.attendeeEmail,
    subject,
    html,
  });
}

/**
 * 2. ORGANIZER SALE / REGISTRATION ALERT EMAIL
 */
export async function sendOrganizerSaleAlertEmail(data: OrganizerAlertData) {
  const settings = getPlatformSettings();
  const subject = `New Registration: ${data.attendeeName} for ${data.eventTitle}`;
  const priceDisplay = data.amountPaid === 0 ? "Free Registration" : `${data.currency || "NGN"} ${data.amountPaid.toLocaleString()}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="utf-8" /></head>
    <body style="margin:0; padding:24px; background-color:#F8FAFC; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:#0F172A;">
      <div style="max-width:560px; margin:0 auto; background-color:#FFFFFF; border:1px solid #E2E8F0; border-radius:12px; padding:24px;">
        <div style="font-size:11px; font-family:monospace; font-weight:bold; color:#0058BE; text-transform:uppercase; margin-bottom:6px;">
          ORGANIZER REAL-TIME DISPATCH
        </div>
        <h2 style="font-size:19px; font-weight:900; margin:0 0 12px 0;">New Ticket Confirmed</h2>
        <p style="font-size:13px; color:#475569; line-height:1.6;">
          Hello ${data.organizerName || "Organizer"}, a new attendee has completed registration for <strong>${data.eventTitle}</strong>.
        </p>

        <div style="background-color:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:16px; margin:16px 0; font-size:13px;">
          <div><strong>Attendee:</strong> ${data.attendeeName} (${data.attendeeEmail})</div>
          <div style="margin-top:6px;"><strong>Tier:</strong> ${data.ticketTier}</div>
          <div style="margin-top:6px;"><strong>Amount Paid:</strong> ${priceDisplay}</div>
          <div style="margin-top:6px;"><strong>Reference:</strong> <span style="font-family:monospace;">${data.orderReference}</span></div>
        </div>

        <div style="margin-top:20px;">
          <a href="${data.dashboardUrl}" style="display:inline-block; background-color:#0F172A; color:#FFFFFF; font-size:12px; font-weight:bold; text-decoration:none; padding:10px 18px; border-radius:6px;">
            Open Live Manifest & Check-in
          </a>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: data.organizerEmail,
    subject,
    html,
  });
}

/**
 * 3. BROADCAST CAMPAIGN EMAIL (To Attendees)
 */
export async function sendBroadcastCampaignEmail(data: BroadcastCampaignData) {
  const settings = getPlatformSettings();
  const personalizedMessage = data.messageBody.replace(/\{\{name\}\}/gi, data.recipientName || "Attendee");

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="utf-8" /></head>
    <body style="margin:0; padding:24px; background-color:#F8FAFC; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:#0F172A;">
      <div style="max-width:580px; margin:0 auto; background-color:#FFFFFF; border:1px solid #E2E8F0; border-radius:12px; padding:28px;">
        <div style="font-size:11px; font-family:monospace; font-weight:bold; color:#0058BE; text-transform:uppercase; margin-bottom:8px;">
          UPDATE REGARDING ${data.eventTitle.toUpperCase()}
        </div>
        <h2 style="font-size:20px; font-weight:900; margin:0 0 16px 0; color:#0F172A;">
          ${data.subject}
        </h2>
        <div style="font-size:14px; line-height:1.7; color:#334155; white-space:pre-line;">
          ${personalizedMessage}
        </div>
        <div style="margin-top:28px; border-top:1px solid #E2E8F0; padding-top:14px; font-size:11px; color:#64748B;">
          You received this message because you are registered for ${data.eventTitle} on ${settings.platform_name}.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: data.recipientEmail,
    subject: data.subject,
    html,
  });
}
