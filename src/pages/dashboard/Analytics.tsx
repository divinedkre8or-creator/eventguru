import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Users, Wallet, CheckCircle2, Download, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EventOption {
  id: string;
  title: string;
}

interface TicketBreakdown {
  name: string;
  price: number;
  quantity: number;
  sold: number;
}

const Analytics = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // Analytics Metrics
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalRegistrations, setTotalRegistrations] = useState(0);
  const [totalCheckedIn, setTotalCheckedIn] = useState(0);
  const [ticketBreakdowns, setTicketBreakdowns] = useState<TicketBreakdown[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    const fetchEvents = async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title")
        .eq("organiser_id", user.id);
      if (data) setEvents(data);
    };
    fetchEvents();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        // Fetch event IDs for this organiser
        const { data: orgEvents } = await supabase
          .from("events")
          .select("id")
          .eq("organiser_id", user.id);

        const allEventIds = (orgEvents || []).map((e) => e.id);
        const targetEventIds = selectedEventId === "all" ? allEventIds : [selectedEventId];

        if (targetEventIds.length === 0) {
          setTotalRevenue(0);
          setTotalRegistrations(0);
          setTotalCheckedIn(0);
          setTicketBreakdowns([]);
          setLoading(false);
          return;
        }

        // Fetch registrations
        const { data: regs } = await supabase
          .from("registrations")
          .select("amount_paid, checked_in")
          .in("event_id", targetEventIds);

        const rev = (regs || []).reduce((sum, r) => sum + (Number(r.amount_paid) || 0), 0);
        const regCount = (regs || []).length;
        const checkinCount = (regs || []).filter((r) => r.checked_in).length;

        setTotalRevenue(rev);
        setTotalRegistrations(regCount);
        setTotalCheckedIn(checkinCount);

        // Fetch ticket types breakdown
        const { data: tickets } = await supabase
          .from("ticket_types")
          .select("name, price, quantity, sold")
          .in("event_id", targetEventIds);

        setTicketBreakdowns(tickets || []);
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [selectedEventId, user?.id]);

  const attendanceRate = totalRegistrations > 0
    ? Math.round((totalCheckedIn / totalRegistrations) * 100)
    : 0;

  const handleExportCSV = () => {
    if (ticketBreakdowns.length === 0 && totalRegistrations === 0) {
      toast.error("No data available to export");
      return;
    }

    const csvRows = [
      ["Metric", "Value"],
      ["Total Revenue (NGN)", totalRevenue],
      ["Total Registrations", totalRegistrations],
      ["Total Checked In", totalCheckedIn],
      ["Attendance Rate (%)", `${attendanceRate}%`],
      [],
      ["Ticket Type", "Price", "Capacity", "Sold"],
      ...ticketBreakdowns.map((t) => [t.name, t.price, t.quantity, t.sold]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `eventrally_analytics_${selectedEventId}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Analytics CSV report downloaded!");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12 w-full min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6 w-full min-w-0">
        <div>
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-muted px-2.5 py-1 rounded inline-block mb-2 text-foreground">
            INSIGHTS & REPORTS
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-black text-foreground tracking-tight">Analytics Hub</h1>
          <p className="text-muted-foreground text-xs font-medium mt-1">
            Real-time revenue, attendance rates, and ticket sales funnel.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="h-10 rounded-lg border border-border bg-card px-3 text-xs text-foreground font-bold focus:ring-2 focus:ring-primary outline-none w-full sm:w-auto"
          >
            <option value="all">All Events</option>
            {events.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.title}
              </option>
            ))}
          </select>

          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="border-border text-foreground font-bold text-xs h-10 px-4 rounded-lg hover:bg-muted flex items-center justify-center gap-1.5 w-full sm:w-auto"
          >
            <Download className="w-4 h-4" /> Export Report
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-medium">Computing analytics data…</p>
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full min-w-0">
            <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold uppercase text-muted-foreground">Total Revenue</span>
                <div className="w-8 h-8 rounded-lg bg-chart-green/10 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-chart-green" />
                </div>
              </div>
              <div className="font-heading text-2xl font-black text-foreground">₦{totalRevenue.toLocaleString()}</div>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium">Gross ticket earnings</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold uppercase text-muted-foreground font-bold">Registrations</span>
                <div className="w-8 h-8 rounded-lg bg-chart-blue/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-chart-blue" />
                </div>
              </div>
              <div className="font-heading text-2xl font-black text-foreground">{totalRegistrations.toLocaleString()}</div>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium">Confirmed ticket holders</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold uppercase text-muted-foreground">Checked-In</span>
                <div className="w-8 h-8 rounded-lg bg-chart-purple/10 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-chart-purple" />
                </div>
              </div>
              <div className="font-heading text-2xl font-black text-foreground">{totalCheckedIn.toLocaleString()}</div>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium">Scanned at door</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold uppercase text-muted-foreground">Turnout Rate</span>
                <div className="w-8 h-8 rounded-lg bg-chart-orange/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-chart-orange" />
                </div>
              </div>
              <div className="font-heading text-2xl font-black text-foreground">{attendanceRate}%</div>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium">Attendance ratio</p>
            </div>
          </div>

          {/* Ticket Sales Breakdown */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                Ticket Sales Breakdown
              </h2>
              <span className="text-[11px] text-muted-foreground font-mono">{ticketBreakdowns.length} Ticket Types</span>
            </div>

            {ticketBreakdowns.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs text-muted-foreground">No ticket data available for the selected event filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full max-w-full">
                <table className="w-full min-w-[620px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Ticket Name</th>
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Price</th>
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Total Available</th>
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Sold</th>
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Sell-out Ratio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ticketBreakdowns.map((t, idx) => {
                      const ratio = t.quantity > 0 ? Math.round((t.sold / t.quantity) * 100) : 0;
                      return (
                        <tr key={idx} className="hover:bg-muted/40 transition-colors">
                          <td className="px-4 py-3 text-foreground text-xs font-bold">{t.name}</td>
                          <td className="px-4 py-3 text-foreground text-xs font-mono">{t.price === 0 ? "Free" : `₦${t.price.toLocaleString()}`}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{t.quantity}</td>
                          <td className="px-4 py-3 text-foreground text-xs font-mono font-bold">{t.sold}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-muted h-2 rounded-full overflow-hidden">
                                <div className="bg-secondary h-full rounded-full" style={{ width: `${Math.min(ratio, 100)}%` }} />
                              </div>
                              <span className="text-[11px] font-mono font-bold text-foreground">{ratio}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
