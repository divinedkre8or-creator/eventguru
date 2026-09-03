import { useState } from "react";
import { AlertTriangle, CheckCircle2, Search, PlusCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface DisputeItem {
  id: string;
  reference: string;
  userEmail: string;
  eventTitle: string;
  type: "refund_request" | "ticket_error" | "duplicate_charge";
  amount: number;
  status: "open" | "investigating" | "resolved" | "refunded";
  createdAt: string;
}

const mockDisputes: DisputeItem[] = [
  {
    id: "disp-1",
    reference: "PAY-984210",
    userEmail: "kemi.adebayo@gmail.com",
    eventTitle: "Lagos Tech Summit 2026",
    type: "duplicate_charge",
    amount: 15000,
    status: "open",
    createdAt: "2026-09-03 14:20",
  },
  {
    id: "disp-2",
    reference: "PAY-773194",
    userEmail: "david.nwachukwu@yahoo.com",
    eventTitle: "Accra Worship Experience",
    type: "refund_request",
    amount: 5000,
    status: "resolved",
    createdAt: "2026-09-02 11:05",
  },
];

const AdminDisputes = () => {
  const [disputes, setDisputes] = useState<DisputeItem[]>(mockDisputes);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const handleUpdateStatus = (id: string, newStatus: DisputeItem["status"]) => {
    setDisputes((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d))
    );
    toast.success(`Dispute ${id} status updated to ${newStatus.toUpperCase()}`);
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
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded inline-block mb-2 font-bold">
          SUPER ADMIN CONTROL
        </div>
        <h1 className="font-heading text-3xl font-black text-foreground tracking-tight">Dispute Resolution Desk</h1>
        <p className="text-muted-foreground text-xs font-medium mt-1">
          Manage ticket refund requests, chargeback inquiries, and attendee disputes.
        </p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by ref, email, or event..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border text-xs h-10 rounded-lg"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto">
          {["all", "open", "investigating", "resolved", "refunded"].map((st) => (
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
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Ref</th>
                <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Attendee Email</th>
                <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Event</th>
                <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Issue Type</th>
                <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Amount</th>
                <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-xs text-muted-foreground">
                    No active disputes found.
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
                    <td className="px-4 py-3 text-foreground text-xs font-mono font-bold">₦{d.amount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        d.status === "open"
                          ? "bg-destructive/10 text-destructive border border-destructive/30"
                          : d.status === "resolved" || d.status === "refunded"
                          ? "bg-chart-green/10 text-chart-green border border-chart-green/30"
                          : "bg-chart-orange/10 text-chart-orange border border-chart-orange/30"
                      }`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {d.status !== "resolved" && (
                          <Button
                            onClick={() => handleUpdateStatus(d.id, "resolved")}
                            size="sm"
                            className="bg-chart-green/10 text-chart-green hover:bg-chart-green/20 text-[10px] font-bold h-7 px-2 rounded"
                          >
                            Resolve
                          </Button>
                        )}
                        {d.status !== "refunded" && (
                          <Button
                            onClick={() => handleUpdateStatus(d.id, "refunded")}
                            size="sm"
                            variant="outline"
                            className="text-[10px] font-bold h-7 px-2 border-border text-secondary"
                          >
                            Issue Refund
                          </Button>
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
