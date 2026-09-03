import { Users, CalendarDays, Wallet, Zap, Clock, Shield } from "lucide-react";
import { adminStats } from "@/data/mock";
import { useAuth } from "@/contexts/AuthContext";

const stats = [
  { label: "Total Organisers", value: adminStats.totalOrganisers, icon: Users, color: "text-chart-orange" },
  { label: "Total Events", value: adminStats.totalEvents.toLocaleString(), icon: CalendarDays, color: "text-chart-blue" },
  { label: "Total Revenue", value: adminStats.totalRevenue, icon: Wallet, color: "text-chart-green" },
  { label: "Active Today", value: adminStats.activeToday, icon: Zap, color: "text-chart-purple" },
  { label: "Pending Payouts", value: adminStats.pendingPayouts, icon: Clock, color: "text-chart-orange" },
];

const Overview = () => {
  const { profile, user } = useAuth();
  const fullName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Super Admin";
  const firstName = fullName.split(" ")[0];

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
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Name</th>
                <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Events</th>
                <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Revenue</th>
                <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {adminStats.organisers.map((org, i) => (
                <tr key={i} className="hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3 text-foreground text-xs font-bold">{org.name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{org.events}</td>
                  <td className="px-4 py-3 text-foreground text-xs font-mono font-bold">{org.revenue}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      org.status === "active"
                        ? "bg-chart-green/10 text-chart-green"
                        : "bg-destructive/10 text-destructive"
                    }`}>
                      {org.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Overview;
