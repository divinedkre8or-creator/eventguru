// src/components/admin/accounting/PayoutsVelocityTab.tsx
import { Building2, Clock, CheckCircle2, AlertCircle, ArrowUpRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { FinancialPayout } from "@/lib/accountingCalculations";

interface Props {
  settledPayoutsTotal: number;
  pendingPayoutsTotal: number;
  payouts: FinancialPayout[];
}

export const PayoutsVelocityTab = ({
  settledPayoutsTotal,
  pendingPayoutsTotal,
  payouts,
}: Props) => {
  const settledList = payouts.filter((p) => p.status === "paid");
  const pendingList = payouts.filter((p) => p.status === "pending" || p.status === "processing");
  const failedList = payouts.filter((p) => p.status === "failed" || p.status === "cancelled");

  const avgPayoutAmount =
    settledList.length > 0 ? settledPayoutsTotal / settledList.length : 0;

  return (
    <div className="space-y-6">
      {/* 4 Payout Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card p-5 rounded-2xl border border-blue-500/30 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-mono font-bold uppercase">
            <span>Settled Payouts</span>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black font-mono mt-2 text-blue-600 dark:text-blue-400">
            ₦{settledPayoutsTotal.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {settledList.length} completed bank transfers
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-amber-500/30 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-mono font-bold uppercase">
            <span>Pending Payout Queue</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono mt-2 text-amber-600 dark:text-amber-400">
            ₦{pendingPayoutsTotal.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {pendingList.length} requests awaiting release
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-mono font-bold uppercase">
            <span>Average Payout Size</span>
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black font-mono mt-2 text-foreground">
            ₦{avgPayoutAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Per settled organizer transfer
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-mono font-bold uppercase">
            <span>Settlement Action Desk</span>
            <ArrowUpRight className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-2">
            <Link
              to="/admin/transactions"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
            >
              Go to Payout Approval Desk &rarr;
            </Link>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Approve or reject bank payouts
          </div>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border/60 flex items-center justify-between">
          <div>
            <h3 className="font-heading font-black text-sm uppercase tracking-wide flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Recent Bank Payout Ledger & Transfers
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Historical record of organizer withdrawal requests and disbursement status.
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-muted px-2.5 py-1 rounded text-muted-foreground">
            {payouts.length} Total Requests
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground font-mono font-bold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Organizer</th>
                <th className="py-3 px-4">Bank Destination</th>
                <th className="py-3 px-4 text-right">Amount (₦)</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-sans">
              {payouts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No payout requests recorded.
                  </td>
                </tr>
              ) : (
                payouts.slice(0, 20).map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground font-mono">
                      {new Date(p.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 font-semibold text-foreground">
                      {p.organiser_name || `Organizer (${p.organiser_id?.slice(0, 8)})`}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {p.bank_name || "Commercial Bank"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                      ₦{Number(p.amount).toLocaleString("en-NG")}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          p.status === "paid"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : p.status === "pending" || p.status === "processing"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-rose-500/10 text-rose-600"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
