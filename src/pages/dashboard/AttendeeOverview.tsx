import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Calendar, MapPin, Ticket, Image, CheckCircle2, ArrowRight, Compass, Loader2,
  Clock, Users, Wallet, Star, Target, Zap, Trophy, TrendingUp, ChevronRight,
  QrCode, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { slugify, getEventDpUrl, getEventUrl } from "@/lib/slugUtils";
import { DigitalTicketCard } from "@/components/tickets/DigitalTicketCard";
import { TicketActions } from "@/components/tickets/TicketActions";

interface RegisteredEvent {
  id: string;
  registration_id: string;
  title: string;
  date: string;
  venue: string;
  city: string;
  country: string;
  image_url: string;
  category: string;
  amount_paid: number;
  ticket_name: string;
  checked_in: boolean;
  created_at: string;
}

// --- Rally Score & Achievement Logic ---
function computeRallyScore(events: RegisteredEvent[]) {
  let xp = 0;
  xp += events.length * 100;                // 100 XP per registration
  xp += events.filter(e => e.checked_in).length * 150; // 150 XP bonus per check-in
  xp += events.filter(e => e.amount_paid > 0).length * 50; // 50 XP for paid events
  return xp;
}

function getRallyLevel(xp: number) {
  if (xp >= 5000) return { level: 5, title: "Legend", next: null, progress: 100 };
  if (xp >= 2500) return { level: 4, title: "Rally Captain", next: 5000, progress: ((xp - 2500) / 2500) * 100 };
  if (xp >= 1000) return { level: 3, title: "Trailblazer", next: 2500, progress: ((xp - 1000) / 1500) * 100 };
  if (xp >= 300) return { level: 2, title: "Explorer", next: 1000, progress: ((xp - 300) / 700) * 100 };
  return { level: 1, title: "Newcomer", next: 300, progress: (xp / 300) * 100 };
}

interface Badge {
  key: string;
  label: string;
  description: string;
  unlocked: boolean;
}

function computeBadges(events: RegisteredEvent[]): Badge[] {
  const totalSpend = events.reduce((s, e) => s + e.amount_paid, 0);
  const checkedIn = events.filter(e => e.checked_in).length;
  const pastEvents = events.filter(e => new Date(e.date) < new Date());
  const categories = new Set(events.map(e => e.category));

  return [
    { key: "first", label: "First Rally", description: "Registered for your first event", unlocked: events.length >= 1 },
    { key: "five", label: "High Five", description: "Registered for 5 events", unlocked: events.length >= 5 },
    { key: "ten", label: "Rally Veteran", description: "Registered for 10 events", unlocked: events.length >= 10 },
    { key: "checkin", label: "Present", description: "Checked in at 3 events", unlocked: checkedIn >= 3 },
    { key: "spender", label: "Investor", description: "Spent NGN 50,000+ on tickets", unlocked: totalSpend >= 50000 },
    { key: "diverse", label: "All-Rounder", description: "Attended 3+ event categories", unlocked: categories.size >= 3 },
    { key: "veteran", label: "Seasoned", description: "Attended 5+ past events", unlocked: pastEvents.length >= 5 },
    { key: "perfect", label: "Perfect Record", description: "Checked in at every event attended", unlocked: events.length > 0 && checkedIn === events.length },
  ];
}

