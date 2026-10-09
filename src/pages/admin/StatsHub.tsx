import { useState, useEffect, useRef } from "react";
import {
  Activity, Shield, Wallet, CalendarDays, Users, Ticket,
  Clock, ArrowUpRight, CheckCircle2, RefreshCw, Loader2,
  TrendingUp, Zap, Radio, BarChart3, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface AdminRealtimeStats {
  total_gmv: number;
  today_gmv: number;
  total_tickets: number;
  today_tickets: number;
  total_organisers: number;
  total_attendees: number;
  total_events: number;
  published_events: number;
  total_checkins: number;
  checkin_rate_pct: number;
  estimated_fees: number;
}

interface ActivityFeedItem {
  id: string;
  type: "TICKET_PURCHASE" | "CHECK_IN_CONFIRMED" | "EVENT_PUBLISHED";
  timestamp: string;
  title: string;
  details: string;
  amount?: number;
}

interface TopEvent {
  id: string;
  title: string;
  organiser_name: string;
  total_revenue: number;
  tickets_sold: number;
}

export const StatsHub = () => {
  const [stats, setStats] = useState<AdminRealtimeStats>({
    total_gmv: 0,
    today_gmv: 0,
    total_tickets: 0,
    today_tickets: 0,
    total_organisers: 0,
    total_attendees: 0,
    total_events: 0,
    published_events: 0,
    total_checkins: 0,
    checkin_rate_pct: 0,
    estimated_fees: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [topEvents, setTopEvents] = useState<TopEvent[]>([]);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  // Fetch initial batch of metrics
  const fetchStats = async () => {
    try {
      // 1. Attempt server-side RPC first
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "get_admin_realtime_stats" as any
      );

      if (!rpcError && rpcData) {
        setStats(rpcData as AdminRealtimeStats);
      } else {
        // Fallback: Direct database queries if RPC is not deployed yet
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);

        const [orgRes, attRes, evtsRes, pubEvtsRes, regsRes, todayRegsRes, checkinsRes] =
          await Promise.all([
            supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "organiser"),
            supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "attendee"),
            supabase.from("events").select("*", { count: "exact", head: true }),
            supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "published"),
            supabase.from("registrations").select("amount_paid"),
            supabase.from("registrations").select("amount_paid").gte("created_at", todayStart.toISOString()),
            supabase.from("registrations").select("*", { count: "exact", head: true }).eq("checked_in", true),
          ]);

        const totalGmv = (regsRes.data || []).reduce((sum, r) => sum + (Number(r.amount_paid) || 0), 0);
        const todayGmv = (todayRegsRes.data || []).reduce((sum, r) => sum + (Number(r.amount_paid) || 0), 0);
        const totalTickets = regsRes.data?.length || 0;
        const totalCheckins = checkinsRes.count || 0;
        const checkinRate = totalTickets > 0 ? Number(((totalCheckins / totalTickets) * 100).toFixed(1)) : 0;

        setStats({
          total_gmv: totalGmv,
          today_gmv: todayGmv,
          total_tickets: totalTickets,
          today_tickets: todayRegsRes.data?.length || 0,
          total_organisers: orgRes.count || 0,
          total_attendees: attRes.count || 0,
          total_events: evtsRes.count || 0,
          published_events: pubEvtsRes.count || 0,
          total_checkins: totalCheckins,
          checkin_rate_pct: checkinRate,
          estimated_fees: Math.round(totalGmv * 0.035),
        });
      }

      // Fetch top grossing events
      const { data: eventsData } = await supabase
        .from("events")
        .select("id, title, organiser_id")
        .limit(20);

      if (eventsData && eventsData.length > 0) {
        const evtIds = eventsData.map((e) => e.id);
        const { data: regRows } = await supabase
          .from("registrations")
          .select("event_id, amount_paid")
          .in("event_id", evtIds);

        const mapped: TopEvent[] = eventsData
          .map((evt) => {
            const matchedRegs = (regRows || []).filter((r) => r.event_id === evt.id);
            const revenue = matchedRegs.reduce((sum, r) => sum + (Number(r.amount_paid) || 0), 0);
            return {
              id: evt.id,
              title: evt.title,
              organiser_name: "Event Creator",
              total_revenue: revenue,
              tickets_sold: matchedRegs.length,
            };
          })
          .sort((a, b) => b.total_revenue - a.total_revenue)
          .slice(0, 5);

        setTopEvents(mapped);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load statistics hub metrics:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // 30-second background polling safety fallback
    const pollTimer = setInterval(() => {
      fetchStats();
    }, 30_000);

    // Setup Supabase Realtime Channel
    const channel = supabase
      .channel("admin-live-pulse")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "registrations" },
        (payload: any) => {
          const newRow = payload.new;
          const timeStr = new Date().toLocaleTimeString("en-GB", { hour12: false });
          const amount = Number(newRow?.amount_paid) || 0;

          // Prepend activity
          const item: ActivityFeedItem = {
            id: newRow.id || String(Date.now()),
            type: "TICKET_PURCHASE",
            timestamp: timeStr,
            title: "TICKET_PURCHASE",
            details: `Registration confirmed: ${newRow.full_name || "Guest"} · Ref: ${newRow.payment_reference || "N/A"}`,
            amount,
          };

          setActivities((prev) => [item, ...prev.slice(0, 49)]);

          // Optimistically update live metrics
          setStats((prev) => ({
            ...prev,
            total_gmv: prev.total_gmv + amount,
            today_gmv: prev.today_gmv + amount,
            total_tickets: prev.total_tickets + 1,
            today_tickets: prev.today_tickets + 1,
          }));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "registrations" },
        (payload: any) => {
          const updated = payload.new;
          if (updated?.checked_in) {
            const timeStr = new Date().toLocaleTimeString("en-GB", { hour12: false });
            const item: ActivityFeedItem = {
              id: `${updated.id}-checkin-${Date.now()}`,
              type: "CHECK_IN_CONFIRMED",
              timestamp: timeStr,
              title: "CHECK_IN_CONFIRMED",
              details: `Door scan verified: ${updated.full_name || "Attendee"} · ${updated.payment_reference || "Ticket"}`,
            };
            setActivities((prev) => [item, ...prev.slice(0, 49)]);

            setStats((prev) => ({
              ...prev,
              total_checkins: prev.total_checkins + 1,
            }));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "events" },
        (payload: any) => {
          const newEvent = payload.new;
          const timeStr = new Date().toLocaleTimeString("en-GB", { hour12: false });
          const item: ActivityFeedItem = {
            id: newEvent.id || String(Date.now()),
            type: "EVENT_PUBLISHED",
            timestamp: timeStr,
            title: "EVENT_PUBLISHED",
            details: `New event added: ${newEvent.title} (${newEvent.category || "Conference"})`,
          };
          setActivities((prev) => [item, ...prev.slice(0, 49)]);

          setStats((prev) => ({
            ...prev,
            total_events: prev.total_events + 1,
            published_events: newEvent.status === "published" ? prev.published_events + 1 : prev.published_events,
          }));
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeConnected(true);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeConnected(false);
        }
      });

    return () => {
      clearInterval(pollTimer);
      supabase.removeChannel(channel);
    };
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Top Header */}
      <div className="border-b border-border pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded inline-flex items-center gap-1.5 mb-2">
            <Shield className="w-3 h-3" />
            <span>OPERATIONAL METRICS</span>
          </div>
          <h1 className="font-heading text-3xl font-black text-foreground tracking-tight">
            Realtime Statistics Hub
          </h1>
          <p className="text-muted-foreground text-xs font-medium mt-1">
            Live platform metrics, ticket purchase velocity, and door check-in ledger.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection Status Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                realtimeConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span className="font-bold text-foreground">
              {realtimeConnected ? "LIVE PULSE ACTIVE" : "SYNCING FALLBACK"}
            </span>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="text-xs font-semibold border-border gap-1.5 h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-medium">Computing platform metrics…</p>
        </div>
      ) : (
        <>
          {/* Primary High-Density Number Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: GMV */}
            <div className="p-4 rounded-xl bg-card border border-border shadow-xs border-l-4 border-l-chart-green">
              <div className="text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>GROSS MERCHANDISE VOL</span>
                <Wallet className="w-3.5 h-3.5 text-chart-green" />
              </div>
              <div className="font-heading text-2xl font-black text-chart-green truncate">
                ₦{stats.total_gmv.toLocaleString()}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-mono">
                <span>Today: ₦{stats.today_gmv.toLocaleString()}</span>
              </div>
            </div>

            {/* Card 2: Tickets Sold */}
            <div className="p-4 rounded-xl bg-card border border-border shadow-xs border-l-4 border-l-chart-blue">
              <div className="text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>TOTAL TICKETS SOLD</span>
                <Ticket className="w-3.5 h-3.5 text-chart-blue" />
              </div>
              <div className="font-heading text-2xl font-black text-chart-blue">
                {stats.total_tickets.toLocaleString()}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-mono">
                <span>Today: {stats.today_tickets.toLocaleString()} tickets</span>
              </div>
            </div>

            {/* Card 3: Platform Accounts */}
            <div className="p-4 rounded-xl bg-card border border-border shadow-xs border-l-4 border-l-chart-orange">
              <div className="text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>TOTAL PLATFORM USERS</span>
                <Users className="w-3.5 h-3.5 text-chart-orange" />
              </div>
              <div className="font-heading text-2xl font-black text-chart-orange">
                {(stats.total_organisers + stats.total_attendees).toLocaleString()}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1 font-mono">
                {stats.total_organisers} Organisers · {stats.total_attendees} Attendees
              </div>
            </div>

            {/* Card 4: Check-in Attendance */}
            <div className="p-4 rounded-xl bg-card border border-border shadow-xs border-l-4 border-l-chart-purple">
              <div className="text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>DOOR CHECK-IN RATE</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-chart-purple" />
              </div>
              <div className="font-heading text-2xl font-black text-chart-purple">
                {stats.checkin_rate_pct}%
              </div>
              <div className="text-[11px] text-muted-foreground mt-1 font-mono">
                {stats.total_checkins.toLocaleString()} attendees verified at door
              </div>
            </div>
          </div>

          {/* Secondary Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground font-medium">Published Events</div>
                <div className="font-heading text-xl font-black text-foreground mt-0.5">
                  {stats.published_events} <span className="text-xs text-muted-foreground font-normal">/ {stats.total_events} total</span>
                </div>
              </div>
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>

            <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground font-medium">Estimated Platform Revenue</div>
                <div className="font-heading text-xl font-black text-chart-green mt-0.5">
                  ₦{stats.estimated_fees.toLocaleString()}
                </div>
              </div>
              <TrendingUp className="w-5 h-5 text-chart-green" />
            </div>

            <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground font-medium">Average Order Value</div>
                <div className="font-heading text-xl font-black text-foreground mt-0.5">
                  ₦{stats.total_tickets > 0 ? Math.round(stats.total_gmv / stats.total_tickets).toLocaleString() : 0}
                </div>
              </div>
              <BarChart3 className="w-5 h-5 text-chart-purple" />
            </div>
          </div>

          {/* Main Layout: Live Activity Console + Top Grossing Leaderboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Activity Console (2 Cols) */}
            <div className="lg:col-span-2 rounded-xl bg-card border border-border overflow-hidden shadow-xs flex flex-col">
              <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                    Live Platform Stream (Realtime)
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Auto-sync active
                </span>
              </div>

              <div className="p-4 font-mono text-xs max-h-[380px] min-h-[260px] overflow-y-auto space-y-2 bg-background/50">
                {activities.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground space-y-1">
                    <Clock className="w-6 h-6 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="font-semibold text-xs">Waiting for live platform activities…</p>
                    <p className="text-[11px]">New ticket purchases, door check-ins, and published events will appear here in real-time.</p>
                  </div>
                ) : (
                  activities.map((act) => (
                    <div
                      key={act.id}
                      className="p-2.5 rounded-lg bg-card border border-border/70 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">[{act.timestamp}]</span>
                          <span
                            className={`font-bold text-[11px] ${
                              act.type === "TICKET_PURCHASE"
                                ? "text-chart-green"
                                : act.type === "CHECK_IN_CONFIRMED"
                                ? "text-chart-purple"
                                : "text-chart-blue"
                            }`}
                          >
                            {act.title}
                          </span>
                        </div>
                        <div className="text-foreground text-[11px] font-sans">{act.details}</div>
                      </div>

                      {act.amount !== undefined && act.amount > 0 && (
                        <div className="font-bold text-chart-green shrink-0 font-mono">
                          +₦{act.amount.toLocaleString()}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Grossing Events Table (1 Col) */}
            <div className="rounded-xl bg-card border border-border overflow-hidden shadow-xs flex flex-col">
              <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                  Top Events by Sales
                </h2>
                <Badge variant="outline" className="text-[10px] font-mono">Gross</Badge>
              </div>

              <div className="divide-y divide-border flex-1 overflow-y-auto">
                {topEvents.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No event sales recorded yet.
                  </div>
                ) : (
                  topEvents.map((evt, idx) => (
                    <div key={evt.id} className="p-3.5 hover:bg-muted/20 transition-colors flex items-center justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] text-muted-foreground font-bold">#{idx + 1}</span>
                          <div className="font-bold text-xs text-foreground truncate">{evt.title}</div>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {evt.tickets_sold} tickets sold
                        </div>
                      </div>

                      <div className="font-mono font-bold text-xs text-foreground shrink-0 text-right">
                        ₦{evt.total_revenue.toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StatsHub;
