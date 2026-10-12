// src/components/admin/accounting/AccountingOverviewTab.tsx
import {
  Wallet,
  ShieldAlert,
  TrendingUp,
  CreditCard,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  CheckCircle2,
  PieChart,
} from "lucide-react";

interface Props {
  grossInflow: {
    totalGrossInflow: number;
    ticketsGross: number;
    walletTopupsGross: number;
  };
  liabilities: {
    ticketEscrowHeld: number;
    unspentWalletFloat: number;
    pendingPayoutQueue: number;
    settledPayouts: number;
    totalLiabilities: number;
  };
  ownerProfit: {
    ticketFeesCaptured: number;
    totalSmsDelivered: number;
    smsWholesaleCost: number;
    smsRetailBilled: number;
    smsNetProfit: number;
    ownerNetProfit: number;
  };
  gatewayFees: number;
  ordersCount: number;
  payoutsCount: number;
  organisersCount: number;
  activeWalletsCount: number;
}

export const AccountingOverviewTab = ({
  grossInflow,
  liabilities,
  ownerProfit,
  gatewayFees,
  ordersCount,
  payoutsCount,
  organisersCount,
  activeWalletsCount,
}: Props) => {
  return (
    <div className="space-y-6">
      {/* 4 Core Balance Sheet KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Gross Processed Volume (GMV) */}
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                Total Cash Inflow (GMV)
              </span>
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono tracking-tight text-foreground mt-2">
              ₦{grossInflow.totalGrossInflow.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="pt-3 border-t border-border/60 text-xs text-muted-foreground flex items-center justify-between mt-3 font-mono">
            <span>Tickets: ₦{grossInflow.ticketsGross.toLocaleString("en-NG")}</span>
            <span>SMS: ₦{grossInflow.walletTopupsGross.toLocaleString("en-NG")}</span>
          </div>
        </div>

        {/* 2. Platform Liabilities & Escrow */}
        <div className="bg-card p-5 rounded-2xl border border-amber-500/30 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Platform Liabilities (Owed)
              </span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono tracking-tight text-amber-600 dark:text-amber-400 mt-2">
              ₦{liabilities.totalLiabilities.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="pt-3 border-t border-border/60 text-xs text-muted-foreground flex items-center justify-between mt-3 font-mono">
            <span>Escrow: ₦{liabilities.ticketEscrowHeld.toLocaleString("en-NG")}</span>
            <span>Wallets: ₦{liabilities.unspentWalletFloat.toLocaleString("en-NG")}</span>
          </div>
        </div>

        {/* 3. Owner Net Revenue (Our Profit) */}
        <div className="bg-card p-5 rounded-2xl border border-emerald-500/30 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Owner Net Revenue (Our Profit)
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400 mt-2">
              ₦{ownerProfit.ownerNetProfit.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="pt-3 border-t border-border/60 text-xs text-muted-foreground flex items-center justify-between mt-3 font-mono">
            <span>Fees: ₦{ownerProfit.ticketFeesCaptured.toLocaleString("en-NG")}</span>
            <span>SMS Margin: ₦{ownerProfit.smsNetProfit.toLocaleString("en-NG")}</span>
          </div>
        </div>

        {/* 4. Settled Payouts to Organizers */}
        <div className="bg-card p-5 rounded-2xl border border-blue-500/30 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Settled Payouts Disbursed
              </span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono tracking-tight text-blue-600 dark:text-blue-400 mt-2">
              ₦{liabilities.settledPayouts.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="pt-3 border-t border-border/60 text-xs text-muted-foreground flex items-center justify-between mt-3 font-mono">
            <span>Pending Queue: ₦{liabilities.pendingPayoutQueue.toLocaleString("en-NG")}</span>
            <span>Completed: {payoutsCount}</span>
          </div>
        </div>
      </div>

      {/* Two-Column Detail: Cash Assets vs Obligations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Revenue & Stream Composition */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h3 className="font-heading font-black text-sm uppercase tracking-wide flex items-center gap-2">
              <PieChart className="w-4 h-4 text-primary" />
              Revenue Stream Breakdown
            </h3>
            <span className="text-xs font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
              Platform Take
            </span>
          </div>

          <div className="space-y-3 font-sans text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50">
              <div>
                <div className="font-bold text-foreground">Paid Ticket Commissions (2.5% avg)</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Captured across {ordersCount} processed customer orders
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-sm text-foreground">
                  ₦{ownerProfit.ticketFeesCaptured.toLocaleString("en-NG")}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">100% Margin</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50">
              <div>
                <div className="font-bold text-foreground">SMS & Messaging Retail Margin</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {ownerProfit.totalSmsDelivered.toLocaleString()} units delivered (Retail ₦10 - Wholesale ₦3.50)
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-sm text-foreground">
                  ₦{ownerProfit.smsNetProfit.toLocaleString("en-NG")}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">65% Gross Margin</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50">
              <div>
                <div className="font-bold text-foreground">Gateway Processing Costs (Paystack)</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Standard 1.5% + ₦100 per transaction
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-sm text-rose-600 dark:text-rose-400">
                  -₦{gatewayFees.toLocaleString("en-NG")}
                </div>
                <div className="text-[10px] text-muted-foreground">Gateway COGS</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Platform Liability Distribution */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h3 className="font-heading font-black text-sm uppercase tracking-wide flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              Custodial Liability Allocation
            </h3>
            <span className="text-xs font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded">
              Custodial Float
            </span>
          </div>

          <div className="space-y-3 font-sans text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50">
              <div>
                <div className="font-bold text-foreground">Organizer Ticket Escrow</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Net ticket revenue for live/completed events awaiting withdrawal
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400">
                  ₦{liabilities.ticketEscrowHeld.toLocaleString("en-NG")}
                </div>
                <div className="text-[10px] text-muted-foreground">{organisersCount} organizers</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50">
              <div>
                <div className="font-bold text-foreground">Unspent SMS Wallet Balances</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Prepaid credits in organizer wallets awaiting campaign dispatches
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400">
                  ₦{liabilities.unspentWalletFloat.toLocaleString("en-NG")}
                </div>
                <div className="text-[10px] text-muted-foreground">{activeWalletsCount} funded wallets</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50">
              <div>
                <div className="font-bold text-foreground">Pending Payout Queue</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Requested withdrawals awaiting admin review or Paystack transfer
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                  ₦{liabilities.pendingPayoutQueue.toLocaleString("en-NG")}
                </div>
                <div className="text-[10px] text-muted-foreground">Action required in Payouts</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
