import { useState } from "react";
import { Users, Search, Download, CheckCircle2, XCircle, Clock, Mail, Phone, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const statusConfig: Record<string, { color: string; label: string }> = {
  confirmed: { color: "bg-chart-green/10 text-chart-green border-chart-green/30", label: "Confirmed" },
  completed: { color: "bg-chart-green/10 text-chart-green border-chart-green/30", label: "Completed" },
  cancelled: { color: "bg-destructive/10 text-destructive border-destructive/30", label: "Cancelled" },
  pending: { color: "bg-chart-orange/10 text-chart-orange border-chart-orange/30", label: "Pending" },
};

const Attendees = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [checkinFilter, setCheckinFilter] = useState("all");

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ["organiser-registrations-v2", user?.id],
    queryFn: async () => {
      const { data: events } = await supabase
        .from("events")
        .select("id")
        .eq("organiser_id", user!.id);

      if (!events || events.length === 0) return [];

      const eventIds = events.map((e: any) => e.id);
      const { data, error } = await supabase
        .from("registrations")
        .select("*, events(title), ticket_types(name)")
        .in("event_id", eventIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const filtered = registrations.filter((r: any) => {
    const matchSearch =
      r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.email?.toLowerCase().includes(search.toLowerCase()) ||
      r.payment_reference?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchCheckin =
      checkinFilter === "all" ||
      (checkinFilter === "checked-in" && r.checked_in) ||
      (checkinFilter === "not-checked-in" && !r.checked_in);
    return matchSearch && matchStatus && matchCheckin;
  });

  const totalAttendees = registrations.length;
  const checkedIn = registrations.filter((r: any) => r.checked_in).length;
  const confirmed = registrations.filter((r: any) => r.status === "confirmed" || r.status === "completed").length;

  const handleExport = () => {
    if (filtered.length === 0) return;
    const headers = ["Name", "Email", "Phone", "Event", "Ticket", "Amount Paid", "Payment Ref", "Status", "Checked In", "Date"];
    const rows = filtered.map((r: any) => [
      r.full_name,
      r.email,
      r.phone || "",
      (r.events as any)?.title || "",
      (r.ticket_types as any)?.name || "",
      r.amount_paid?.toString() || "0",
      r.payment_reference || "",
      r.status,
      r.checked_in ? "Yes" : "No",
      new Date(r.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((row) => row.map((v: string) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendees-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12 w-full min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6 w-full min-w-0">
        <div>
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-muted px-2.5 py-1 rounded inline-block mb-2 text-foreground">
            AUDIENCE & CRM
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-black text-foreground tracking-tight">Attendee Directory</h1>
          <p className="text-muted-foreground text-xs font-medium mt-1">Manage guest lists, tickets, and check-in statuses across all events</p>
        </div>
        <Button onClick={handleExport} disabled={filtered.length === 0} variant="outline" className="w-full sm:w-auto border-border text-foreground hover:bg-muted font-bold text-xs h-10 px-4 rounded-lg flex items-center justify-center gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full min-w-0">
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
          <div className="text-xs font-mono font-bold text-muted-foreground uppercase">TOTAL REGISTRATIONS</div>
          <div className="font-heading text-3xl font-black text-foreground mt-1">{totalAttendees.toLocaleString()}</div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
          <div className="text-xs font-mono font-bold text-muted-foreground uppercase">CONFIRMED GUESTS</div>
          <div className="font-heading text-3xl font-black text-chart-green mt-1">{confirmed.toLocaleString()}</div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
          <div className="text-xs font-mono font-bold text-muted-foreground uppercase">CHECKED IN ON SITE</div>
          <div className="font-heading text-3xl font-black text-chart-blue mt-1">{checkedIn.toLocaleString()}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between w-full min-w-0">
        <div className="relative w-full sm:w-96 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search full name, email, or order reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border text-xs h-10 rounded-lg w-full"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1.5 sm:pb-0 scrollbar-none max-w-full shrink-0">
          {["all", "confirmed", "completed", "pending"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold capitalize whitespace-nowrap border transition-all shrink-0 ${
                statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Attendees List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-card border border-border rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card border border-dashed border-border rounded-lg space-y-2">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/30" />
          <h3 className="font-heading text-base font-bold text-foreground">No attendees found</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">No guest records match your search criteria.</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm w-full min-w-0">
          <div className="overflow-x-auto w-full max-w-full">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-muted/50 border-b border-border font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 pl-4">Guest Name</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Event</th>
                  <th className="p-3.5">Ticket Tier</th>
                  <th className="p-3.5">Amount Paid</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 pr-4 text-right">Check-In</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((reg: any) => {
                  const cfg = statusConfig[reg.status] || statusConfig.pending;
                  return (
                    <tr key={reg.id} className="hover:bg-muted/40 transition-colors">
                      <td className="p-3.5 pl-4 font-bold text-foreground">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-[10px] shrink-0">
                            {reg.full_name?.charAt(0).toUpperCase()}
                          </div>
                          <span>{reg.full_name}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-muted-foreground">{reg.email}</td>
                      <td className="p-3.5 font-medium text-foreground truncate max-w-[180px]">{(reg.events as any)?.title || "—"}</td>
                      <td className="p-3.5 font-mono font-bold text-foreground">{(reg.ticket_types as any)?.name || "General"}</td>
                      <td className="p-3.5 font-mono text-foreground">{reg.amount_paid > 0 ? `₦${reg.amount_paid.toLocaleString()}` : "Free"}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="p-3.5 pr-4 text-right">
                        {reg.checked_in ? (
                          <span className="bg-chart-green text-white px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase">
                            Checked In
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[10px] font-mono font-bold uppercase">
                            Not Checked In
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendees;

