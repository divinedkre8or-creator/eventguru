import { useState } from "react";
import { Link } from "react-router-dom";
import { PlusCircle, Calendar, MapPin, Users, Search, Edit3, Copy, ExternalLink, Image, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getEventUrl } from "@/lib/slugUtils";

const statusBadgeStyle: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  published: "bg-chart-green/10 text-chart-green border-chart-green/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
  completed: "bg-chart-blue/10 text-chart-blue border-chart-blue/30",
};

const Events = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["organiser-events-v2", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, status, date, venue, city, image_url, category, ticket_types(id, price, quantity, sold)")
        .eq("organiser_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const filtered = events.filter((e: any) => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statuses = ["all", "published", "draft", "completed", "cancelled"];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-muted px-2.5 py-1 rounded inline-block mb-2 text-foreground">
            MY EVENTS
          </div>
          <h1 className="font-heading text-3xl font-black text-foreground tracking-tight">Event Directory</h1>
          <p className="text-muted-foreground text-xs font-medium mt-1">Manage your active, draft, and completed events</p>
        </div>
        <Link to="/dashboard/events/create">
          <Button className="bg-primary text-primary-foreground font-bold text-xs h-10 px-4 rounded-lg hover:opacity-90 flex items-center gap-1.5 shadow-sm">
            <PlusCircle className="w-4 h-4" /> Create Event
          </Button>
        </Link>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search events by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border text-xs h-10 rounded-lg"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold capitalize whitespace-nowrap border transition-all ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* DP Generator Organiser Prompt Banner */}
      <div className="bg-gradient-to-r from-secondary/15 via-primary/10 to-secondary/10 border border-secondary/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center shrink-0 font-bold">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold text-foreground">Boost Event Virality with DP Generator</h3>
            <p className="text-xs text-muted-foreground">Attach a custom photo frame to your event so registered attendees generate branded profile pictures automatically.</p>
          </div>
        </div>
        <Link to="/dashboard/dp">
          <Button size="sm" className="bg-secondary text-secondary-foreground font-bold text-xs h-9 px-4 rounded-lg shrink-0 hover:opacity-90">
            Create DP Frame →
          </Button>
        </Link>
      </div>

      {/* Grid of Event Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg bg-card border border-border p-4 animate-pulse space-y-3">
              <div className="h-40 bg-muted rounded-md" />
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card border border-dashed border-border rounded-lg space-y-3">
          <Calendar className="w-10 h-10 mx-auto text-muted-foreground/30" />
          <h3 className="font-heading text-base font-bold text-foreground">No events found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">No events match your search criteria. Create a new event to get started.</p>
          <Link to="/dashboard/events/create">
            <Button size="sm" className="bg-primary text-primary-foreground font-bold text-xs mt-2">
              <PlusCircle className="w-4 h-4 mr-1.5" /> Create Event
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((event: any) => {
            const totalTickets = event.ticket_types?.reduce((sum: number, t: any) => sum + (t.quantity || 0), 0) || 0;
            const totalSold = event.ticket_types?.reduce((sum: number, t: any) => sum + (t.sold || 0), 0) || 0;

            return (
              <div key={event.id} className="bg-card border border-border rounded-lg overflow-hidden flex flex-col justify-between hover:border-primary/40 transition-colors shadow-sm group">
                <div>
                  <div className="relative aspect-[16/9] bg-muted overflow-hidden">
                    {event.image_url ? (
                      <img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-mono">
                        No Banner
                      </div>
                    )}
                    <div className={`absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-mono font-bold border uppercase tracking-wider ${statusBadgeStyle[event.status] || statusBadgeStyle.draft}`}>
                      {event.status}
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground tracking-wider">
                        {event.category?.replace("-", " ")}
                      </span>
                      <h3 className="font-heading text-base font-bold text-foreground truncate mt-0.5">{event.title}</h3>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>{new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                      {event.venue && (
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{event.venue}{event.city ? `, ${event.city}` : ""}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0 space-y-3">
                  <div className="flex items-center justify-between pt-3 border-t border-border text-xs">
                    <span className="text-muted-foreground font-medium">Tickets Sold</span>
                    <span className="font-mono font-bold text-foreground">{totalSold} / {totalTickets > 0 ? totalTickets : "∞"}</span>
                  </div>

                  {/* DP Setup Shortcut Link */}
                  <Link to={`/dashboard/dp?event_id=${event.id}`} className="block">
                    <div className="w-full bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/30 text-[11px] font-bold py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-colors">
                      <Image className="w-3.5 h-3.5" /> Setup DP Generator Frame
                    </div>
                  </Link>

                  <div className="flex items-center gap-2">
                    <Link to={`/dashboard/events/${event.id}/edit`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-xs font-bold h-9 border-border justify-center">
                        <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit
                      </Button>
                    </Link>
                    <Link to={getEventUrl(event)} target="_blank">
                      <Button variant="outline" size="icon" className="h-9 w-9 border-border text-muted-foreground hover:text-foreground" title="View Public Event Page">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-9 w-9 border-border text-muted-foreground hover:text-foreground" 
                      title="Copy Public Link"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}${getEventUrl(event)}`);
                        toast.success("Event link copied!");
                      }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Events;

