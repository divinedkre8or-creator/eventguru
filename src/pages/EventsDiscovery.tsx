import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  Search, Calendar, MapPin, Ticket, ArrowRight, Loader2, 
  Filter, Sparkles, Compass, ArrowUpRight, CheckCircle2, ChevronRight, PlusCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { getEventUrl } from "@/lib/slugUtils";
import { SEOHead } from "@/components/seo/SEOHead";
import { SiteHeader } from "@/components/navigation/SiteHeader";
import { SiteFooter } from "@/components/navigation/SiteFooter";

const CATEGORIES = [
  { id: "all", label: "All Events" },
  { id: "tech", label: "Tech & Startups" },
  { id: "music", label: "Concerts & Music" },
  { id: "business", label: "Business & Networking" },
  { id: "campus", label: "Campus & Youth" },
  { id: "community", label: "Faith & Community" },
  { id: "creative", label: "Creative & Arts" },
];

export const EventsDiscovery: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "paid">("all");

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("events")
          .select("id, title, date, venue, city, country, image_url, category, is_free, max_attendees, ticket_types(price)")
          .eq("status", "published")
          .order("date", { ascending: true });

        if (error) throw error;
        setEvents(data || []);
      } catch (err) {
        console.error("Failed to load events", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        e.title?.toLowerCase().includes(q) ||
        e.venue?.toLowerCase().includes(q) ||
        e.city?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q);

      const matchCategory =
        selectedCategory === "all" ||
        e.category?.toLowerCase().includes(selectedCategory);

      const matchPrice =
        priceFilter === "all" ||
        (priceFilter === "free" && (e.is_free || e.ticket_types?.every((t: any) => t.price === 0))) ||
        (priceFilter === "paid" && !e.is_free && e.ticket_types?.some((t: any) => t.price > 0));

      return matchSearch && matchCategory && matchPrice;
    });
  }, [events, searchQuery, selectedCategory, priceFilter]);

  const itemListSchema = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: filteredEvents.slice(0, 15).map((event, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Event",
          name: event.title,
          startDate: event.date,
          url: `https://www.geteventrally.com${getEventUrl(event)}`,
          location: {
            "@type": "Place",
            name: event.venue || event.city || "Venue TBA",
            address: {
              "@type": "PostalAddress",
              addressLocality: event.city || "Lagos",
              addressCountry: event.country || "NG",
            },
          },
        },
      })),
    }),
    [filteredEvents]
  );

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased flex flex-col selection:bg-primary selection:text-primary-foreground">
      <SEOHead
        title="Explore Live Events, Tech Summits & Concerts"
        description="Find and register for trending tech conferences, music festivals, campus conventions, and networking mixers across Africa on EventRally."
        canonicalPath="/events"
        schema={itemListSchema}
      />
      
      {/* Universal Header */}
      <SiteHeader />

      {/* Hero Search Header */}
      <section className="border-b border-border bg-card/60 py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-[11px] font-mono font-bold tracking-wider uppercase">
            <Compass className="w-3.5 h-3.5" /> LIVE EVENT DIRECTORY
          </div>

          <h1 className="font-heading text-3xl sm:text-5xl font-black text-foreground tracking-tight uppercase">
            Discover What's Happening.
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Find and register for top concerts, conferences, tech summits, and gatherings. Get your digital pass and QR code in 1-click.
          </p>

          {/* Search Box */}
          <div className="pt-2 max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events by title, venue, or city (e.g. Lagos, Abuja)..."
                className="w-full h-12 pl-12 pr-4 rounded-xl bg-background border-border text-sm font-medium focus-visible:ring-primary shadow-sm"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  selectedCategory === cat.id
                    ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Price Filters */}
          <div className="flex items-center justify-center gap-2 pt-1 text-xs text-muted-foreground">
            <span className="font-mono text-[10px] uppercase font-bold">PRICING:</span>
            {(["all", "free", "paid"] as const).map((pf) => (
              <button
                key={pf}
                onClick={() => setPriceFilter(pf)}
                className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase transition-all ${
                  priceFilter === pf
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {pf}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Events Grid Section */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-12 flex-1 w-full">
        <div className="flex items-center justify-between mb-8 pb-3 border-b border-border">
          <div>
            <div className="font-mono text-xs font-bold text-muted-foreground uppercase">
              SHOWING {filteredEvents.length} {filteredEvents.length === 1 ? "EVENT" : "EVENTS"}
            </div>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs font-semibold text-secondary hover:underline"
            >
              Clear search
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-secondary" />
            <p className="text-xs font-mono font-bold uppercase text-muted-foreground">
              FETCHING LIVE EVENTS...
            </p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-2xl p-16 text-center space-y-4 max-w-lg mx-auto my-8 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
              <Ticket className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading text-lg font-bold text-foreground">No Events Found</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {searchQuery || selectedCategory !== "all" || priceFilter !== "all"
                  ? "Try resetting your search or category filters to discover more events."
                  : "No published events available right now. Check back shortly or host your own!"}
              </p>
            </div>
            {(searchQuery || selectedCategory !== "all" || priceFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setPriceFilter("all");
                }}
                className="text-xs font-bold mt-2"
              >
                Reset All Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => {
              const eventDate = new Date(event.date);
              const isValidDate = !isNaN(eventDate.getTime());
              const isPastEvent = isValidDate && eventDate.getTime() < Date.now();

              const dateFormatted = isValidDate
                ? eventDate.toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Date TBA";

              const minPrice = (event.ticket_types || []).reduce(
                (min: number, t: any) => (t.price < min ? t.price : min),
                Infinity
              );
              const priceLabel = event.is_free || minPrice === 0 || minPrice === Infinity
                ? "Free"
                : `From ₦${minPrice.toLocaleString()}`;

              return (
                <div
                  key={event.id}
                  className={`bg-card border rounded-xl overflow-hidden flex flex-col justify-between transition-all shadow-xs group ${
                    isPastEvent ? "border-border opacity-85 hover:opacity-100" : "border-border hover:border-secondary/50"
                  }`}
                >
                  <div>
                    {/* Event Banner */}
                    <div className="relative aspect-[16/9] bg-muted overflow-hidden">
                      {event.image_url ? (
                        <img
                          src={event.image_url}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                          <Ticket className="w-10 h-10 opacity-40" />
                        </div>
                      )}
                      
                      {/* Category & Expired Badge */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                        {isPastEvent ? (
                          <span className="bg-destructive text-destructive-foreground text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full uppercase shadow-md flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                            CLOSED / ENDED
                          </span>
                        ) : (
                          <span />
                        )}
                        <span className="bg-primary text-primary-foreground text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase shadow-xs ml-auto">
                          {event.category || "Event"}
                        </span>
                      </div>
                    </div>

                    {/* Event Content */}
                    <div className="p-5 space-y-2.5">
                      <h3 className="font-heading text-lg font-bold text-foreground line-clamp-1 group-hover:text-secondary transition-colors">
                        {event.title}
                      </h3>

                      <div className="space-y-1.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-secondary shrink-0" />
                          <span className={isPastEvent ? "line-through opacity-70" : ""}>{dateFormatted}</span>
                        </div>
                        {(event.venue || event.city) && (
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 text-destructive shrink-0" />
                            <span className="truncate">{[event.venue, event.city].filter(Boolean).join(", ")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom CTA */}
                  <div className="p-5 pt-0">
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase block">ENTRY</span>
                        <span className="font-mono font-black text-sm text-foreground">{priceLabel}</span>
                      </div>
                      <Link to={getEventUrl(event)}>
                        {isPastEvent ? (
                          <Button variant="outline" size="sm" className="font-bold text-xs h-9 px-4 rounded-lg flex items-center gap-1 border-border text-muted-foreground">
                            <span>Event Ended</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        ) : (
                          <Button variant="secondary" size="sm" className="font-bold text-xs h-9 px-4 rounded-lg flex items-center gap-1 shadow-xs">
                            <span>Get Ticket</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Bottom Host Banner */}
      <section className="bg-card border-t border-border py-12 px-4 sm:px-6 text-center">
        <div className="max-w-2xl mx-auto space-y-3">
          <h2 className="font-heading text-2xl sm:text-3xl font-black text-foreground uppercase tracking-tight">
            Hosting your own gathering?
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            Set up ticket tiers in 2 minutes, get paid directly with automated bank settlements, and turn attendees into your viral promo team.
          </p>
          <div className="pt-2">
            <Link to="/signup">
              <Button className="bg-primary text-primary-foreground font-bold text-xs h-10 px-6 rounded-lg hover:opacity-90 shadow-sm flex items-center gap-2 mx-auto">
                <PlusCircle className="w-4 h-4" />
                <span>Create Event Free</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Universal Semantic Footer */}
      <SiteFooter />
    </div>
  );
};

export default EventsDiscovery;