// --- Countdown helper ---
function getCountdown(dateStr: string) {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m`;
}

const AttendeeOverview = () => {
  const { user, profile } = useAuth();
  const [registrations, setRegistrations] = useState<RegisteredEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "all">("upcoming");
  const [selectedTicketEvent, setSelectedTicketEvent] = useState<RegisteredEvent | null>(null);
  const [trendingEvents, setTrendingEvents] = useState<any[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(false);

  const fullName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Attendee";
  const firstName = fullName.split(" ")[0];

  useEffect(() => {
    if (!user?.email && !user?.id) return;

    const fetchMyEvents = async () => {
      setLoading(true);
      try {
        const { data: regs, error } = await supabase
          .from("registrations")
          .select("id, amount_paid, checked_in, created_at, event_id, ticket_types(name), events(*)")
          .or(`user_id.eq.${user?.id},email.eq.${user?.email}`);

        if (error) throw error;

        const list: RegisteredEvent[] = (regs || [])
          .filter((r) => r.events)
          .map((r: any) => ({
            id: r.events.id,
            registration_id: r.id,
            title: r.events.title,
            date: r.events.date,
            venue: r.events.venue || "Online",
            city: r.events.city || "",
            country: r.events.country || "",
            image_url: r.events.image_url || "",
            category: r.events.category || "Event",
            amount_paid: Number(r.amount_paid) || 0,
            ticket_name: r.ticket_types?.name || "General Admission",
            checked_in: !!r.checked_in,
            created_at: r.created_at,
          }));

        setRegistrations(list);
      } catch (err) {
        console.error("Failed to load registered events:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyEvents();
  }, [user?.id, user?.email]);

  // Fetch trending published events if attendee has 0 registrations
  useEffect(() => {
    if (registrations.length === 0 && !loading) {
      const fetchTrending = async () => {
        setLoadingTrending(true);
        const { data, error } = await supabase
          .from("events")
          .select("id, title, date, venue, city, category, image_url, is_free")
          .eq("status", "published")
          .order("date", { ascending: true })
          .limit(4);
        if (!error && data) {
          setTrendingEvents(data);
        }
        setLoadingTrending(false);
      };
      fetchTrending();
    }
  }, [registrations.length, loading]);

  const now = new Date();
  const upcomingEvents = useMemo(() => registrations.filter((r) => new Date(r.date) >= new Date(now.setHours(0, 0, 0, 0))), [registrations]);
  const pastEvents = useMemo(() => registrations.filter((r) => new Date(r.date) < new Date(new Date().setHours(0, 0, 0, 0))), [registrations]);

  // Stats
  const totalSpend = registrations.reduce((s, e) => s + e.amount_paid, 0);
  const totalCheckedIn = registrations.filter(e => e.checked_in).length;
  const rallyXP = computeRallyScore(registrations);
  const rallyLevel = getRallyLevel(rallyXP);
  const badges = computeBadges(registrations);
  const unlockedBadges = badges.filter(b => b.unlocked);

  // Displayed events
  const displayedEvents = activeTab === "upcoming" ? upcomingEvents : activeTab === "past" ? pastEvents : registrations;

  // Spending by category
  const spendByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    registrations.forEach(e => {
      const cat = e.category || "Other";
      map[cat] = (map[cat] || 0) + e.amount_paid;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [registrations]);

  // Next event
  const nextEvent = upcomingEvents.length > 0
    ? upcomingEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
    : null;

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-12 w-full min-w-0 overflow-x-hidden">
      {/* Welcome Banner */}
      <div className="border-b border-border pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 w-full min-w-0">
        <div>
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-secondary/10 text-secondary px-2.5 py-1 rounded inline-block mb-2">
            ATTENDEE DASHBOARD
          </div>
          <h1 className="font-heading text-2xl sm:text-4xl font-black text-foreground tracking-tight">
            Welcome back, {firstName}.
          </h1>
          <p className="text-muted-foreground text-xs font-medium mt-1">
            Track your events, earn Rally points, and stay connected with the community.
          </p>
        </div>

        <Link to="/events" className="w-full sm:w-auto">
          <Button variant="secondary" size="sm" className="w-full sm:w-auto font-bold text-xs h-10 px-4 rounded-lg flex items-center justify-center gap-2 shadow-sm">
            <Compass className="w-4 h-4" /> Explore Events
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-medium">Loading your dashboard...</p>
        </div>
      ) : registrations.length === 0 ? (
        /* Empty State With Rich Onboarding & Live Event Catalog */
        <div className="space-y-8">
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xs">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-secondary/10 text-secondary text-[11px] font-mono font-bold uppercase tracking-wider">
                <Wallet className="w-3.5 h-3.5" /> DIGITAL TICKET WALLET
              </div>
              <h2 className="font-heading text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                Your Ticket Wallet is Ready, {firstName}.
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                When you secure passes or register for events on EventRally, your digital tickets, 1-second gate QR entry passes, and custom event fliers will automatically be stored right here.
              </p>
            </div>
            <Link to="/events" className="shrink-0">
              <Button variant="secondary" size="lg" className="font-bold text-xs sm:text-sm h-11 px-6 rounded-lg shadow-sm flex items-center gap-2">
                <Compass className="w-4 h-4" />
                <span>Explore Live Events</span>
              </Button>
            </Link>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-lg font-bold text-foreground">Trending Events to Attend</h3>
                <p className="text-xs text-muted-foreground">Discover what is happening next and get your tickets in one click.</p>
              </div>
              <Link to="/events" className="text-xs font-bold text-secondary hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loadingTrending ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-secondary" />
              </div>
            ) : trendingEvents.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground bg-card">
                No events currently published. Check back soon or browse our full events catalog.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {trendingEvents.map((evt) => (
                  <div key={evt.id} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col justify-between hover:border-secondary/40 transition-all shadow-xs group">
                    <div>
                      <div className="aspect-[16/9] bg-muted relative overflow-hidden">
                        {evt.image_url ? (
                          <img src={evt.image_url} alt={evt.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground/30">
                            <Calendar className="w-8 h-8" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase">
                          {evt.category || "Event"}
                        </div>
                      </div>
                      <div className="p-3.5 space-y-1.5">
                        <h4 className="font-heading text-sm font-bold text-foreground truncate">{evt.title}</h4>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span>{new Date(evt.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                          {(evt.city || evt.venue) && (
                            <>
                              <span>•</span>
                              <span className="truncate">{evt.city || evt.venue}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="p-3.5 pt-0">
                      <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                        <span className="font-mono font-bold text-foreground text-[11px]">{evt.is_free ? "Free" : "Paid"}</span>
                        <Link to={getEventUrl(evt)}>
                          <Button variant="secondary" size="sm" className="font-bold text-[11px] h-7 px-2.5 rounded shadow-xs">
                            Get Ticket
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* ===== STATS BAR ===== */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Ticket className="w-4 h-4" />
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Events</span>
              </div>
              <div className="font-heading text-2xl font-black text-foreground">{registrations.length}</div>
              <div className="text-[10px] text-muted-foreground">{upcomingEvents.length} upcoming</div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Checked In</span>
              </div>
              <div className="font-heading text-2xl font-black text-foreground">{totalCheckedIn}</div>
              <div className="text-[10px] text-muted-foreground">{registrations.length > 0 ? Math.round((totalCheckedIn / registrations.length) * 100) : 0}% attendance rate</div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Wallet className="w-4 h-4" />
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Total Spent</span>
              </div>
              <div className="font-heading text-2xl font-black text-foreground">
                {totalSpend > 0 ? `NGN ${totalSpend.toLocaleString()}` : "Free"}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {registrations.filter(e => e.amount_paid > 0).length} paid tickets
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Zap className="w-4 h-4" />
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Rally Score</span>
              </div>
              <div className="font-heading text-2xl font-black text-foreground">{rallyXP.toLocaleString()} XP</div>
              <div className="text-[10px] text-muted-foreground">Level {rallyLevel.level} — {rallyLevel.title}</div>
            </div>
          </div>

          {/* ===== RALLY SCORE & ACHIEVEMENTS ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rally Score Card */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                  <Target className="w-4 h-4 text-secondary" /> Rally Score
                </h2>
                <span className="text-[10px] font-mono font-bold bg-secondary/10 text-secondary px-2 py-0.5 rounded uppercase">
                  Lvl {rallyLevel.level}
                </span>
              </div>

              <div className="text-center space-y-2">
                <div className="font-heading text-4xl font-black text-foreground">{rallyXP.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground font-medium">{rallyLevel.title}</div>
              </div>

              {/* Progress bar */}
              {rallyLevel.next && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{rallyXP} XP</span>
                    <span>{rallyLevel.next.toLocaleString()} XP</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-secondary rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${Math.min(rallyLevel.progress, 100)}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-muted-foreground text-center">
                    {(rallyLevel.next - rallyXP).toLocaleString()} XP to next level
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-3 space-y-1 text-[10px] text-muted-foreground">
                <div className="flex justify-between"><span>Register for events</span><span className="font-bold text-foreground">+100 XP</span></div>
                <div className="flex justify-between"><span>Check in at events</span><span className="font-bold text-foreground">+150 XP</span></div>
                <div className="flex justify-between"><span>Support with paid tickets</span><span className="font-bold text-foreground">+50 XP</span></div>
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-secondary" /> Achievements
                </h2>
                <span className="text-[10px] font-mono text-muted-foreground">{unlockedBadges.length}/{badges.length} unlocked</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {badges.map((badge) => (
                  <div
                    key={badge.key}
                    className={`border rounded-lg p-3 text-center space-y-1 transition-all ${
                      badge.unlocked
                        ? "border-secondary/30 bg-secondary/5"
                        : "border-border bg-muted/30 opacity-50"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto ${
                      badge.unlocked ? "bg-secondary/10 text-secondary" : "bg-muted text-muted-foreground"
                    }`}>
                      <Star className="w-4 h-4" />
                    </div>
                    <div className="font-bold text-[11px] text-foreground">{badge.label}</div>
                    <div className="text-[9px] text-muted-foreground leading-tight">{badge.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ===== NEXT EVENT HIGHLIGHT ===== */}
          {nextEvent && (
            <div className="bg-card border border-secondary/20 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1 space-y-1">
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-secondary">Next Event</div>
                <h3 className="font-heading text-lg font-bold text-foreground">{nextEvent.title}</h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-secondary" />
                    {new Date(nextEvent.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                  </span>
                  {nextEvent.venue && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-destructive" />
                      {[nextEvent.venue, nextEvent.city].filter(Boolean).join(", ")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getCountdown(nextEvent.date) && (
                  <div className="bg-muted border border-border rounded-lg px-3 py-2 text-center">
                    <div className="font-heading text-lg font-black text-foreground">{getCountdown(nextEvent.date)}</div>
                    <div className="text-[9px] text-muted-foreground font-mono uppercase">Until event</div>
                  </div>
                )}
                <Link to={getEventUrl(nextEvent)}>
                  <Button variant="secondary" size="sm" className="font-bold text-xs h-9 px-4 rounded-lg shadow-sm">
                    View Details <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* ===== EVENTS LIST ===== */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                <Ticket className="w-5 h-5 text-secondary" /> My Events
              </h2>
              <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                {(["upcoming", "past", "all"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all capitalize ${
                      activeTab === tab
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab} ({tab === "upcoming" ? upcomingEvents.length : tab === "past" ? pastEvents.length : registrations.length})
                  </button>
                ))}
              </div>
            </div>

            {displayedEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-8 text-center">
                No {activeTab} events found.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {displayedEvents.map((evt) => {
                  const isPast = new Date(evt.date) < new Date(new Date().setHours(0, 0, 0, 0));
                  const countdown = !isPast ? getCountdown(evt.date) : null;

                  return (
                    <div key={evt.registration_id} className={`bg-card border border-border rounded-xl overflow-hidden flex flex-col justify-between hover:border-secondary transition-all shadow-xs group ${isPast ? "opacity-80 hover:opacity-100" : ""}`}>
                      <div>
                        {/* Event Banner */}
                        <div className="relative aspect-[16/9] bg-muted overflow-hidden">
                          {evt.image_url ? (
                            <img src={evt.image_url} alt={evt.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-xs font-mono">
                              Event Banner
                            </div>
                          )}
                          <div className={`absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                            evt.checked_in
                              ? "bg-chart-green/10 text-chart-green border-chart-green/30"
                              : isPast
                                ? "bg-muted text-muted-foreground border-border"
                                : "bg-secondary/10 text-secondary border-secondary/30"
                          }`}>
                            {evt.checked_in ? "Checked In" : isPast ? "Attended" : "Confirmed"}
                          </div>
                          {countdown && (
                            <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur-sm border border-border rounded px-2 py-1">
                              <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-foreground">
                                <Clock className="w-3 h-3 text-secondary" /> {countdown}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="p-4 space-y-3">
                          <div>
                            <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground tracking-wider">
                              {evt.category}
                            </span>
                            <h3 className="font-heading text-base font-bold text-foreground truncate mt-0.5">{evt.title}</h3>
                          </div>

                          <div className="space-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 shrink-0 text-secondary" />
                              <span>{new Date(evt.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                            </div>
                            {evt.venue && (
                              <div className="flex items-center gap-1.5 truncate">
                                <MapPin className="w-3.5 h-3.5 shrink-0 text-destructive" />
                                <span className="truncate">{[evt.venue, evt.city].filter(Boolean).join(", ")}</span>
                              </div>
                            )}
                          </div>

                          {/* Ticket & Amount */}
                          <div className="flex items-center justify-between text-[11px] border-t border-border pt-2">
                            <span className="text-muted-foreground font-mono">{evt.ticket_name}</span>
                            <span className="font-bold text-foreground">
                              {evt.amount_paid > 0 ? `NGN ${evt.amount_paid.toLocaleString()}` : "Free"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 pt-0 space-y-2">
                        <Button
                          onClick={() => setSelectedTicketEvent(evt)}
                          className="w-full bg-primary text-primary-foreground font-bold text-xs h-9 rounded-lg hover:opacity-90 flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <QrCode className="w-3.5 h-3.5" /> View Ticket & QR Pass
                        </Button>

                        <Link to={getEventDpUrl(evt)} className="block">
                          <Button variant="outline" className="w-full border-secondary/30 bg-secondary/5 hover:bg-secondary/15 text-secondary font-bold text-xs h-9 rounded-lg flex items-center justify-center gap-1.5 shadow-xs">
                            <Image className="w-3.5 h-3.5" /> Generate Event DP <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>

                        <Link to={getEventUrl(evt)} className="block">
                          <Button variant="ghost" size="sm" className="w-full text-xs font-semibold h-8 text-muted-foreground hover:text-foreground justify-center">
                            View Event Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ===== EVENT TIMELINE ===== */}
          {pastEvents.length > 0 && (
            <div className="space-y-4 border-t border-border pt-8">
              <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-secondary" /> Event Timeline
              </h2>

              <div className="space-y-0 relative">
                <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border" />
                {[...registrations]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 8)
                  .map((evt, idx) => {
                    const isPast = new Date(evt.date) < new Date();
                    return (
                      <div key={evt.registration_id} className="flex items-start gap-4 relative pl-8 pb-4">
                        <div className={`absolute left-[11px] top-1 w-2 h-2 rounded-full border-2 ${
                          evt.checked_in ? "bg-chart-green border-chart-green" : isPast ? "bg-muted-foreground border-muted-foreground" : "bg-secondary border-secondary"
                        }`} />
                        <div className="flex-1 flex items-start justify-between gap-3">
                          <div className="space-y-0.5">
                            <div className="font-bold text-xs text-foreground">{evt.title}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {new Date(evt.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                              {evt.venue && ` · ${evt.venue}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {evt.checked_in && (
                              <span className="text-[9px] font-mono font-bold text-chart-green bg-chart-green/10 px-1.5 py-0.5 rounded">IN</span>
                            )}
                            <span className="text-[10px] font-mono font-bold text-muted-foreground">
                              {evt.amount_paid > 0 ? `NGN ${evt.amount_paid.toLocaleString()}` : "Free"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ===== SPENDING OVERVIEW ===== */}
          {totalSpend > 0 && (
            <div className="space-y-4 border-t border-border pt-8">
              <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                <Wallet className="w-4 h-4 text-secondary" /> Spending Overview
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-xl p-4 space-y-1">
                  <div className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Total Spent</div>
                  <div className="font-heading text-xl font-black text-foreground">NGN {totalSpend.toLocaleString()}</div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 space-y-1">
                  <div className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Avg Ticket Price</div>
                  <div className="font-heading text-xl font-black text-foreground">
                    NGN {registrations.filter(e => e.amount_paid > 0).length > 0
                      ? Math.round(totalSpend / registrations.filter(e => e.amount_paid > 0).length).toLocaleString()
                      : "0"}
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 space-y-1">
                  <div className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Paid Events</div>
                  <div className="font-heading text-xl font-black text-foreground">{registrations.filter(e => e.amount_paid > 0).length}</div>
                </div>
              </div>

              {/* Category Breakdown */}
              {spendByCategory.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <div className="text-[11px] font-mono font-bold uppercase text-muted-foreground tracking-wider">By Category</div>
                  <div className="space-y-2">
                    {spendByCategory.map(([cat, amount]) => {
                      const pct = totalSpend > 0 ? (amount / totalSpend) * 100 : 0;
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-foreground font-medium capitalize">{cat.replace("-", " ")}</span>
                            <span className="text-muted-foreground font-mono">NGN {amount.toLocaleString()}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-secondary rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ===== ATTENDEE TICKET PASS MODAL ===== */}
      {selectedTicketEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 font-sans">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-foreground">
            {/* Modal Header */}
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0 bg-card">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-secondary" />
                <span className="font-heading font-black text-sm uppercase text-foreground">
                  Official Ticket Pass
                </span>
              </div>
              <button
                onClick={() => setSelectedTicketEvent(null)}
                className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
              <DigitalTicketCard
                registration={{
                  id: selectedTicketEvent.registration_id,
                  full_name: fullName,
                  email: user?.email || "",
                  amount_paid: selectedTicketEvent.amount_paid,
                  checked_in: selectedTicketEvent.checked_in,
                  created_at: selectedTicketEvent.created_at,
                }}
                event={{
                  id: selectedTicketEvent.id,
                  title: selectedTicketEvent.title,
                  date: selectedTicketEvent.date,
                  venue: selectedTicketEvent.venue,
                  city: selectedTicketEvent.city,
                  country: selectedTicketEvent.country,
                  category: selectedTicketEvent.category,
                  image_url: selectedTicketEvent.image_url,
                }}
                ticketTier={{
                  name: selectedTicketEvent.ticket_name,
                  price: selectedTicketEvent.amount_paid,
                }}
                elementId={`dash-pass-${selectedTicketEvent.registration_id}`}
              />

              <TicketActions
                registration={{
                  id: selectedTicketEvent.registration_id,
                  full_name: fullName,
                  email: user?.email || "",
                }}
                event={{
                  id: selectedTicketEvent.id,
                  title: selectedTicketEvent.title,
                  date: selectedTicketEvent.date,
                  venue: selectedTicketEvent.venue,
                  city: selectedTicketEvent.city,
                  category: selectedTicketEvent.category,
                }}
                ticketTierName={selectedTicketEvent.ticket_name}
                ticketDomId={`dash-pass-${selectedTicketEvent.registration_id}`}
              />
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-card border-t border-border flex items-center justify-between shrink-0">
              <Link
                to={`/tickets/${selectedTicketEvent.registration_id}`}
                target="_blank"
                className="text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
              >
                Open Fullscreen Pass
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTicketEvent(null)}
                className="text-xs font-bold"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendeeOverview;
