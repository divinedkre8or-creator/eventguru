import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DigitalTicketCard } from "@/components/tickets/DigitalTicketCard";
import { TicketActions } from "@/components/tickets/TicketActions";
import { Button } from "@/components/ui/button";
import { 
  Loader2, ArrowLeft, ArrowRight, ShieldCheck, 
  Wallet, Sparkles, CheckCircle2, AlertCircle
} from "lucide-react";
import { formatTicketCode } from "@/lib/ticketUtils";

export const TicketView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [registration, setRegistration] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [ticketTier, setTicketTier] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchTicket = async () => {
      setLoading(true);
      setError(null);

      // Check offline cache first
      const cacheKey = `eventrally_ticket_${id}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setRegistration(parsed.registration);
          setEvent(parsed.event);
          setTicketTier(parsed.ticketTier);
        } catch (e) {
          // ignore cache parse error
        }
      }

      try {
        const { data, error: queryError } = await supabase
          .from("registrations")
          .select("*, events(*), ticket_types(*)")
          .or(`id.eq.${id},payment_reference.eq.${id}`)
          .maybeSingle();

        if (queryError) throw queryError;
        if (!data && !cached) throw new Error("Ticket not found");

        if (data) {
          setRegistration(data);
          setEvent(data.events);
          setTicketTier(data.ticket_types);

          // Update offline cache
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              registration: data,
              event: data.events,
              ticketTier: data.ticket_types,
            })
          );
        }
      } catch (err: any) {
        console.error("Failed to load ticket", err);
        if (!cached) {
          setError(err.message || "Unable to locate this ticket pass.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [id]);

  if (loading && !registration) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-sans text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-secondary mb-3" />
        <p className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
          VERIFYING TICKET PASS...
        </p>
      </div>
    );
  }

  if (error || !registration || !event) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-sans text-foreground">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="font-heading font-black text-xl text-foreground">Ticket Not Found</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            We could not find an active admission pass matching this identifier. Please verify the URL or contact event support.
          </p>
          <Link to="/">
            <Button variant="outline" className="w-full text-xs font-bold mt-2">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Return to EventRally Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const ticketCode = formatTicketCode(registration.id);
  const domId = `ticket-view-canvas-${registration.id}`;
  const isLoggedIn = !!user;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased py-8 px-4 flex flex-col items-center justify-center selection:bg-primary selection:text-primary-foreground">
      {/* Top Header Navigation */}
      <div className="w-full max-w-md flex items-center justify-between mb-6">
        <Link
          to="/"
          className="font-heading font-black text-base tracking-tighter text-foreground uppercase flex items-center gap-1.5 hover:opacity-80 transition-opacity"
        >
          EVENTRALLY
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold uppercase bg-muted text-muted-foreground px-2.5 py-1 rounded-md">
            OFFICIAL PASS
          </span>
        </div>
      </div>

      {/* Main Digital Ticket */}
      <div className="w-full max-w-md mb-6">
        <DigitalTicketCard
          registration={registration}
          event={event}
          ticketTier={ticketTier}
          elementId={domId}
        />
      </div>

      {/* Action Toolbar */}
      <div className="w-full max-w-md mb-6">
        <TicketActions
          registration={registration}
          event={event}
          ticketTierName={ticketTier?.name || "Standard Pass"}
          ticketDomId={domId}
        />
      </div>

      {/* Attendee Wallet & Dashboard Acquisition Bridge */}
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-5 shadow-lg space-y-3 relative overflow-hidden">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-secondary" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-secondary">
            EVENTRALLY WALLET
          </span>
        </div>

        {isLoggedIn ? (
          <>
            <h3 className="font-heading text-sm font-black text-foreground">
              This ticket is saved to your Attendee Wallet
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Track your check-in status, earn Rally XP, and unlock milestone badges in your personal attendee portal.
            </p>
            <Link to="/dashboard" className="block pt-1">
              <Button className="w-full bg-primary text-primary-foreground font-bold text-xs h-10 rounded-xl hover:opacity-90 flex items-center justify-center gap-2 shadow-sm">
                <span>Open Attendee Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </>
        ) : (
          <>
            <h3 className="font-heading text-sm font-black text-foreground">
              Keep all your tickets in one place
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Create your free Attendee Wallet to access your tickets offline, build your Rally Score, and never search through email at the gate.
            </p>
            <Link
              to={`/signup?email=${encodeURIComponent(registration.email)}&redirect=/dashboard`}
              className="block pt-1"
            >
              <Button className="w-full bg-primary text-primary-foreground font-bold text-xs h-10 rounded-xl hover:opacity-90 flex items-center justify-center gap-2 shadow-sm">
                <span>Claim Ticket & Create Free Wallet</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </>
        )}
      </div>

      {/* Return to Event Link */}
      <div className="mt-6 text-center">
        <Link
          to={`/events/${event.id}`}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Event Details
        </Link>
      </div>
    </div>
  );
};

export default TicketView;
