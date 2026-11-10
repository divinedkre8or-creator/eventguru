import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, Copy, Check, Star, Loader2, Award, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { HostAchievementFlyer } from "./HostAchievementFlyer";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface EventHostSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    id: string;
    title: string;
    date: string;
    end_date?: string | null;
    venue?: string | null;
    city?: string | null;
    category?: string | null;
    organiser_id?: string;
  };
  organiserName?: string;
}

export const EventHostSummaryModal = ({
  isOpen,
  onClose,
  event,
  organiserName = "Event Organizer",
}: EventHostSummaryModalProps) => {
  const flyerRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Fetch real registration and ticket metrics
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["event-host-metrics", event.id],
    queryFn: async () => {
      const { data: regs, error } = await supabase
        .from("registrations")
        .select("id, checked_in, amount_paid, ticket_type_id")
        .eq("event_id", event.id);

      if (error) throw error;

      const total = regs?.length || 0;
      const checkedIn = regs?.filter((r) => r.checked_in).length || 0;
      const percentage = total > 0 ? Math.round((checkedIn / total) * 100) : 0;
      const grossRevenue = regs?.reduce((acc, r) => acc + (Number(r.amount_paid) || 0), 0) || 0;

      return {
        total,
        checkedIn,
        percentage,
        grossRevenue,
      };
    },
    enabled: isOpen && !!event.id,
  });

  const handleDownloadFlyer = async () => {
    if (!flyerRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Generating your high-resolution Host Flyer...");

    try {
      const canvas = await html2canvas(flyerRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#0A0E17",
        logging: false,
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const cleanTitle = event.title.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30);
      link.href = image;
      link.download = `eventguru-host-${cleanTitle}.png`;
      link.click();

      toast.success("Host Achievement Flyer downloaded! Share it on WhatsApp & Instagram.", { id: toastId });
    } catch (err: any) {
      console.error("Flyer export error:", err);
      toast.error("Failed to generate flyer image.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyShareText = () => {
    const text = `I just concluded hosting "${event.title}" on EventGuru with ${metrics?.checkedIn || 0} checked-in guests! 🚀 Powered by @EventGuruNG`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Share text copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = `I just concluded hosting "${event.title}" on EventGuru with ${metrics?.checkedIn || 0} checked-in guests! 🚀\n\nExperience link: ${window.location.origin}/events/${event.id}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleSubmitReview = async () => {
    if (!rating) return;
    setIsSubmittingReview(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id || event.organiser_id;

      if (!userId) {
        toast.error("Unable to verify host credentials.");
        return;
      }

      const { error } = await supabase.from("organizer_reviews").insert({
        event_id: event.id,
        organiser_id: userId,
        rating,
        feedback: feedbackText || null,
      });

      if (error) throw error;

      setReviewSubmitted(true);
      toast.success("Thank you! Your feedback directly empowers EventGuru.");
    } catch (err: any) {
      toast.error(err.message || "Could not save review.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const dateObj = new Date(event.date);
  const formattedDate = isNaN(dateObj.getTime())
    ? "Date TBA"
    : dateObj.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });

  const venueString = [event.venue, event.city].filter(Boolean).join(", ") || "Venue TBA";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border p-6 sm:p-8">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase tracking-wider">
            <Award className="w-4 h-4 text-[#0058BE]" /> Official Host Summary &amp; Certificate
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-black text-foreground">
            {event.title}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            Review your verified admissions data and export your agency-grade Host Achievement Flyer.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs font-mono">Aggregating door admissions data...</span>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            
            {/* Visual Flyer Preview */}
            <div className="rounded-lg overflow-hidden bg-muted/30 p-2 sm:p-4 flex items-center justify-center">
              <HostAchievementFlyer
                ref={flyerRef}
                eventTitle={event.title}
                organiserName={organiserName}
                category={event.category || "Conference"}
                dateStr={formattedDate}
                venueName={venueString}
                totalAttendees={metrics?.total || 0}
                checkedInCount={metrics?.checkedIn || 0}
                checkinPercentage={metrics?.percentage || 0}
                eventId={event.id}
              />
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <Button
                onClick={handleDownloadFlyer}
                disabled={isExporting}
                className="bg-[#0058BE] hover:bg-[#00479E] text-white font-bold text-xs h-10 w-full"
              >
                {isExporting ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                )}
                Download Flyer (PNG)
              </Button>

              <Button
                variant="outline"
                onClick={handleWhatsAppShare}
                className="font-bold text-xs h-10 border-border text-foreground hover:bg-muted w-full"
              >
                <Share2 className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                Share to WhatsApp
              </Button>

              <Button
                variant="outline"
                onClick={handleCopyShareText}
                className="font-bold text-xs h-10 border-border text-foreground hover:bg-muted w-full"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                )}
                Copy Share Post
              </Button>
            </div>

            {/* In-App Feedback Rating Module */}
            <div className="border border-border rounded-lg p-4 sm:p-5 bg-muted/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-foreground">
                    How was your experience hosting with EventGuru?
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Help us build the best event operating system for Nigerian creators.
                  </p>
                </div>
              </div>

              {reviewSubmitted ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-md p-3 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                  ✓ Review submitted! Thank you for partnering with EventGuru.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`p-2 rounded-md border text-xs font-bold flex items-center gap-1 transition-colors ${
                          rating === star
                            ? "bg-[#0058BE] text-white border-[#0058BE]"
                            : "bg-card text-foreground border-border hover:border-primary/40"
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${rating && rating >= star ? "fill-amber-400 text-amber-400" : ""}`} />
                        {star}
                      </button>
                    ))}
                  </div>

                  {rating && (
                    <div className="space-y-2 pt-1">
                      <textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="What did your attendees enjoy most, or what can we improve? (Optional)"
                        rows={2}
                        className="w-full text-xs p-2.5 rounded-md border border-border bg-card text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <Button
                        size="sm"
                        onClick={handleSubmitReview}
                        disabled={isSubmittingReview}
                        className="text-xs font-bold bg-primary text-primary-foreground h-8"
                      >
                        {isSubmittingReview && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                        Submit Host Feedback
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

