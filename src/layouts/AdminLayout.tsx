import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, CalendarDays, Users, CreditCard,
  AlertTriangle, Settings, Menu, X, Shield, MessageSquarePlus, LogOut, ArrowLeft
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SEOHead } from "@/components/seo/SEOHead";
import { BrandLogo } from "@/components/brand/BrandLogo";

const navItems = [
  { title: "Overview", path: "/admin", icon: LayoutDashboard },
  { title: "All Events", path: "/admin/events", icon: CalendarDays },
  { title: "Organisers", path: "/admin/organisers", icon: Users },
  { title: "Transactions", path: "/admin/transactions", icon: CreditCard },
  { title: "Disputes", path: "/admin/disputes", icon: AlertTriangle },
  { title: "Feedback & Support", path: "/admin/feedback", icon: MessageSquarePlus },
  { title: "Settings", path: "/admin/settings", icon: Settings },
];

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, user, signOut } = useAuth();

  const fullName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Super Admin";

  const isActive = (path: string) =>
    path === "/admin" ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-background font-sans flex text-foreground antialiased">
      <SEOHead
        title="Super Admin Portal"
        description="EventRally platform administration workspace."
        noIndex={true}
      />
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[260px] flex-col bg-card border-r border-border z-40">
        <div className="h-16 flex items-center px-6 border-b border-border justify-between">
          <Link to="/admin" className="flex items-center gap-1 hover:opacity-90 transition-opacity" aria-label="EventRally Admin">
            <BrandLogo />
          </Link>
        </div>

        {/* Super Admin Badge */}
        <div className="p-4 border-b border-border bg-primary/5">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <Shield className="w-4 h-4" />
            <span>Super Admin Portal</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Platform Management</p>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                isActive(item.path)
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.title}</span>
            </Link>
          ))}
        </nav>

        {/* Return to Organizer View */}
        <div className="p-3 border-t border-border">
          <Link
            to="/dashboard"
            className="flex items-center justify-between w-full bg-muted hover:bg-muted/80 text-foreground font-bold px-3 py-2 rounded-lg text-xs transition-all border border-border"
          >
            <span className="flex items-center gap-2">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Organizer View</span>
            </span>
          </Link>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border flex flex-col shadow-2xl">
            <div className="h-16 px-5 border-b border-border flex items-center justify-between">
              <Link to="/admin" className="flex items-center gap-1" onClick={() => setSidebarOpen(false)} aria-label="EventRally Admin">
                <BrandLogo />
              </Link>
              <button onClick={() => setSidebarOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-border bg-primary/5">
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                <Shield className="w-4 h-4" />
                <span>Super Admin Portal</span>
              </div>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    isActive(item.path) ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"
                  }`}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span>{item.title}</span>
                </Link>
              ))}
            </nav>

            <div className="p-4 border-t border-border">
              <Link
                to="/dashboard"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center justify-center gap-2 w-full bg-muted text-foreground font-bold px-3 py-2.5 rounded-lg text-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Organizer View</span>
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 md:ml-[260px] flex flex-col min-h-screen bg-background">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-muted-foreground hover:text-foreground">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-foreground text-sm font-heading font-black">Super Admin Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button size="sm" variant="outline" className="hidden sm:flex items-center gap-1.5 text-xs font-bold border-border text-foreground hover:bg-muted">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Organizer Dashboard</span>
              </Button>
            </Link>

            <ThemeToggle />

            <div className="h-5 w-px bg-border mx-1"></div>

            {/* Profile */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                <Shield className="w-4 h-4" />
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-bold text-foreground leading-tight">{fullName}</div>
                <div className="text-[10px] text-primary font-bold uppercase">Super Admin</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={async () => {
                  await signOut();
                  navigate("/");
                }}
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
