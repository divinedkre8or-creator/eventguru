// src/components/admin/accounting/MessagingEconomicsTab.tsx
import { MessageSquare, Server, Wallet, TrendingUp, AlertCircle, Shield } from "lucide-react";
import { FinancialWallet, WHOLESALE_SMS_COGS_NGN, AVERAGE_RETAIL_SMS_PRICE_NGN } from "@/lib/accountingCalculations";

interface Props {
  totalWalletFundedNgn: number;
  totalSmsDelivered: number;
  smsWholesaleCost: number;
  smsRetailBilled: number;
  smsNetProfit: number;
  unspentWalletFloat: number;
  wallets: FinancialWallet[];
}

export const MessagingEconomicsTab = ({
  totalWalletFundedNgn,
  totalSmsDelivered,
  smsWholesaleCost,
  smsRetailBilled,
  smsNetProfit,
  unspentWalletFloat,
  wallets,
}: Props) => {
  const marginPercentage =
    smsRetailBilled > 0 ? Math.round((smsNetProfit / smsRetailBilled) * 100) : 65;

  const topLiabilityWallets = [...wallets]
    .filter((w) => Number(w.sms_balance) > 0)
    .sort((a, b) => Number(b.sms_balance) - Number(a.sms_balance))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* 4 SMS Economics KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-mono font-bold uppercase">
            <span>Total Funded Top-ups</span>
            <Wallet className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black font-mono mt-2 text-foreground">
            ₦{totalWalletFundedNgn.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Prepaid into SMS wallets
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-mono font-bold uppercase">
            <span>SMS Units Delivered</span>
            <MessageSquare className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black font-mono mt-2 text-foreground">
            {totalSmsDelivered.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Delivered carrier messages
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-mono font-bold uppercase">
            <span>Wholesale Carrier Cost (COGS)</span>
            <Server className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono mt-2 text-amber-600 dark:text-amber-400">
            ₦{smsWholesaleCost.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Textflow/Telco base cost (~₦{WHOLESALE_SMS_COGS_NGN}/SMS)
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-emerald-500/30 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-mono font-bold uppercase">
            <span>Net Messaging Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono mt-2 text-emerald-600 dark:text-emerald-400">
            ₦{smsNetProfit.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1">
            {marginPercentage}% Net Margin retained
          </div>
        </div>
      </div>

      {/* Two Columns: Margins Breakdown vs Organizer Wallet Liability Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Unit Margins Explainer */}
        <div className="lg:col-span-5 bg-card rounded-2xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h3 className="font-heading font-black text-sm uppercase tracking-wide flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Messaging Pricing & Unit Margins
            </h3>
            <span className="text-xs font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
              High Margin
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Organizers top up their wallets in advance before sending broadcast reminders. We charge <strong>₦{AVERAGE_RETAIL_SMS_PRICE_NGN}.00</strong> on standard orders and <strong>₦8.00–₦9.00</strong> on bulk orders, against a wholesale base cost of <strong>₦{WHOLESALE_SMS_COGS_NGN}0</strong>.
          </p>

          <div className="space-y-2.5 font-mono text-xs">
            <div className="flex justify-between items-center p-2.5 rounded-lg bg-muted/40">
              <span className="text-muted-foreground">Standard Retail Rate:</span>
              <span className="font-bold text-foreground">₦10.00 / SMS</span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded-lg bg-muted/40">
              <span className="text-muted-foreground">Wholesale Carrier Cost:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">~₦3.50 / SMS</span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Profit Captured per SMS:</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400">+₦6.50 / SMS (65%)</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong>Current Unspent Liability:</strong> ₦{unspentWalletFloat.toLocaleString("en-NG")} in credits is currently in organizer wallets. This is held safely until they send campaigns.
            </div>
          </div>
        </div>

        {/* Top Unspent Wallet Balances */}
        <div className="lg:col-span-7 bg-card rounded-2xl border border-border overflow-hidden shadow-sm flex flex-col justify-between">
          <div>
            <div className="p-5 border-b border-border/60 flex items-center justify-between">
              <div>
                <h3 className="font-heading font-black text-sm uppercase tracking-wide flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-amber-500" />
                  Top Unspent Wallet Float Liabilities
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Organizers with active funded credits currently held in platform custody.
                </p>
              </div>
              <span className="text-xs font-mono font-bold bg-muted px-2.5 py-1 rounded text-muted-foreground">
                {topLiabilityWallets.length} Accounts
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground font-mono font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Organizer</th>
                    <th className="py-3 px-4 text-right">Credits Balance (₦)</th>
                    <th className="py-3 px-4 text-right">Est. SMS Units</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-sans">
                  {topLiabilityWallets.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground">
                        No active wallet liabilities found.
                      </td>
                    </tr>
                  ) : (
                    topLiabilityWallets.map((w) => {
                      const bal = Number(w.sms_balance) || 0;
                      const estUnits = Math.floor(bal / AVERAGE_RETAIL_SMS_PRICE_NGN);
                      return (
                        <tr key={w.organiser_id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-semibold text-foreground">
                            {w.full_name || `Organizer (${w.organiser_id.slice(0, 8)})`}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                            ₦{bal.toLocaleString("en-NG")}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-foreground">
                            ~{estUnits.toLocaleString()} units
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                              Custodial Float
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
