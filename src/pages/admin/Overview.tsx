import { Users, CalendarDays, Wallet, Zap, Clock, Shield } from "lucide-react";
import { adminStats } from "@/data/mock";

const stats = [
  { label: "Total Organisers", value: adminStats.totalOrganisers, icon: Users, color: "text-coral" },
  { label: "Total Events", value: adminStats.totalEvents.toLocaleString(), icon: CalendarDays, color: "text-amber" },
  { label: "Total Revenue", value: adminStats.totalRevenue, icon: Wallet, color: "text-teal" },
  { label: "Active Today", value: adminStats.activeToday, icon: Zap, color: "text-amber" },
  { label: "Pending Payouts", value: adminStats.pendingPayouts, icon: Clock, color: "text-coral" },
];

const Overview = () => {
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-xl font-800 text-ivory">Platform Overview</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
            <s.icon className={`w-4 h-4 ${s.color} mb-2`} />
            <div className={`font-heading text-lg font-800 ${s.color} truncate`}>{s.value}</div>
            <div className="text-ivory/40 text-[10px] font-body mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Organisers Table */}
      <div className="rounded-xl bg-white/[0.03] border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h2 className="font-heading text-sm font-700 text-ivory">Organisers</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-2.5 text-ivory/40 text-[10px] font-body font-normal uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-2.5 text-ivory/40 text-[10px] font-body font-normal uppercase tracking-wider">Events</th>
                <th className="text-left px-4 py-2.5 text-ivory/40 text-[10px] font-body font-normal uppercase tracking-wider">Revenue</th>
                <th className="text-left px-4 py-2.5 text-ivory/40 text-[10px] font-body font-normal uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {adminStats.organisers.map((org, i) => (
                <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-ivory text-xs font-body">{org.name}</td>
                  <td className="px-4 py-3 text-ivory/60 text-xs font-body">{org.events}</td>
                  <td className="px-4 py-3 text-amber text-xs font-heading font-700">{org.revenue}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-heading font-700 ${
                      org.status === "active"
                        ? "bg-teal/10 text-teal"
                        : "bg-coral/10 text-coral"
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
