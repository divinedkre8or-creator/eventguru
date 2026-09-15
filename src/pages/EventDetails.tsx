import { useState } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Calendar, MapPin, Tag, Users, ArrowLeft, Loader2, 
  Image as ImageIcon, Edit2, Trash2, Share2, AlertCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CheckoutModal } from "@/components/events/CheckoutModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { slugify, getEventUrl, getEventDpUrl } from "@/lib/slugUtils";
import { SEOHead } from "@/components/seo/SEOHead";
import { BrandLogo } from "@/components/brand/BrandLogo";

const EventDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const { data: event, isLoading, error, refetch } = useQuery({
    queryKey: ["public-event", id],
    queryFn: async () => {
      let eventData: any = null;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || "");

      if (isUUID) {
        const { data, error } = await supabase
          .from("events")
          .select("*, ticket_types(*)")
          .eq("id", id)
          .single();
        if (error) throw error;
        eventData = data;
      } else {
        // Resolve human-readable slug by matching slugified title
        const { data: allEvents, error } = await supabase
          .from("events")
          .select("*, ticket_types(*)");
        if (error) throw error;
        eventData = (allEvents || []).find((e: any) => slugify(e.title) === id) || null;
      }

      if (!eventData) throw new Error("Event not found");

      // Fetch dp_templates
      let dpTemplates = null;
      try {
        const { data: dpData } = await supabase
          .from("dp_templates")
          .select("id")
          .eq("event_id", eventData.id)
          .maybeSingle();
        dpTemplates = dpData ? [dpData] : null;
      } catch (e) {
        console.warn("DP Templates table not ready yet");
      }

      return { ...eventData, dp_templates: dpTemplates };
    },
    enabled: !!id,
  });

  const handleDelete = async () => {
    if (!id || !user) return;
    const confirmDelete = window.confirm("Are you sure you want to permanently delete this event? This will also remove all associated tickets.");
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      // First delete tickets to avoid constraint errors
      await supabase.from("ticket_types").delete().eq("event_id", id);
      // Then delete event
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
      
      toast.success("Event deleted successfully");
      navigate("/dashboard/events");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete event");
      setIsDeleting(false);
    }
  };

  const handleCopyLink = () => {
    if (!event) return;
    const cleanUrl = `${window.location.origin}${getEventUrl(event)}`;
    navigator.clipboard.writeText(cleanUrl);
    toast.success("Event link copied to clipboard!");
  };

  if (isLoading || isDeleting) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-background p-6 text-center space-y-4 font-sans">
        <h1 className="font-heading text-4xl font-black text-foreground tracking-tight">Event not found</h1>
        <p className="text-muted-foreground text-sm font-medium">The event you are looking for does not exist or has been removed.</p>
        <Link to="/">
          <Button variant="secondary" className="font-bold px-6 py-3 rounded-lg shadow-sm">
            Return Home
          </Button>
        </Link>
      </div>
    );
  }

  const { title, image_url, venue, city, country, category, ticket_types, is_free, organiser_id, date } = event;
  const isOrganizer = user?.id === organiser_id;

  const eventDateObj = new Date(date);
  const isPastEvent = !isNaN(eventDateObj.getTime()) && eventDateObj.getTime() < Date.now();

  // Parse Description, Schedule, Additional Info
  let parsedDesc = "";
  let parsedSchedule: Array<{ date: string; startTime: string; endTime?: string }> = [];
  let parsedAdditional = "";
  let parsedBrandColor = "";
  if (rawDesc.includes("|||BRAND_COLOR|||")) {
    const bcParts = rawDesc.split("|||BRAND_COLOR|||");
    rawDesc = bcParts[0];
    parsedBrandColor = (bcParts[1] || "").trim();
  }

  if (rawDesc.includes("|||ADDITIONAL_INFO|||")) {
    const parts = rawDesc.split("|||ADDITIONAL_INFO|||");
    parsedDesc = parts[0];
    parsedAdditional = parts[1] || "";
  }

  if (parsedDesc.includes("|||SCHEDULE|||")) {
    const parts = parsedDesc.split("|||SCHEDULE|||");
    parsedDesc = parts[0];
    try {
      parsedSchedule = JSON.parse(parts[1]);
    } catch (e) {
      console.error("Failed to parse schedule JSON", e);
    }
  }
  
  parsedDesc = parsedDesc.trim();
  parsedAdditional = parsedAdditional.trim();

  // If no schedule JSON exists but date/end_date exist, format a fallback display
  let fallbackSchedule = "";
  if (parsedSchedule.length === 0 && event.date) {
    fallbackSchedule = new Date(event.date).toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (event.end_date) {
      fallbackSchedule += ` until ${new Date(event.end_date).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })}`;
    }
  }

  // Parse coupon code from URL
  const couponCode = searchParams.get("coupon_code");
  let discountPercentage = 0;
  if (couponCode) {
    const match = String(couponCode).match(/(\d+)\s*(?:percent|%|off)/i);
    if (match) {
      discountPercentage = Math.min(parseInt(match[1], 10), 100);
    }
  }

  // Build rich schema.org Event structured data
  const eventSchema = event
    ? {
        "@context": "https://schema.org",
        "@type": "Event",
        name: event.title,
        description: parsedDesc.slice(0, 250) || `${event.title} on EventRally`,
        startDate: event.date,
        ...(event.end_date ? { endDate: event.end_date } : {}),
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: {
          "@type": "Place",
          name: event.venue || event.city || "Venue TBA",
          address: {
            "@type": "PostalAddress",
            addressLocality: event.city || "Lagos",
            addressCountry: event.country || "NG",
          },
        },
        image: event.image_url ? [event.image_url] : ["https://eventrally.com/ER%20full%20logo.png"],
        organizer: {
          "@type": "Organization",
          name: "EventRally Organizer",
          url: "https://eventrally.com",
        },
        offers:
          event.ticket_types && event.ticket_types.length > 0
            ? event.ticket_types.map((t: any) => ({
                "@type": "Offer",
                name: t.name,
                price: t.price || 0,
                priceCurrency: "NGN",
                availability: t.quantity > (t.sold || 0) ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
                url: typeof window !== "undefined" ? window.location.href : `https://eventrally.com${getEventUrl(event)}`,
              }))
            : {
                "@type": "Offer",
                price: "0",
                priceCurrency: "NGN",
                availability: "https://schema.org/InStock",
                url: typeof window !== "undefined" ? window.location.href : `https://eventrally.com${getEventUrl(event)}`,
              },
      }
    : undefined;

  return (
    <div className="min-h-screen bg-background font-sans text-foreground antialiased">
      {event && (
        <SEOHead
          title={`${event.title} — Tickets & Schedule`}
          description={parsedDesc ? parsedDesc.slice(0, 150) : `Get tickets, schedule details, and venue directions for ${event.title} on EventRally.`}
          ogImage={event.image_url || "/ER full logo.png"}
          canonicalPath={getEventUrl(event)}
          schema={eventSchema}
        />
      )}
      {/* Navigation */}
      <nav className="bg-card/90 backdrop-blur-md sticky top-0 z-50 border-b border-border">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-1 hover:opacity-90 transition-opacity" aria-label={user ? "EventRally Dashboard" : "EventRally Home"}>
            <BrandLogo />
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user ? (
               <Link to="/dashboard" className="text-xs font-bold text-foreground hover:opacity-80 transition-opacity px-2 py-1">
                Dashboard
               </Link>
            ) : (
              <>
                <Link to="/login" className="text-xs font-bold text-foreground hover:opacity-80 px-2 py-1 hidden sm:block">
                  Log In
                </Link>
                <Link to="/signup">
                  <Button variant="secondary" size="sm" className="font-bold text-xs h-9 px-4 rounded-lg shadow-sm">
                    Get Started Free
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Organizer Actions Floating Bar */}
        {isOrganizer && (
           <div className="bg-primary text-primary-foreground p-3 rounded-lg flex flex-wrap items-center justify-between gap-4 shadow-sm mb-6 border border-border">
             <div className="flex items-center gap-2">
               <span className="inline-block w-2 h-2 rounded-full bg-chart-green animate-pulse"></span>
               <span className="text-xs font-bold font-mono uppercase tracking-wider">You are managing this event</span>
             </div>
             <div className="flex items-center gap-1">
               <button onClick={handleCopyLink} className="p-2 rounded-lg hover:bg-primary-foreground/10 text-primary-foreground transition-colors" title="Copy Link">
                 <Share2 className="w-4 h-4" />
               </button>
               <Link to={`/dashboard/events/${event.id}/edit`}>
                 <button className="p-2 rounded-lg hover:bg-primary-foreground/10 text-primary-foreground transition-colors" title="Edit Event">
                   <Edit2 className="w-4 h-4" />
                 </button>
               </Link>
               <button onClick={handleDelete} className="p-2 rounded-lg hover:bg-destructive/20 text-primary-foreground hover:text-destructive transition-colors" title="Delete Event">
                 <Trash2 className="w-4 h-4" />
               </button>
             </div>
           </div>
        )}

        {/* Banner Section - Natural Aspect Ratio Display without forced cropping */}
        <div className="w-full max-h-[550px] bg-card/50 rounded-2xl border border-border overflow-hidden relative shadow-md flex items-center justify-center p-1 sm:p-2">
          {image_url ? (
            <img 
              src={image_url} 
              alt={title} 
              className="w-full h-auto max-h-[520px] object-contain rounded-xl" 
            />
          ) : (
            <div className="w-full h-48 sm:h-64 flex flex-col items-center justify-center text-muted-foreground/40 bg-muted/40 rounded-xl">
              <ImageIcon className="w-16 h-16 mb-2" />
              <span className="text-xs font-mono font-bold">No Event Banner</span>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4 border-b border-border pb-8">
              <div
                className={`text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded inline-block ${parsedBrandColor ? '' : 'bg-muted text-foreground'}`}
                style={parsedBrandColor ? { backgroundColor: `${parsedBrandColor}20`, color: parsedBrandColor } : undefined}
              >
                {category?.replace("-", " ")}
              </div>
              <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black text-foreground leading-tight tracking-tight">
                {title}
              </h1>
            </div>

            <div className="prose prose-sm sm:prose-base max-w-none text-muted-foreground font-sans leading-[1.8] whitespace-pre-wrap dark:prose-invert">
              {parsedDesc || "No description provided for this event."}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-6 sticky top-24">
              
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="bg-secondary/10 w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">When</h3>
                    {parsedSchedule.length > 0 ? (
                      <div className="mt-1 space-y-1">
                        {parsedSchedule.map((s, idx) => (
                           <div key={idx} className="text-muted-foreground text-xs">
                             <span className="font-bold text-foreground">{new Date(s.date).toLocaleDateString("en-US", { month: 'short', day: 'numeric' })}:</span> {s.startTime} {s.endTime ? `- ${s.endTime}` : ''}
                           </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-xs mt-1">
                        {fallbackSchedule || "TBA"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-destructive/10 w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">Where</h3>
                    <p className="text-muted-foreground text-xs mt-1">
                      {venue || "Online Event"}
                      {(city || country) && (
                        <span className="block mt-0.5">
                          {[city, country].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">Tickets</h3>
                  {discountPercentage > 0 && !isPastEvent && (
                     <span className="text-[10px] font-mono font-bold bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                        {discountPercentage}% OFF
                     </span>
                  )}
                  {isPastEvent && (
                    <span className="text-[10px] font-mono font-bold bg-destructive/10 text-destructive border border-destructive/30 px-2 py-0.5 rounded uppercase">
                      Event Concluded
                    </span>
                  )}
                </div>

                {isPastEvent && (
                  <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-bold flex items-start gap-2.5 mb-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <div>Event Has Ended</div>
                      <div className="font-normal opacity-90 mt-0.5">Ticket sales and attendee registration for this event are officially closed.</div>
                    </div>
                  </div>
                )}

                {ticket_types && ticket_types.length > 0 ? (
                  ticket_types.map((ticket: any) => {
                    const originalPrice = ticket.price || 0;
                    const discountedPrice = discountPercentage > 0 ? originalPrice * (1 - discountPercentage / 100) : originalPrice;
                    
                    return (
                    <div key={ticket.id} className={`flex flex-col gap-3 p-4 rounded-xl border bg-background transition-all shadow-xs group ${isPastEvent ? 'border-border opacity-70' : 'border-border hover:border-secondary'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-foreground">{ticket.name}</span>
                        <div className="flex items-center gap-2">
                          {discountPercentage > 0 && originalPrice > 0 && (
                            <span className="text-xs text-muted-foreground line-through">
                              NGN {originalPrice.toLocaleString()}
                            </span>
                          )}
                          <span className="font-mono font-bold text-foreground text-base">
                            {originalPrice === 0 ? "Free" : `NGN ${discountedPrice.toLocaleString()}`}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{ticket.description || "Access ticket to event"}</p>
                      
                      <Button 
                        variant={isPastEvent ? "outline" : "secondary"}
                        disabled={isPastEvent}
                        onClick={() => {
                          if (isPastEvent) return;
                          setSelectedTicket(ticket);
                          setIsCheckoutOpen(true);
                        }}
                        className={`w-full font-bold text-xs h-10 rounded-lg shadow-sm flex items-center justify-center gap-2 mt-1 ${isPastEvent ? 'opacity-60 cursor-not-allowed border-border text-muted-foreground' : ''}`}
                        style={(!isPastEvent && parsedBrandColor) ? { backgroundColor: parsedBrandColor, color: '#fff', borderColor: parsedBrandColor } : undefined}
                      >
                        <Tag className="w-3.5 h-3.5" />
                        {isPastEvent ? "Registration Closed" : (is_free || discountedPrice === 0 ? "Register For Event" : "Buy Ticket")}
                      </Button>
                    </div>
                  )})
                ) : (
                  <p className="text-muted-foreground text-xs italic">No tickets available yet.</p>
                )}
              </div>
              
              {/* DP Generator Link Block */}
              {event.dp_templates && (Array.isArray(event.dp_templates) ? event.dp_templates.length > 0 : true) && (
                <div className="border-t border-border pt-6 mt-6">
                   <div className="bg-secondary/5 border border-secondary/20 rounded-lg p-5 text-center">
                     <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                       <ImageIcon className="w-5 h-5 text-secondary" />
                     </div>
                     <h3 className="font-bold text-sm text-foreground mb-1">Get Your Display Picture</h3>
                     <p className="text-xs text-muted-foreground mb-4">Generate a custom DP flier for this event to let your network know you are attending!</p>
                     <Link to={getEventDpUrl(event)}>
                        <Button
                          variant="secondary"
                          className="w-full font-bold text-xs h-10 rounded-lg shadow-sm"
                          style={parsedBrandColor ? { backgroundColor: parsedBrandColor, color: '#fff', borderColor: parsedBrandColor } : undefined}
                        >
                           Create My DP
                        </Button>
                     </Link>
                   </div>
                </div>
              )}
              
              {/* Additional Information rendered correctly AFTER tickets on the side, or full width */}
              {parsedAdditional && (
                <div className="border-t border-border pt-6 lg:hidden">
                  <h3 className="font-bold text-sm text-foreground mb-3">Organizer Note</h3>
                  <div className="p-4 bg-muted rounded-lg border border-border text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {parsedAdditional}
                  </div>
                </div>
              )}

            </div>
          </div>
          
          {/* Full width Additional Information for desktop so it shines distinctly */}
          {parsedAdditional && (
             <div className="lg:col-span-2 hidden lg:block">
               <h3 className="font-heading font-black text-xl text-foreground mb-4 border-t border-border pt-8 tracking-tight">
                 Additional Information
               </h3>
               <div className="p-6 bg-card rounded-xl border border-border shadow-sm text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap font-sans">
                 {parsedAdditional}
               </div>
             </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-10 px-4 sm:px-6">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-6" imgClassName="h-6" />
            <span>•</span>
            <span>Where Everyone's Going.</span>
          </div>
          <div>© 2026 EVENTRALLY. All rights reserved.</div>
        </div>
      </footer>

      {/* Checkout Flow */}
      {selectedTicket && (
        <CheckoutModal 
          isOpen={isCheckoutOpen} 
          onClose={() => setIsCheckoutOpen(false)} 
          event={event} 
          ticket={selectedTicket}
          discountPercentage={discountPercentage}
          onSuccess={() => {
            refetch(); // Reload to reflect ticket decrement
          }}
        />
      )}

    </div>
  );
};

export default EventDetails;
