import { useState, useEffect } from "react";
import { Wallet, ArrowDownRight, CreditCard, Building2, ShieldCheck, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PaidTransaction {
  id: string;
  full_name: string;
  email: string;
  amount_paid: number;
  payment_reference: string;
  created_at: string;
  event_title: string;
}

const Payments = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<PaidTransaction[]>([]);
  const [totalGross, setTotalGross] = useState(0);

  // Bank details state
  const [bankName, setBankName] = useState(() => localStorage.getItem("eg_bank_name") || "");
  const [accountNumber, setAccountNumber] = useState(() => localStorage.getItem("eg_account_number") || "");
  const [accountName, setAccountName] = useState(() => localStorage.getItem("eg_account_name") || "");
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [payoutRequested, setPayoutRequested] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        // Fetch organiser's events
        const { data: events } = await supabase
          .from("events")
          .select("id, title")
          .eq("organiser_id", user.id);

        if (!events || events.length === 0) {
          setTransactions([]);
          setTotalGross(0);
          setLoading(false);
          return;
        }

        const eventMap = new Map(events.map((e) => [e.id, e.title]));
        const eventIds = events.map((e) => e.id);

        // Fetch paid registrations
        const { data: regs } = await supabase
          .from("registrations")
          .select("id, full_name, email, amount_paid, payment_reference, created_at, event_id")
          .in("event_id", eventIds)
          .gt("amount_paid", 0)
          .order("created_at", { ascending: false });

        if (regs) {
          const gross = regs.reduce((sum, r) => sum + (Number(r.amount_paid) || 0), 0);
          setTotalGross(gross);

          const formatted: PaidTransaction[] = regs.map((r) => ({
            id: r.id,
            full_name: r.full_name,
            email: r.email,
            amount_paid: Number(r.amount_paid) || 0,
            payment_reference: r.payment_reference || "N/A",
            created_at: new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
            event_title: eventMap.get(r.event_id) || "Event",
          }));
          setTransactions(formatted);
        }
      } catch (err) {
        console.error("Failed to load payment transactions:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, [user?.id]);

  const handleSaveBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName || !accountNumber || !accountName) {
      toast.error("Please fill in all bank details");
      return;
    }
    localStorage.setItem("eg_bank_name", bankName);
    localStorage.setItem("eg_account_number", accountNumber);
    localStorage.setItem("eg_account_name", accountName);
    setIsEditingBank(false);
    toast.success("Bank details updated successfully!");
  };

  const handleRequestPayout = () => {
    if (!accountNumber) {
      toast.error("Please add your bank account details first");
      setIsEditingBank(true);
      return;
    }
    if (totalGross === 0) {
      toast.error("No available balance for payout yet");
      return;
    }
    setPayoutRequested(true);
    toast.success("Payout request submitted! Payouts process within 24 hours.");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12 w-full min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="border-b border-border pb-6 w-full min-w-0">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-muted px-2.5 py-1 rounded inline-block mb-2 text-foreground">
          PAYMENTS & PAYOUTS
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-black text-foreground tracking-tight">Financial Center</h1>
        <p className="text-muted-foreground text-xs font-medium mt-1">
          Manage your ticket revenue, automated bank payouts, and transaction history.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-medium">Loading financial records…</p>
        </div>
      ) : (
        <>
          {/* Revenue & Payout Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 w-full min-w-0">
            <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-muted-foreground">Total Revenue</span>
                <Wallet className="w-4 h-4 text-chart-green" />
              </div>
              <div className="font-heading text-2xl font-black text-foreground">₦{totalGross.toLocaleString()}</div>
              <p className="text-[11px] text-muted-foreground font-medium">Lifetime ticket sales</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-muted-foreground">Available Payout</span>
                <ArrowDownRight className="w-4 h-4 text-secondary" />
              </div>
              <div className="font-heading text-2xl font-black text-foreground">
                ₦{payoutRequested ? 0 : totalGross.toLocaleString()}
              </div>
              <Button
                variant="secondary"
                onClick={handleRequestPayout}
                disabled={payoutRequested || totalGross === 0}
                size="sm"
                className="w-full font-bold text-xs h-8 rounded-lg mt-2 shadow-xs"
              >
                {payoutRequested ? "Payout Pending" : "Request Payout"}
              </Button>
            </div>

            {/* Settlement Bank Card */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-muted-foreground">Payout Bank Account</span>
                <Building2 className="w-4 h-4 text-chart-blue" />
              </div>

              {accountNumber && !isEditingBank ? (
                <div className="space-y-1">
                  <div className="font-bold text-xs text-foreground">{accountName}</div>
                  <div className="font-mono text-xs text-muted-foreground">{bankName} • {accountNumber}</div>
                  <button
                    onClick={() => setIsEditingBank(true)}
                    className="text-[11px] font-bold text-secondary hover:underline pt-1 block"
                  >
                    Edit Bank Account
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">No bank account attached for payouts.</p>
                  <Button
                    onClick={() => setIsEditingBank(true)}
                    size="sm"
                    variant="outline"
                    className="w-full text-xs font-bold h-8 border-border"
                  >
                    Add Bank Account
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Edit Bank Modal / Inline Form */}
          {isEditingBank && (
            <form onSubmit={handleSaveBank} className="bg-card border border-secondary/40 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="font-heading text-sm font-bold text-foreground">Configure Payout Bank Account</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-foreground">Bank Name</Label>
                  <Input
                    placeholder="e.g. GTBank / Zenith Bank"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="bg-background border-border text-xs h-9 rounded-lg"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-foreground">Account Number</Label>
                  <Input
                    placeholder="0123456789"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="bg-background border-border text-xs h-9 rounded-lg font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-foreground">Account Name</Label>
                  <Input
                    placeholder="Exact Name on Account"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="bg-background border-border text-xs h-9 rounded-lg"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditingBank(false)} className="text-xs font-bold h-9">
                  Cancel
                </Button>
                <Button type="submit" variant="secondary" className="text-xs font-bold h-9 shadow-xs">
                  Save Bank Account
                </Button>
              </div>
            </form>
          )}

          {/* Transactions Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                Recent Paid Transactions
              </h2>
              <span className="text-[11px] text-muted-foreground font-mono">{transactions.length} Transactions</span>
            </div>

            {transactions.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CreditCard className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                <p className="text-xs text-muted-foreground">No paid transactions recorded yet.</p>
                <p className="text-[11px] text-muted-foreground/70">When attendees purchase paid tickets via secure online payment, sales will appear here automatically.</p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full max-w-full">
                <table className="w-full min-w-[620px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Date</th>
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Attendee</th>
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Event</th>
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Reference</th>
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Status</th>
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
                        <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{tx.payment_reference}</td>
                        <td className="px-4 py-3 text-foreground text-xs font-mono font-bold">₦{tx.amount_paid.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-chart-green/10 text-chart-green">
                            Successful
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Payments;
