import html2canvas from "html2canvas";
import { toast } from "sonner";

export interface TicketExportData {
  id: string;
  ticketCode: string;
  fullName: string;
  email: string;
  ticketTierName?: string;
  eventTitle: string;
  eventDate: string;
  eventVenue?: string;
  eventCity?: string;
  eventCategory?: string;
}

/**
 * Downloads a DOM element as a high-resolution PNG image (retina 2x).
 */
export async function downloadTicketAsPng(elementId: string, filename: string): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    toast.error("Ticket element not found for export");
    return false;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
    });

    const image = canvas.toDataURL("image/png", 1.0);
    const downloadLink = document.createElement("a");
    downloadLink.href = image;
    downloadLink.download = `${filename}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    toast.success("Ticket downloaded to your device");
    return true;
  } catch (err: any) {
    console.error("Failed to export ticket image", err);
    toast.error("Could not export ticket image. Please try again or take a screenshot.");
    return false;
  }
}

/**
 * Formats a Date object to RFC 5545 UTC timestamp (YYYYMMDDTHHMMSSZ)
 */
function formatIcsDate(date: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

/**
 * Generates an RFC 5545 compliant .ics file and prompts download.
 * Compatible with Apple Calendar, iOS, Outlook, and Android.
 */
export function downloadIcsCalendarFile(data: TicketExportData): void {
  const startDate = new Date(data.eventDate);
  const isValidDate = !isNaN(startDate.getTime());
  const start = isValidDate ? startDate : new Date();
  // Default duration 3 hours
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);

  const startUtc = formatIcsDate(start);
  const endUtc = formatIcsDate(end);
  const nowUtc = formatIcsDate(new Date());

  const location = [data.eventVenue, data.eventCity].filter(Boolean).join(", ") || "TBA";
  const cleanTitle = data.eventTitle.replace(/[\r\n]+/g, " ");

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EventRally//Ticketing System//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:eventrally-${data.id}@eventrally.com`,
    `DTSTAMP:${nowUtc}`,
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    `SUMMARY:${cleanTitle}`,
    `DESCRIPTION:Your ticket for ${cleanTitle} (Ticket Code: ${data.ticketCode}, Tier: ${data.ticketTierName || "Standard"}). Managed by EventRally.`,
    `LOCATION:${location}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `EventRally-${data.ticketCode}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);

  toast.success("Calendar invite (.ics) downloaded");
}

/**
 * Creates a direct deep link to Google Calendar's event creation form.
 */
export function getGoogleCalendarUrl(data: TicketExportData): string {
  const startDate = new Date(data.eventDate);
  const isValidDate = !isNaN(startDate.getTime());
  const start = isValidDate ? startDate : new Date();
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);

  const startUtc = formatIcsDate(start);
  const endUtc = formatIcsDate(end);
  const location = [data.eventVenue, data.eventCity].filter(Boolean).join(", ");
  const details = `Event: ${data.eventTitle}\nTicket Holder: ${data.fullName}\nTicket Tier: ${data.ticketTierName || "Standard"}\nTicket Code: ${data.ticketCode}\nPlatform: EventRally`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: data.eventTitle,
    dates: `${startUtc}/${endUtc}`,
    details: details,
    location: location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Formats a short, readable human ticket code from a registration ID.
 * Example: "EVR-A8C3F019"
 */
export function formatTicketCode(registrationId: string): string {
  if (!registrationId) return "EVR-000000";
  const clean = registrationId.replace(/-/g, "").toUpperCase();
  return `EVR-${clean.slice(0, 8)}`;
}

/**
 * Generates viral social sharing URLs.
 */
export function getSocialShareIntents(eventTitle: string, eventUrl: string, ticketCode: string) {
  const shareText = `I just secured my ticket to ${eventTitle} on EventRally! Who's coming?`;
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(eventUrl);

  return {
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
  };
}

/**
 * Copies link to clipboard with user feedback toast.
 */
export async function copyToClipboard(text: string, label = "Link"): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  } catch (err) {
    toast.error("Could not copy to clipboard");
  }
}
