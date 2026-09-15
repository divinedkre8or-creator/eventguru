import { useState } from "react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Wallet, MessageSquare, Zap, ShieldCheck, CheckCircle2, 
  Loader2, CreditCard, Sparkles 
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getActiveGatewayPublicKey } from "@/lib/platformSettings";

const db = supabase as any;

interface MessagingWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  organiserId: string;
  userEmail: string;
  userName?: string;
  currentBalance: number;
  onSuccess: () => void;
}

interface SMSPack {
  id: string;
  name: string;
  units: number;
  priceNgn: number;
  unitPrice: number;
  popular?: boolean;
  description: string;
}

const SMS_PACKS: SMSPack[] = [
  {
    id: "pack_starter",
    name: "Starter Pulse",
    units: 250,
    priceNgn: 1750,
    unitPrice: 7.0,
    description: "Ideal for small workshops & meetups. Reach up to 250 attendees.",
  },
  {
    id: "pack_growth",
    name: "Growth Booster",
    units: 750,
    priceNgn: 4500,
    unitPrice: 6.0,
    popular: true,
    description: "Most popular for club nights, conferences & summits. 750 SMS units.",
  },
  {
    id: "pack_mega",
    name: "Mega Rally",
    units: 2500,
    priceNgn: 13500,
    unitPrice: 5.4,
    description: "Best volume rate for multi-day festivals & large auditoriums. 2,500 SMS.",
  },
];

