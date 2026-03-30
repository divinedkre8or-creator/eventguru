import { CalendarDays, Users, Wallet, ScanLine, TrendingUp, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

const Overview = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["organiser-overview", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Fetch all events by organizer
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("*, ticket_types(quantity, sold)")
        .eq("organiser_id", user.id)
        .order("created_at", { ascending: false });

      if (eventsError) throw eventsError;

      const eventIds = events.map(e => e.id);

      // Fetch all registrations across these events
      let registrations: any[] = [];
      if (eventIds.length > 0) {
        const { data: regs, error: regsError } = await supabase
          .from("registrations")
          .select("*, events(title)")
          .in("event_id", eventIds)
          .order("created_at", { ascending: false });

        if (regsError) throw regsError;
        registrations = regs || [];
      }

      const totalEvents = events.length;
      const totalAttendees = registrations.length;
      const totalRevenue = registrations.reduce((sum, r) => sum + (r.amount_paid || 0), 0);
      const totalCheckins = registrations.filter(r => r.checked_in).length;

      return {
        events,
        registrations,
        stats: {
          totalEvents,
          totalAttendees,
          totalRevenue,
          totalCheckins
        }
      };
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-amber" />
        <p className="text-muted-foreground font-body">Loading dashboard data...</p>
      </div>
    );
  }

  const stats = data?.stats || { totalEvents: 0, totalAttendees: 0, totalRevenue: 0, totalCheckins: 0 };
  const recentRegistrations = (data?.registrations || []).slice(0, 5);
  const upcomingEvents = (data?.events || []).slice(0, 5);

  const statCards = [
    { label: "Total Events", value: stats.totalEvents, icon: CalendarDays, color: "text-amber" },
    { label: "Total Attendees", value: stats.totalAttendees.toLocaleString(), icon: Users, color: "text-teal" },
    { label: "Revenue", value: `₦${stats.totalRevenue.toLocaleString()}`, icon: Wallet, color: "text-amber" },
    { label: "Check-ins", value: stats.totalCheckins.toLocaleString(), icon: ScanLine, color: "text-teal" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-xl font-800 text-foreground">Overview</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between mb-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <TrendingUp className="w-3 h-3 text-teal" />
            </div>
            <div className={`font-heading text-lg md:text-xl font-800 ${s.color} truncate`}>{s.value}</div>
            <div className="text-muted-foreground text-[11px] font-body mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Registrations */}
        <div className="rounded-xl bg-card border border-border p-5">
          <h2 className="font-heading text-sm font-700 text-foreground mb-4">Recent Registrations</h2>
          <div className="space-y-4">
            {recentRegistrations.length === 0 ? (
              <p className="text-muted-foreground text-xs italic font-body">No registrations yet.</p>
            ) : (
              recentRegistrations.map((r, i) => (
                <div key={i} className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="text-foreground text-sm font-heading font-700 truncate">{r.full_name}</div>
                    <div className="text-muted-foreground text-xs font-body truncate">{(r.events as any)?.title}</div>
                  </div>
                  <span className="text-muted-foreground text-[10px] font-body shrink-0 ml-2">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="rounded-xl bg-card border border-border p-5">
          <h2 className="font-heading text-sm font-700 text-foreground mb-4">Your Recent Events</h2>
          <div className="space-y-4">
            {upcomingEvents.length === 0 ? (
              <p className="text-muted-foreground text-xs italic font-body">No events created yet.</p>
            ) : (
              upcomingEvents.map((e, i) => {
                const totalTickets = e.ticket_types?.reduce((sum: number, t: any) => sum + t.quantity, 0) || 0;
                const totalSold = e.ticket_types?.reduce((sum: number, t: any) => sum + t.sold, 0) || 0;
                const pct = totalTickets > 0 ? (totalSold / totalTickets) * 100 : 0;

                return (
                  <div key={i} className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <div className="text-foreground text-sm font-heading font-700 truncate">{e.title}</div>
                      <div className="text-muted-foreground text-[10px] font-body">{new Date(e.date).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right shrink-0 ml-2 w-24">
                      <div className="text-amber text-xs font-heading font-700 mb-1">{totalSold}/{totalTickets}</div>
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-amber transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
