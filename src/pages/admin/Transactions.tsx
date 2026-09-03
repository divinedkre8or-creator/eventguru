import { useState, useEffect } from "react";
import { CreditCard, Search, Download, CheckCircle2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TransactionRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  amount_paid: number;
  payment_reference: string;
  created_at: string;
  event_title: string;
  status: string;
}

const AdminTransactions = () => {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const { data: events } = await supabase.from("events").select("id, title");
        const eventMap = new Map((events || []).map((e) => [e.id, e.title]));

        const { data: regs, error } = await supabase
          .from("registrations")
          .select("id, full_name, email, phone, amount_paid, payment_reference, created_at, event_id, status")
          .order("created_at", { ascending: false });

        if (error) throw error;

        const list: TransactionRow[] = (regs || []).map((r) => ({
          id: r.id,
          full_name: r.full_name,
          email: r.email,
          phone: r.phone || "N/A",
          amount_paid: Number(r.amount_paid) || 0,
          payment_reference: r.payment_reference || "Free Registration",
          created_at: new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
          event_title: eventMap.get(r.event_id) || "Event",
          status: r.status || "confirmed",
        }));

        setTransactions(list);
      } catch (err) {
        console.error("Failed to load platform transactions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const filtered = transactions.filter((tx) => {
    const matchSearch =
      tx.full_name.toLowerCase().includes(search.toLowerCase()) ||
      tx.email.toLowerCase().includes(search.toLowerCase()) ||
      tx.payment_reference.toLowerCase().includes(search.toLowerCase()) ||
      tx.event_title.toLowerCase().includes(search.toLowerCase());

    const matchType =
      typeFilter === "all" ||
      (typeFilter === "paid" && tx.amount_paid > 0) ||
      (typeFilter === "free" && tx.amount_paid === 0);

    return matchSearch && matchType;
  });

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toast.error("No transactions to export");
      return;
    }

    const csvRows = [
      ["Date", "Attendee Name", "Email", "Event", "Payment Reference", "Amount Paid (NGN)", "Status"],
      ...filtered.map((t) => [t.created_at, t.full_name, t.email, t.event_title, t.payment_reference, t.amount_paid, t.status]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `platform_transactions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Transactions CSV report downloaded!");
  };

  const totalVolume = filtered.reduce((sum, t) => sum + t.amount_paid, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded inline-block mb-2 font-bold">
            SUPER ADMIN CONTROL
          </div>
          <h1 className="font-heading text-3xl font-black text-foreground tracking-tight">Platform Ledger</h1>
          <p className="text-muted-foreground text-xs font-medium mt-1">
            Global ledger of ticket sales, free registrations, and payment processor references.
          </p>
        </div>

        <Button
          onClick={handleExportCSV}
          variant="outline"
          className="border-border text-foreground font-bold text-xs h-10 px-4 rounded-lg hover:bg-muted flex items-center gap-1.5"
        >
          <Download className="w-4 h-4" /> Export CSV Ledger
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, event, or ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border text-xs h-10 rounded-lg"
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="text-xs font-mono text-muted-foreground">
            Filtered Volume: <strong className="text-foreground font-bold font-mono">₦{totalVolume.toLocaleString()}</strong>
          </div>

          <div className="flex gap-1.5">
            {["all", "paid", "free"].map((tf) => (
              <button
                key={tf}
                onClick={() => setTypeFilter(tf)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold capitalize border transition-all ${
                  typeFilter === tf
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-medium">Fetching global transaction records…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card border border-dashed border-border rounded-lg space-y-2">
          <CreditCard className="w-10 h-10 mx-auto text-muted-foreground/30" />
          <h3 className="font-heading text-base font-bold text-foreground">No transactions found</h3>
          <p className="text-xs text-muted-foreground">No registrations match your search filters.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Date</th>
                  <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Attendee</th>
                  <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Event Title</th>
                  <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Reference</th>
                  <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground text-xs">{tx.created_at}</td>
                    <td className="px-4 py-3 text-foreground text-xs font-bold">
                      {tx.full_name}
                      <span className="block text-[10px] text-muted-foreground font-normal">{tx.email}</span>
                    </td>
                    <td className="px-4 py-3 text-foreground text-xs font-medium truncate max-w-[200px]">{tx.event_title}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{tx.payment_reference}</td>
                    <td className="px-4 py-3 text-foreground text-xs font-mono font-bold">
                      {tx.amount_paid === 0 ? "Free" : `₦${tx.amount_paid.toLocaleString()}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTransactions;
