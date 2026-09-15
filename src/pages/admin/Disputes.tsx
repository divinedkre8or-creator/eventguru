import { useState, useEffect } from "react";
import { 
  AlertTriangle, CheckCircle2, Search, ShieldAlert, 
  Loader2, RefreshCw, FileText, ArrowRight, ExternalLink 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DisputeItem {
  id: string;
  reference: string;
  userEmail: string;
  eventTitle: string;
  type: string;
  amount: number;
  status: "open" | "investigating" | "resolved" | "refunded";
  createdAt: string;
}

const AdminDisputes = () => {
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // On-demand reference lookup state
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupResult, setLookupResult] = useState<any | null>(null);
  const [searchingLookup, setSearchingLookup] = useState(false);

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      // 1. Fetch complaints/disputes from feedback table
      const { data: feedbackData } = await (supabase.from as any)("feedback")
        .select("*")
        .in("type", ["complaint", "support", "bug"])
        .order("created_at", { ascending: false });

      // 2. Fetch events to join names
      const { data: events } = await supabase.from("events").select("id, title");
      const eventMap = new Map((events || []).map((e) => [e.id, e.title]));

      const list: DisputeItem[] = (feedbackData || []).map((f: any) => ({
        id: f.id,
        reference: `DISP-${f.id.slice(0, 6).toUpperCase()}`,
        userEmail: f.email || "Anonymous Attendee",
        eventTitle: f.event_id ? (eventMap.get(f.event_id) || "Event Inquiry") : "Platform Dispute",
        type: f.type || "complaint",
        amount: 0,
        status: f.status === "resolved" ? "resolved" : "open",
        createdAt: new Date(f.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      }));

      setDisputes(list);
    } catch (err) {
      console.error("Failed to load platform disputes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: DisputeItem["status"]) => {
    try {
      const dbStatus = newStatus === "resolved" || newStatus === "refunded" ? "resolved" : "pending";
      await (supabase.from as any)("feedback").update({ status: dbStatus }).eq("id", id);
      
      setDisputes((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d))
      );
      toast.success(`Dispute status updated to ${newStatus.toUpperCase()}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update dispute status");
    }
  };

  const handleLookupReference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupQuery.trim()) return;

    setSearchingLookup(true);
    setLookupResult(null);

    try {
      const cleanQ = lookupQuery.trim();
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanQ);

      const query = supabase
        .from("registrations")
        .select("id, full_name, email, phone, amount_paid, payment_reference, status, created_at, events(title, date)")
        .or(isUUID ? `id.eq.${cleanQ}` : `payment_reference.ilike.%${cleanQ}%,email.ilike.%${cleanQ}%`)
        .limit(1)
        .maybeSingle();

      const { data, error } = await query;
      if (error) throw error;

      if (!data) {
        toast.info("No transaction or registration matched that reference or email.");
      } else {
        setLookupResult(data);
        toast.success("Transaction located in ledger!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to query ledger");
    } finally {
      setSearchingLookup(false);
    }
  };

  const filtered = disputes.filter((d) => {
    const matchSearch =
      d.reference.toLowerCase().includes(search.toLowerCase()) ||
      d.userEmail.toLowerCase().includes(search.toLowerCase()) ||
      d.eventTitle.toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12 w-full min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6 w-full min-w-0">
        <div>
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded inline-block mb-2 font-bold">
            SUPER ADMIN CONTROL
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-black text-foreground tracking-tight">Dispute Resolution Desk</h1>
          <p className="text-muted-foreground text-xs font-medium mt-1">
            Investigate ticket refund inquiries, attendee chargeback reports, and verify transaction receipts.
          </p>
        </div>

        <Button
          onClick={fetchDisputes}
          variant="outline"
          size="sm"
          className="text-xs font-bold h-9 border-border gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh List
        </Button>
      </div>

      {/* Transaction & Reference Lookup Card */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-secondary" />
          <h2 className="font-heading text-sm font-bold text-foreground">Direct Transaction & Chargeback Lookup</h2>
        </div>
        <form onSubmit={handleLookupReference} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Enter Paystack Payment Reference (e.g. EVR-...) or Attendee Email..."
              value={lookupQuery}
              onChange={(e) => setLookupQuery(e.target.value)}
              className="pl-9 bg-background border-border text-xs h-10 rounded-lg font-mono"
            />
          </div>
          <Button
            type="submit"
            disabled={searchingLookup}
            variant="secondary"
            className="text-xs font-bold h-10 px-5 rounded-lg shadow-xs shrink-0"
          >
            {searchingLookup ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify in Ledger"}
          </Button>
        </form>

        {lookupResult && (
          <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-2 mt-3 animate-in fade-in-50 text-xs">
            <div className="flex items-center justify-between font-bold text-foreground pb-1 border-b border-border">
              <span>Verified Ledger Record</span>
              <span className="text-[10px] font-mono bg-chart-green/10 text-chart-green px-2 py-0.5 rounded uppercase">
                {lookupResult.status || "CONFIRMED"}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-mono">Attendee</span>
                <span className="font-bold text-foreground">{lookupResult.full_name}</span>
                <span className="block text-[11px] text-muted-foreground">{lookupResult.email}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-mono">Event</span>
                <span className="font-medium text-foreground">{(lookupResult.events as any)?.title || "N/A"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-mono">Amount Paid</span>
                <span className="font-bold font-mono text-foreground">₦{(Number(lookupResult.amount_paid) || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-mono">Reference</span>
                <span className="font-mono text-secondary break-all">{lookupResult.payment_reference || lookupResult.id}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Filter dispute inquiries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border text-xs h-10 rounded-lg"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto">
          {["all", "open", "resolved"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold capitalize whitespace-nowrap border transition-all ${
                statusFilter === st
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto w-full max-w-full">
          <table className="w-full min-w-[620px] text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Ref</th>
                <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Attendee Email</th>
                <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Context</th>
                <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Type</th>
                <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Date</th>
                <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-xs text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading dispute inquiries...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-xs text-muted-foreground space-y-1">
                    <CheckCircle2 className="w-7 h-7 text-chart-green mx-auto mb-1 opacity-70" />
                    <div className="font-bold text-foreground">No active dispute inquiries</div>
                    <div>All attendee payments and accounts are in good standing.</div>
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 text-foreground text-xs font-mono font-bold">{d.reference}</td>
                    <td className="px-4 py-3 text-foreground text-xs">{d.userEmail}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs font-medium">{d.eventTitle}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs font-mono capitalize">
                      {d.type.replace("_", " ")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{d.createdAt}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        d.status === "open"
                          ? "bg-destructive/10 text-destructive border border-destructive/30"
                          : "bg-chart-green/10 text-chart-green border border-chart-green/30"
                      }`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {d.status !== "resolved" ? (
                          <Button
                            onClick={() => handleUpdateStatus(d.id, "resolved")}
                            size="sm"
                            className="bg-chart-green/10 text-chart-green hover:bg-chart-green/20 text-[10px] font-bold h-7 px-2.5 rounded"
                          >
                            Mark Resolved
                          </Button>
                        ) : (
                          <span className="text-[10px] font-mono text-muted-foreground">Closed</span>
                        )}
                      </div>
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

export default AdminDisputes;
