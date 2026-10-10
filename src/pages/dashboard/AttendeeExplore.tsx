import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  Search, Calendar, MapPin, Ticket, ArrowRight, Loader2, 
  Compass, ArrowUpRight, Sparkles 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getEventUrl } from "@/lib/slugUtils";
import { SEOHead } from "@/components/seo/SEOHead";

const CATEGORIES = [
  { id: "all", label: "All Events" },
  { id: "tech", label: "Tech & Startups" },
  { id: "music", label: "Concerts & Music" },
  { id: "business", label: "Business & Networking" },
  { id: "campus", label: "Campus & Youth" },
  { id: "community", label: "Faith & Community" },
  { id: "creative", label: "Creative & Arts" },
];

export const AttendeeExplore: React.FC = () => {
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
        console.error("Failed to load events for attendee exploration", err);
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12 w-full min-w-0 overflow-x-hidden">
      <SEOHead
        title="Explore Live Events"
        description="Find and register for top conferences, concerts, and gatherings on EventRally."
        noIndex={true}
      />

      {/* Header */}
      <div className="border-b border-border pb-6 w-full min-w-0 space-y-2">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-secondary/10 text-secondary px-2.5 py-1 rounded inline-block">
          DISCOVER LIVE EVENTS
        </div>
        <h1 className="font-heading text-2xl sm:text-4xl font-black text-foreground tracking-tight">
          Explore Platform Events
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm max-w-xl">
          Discover conferences, summits, concerts, and meetups. Register or buy tickets in 1-click and get your pass in your wallet.
        </p>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="space-y-3 bg-card border border-border rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events by title, city, or venue (e.g. Lagos, Abuja)..."
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-background border-border text-xs sm:text-sm font-medium focus-visible:ring-primary shadow-xs"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                  selectedCategory === cat.id
                    ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                    : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Price Filters */}
          <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto text-xs">
            <span className="font-mono text-[10px] uppercase font-bold text-muted-foreground mr-1">PRICE:</span>
            {(["all", "free", "paid"] as const).map((pf) => (
              <button
                key={pf}
                onClick={() => setPriceFilter(pf)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase transition-all border ${
                  priceFilter === pf
                    ? "bg-secondary text-secondary-foreground border-secondary shadow-xs"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {pf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Event Catalog Feed */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-medium">Loading live events catalog…</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-16 bg-card border border-dashed border-border rounded-xl space-y-3 p-6">
          <Compass className="w-10 h-10 mx-auto text-muted-foreground/30" />
          <h3 className="font-heading text-base font-bold text-foreground">No events found</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {searchQuery
              ? `No events matching "${searchQuery}". Try a different keyword or reset filters.`
              : "There are currently no events listed in this category."}
          </p>
          {(searchQuery || selectedCategory !== "all" || priceFilter !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setPriceFilter("all");
              }}
              className="text-xs font-bold"
            >
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map((event) => {
            const isPastEvent = new Date(event.date).getTime() < Date.now();
            const dateFormatted = new Date(event.date).toLocaleDateString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            // Calculate min price
            const prices = (event.ticket_types || [])
              .map((t: any) => t.price)
              .filter((p: any) => typeof p === "number");
            const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
            const priceLabel = event.is_free || minPrice === 0 ? "Free Access" : `From ₦${minPrice.toLocaleString()}`;

            return (
              <div
                key={event.id}
                className="group rounded-2xl bg-card border border-border hover:border-primary/40 transition-all duration-200 overflow-hidden shadow-xs flex flex-col justify-between"
              >
                <div>
                  {/* Event Banner */}
                  <div className="aspect-[16/9] w-full bg-muted relative overflow-hidden">
                    {event.image_url ? (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-xs font-mono">
                        Event Banner
                      </div>
                    )}
                    <span className="absolute top-3 left-3 bg-background/90 backdrop-blur-md px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider text-foreground border border-border">
                      {event.category || "General"}
                    </span>
                    <span className="absolute top-3 right-3 bg-background/90 backdrop-blur-md px-2.5 py-1 rounded text-[10px] font-mono font-bold text-foreground border border-border">
                      {priceLabel}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="p-4 sm:p-5 space-y-2.5">
                    <h3 className="font-heading text-base font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
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

                {/* Card Footer Actions */}
                <div className="p-4 sm:p-5 pt-0">
                  <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono font-bold text-foreground truncate">
                      {priceLabel}
                    </span>
                    <Link to={getEventUrl(event)} className="shrink-0">
                      <Button
                        size="sm"
                        variant={isPastEvent ? "outline" : "default"}
                        className="h-8 text-xs font-bold gap-1 px-3.5 rounded-lg shadow-xs"
                      >
                        <span>{isPastEvent ? "View Details" : "Get Pass"}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AttendeeExplore;
