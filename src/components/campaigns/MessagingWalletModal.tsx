import { useState } from "react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Wallet, ShieldCheck, Loader2, CreditCard, Sparkles, TrendingDown, Check 
} from "lucide-react";
import { toast } from "sonner";
import { usePaystackPayment } from "react-paystack";
import { supabase } from "@/integrations/supabase/client";
import { getActiveGatewayPublicKey } from "@/lib/platformSettings";
import { 
  calculateSmsOrderPrice, 
  SMS_PRICING_TIERS 
} from "@/lib/smsPricing";

interface MessagingWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  organiserId: string;
  userEmail: string;
  userName?: string;
  currentBalance: number;
  onSuccess: () => void;
  initialUnits?: number;
}

const QUICK_PRESETS = [50, 100, 250, 500, 1000];

export const MessagingWalletModal = ({
  isOpen,
  onClose,
  organiserId,
  userEmail,
  userName = "Event Organiser",
  currentBalance,
  onSuccess,
  initialUnits,
}: MessagingWalletModalProps) => {
  const [unitsInput, setUnitsInput] = useState<string>(
    initialUnits && initialUnits > 0 ? String(initialUnits) : "100"
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const parsedUnits = Math.max(0, parseInt(unitsInput, 10) || 0);
  const calculation = calculateSmsOrderPrice(parsedUnits);

  const totalPriceNgn = calculation.totalPriceNgn;
  const totalUnits = calculation.units;

  const publicKey = getActiveGatewayPublicKey();
  const activeEmail = (userEmail && userEmail.trim().length > 3 && userEmail.includes("@"))
    ? userEmail.trim()
    : "billing@eventrally.app";

  const paystackConfig = {
    reference: `SMS-WALLET-${organiserId.slice(0, 8)}-${Date.now()}`,
    email: activeEmail,
    amount: totalPriceNgn * 100, // amount in kobo
    publicKey: publicKey || import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "",
    currency: "NGN",
    metadata: {
      custom_fields: [
        { display_name: "Organiser ID", variable_name: "organiser_id", value: organiserId },
        { display_name: "SMS Units", variable_name: "sms_units", value: String(totalUnits) },
        { display_name: "Unit Rate (NGN)", variable_name: "unit_rate", value: String(calculation.unitRate) },
        { display_name: "Purpose", variable_name: "purpose", value: "SMS Messaging Wallet Top-up" },
      ],
    },
  };

  const initializePayment = usePaystackPayment(paystackConfig);

  const handlePaymentSuccess = async (response: { reference: string }) => {
    try {
      const ref = response?.reference || paystackConfig.reference;

      // Invoke server-side secure edge function to verify transaction and credit wallet
      const { data, error } = await supabase.functions.invoke("fund-wallet", {
        body: {
          paymentReference: ref,
        },
      });

      if (error || !data?.ok) {
        throw new Error(data?.error || error?.message || "Failed to confirm payment with server");
      }

      toast.success(
        `Wallet credited with ₦${(data.amountPaidNaira || totalPriceNgn).toLocaleString()} (${(data.unitsAdded || totalUnits).toLocaleString()} SMS Units)!`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Wallet credit error:", err);
      toast.error(err.message || "Payment received, but recording wallet transaction failed. Please contact support.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentClose = () => {
    setIsProcessing(false);
    toast.info("Wallet funding transaction was closed.");
  };

  const handlePaystackPayment = () => {
    if (totalUnits <= 0) {
      toast.error("Please enter a valid number of SMS units.");
      return;
    }

    if (!publicKey) {
      toast.error("Payment gateway is not yet configured. Please contact platform support.");
      return;
    }

    setIsProcessing(true);
    try {
      initializePayment({
        onSuccess: handlePaymentSuccess as any,
        onClose: handlePaymentClose,
      });
    } catch (err: any) {
      console.error("Paystack init error:", err);
      setIsProcessing(false);
      toast.error(err.message || "Failed to launch Paystack checkout.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl p-4 sm:p-6 bg-card border-border font-sans flex flex-col max-h-[85vh] max-h-[85dvh] overflow-hidden">
        <DialogHeader className="space-y-1 text-left shrink-0 pr-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <DialogTitle className="font-heading text-lg sm:text-xl font-bold text-foreground">
              SMS Messaging Wallet
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Top up on-demand SMS credits. Direct delivery to mobile phone lock screens with 98% open rates.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain pr-1 space-y-4 py-1">
          {/* Current Balance Overview */}
          <div className="bg-muted/40 border border-border rounded-xl p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">Current Balance</span>
              <div className="font-heading text-2xl font-black text-foreground">
                ₦{currentBalance.toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono font-bold text-secondary uppercase">Approx Capacity</span>
              <div className="text-xs font-bold text-foreground font-mono">
                ~{Math.floor(currentBalance / 10).toLocaleString()} SMS Units
              </div>
            </div>
          </div>

          {/* Transparent Volume Discount Reference Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold font-mono uppercase text-foreground">
                Volume Pricing Tiers
              </label>
              <span className="text-[10px] text-muted-foreground font-mono">
                Automatic bulk discounts applied
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {SMS_PRICING_TIERS.map((tier) => {
                const isActive = 
                  tier.rate === 8 ? parsedUnits > 500 :
                  tier.rate === 9 ? (parsedUnits > 100 && parsedUnits <= 500) :
                  (parsedUnits > 0 && parsedUnits <= 100);

                return (
                  <div
                    key={tier.rate}
                    className={`p-2.5 rounded-lg border text-center transition-all ${
                      isActive
                        ? "bg-primary/5 border-primary ring-1 ring-primary shadow-2xs"
                        : "bg-muted/20 border-border opacity-85"
                    }`}
                  >
                    <div className="font-heading text-base font-black text-foreground">
                      ₦{tier.rate} <span className="text-[10px] font-normal text-muted-foreground font-sans">/sms</span>
                    </div>
                    <div className="text-[10px] font-medium text-foreground mt-0.5">
                      {tier.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom SMS Input Section */}
          <div className="space-y-3 bg-muted/20 border border-border rounded-xl p-4">
            <label className="text-xs font-bold font-mono uppercase text-foreground block">
              Enter SMS Units to Purchase
            </label>

            <div className="space-y-2">
              <div className="relative">
                <Input
                  type="number"
                  min="1"
                  step="10"
                  placeholder="e.g. 150"
                  value={unitsInput}
                  onChange={(e) => setUnitsInput(e.target.value)}
                  className="h-12 text-lg font-mono font-bold bg-background border-border pl-4 pr-20"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-muted-foreground select-none">
                  SMS UNITS
                </span>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase mr-1">
                  Quick Select:
                </span>
                {QUICK_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setUnitsInput(String(p))}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold border transition-colors cursor-pointer ${
                      parsedUnits === p
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {p.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Calculation & Breakdown */}
            {parsedUnits > 0 && (
              <div className="pt-3 border-t border-border/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Applied Rate:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-foreground">
                      ₦{calculation.unitRate} / SMS
                    </span>
                    {calculation.discountBadge && (
                      <span className="text-[9px] font-mono font-bold bg-chart-green/10 text-chart-green px-1.5 py-0.5 rounded border border-chart-green/20">
                        {calculation.discountBadge}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground font-mono uppercase block">Total Price</span>
                    {calculation.savingsNgn > 0 && (
                      <span className="text-[11px] text-chart-green font-medium flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" /> Saved ₦{calculation.savingsNgn.toLocaleString()} with bulk pricing
                      </span>
                    )}
                  </div>
                  <div className="font-heading text-2xl font-black text-foreground">
                    ₦{totalPriceNgn.toLocaleString()}
                  </div>
                </div>

                {calculation.nextTierHint && (
                  <p className="text-[11px] text-secondary font-medium bg-secondary/10 border border-secondary/20 p-2 rounded-lg mt-1">
                    💡 {calculation.nextTierHint}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Security & Delivery Assurance */}
          <div className="bg-muted/20 border border-border/80 rounded-lg p-3 flex items-start gap-2.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-chart-green shrink-0 mt-0.5" />
            <span>
              Credits never expire. Uses Tier-1 telecom routes with automatic DND delivery & live status tracking.
            </span>
          </div>
        </div>

        {/* Pinned Action Footer */}
        <div className="shrink-0 flex items-center justify-between gap-3 pt-3 border-t border-border bg-card mt-auto">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
            className="text-xs font-bold border-border text-muted-foreground hover:text-foreground h-11 px-4"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handlePaystackPayment}
            disabled={isProcessing || totalPriceNgn <= 0}
            className="flex-1 sm:flex-initial bg-primary text-primary-foreground font-bold text-xs h-11 px-6 rounded-xl flex items-center justify-center gap-2 shadow-sm hover:opacity-90 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Launching Paystack...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" /> Fund ₦{totalPriceNgn.toLocaleString()} ({totalUnits.toLocaleString()} SMS)
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
