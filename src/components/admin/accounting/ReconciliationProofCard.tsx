// src/components/admin/accounting/ReconciliationProofCard.tsx
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { ReconciliationInputs, calculateReconciliationProof } from "@/lib/accountingCalculations";

interface Props {
  inputs: ReconciliationInputs;
}

export const ReconciliationProofCard = ({ inputs }: Props) => {
  const proof = calculateReconciliationProof(inputs);

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        proof.isBalanced
          ? "bg-emerald-500/5 border-emerald-500/30 text-foreground"
          : "bg-amber-500/5 border-amber-500/40 text-foreground"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl ${
              proof.isBalanced
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
            }`}
          >
            {proof.isBalanced ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-heading font-black text-sm uppercase tracking-wide flex items-center gap-2">
              Automated Double-Entry Reconciliation Proof
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                  proof.isBalanced
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                }`}
              >
                {proof.isBalanced ? "✓ BALANCED" : "FLAGGED VARIANCE"}
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live mathematical ledger verification ensuring every Naira in the platform is accounted for.
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <div className="text-[11px] text-muted-foreground font-semibold">Variance Gap</div>
          <div
            className={`font-mono text-base font-bold ${
              proof.isBalanced ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
            }`}
          >
            ₦{proof.variance.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Mathematical Flow Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-3 text-xs">
        <div className="md:col-span-3 bg-card p-3 rounded-xl border border-border">
          <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
            Total Inflow (Gross In)
          </div>
          <div className="text-sm font-black font-mono text-foreground mt-0.5">
            ₦{inputs.totalGrossInflow.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Tickets + Wallet Top-ups</div>
        </div>

        <div className="md:col-span-1 flex justify-center text-muted-foreground font-black text-lg">
          =
        </div>

        <div className="md:col-span-8 bg-card p-3 rounded-xl border border-border">
          <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider mb-1">
            Allocated Funds (Liabilities + Settled + Profit + Fees + Telco)
          </div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 font-mono text-xs text-foreground">
            <span className="bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              <strong className="text-amber-600 dark:text-amber-400">
                ₦{inputs.totalLiabilities.toLocaleString("en-NG")}
              </strong>{" "}
              <span className="text-[10px] text-muted-foreground">(Liabilities)</span>
            </span>
            <span className="text-muted-foreground font-bold">+</span>
            <span className="bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
              <strong className="text-blue-600 dark:text-blue-400">
                ₦{inputs.settledPayouts.toLocaleString("en-NG")}
              </strong>{" "}
              <span className="text-[10px] text-muted-foreground">(Settled)</span>
            </span>
            <span className="text-muted-foreground font-bold">+</span>
            <span className="bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <strong className="text-emerald-600 dark:text-emerald-400">
                ₦{inputs.ownerNetProfit.toLocaleString("en-NG")}
              </strong>{" "}
              <span className="text-[10px] text-muted-foreground">(Owner Profit)</span>
            </span>
            <span className="text-muted-foreground font-bold">+</span>
            <span className="bg-muted px-2 py-0.5 rounded border border-border">
              <strong className="text-foreground">
                ₦{(inputs.gatewayFees + inputs.cogsWholesaleSms).toLocaleString("en-NG")}
              </strong>{" "}
              <span className="text-[10px] text-muted-foreground">(Fees & COGS)</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
