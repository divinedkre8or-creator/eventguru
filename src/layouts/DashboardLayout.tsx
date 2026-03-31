import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, CalendarDays, Users, Ticket, ScanLine, Image,
  Megaphone, BarChart3, Wallet, Settings, Bell, Menu, X, LogOut,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";

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
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 flex-col bg-card border-r border-border z-40 transition-colors duration-300">
        <div className="p-5 border-b border-border">
          <Link to="/" className="font-heading text-xl font-extrabold text-foreground tracking-tight">
            Event<span className="text-primary">stack</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="truncate">{item.title}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border flex flex-col shadow-2xl transition-colors duration-300">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <span className="font-heading text-xl font-extrabold text-foreground tracking-tight">
                Event<span className="text-primary">stack</span>
              </span>
              <button onClick={() => setSidebarOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-colors ${
                    isActive(item.path)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span>{item.title}</span>
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="md:ml-64 min-h-screen pb-20 md:pb-0 transition-all duration-300">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border transition-colors duration-300">
          <div className="flex items-center justify-between px-4 md:px-6 h-16">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="md:hidden text-muted-foreground hover:text-foreground">
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <span className="text-muted-foreground text-sm font-medium">Good morning,</span>{" "}
                <span className="text-primary text-sm font-heading font-bold">{firstName}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-secondary h-9 w-9">
                <Bell className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-9 w-9"
                onClick={async () => { await signOut(); navigate("/"); }}
              >
                <LogOut className="w-5 h-5" />
              </Button>
              <div className="hidden sm:flex w-9 h-9 ml-2 rounded-full bg-primary/20 items-center justify-center border border-primary/20">
                <span className="text-primary text-xs font-heading font-extrabold">{firstName.slice(0, 2).toUpperCase()}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border z-40 transition-colors duration-300">
        <div className="flex items-center justify-around h-16 px-2">
          {bottomNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1 px-2 py-1 rounded-lg min-w-0 flex-1 ${
                isActive(item.path) ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium truncate w-full text-center">{item.title}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default DashboardLayout;
