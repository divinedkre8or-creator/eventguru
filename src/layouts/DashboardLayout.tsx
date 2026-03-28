import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, CalendarDays, Users, Ticket, ScanLine, Image,
  Megaphone, BarChart3, Wallet, Settings, Bell, Menu, X, LogOut,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { title: "Overview", path: "/dashboard", icon: LayoutDashboard },
  { title: "Events", path: "/dashboard/events", icon: CalendarDays },
  { title: "Attendees", path: "/dashboard/attendees", icon: Users },
  { title: "Tickets", path: "/dashboard/tickets", icon: Ticket },
  { title: "Check-in", path: "/dashboard/checkin", icon: ScanLine },
  { title: "DP Generator", path: "/dashboard/dp", icon: Image },
  { title: "Campaigns", path: "/dashboard/campaigns", icon: Megaphone },
  { title: "Analytics", path: "/dashboard/analytics", icon: BarChart3 },
  { title: "Payments", path: "/dashboard/payments", icon: Wallet },
  { title: "Settings", path: "/dashboard/settings", icon: Settings },
];

const bottomNavItems = navItems.slice(0, 5);

const DashboardLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, signOut } = useAuth();

  const firstName = profile?.full_name?.split(" ")[0] || "there";

  const isActive = (path: string) =>
    path === "/dashboard" ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-ink">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-56 flex-col bg-ink border-r border-white/5 z-40">
        <div className="p-4 border-b border-white/5">
          <Link to="/" className="font-heading text-lg font-800 text-ivory">
            Event<span className="text-amber">stack</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-body transition-colors ${
                isActive(item.path)
                  ? "bg-amber/10 text-amber"
                  : "text-ivory/50 hover:text-ivory/80 hover:bg-white/5"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.title}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-ink border-r border-white/5 flex flex-col">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <span className="font-heading text-lg font-800 text-ivory">
                Event<span className="text-amber">stack</span>
              </span>
              <button onClick={() => setSidebarOpen(false)} className="text-ivory/50">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-body transition-colors ${
                    isActive(item.path)
                      ? "bg-amber/10 text-amber"
                      : "text-ivory/50 hover:text-ivory/80 hover:bg-white/5"
                  }`}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span>{item.title}</span>
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="md:ml-56 min-h-screen pb-20 md:pb-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-ink/80 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="md:hidden text-ivory/60">
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <span className="text-ivory text-sm font-body">Good morning,</span>{" "}
                <span className="text-amber text-sm font-heading font-700">{firstName}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-ivory/50 hover:text-ivory hover:bg-white/5 h-9 w-9">
                <Bell className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-ivory/50 hover:text-coral hover:bg-white/5 h-9 w-9"
                onClick={async () => { await signOut(); navigate("/"); }}
              >
                <LogOut className="w-4 h-4" />
              </Button>
              <div className="w-8 h-8 rounded-full bg-amber/20 flex items-center justify-center">
                <span className="text-amber text-xs font-heading font-700">{firstName.slice(0, 2).toUpperCase()}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-ink/95 backdrop-blur-xl border-t border-white/5 z-40">
        <div className="flex items-center justify-around h-16 px-2">
          {bottomNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg min-w-0 ${
                isActive(item.path) ? "text-amber" : "text-ivory/40"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[9px] font-body truncate">{item.title}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default DashboardLayout;