export const MessagingWalletModal = ({
  isOpen,
  onClose,
  organiserId,
  userEmail,
  userName = "Event Organiser",
  currentBalance,
  onSuccess,
}: MessagingWalletModalProps) => {
  const [selectedPack, setSelectedPack] = useState<string>("pack_growth");
  const [customUnits, setCustomUnits] = useState<string>("");
  const [isCustom, setIsCustom] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const activePack = SMS_PACKS.find((p) => p.id === selectedPack);
  
  const calculatedCustomUnits = parseInt(customUnits, 10) || 0;
  const calculatedCustomPrice = Math.max(1000, Math.round(calculatedCustomUnits * 6.5));

  const totalUnits = isCustom ? calculatedCustomUnits : (activePack?.units || 0);
  const totalPriceNgn = isCustom ? calculatedCustomPrice : (activePack?.priceNgn || 0);

  const handlePaystackPayment = () => {
    if (totalUnits <= 0) {
      toast.error("Please select or enter a valid number of SMS units.");
      return;
    }

    const publicKey = getActiveGatewayPublicKey();
    if (!publicKey) {
      toast.error("Payment gateway is not yet configured. Please contact platform support.");
      return;
    }

    const paystack = (window as any).PaystackPop;
    if (!paystack) {
      toast.error("Payment provider script is loading. Please check your network and try again.");
      return;
    }

    setIsProcessing(true);
    const reference = `SMS-WALLET-${organiserId.slice(0, 8)}-${Date.now()}`;

    try {
      const handler = paystack.setup({
        key: publicKey,
        email: userEmail,
        amount: totalPriceNgn * 100, // amount in kobo
        currency: "NGN",
        ref: reference,
        metadata: {
          custom_fields: [
            { display_name: "Organiser ID", variable_name: "organiser_id", value: organiserId },
            { display_name: "SMS Units", variable_name: "sms_units", value: totalUnits },
            { display_name: "Purpose", variable_name: "purpose", value: "SMS Messaging Wallet Top-up" },
          ],
        },
        callback: async (response: { reference: string }) => {
          try {
            // 1. Fetch current wallet or initialize
            const { data: existingWallet } = await db
              .from("organiser_wallets")
              .select("sms_balance, plan")
              .eq("organiser_id", organiserId)
              .maybeSingle();

            const newBalance = (Number(existingWallet?.sms_balance) || 0) + totalPriceNgn;

            // 2. Upsert wallet balance
            const { error: walletErr } = await db
              .from("organiser_wallets")
              .upsert(
                {
                  organiser_id: organiserId,
                  sms_balance: newBalance,
                  plan: existingWallet?.plan || "free",
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "organiser_id" }
              );

            if (walletErr) throw walletErr;

            // 3. Record transaction ledger
            await db.from("wallet_transactions").insert({
              organiser_id: organiserId,
              type: "fund",
              amount: totalPriceNgn,
              balance_after: newBalance,
              reference: response.reference || reference,
              description: `Top-up: ${totalUnits.toLocaleString()} SMS Credits (₦${totalPriceNgn.toLocaleString()})`,
            });

            toast.success(`Wallet credited with ₦${totalPriceNgn.toLocaleString()} (${totalUnits.toLocaleString()} SMS Units)!`);
            onSuccess();
            onClose();
          } catch (err: any) {
            console.error("Wallet credit error:", err);
            toast.error("Payment received, but recording wallet transaction failed. Please contact support.");
          } finally {
            setIsProcessing(false);
          }
        },
        onClose: () => {
          setIsProcessing(false);
          toast.info("Wallet funding transaction was closed.");
        },
      });

      handler.openIframe();
    } catch (err: any) {
      console.error("Paystack init error:", err);
      setIsProcessing(false);
      toast.error(err.message || "Failed to launch Paystack checkout.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl p-6 bg-card border-border font-sans overflow-hidden">
        <DialogHeader className="space-y-1 text-left">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <DialogTitle className="font-heading text-xl font-bold text-foreground">
              SMS Messaging Wallet
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Prepay for high-delivery SMS broadcasts. Reach attendees directly on mobile phones with instant 98% open rates.
          </DialogDescription>
        </DialogHeader>

        {/* Current Balance Overview */}
        <div className="bg-muted/40 border border-border rounded-xl p-4 flex items-center justify-between mt-2">
          <div>
            <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">Current Balance</span>
            <div className="font-heading text-2xl font-black text-foreground">
              ₦{currentBalance.toLocaleString()}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono font-bold text-secondary uppercase">Approx Capacity</span>
            <div className="text-xs font-bold text-foreground font-mono">
              ~{Math.floor(currentBalance / 6.5).toLocaleString()} SMS Units
            </div>
          </div>
        </div>

        {/* Package Selector */}
        <div className="space-y-3 mt-4">
          <label className="text-xs font-bold font-mono uppercase text-foreground">
            Select SMS Credit Bundle
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SMS_PACKS.map((pack) => {
              const selected = !isCustom && selectedPack === pack.id;
              return (
                <div
                  key={pack.id}
                  onClick={() => {
                    setSelectedPack(pack.id);
                    setIsCustom(false);
                  }}
                  className={`relative p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selected
                      ? "bg-primary/5 border-primary ring-1 ring-primary shadow-xs"
                      : "bg-background border-border hover:bg-muted/40"
                  }`}
                >
                  {pack.popular && (
                    <span className="absolute -top-2.5 right-2 bg-secondary text-secondary-foreground text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" /> Popular
                    </span>
                  )}
                  <div className="text-xs font-bold text-foreground">{pack.name}</div>
                  <div className="font-heading text-lg font-black text-foreground mt-0.5">
                    ₦{pack.priceNgn.toLocaleString()}
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground mt-1">
                    {pack.units.toLocaleString()} SMS
                  </div>
                  <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                    ₦{pack.unitPrice}/sms
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Amount Option */}
          <div className="pt-2">
            <div
              onClick={() => setIsCustom(!isCustom)}
              className={`p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all flex items-center justify-between ${
                isCustom ? "bg-primary/5 border-primary" : "bg-background border-border hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isCustom}
                  onChange={() => setIsCustom(!isCustom)}
                  className="rounded border-border accent-primary"
                />
                <span className="font-bold text-foreground">Custom SMS Amount</span>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">₦6.50 / SMS</span>
            </div>

            {isCustom && (
              <div className="mt-2.5 p-3.5 bg-muted/30 border border-border rounded-xl space-y-2">
                <label className="text-[11px] font-mono text-muted-foreground font-bold uppercase">
                  Enter Number of SMS Units Needed
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="150"
                    step="50"
                    placeholder="e.g. 500"
                    value={customUnits}
                    onChange={(e) => setCustomUnits(e.target.value)}
                    className="h-10 text-xs font-mono bg-background border-border"
                  />
                  <div className="shrink-0 text-right">
                    <div className="text-[10px] font-mono text-muted-foreground">TOTAL PRICE</div>
                    <div className="font-heading text-base font-black text-foreground">
                      ₦{calculatedCustomPrice.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Security & Policy Assurance */}
        <div className="bg-muted/20 border border-border/80 rounded-lg p-3 flex items-start gap-2.5 text-[11px] text-muted-foreground mt-3">
          <ShieldCheck className="w-4 h-4 text-chart-green shrink-0 mt-0.5" />
          <span>
            Credits never expire. Uses Tier-1 telecom routes with automatic DND delivery & live status tracking.
          </span>
        </div>

        {/* Action Button */}
        <div className="mt-5 flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isProcessing}
            className="text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handlePaystackPayment}
            disabled={isProcessing || totalPriceNgn <= 0}
            className="bg-primary text-primary-foreground font-bold text-xs h-11 px-6 rounded-lg flex items-center gap-2 shadow-sm hover:opacity-90"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Launching Paystack...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" /> Fund ₦{totalPriceNgn.toLocaleString()} Now
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
