import { useState, useEffect } from "react";
import { Calendar, Search, ExternalLink, ShieldAlert, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface AdminEvent {
  id: string;
  title: string;
  category: string;
  status: string;
  date: string;
  venue: string;
  is_free: boolean;
  organiser_id: string;
  created_at: string;
  profiles?: { full_name: string };
}

const statusBadgeStyle: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  published: "bg-chart-green/10 text-chart-green border-chart-green/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
  completed: "bg-chart-blue/10 text-chart-blue border-chart-blue/30",
};

const AdminEvents = () => {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchAllEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, category, status, date, venue, is_free, organiser_id, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error("Failed to load admin events:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllEvents();
  }, []);

  const handleUpdateStatus = async (eventId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("events")
        .update({ status: newStatus })
        .eq("id", eventId);

      if (error) throw error;

      toast.success(`Event status updated to ${newStatus}`);
      fetchAllEvents();
    } catch (err: any) {
      toast.error(err.message || "Failed to update event status");
    }
  };

  const filtered = events.filter((e) => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase()) || e.category.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded inline-block mb-2 font-bold">
          SUPER ADMIN CONTROL
        </div>
        <h1 className="font-heading text-3xl font-black text-foreground tracking-tight">Platform Events</h1>
        <p className="text-muted-foreground text-xs font-medium mt-1">
          Monitor and manage all public and private events created across MyEventGuru.
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search events by title or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border text-xs h-10 rounded-lg"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {["all", "published", "draft", "cancelled", "completed"].map((st) => (
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

      {/* Events Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-medium">Fetching platform events…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card border border-dashed border-border rounded-lg space-y-2">
          <Calendar className="w-10 h-10 mx-auto text-muted-foreground/30" />
          <h3 className="font-heading text-base font-bold text-foreground">No events found</h3>
          <p className="text-xs text-muted-foreground">No events match the selected criteria.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Title</th>
                  <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Category</th>
                  <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Date</th>
                  <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Access</th>
                  <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 text-foreground text-xs font-bold truncate max-w-[220px]">
                      {e.title}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs uppercase font-mono">{e.category}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(e.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-foreground text-xs font-mono font-bold">
                      {e.is_free ? "Free" : "Paid"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${statusBadgeStyle[e.status] || statusBadgeStyle.draft}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link to={`/events/${e.id}`} target="_blank">
                          <Button variant="outline" size="icon" className="h-7 w-7 border-border text-muted-foreground hover:text-foreground" title="Preview Public Page">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </Link>

                        {e.status !== "published" ? (
                          <Button
                            onClick={() => handleUpdateStatus(e.id, "published")}
                            size="sm"
                            className="bg-chart-green/10 text-chart-green hover:bg-chart-green/20 text-[10px] font-bold h-7 px-2.5 rounded"
                          >
                            Approve / Publish
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleUpdateStatus(e.id, "cancelled")}
                            size="sm"
                            variant="destructive"
                            className="text-[10px] font-bold h-7 px-2.5 rounded"
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
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

export default AdminEvents;
