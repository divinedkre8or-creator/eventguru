import { useState } from "react";
import { X, Loader2, Mail, CreditCard, ShieldCheck } from "lucide-react";
import { usePaystackPayment } from "react-paystack";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

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

  // Use a dummy test key as requested if env var isn't set
  const PAYSTACK_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "pk_test_dummykey1234567890";
  const RESEND_KEY = import.meta.env.VITE_RESEND_API_KEY || "";

  const originalAmount = (ticket?.price || 0) * quantity;
  const totalAmount = discountPercentage > 0 
    ? originalAmount * (1 - discountPercentage / 100) 
    : originalAmount;
  const isFree = totalAmount === 0;

  const config = {
    reference: (new Date()).getTime().toString(),
    email: email,
    amount: totalAmount * 100, // Paystack expects kobo/cents
    publicKey: PAYSTACK_KEY,
    currency: 'NGN', 
  };

  const initializePayment = usePaystackPayment(config);

  const sendConfirmationEmail = async (registrationId: string) => {
    // If no Resend key, we mock the email service as requested by MVP flow
    if (!RESEND_KEY) {
      console.log(`[MAIL SERVICE MOCK] Ticket confirmation sent to ${email} for Registration ${registrationId}`);
      return;
    }

    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "tickets@eventstack.com",
          to: email,
          subject: `Your ticket for ${event.title}`,
          html: `<h1>You're going to ${event.title}!</h1><p>Hi ${name}, this is your ticket confirmation. Ticket Type: ${ticket.name} (x${quantity}).</p>`
        })
      });
    } catch (err) {
      console.error("Failed to send email via Resend", err);
    }
  };

  const completeRegistration = async (paymentRef: string | null = null) => {
    try {
      // 1. Insert into registrations
      const { data: reg, error: regError } = await supabase.from("registrations").insert({
        event_id: event.id,
        user_id: user?.id || null, // Guest checkout supported
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

      // 2. Decrement ticket inventory
      if (ticket?.id) {
        const { error: ticketError } = await supabase.rpc('increment_ticket_sold', {
          ticket_id: ticket.id,
          qty: quantity
        }).catch(async () => {
             // Fallback if RPC doesn't exist: manually fetch and update (Note: subject to race conditions)
             const { data: tData } = await supabase.from('ticket_types').select('sold, quantity').eq('id', ticket.id).single();
             if (tData) {
                await supabase.from('ticket_types').update({ sold: tData.sold + quantity }).eq('id', ticket.id);
             }
        });
        
        // Let's just do a manual update for safety since RPC might not exist
        const { data: tData } = await supabase.from('ticket_types').select('sold').eq('id', ticket.id).single();
        if (tData) {
          await supabase.from('ticket_types').update({ sold: tData.sold + quantity }).eq('id', ticket.id);
        }
      }

      // 3. Send email confirmation
      if (reg?.id) {
         await sendConfirmationEmail(reg.id);
      }

      toast.success("Registration Successful! Your ticket has been emailed to you.");
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to complete registration");
    } finally {
      setProcessing(false);
    }
  };

  // Paystack Callbacks
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-[DM_Sans]">
      <div className="bg-white rounded-[24px] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-6 border-b border-[rgba(10,13,18,0.07)]">
          <div>
            <h2 className="font-heading font-bold text-[20px] text-[var(--ink-hex)]">Checkout</h2>
            <p className="text-[#6B7280] text-[13px] mt-0.5">{event.title}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[rgba(10,13,18,0.05)] text-[#6B7280] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCheckout} className="p-6 space-y-5">
          <div className="bg-[#F9FAFB] p-4 rounded-[12px] border border-[rgba(10,13,18,0.07)]">
            <div className="flex justify-between items-center text-[13px] text-[#4B5563] mb-2">
              <span>{ticket.name} Ticket</span>
              <div className="flex items-center gap-2">
                {discountPercentage > 0 && ticket.price > 0 && (
                   <span className="line-through text-[11px] opacity-70">
                     NGN {ticket.price.toLocaleString()}
                   </span>
                )}
                <span>
                  {ticket.price === 0 ? "Free" : `NGN ${discountPercentage > 0 ? (ticket.price * (1 - discountPercentage / 100)).toLocaleString() : ticket.price.toLocaleString()}`}
                </span>
              </div>
            </div>
            {discountPercentage > 0 && (
               <div className="flex justify-between items-center text-[11px] font-bold text-[var(--amber-hex)] mb-2 mt-1 py-1 px-2 bg-[rgba(245,166,35,0.1)] rounded w-max">
                 {discountPercentage}% COUPON APPLIED
               </div>
            )}
            <div className="flex justify-between items-center border-t border-[rgba(10,13,18,0.05)] pt-2 mt-2">
              <span className="font-bold text-[14px] text-[var(--ink-hex)]">Total Amount</span>
              <span className="font-heading font-bold text-[18px] text-[var(--amber-hex)]">
                {isFree ? "Free" : `NGN ${totalAmount.toLocaleString()}`}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-bold text-[#4B5563]">Full Name *</Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="John Doe" 
                className="bg-white focus-visible:ring-[var(--amber-hex)] border-[rgba(10,13,18,0.1)] rounded-[10px]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px] font-bold text-[#4B5563]">Email Address *</Label>
              <Input 
                type="email"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="john@example.com" 
                className="bg-white focus-visible:ring-[var(--amber-hex)] border-[rgba(10,13,18,0.1)] rounded-[10px]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px] font-bold text-[#4B5563]">Phone Number <span className="text-xs text-muted-foreground font-normal">(Optional)</span></Label>
              <Input 
                type="tel"
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="+234..." 
                className="bg-white focus-visible:ring-[var(--amber-hex)] border-[rgba(10,13,18,0.1)] rounded-[10px]"
              />
            </div>

            {/* Ticket Quantity selector only if not free */}
            {!isFree && (
              <div className="space-y-1.5">
                 <Label className="text-[13px] font-bold text-[#4B5563]">Quantity</Label>
                 <select 
                   value={quantity} 
                   onChange={(e) => setQuantity(parseInt(e.target.value))}
                   className="flex h-10 w-full rounded-[10px] border border-[rgba(10,13,18,0.1)] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--amber-hex)]"
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
              className="w-full bg-[var(--ink-hex)] text-white hover:bg-[var(--ink-hex)]/90 h-[48px] rounded-[12px] font-heading font-bold text-[15px] shadow-lg flex items-center justify-center gap-2"
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
            
            <div className="mt-4 flex items-center justify-center gap-2 text-[#6B7280] text-[11px]">
               <ShieldCheck className="w-4 h-4 text-[var(--teal-hex)]" />
               <span>{isFree ? "Secure registration pipeline" : "Payments processing secured by Paystack"}</span>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
