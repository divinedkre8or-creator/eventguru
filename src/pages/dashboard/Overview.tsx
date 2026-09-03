import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  CalendarDays, Users, Wallet, ScanLine, ArrowUpRight, Loader2, PlusCircle, 
  Ticket, Megaphone, Image as ImageIcon, Download, MessageSquare, ArrowRight,
  ExternalLink, Calendar, MapPin, CheckCircle2, ChevronRight
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import AttendeeOverview from "./AttendeeOverview";

const Overview = () => {
  const { user, profile, roles } = useAuth();

  // If user is strictly an attendee, render the Attendee Portal
  const isOrganiserOrAdmin = roles.includes("organiser") || roles.includes("admin");
  if (!isOrganiserOrAdmin) {
    return <AttendeeOverview />;
  }

  const fullName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Organizer";
  const firstName = fullName.split(" ")[0];

  const { data, isLoading } = useQuery({
    queryKey: ["organiser-overview-v2", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Fetch organizer events
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("*, ticket_types(id, name, price, quantity, sold)")
        .eq("organiser_id", user.id)
        .order("created_at", { ascending: false });

      if (eventsError) throw eventsError;

      const eventIds = events.map(e => e.id);

      // Fetch registrations across these events
      let registrations: any[] = [];
      if (eventIds.length > 0) {
        const { data: regs, error: regsError } = await supabase
          .from("registrations")
          .select("*, events(title, category, date), ticket_types(name)")
          .in("event_id", eventIds)
          .order("created_at", { ascending: false });

        if (regsError) throw regsError;
        registrations = regs || [];
      }

      const totalEvents = events.length;
      const totalAttendees = registrations.length;
      const totalRevenue = registrations.reduce((sum, r) => sum + (r.amount_paid || 0), 0);
      const totalCheckins = registrations.filter(r => r.checked_in).length;

      // Tickets total calculation
      let totalTicketsSold = 0;
      events.forEach(e => {
        e.ticket_types?.forEach((t: any) => {
          totalTicketsSold += t.sold || 0;
        });
      });

      return {
        events,
        registrations,
        stats: {
          totalEvents,
          totalAttendees,
          totalRevenue,
          totalCheckins,
          totalTicketsSold
        }
      };
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-3">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
        <p className="text-muted-foreground text-xs font-mono">Loading dashboard metrics...</p>
      </div>
    );
  }

  const stats = data?.stats || { totalEvents: 0, totalAttendees: 0, totalRevenue: 0, totalCheckins: 0, totalTicketsSold: 0 };
  const eventsList = data?.events || [];
  const featuredEvent = eventsList[0] || null;
  const recentRegistrations = (data?.registrations || []).slice(0, 5);

  const kpiCards = [
    {
      title: "Total Revenue",
      value: `₦${stats.totalRevenue.toLocaleString()}`,
      change: "",
      period: "All time",
      accentColor: "stroke-chart-green text-chart-green",
      svgPath: "M0 40 L20 30 L40 45 L60 20 L80 35 L100 15",
    },
    {
      title: "Total Attendees",
      value: stats.totalAttendees.toLocaleString(),
      change: "",
      period: "All time",
      accentColor: "stroke-chart-blue text-chart-blue",
      svgPath: "M0 45 L25 25 L50 35 L75 15 L100 5",
    },
    {
      title: "Tickets Sold",
      value: stats.totalTicketsSold > 0 ? stats.totalTicketsSold.toLocaleString() : stats.totalAttendees.toLocaleString(),
      change: "",
      period: "All time",
      accentColor: "stroke-chart-orange text-chart-orange",
      svgPath: "M0 30 L30 40 L60 10 L80 25 L100 5",
    },
    {
      title: "Active Events",
      value: stats.totalEvents.toString(),
      change: "Live",
      period: `Across ${new Set(eventsList.map(e => e.category)).size || 1} categories`,
      accentColor: "stroke-chart-purple text-chart-purple",
      svgPath: null,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-muted px-2.5 py-1 rounded inline-block mb-2 text-foreground">
            OVERVIEW
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-foreground tracking-tight">
            Welcome back, {firstName}.
          </h1>
          <p className="text-muted-foreground text-xs font-medium mt-1">
            Here's what's happening across your events and ticket sales.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-card border border-border px-3.5 py-2 rounded-lg text-xs font-medium shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Today, {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          </div>
        </div>
      </div>

      {/* KPI Row (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, idx) => (
          <div key={idx} className="bg-card border border-border rounded-lg p-5 flex flex-col justify-between h-[124px] relative overflow-hidden shadow-sm hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                {kpi.title}
              </span>
            </div>
            <div>
              <div className="font-heading text-2xl font-black text-foreground tracking-tight">
                {kpi.value}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`text-xs font-bold flex items-center ${kpi.accentColor}`}>
                  <ArrowUpRight className="w-3 h-3" /> {kpi.change}
                </span>
                <span className="text-[11px] text-muted-foreground">{kpi.period}</span>
              </div>
            </div>

            {/* Micro Sparkline */}
            {kpi.svgPath ? (
              <div className="absolute bottom-4 right-4 w-20 h-10 opacity-50">
                <svg className={`w-full h-full ${kpi.accentColor} fill-none stroke-[2]`} viewBox="0 0 100 50">
                  <path d={kpi.svgPath} />
                </svg>
              </div>
            ) : (
              <div className="absolute bottom-4 right-4 flex items-end gap-1 h-8">
                <div className="w-3.5 bg-chart-purple/30 h-[40%] rounded-xs"></div>
                <div className="w-3.5 bg-chart-purple/50 h-[60%] rounded-xs"></div>
                <div className="w-3.5 bg-chart-purple/80 h-[100%] rounded-xs"></div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Main Grid: Left Column (Span 8) & Right Column (Span 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (Span 8) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Featured Event Banner */}
          {featuredEvent ? (
            <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col sm:flex-row shadow-sm min-h-[300px]">
              <div className="sm:w-[48%] p-6 flex flex-col justify-between space-y-4">
                <div>
                  <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    FEATURED EVENT
                  </div>
                  <h2 className="font-heading text-2xl sm:text-3xl font-black text-foreground leading-tight">
                    {featuredEvent.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-3">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(featuredEvent.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5 truncate max-w-[150px]">
                      <MapPin className="w-3.5 h-3.5" />
                      {featuredEvent.venue || featuredEvent.city || "Venue TBA"}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-2">
                  <Link to={`/dashboard/events/${featuredEvent.id}/edit`}>
                    <Button size="sm" className="bg-primary text-primary-foreground text-xs font-bold h-9 px-4 rounded-lg flex items-center gap-1.5">
                      Manage Event <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                  <Link to={`/events/${featuredEvent.id}`} target="_blank">
                    <Button variant="outline" size="sm" className="text-xs font-medium h-9 px-3 border-border rounded-lg flex items-center gap-1.5">
                      View Page <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Event Image Side */}
              <div className="sm:w-[52%] bg-muted relative min-h-[200px] sm:min-h-full">
                {featuredEvent.image_url ? (
                  <img src={featuredEvent.image_url} alt={featuredEvent.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted/60 text-muted-foreground text-xs font-mono">
                    Event Banner
                  </div>
                )}
                <div className="absolute top-4 right-4 bg-primary/90 text-primary-foreground text-[10px] font-mono font-bold px-2.5 py-1 rounded flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-chart-green animate-pulse"></span>
                  {featuredEvent.status?.toUpperCase() || "PUBLISHED"}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-dashed border-border rounded-lg p-8 text-center space-y-3">
              <CalendarDays className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <h3 className="font-heading text-lg font-bold text-foreground">No events created yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">Create your first event to start accepting registrations and ticket sales.</p>
              <Link to="/dashboard/events/create">
                <Button size="sm" className="bg-primary text-primary-foreground text-xs font-bold mt-2">
                  <PlusCircle className="w-4 h-4 mr-2" /> Create First Event
                </Button>
              </Link>
            </div>
          )}

          {/* Top Events List */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">YOUR EVENTS</h3>
              <Link to="/dashboard/events" className="text-secondary text-xs font-bold hover:underline">
                View all ({eventsList.length})
              </Link>
            </div>

            {eventsList.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4">No events found.</p>
            ) : (
              <div className="divide-y divide-border/60">
                {eventsList.slice(0, 4).map((e: any) => {
                  const totalTickets = e.ticket_types?.reduce((sum: number, t: any) => sum + (t.quantity || 0), 0) || 0;
                  const totalSold = e.ticket_types?.reduce((sum: number, t: any) => sum + (t.sold || 0), 0) || 0;

                  return (
                    <div key={e.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center text-xs font-mono">
                          {e.image_url ? (
                            <img src={e.image_url} alt={e.title} className="w-full h-full object-cover" />
                          ) : (
                            <CalendarDays className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs text-foreground truncate">{e.title}</h4>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {new Date(e.date).toLocaleDateString()} • <span className="capitalize">{e.category?.replace("-", " ")}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-xs text-foreground">{totalSold} / {totalTickets > 0 ? totalTickets : "∞"}</div>
                        <div className="text-[10px] text-muted-foreground">Tickets Sold</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Right Column (Span 4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Quick Actions Grid */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">QUICK ACTIONS</h3>
            
            <div className="grid grid-cols-2 gap-2">
              <Link to="/dashboard/events/create">
                <Button variant="outline" size="sm" className="w-full h-11 text-xs font-bold justify-start bg-secondary/10 border-secondary/30 text-secondary hover:bg-secondary/20">
                  <PlusCircle className="w-4 h-4 mr-2" /> Create Event
                </Button>
              </Link>
              
              <Link to="/dashboard/tickets">
                <Button variant="outline" size="sm" className="w-full h-11 text-xs font-medium justify-start bg-background border-border text-foreground hover:bg-muted">
                  <Ticket className="w-4 h-4 mr-2 text-muted-foreground" /> Add Ticket
                </Button>
              </Link>

              <Link to="/dashboard/checkin">
                <Button variant="outline" size="sm" className="w-full h-11 text-xs font-medium justify-start bg-background border-border text-foreground hover:bg-muted">
                  <ScanLine className="w-4 h-4 mr-2 text-muted-foreground" /> Check-In
                </Button>
              </Link>

              <Link to="/dashboard/dp">
                <Button variant="outline" size="sm" className="w-full h-11 text-xs font-medium justify-start bg-background border-border text-foreground hover:bg-muted">
                  <ImageIcon className="w-4 h-4 mr-2 text-muted-foreground" /> Generate DP
                </Button>
              </Link>

              <Link to="/dashboard/attendees">
                <Button variant="outline" size="sm" className="w-full h-11 text-xs font-medium justify-start bg-background border-border text-foreground hover:bg-muted">
                  <Users className="w-4 h-4 mr-2 text-muted-foreground" /> Attendees
                </Button>
              </Link>

              <Link to="/dashboard/campaigns">
                <Button variant="outline" size="sm" className="w-full h-11 text-xs font-medium justify-start bg-background border-border text-foreground hover:bg-muted">
                  <Megaphone className="w-4 h-4 mr-2 text-muted-foreground" /> Campaign
                </Button>
              </Link>
            </div>
          </div>

          {/* Live Check-In Widget */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">LIVE CHECK-IN</h3>
              <div className="bg-chart-green/10 text-chart-green px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-chart-green animate-pulse"></span> Live
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="font-heading text-3xl font-black text-foreground">{stats.totalCheckins}</span>
              <span className="text-xs text-muted-foreground">Checked in to date</span>
            </div>

            <div className="w-full h-2 bg-muted rounded-full overflow-hidden flex">
              <div className="h-full bg-primary" style={{ width: `${stats.totalAttendees > 0 ? (stats.totalCheckins / stats.totalAttendees) * 100 : 0}%` }}></div>
            </div>

            <Link to="/dashboard/checkin">
              <Button size="sm" className="w-full bg-primary text-primary-foreground font-bold text-xs h-10 rounded-lg flex items-center justify-center gap-2">
                <ScanLine className="w-4 h-4" /> Open Rapid Check-In
              </Button>
            </Link>
          </div>

          {/* Recent Attendee Activity */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">RECENT REGISTRATIONS</h3>
              <Link to="/dashboard/attendees" className="text-secondary text-xs font-bold hover:underline">
                All
              </Link>
            </div>

            {recentRegistrations.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">No registrations yet.</p>
            ) : (
              <div className="divide-y divide-border/60">
                {recentRegistrations.map((r: any, idx: number) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-foreground truncate">{r.full_name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{(r.events as any)?.title}</div>
                    </div>
                    <div className="text-[10px] text-muted-foreground shrink-0 ml-2">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

export default Overview;

