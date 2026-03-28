import { CalendarDays, Users, Wallet, ScanLine, TrendingUp } from "lucide-react";
import { organiserStats } from "@/data/mock";

const statCards = [
  { label: "Total Events", value: organiserStats.totalEvents, icon: CalendarDays, color: "text-amber" },
  { label: "Total Attendees", value: organiserStats.totalAttendees.toLocaleString(), icon: Users, color: "text-teal" },
  { label: "Revenue", value: organiserStats.totalRevenue, icon: Wallet, color: "text-amber" },
  { label: "Check-ins", value: organiserStats.totalCheckins.toLocaleString(), icon: ScanLine, color: "text-teal" },
];

const Overview = () => {
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-xl font-800 text-ivory">Overview</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <TrendingUp className="w-3 h-3 text-teal" />
            </div>
            <div className={`font-heading text-lg md:text-xl font-800 ${s.color} truncate`}>{s.value}</div>
            <div className="text-ivory/40 text-[10px] font-body mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Registrations */}
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
          <h2 className="font-heading text-sm font-700 text-ivory mb-3">Recent Registrations</h2>
          <div className="space-y-3">
            {organiserStats.recentRegistrations.map((r, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-ivory text-xs font-body truncate">{r.name}</div>
                  <div className="text-ivory/40 text-[10px] font-body truncate">{r.event}</div>
                </div>
                <span className="text-ivory/30 text-[10px] font-body shrink-0 ml-2">{r.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
          <h2 className="font-heading text-sm font-700 text-ivory mb-3">Upcoming Events</h2>
          <div className="space-y-3">
            {organiserStats.upcomingEvents.map((e, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-ivory text-xs font-body truncate">{e.title}</div>
                  <div className="text-ivory/40 text-[10px] font-body">{e.date}</div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <div className="text-amber text-xs font-heading font-700">{e.sold}/{e.total}</div>
                  <div className="w-16 h-1 rounded-full bg-white/5 mt-1">
                    <div className="h-full rounded-full bg-amber" style={{ width: `${(e.sold / e.total) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
