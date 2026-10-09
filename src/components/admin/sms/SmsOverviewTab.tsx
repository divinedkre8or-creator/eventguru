// src/components/admin/sms/SmsOverviewTab.tsx
import {
  ExternalLink,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Server,
  Zap,
  Coins,
  Send,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatNaira,
  calculateRemainingUnits,
  calculateSolvencyRatio,
  getCentralBalanceHealth,
  estimateDeliveryRate,
  DEFAULT_WHOLESALE_SMS_PRICE_NGN,
  DEFAULT_RETAIL_SMS_PRICE_NGN,
} from "@/lib/smsCalculations";

export interface ProviderStatus {
  ok: boolean;
  configured: boolean;
  balance: number;
  currency: string;
  senderId: string;
  accountName: string;
  message?: string;
  error?: string;
}

interface SmsOverviewTabProps {
  provider: ProviderStatus | null;
  loadingProvider: boolean;
  onRefreshProvider: () => void;
  totalOrganiserLiabilities: number;
  totalSmsSoldNgn: number;
  totalSmsSent: number;
  totalSmsFailed: number;
  onNavigateToTools: () => void;
}

export function SmsOverviewTab({
  provider,
  loadingProvider,
  onRefreshProvider,
  totalOrganiserLiabilities,
  totalSmsSoldNgn,
  totalSmsSent,
  totalSmsFailed,
  onNavigateToTools,
}: SmsOverviewTabProps) {
  const centralBalance = provider?.balance ?? 0;
  const health = getCentralBalanceHealth(centralBalance);
  const remainingUnits = calculateRemainingUnits(centralBalance, DEFAULT_WHOLESALE_SMS_PRICE_NGN);
  const solvencyRatio = calculateSolvencyRatio(centralBalance, totalOrganiserLiabilities);
  const deliveryRate = estimateDeliveryRate(totalSmsSent, totalSmsFailed);

  // Financial margin estimation
  const wholesaleCostIncurred = totalSmsSent * DEFAULT_WHOLESALE_SMS_PRICE_NGN;
  const retailRevenueGenerated = totalSmsSent * DEFAULT_RETAIL_SMS_PRICE_NGN;
  const estimatedGrossMargin = Math.max(0, retailRevenueGenerated - wholesaleCostIncurred);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Provider Health Warning Banner (if critical or warning) */}
      {health.status !== "healthy" && (
        <div
          className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border ${
            health.status === "critical"
              ? "bg-red-500/10 border-red-500/30 text-red-500"
              : "bg-amber-500/10 border-amber-500/30 text-amber-500"
          }`}
        >
          <div className="flex gap-2.5 sm:gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm">{health.badgeText}</div>
              <p className="text-xs text-foreground/80 mt-0.5">
                {health.recommendation} Current balance is {formatNaira(centralBalance)} (~{remainingUnits} SMS units remaining).
              </p>
            </div>
          </div>
          <a
            href="https://textflow.ng/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-background text-foreground shadow-xs border border-border hover:bg-muted shrink-0 transition-colors"
          >
            <span>Recharge on Textflow</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Main Central Balance & Solvency Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Card 1: Central Textflow Balance */}
        <div className="lg:col-span-2 p-4 sm:p-6 rounded-xl sm:rounded-2xl border bg-card/60 backdrop-blur-xs shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 sm:p-2 rounded-lg bg-primary/10 text-primary">
                  <Server className="w-4 h-4" />
                </span>
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Central Upstream Gateway (Textflow.ng)
                </span>
              </div>
              <div className="flex flex-wrap items-baseline gap-2 sm:gap-3 pt-1 sm:pt-2">
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
                  {loadingProvider ? (
                    <span className="inline-flex items-center gap-2 text-muted-foreground text-lg sm:text-xl">
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> Fetching...
                    </span>
                  ) : (
                    formatNaira(centralBalance, true)
                  )}
                </span>
                <Badge variant="outline" className={`text-[11px] sm:text-xs font-bold ${health.color}`}>
                  {health.badgeText}
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                Account: <span className="font-semibold text-foreground">{provider?.accountName || "EventRally"}</span> • Active Sender ID: <span className="font-mono font-bold text-foreground">"{provider?.senderId || "Textflow"}"</span>
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto pt-1 sm:pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefreshProvider}
                disabled={loadingProvider}
                className="h-8 text-xs gap-1.5 flex-1 sm:flex-initial"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingProvider ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </Button>
              <a
                href="https://textflow.ng/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial"
              >
                <Button size="sm" className="h-8 text-xs gap-1.5 w-full">
                  <span>Recharge</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </a>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-border grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <div className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">Estimated Dispatch Capacity</div>
              <div className="text-base sm:text-lg font-bold text-foreground font-mono">
                ~{remainingUnits.toLocaleString()} <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">SMS units</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">Wholesale Rate</div>
              <div className="text-base sm:text-lg font-bold text-foreground font-mono">
                {formatNaira(DEFAULT_WHOLESALE_SMS_PRICE_NGN, true)} <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">/ unit</span>
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <div className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">Gateway Latency</div>
              <div className="text-base sm:text-lg font-bold text-emerald-500 font-mono flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Normal
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Solvency & Liabilities Meter */}
        <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl border bg-card/60 backdrop-blur-xs shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 sm:p-2 rounded-lg bg-amber-500/10 text-amber-500">
                  <Coins className="w-4 h-4" />
                </span>
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Solvency & Liabilities
                </span>
              </div>
              <Badge
                variant="outline"
                className={
                  solvencyRatio >= 100
                    ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10 text-[10px] sm:text-xs font-bold"
                    : "text-amber-500 border-amber-500/30 bg-amber-500/10 text-[10px] sm:text-xs font-bold"
                }
              >
                {solvencyRatio >= 100 ? "Fully Backed" : "Under-Backed"}
              </Badge>
            </div>

            <div className="mt-3 sm:mt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-extrabold text-foreground font-mono">
                  {solvencyRatio}%
                </span>
                <span className="text-xs text-muted-foreground">Coverage Ratio</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-muted rounded-full h-2 mt-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    solvencyRatio >= 100 ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                  style={{ width: `${Math.min(100, solvencyRatio)}%` }}
                />
              </div>
            </div>

            <div className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Organiser Held:</span>
                <span className="font-bold text-foreground font-mono">{formatNaira(totalOrganiserLiabilities)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Upstream Cash:</span>
                <span className="font-bold text-foreground font-mono">{formatNaira(centralBalance)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Buffer / Deficit:</span>
                <span
                  className={`font-bold font-mono ${
                    centralBalance >= totalOrganiserLiabilities
                      ? "text-emerald-500"
                      : "text-amber-500"
                  }`}
                >
                  {centralBalance >= totalOrganiserLiabilities ? "+" : "-"}
                  {formatNaira(Math.abs(centralBalance - totalOrganiserLiabilities))}
                </span>
              </div>
            </div>
          </div>

          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-3 sm:mt-4 leading-relaxed">
            Maintains the financial health between user wallet credits and central telecom gateway deposits.
          </p>
        </div>
      </div>

      {/* 4 Financial & Operational KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* KPI 1 */}
        <div className="p-3 sm:p-4 rounded-xl border bg-card/60 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] sm:text-xs font-semibold">
            <span>In-App Top-ups</span>
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
          </div>
          <div className="text-lg sm:text-2xl font-extrabold text-foreground mt-1.5 font-mono truncate">
            {formatNaira(totalSmsSoldNgn)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
            Paystack top-ups
          </p>
        </div>

        {/* KPI 2 */}
        <div className="p-3 sm:p-4 rounded-xl border bg-card/60 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] sm:text-xs font-semibold">
            <span>Dispatched</span>
            <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
          </div>
          <div className="text-lg sm:text-2xl font-extrabold text-foreground mt-1.5 font-mono truncate">
            {totalSmsSent.toLocaleString()}
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
            Tickets &amp; broadcasts
          </p>
        </div>

        {/* KPI 3 */}
        <div className="p-3 sm:p-4 rounded-xl border bg-card/60 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] sm:text-xs font-semibold">
            <span>Gross Margin</span>
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
          </div>
          <div className="text-lg sm:text-2xl font-extrabold text-foreground mt-1.5 font-mono truncate">
            {formatNaira(estimatedGrossMargin)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
            Retail vs wholesale spread
          </p>
        </div>

        {/* KPI 4 */}
        <div className="p-3 sm:p-4 rounded-xl border bg-card/60 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] sm:text-xs font-semibold">
            <span>Delivery Rate</span>
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
          </div>
          <div className="text-lg sm:text-2xl font-extrabold text-foreground mt-1.5 font-mono truncate">
            {deliveryRate}%
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
            {totalSmsFailed > 0 ? `${totalSmsFailed} failed` : "Zero failures"}
          </p>
        </div>
      </div>

      {/* Quick Launchpad to Tools */}
      <div className="p-3.5 sm:p-4 rounded-xl border bg-muted/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="text-xs">
          <span className="font-bold text-foreground">Need to test gateway delivery or send an announcement?</span>
          <p className="text-muted-foreground mt-0.5">
            Use the built-in diagnostic test SMS tool to verify telecom interconnects or broadcast platform updates.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onNavigateToTools} className="w-full sm:w-auto shrink-0 text-xs h-9">
          Open Diagnostic &amp; Broadcast Tools
        </Button>
      </div>
    </div>
  );
}
