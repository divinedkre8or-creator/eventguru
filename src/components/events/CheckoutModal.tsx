import { useState, useEffect } from "react";
import { 
  X, Loader2, Mail, CreditCard, ShieldCheck, CheckCircle2, 
  Image as ImageIcon, ArrowRight, Wallet, ExternalLink,
  Globe, MessageSquare, Info, HelpCircle
} from "lucide-react";
import { usePaystackPayment } from "react-paystack";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { getEventDpUrl, getEventUrl } from "@/lib/slugUtils";
import { DigitalTicketCard } from "@/components/tickets/DigitalTicketCard";
import { TicketActions } from "@/components/tickets/TicketActions";
import { getActiveGatewayPublicKey, calculatePaymentBreakdown } from "@/lib/platformSettings";
import { submitRegistration, RegistrationRejectedError } from "@/lib/registrationService";
import { parseEventMetadata, CustomQuestion } from "@/lib/eventMetadata";

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

  // Parse structured metadata (online modality and custom questions)
  const meta = parseEventMetadata(event?.description, event);
  const customQuestions: CustomQuestion[] = meta.customQuestions || [];
  const isOnlineEvent = meta.eventType === "online";
  const onlineSettings = meta.onlineSettings;

  // Custom question answers state
  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});
  
  // Auto-redirect state (defaults to disabled unless organizer explicitly enabled it)
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [redirectCancelled, setRedirectCancelled] = useState(false);

  // Auto-redirect handler for online events when organizer enabled auto_redirect
  useEffect(() => {
    if (!isCompleted) {
      setRedirectCountdown(null);
      setRedirectCancelled(false);
      return;
    }

    if (isOnlineEvent && onlineSettings?.auto_redirect && !redirectCancelled) {
      const targetUrl = onlineSettings.whatsapp_group_link || onlineSettings.meeting_link;
      if (targetUrl) {
        setRedirectCountdown(5);
        const interval = setInterval(() => {
          setRedirectCountdown((prev) => {
            if (prev === null) return null;
            if (prev <= 1) {
              clearInterval(interval);
              window.open(targetUrl, "_blank");
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        return () => clearInterval(interval);
      }
    }
  }, [isCompleted, isOnlineEvent, onlineSettings, redirectCancelled]);

  const handleAnswerChange = (questionId: string, value: any) => {
    setCustomAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
    setCustomAnswers((prev) => {
      const current = Array.isArray(prev[questionId]) ? [...prev[questionId]] : [];
      if (checked) {
        if (!current.includes(option)) current.push(option);
      } else {
        const idx = current.indexOf(option);
        if (idx !== -1) current.splice(idx, 1);
      }
      return { ...prev, [questionId]: current };
    });
  };

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
      // 1. Dispatch ticket & SMS through the secure server-side edge function
      await supabase.functions.invoke('send-ticket', {
        body: { registrationId, paymentReference: paymentRef }
      }).catch((err) => console.warn("Edge function dispatch notice:", err));
    } catch (err) {
      console.error("Failed to execute ticket email dispatch:", err);
    }
  };

  const completeRegistration = async (paymentRef: string | null = null) => {
    try {
      // Route through the secure server entrypoint (with live-safe fallback).
      // The server verifies payment for paid tickets and records the row; the
      // helper returns the authoritative registration id and amount.
      const { registrationId, amountPaid } = await submitRegistration({
        eventId: event.id,
        ticketTypeId: ticket?.id || null,
        fullName: name,
        email: email,
        phone: phone || null,
        quantity,
        amountPaid: totalAmount,
        paymentReference: paymentRef,
        userId: user?.id || null,
        customAnswers: Object.keys(customAnswers).length > 0 ? customAnswers : null,
      });

      setCompletedRegId(registrationId);
      setCompletedPaymentRef(paymentRef);

      // Cache ticket offline so any ticket view or refresh will immediately render it
      try {
        localStorage.setItem(`eventrally_ticket_${registrationId}`, JSON.stringify({
          registration: {
            id: registrationId,
            full_name: name,
            email: email,
            amount_paid: amountPaid,
            payment_reference: paymentRef,
            created_at: new Date().toISOString(),
            checked_in: false,
            custom_answers: customAnswers,
          },
          event,
          ticketTier: ticket,
        }));
      } catch (cErr) {
        console.warn("Offline ticket caching error:", cErr);
      }

      await sendConfirmationEmail(registrationId, paymentRef);

      toast.success("Registration Successful!");
      onSuccess();
      setIsCompleted(true);
    } catch (err: any) {
      console.error("Registration failure:", err);
      if (err instanceof RegistrationRejectedError) {
        toast.error(err.message);
      } else {
        toast.error(err?.message || "Failed to complete registration");
      }
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

    // Validate required custom questions
    for (const q of customQuestions) {
      if (q.required) {
        const val = customAnswers[q.id];
        if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
          const qText = (q.prompt || (q as any).label || (q as any).question || "Question").trim();
          toast.error(`Please answer required question: "${qText}"`);
          return;
        }
      }
    }

    setProcessing(true);

    if (isFree) {
      completeRegistration(null);
    } else {
      if (!gatewayPublicKey) {
        toast.error("Online payments are not configured yet. Please contact the event organiser.");
        setProcessing(false);
        return;
      }
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
      <div 
        onClick={(e) => { if (e.target === e.currentTarget) handleModalClose(); }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 font-sans animate-in fade-in duration-200"
      >
        <div className="bg-card border-t sm:border border-border rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] max-h-[85dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 text-foreground">
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mt-2.5 mb-0.5 sm:hidden shrink-0" />
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
            {/* Auto-Redirect Notice (Only if organizer explicitly enabled auto_redirect) */}
            {redirectCountdown !== null && redirectCountdown > 0 && (
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-center justify-between text-xs text-foreground animate-pulse">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                  <span>Redirecting to community in <strong>{redirectCountdown}s</strong>...</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRedirectCancelled(true);
                    setRedirectCountdown(null);
                  }}
                  className="text-[11px] font-bold text-muted-foreground hover:text-foreground underline"
                >
                  Stay Here
                </button>
              </div>
            )}

            {/* Online Event Hub & Direct Meeting Access Callout */}
            {isOnlineEvent && (onlineSettings?.whatsapp_group_link || onlineSettings?.meeting_link || onlineSettings?.access_instructions) && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    <Globe className="w-3.5 h-3.5" /> ONLINE EVENT ACCESS
                  </div>
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded font-bold">
                    CONFIRMED ATTENDEE
                  </span>
                </div>

                {onlineSettings.access_instructions && (
                  <div className="text-xs text-muted-foreground leading-relaxed bg-background/50 p-2.5 rounded-lg border border-border/50 flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <span><strong className="text-foreground">Access note:</strong> {onlineSettings.access_instructions}</span>
                  </div>
                )}

                <div className="space-y-2 pt-1">
                  {onlineSettings.whatsapp_group_link && (
                    <a
                      href={onlineSettings.whatsapp_group_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs h-10 rounded-lg shadow-sm transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Join WhatsApp Attendee Community</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                    </a>
                  )}

                  {onlineSettings.meeting_link && (
                    <a
                      href={onlineSettings.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground hover:opacity-90 font-bold text-xs h-10 rounded-lg shadow-sm transition-colors"
                    >
                      <Globe className="w-4 h-4" />
                      <span>Open Online Event Room</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                    </a>
                  )}
                </div>
              </div>
            )}

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
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 font-sans animate-in fade-in duration-200"
    >
      <div className="bg-card rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] max-h-[85dvh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 text-foreground border-t sm:border border-border">
        
        {/* Mobile drag handle bar */}
        <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mt-2.5 mb-0.5 sm:hidden shrink-0" />

        {/* Sticky Header with Permanent Cancel Button */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-border bg-card shrink-0 z-10">
          <div className="min-w-0 pr-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-heading font-extrabold text-lg sm:text-xl text-foreground truncate">Checkout</h2>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-secondary/15 text-secondary px-2 py-0.5 rounded shrink-0">
                {isFree ? "Free Pass" : "Ticket"}
              </span>
              {customQuestions.length > 0 && (
                <span className="text-[10px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
                  <HelpCircle className="w-3 h-3" /> {customQuestions.length} Question{customQuestions.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-xs truncate mt-0.5">{event.title}</p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors shrink-0 text-xs font-semibold border border-border/50"
            aria-label="Close checkout"
          >
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </button>
        </div>

        {/* Form Container with Flex-1 Scrollable Body and Pinned Footer */}
        <form onSubmit={handleCheckout} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6 sm:py-4 space-y-3.5 touch-pan-y pb-8">
            
            {/* Sleek Compact Ticket Summary Card */}
            <div className="bg-muted/40 p-3 sm:p-3.5 rounded-xl border border-border flex items-center justify-between text-xs">
              <div className="min-w-0 pr-2">
                <div className="font-bold text-foreground truncate">{ticket.name}</div>
                <div className="text-muted-foreground text-[11px] mt-0.5">
                  {quantity > 1 ? `${quantity}x @ ₦${breakdown.unitPrice.toLocaleString()}` : (isFree ? "Free Admission" : `₦${breakdown.unitPrice.toLocaleString()} per ticket`)}
                  {breakdown.discountAmount > 0 && <span className="text-secondary ml-1.5 font-semibold">({breakdown.discountPercentage}% off)</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-heading font-black text-base sm:text-lg text-secondary">
                  {isFree ? "Free" : `₦${breakdown.totalAmount.toLocaleString()}`}
                </div>
              </div>
            </div>

            {/* Message from Organizer / Event Instructions */}
            {meta.additionalInfo && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 sm:p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-heading font-bold text-primary">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>Message from Organizer</span>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {meta.additionalInfo}
                </p>
              </div>
            )}

            {/* Online Event Access Note */}
            {isOnlineEvent && onlineSettings?.access_instructions && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 sm:p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-heading font-bold text-emerald-600 dark:text-emerald-400">
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  <span>Virtual Attendance Note</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {onlineSettings.access_instructions}
                </p>
              </div>
            )}

            {/* Attendee Contact Info */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">Full Name *</Label>
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Your full name" 
                  className="bg-background focus-visible:ring-secondary border-border rounded-lg h-10 text-xs sm:text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">Email Address *</Label>
                <Input 
                  type="email"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="your.email@example.com" 
                  className="bg-background focus-visible:ring-secondary border-border rounded-lg h-10 text-xs sm:text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Phone Number</span>
                  <span className="text-muted-foreground/70 text-[10px] font-normal">For SMS gate pass</span>
                </Label>
                <Input 
                  type="tel"
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder="+234..." 
                  className="bg-background focus-visible:ring-secondary border-border rounded-lg h-10 text-xs sm:text-sm"
                />
              </div>

              {/* Ticket Quantity selector only if not free */}
              {!isFree && (
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-foreground">Quantity</Label>
                  <select 
                    value={quantity} 
                    onChange={(e) => setQuantity(parseInt(e.target.value))}
                    className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <option key={n} value={n}>{n} {n === 1 ? "ticket" : "tickets"}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Custom Questions Section with Prominently Rendered Question Prompts */}
            {customQuestions.length > 0 && (
              <div className="pt-3 border-t border-border space-y-3">
                <div className="flex items-center justify-between bg-muted/60 px-3 py-2 rounded-xl border border-border/80">
                  <div className="flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-secondary shrink-0" />
                    <span className="text-xs font-heading font-bold text-foreground">
                      Organizer Questions ({customQuestions.length})
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-secondary uppercase">
                    {customQuestions.some(q => q.required) ? "Required" : "Optional"}
                  </span>
                </div>

                {customQuestions.map((q, idx) => {
                  const questionText = (q.prompt || (q as any).label || (q as any).question || `Question ${idx + 1}`).trim();
                  return (
                    <div key={q.id} className="space-y-2 bg-muted/20 p-3 sm:p-3.5 rounded-xl border border-border/80 shadow-2xs">
                      <Label className="text-xs font-bold text-foreground flex items-start justify-between gap-2 leading-snug">
                        <span className="break-words font-heading">
                          <span className="text-muted-foreground font-mono mr-1.5 font-normal">#{idx + 1}</span>
                          {questionText}
                        </span>
                        {q.required ? (
                          <span className="text-destructive text-[10px] font-mono font-bold shrink-0 bg-destructive/10 px-1.5 py-0.5 rounded">* Required</span>
                        ) : (
                          <span className="text-muted-foreground/70 text-[10px] font-normal shrink-0">Optional</span>
                        )}
                      </Label>

                      {q.type === "text" && (
                        <Input
                          value={customAnswers[q.id] || ""}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          placeholder={q.placeholder || "Your answer"}
                          className="bg-background focus-visible:ring-secondary border-border rounded-lg h-10 text-xs sm:text-sm"
                          required={q.required}
                        />
                      )}

                      {q.type === "textarea" && (
                        <textarea
                          value={customAnswers[q.id] || ""}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          placeholder={q.placeholder || "Your answer..."}
                          rows={2}
                          className="w-full bg-background focus-visible:ring-2 focus-visible:ring-secondary border border-border rounded-lg p-2.5 text-xs sm:text-sm resize-none"
                          required={q.required}
                        />
                      )}

                      {(q.type === "dropdown" || (q.type as string) === "select") && (
                        <select
                          value={customAnswers[q.id] || ""}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                          required={q.required}
                        >
                          <option value="">Select an option...</option>
                          {q.options?.map((opt, oIdx) => (
                            <option key={oIdx} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}

                      {q.type === "radio" && (
                        <div className="space-y-1.5 pt-0.5">
                          {q.options?.map((opt, oIdx) => (
                            <label key={oIdx} className="flex items-center gap-2.5 p-2 rounded-lg border border-border/70 bg-background/60 hover:bg-muted/50 cursor-pointer text-xs font-medium transition-colors">
                              <input
                                type="radio"
                                name={`checkout-q-${q.id}`}
                                value={opt}
                                checked={customAnswers[q.id] === opt}
                                onChange={() => handleAnswerChange(q.id, opt)}
                                className="accent-secondary h-4 w-4 shrink-0"
                              />
                              <span className="text-foreground">{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {q.type === "checkbox" && (
                        <div className="space-y-1.5 pt-0.5">
                          {q.options?.map((opt, oIdx) => {
                            const selectedArr = Array.isArray(customAnswers[q.id]) ? customAnswers[q.id] : [];
                            const isChecked = selectedArr.includes(opt);
                            return (
                              <label key={oIdx} className="flex items-center gap-2.5 p-2 rounded-lg border border-border/70 bg-background/60 hover:bg-muted/50 cursor-pointer text-xs font-medium transition-colors">
                                <input
                                  type="checkbox"
                                  value={opt}
                                  checked={isChecked}
                                  onChange={(e) => handleCheckboxChange(q.id, opt, e.target.checked)}
                                  className="accent-secondary h-4 w-4 rounded shrink-0"
                                />
                                <span className="text-foreground">{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Trust and Policy Notes inside scrollable body */}
            <div className="pt-3 pb-1 space-y-2 border-t border-border/50 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-chart-green shrink-0" />
                <span>{isFree ? "Instant gate pass generated & sent to your email" : "Payments secured with 256-bit encryption"}</span>
              </div>
              <div className="text-[10px] leading-relaxed">
                By clicking {isFree ? "Confirm Free Registration" : "Pay"}, you agree to EventRally&apos;s{" "}
                <a href="/terms" target="_blank" rel="noreferrer" className="text-secondary font-semibold hover:underline">
                  Terms
                </a>
                ,{" "}
                <a href="/privacy" target="_blank" rel="noreferrer" className="text-secondary font-semibold hover:underline">
                  Privacy Policy
                </a>
                , and the{" "}
                <a href="/refund-policy" target="_blank" rel="noreferrer" className="text-secondary font-semibold hover:underline">
                  Refund Policy
                </a>
                .
              </div>
            </div>
          </div>

          {/* Sticky Pinned Footer with Visible Cancel and Action Buttons */}
          <div className="p-3 sm:p-4 border-t border-border bg-card shrink-0 flex items-center gap-2">
            <Button 
              type="button" 
              variant="outline"
              onClick={onClose}
              disabled={processing}
              className="h-11 px-4 text-xs font-bold border-border text-muted-foreground hover:text-foreground shrink-0"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={processing} 
              className="flex-1 bg-primary text-primary-foreground hover:opacity-90 h-11 rounded-xl font-heading font-bold text-sm shadow-md flex items-center justify-center gap-2"
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isFree ? <Mail className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                  <span>{isFree ? "Confirm Free Registration" : `Pay ₦${breakdown.totalAmount.toLocaleString()}`}</span>
                </>
              )}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
};
