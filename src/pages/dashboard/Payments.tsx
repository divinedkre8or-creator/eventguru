import { useState, useEffect } from "react";
import { 
  Wallet, ArrowDownRight, ArrowUpRight, CreditCard, Building2, ShieldCheck, 
  CheckCircle2, Clock, Loader2, AlertCircle, RefreshCw, X, Check, Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RollingCounter } from "@/components/ui/RollingCounter";
import { TactileButton } from "@/components/ui/TactileButton";
import { POPULAR_NIGERIAN_BANKS, resolveBankCode } from "@/lib/banks";

interface PaidTransaction {
  id: string;
  order_id?: string;
  full_name: string;
  email: string;
  subtotal: number;
  platform_fee: number;
  gateway_fee: number;
  organiser_net: number;
  payment_reference: string;
  created_at: string;
  event_title: string;
  quantity: number;
}

interface PayoutRequestItem {
  id: string;
  amount: number;
  currency: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: "pending" | "processing" | "paid" | "failed" | "cancelled";
  payout_gateway?: string;
  reference?: string;
  admin_notes?: string;
  created_at: string;
  processed_at?: string;
}

const Payments = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<PaidTransaction[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequestItem[]>([]);

  // Financial accounting metrics
  const [grossRevenue, setGrossRevenue] = useState(0);
  const [totalPlatformFees, setTotalPlatformFees] = useState(0);
  const [totalGatewayFees, setTotalGatewayFees] = useState(0);
  const [netRevenue, setNetRevenue] = useState(0);
  const [totalPaidOut, setTotalPaidOut] = useState(0);
  const [pendingPayoutTotal, setPendingPayoutTotal] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);

  // Bank profile state (Database-backed)
  const [bankName, setBankName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [hasBankProfile, setHasBankProfile] = useState(false);
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [savingBank, setSavingBank] = useState(false);

  // Withdrawal modal state
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const fetchFinancials = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // 1. Fetch Database-backed Bank Payout Profile
      const { data: bankProfile } = await (supabase.from as any)("organizer_payout_profiles")
        .select("*")
        .eq("organiser_id", user.id)
        .maybeSingle();

      if (bankProfile) {
        setBankName(bankProfile.bank_name || "");
        setBankCode(bankProfile.bank_code || resolveBankCode(bankProfile.bank_name) || "");
        setAccountNumber(bankProfile.account_number || "");
        setAccountName(bankProfile.account_name || "");
        setHasBankProfile(Boolean(bankProfile.account_number && bankProfile.bank_name));
      } else {
        // Fallback check from prior local storage during migration window
        const legacyBank = localStorage.getItem("eg_bank_name");
        const legacyAccNum = localStorage.getItem("eg_account_number");
        const legacyAccName = localStorage.getItem("eg_account_name");
        if (legacyBank && legacyAccNum && legacyAccName) {
          setBankName(legacyBank);
          setBankCode(resolveBankCode(legacyBank) || "");
          setAccountNumber(legacyAccNum);
          setAccountName(legacyAccName);
          setHasBankProfile(true);
        }
      }

      // 2. Fetch organizer's events
      const { data: events } = await supabase
        .from("events")
        .select("id, title")
        .eq("organiser_id", user.id);

      const eventMap = new Map((events || []).map((e) => [e.id, e.title]));
      const eventIds = (events || []).map((e) => e.id);

      // 3. Fetch Authoritative Orders
      let ordersList: any[] = [];
      if (eventIds.length > 0) {
        const { data: ordersData } = await (supabase.from as any)("orders")
          .select("*")
          .in("event_id", eventIds)
          .eq("payment_status", "paid")
          .order("created_at", { ascending: false });

        ordersList = ordersData || [];
      }

      let calculatedGross = 0;
      let calculatedPlatformFees = 0;
      let calculatedGatewayFees = 0;
      let calculatedNet = 0;
      let txList: PaidTransaction[] = [];

      if (ordersList.length > 0) {
        calculatedGross = ordersList.reduce((sum, o) => sum + (Number(o.subtotal) || Number(o.amount_paid) || 0), 0);
        calculatedPlatformFees = ordersList.reduce((sum, o) => sum + (Number(o.platform_fee) || 0), 0);
        calculatedGatewayFees = ordersList.reduce((sum, o) => sum + (Number(o.gateway_fee) || 0), 0);
        calculatedNet = ordersList.reduce((sum, o) => {
          if (o.organiser_net != null) return sum + Number(o.organiser_net);
          const gross = Number(o.subtotal) || Number(o.amount_paid) || 0;
          const plat = Number(o.platform_fee) || 0;
          const gate = Number(o.gateway_fee) || 0;
          return sum + Math.max(0, gross - plat - gate);
        }, 0);

        txList = ordersList.map((o) => {
          const gross = Number(o.subtotal) || Number(o.amount_paid) || 0;
          const plat = Number(o.platform_fee) || 0;
          const gate = Number(o.gateway_fee) || 0;
          const net = o.organiser_net != null ? Number(o.organiser_net) : Math.max(0, gross - plat - gate);

          return {
            id: o.id,
            order_id: o.id,
            full_name: o.customer_name,
            email: o.customer_email,
            subtotal: gross,
            platform_fee: plat,
            gateway_fee: gate,
            organiser_net: net,
            payment_reference: o.payment_reference || "N/A",
            quantity: o.quantity || 1,
            created_at: new Date(o.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            event_title: eventMap.get(o.event_id) || "Event",
          };
        });
      } else if (eventIds.length > 0) {
        // Legacy calculation from registrations table
        const { data: regs } = await supabase
          .from("registrations")
          .select("id, full_name, email, amount_paid, payment_reference, created_at, event_id")
          .in("event_id", eventIds)
          .gt("amount_paid", 0)
          .order("created_at", { ascending: false });

        if (regs && regs.length > 0) {
          calculatedGross = regs.reduce((sum, r) => sum + (Number(r.amount_paid) || 0), 0);
          calculatedPlatformFees = Math.round(calculatedGross * 0.025);
          calculatedGatewayFees = 0;
          calculatedNet = Math.max(0, calculatedGross - calculatedPlatformFees);

          txList = regs.map((r) => ({
            id: r.id,
            full_name: r.full_name,
            email: r.email,
            subtotal: Number(r.amount_paid) || 0,
            platform_fee: Math.round((Number(r.amount_paid) || 0) * 0.025),
            gateway_fee: 0,
            organiser_net: Math.max(0, (Number(r.amount_paid) || 0) - Math.round((Number(r.amount_paid) || 0) * 0.025)),
            payment_reference: r.payment_reference || "N/A",
            quantity: 1,
            created_at: new Date(r.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            event_title: eventMap.get(r.event_id) || "Event",
          }));
        }
      }

      setGrossRevenue(calculatedGross);
      setTotalPlatformFees(calculatedPlatformFees);
      setTotalGatewayFees(calculatedGatewayFees);
      setNetRevenue(calculatedNet);
      setTransactions(txList);

      // 4. Fetch Payout Requests History
      const { data: payouts } = await (supabase.from as any)("payout_requests")
        .select("*")
        .eq("organiser_id", user.id)
        .order("created_at", { ascending: false });

      const payoutItems: PayoutRequestItem[] = payouts || [];
      setPayoutRequests(payoutItems);

      const paidTotal = payoutItems
        .filter((p) => p.status === "paid")
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const pendingTotal = payoutItems
        .filter((p) => p.status === "pending" || p.status === "processing")
        .reduce((sum, p) => sum + Number(p.amount), 0);

      setTotalPaidOut(paidTotal);
      setPendingPayoutTotal(pendingTotal);

      const available = Math.max(0, calculatedNet - paidTotal - pendingTotal);
      setAvailableBalance(available);
    } catch (err) {
      console.error("Failed to load financial data:", err);
      toast.error("Failed to refresh financial center");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancials();
  }, [user?.id]);

  const handleSelectBank = (selectedName: string) => {
    setBankName(selectedName);
    const resolved = resolveBankCode(selectedName);
    if (resolved) {
      setBankCode(resolved);
    }
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      toast.error("Please fill in all bank account details");
      return;
    }

    const resolvedCode = bankCode || resolveBankCode(bankName) || "058";

    setSavingBank(true);
    try {
      const { error } = await (supabase.from as any)("organizer_payout_profiles").upsert(
        {
          organiser_id: user.id,
          bank_name: bankName.trim(),
          bank_code: resolvedCode,
          account_number: accountNumber.trim(),
          account_name: accountName.trim(),
          bachs_destination_id: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organiser_id" }
      );

      if (error) throw error;

      // Sync legacy storage for backward compatibility
      localStorage.setItem("eg_bank_name", bankName.trim());
      localStorage.setItem("eg_account_number", accountNumber.trim());
      localStorage.setItem("eg_account_name", accountName.trim());

      setHasBankProfile(true);
      setIsEditingBank(false);
      toast.success("Payout bank account saved securely!");
    } catch (err: any) {
      console.error("Error saving bank profile:", err);
      toast.error(err.message || "Failed to save bank account details");
    } finally {
      setSavingBank(false);
    }
  };

  const handleOpenWithdrawModal = () => {
    if (!user?.id) return;

    if (!accountNumber || !bankName || !accountName) {
      toast.error("Please configure and save your verified payout bank account first.");
      setIsEditingBank(true);
      return;
    }

    if (availableBalance <= 0) {
      toast.error("You have zero available balance for withdrawal.");
      return;
    }

    setIsWithdrawModalOpen(true);
  };

  const handleExecuteWithdrawal = async () => {
    if (!user?.id) return;
    if (availableBalance <= 0) {
      toast.error("No balance available to withdraw.");
      return;
    }

    setWithdrawing(true);

    try {
      // 1. Attempt Automated Payout via Bachs Edge Function
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke("bachs-payout", {
        body: { amount: availableBalance },
      });

      if (!edgeError && edgeData?.ok) {
        toast.success(
          `Withdrawal of ₦${availableBalance.toLocaleString()} initiated! Reference: ${edgeData.reference}`
        );
        setIsWithdrawModalOpen(false);
        await fetchFinancials();
        return;
      }

      // If edge function returned a specific business rejection
      if (edgeData?.error) {
        throw new Error(edgeData.error);
      }

      // 2. Safe Fallback: Record withdrawal in payout_requests table if Edge Function is offline
      console.warn("bachs-payout edge function notice, executing database fallback:", edgeError);

      const { error: insertErr } = await (supabase.from as any)("payout_requests").insert({
        organiser_id: user.id,
        amount: availableBalance,
        currency: "NGN",
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        account_name: accountName.trim(),
        status: "pending",
        payout_gateway: "bachs",
        admin_notes: "Organizer initiated withdrawal via dashboard",
      });

      if (insertErr) throw insertErr;

      toast.success(
        `Withdrawal of ₦${availableBalance.toLocaleString()} queued for settlement. Transfers process automatically.`
      );
      setIsWithdrawModalOpen(false);
      await fetchFinancials();
    } catch (err: any) {
      console.error("Withdrawal execution error:", err);
      toast.error(err.message || "Failed to process withdrawal. Please try again.");
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12 w-full min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6 w-full min-w-0">
        <div>
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-muted px-2.5 py-1 rounded inline-block mb-2 text-foreground">
            FINANCIAL RECONCILIATION & SETTLEMENTS
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-black text-foreground tracking-tight">Organizer Ledger</h1>
          <p className="text-muted-foreground text-xs font-medium mt-1">
            Authoritative ticket proceeds, transparent platform commissions, and automated bank withdrawals.
          </p>
        </div>

        <Button
          onClick={fetchFinancials}
          variant="outline"
          size="sm"
          className="text-xs font-bold h-9 border-border self-start sm:self-auto gap-1.5"
          disabled={loading}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Balances
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-medium">Reconciling financial ledgers…</p>
        </div>
      ) : (
        <>
          {/* Revenue & Payout Balance Cards — 6 Authoritative Columns with Digital Odometer Counters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 w-full min-w-0">
            {/* 1. Gross Ticket Sales */}
            <div className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase text-muted-foreground">Gross Ticket Sales</span>
                <Wallet className="w-3.5 h-3.5 text-chart-green" />
              </div>
              <div className="font-heading text-xl font-black text-foreground">
                <RollingCounter value={grossRevenue} prefix="₦" />
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">100% Attendee Volume</p>
            </div>

            {/* 2. Platform Commission (2.5%) */}
            <div className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase text-muted-foreground">EventRally Fee (2.5%)</span>
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="font-heading text-xl font-black text-foreground">
                <RollingCounter value={totalPlatformFees} prefix="₦" />
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">Platform Service Commission</p>
            </div>

            {/* 3. Payment Processing Fee */}
            <div className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase text-muted-foreground">Processing Fee</span>
                <CreditCard className="w-3.5 h-3.5 text-destructive/80" />
              </div>
              <div className="font-heading text-xl font-black text-foreground">
                <RollingCounter value={totalGatewayFees} prefix="₦" />
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">Actual Gateway Cost</p>
            </div>

            {/* 4. Net Earnings */}
            <div className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase text-muted-foreground">Net Earnings</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-chart-blue" />
              </div>
              <div className="font-heading text-xl font-black text-foreground">
                <RollingCounter value={netRevenue} prefix="₦" />
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">Gross − EventRally − Gateway</p>
            </div>

            {/* 5. Pending Payouts */}
            <div className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase text-muted-foreground">Pending Payouts</span>
                <Clock className="w-3.5 h-3.5 text-secondary" />
              </div>
              <div className="font-heading text-xl font-black text-secondary">
                <RollingCounter value={pendingPayoutTotal} prefix="₦" />
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">In-Flight Disbursals</p>
            </div>

            {/* 6. Available Payout Balance & Tactile Withdraw Button */}
            <div className="bg-card border border-secondary/50 rounded-xl p-4 shadow-xs space-y-1.5 bg-secondary/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase text-secondary">Available Balance</span>
                  <ArrowDownRight className="w-3.5 h-3.5 text-secondary" />
                </div>
                <div className="font-heading text-xl font-black text-secondary mt-1">
                  <RollingCounter value={availableBalance} prefix="₦" />
                </div>
              </div>
              <TactileButton
                variant="secondary"
                size="sm"
                onClick={handleOpenWithdrawModal}
                disabled={availableBalance <= 0}
                className="w-full font-bold text-[11px] h-8 rounded-lg mt-2 shadow-xs"
              >
                <ArrowUpRight className="w-3.5 h-3.5" /> Withdraw Funds
              </TactileButton>
            </div>
          </div>

          {/* Settlement Account Card & Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-card border border-border rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-chart-blue" />
                  <span className="text-xs font-mono font-bold uppercase text-foreground">Verified Settlement Account</span>
                </div>
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">
                  Automated via Bachs
                </span>
              </div>

              {hasBankProfile && accountNumber && !isEditingBank ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div>
                    <div className="font-bold text-sm text-foreground">{accountName}</div>
                    <div className="font-mono text-xs text-muted-foreground mt-0.5">
                      {bankName} • <span className="font-bold text-foreground">{accountNumber}</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => setIsEditingBank(true)}
                    variant="outline"
                    size="sm"
                    className="text-xs font-bold h-8 border-border"
                  >
                    Edit Bank Details
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Configure your Nigerian commercial bank account to receive instant automated ticket withdrawals via Bachs.
                  </p>
                  {!isEditingBank && (
                    <Button
                      onClick={() => setIsEditingBank(true)}
                      size="sm"
                      variant="outline"
                      className="text-xs font-bold h-8"
                    >
                      Configure Bank Details
                    </Button>
                  )}
                </div>
              )}

              {isEditingBank && (
                <form onSubmit={handleSaveBank} className="space-y-3 pt-2 border-t border-border/60">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-foreground">Bank Name</Label>
                      <input
                        list="nigerian-banks-list"
                        value={bankName}
                        onChange={(e) => handleSelectBank(e.target.value)}
                        placeholder="Select or type bank name"
                        className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground font-medium focus:ring-2 focus:ring-primary outline-none"
                        required
                      />
                      <datalist id="nigerian-banks-list">
                        {POPULAR_NIGERIAN_BANKS.map((b) => (
                          <option key={b.code} value={b.name} />
                        ))}
                      </datalist>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-foreground">Account Number</Label>
                      <Input
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="10-digit NUBAN"
                        maxLength={10}
                        className="bg-background border-border text-xs h-9 rounded-lg font-mono"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-foreground">Account Holder Name</Label>
                      <Input
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        placeholder="As registered with bank"
                        className="bg-background border-border text-xs h-9 rounded-lg"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditingBank(false)}
                      className="text-xs font-bold h-8"
                    >
                      Cancel
                    </Button>
                    <TactileButton
                      type="submit"
                      variant="secondary"
                      size="sm"
                      className="text-xs font-bold h-8 shadow-xs"
                      loading={savingBank}
                    >
                      Save Settlement Account
                    </TactileButton>
                  </div>
                </form>
              )}
            </div>

            {/* Payout Summary Info */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-3">
              <div className="text-xs font-mono font-bold uppercase text-muted-foreground">Settlement Summary</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Total Disbursed:</span>
                  <span className="font-mono font-bold text-foreground">₦{totalPaidOut.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Pending Review:</span>
                  <span className="font-mono font-bold text-secondary">₦{pendingPayoutTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Settlement Engine:</span>
                  <span className="font-bold text-foreground">Automated (Bachs NIP)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payout Requests History Table */}
          {payoutRequests.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                  Settlement & Withdrawal Ledger
                </h2>
                <span className="text-[11px] text-muted-foreground font-mono">{payoutRequests.length} Withdrawals</span>
              </div>
              <div className="overflow-x-auto w-full max-w-full">
                <table className="w-full min-w-[620px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase">Date Requested</th>
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase">Amount</th>
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase">Bank Destination</th>
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase">Status</th>
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payoutRequests.map((pr) => (
                      <tr key={pr.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground text-xs font-mono">
                          {new Date(pr.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3 text-foreground text-xs font-mono font-bold">
                          ₦{Number(pr.amount).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground">
                          {pr.bank_name} • <span className="font-mono font-bold">{pr.account_number}</span>
                          <span className="block text-[10px] text-muted-foreground">{pr.account_name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            pr.status === "paid"
                              ? "bg-chart-green/10 text-chart-green"
                              : pr.status === "processing"
                              ? "bg-chart-blue/10 text-chart-blue"
                              : pr.status === "pending"
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-destructive/10 text-destructive"
                          }`}>
                            {pr.status === "paid"
                              ? "Transferred (Bachs)"
                              : pr.status === "processing"
                              ? "In-Flight"
                              : pr.status === "pending"
                              ? "Queued"
                              : pr.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs font-mono">
                          {pr.reference || pr.admin_notes || "Bachs transfer"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Paid Transactions Ledger Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                Authoritative Ticket Transactions Ledger
              </h2>
              <span className="text-[11px] text-muted-foreground font-mono">{transactions.length} Orders</span>
            </div>

            {transactions.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CreditCard className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                <p className="text-xs text-muted-foreground">No paid transactions recorded yet.</p>
                <p className="text-[11px] text-muted-foreground/70">
                  When attendees purchase paid tickets, orders with immutable financial snapshots will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full max-w-full">
                <table className="w-full min-w-[700px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Date</th>
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Buyer</th>
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Event</th>
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Qty</th>
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Gross</th>
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">EventRally Fee</th>
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Processing Fee</th>
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Net Earned</th>
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground text-xs">{tx.created_at}</td>
                        <td className="px-4 py-3 text-foreground text-xs font-bold">
                          {tx.full_name}
                          <span className="block text-[10px] text-muted-foreground font-normal">{tx.email}</span>
                        </td>
                        <td className="px-4 py-3 text-foreground text-xs font-medium">{tx.event_title}</td>
                        <td className="px-4 py-3 text-foreground text-xs font-mono">{tx.quantity}</td>
                        <td className="px-4 py-3 text-foreground text-xs font-mono font-bold">₦{tx.subtotal.toLocaleString()}</td>
                        <td className="px-4 py-3 text-destructive/80 text-xs font-mono">-₦{tx.platform_fee.toLocaleString()}</td>
                        <td className="px-4 py-3 text-destructive/80 text-xs font-mono">-₦{(tx.gateway_fee || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-chart-green text-xs font-mono font-bold">₦{tx.organiser_net.toLocaleString()}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{tx.payment_reference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Instant Withdrawal Confirmation Modal */}
      <AnimatePresence>
        {isWithdrawModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-card border border-border rounded-2xl shadow-xl max-w-md w-full overflow-hidden p-6 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-base text-foreground tracking-tight">Confirm Withdrawal</h3>
                    <p className="text-[11px] text-muted-foreground">Automated Bank Transfer via Bachs</p>
                  </div>
                </div>
                <button
                  onClick={() => !withdrawing && setIsWithdrawModalOpen(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  disabled={withdrawing}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Amount Display with Rolling Counter */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border text-center space-y-1">
                <span className="text-[11px] font-mono font-bold uppercase text-muted-foreground">Withdrawal Amount</span>
                <div className="font-heading text-3xl font-black text-foreground">
                  <RollingCounter value={availableBalance} prefix="₦" />
                </div>
                <p className="text-[10px] text-chart-green font-medium flex items-center justify-center gap-1">
                  <Check className="w-3 h-3" /> Authoritative available ticket earnings
                </p>
              </div>

              {/* Destination Bank Summary */}
              <div className="p-3.5 rounded-xl border border-border/80 bg-background space-y-2 text-xs">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Destination:</span>
                  <span className="font-bold text-foreground">{bankName}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Account Number:</span>
                  <span className="font-mono font-bold text-foreground">{accountNumber}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Beneficiary:</span>
                  <span className="font-medium text-foreground">{accountName}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground pt-1 border-t border-border/50">
                  <span>Settlement Engine:</span>
                  <span className="font-bold text-secondary flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Direct Bachs NIP
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2.5 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  disabled={withdrawing}
                  className="flex-1 text-xs font-bold h-10 rounded-xl"
                >
                  Cancel
                </Button>
                <TactileButton
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={handleExecuteWithdrawal}
                  loading={withdrawing}
                  loadingText="Initiating Transfer…"
                  className="flex-1 text-xs font-bold h-10 rounded-xl shadow-xs"
                >
                  Confirm & Transfer
                </TactileButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Payments;
