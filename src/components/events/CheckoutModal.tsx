import { useState, useEffect } from "react";
import { 
  X, Loader2, Mail, CreditCard, ShieldCheck, CheckCircle2, 
  Image as ImageIcon, ArrowRight, Wallet, ExternalLink,
  Globe, MessageSquare, Info
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
import { sendTicketConfirmationEmail } from "@/lib/emailService";
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
      // 1. Direct Resend dispatch using configured Super Admin API key
      const isOnline = isOnlineEvent;
      const venueStr = isOnline
        ? "Online / Virtual Event"
        : [event.venue, event.city, event.country].filter(Boolean).join(", ") || "Venue TBA";
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
        eventUrl: window.location.origin + getEventUrl(event),
        dpUrl: window.location.origin + getEventDpUrl(event),
        isOnline,
        meetingLink: onlineSettings?.meeting_link,
        whatsappLink: onlineSettings?.whatsapp_group_link,
        accessInstructions: onlineSettings?.access_instructions,
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
          toast.error(`Please answer required question: "${q.label}"`);
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

            {/* Custom Questions Section */}
            {customQuestions.length > 0 && (
              <div className="pt-2 border-t border-border space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                    Additional Registration Details
                  </span>
                  <div className="h-px flex-1 bg-border/60" />
                </div>

                {customQuestions.map((q) => (
                  <div key={q.id} className="space-y-1.5">
                    <Label className="text-[13px] font-bold text-muted-foreground flex items-center justify-between">
                      <span>{q.label}</span>
                      {q.required ? (
                        <span className="text-destructive text-[11px] font-mono">* Required</span>
                      ) : (
                        <span className="text-muted-foreground/60 text-[10px] font-normal">Optional</span>
                      )}
                    </Label>

                    {q.type === "text" && (
                      <Input
                        value={customAnswers[q.id] || ""}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        placeholder="Your answer"
                        className="bg-background focus-visible:ring-secondary border-border rounded-lg"
                        required={q.required}
                      />
                    )}

                    {q.type === "textarea" && (
                      <textarea
                        value={customAnswers[q.id] || ""}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        placeholder="Your answer..."
                        rows={3}
                        className="w-full bg-background focus-visible:ring-2 focus-visible:ring-secondary border border-border rounded-lg p-2.5 text-sm resize-none"
                        required={q.required}
                      />
                    )}

                    {q.type === "select" && (
                      <select
                        value={customAnswers[q.id] || ""}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                        required={q.required}
                      >
                        <option value="">Select an option...</option>
                        {q.options?.map((opt, idx) => (
                          <option key={idx} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}

                    {q.type === "radio" && (
                      <div className="space-y-1.5 pt-0.5">
                        {q.options?.map((opt, idx) => (
                          <label key={idx} className="flex items-center gap-2.5 p-2 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 cursor-pointer text-xs font-medium">
                            <input
                              type="radio"
                              name={`checkout-q-${q.id}`}
                              value={opt}
                              checked={customAnswers[q.id] === opt}
                              onChange={() => handleAnswerChange(q.id, opt)}
                              className="accent-secondary h-4 w-4"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === "checkbox" && (
                      <div className="space-y-1.5 pt-0.5">
                        {q.options?.map((opt, idx) => {
                          const selectedArr = Array.isArray(customAnswers[q.id]) ? customAnswers[q.id] : [];
                          const isChecked = selectedArr.includes(opt);
                          return (
                            <label key={idx} className="flex items-center gap-2.5 p-2 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 cursor-pointer text-xs font-medium">
                              <input
                                type="checkbox"
                                value={opt}
                                checked={isChecked}
                                onChange={(e) => handleCheckboxChange(q.id, opt, e.target.checked)}
                                className="accent-secondary h-4 w-4 rounded"
                              />
                              <span>{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

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
