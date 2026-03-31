import { useState } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, Tag, Users, ArrowLeft, Loader2, Image as ImageIcon, Edit2, Trash2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KenteStripe } from "@/components/KenteStripe";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CheckoutModal } from "@/components/events/CheckoutModal";
import { ThemeToggle } from "@/components/ThemeToggle"; // Import ThemeToggle

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
      const { data, error } = await supabase
        .from("events")
        .select("*, ticket_types(*)")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      
      // Attempt to fetch dp_templates separately so it doesn't hard-crash the event page if the table is missing
      let dpTemplates = null;
      try {
        const { data: dpData } = await supabase
          .from("dp_templates")
          .select("id")
          .eq("event_id", id)
          .maybeSingle();
        dpTemplates = dpData ? [dpData] : null; // Wrap in array as expected by the UI condition
      } catch (e) {
        console.warn("DP Templates table not ready yet");
      }
      
      return { ...data, dp_templates: dpTemplates };
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
    navigator.clipboard.writeText(window.location.href);
    toast.success("Event link copied to clipboard!");
  };

  if (isLoading || isDeleting) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-background p-6 text-center space-y-4 font-[DM_Sans]">
        <h1 className="font-heading text-4xl font-extrabold text-foreground">Event not found</h1>
        <p className="text-muted-foreground text-base">The event you are looking for does not exist or has been removed.</p>
        <Link to="/">
          <button className="bg-primary text-primary-foreground font-heading font-bold px-6 py-3 rounded-xl hover:brightness-110 transition-all">Return Home</button>
        </Link>
      </div>
    );
  }

  const { title, image_url, venue, city, country, category, ticket_types, is_free, organiser_id } = event;
  const isOrganizer = user?.id === organiser_id;

  // Parse Description, Schedule, Additional Info
  let rawDesc = event.description || "";
  let parsedDesc = rawDesc;
  let parsedSchedule: any[] = [];
  let parsedAdditional = "";

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

  return (
    <div className="min-h-screen bg-background font-[DM_Sans] transition-colors duration-300">
      <KenteStripe />

      {/* Navigation */}
      <nav className="bg-background/95 backdrop-blur-[12px] sticky top-0 z-50 border-b border-border transition-colors duration-300">
        <div className="container max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="font-heading font-bold text-xl text-foreground">
            Event<span className="text-primary">stack</span>
          </Link>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            {user ? (
               <Link to="/dashboard" className="text-foreground text-sm font-medium bg-transparent hover:opacity-80 transition-opacity">
                Dashboard
               </Link>
            ) : (
              <>
                <Link to="/login" className="text-foreground text-sm font-medium bg-transparent hover:opacity-80 transition-opacity hidden sm:block">
                  Log In
                </Link>
                <Link to="/signup">
                  <button className="bg-primary text-primary-foreground font-heading font-bold text-sm rounded-[10px] px-5 py-2.5 hover:brightness-110 hover:-translate-y-[1px] transition-all">
                    Get Started
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="container max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Organizer Actions Floating Bar */}
        {isOrganizer && (
           <div className="bg-secondary text-secondary-foreground p-3 rounded-[12px] flex flex-wrap items-center justify-between gap-4 shadow-sm mb-6 border border-border">
             <div className="flex items-center gap-2">
               <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
               <span className="text-sm font-bold font-heading">You are managing this event</span>
             </div>
             <div className="flex items-center gap-2">
               <button onClick={handleCopyLink} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Copy Link">
                 <Share2 className="w-5 h-5" />
               </button>
               <Link to={`/dashboard/events/${event.id}/edit`}>
                 <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Edit Event">
                   <Edit2 className="w-5 h-5" />
                 </button>
               </Link>
               <button onClick={handleDelete} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete Event">
                 <Trash2 className="w-5 h-5" />
               </button>
             </div>
           </div>
        )}

        {/* Banner Section */}
        <div className="w-full aspect-[21/9] sm:aspect-[3/1] bg-card rounded-2xl border border-border overflow-hidden relative shadow-sm">
          {image_url ? (
            <img src={image_url} alt={title} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/30 bg-muted">
              <ImageIcon className="w-16 h-16" />
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4 border-b border-border pb-8">
              <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-heading font-bold uppercase tracking-wider backdrop-blur-sm">
                {category?.replace("-", " ")}
              </div>
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground leading-[1.1] tracking-[-1px]">
                {title}
              </h1>
            </div>

            <div className="prose prose-sm sm:prose-base max-w-none text-muted-foreground font-[DM_Sans] leading-[1.8] whitespace-pre-wrap dark:prose-invert">
              {parsedDesc || "No description provided for this event."}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-6 sticky top-24">
              
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 w-11 h-11 rounded-xl flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-base text-foreground">When</h3>
                    {parsedSchedule.length > 0 ? (
                      <div className="mt-1 space-y-1">
                        {parsedSchedule.map((s, idx) => (
                           <div key={idx} className="text-muted-foreground text-sm font-[DM_Sans]">
                             <span className="font-bold text-foreground">{new Date(s.date).toLocaleDateString("en-US", { month: 'short', day: 'numeric' })}:</span> {s.startTime} {s.endTime ? `- ${s.endTime}` : ''}
                           </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm font-[DM_Sans] mt-1 pr-2">
                        {fallbackSchedule || "TBA"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-destructive/10 w-11 h-11 rounded-xl flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-base text-foreground">Where</h3>
                    <p className="text-muted-foreground text-sm font-[DM_Sans] mt-1 pr-2">
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading font-extrabold text-lg text-foreground">Tickets</h3>
                  {discountPercentage > 0 && (
                     <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full inline-block">
                        {discountPercentage}% COUPON APPLIED
                     </span>
                  )}
                </div>
                {ticket_types && ticket_types.length > 0 ? (
                  ticket_types.map((ticket: any) => {
                    const originalPrice = ticket.price || 0;
                    const discountedPrice = discountPercentage > 0 ? originalPrice * (1 - discountPercentage / 100) : originalPrice;
                    
                    return (
                    <div key={ticket.id} className="flex flex-col gap-2 p-4 rounded-[12px] border border-border bg-background hover:border-primary transition-colors group">
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-bold text-sm text-foreground">{ticket.name}</span>
                        <div className="flex items-center gap-2">
                          {discountPercentage > 0 && originalPrice > 0 && (
                            <span className="text-xs text-muted-foreground line-through">
                              NGN {originalPrice.toLocaleString()}
                            </span>
                          )}
                          <span className="font-heading font-bold text-primary text-base">
                            {originalPrice === 0 ? "Free" : `NGN ${discountedPrice.toLocaleString()}`}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">Available</span>
                        <button 
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setIsCheckoutOpen(true);
                          }}
                          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-heading font-bold hover:brightness-110 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                        >
                          {is_free || discountedPrice === 0 ? "Register" : "Buy"}
                        </button>
                      </div>
                    </div>
                  )})
                ) : (
                  <p className="text-muted-foreground text-sm italic">No tickets available yet.</p>
                )}
              </div>
              
              {/* DP Generator Link Block */}
              {event.dp_templates && (Array.isArray(event.dp_templates) ? event.dp_templates.length > 0 : true) && (
                <div className="border-t border-border pt-6 mt-6">
                   <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 text-center">
                     <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                       <ImageIcon className="w-6 h-6 text-primary" />
                     </div>
                     <h3 className="font-heading font-bold text-base text-foreground mb-1">Get Your Display Picture</h3>
                     <p className="text-sm text-muted-foreground mb-4">Generate a custom DP flier for this event to let your network know you are attending!</p>
                     <Link to={`/events/${id}/dp`}>
                        <Button className="w-full bg-primary text-primary-foreground font-heading font-bold h-11 shadow-md hover:-translate-y-0.5 transition-transform">
                           Create My DP
                        </Button>
                     </Link>
                   </div>
                </div>
              )}
              
              {/* Additional Information rendered correctly AFTER tickets on the side, or full width */}
              {parsedAdditional && (
                <div className="border-t border-border pt-6 lg:hidden">
                  <h3 className="font-heading font-bold text-base text-foreground mb-3">Organizer Note</h3>
                  <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {parsedAdditional}
                  </div>
                </div>
              )}

            </div>
          </div>
          
          {/* Full width Additional Information for desktop so it shines distinctly */}
          {parsedAdditional && (
             <div className="lg:col-span-2 hidden lg:block">
               <h3 className="font-heading font-bold text-2xl text-foreground mb-4 border-t border-border pt-8">
                 Additional Information
               </h3>
               <div className="p-6 bg-card rounded-2xl border border-border shadow-sm text-base text-muted-foreground leading-relaxed whitespace-pre-wrap font-[DM_Sans]">
                 {parsedAdditional}
               </div>
             </div>
          )}

        </div>
      </main>

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
