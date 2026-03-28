import { Link, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard, CalendarDays, Users, CreditCard,
  AlertTriangle, Settings, Bell, Menu, X, Shield,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Overview", path: "/admin", icon: LayoutDashboard },
  { title: "All Events", path: "/admin/events", icon: CalendarDays },
  { title: "Organisers", path: "/admin/organisers", icon: Users },
  { title: "Transactions", path: "/admin/transactions", icon: CreditCard },
  { title: "Disputes", path: "/admin/disputes", icon: AlertTriangle },
  { title: "Settings", path: "/admin/settings", icon: Settings },
];

const AdminLayout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string) =>
    path === "/admin" ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-ink">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-56 flex-col bg-ink border-r border-white/5 z-40">
        <div className="p-4 border-b border-white/5">
          <Link to="/" className="font-heading text-lg font-800 text-ivory">
            Event<span className="text-amber">stack</span>
          </Link>
          <div className="flex items-center gap-1.5 mt-1">
            <Shield className="w-3 h-3 text-coral" />
            <span className="text-coral text-[10px] font-heading font-700 uppercase tracking-wider">Super Admin</span>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-body transition-colors ${
                isActive(item.path)
                  ? "bg-coral/10 text-coral"
                  : "text-ivory/50 hover:text-ivory/80 hover:bg-white/5"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.title}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-ink border-r border-white/5 flex flex-col">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div>
                <span className="font-heading text-lg font-800 text-ivory">Event<span className="text-amber">stack</span></span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Shield className="w-3 h-3 text-coral" />
                  <span className="text-coral text-[10px] font-heading font-700 uppercase">Super Admin</span>
                </div>
              </div>
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
                      ? "bg-coral/10 text-coral"
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

      {/* Main */}
      <div className="md:ml-56 min-h-screen">
        <header className="sticky top-0 z-30 bg-ink/80 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="md:hidden text-ivory/60">
                <Menu className="w-5 h-5" />
              </button>
              <span className="text-ivory text-sm font-heading font-700">Platform Admin</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-ivory/50 hover:text-ivory hover:bg-white/5 h-9 w-9">
                <Bell className="w-4 h-4" />
              </Button>
              <div className="w-8 h-8 rounded-full bg-coral/20 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-coral" />
              </div>
            </div>
          </div>
        </header>
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
