// src/pages/admin/Accounting.tsx
import { useState, useMemo } from "react";
import {
  Landmark,
  RefreshCw,
  Download,
  Calendar,
  Layers,
  Ticket,
  MessageSquare,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/seo/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  calculateGrossInflow,
  calculatePlatformLiabilities,
  calculateOwnerNetProfit,
  filterFinancialRecordsByDate,
  FinancialOrder,
  FinancialWallet,
  FinancialPayout,
  FinancialSmsCampaign,
  FinancialRefund,
  WHOLESALE_SMS_COGS_NGN,
} from "@/lib/accountingCalculations";
import { ReconciliationProofCard } from "@/components/admin/accounting/ReconciliationProofCard";
import { AccountingOverviewTab } from "@/components/admin/accounting/AccountingOverviewTab";
import { TicketEconomicsTab, EventEconomicRow } from "@/components/admin/accounting/TicketEconomicsTab";
import { MessagingEconomicsTab } from "@/components/admin/accounting/MessagingEconomicsTab";
import { PayoutsVelocityTab } from "@/components/admin/accounting/PayoutsVelocityTab";

type DateRangeOption = "all_time" | "this_month" | "30d" | "7d" | "today";
type AccountingTab = "overview" | "tickets" | "messaging" | "payouts";

export default function AdminAccounting() {
  const [activeTab, setActiveTab] = useState<AccountingTab>("overview");
  const [dateRange, setDateRange] = useState<DateRangeOption>("all_time");

  // Fetch all authoritative financial data in parallel
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["admin-accounting-treasury"],
    queryFn: async () => {
      // 1. Fetch Events & Profiles maps
      const [eventsRes, profilesRes] = await Promise.all([
        supabase.from("events").select("id, title, organiser_id"),
        supabase.from("profiles").select("user_id, full_name"),
      ]);

      const eventsMap = new Map((eventsRes.data || []).map((e) => [e.id, e.title]));
      const profilesMap = new Map((profilesRes.data || []).map((p) => [p.user_id, p.full_name || "Organizer"]));

      // 2. Fetch Orders (with fallback to registrations if empty)
      const { data: ordersData } = await (supabase.from as any)("orders")
        .select("*")
        .order("created_at", { ascending: false });

      let orders: FinancialOrder[] = [];

      if (ordersData && ordersData.length > 0) {
        orders = ordersData.map((o: any) => ({
          id: o.id,
          amount_paid: Number(o.amount_paid) || 0,
          subtotal: Number(o.subtotal) || Number(o.amount_paid) || 0,
          platform_fee: Number(o.platform_fee) || 0,
          gateway_fee: Number(o.gateway_fee) || 0,
          organiser_net: Number(o.organiser_net) || 0,
          payment_status: o.payment_status || "pending",
          created_at: o.created_at,
          event_title: eventsMap.get(o.event_id) || "Event",
          organiser_id: o.organiser_id,
        }));
      } else {
        // Fallback for legacy registration records
        const { data: regsData } = await supabase
          .from("registrations")
          .select("id, amount_paid, event_id, created_at, status")
          .order("created_at", { ascending: false });

        orders = (regsData || []).map((r) => {
          const amt = Number(r.amount_paid) || 0;
          const fee = Math.round(amt * 0.025);
          return {
            id: r.id,
            amount_paid: amt,
            subtotal: amt,
            platform_fee: fee,
            gateway_fee: 0,
            organiser_net: Math.max(0, amt - fee),
            payment_status: amt > 0 ? "paid" : "free",
            created_at: r.created_at,
            event_title: eventsMap.get(r.event_id) || "Event",
          };
        });
      }

      // 3. Fetch Wallets
      const { data: walletsData } = await (supabase.from as any)("organiser_wallets")
        .select("organiser_id, sms_balance");

      const wallets: FinancialWallet[] = (walletsData || []).map((w: any) => ({
        organiser_id: w.organiser_id,
        sms_balance: Number(w.sms_balance) || 0,
        full_name: profilesMap.get(w.organiser_id) || `Organizer (${w.organiser_id.slice(0, 8)})`,
      }));

      // 4. Fetch Wallet Transactions
      const { data: walletTxData } = await (supabase.from as any)("wallet_transactions")
        .select("id, organiser_id, type, amount, created_at");

      const walletTransactions = (walletTxData || []) as any[];

      // 5. Fetch Payout Requests
      const { data: payoutsData } = await (supabase.from as any)("payout_requests")
        .select("id, organiser_id, amount, status, bank_name, created_at")
        .order("created_at", { ascending: false });

      const payouts: FinancialPayout[] = (payoutsData || []).map((p: any) => ({
        id: p.id,
        organiser_id: p.organiser_id,
        organiser_name: profilesMap.get(p.organiser_id) || "Organizer Account",
        amount: Number(p.amount) || 0,
        status: p.status || "pending",
        bank_name: p.bank_name || "Commercial Bank",
        created_at: p.created_at,
      }));

      // 6. Fetch SMS Campaigns
      const { data: campaignsData } = await (supabase.from as any)("campaigns")
        .select("id, sent_count, channel, created_at")
        .eq("channel", "sms");

      const campaigns: FinancialSmsCampaign[] = (campaignsData || []).map((c: any) => ({
        id: c.id,
        sent_count: Number(c.sent_count) || 0,
        channel: "sms",
        created_at: c.created_at,
      }));

      // 7. Fetch Refund Records
      const { data: refundsData } = await (supabase.from as any)("refund_records")
        .select("id, amount, status, created_at");

      const refunds: FinancialRefund[] = (refundsData || []).map((r: any) => ({
        id: r.id,
        amount: Number(r.amount) || 0,
        status: r.status,
      }));

      return {
        orders,
        wallets,
        walletTransactions,
        payouts,
        campaigns,
        refunds,
        events: eventsRes.data || [],
        profilesMap,
      };
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // Filter records based on selected date range
  const filteredOrders = useMemo(() => {
    return filterFinancialRecordsByDate(data?.orders || [], dateRange);
  }, [data?.orders, dateRange]);

  const filteredWalletTxs = useMemo(() => {
    return filterFinancialRecordsByDate(data?.walletTransactions || [], dateRange);
  }, [data?.walletTransactions, dateRange]);

  const filteredPayouts = useMemo(() => {
    return filterFinancialRecordsByDate(data?.payouts || [], dateRange);
  }, [data?.payouts, dateRange]);

  const filteredCampaigns = useMemo(() => {
    return filterFinancialRecordsByDate(data?.campaigns || [], dateRange);
  }, [data?.campaigns, dateRange]);

  // Calculations
  const walletTopupsGross = useMemo(() => {
    return filteredWalletTxs
      .filter((tx) => tx.type === "fund")
      .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  }, [filteredWalletTxs]);

  const grossInflow = useMemo(() => {
    return calculateGrossInflow(filteredOrders, walletTopupsGross);
  }, [filteredOrders, walletTopupsGross]);

  const liabilities = useMemo(() => {
    return calculatePlatformLiabilities(
      filteredOrders,
      data?.wallets || [],
      filteredPayouts
    );
  }, [filteredOrders, data?.wallets, filteredPayouts]);

  const ownerProfit = useMemo(() => {
    return calculateOwnerNetProfit(
      filteredOrders,
      filteredCampaigns,
      data?.refunds || []
    );
  }, [filteredOrders, filteredCampaigns, data?.refunds]);

  const gatewayFees = useMemo(() => {
    return filteredOrders
      .filter((o) => o.payment_status === "paid")
      .reduce((sum, o) => sum + (Number(o.gateway_fee) || 0), 0);
  }, [filteredOrders]);

  // Top grossing events calculation
  const topEvents: EventEconomicRow[] = useMemo(() => {
    const events = data?.events || [];
    const profilesMap = data?.profilesMap || new Map();
    const paidOrders = filteredOrders.filter((o) => o.payment_status === "paid");

    return events
      .map((evt) => {
        const matchingOrders = paidOrders.filter((o) => o.id && (o as any).event_title === evt.title);
        const gross = matchingOrders.reduce((sum, o) => sum + o.subtotal, 0);
        const fee = matchingOrders.reduce((sum, o) => sum + o.platform_fee, 0);
        const net = matchingOrders.reduce((sum, o) => sum + o.organiser_net, 0);

        return {
          id: evt.id,
          title: evt.title,
          organiser_name: profilesMap.get(evt.organiser_id) || "Event Organizer",
          tickets_sold: matchingOrders.length,
          gross_revenue: gross,
          platform_fee: fee,
          organiser_net: net,
        };
      })
      .filter((e) => e.gross_revenue > 0)
      .sort((a, b) => b.gross_revenue - a.gross_revenue)
      .slice(0, 10);
  }, [data?.events, data?.profilesMap, filteredOrders]);

  // Export CSV
  const handleExportCSV = () => {
    try {
      const csvRows = [
        ["EventRally Authoritative Financial Treasury Snapshot"],
        ["Generated At", new Date().toISOString()],
        ["Date Filter", dateRange],
        [],
        ["=== 1. BALANCE SHEET OVERVIEW ==="],
        ["Metric", "Amount (NGN)"],
        ["Total Gross Inflow (GMV)", grossInflow.totalGrossInflow],
        ["Ticket Sales Gross", grossInflow.ticketsGross],
        ["Prepaid SMS Wallet Top-ups", grossInflow.walletTopupsGross],
        ["Organizer Ticket Escrow Liability", liabilities.ticketEscrowHeld],
        ["Unspent SMS Wallet Float Liability", liabilities.unspentWalletFloat],
        ["Pending Payout Queue", liabilities.pendingPayoutQueue],
        ["Total Platform Liabilities", liabilities.totalLiabilities],
        ["Settled Payouts Disbursed", liabilities.settledPayouts],
        ["Ticket Fees Captured (Owner)", ownerProfit.ticketFeesCaptured],
        ["SMS Net Profit Margin (Owner)", ownerProfit.smsNetProfit],
        ["Owner Total Net Profit", ownerProfit.ownerNetProfit],
        ["Gateway Processing Fees", gatewayFees],
        [],
        ["=== 2. TOP EVENTS BY REVENUE ==="],
        ["Event Title", "Organizer", "Tickets Sold", "Gross GMV (NGN)", "Platform Fee (NGN)", "Organizer Net (NGN)"],
        ...topEvents.map((e) => [
          e.title,
          e.organiser_name,
          e.tickets_sold,
          e.gross_revenue,
          e.platform_fee,
          e.organiser_net,
        ]),
      ];

      const csvContent =
        "data:text/csv;charset=utf-8," + csvRows.map((e) => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `eventrally_treasury_snapshot_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Authoritative Treasury CSV exported successfully!");
    } catch (err: any) {
      console.error("Export error:", err);
      toast.error("Failed to export treasury report");
    }
  };

  const paidOrdersCount = filteredOrders.filter((o) => o.payment_status === "paid").length;
  const freeOrdersCount = filteredOrders.filter((o) => o.payment_status === "free").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16">
      <SEOHead
        title="Accounting & Treasury | Super Admin"
        description="EventRally platform accounting command center, owner revenue margins, and double-entry reconciliation."
        noIndex={true}
      />

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded inline-flex items-center gap-1.5 mb-2">
            <Landmark className="w-3.5 h-3.5" />
            SUPER ADMIN TREASURY & ACCOUNTING
          </div>
          <h1 className="font-heading text-3xl font-black text-foreground tracking-tight">
            Platform Financial Treasury
          </h1>
          <p className="text-muted-foreground text-xs font-medium mt-1">
            Authoritative platform balance sheet, owner net revenue, custodial escrow liabilities, and double-entry reconciliation.
          </p>
        </div>

        {/* Date Filter & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border text-xs font-semibold">
            {(
              [
                ["all_time", "All Time"],
                ["this_month", "This Month"],
                ["30d", "Last 30D"],
                ["7d", "Last 7D"],
                ["today", "Today"],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setDateRange(val)}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  dateRange === val
                    ? "bg-card text-foreground font-bold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            className="text-xs font-bold h-9 border-border gap-1.5"
            disabled={isLoading || isRefetching}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading || isRefetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="border-border text-foreground font-bold text-xs h-9 px-3.5 rounded-xl hover:bg-muted flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
          <div className="font-bold text-sm text-foreground">Computing Platform Balance Sheet...</div>
          <div className="text-xs text-muted-foreground mt-1">
            Aggregating orders, organizer wallets, and payout requests
          </div>
        </div>
      ) : (
        <>
          {/* Automated Double-Entry Reconciliation Proof Banner */}
          <ReconciliationProofCard
            inputs={{
              totalGrossInflow: grossInflow.totalGrossInflow,
              totalLiabilities: liabilities.totalLiabilities,
              settledPayouts: liabilities.settledPayouts,
              ownerNetProfit: ownerProfit.ownerNetProfit,
              gatewayFees: gatewayFees,
              cogsWholesaleSms: ownerProfit.smsWholesaleCost,
              refunds: 0,
            }}
          />

          {/* Navigation Tabs */}
          <div className="flex border-b border-border gap-4 sm:gap-6 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab("overview")}
              className={`pb-3 text-xs font-mono font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "overview"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Overview & Balance Sheet
            </button>

            <button
              onClick={() => setActiveTab("tickets")}
              className={`pb-3 text-xs font-mono font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "tickets"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              Ticket Economics
            </button>

            <button
              onClick={() => setActiveTab("messaging")}
              className={`pb-3 text-xs font-mono font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "messaging"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Messaging & Telco Margins
            </button>

            <button
              onClick={() => setActiveTab("payouts")}
              className={`pb-3 text-xs font-mono font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "payouts"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Payouts & Velocity
            </button>
          </div>

          {/* Active Tab View */}
          {activeTab === "overview" && (
            <AccountingOverviewTab
              grossInflow={grossInflow}
              liabilities={liabilities}
              ownerProfit={ownerProfit}
              gatewayFees={gatewayFees}
              ordersCount={filteredOrders.length}
              payoutsCount={filteredPayouts.filter((p) => p.status === "paid").length}
              organisersCount={data?.wallets.length || 0}
              activeWalletsCount={
                (data?.wallets || []).filter((w) => w.sms_balance > 0).length
              }
            />
          )}

          {activeTab === "tickets" && (
            <TicketEconomicsTab
              totalPaidTickets={paidOrdersCount}
              totalFreeTickets={freeOrdersCount}
              grossTicketSales={grossInflow.ticketsGross}
              platformFeesCaptured={ownerProfit.ticketFeesCaptured}
              topEvents={topEvents}
            />
          )}

          {activeTab === "messaging" && (
            <MessagingEconomicsTab
              totalWalletFundedNgn={walletTopupsGross}
              totalSmsDelivered={ownerProfit.totalSmsDelivered}
              smsWholesaleCost={ownerProfit.smsWholesaleCost}
              smsRetailBilled={ownerProfit.smsRetailBilled}
              smsNetProfit={ownerProfit.smsNetProfit}
              unspentWalletFloat={liabilities.unspentWalletFloat}
              wallets={data?.wallets || []}
            />
          )}

          {activeTab === "payouts" && (
            <PayoutsVelocityTab
              settledPayoutsTotal={liabilities.settledPayouts}
              pendingPayoutsTotal={liabilities.pendingPayoutQueue}
              payouts={filteredPayouts}
            />
          )}
        </>
      )}
    </div>
  );
}
