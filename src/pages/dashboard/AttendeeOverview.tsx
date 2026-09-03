import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, MapPin, Ticket, Image, CheckCircle2, ArrowRight, Compass, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { slugify, getEventDpUrl, getEventUrl } from "@/lib/slugUtils";

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
}

const AttendeeOverview = () => {
  const { user, profile } = useAuth();
  const [registrations, setRegistrations] = useState<RegisteredEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fullName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Attendee";
  const firstName = fullName.split(" ")[0];

  useEffect(() => {
    if (!user?.email && !user?.id) return;

    const fetchMyEvents = async () => {
      setLoading(true);
      try {
        // Query registrations matching user_id OR email
        const { data: regs, error } = await supabase
          .from("registrations")
          .select("id, amount_paid, checked_in, created_at, event_id, ticket_types(name), events(*)")
          .or(`user_id.eq.${user?.id},email.eq.${user?.email}`);

        if (error) throw error;

        const list: RegisteredEvent[] = (regs || [])
          .filter((r) => r.events) // Only valid events
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

  const upcomingEvents = registrations.filter((r) => new Date(r.date) >= new Date(new Date().setHours(0, 0, 0, 0)));
  const pastEvents = registrations.filter((r) => new Date(r.date) < new Date(new Date().setHours(0, 0, 0, 0)));

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-12">
      {/* Welcome Banner */}
      <div className="border-b border-border pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-secondary/10 text-secondary px-2.5 py-1 rounded inline-block mb-2 font-bold">
            MY ATTENDEE PORTAL
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-foreground tracking-tight">
            Welcome back, {firstName}.
          </h1>
          <p className="text-muted-foreground text-xs font-medium mt-1">
            Access your event tickets, generate custom DP frames, and explore upcoming events across Africa.
          </p>
        </div>

        <Link to="/">
          <Button size="sm" className="bg-secondary text-secondary-foreground font-bold text-xs h-10 px-4 rounded-lg flex items-center gap-2 hover:opacity-90 shadow-sm">
            <Compass className="w-4 h-4" /> Explore Events
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-medium">Loading your registered events…</p>
        </div>
      ) : registrations.length === 0 ? (
        /* Empty State */
        <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center space-y-4 max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mx-auto">
            <Ticket className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-heading text-xl font-bold text-foreground">No Registered Events Yet</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You haven't signed up for any events yet. Browse featured events on MyEventGuru and get your tickets in 1-click!
            </p>
          </div>
          <Link to="/">
            <Button size="sm" className="bg-secondary text-secondary-foreground font-bold text-xs h-10 px-6 rounded-lg shadow-sm">
              Discover Upcoming Events →
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Upcoming Registered Events */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                <Ticket className="w-5 h-5 text-secondary" /> My Upcoming Events ({upcomingEvents.length})
              </h2>
            </div>

            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No upcoming events scheduled.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {upcomingEvents.map((evt) => (
                  <div key={evt.registration_id} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col justify-between hover:border-secondary transition-all shadow-xs group">
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
                        <div className="absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border bg-chart-green/10 text-chart-green border-chart-green/30">
                          {evt.checked_in ? "Checked In" : "Confirmed"}
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        <div>
                          <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground tracking-wider">
                            {evt.category} • {evt.ticket_name}
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
                      </div>
                    </div>

                    <div className="p-4 pt-0 space-y-2">
                      <Link to={getEventDpUrl(evt)} className="block">
                        <Button className="w-full bg-secondary text-secondary-foreground font-bold text-xs h-9 rounded-lg hover:opacity-90 flex items-center justify-center gap-1.5 shadow-xs">
                          <Image className="w-3.5 h-3.5" /> Generate Event DP <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>

                      <Link to={getEventUrl(evt)} className="block">
                        <Button variant="outline" size="sm" className="w-full text-xs font-bold h-9 border-border justify-center">
                          View Event Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Events Section */}
          {pastEvents.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-border">
              <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-muted-foreground" /> Attended / Past Events ({pastEvents.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {pastEvents.map((evt) => (
                  <div key={evt.registration_id} className="bg-card border border-border rounded-lg p-4 space-y-2 opacity-80 hover:opacity-100 transition-opacity">
                    <div className="font-bold text-xs text-foreground truncate">{evt.title}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(evt.date).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                    <Link to={getEventDpUrl(evt)} className="text-[11px] font-bold text-secondary hover:underline flex items-center gap-1 pt-1">
                      <Image className="w-3 h-3" /> View DP Frame
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AttendeeOverview;
