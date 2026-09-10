import { useState } from "react";
import { 
  X, Loader2, Mail, CreditCard, ShieldCheck, CheckCircle2, 
  Sparkles, Image as ImageIcon, ArrowRight, Wallet, ExternalLink 
} from "lucide-react";
import { usePaystackPayment } from "react-paystack";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { getEventDpUrl } from "@/lib/slugUtils";
import { DigitalTicketCard } from "@/components/tickets/DigitalTicketCard";
import { TicketActions } from "@/components/tickets/TicketActions";
import { getActiveGatewayPublicKey, calculatePaymentBreakdown } from "@/lib/platformSettings";
import { sendTicketConfirmationEmail } from "@/lib/emailService";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: any;
  ticket: any;
  discountPercentage?: number;
  onSuccess: () => void;
}

export const CheckoutModal = ({ isOpen, onClose, event, ticket, discountPercentage = 0, onSuccess }: CheckoutModalProps) => {
  const { user } = useAuth();
  const [name, setName] = useState(user?.user_metadata?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedRegId, setCompletedRegId] = useState<string | null>(null);
  const [completedPaymentRef, setCompletedPaymentRef] = useState<string | null>(null);

  // Dynamic gateway public key resolved from Super Admin configuration
  const gatewayPublicKey = getActiveGatewayPublicKey();

  // Rigorous calculation ensuring subtotal, quantity, discount, and minor units are exact
  const breakdown = calculatePaymentBreakdown({
    unitPrice: ticket?.price || 0,
    quantity,
    discountPercentage,
  });

  const totalAmount = breakdown.totalAmount;
  const isFree = breakdown.isFree;

  const config = {
    reference: `EVR-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    email: email,
    amount: breakdown.amountInMinorUnits, // Gateway minor units (e.g. kobo)
    publicKey: gatewayPublicKey,
    currency: 'NGN', 
  };

  const initializePayment = usePaystackPayment(config);

  const sendConfirmationEmail = async (registrationId: string, paymentRef: string | null) => {
    try {
      // 1. Direct Resend dispatch using configured Super Admin API key
      const venueStr = [event.venue, event.city, event.country].filter(Boolean).join(", ") || "Venue TBA";
      const dateStr = event.date ? new Date(event.date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'TBA';

      await sendTicketConfirmationEmail({
        attendeeName: name,
        attendeeEmail: email,
        eventTitle: event.title || "Event",
        eventDate: dateStr,
        venueName: venueStr,
        ticketName: ticket?.name || "Standard Pass",
        orderReference: paymentRef || registrationId.slice(0, 8).toUpperCase(),
        amountPaid: totalAmount,
        eventUrl: window.location.origin + `/events/${event.slug || event.id}`,
        dpUrl: window.location.origin + getEventDpUrl(event),
      });

      // 2. Also trigger Supabase Edge Function as secondary background pipeline
      await supabase.functions.invoke('send-ticket', {
        body: { registrationId }
      }).catch((err) => console.warn("Edge function fallback notice:", err));
    } catch (err) {
      console.error("Failed to execute ticket email dispatch:", err);
    }
  };

  const completeRegistration = async (paymentRef: string | null = null) => {
    try {
      const { data: reg, error: regError } = await supabase.from("registrations").insert({
        event_id: event.id,
        user_id: user?.id || null,
        ticket_type_id: ticket?.id || null,
        full_name: name,
        email: email,
        phone: phone || null,
        amount_paid: totalAmount,
        payment_reference: paymentRef,
        status: 'completed',
        checked_in: false,
      }).select("id").single();

      if (regError) throw regError;

      if (ticket?.id) {
        const { data: tData } = await supabase.from('ticket_types').select('sold').eq('id', ticket.id).single();
        if (tData) {
          await supabase.from('ticket_types').update({ sold: tData.sold + quantity }).eq('id', ticket.id);
        }
      }

      if (reg?.id) {
         setCompletedRegId(reg.id);
         setCompletedPaymentRef(paymentRef);
         await sendConfirmationEmail(reg.id, paymentRef);
      }

      toast.success("Registration Successful!");
      onSuccess();
      setIsCompleted(true);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to complete registration");
    } finally {
      setProcessing(false);
    }
  };

  const onSuccessPayment = (reference: any) => {
    completeRegistration(reference.reference);
  };

  const onClosePayment = () => {
    toast.error("Payment cancelled");
    setProcessing(false);
  };

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      toast.error("Please fill in all required fields");
      return;
    }

    setProcessing(true);

    if (isFree) {
      completeRegistration(null);
    } else {
      initializePayment({ onSuccess: onSuccessPayment, onClose: onClosePayment });
    }
  };

  const handleModalClose = () => {
    setIsCompleted(false);
    onClose();
  };

  if (!isOpen) return null;

  // Post-Registration Digital Ticket Hub & Attendee Wallet Bridge
  if (isCompleted) {
    const registrationData = {
      id: completedRegId || "EVR-CONFIRMED",
      full_name: name,
      email: email,
      amount_paid: totalAmount,
      payment_reference: completedPaymentRef,
      created_at: new Date().toISOString(),
      checked_in: false,
    };

    const domTicketId = "checkout-success-ticket";
    const isLoggedIn = !!user;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 font-sans">
        <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-foreground">
          {/* Modal Header */}
          <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-card shrink-0">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-chart-green">
                <CheckCircle2 className="w-3.5 h-3.5" /> REGISTRATION CONFIRMED
              </div>
              <h2 className="font-heading text-lg sm:text-xl font-black text-foreground tracking-tight mt-0.5">
                You're Going, {name.split(" ")[0]}!
              </h2>
            </div>
            <button
              onClick={handleModalClose}
              className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
            {/* Digital Ticket Pass */}
            <DigitalTicketCard
              registration={registrationData}
              event={event}
              ticketTier={ticket}
              elementId={domTicketId}
            />

            {/* Action Toolbar */}
            <TicketActions
              registration={registrationData}
              event={event}
              ticketTierName={ticket?.name || "Standard Pass"}
              ticketDomId={domTicketId}
            />

            {/* Attendee Wallet & Dashboard Acquisition Card */}
            <div className="bg-muted/40 border border-border/80 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-secondary" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-secondary">
                  {isLoggedIn ? "TICKET WALLET" : "KEEP ALL TICKETS IN ONE PLACE"}
                </span>
              </div>

              {isLoggedIn ? (
                <>
                  <h3 className="font-heading text-sm font-bold text-foreground">
                    Ticket added to your EventRally Wallet (+100 Rally XP)
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    View your countdown, verify your gate QR pass, and track all your event milestones in your dashboard.
                  </p>
                  <Link to="/dashboard" onClick={handleModalClose} className="block pt-1">
                    <Button className="w-full bg-primary text-primary-foreground font-bold text-xs h-10 rounded-lg hover:opacity-90 flex items-center justify-center gap-2 shadow-sm">
                      <span>View in Attendee Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <h3 className="font-heading text-sm font-bold text-foreground">
                    Never search through email at the door
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Create your free Attendee Wallet to keep all your tickets in one place, track check-ins, and build your Rally Score.
                  </p>
                  <Link
                    to={`/signup?email=${encodeURIComponent(email)}&redirect=/dashboard`}
                    onClick={handleModalClose}
                    className="block pt-1"
                  >
                    <Button className="w-full bg-primary text-primary-foreground font-bold text-xs h-10 rounded-lg hover:opacity-90 flex items-center justify-center gap-2 shadow-sm">
                      <span>Claim Ticket & Create Free Wallet</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Direct Permapage Link */}
            {completedRegId && (
              <div className="text-center pt-1">
                <Link
                  to={`/tickets/${completedRegId}`}
                  onClick={handleModalClose}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Fullscreen Ticket Permapage
                </Link>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-3 bg-card border-t border-border flex items-center justify-between shrink-0">
            <span className="text-[10px] font-mono text-muted-foreground">
              TICKET REF: {completedPaymentRef || "CONFIRMED"}
            </span>
            <button
              onClick={handleModalClose}
              className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors px-3 py-1"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
      <div className="bg-card rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-foreground">
        
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="font-heading font-bold text-xl text-foreground">Checkout</h2>
            <p className="text-muted-foreground text-[13px] mt-0.5">{event.title}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCheckout} className="p-6 space-y-5">
          <div className="bg-muted/50 p-4 rounded-xl border border-border space-y-2">
            <div className="flex justify-between items-center text-[13px] text-muted-foreground">
              <span>{ticket.name} {quantity > 1 ? `(${quantity}x @ ₦${breakdown.unitPrice.toLocaleString()})` : "Ticket"}</span>
              <span className="font-medium text-foreground">
                {breakdown.unitPrice === 0 ? "Free" : `₦${breakdown.subtotal.toLocaleString()}`}
              </span>
            </div>

            {breakdown.discountAmount > 0 && (
              <div className="flex justify-between items-center text-xs text-secondary font-medium">
                <span>Discount ({breakdown.discountPercentage}% off)</span>
                <span>-₦{breakdown.discountAmount.toLocaleString()}</span>
              </div>
            )}

            <div className="flex justify-between items-center border-t border-border pt-2 mt-2">
              <span className="font-bold text-sm text-foreground">Total Amount</span>
              <span className="font-heading font-bold text-lg text-secondary">
                {isFree ? "Free" : `₦${breakdown.totalAmount.toLocaleString()}`}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-bold text-muted-foreground">Full Name *</Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="John Doe" 
                className="bg-background focus-visible:ring-secondary border-border rounded-lg"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px] font-bold text-muted-foreground">Email Address *</Label>
              <Input 
                type="email"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="john@example.com" 
                className="bg-background focus-visible:ring-secondary border-border rounded-lg"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px] font-bold text-muted-foreground">Phone Number <span className="text-xs text-muted-foreground font-normal">(Optional)</span></Label>
              <Input 
                type="tel"
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="+234..." 
                className="bg-background focus-visible:ring-secondary border-border rounded-lg"
              />
            </div>

            {/* Ticket Quantity selector only if not free */}
            {!isFree && (
              <div className="space-y-1.5">
                 <Label className="text-[13px] font-bold text-muted-foreground">Quantity</Label>
                 <select 
                   value={quantity} 
                   onChange={(e) => setQuantity(parseInt(e.target.value))}
                   className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                 >
                   {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <option key={n} value={n}>{n}</option>
                   ))}
                 </select>
              </div>
            )}
          </div>

          <div className="pt-2">
            <Button 
              type="submit" 
              disabled={processing} 
              className="w-full bg-primary text-primary-foreground hover:opacity-90 h-12 rounded-xl font-heading font-bold text-[15px] shadow-lg flex items-center justify-center gap-2"
            >
              {processing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isFree ? <Mail className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                  {isFree ? "Complete Registration" : "Pay Securely"}
                </>
              )}
            </Button>
            
            <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground text-[11px]">
               <ShieldCheck className="w-4 h-4 text-chart-green" />
               <span>{isFree ? "Secure registration pipeline" : "Payments processing secured by 256-bit bank-grade encryption"}</span>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
