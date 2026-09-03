import { useState, useEffect } from "react";
import { Users, CalendarDays, Wallet, Zap, Clock, Shield, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface OrganiserRow {
  user_id: string;
  full_name: string;
  events_count: number;
  total_revenue: number;
}

const Overview = () => {
  const { profile, user } = useAuth();
  const fullName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Super Admin";
  const firstName = fullName.split(" ")[0];

  const [loading, setLoading] = useState(true);
  const [totalOrganisers, setTotalOrganisers] = useState(0);
  const [totalEvents, setTotalEvents] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [activeToday, setActiveToday] = useState(0);
  const [totalRegistrations, setTotalRegistrations] = useState(0);
  const [organisers, setOrganisers] = useState<OrganiserRow[]>([]);

  useEffect(() => {
    const fetchAdminStats = async () => {
      setLoading(true);
      try {
        // Total organisers
        const { count: orgCount } = await supabase
          .from("user_roles")
          .select("*", { count: "exact", head: true })
          .eq("role", "organiser");
        setTotalOrganisers(orgCount || 0);

        // Total events
        const { count: evtCount } = await supabase
          .from("events")
          .select("*", { count: "exact", head: true });
        setTotalEvents(evtCount || 0);

        // Total revenue from registrations
        const { data: revData } = await supabase
          .from("registrations")
          .select("amount_paid");
        const rev = (revData || []).reduce((sum, r) => sum + (Number(r.amount_paid) || 0), 0);
        setTotalRevenue(rev);

        // Total registrations
        const { count: regCount } = await supabase
          .from("registrations")
          .select("*", { count: "exact", head: true });
        setTotalRegistrations(regCount || 0);

        // Active events today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        const { count: todayCount } = await supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .gte("date", todayStart.toISOString())
          .lte("date", todayEnd.toISOString());
        setActiveToday(todayCount || 0);

        // Organisers list with their events and revenue
        const { data: orgRoles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "organiser");

        if (orgRoles && orgRoles.length > 0) {
          const orgIds = orgRoles.map((r) => r.user_id);

          // Get profiles
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", orgIds);

          // Get events per organiser
          const { data: events } = await supabase
            .from("events")
            .select("organiser_id, id")
            .in("organiser_id", orgIds);

          // Get registrations with revenue
          const eventIds = (events || []).map((e) => e.id);
          const { data: regs } = eventIds.length > 0
            ? await supabase
              .from("registrations")
              .select("event_id, amount_paid")
              .in("event_id", eventIds)
            : { data: [] };

          // Build organiser rows
          const orgRows: OrganiserRow[] = orgIds.map((uid) => {
            const prof = (profiles || []).find((p) => p.user_id === uid);
            const orgEvents = (events || []).filter((e) => e.organiser_id === uid);
            const orgEventIds = orgEvents.map((e) => e.id);
            const orgRevenue = (regs || [])
              .filter((r) => orgEventIds.includes(r.event_id))
              .reduce((sum, r) => sum + (Number(r.amount_paid) || 0), 0);
            return {
              user_id: uid,
              full_name: prof?.full_name || "Unknown",
              events_count: orgEvents.length,
              total_revenue: orgRevenue,
            };
          });
          setOrganisers(orgRows);
        }
      } catch (err) {
        console.error("Failed to fetch admin stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminStats();
  }, []);

  const stats = [
    { label: "Total Organisers", value: totalOrganisers.toLocaleString(), icon: Users, color: "text-chart-orange" },
    { label: "Total Events", value: totalEvents.toLocaleString(), icon: CalendarDays, color: "text-chart-blue" },
    { label: "Total Revenue", value: `₦${totalRevenue.toLocaleString()}`, icon: Wallet, color: "text-chart-green" },
    { label: "Active Today", value: activeToday.toLocaleString(), icon: Zap, color: "text-chart-purple" },
    { label: "Total Registrations", value: totalRegistrations.toLocaleString(), icon: Clock, color: "text-chart-orange" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      <div className="border-b border-border pb-4">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded inline-flex items-center gap-1 mb-2 font-bold">
          <Shield className="w-3 h-3" />
          <span>SUPER ADMIN DASHBOARD</span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl font-black text-foreground tracking-tight">
          Welcome back, {firstName}.
        </h1>
        <p className="text-muted-foreground text-xs font-medium mt-1">
          Platform-wide metrics, organizer activities, and feedback management.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Loading platform stats…</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="p-4 rounded-lg bg-card border border-border shadow-xs hover:border-primary/40 transition-colors">
                <s.icon className={`w-4 h-4 ${s.color} mb-2`} />
                <div className={`font-heading text-xl font-black ${s.color} truncate`}>{s.value}</div>
                <div className="text-muted-foreground text-xs font-medium mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Organisers Table */}
          <div className="rounded-lg bg-card border border-border overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border">
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">Organisers</h2>
            </div>
            {organisers.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs text-muted-foreground">No organisers registered yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Name</th>
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Events</th>
                      <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {organisers.map((org) => (
                      <tr key={org.user_id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 text-foreground text-xs font-bold">{org.full_name}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{org.events_count}</td>
                        <td className="px-4 py-3 text-foreground text-xs font-mono font-bold">₦{org.total_revenue.toLocaleString()}</td>
                      </tr>
                    ))}
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

export default Overview;
