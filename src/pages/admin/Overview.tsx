import { useState } from "react";
import { Users, CalendarDays, Wallet, Zap, Clock, Shield, Loader2, Mail, Send, CheckCircle2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface OrganiserRow {
  user_id: string;
  full_name: string;
  events_count: number;
  total_revenue: number;
}

const fetchAdminStats = async () => {
  // Fire all independent queries in parallel
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [orgCountRes, evtCountRes, revDataRes, regCountRes, todayCountRes, orgRolesRes] =
    await Promise.all([
      supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "organiser"),
      supabase.from("events").select("*", { count: "exact", head: true }),
      supabase.from("registrations").select("amount_paid"),
      supabase.from("registrations").select("*", { count: "exact", head: true }),
      supabase.from("events").select("*", { count: "exact", head: true }).gte("date", todayStart.toISOString()).lte("date", todayEnd.toISOString()),
      supabase.from("user_roles").select("user_id").eq("role", "organiser"),
    ]);

  const totalOrganisers = orgCountRes.count || 0;
  const totalEvents = evtCountRes.count || 0;
  const totalRevenue = (revDataRes.data || []).reduce((sum, r) => sum + (Number(r.amount_paid) || 0), 0);
  const totalRegistrations = regCountRes.count || 0;
  const activeToday = todayCountRes.count || 0;

  // Build organiser rows
  let organisers: OrganiserRow[] = [];
  const orgRoles = orgRolesRes.data;

  if (orgRoles && orgRoles.length > 0) {
    const orgIds = orgRoles.map((r) => r.user_id);

    // Fetch profiles, events, and registrations in parallel
    const [profilesRes, eventsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name").in("user_id", orgIds),
      supabase.from("events").select("organiser_id, id").in("organiser_id", orgIds),
    ]);

    const profiles = profilesRes.data || [];
    const events = eventsRes.data || [];
    const eventIds = events.map((e) => e.id);

    const regsRes = eventIds.length > 0
      ? await supabase.from("registrations").select("event_id, amount_paid").in("event_id", eventIds)
      : { data: [] };
    const regs = regsRes.data || [];

    organisers = orgIds.map((uid) => {
      const prof = profiles.find((p) => p.user_id === uid);
      const orgEvents = events.filter((e) => e.organiser_id === uid);
      const orgEventIds = orgEvents.map((e) => e.id);
      const orgRevenue = regs
        .filter((r) => orgEventIds.includes(r.event_id))
        .reduce((sum, r) => sum + (Number(r.amount_paid) || 0), 0);
      return {
        user_id: uid,
        full_name: prof?.full_name || "Unknown",
        events_count: orgEvents.length,
        total_revenue: orgRevenue,
      };
    });
  }

  return { totalOrganisers, totalEvents, totalRevenue, totalRegistrations, activeToday, organisers };
};

const Overview = () => {
  const { profile, user } = useAuth();
  const fullName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Super Admin";
  const firstName = fullName.split(" ")[0];

  const { data, isLoading: loading } = useQuery({
    queryKey: ["admin-overview-stats"],
    queryFn: fetchAdminStats,
    staleTime: 30_000, // Cache for 30s — revisiting admin shows instant data
    refetchOnWindowFocus: true,
  });

  const totalOrganisers = data?.totalOrganisers || 0;
  const totalEvents = data?.totalEvents || 0;
  const totalRevenue = data?.totalRevenue || 0;
  const activeToday = data?.activeToday || 0;
  const totalRegistrations = data?.totalRegistrations || 0;
  const organisers = data?.organisers || [];

  const stats = [
    { label: "Total Organisers", value: totalOrganisers.toLocaleString(), icon: Users, color: "text-chart-orange" },
    { label: "Total Events", value: totalEvents.toLocaleString(), icon: CalendarDays, color: "text-chart-blue" },
    { label: "Total Revenue", value: `₦${totalRevenue.toLocaleString()}`, icon: Wallet, color: "text-chart-green" },
    { label: "Active Today", value: activeToday.toLocaleString(), icon: Zap, color: "text-chart-purple" },
    { label: "Total Registrations", value: totalRegistrations.toLocaleString(), icon: Clock, color: "text-chart-orange" },
  ];

  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [broadcastingAll, setBroadcastingAll] = useState(false);

  const handleSendTestDigest = async () => {
    const target = testEmail.trim() || user?.email;
    if (!target) {
      toast.error("Please enter a destination email address.");
      return;
    }
    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-organizer-digest", {
        body: { testEmail: target },
      });
      if (error) throw error;
      toast.success(`Weekly Digest preview dispatched to ${target}!`);
    } catch (err: any) {
      console.error("Test digest dispatch error:", err);
      toast.error(err?.message || "Failed to dispatch preview email.");
    } finally {
      setSendingTest(false);
    }
  };

  const handleBroadcastAll = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to broadcast the Weekly Performance Digest to all registered event organizers?`
    );
    if (!confirmed) return;

    setBroadcastingAll(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-organizer-digest", {
        body: { limit: 100 },
      });
      if (error) throw error;
      toast.success(`Dispatched digest to ${data?.sentCount || 0} organizers successfully!`);
    } catch (err: any) {
      console.error("Broadcast digest error:", err);
      toast.error(err?.message || "Broadcast failed. Check edge function logs.");
    } finally {
      setBroadcastingAll(false);
    }
  };

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

          {/* Organizer Performance Digest & Playbook Control Center */}
          <div className="rounded-lg bg-card border border-border p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-chart-blue/10 text-chart-blue px-2 py-0.5 rounded">
                    NEWSLETTER AUTOMATION
                  </span>
                  <h3 className="font-heading text-sm font-bold text-foreground">
                    Weekly Organizer Performance Digest &amp; Growth Playbook
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Automated weekly email with deterministic event metrics (tickets sold, revenue, countdown) and battle-tested promotion playbooks (NO AI).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBroadcastAll}
                  disabled={broadcastingAll}
                  className="h-8 text-xs font-bold border-primary/30 text-primary hover:bg-primary/10"
                >
                  {broadcastingAll ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Broadcasting...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      Broadcast to All Organizers
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
              <div className="flex-1 max-w-md">
                <Input
                  type="email"
                  placeholder={user?.email ? `Test email (default: ${user.email})` : "Enter test recipient email"}
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleSendTestDigest}
                disabled={sendingTest}
                className="h-9 text-xs font-bold whitespace-nowrap"
              >
                {sendingTest ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Sending Preview...
                  </>
                ) : (
                  <>
                    <Mail className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                    Send Preview Email
                  </>
                )}
              </Button>
            </div>
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
              <>
                {/* Desktop Table View */}
                <div className="hidden sm:block overflow-x-auto">
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
                          <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{org.events_count}</td>
                          <td className="px-4 py-3 text-foreground text-xs font-mono font-bold">₦{org.total_revenue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List View */}
                <div className="block sm:hidden divide-y divide-border">
                  {organisers.map((org) => (
                    <div key={org.user_id} className="p-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-xs text-foreground">{org.full_name}</div>
                        <div className="font-mono text-xs font-bold text-chart-green">
                          ₦{org.total_revenue.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
                        <span>Events hosted:</span>
                        <span className="font-bold text-foreground">{org.events_count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Overview;

