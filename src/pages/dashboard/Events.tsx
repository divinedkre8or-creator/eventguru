import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Calendar, MapPin, Users, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-emerald-500/10 text-emerald-500",
  cancelled: "bg-destructive/10 text-destructive",
  completed: "bg-primary/10 text-primary",
};

const Events = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["organiser-events", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, status, date, venue, city, ticket_types(id, price, quantity, sold)")
        .eq("organiser_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const filtered = events.filter((e: any) => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statuses = ["all", "draft", "published", "completed", "cancelled"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-extrabold text-foreground">Events</h1>
          <p className="text-muted-foreground text-sm font-body mt-1">Create and manage your events</p>
        </div>
        <Link to="/dashboard/events/create">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-heading font-bold">
            <Plus className="w-4 h-4 mr-1" /> Create Event
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-border text-foreground"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-heading font-bold capitalize whitespace-nowrap transition-colors ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl bg-card border border-border p-4 animate-pulse">
              <div className="h-32 bg-muted rounded-lg mb-3" />
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
          <h3 className="font-heading text-lg font-bold text-foreground mb-1">No events yet</h3>
          <p className="text-muted-foreground text-sm font-body mb-4">Create your first event to get started</p>
          <Link to="/dashboard/events/create">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-heading font-bold">
              <Plus className="w-4 h-4 mr-1" /> Create Event
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((event: any) => {
            const totalTickets = event.ticket_types?.reduce((sum: number, t: any) => sum + t.quantity, 0) || 0;
            const totalSold = event.ticket_types?.reduce((sum: number, t: any) => sum + t.sold, 0) || 0;

            return (
              <div key={event.id} className="relative block">
                <Link to={`/events/${event.id}`} className="block">
                <div className="rounded-xl bg-card border border-border overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group">
                  {event.image_url ? (
                    <div className="aspect-[16/9] overflow-hidden">
                      <img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    </div>
                  ) : (
                    <div className="aspect-[16/9] bg-muted flex items-center justify-center">
                      <Calendar className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-heading text-sm font-bold text-foreground truncate">{event.title}</h3>
                      <div className="flex items-center gap-1">
                        <span className={`px-2 py-0.5 mr-1 rounded-full text-[10px] font-heading font-bold uppercase tracking-wider shrink-0 ${statusColor[event.status] || statusColor.draft}`}>
                          {event.status}
                        </span>
                        <Link
                          to={`/dashboard/events/${event.id}/edit`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                          title="Edit Event"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                        </Link>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigator.clipboard.writeText(`${window.location.origin}/events/${event.id}`);
                            toast.success("Event link copied to clipboard!"); 
                          }}
                          className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                          title="Copy Event Link"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-body mb-1">
                      <Calendar className="w-3 h-3 shrink-0" />
                      <span className="truncate">{new Date(event.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                    {event.venue && (
                      <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-body mb-2">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{event.venue}{event.city ? `, ${event.city}` : ""}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span>{totalSold}/{totalTickets} sold</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Events;
