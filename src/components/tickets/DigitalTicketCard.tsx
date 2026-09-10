import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { 
  Calendar, MapPin, Clock, User, Ticket, CheckCircle2, 
  ShieldCheck, Sparkles, Building2
} from "lucide-react";
import { formatTicketCode } from "@/lib/ticketUtils";

export interface DigitalTicketCardProps {
  registration: {
    id: string;
    full_name: string;
    email: string;
    amount_paid?: number | null;
    payment_reference?: string | null;
    created_at?: string;
    checked_in?: boolean;
    checked_in_at?: string | null;
  };
  event: {
    id: string;
    title: string;
    date: string;
    venue?: string | null;
    city?: string | null;
    country?: string | null;
    image_url?: string | null;
    category?: string | null;
    organiser_id?: string | null;
  };
  ticketTier?: {
    name?: string | null;
    price?: number | null;
  } | null;
  elementId?: string;
  className?: string;
}

export const DigitalTicketCard: React.FC<DigitalTicketCardProps> = ({
  registration,
  event,
  ticketTier,
  elementId,
  className = "",
}) => {
  const domId = elementId || `digital-ticket-${registration.id}`;
  const ticketCode = formatTicketCode(registration.id);

  // Format Event Date and Time
  const eventDateObj = new Date(event.date);
  const isValidDate = !isNaN(eventDateObj.getTime());
  const dateStr = isValidDate
    ? eventDateObj.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Date TBA";

  const timeStr = isValidDate
    ? eventDateObj.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "Time TBA";

  // Structured QR Verification Payload
  const qrPayload = JSON.stringify({
    v: 1,
    app: "EventRally",
    tid: ticketCode,
    rid: registration.id,
    eid: event.id,
    ref: registration.payment_reference || "free",
  });

  return (
    <div
      id={domId}
      className={`relative w-full max-w-md mx-auto bg-card border border-border/80 rounded-2xl shadow-xl overflow-hidden text-card-foreground font-sans select-none transition-all ${className}`}
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      {/* Top Graphic Banner / Brand Strip */}
      <div className="bg-primary text-primary-foreground px-5 py-3 flex items-center justify-between border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <span className="font-heading font-black text-xs tracking-wider uppercase">
            EVENTRALLY PASS
          </span>
        </div>
        <span className="font-mono text-[11px] font-bold tracking-widest text-primary-foreground/90 uppercase">
          {ticketCode}
        </span>
      </div>

      {/* Main Ticket Body */}
      <div className="p-5 space-y-4">
        {/* Category & Verified Status */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider bg-secondary/10 text-secondary border border-secondary/20 px-2.5 py-0.5 rounded-full">
            <Ticket className="w-3 h-3" />
            {event.category || "General Event"}
          </span>

          <span
            className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
              registration.checked_in
                ? "bg-chart-blue/10 text-chart-blue border border-chart-blue/30"
                : "bg-chart-green/10 text-chart-green border border-chart-green/30"
            }`}
          >
            {registration.checked_in ? (
              <>
                <CheckCircle2 className="w-3 h-3" />
                CHECKED IN
              </>
            ) : (
              <>
                <ShieldCheck className="w-3 h-3" />
                VALID ENTRY
              </>
            )}
          </span>
        </div>

        {/* Event Title */}
        <div>
          <h2 className="font-heading text-xl sm:text-2xl font-black text-foreground tracking-tight leading-snug">
            {event.title}
          </h2>
        </div>

        {/* Schedule & Venue Grid */}
        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/60">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-muted-foreground uppercase">
              <Calendar className="w-3.5 h-3.5 text-secondary" />
              DATE
            </div>
            <div className="text-xs font-bold text-foreground">{dateStr}</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-muted-foreground uppercase">
              <Clock className="w-3.5 h-3.5 text-secondary" />
              TIME
            </div>
            <div className="text-xs font-bold text-foreground">{timeStr}</div>
          </div>

          <div className="col-span-2 space-y-1 pt-1">
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-muted-foreground uppercase">
              <MapPin className="w-3.5 h-3.5 text-secondary" />
              LOCATION
            </div>
            <div className="text-xs font-semibold text-foreground truncate">
              {[event.venue, event.city, event.country].filter(Boolean).join(", ") || "Venue details will be announced"}
            </div>
          </div>
        </div>

        {/* Attendee Details */}
        <div className="bg-muted/40 border border-border/70 rounded-xl p-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase text-muted-foreground">
              <User className="w-3 h-3" /> TICKET HOLDER
            </div>
            <div className="text-sm font-black text-foreground truncate">
              {registration.full_name}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {registration.email}
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-[10px] font-mono font-bold uppercase text-muted-foreground">
              TIER
            </div>
            <span className="inline-block bg-card border border-border text-foreground font-bold text-xs px-2.5 py-1 rounded-md mt-0.5">
              {ticketTier?.name || "Standard Pass"}
            </span>
          </div>
        </div>
      </div>

      {/* Perforated Divider Strip with Circular Cutout Notches */}
      <div className="relative flex items-center justify-center my-1 px-4">
        {/* Left Circular Cutout Notch */}
        <div className="absolute -left-3 w-6 h-6 rounded-full bg-background border border-border z-10" />
        
        {/* Dashed Tear Line */}
        <div className="w-full border-b-2 border-dashed border-border" />
        
        {/* Right Circular Cutout Notch */}
        <div className="absolute -right-3 w-6 h-6 rounded-full bg-background border border-border z-10" />
      </div>

      {/* Bottom Gate Stub & Scannable QR Code Section */}
      <div className="p-5 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1.5 text-center sm:text-left">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
            GATE VERIFICATION
          </div>
          <div className="font-mono text-sm font-black text-foreground tracking-widest">
            {ticketCode}
          </div>
          <p className="text-[10px] text-muted-foreground max-w-[200px] leading-relaxed">
            Present this scannable QR pass at the entrance gate for instant check-in.
          </p>
        </div>

        {/* High-Contrast Crisp QR Code Container */}
        <div className="shrink-0 p-2.5 bg-white rounded-xl shadow-md border border-neutral-200">
          <QRCodeSVG
            value={qrPayload}
            size={108}
            level="M"
            includeMargin={false}
            fgColor="#000000"
            bgColor="#FFFFFF"
          />
        </div>
      </div>

      {/* Micro Footer Brand Note */}
      <div className="px-5 py-2.5 bg-card border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
        <span>POWERED BY EVENTRALLY</span>
        <span>WHERE EVERYONE'S GOING</span>
      </div>
    </div>
  );
};
