import { useState } from "react";
import { Users, Search, Download, CheckCircle2, XCircle, Clock, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  confirmed: { icon: CheckCircle2, color: "text-emerald-500", label: "Confirmed" },
  cancelled: { icon: XCircle, color: "text-destructive", label: "Cancelled" },
  pending: { icon: Clock, color: "text-primary", label: "Pending" },
};

const Attendees = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [checkinFilter, setCheckinFilter] = useState("all");

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ["organiser-registrations", user?.id],
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
      r.full_name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchCheckin =
      checkinFilter === "all" ||
      (checkinFilter === "checked-in" && r.checked_in) ||
      (checkinFilter === "not-checked-in" && !r.checked_in);
    return matchSearch && matchStatus && matchCheckin;
  });

  const totalAttendees = registrations.length;
  const checkedIn = registrations.filter((r: any) => r.checked_in).length;
  const confirmed = registrations.filter((r: any) => r.status === "confirmed").length;

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-extrabold text-foreground">Attendees</h1>
          <p className="text-muted-foreground text-sm font-medium mt-1">Manage registrations across all events</p>
        </div>
        <Button onClick={handleExport} disabled={filtered.length === 0} variant="ghost" className="border border-border text-foreground hover:bg-secondary font-heading font-bold text-sm">
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <div className="font-heading text-2xl font-extrabold text-primary">{totalAttendees}</div>
          <div className="text-muted-foreground text-xs font-medium mt-1">Total</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <div className="font-heading text-2xl font-extrabold text-emerald-500">{confirmed}</div>
          <div className="text-muted-foreground text-xs font-medium mt-1">Confirmed</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <div className="font-heading text-2xl font-extrabold text-blue-500">{checkedIn}</div>
          <div className="text-muted-foreground text-xs font-medium mt-1">Checked In</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-border text-foreground"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["all", "confirmed", "pending", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-heading font-bold capitalize whitespace-nowrap transition-colors ${
                statusFilter === s ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {s}
            </button>
          ))}
          <button
            onClick={() => setCheckinFilter(checkinFilter === "all" ? "checked-in" : checkinFilter === "checked-in" ? "not-checked-in" : "all")}
            className={`px-3 py-1.5 rounded-full text-xs font-heading font-bold whitespace-nowrap transition-colors ${
              checkinFilter !== "all" ? "bg-emerald-500 text-white" : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {checkinFilter === "all" ? "Check-in" : checkinFilter === "checked-in" ? "Checked In" : "Not Checked In"}
          </button>
        </div>
      </div>

      {/* Attendee List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
          <h3 className="font-heading text-lg font-bold text-foreground mb-1">No attendees found</h3>
          <p className="text-muted-foreground text-sm font-medium">Registrations will appear here once people sign up for your events</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((reg: any) => {
            const cfg = statusConfig[reg.status] || statusConfig.pending;
            const StatusIcon = cfg.icon;
            return (
              <div key={reg.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="font-heading text-sm font-bold text-primary">
                    {reg.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-heading text-sm font-bold text-foreground truncate">{reg.full_name}</div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium truncate">
                      <Mail className="w-3 h-3 shrink-0" /> {reg.email}
                    </span>
                    {reg.phone && (
                      <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground font-medium">
                        <Phone className="w-3 h-3 shrink-0" /> {reg.phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Event & Ticket */}
                <div className="hidden md:block text-right min-w-0">
                  <div className="text-xs text-muted-foreground font-medium truncate max-w-[150px]">{(reg.events as any)?.title}</div>
                  <div className="text-xs text-primary font-heading font-bold">
                    {(reg.ticket_types as any)?.name || "General"} 
                    <span className="text-muted-foreground font-medium font-normal"> • {reg.amount_paid > 0 ? `₦${reg.amount_paid.toLocaleString()}` : "Free"}</span>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2 shrink-0">
                  {reg.checked_in && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-heading font-bold uppercase tracking-wider">
                      In
                    </span>
                  )}
                  <StatusIcon className={`w-4 h-4 ${cfg.color}`} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Attendees;
