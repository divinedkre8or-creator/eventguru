// src/components/admin/sms/GrantCreditsModal.tsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Coins, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_RETAIL_SMS_PRICE_NGN, formatNaira } from "@/lib/smsCalculations";

interface GrantCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  organiser: {
    organiser_id: string;
    full_name: string;
    email: string;
    current_balance: number;
  } | null;
  onSuccess: () => void;
}

const PRESET_AMOUNTS = [1000, 2500, 5000, 10000];

export function GrantCreditsModal({
  isOpen,
  onClose,
  organiser,
  onSuccess,
}: GrantCreditsModalProps) {
  const [type, setType] = useState<"credit" | "debit">("credit");
  const [amountStr, setAmountStr] = useState<string>("1000");
  const [reason, setReason] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  if (!organiser) return null;

  const amount = Math.max(0, Number(amountStr) || 0);
  const units = Math.floor(amount / DEFAULT_RETAIL_SMS_PRICE_NGN);

  const projectedBalance =
    type === "credit"
      ? organiser.current_balance + amount
      : Math.max(0, organiser.current_balance - amount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      toast.error("Please enter an amount greater than 0");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please enter a reason for this audit ledger");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-sms-ops", {
        body: {
          action: "adjust_wallet_balance",
          organiserId: organiser.organiser_id,
          amount,
          type,
          reason: reason.trim(),
        },
      });

      if (error || !data?.ok) {
        throw new Error(data?.error || error?.message || "Failed to adjust wallet");
      }

      toast.success(
        `Successfully ${type === "credit" ? "credited" : "debited"} ${formatNaira(
          amount
        )} for ${organiser.full_name}`
      );
      onSuccess();
      onClose();
    } catch (err) {
      toast.error((err as Error).message || "Adjustment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle>Adjust Organiser SMS Balance</DialogTitle>
              <DialogDescription>
                Audited wallet balance adjustment for {organiser.full_name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Organiser Summary Card */}
          <div className="p-3.5 rounded-lg border bg-muted/40 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Organiser:</span>
              <span className="font-semibold text-foreground">{organiser.full_name} ({organiser.email})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current In-App Balance:</span>
              <span className="font-bold text-foreground">
                {formatNaira(organiser.current_balance)} (~{Math.floor(organiser.current_balance / DEFAULT_RETAIL_SMS_PRICE_NGN)} units)
              </span>
            </div>
            <div className="flex justify-between border-t pt-1 mt-1 font-medium">
              <span className="text-muted-foreground">Projected New Balance:</span>
              <span className={type === "credit" ? "text-emerald-500 font-bold" : "text-amber-500 font-bold"}>
                {formatNaira(projectedBalance)} (~{Math.floor(projectedBalance / DEFAULT_RETAIL_SMS_PRICE_NGN)} units)
              </span>
            </div>
          </div>

          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType("credit")}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-semibold transition-all ${
                type === "credit"
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted border-border"
              }`}
            >
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              <span>Credit (Gift / Grant)</span>
            </button>
            <button
              type="button"
              onClick={() => setType("debit")}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-semibold transition-all ${
                type === "debit"
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/30 font-bold"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted border-border"
              }`}
            >
              <ArrowDownRight className="w-4 h-4 text-amber-500" />
              <span>Debit (Correction)</span>
            </button>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Amount (NGN)</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-semibold">₦</span>
              <Input
                type="number"
                min="100"
                step="50"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="pl-8 text-sm font-semibold"
                placeholder="1000"
                required
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
              <span>Equivalent: ~{units.toLocaleString()} SMS messages (at ₦{DEFAULT_RETAIL_SMS_PRICE_NGN}/SMS)</span>
            </div>
            {/* Quick Presets */}
            <div className="flex gap-1.5 pt-1">
              {PRESET_AMOUNTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmountStr(String(p))}
                  className="px-2 py-0.5 rounded text-[11px] bg-muted hover:bg-muted/80 text-foreground border border-border"
                >
                  +{formatNaira(p)}
                </button>
              ))}
            </div>
          </div>

          {/* Audit Reason */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Audit Reason / Note (Required)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Promotional launch bonus, customer compensation, manual top-up adjustment"
              rows={2}
              className="text-xs resize-none"
              required
            />
            <p className="text-[10px] text-muted-foreground">
              This note is permanently recorded in the organizer&apos;s ledger with your admin identity.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || amount <= 0 || !reason.trim()}
              className={type === "credit" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-primary"}
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Applying...
                </>
              ) : (
                `Confirm ${type === "credit" ? "Credit" : "Debit"}`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
