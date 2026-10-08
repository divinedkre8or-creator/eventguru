import { useState, useEffect } from "react";
import { 
  CreditCard, Search, Download, CheckCircle2, Loader2, ArrowDownRight, 
  Building2, ShieldCheck, RefreshCw, Check, X, AlertCircle, FileText
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OrderRow {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  quantity: number;
  subtotal: number;
  platform_fee: number;
  gateway_fee: number;
  organiser_net: number;
  payment_reference: string;
  gateway_transaction_id?: string;
  created_at: string;
  event_title: string;
  payment_status: string;
  order_status: string;
}

interface AdminPayoutRow {
  id: string;
  organiser_id: string;
  organiser_name?: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: "pending" | "processing" | "paid" | "failed" | "cancelled";
  reference?: string;
  admin_notes?: string;
  created_at: string;
}

const AdminTransactions = () => {
  const [activeTab, setActiveTab] = useState<"orders" | "payouts">("orders");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [payouts, setPayouts] = useState<AdminPayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Payout action modal / dialog state
  const [processingPayoutId, setProcessingPayoutId] = useState<string | null>(null);
  const [settlementRef, setSettlementRef] = useState("");

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Events map
      const { data: events } = await supabase.from("events").select("id, title");
      const eventMap = new Map((events || []).map((e) => [e.id, e.title]));

      // 2. Fetch Profiles map
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name");
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name || "Organizer"]));

      // 3. Fetch Orders
      const { data: ordersData, error: ordersErr } = await (supabase.from as any)("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (ordersData && ordersData.length > 0) {
        const orderRows: OrderRow[] = ordersData.map((o: any) => ({
          id: o.id,
          customer_name: o.customer_name,
          customer_email: o.customer_email,
          customer_phone: o.customer_phone || "N/A",
          quantity: o.quantity || 1,
          subtotal: Number(o.subtotal) || Number(o.amount_paid) || 0,
          platform_fee: Number(o.platform_fee) || 0,
          gateway_fee: Number(o.gateway_fee) || 0,
          organiser_net: Number(o.organiser_net) || 0,
          payment_reference: o.payment_reference || "N/A",
          gateway_transaction_id: o.gateway_transaction_id,
          created_at: new Date(o.created_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          event_title: eventMap.get(o.event_id) || "Event",
          payment_status: o.payment_status || "pending",
          order_status: o.order_status || "pending",
        }));
        setOrders(orderRows);
      } else {
        // Fallback to registrations table if orders table is currently empty
        const { data: regs } = await supabase
          .from("registrations")
          .select("id, full_name, email, phone, amount_paid, payment_reference, created_at, event_id, status")
          .order("created_at", { ascending: false });

        const legacyRows: OrderRow[] = (regs || []).map((r) => {
          const amt = Number(r.amount_paid) || 0;
          const fee = Math.round(amt * 0.025);
          return {
            id: r.id,
            customer_name: r.full_name,
            customer_email: r.email,
            customer_phone: r.phone || "N/A",
            quantity: 1,
            subtotal: amt,
            platform_fee: fee,
            gateway_fee: 0,
            organiser_net: Math.max(0, amt - fee),
            payment_reference: r.payment_reference || "Free Registration",
            created_at: new Date(r.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            event_title: eventMap.get(r.event_id) || "Event",
            payment_status: amt > 0 ? "paid" : "free",
            order_status: "completed",
          };
        });
        setOrders(legacyRows);
      }

      // 4. Fetch Payout Requests
      const { data: payoutsData } = await (supabase.from as any)("payout_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (payoutsData) {
        const formattedPayouts: AdminPayoutRow[] = payoutsData.map((p: any) => ({
          id: p.id,
          organiser_id: p.organiser_id,
          organiser_name: profileMap.get(p.organiser_id) || "Organizer Account",
          amount: Number(p.amount) || 0,
          bank_name: p.bank_name,
          account_number: p.account_number,
          account_name: p.account_name,
          status: p.status,
          reference: p.reference,
          admin_notes: p.admin_notes,
          created_at: new Date(p.created_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
        }));
        setPayouts(formattedPayouts);
      }
    } catch (err) {
      console.error("Failed to load admin transactions:", err);
      toast.error("Error loading financial ledger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleSettlePayout = async (payoutId: string, markStatus: "paid" | "cancelled") => {
    try {
      const updatePayload: Record<string, any> = {
        status: markStatus,
        processed_at: new Date().toISOString(),
      };
      if (settlementRef.trim()) {
        updatePayload.reference = settlementRef.trim();
      }

      const { error } = await (supabase.from as any)("payout_requests")
        .update(updatePayload)
        .eq("id", payoutId);

      if (error) throw error;

      // Log to audit log
      await (supabase.from as any)("financial_audit_logs").insert({
        entity_type: "payout",
        entity_id: payoutId,
        action: markStatus === "paid" ? "PAYOUT_COMPLETED" : "PAYOUT_CANCELLED",
        actor_type: "admin",
        reference: settlementRef.trim() || undefined,
        metadata: { payoutId, status: markStatus },
      });

      toast.success(`Payout marked as ${markStatus.toUpperCase()}`);
      setProcessingPayoutId(null);
      setSettlementRef("");
      await fetchAdminData();
    } catch (err: any) {
      console.error("Payout settlement error:", err);
      toast.error(err.message || "Failed to update payout status");
    }
  };

  const filteredOrders = orders.filter((tx) => {
    const matchSearch =
      tx.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      tx.customer_email.toLowerCase().includes(search.toLowerCase()) ||
      tx.payment_reference.toLowerCase().includes(search.toLowerCase()) ||
      tx.event_title.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "paid" && tx.payment_status === "paid") ||
      (statusFilter === "free" && tx.payment_status === "free");

    return matchSearch && matchStatus;
  });

  const totalVolume = filteredOrders.reduce((sum, t) => sum + t.subtotal, 0);
  const totalPlatformFees = filteredOrders.reduce((sum, t) => sum + t.platform_fee, 0);
  const totalOrganiserNet = filteredOrders.reduce((sum, t) => sum + t.organiser_net, 0);

  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      toast.error("No transactions to export");
      return;
    }

    const csvRows = [
      ["Date", "Customer Name", "Email", "Event", "Tickets Qty", "Gross (NGN)", "Platform Fee (NGN)", "Organizer Net (NGN)", "Reference", "Status"],
      ...filteredOrders.map((t) => [
        t.created_at,
        t.customer_name,
        t.customer_email,
        t.event_title,
        t.quantity,
        t.subtotal,
        t.platform_fee,
        t.organiser_net,
        t.payment_reference,
        t.payment_status,
      ]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `platform_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Authoritative ledger CSV downloaded!");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded inline-block mb-2 font-bold">
            SUPER ADMIN FINANCIAL CENTER
          </div>
          <h1 className="font-heading text-3xl font-black text-foreground tracking-tight">Platform Financial Ledger</h1>
          <p className="text-muted-foreground text-xs font-medium mt-1">
            Authoritative order snapshots, platform commission splits, and bank payout reconciliation desk.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={fetchAdminData}
            variant="outline"
            size="sm"
            className="text-xs font-bold h-9 border-border gap-1.5"
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>

          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="border-border text-foreground font-bold text-xs h-9 px-4 rounded-lg hover:bg-muted flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-6">
        <button
          onClick={() => setActiveTab("orders")}
          className={`pb-3 text-xs font-mono font-bold uppercase tracking-wider transition-all border-b-2 ${
            activeTab === "orders"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Orders & Transactions ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab("payouts")}
          className={`pb-3 text-xs font-mono font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "payouts"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Payout Requests & Settlements ({payouts.filter((p) => p.status === "pending").length} Pending)
        </button>
      </div>

      {activeTab === "orders" ? (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-mono font-bold uppercase text-muted-foreground">Total Filtered Gross</span>
              <div className="text-2xl font-black font-heading text-foreground mt-1">₦{totalVolume.toLocaleString()}</div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-mono font-bold uppercase text-muted-foreground">Platform Fees Earned (2.5%)</span>
              <div className="text-2xl font-black font-heading text-primary mt-1">₦{totalPlatformFees.toLocaleString()}</div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-mono font-bold uppercase text-muted-foreground">Organizer Net Allocated</span>
              <div className="text-2xl font-black font-heading text-chart-green mt-1">₦{totalOrganiserNet.toLocaleString()}</div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by buyer, event, or ref..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-card border-border text-xs h-9 rounded-lg"
              />
            </div>

            <div className="flex gap-1.5 self-start sm:self-auto">
              {["all", "paid", "free"].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setStatusFilter(tf)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold capitalize border transition-all ${
                    statusFilter === tf
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto w-full max-w-full">
              <table className="w-full min-w-[850px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase">Date</th>
                    <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase">Buyer</th>
                    <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase">Event</th>
                    <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase">Qty</th>
                    <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase">Gross</th>
                    <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase">Platform Fee</th>
                    <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase">Gateway Fee</th>
                    <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase">Net</th>
                    <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase">Reference</th>
                    <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{o.created_at}</td>
                      <td className="px-4 py-3 text-foreground text-xs font-bold">
                        {o.customer_name}
                        <span className="block text-[10px] text-muted-foreground font-normal">{o.customer_email}</span>
                      </td>
                      <td className="px-4 py-3 text-foreground text-xs font-medium">{o.event_title}</td>
                      <td className="px-4 py-3 text-foreground text-xs font-mono">{o.quantity}</td>
                      <td className="px-4 py-3 text-foreground text-xs font-mono font-bold">₦{o.subtotal.toLocaleString()}</td>
                      <td className="px-4 py-3 text-primary text-xs font-mono">₦{o.platform_fee.toLocaleString()}</td>
                      <td className="px-4 py-3 text-destructive/80 text-xs font-mono">₦{(o.gateway_fee || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-chart-green text-xs font-mono font-bold">₦{o.organiser_net.toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{o.payment_reference}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          o.payment_status === "paid"
                            ? "bg-chart-green/10 text-chart-green"
                            : o.payment_status === "free"
                            ? "bg-chart-blue/10 text-chart-blue"
                            : "bg-amber-500/10 text-amber-500"
                        }`}>
                          {o.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Payout Requests Desk */
        <div className="space-y-4">
          <div className="bg-muted/40 border border-border p-4 rounded-xl text-xs space-y-1">
            <span className="font-bold text-foreground font-mono uppercase">Administrative Settlement Guidelines:</span>
            <p className="text-muted-foreground">
              Review verified commercial bank account information below. Disburse payouts via commercial bank transfer (or Paystack Transfer), enter the transfer session reference, and mark as Paid.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
            {payouts.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">No organizer payout requests found.</div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[800px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase">Date</th>
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase">Organizer</th>
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase">Amount</th>
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase">Bank Destination</th>
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase">Status</th>
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payouts.map((pr) => (
                      <tr key={pr.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{pr.created_at}</td>
                        <td className="px-4 py-3 text-foreground text-xs font-bold">{pr.organiser_name}</td>
                        <td className="px-4 py-3 text-foreground text-xs font-mono font-bold">₦{pr.amount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs text-foreground">
                          {pr.bank_name} • <span className="font-mono">{pr.account_number}</span>
                          <span className="block text-[10px] text-muted-foreground">{pr.account_name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            pr.status === "paid"
                              ? "bg-chart-green/10 text-chart-green"
                              : pr.status === "pending"
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-destructive/10 text-destructive"
                          }`}>
                            {pr.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {pr.status === "pending" ? (
                            processingPayoutId === pr.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  placeholder="Bank transfer ref..."
                                  value={settlementRef}
                                  onChange={(e) => setSettlementRef(e.target.value)}
                                  className="h-8 text-xs w-36 bg-background"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleSettlePayout(pr.id, "paid")}
                                  className="h-8 text-xs font-bold bg-chart-green hover:bg-chart-green/90 text-white"
                                >
                                  Confirm
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setProcessingPayoutId(null)}
                                  className="h-8 text-xs"
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setProcessingPayoutId(pr.id)}
                                  className="h-7 text-xs font-bold text-chart-green border-chart-green/40 hover:bg-chart-green/10"
                                >
                                  Mark Disbursed
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSettlePayout(pr.id, "cancelled")}
                                  className="h-7 text-xs text-destructive hover:bg-destructive/10"
                                >
                                  Decline
                                </Button>
                              </div>
                            )
                          ) : (
                            <span className="text-[11px] text-muted-foreground font-mono">{pr.reference || "Completed"}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTransactions;
