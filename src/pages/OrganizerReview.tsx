import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Star, CheckCircle2, Award, ArrowRight, Loader2, Sparkles, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function OrganizerReview() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const eventId = searchParams.get("event_id") || "";
  const initialRating = parseInt(searchParams.get("rating") || "5", 10);

  const [rating, setRating] = useState<number>(
    isNaN(initialRating) ? 5 : Math.max(1, Math.min(5, initialRating))
  );
  const [highlight, setHighlight] = useState("");
  const [feedback, setFeedback] = useState("");
  const [allowTestimonial, setAllowTestimonial] = useState(true);

  const [eventData, setEventData] = useState<{ id: string; title: string; date: string; venue: string } | null>(null);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    async function loadEvent() {
      if (!eventId) {
        setIsLoadingEvent(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("events")
          .select("id, title, date, venue, city")
          .eq("id", eventId)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setEventData({
            id: data.id,
            title: data.title,
            date: data.date,
            venue: [data.venue, data.city].filter(Boolean).join(", "),
          });
        }
      } catch (err) {
        console.error("Failed to load event for review:", err);
      } finally {
        setIsLoadingEvent(false);
      }
    }

    loadEvent();
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) {
      toast.error("Missing event reference ID.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Find organizer user id: current user or fallback
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id || user?.id;

      // Combine feedback with testimonial permission note if applicable
      const finalFeedback = [
        feedback,
        allowTestimonial ? "[Approved for verified host showcase]" : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      const { error } = await supabase.from("organizer_reviews").insert({
        event_id: eventId,
        organiser_id: currentUserId || "00000000-0000-0000-0000-000000000000",
        rating,
        highlight: highlight || null,
        feedback: finalFeedback || null,
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast.success("Thank you! Your host debrief has been recorded.");
    } catch (err: any) {
      console.error("Submit review error:", err);
      toast.error(err.message || "Failed to submit review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] text-foreground flex flex-col justify-between py-12 px-4 sm:px-6">
      <div className="max-w-xl mx-auto w-full">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
            <div className="w-8 h-8 rounded bg-[#0058BE] text-white flex items-center justify-center font-black text-sm">
              ER
            </div>
            <span className="font-extrabold text-xl tracking-wider uppercase text-foreground">
              EVENTRALLY
            </span>
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0058BE]/10 text-[#0058BE] text-xs font-mono font-bold uppercase tracking-wider">
            <Award className="w-3.5 h-3.5" /> Official Host Debrief
          </div>
        </div>

        {isSubmitted ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center space-y-6 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-foreground">
                Debrief Received. You're a Star!
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Thank you for taking the time to share your experience hosting{" "}
                <strong className="text-foreground">"{eventData?.title || "your event"}"</strong>.
                Your insights help us elevate event creators across the continent.
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/dashboard/events" className="w-full sm:w-auto">
                <Button className="w-full bg-[#0058BE] hover:bg-[#00479E] text-white font-bold text-xs h-10">
                  <Award className="w-3.5 h-3.5 mr-1.5" />
                  View Host Summary &amp; Flyer
                </Button>
              </Link>
              <Link to="/dashboard/events/create" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full border-border text-foreground font-bold text-xs h-10">
                  Draft Next Event &rarr;
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
            
            {/* Event Header Snippet */}
            {isLoadingEvent ? (
              <div className="py-4 flex items-center justify-center text-muted-foreground text-xs font-mono">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading event details...
              </div>
            ) : eventData ? (
              <div className="border-b border-border pb-5">
                <span className="text-[10px] font-mono font-bold uppercase text-[#0058BE] tracking-wider block mb-1">
                  EVENT CONCLUDED
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-foreground leading-tight">
                  {eventData.title}
                </h2>
                {eventData.venue && (
                  <p className="text-xs text-muted-foreground mt-1">
                    📍 {eventData.venue}
                  </p>
                )}
              </div>
            ) : (
              <div className="border-b border-border pb-4">
                <h2 className="text-xl font-black text-foreground">
                  Host Platform Experience
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  How was your experience running your event on EventRally?
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Star Rating Section */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground block">
                  Overall Host Rating
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`flex-1 py-3 px-2 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                        rating === star
                          ? "bg-[#0058BE] text-white border-[#0058BE] ring-2 ring-[#0058BE]/30"
                          : "bg-muted/30 border-border text-foreground hover:bg-muted/70"
                      }`}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          rating >= star ? (rating === star ? "fill-white text-white" : "fill-amber-400 text-amber-400") : "text-muted-foreground"
                        }`}
                      />
                      <span className="text-[11px] font-bold">
                        {star === 1 && "1 • Poor"}
                        {star === 2 && "2 • Fair"}
                        {star === 3 && "3 • Good"}
                        {star === 4 && "4 • Great"}
                        {star === 5 && "5 • Superb"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Highlights Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">
                  What was the biggest highlight of your event?
                </label>
                <input
                  type="text"
                  value={highlight}
                  onChange={(e) => setHighlight(e.target.value)}
                  placeholder="e.g. VIP tickets sold out in 3 days, smooth gate check-in, great turnout..."
                  className="w-full text-xs p-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Platform Feedback Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">
                  How can EventRally serve you even better for your next event?
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                  placeholder="Tell us what you loved, or anything about door check-in, ticketing, payouts, or broadcasts that could be faster..."
                  className="w-full text-xs p-3 rounded-lg border border-border bg-background text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Verified Host Testimonial Permission */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="testimonial-check"
                  checked={allowTestimonial}
                  onChange={(e) => setAllowTestimonial(e.target.checked)}
                  className="mt-0.5 rounded border-border text-[#0058BE] focus:ring-[#0058BE]"
                />
                <label htmlFor="testimonial-check" className="text-xs text-muted-foreground leading-normal cursor-pointer">
                  You may feature this review and event name as an authenticated host testimonial on EventRally.
                </label>
              </div>

              {/* Submit CTA */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#0058BE] hover:bg-[#00479E] text-white font-bold text-xs h-11"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-1.5" />
                )}
                Submit Host Debrief
              </Button>

            </form>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground mt-8">
          &copy; 2026 EventRally &bull; Where Events Live. Built for African Creators.
        </div>

      </div>
    </div>
  );
}

