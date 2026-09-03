import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, CalendarDays, PlusCircle, Users, Ticket, ScanLine, Image,
  Megaphone, BarChart3, Wallet, Settings, Bell, Menu, X, LogOut, Search, ChevronDown,
  Layers, ShoppingCart, Mail, CheckSquare, FileText, UserPlus, Terminal, Sparkles, Shield
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FeedbackWidget } from "@/components/FeedbackWidget";

interface NavGroup {
  groupName: string;
  items: { title: string; path: string; icon: any }[];
}

const mainNavItems = [
  { title: "Overview", path: "/dashboard", icon: LayoutDashboard },
];

const navGroups: NavGroup[] = [
  {
    groupName: "EVENTS",
    items: [
      { title: "My Events", path: "/dashboard/events", icon: CalendarDays },
      { title: "Create Event", path: "/dashboard/events/create", icon: PlusCircle },
    ]
  },
  {
    groupName: "AUDIENCE",
    items: [
      { title: "Attendees", path: "/dashboard/attendees", icon: Users },
      { title: "DP Generator", path: "/dashboard/dp", icon: Image },
    ]
  },
  {
    groupName: "COMMERCE",
    items: [
      { title: "Tickets", path: "/dashboard/tickets", icon: Ticket },
      { title: "Payments", path: "/dashboard/payments", icon: Wallet },
    ]
  },
  {
    groupName: "ENGAGEMENT",
    items: [
      { title: "Campaigns", path: "/dashboard/campaigns", icon: Megaphone },
    ]
  },
  {
    groupName: "ON SITE",
    items: [
      { title: "Check-In", path: "/dashboard/checkin", icon: ScanLine },
    ]
  },
  {
    groupName: "INSIGHTS",
    items: [
      { title: "Analytics", path: "/dashboard/analytics", icon: BarChart3 },
    ]
  },
  {
    groupName: "SETTINGS",
    items: [
      { title: "Settings", path: "/dashboard/settings", icon: Settings },
    ]
  }
];

const mobileNavItems = [
  { title: "Overview", path: "/dashboard", icon: LayoutDashboard },
  { title: "Events", path: "/dashboard/events", icon: CalendarDays },
  { title: "Check-in", path: "/dashboard/checkin", icon: ScanLine },
  { title: "Attendees", path: "/dashboard/attendees", icon: Users },
  { title: "Tickets", path: "/dashboard/tickets", icon: Ticket },
];

const DashboardLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, user, roles, signOut } = useAuth();
  const isAdmin = roles.includes("admin");

  const fullName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const firstName = fullName.split(" ")[0];

  const isActive = (path: string) =>
    path === "/dashboard" ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-background font-sans flex text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[260px] flex-col bg-card border-r border-border z-40">
        <div className="h-16 flex items-center px-6 border-b border-border justify-between">
          <Link to="/" className="font-heading font-black text-lg text-primary tracking-tighter uppercase flex items-center gap-1.5">
            MYEVENTGURU<span className="text-[10px] text-muted-foreground align-top">™</span>
          </Link>
        </div>

        <div className="flex-1 p-3 space-y-5 overflow-y-auto">
          {/* Super Admin Quick Link */}
          {isAdmin && (
            <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg text-xs space-y-1.5">
              <div className="flex items-center justify-between text-primary font-bold text-[10px] uppercase">
                <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Super Admin Portal</span>
                <span className="bg-primary text-primary-foreground font-extrabold px-1.5 py-0.5 rounded text-[9px]">LIVE</span>
              </div>
              <Link
                to="/admin"
                className="flex items-center justify-between w-full bg-primary hover:opacity-90 text-primary-foreground font-bold px-3 py-1.5 rounded text-xs transition-all shadow-xs"
              >
                <span>Platform Admin</span>
                <ChevronDown className="w-4 h-4 -rotate-90" />
              </Link>
            </div>
          )}

          {/* Main Top Nav */}
          <nav className="flex flex-col gap-1">
            {mainNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
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

          {/* Grouped Nav Items */}
          {navGroups.map((group) => (
            <div key={group.groupName} className="space-y-1">
              <div className="px-3 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {group.groupName}
              </div>
              <nav className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive(item.path)
                        ? "bg-primary text-primary-foreground font-bold shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>

        {/* Bottom Plan Widget */}
        <div className="p-3 border-t border-border">
          <div className="bg-muted/50 border border-border rounded-lg p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-bold text-foreground">{isAdmin ? "Super Admin" : "Pro Organizer"}</div>
                <div className="text-[10px] text-muted-foreground">{isAdmin ? "Full Access" : "Active Plan"}</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border flex flex-col shadow-2xl">
            <div className="h-16 px-5 border-b border-border flex items-center justify-between">
              <span className="font-heading font-black text-lg text-primary tracking-tight">
                MyEventGuru<span className="text-[10px] text-muted-foreground">™</span>
              </span>
              <button onClick={() => setSidebarOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {isAdmin && (
                <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg text-xs space-y-1.5">
                  <div className="text-primary font-bold text-[10px] uppercase">Super Admin Portal</div>
                  <Link
                    to="/admin"
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center justify-between w-full bg-primary text-primary-foreground font-bold px-3 py-1.5 rounded text-xs"
                  >
                    <span>Platform Admin</span>
                    <ChevronDown className="w-4 h-4 -rotate-90" />
                  </Link>
                </div>
              )}
              {navGroups.map((group) => (
                <div key={group.groupName} className="space-y-1">
                  <div className="px-3 text-[10px] font-bold text-muted-foreground uppercase">{group.groupName}</div>
                  {group.items.map((item) => (
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
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 md:ml-[260px] flex flex-col min-h-screen bg-background">
        {/* Top Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-muted-foreground hover:text-foreground">
              <Menu className="w-5 h-5" />
            </button>

            {/* Global Search Bar */}
            <div className="relative w-64 sm:w-96 hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search events, attendees, tickets..."
                className="w-full h-9 bg-background pl-9 pr-4 rounded-lg border border-border text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link to="/admin">
                <Button size="sm" variant="outline" className="hidden sm:flex items-center gap-1.5 text-xs font-bold border-primary/40 text-primary hover:bg-primary/10">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin Portal</span>
                </Button>
              </Link>
            )}

            <Link to="/dashboard/events/create">
              <Button size="sm" className="bg-primary text-primary-foreground font-bold text-xs h-9 px-4 rounded-lg hover:opacity-90 transition-all flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4" />
                <span>Create Event</span>
              </Button>
            </Link>

            <ThemeToggle />

            <div className="h-5 w-px bg-border mx-1"></div>

            {/* User Profile */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                {firstName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-bold text-foreground leading-tight">{fullName}</div>
                <div className="text-[10px] text-muted-foreground">{isAdmin ? "Super Admin" : "Organizer"}</div>
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

        {/* Page Main Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40">
        <div className="flex items-center justify-around h-16 px-1">
          {mobileNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1 px-2 py-1 rounded-lg min-w-0 flex-1 ${
                isActive(item.path) ? "text-primary font-bold" : "text-muted-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] truncate">{item.title}</span>
            </Link>
          ))}
        </div>
      </nav>

      <FeedbackWidget />
    </div>
  );
};

export default DashboardLayout;

