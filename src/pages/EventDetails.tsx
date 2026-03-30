import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, Tag, Users, ArrowLeft, Loader2, Image as ImageIcon, Edit2, Trash2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KenteStripe } from "@/components/KenteStripe";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const EventDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: event, isLoading, error } = useQuery({
    queryKey: ["public-event", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, ticket_types(*)")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
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
      <div className="flex h-screen items-center justify-center bg-[var(--ivory-hex)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--amber-hex)]" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[var(--ivory-hex)] p-6 text-center space-y-4 font-[DM_Sans]">
        <h1 className="font-heading text-4xl font-bold text-[var(--ink-hex)]">Event not found</h1>
        <p className="text-[#6B7280] text-[15px]">The event you are looking for does not exist or has been removed.</p>
        <Link to="/">
          <button className="bg-[var(--amber-hex)] text-[var(--ink-hex)] font-heading font-bold px-[20px] py-[10px] rounded-[10px]">Return Home</button>
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

  return (
    <div className="min-h-screen bg-[var(--ivory-hex)] font-[DM_Sans]">
      <KenteStripe />

      {/* Navigation matching Index.tsx */}
      <nav className="bg-[rgba(10,13,18,0.95)] backdrop-blur-[12px] sticky top-0 z-50 border-b border-white/5">
        <div className="container max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="font-heading font-bold text-[20px] text-white">
            Event<span className="text-[var(--amber-hex)]">stack</span>
          </Link>

          <div className="flex items-center gap-4">
            {user ? (
               <Link to="/dashboard" className="text-white text-[14px] bg-transparent hover:opacity-80 transition-opacity">
                Dashboard
               </Link>
            ) : (
              <>
                <Link to="/login" className="text-white text-[14px] bg-transparent hover:opacity-80 transition-opacity hidden sm:block">
                  Log In
                </Link>
                <Link to="/signup">
                  <button className="bg-[var(--amber-hex)] text-[var(--ink-hex)] font-heading font-bold text-[13px] rounded-[10px] px-[20px] py-[10px] hover:bg-[var(--amber2-hex)] hover:-translate-y-[1px] transition-transform">
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
           <div className="bg-[var(--ink-hex)] p-3 rounded-[12px] flex items-center justify-between shadow-lg mb-6 border border-[rgba(255,255,255,0.08)]">
             <div className="flex items-center gap-2">
               <span className="inline-block w-2 h-2 rounded-full bg-[var(--teal-hex)] animate-pulse"></span>
               <span className="text-white text-sm font-bold font-heading">You are managing this event</span>
             </div>
             <div className="flex items-center gap-2">
               <button onClick={handleCopyLink} className="p-2 rounded hover:bg-white/10 text-white transition-colors" title="Copy Link">
                 <Share2 className="w-4 h-4" />
               </button>
               <Link to={`/dashboard/events/${event.id}/edit`}>
                 <button className="p-2 rounded hover:bg-white/10 text-white transition-colors" title="Edit Event">
                   <Edit2 className="w-4 h-4" />
                 </button>
               </Link>
               <button onClick={handleDelete} className="p-2 rounded hover:bg-[var(--coral-hex)] text-white transition-colors" title="Delete Event">
                 <Trash2 className="w-4 h-4" />
               </button>
             </div>
           </div>
        )}

        {/* Banner Section */}
        <div className="w-full aspect-[21/9] sm:aspect-[3/1] bg-white rounded-[20px] border border-[rgba(10,13,18,0.07)] overflow-hidden relative shadow-sm">
          {image_url ? (
            <img src={image_url} alt={title} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-[#6B7280]/30 bg-[#F3F4F6]">
              <ImageIcon className="w-16 h-16" />
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4 border-b border-[rgba(10,13,18,0.07)] pb-8">
              <div className="inline-block px-3 py-1 rounded-full bg-[rgba(245,166,35,0.12)] text-[var(--amber-hex)] text-[11px] font-heading font-bold uppercase tracking-wider backdrop-blur-sm">
                {category?.replace("-", " ")}
              </div>
              <h1 className="font-heading text-[36px] sm:text-[48px] font-bold text-[var(--ink-hex)] leading-[1.1] tracking-[-1px]">
                {title}
              </h1>
            </div>

            <div className="prose prose-sm sm:prose-base max-w-none text-[#4B5563] font-[DM_Sans] leading-[1.8] whitespace-pre-wrap">
              {parsedDesc || "No description provided for this event."}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-[16px] border border-[rgba(10,13,18,0.07)] p-6 shadow-sm space-y-6 sticky top-24">
              
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="bg-[#FFF3D4] w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 text-[var(--amber-hex)]" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-[14px] text-[var(--ink-hex)]">When</h3>
                    {parsedSchedule.length > 0 ? (
                      <div className="mt-1 space-y-1">
                        {parsedSchedule.map((s, idx) => (
                           <div key={idx} className="text-[#6B7280] text-[13px] font-[DM_Sans]">
                             <span className="font-bold text-[#4B5563]">{new Date(s.date).toLocaleDateString("en-US", { month: 'short', day: 'numeric' })}:</span> {s.startTime} {s.endTime ? `- ${s.endTime}` : ''}
                           </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[#6B7280] text-[13px] font-[DM_Sans] mt-1 pr-2">
                        {fallbackSchedule || "TBA"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-[rgba(242,100,81,0.1)] w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-[var(--coral-hex)]" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-[14px] text-[var(--ink-hex)]">Where</h3>
                    <p className="text-[#6B7280] text-[13px] font-[DM_Sans] mt-1 pr-2">
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

              <div className="border-t border-[rgba(10,13,18,0.07)] pt-6 space-y-4">
                <h3 className="font-heading font-bold text-[18px] text-[var(--ink-hex)] mb-4">Tickets</h3>
                {ticket_types && ticket_types.length > 0 ? (
                  ticket_types.map((ticket: any) => (
                    <div key={ticket.id} className="flex flex-col gap-2 p-4 rounded-[12px] border border-[rgba(10,13,18,0.07)] bg-white hover:border-[var(--amber-hex)] transition-colors group">
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-bold text-[14px] text-[var(--ink-hex)]">{ticket.name}</span>
                        <span className="font-heading font-bold text-[var(--amber-hex)] text-[14px]">
                          {ticket.price === 0 ? "Free" : `NGN ${ticket.price.toLocaleString()}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[12px] text-[#6B7280]">Available</span>
                        <button className="bg-[var(--amber-hex)] text-[var(--ink-hex)] px-3 py-1.5 rounded-[8px] text-[12px] font-heading font-bold hover:bg-[var(--amber2-hex)] transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                          {is_free ? "Register" : "Buy"}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[#6B7280] text-[13px] italic">No tickets available yet.</p>
                )}
              </div>
              
              {/* Additional Information rendered correctly AFTER tickets on the side, or full width */}
              {parsedAdditional && (
                <div className="border-t border-[rgba(10,13,18,0.07)] pt-6 lg:hidden">
                  <h3 className="font-heading font-bold text-[16px] text-[var(--ink-hex)] mb-2">Organizer Note</h3>
                  <div className="p-4 bg-[rgba(245,166,35,0.05)] rounded-[12px] border border-[rgba(245,166,35,0.2)] text-[13px] text-[#4B5563] leading-[1.6] whitespace-pre-wrap">
                    {parsedAdditional}
                  </div>
                </div>
              )}

            </div>
          </div>
          
          {/* Full width Additional Information for desktop so it shines distinctly */}
          {parsedAdditional && (
             <div className="lg:col-span-2 hidden lg:block">
               <h3 className="font-heading font-bold text-[24px] text-[var(--ink-hex)] mb-4 border-t border-[rgba(10,13,18,0.07)] pt-8">
                 Additional Information
               </h3>
               <div className="p-6 bg-white rounded-[16px] border border-[rgba(10,13,18,0.07)] shadow-sm text-[15px] text-[#4B5563] leading-[1.8] whitespace-pre-wrap font-[DM_Sans]">
                 {parsedAdditional}
               </div>
             </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default EventDetails;
