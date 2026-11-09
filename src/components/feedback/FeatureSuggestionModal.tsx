import { useState, useEffect } from "react";
import { 
  MessageSquarePlus, 
  Lightbulb, 
  SlidersHorizontal, 
  AlertCircle, 
  Send, 
  X, 
  Loader2, 
  CheckCircle2 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";

type SuggestionCategory = "feature" | "improvement" | "bug";

export const FeatureSuggestionModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<SuggestionCategory>("feature");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      if (user.email) setEmail(user.email);
      if (user.user_metadata?.full_name) {
        setName(user.user_metadata.full_name);
      }
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !message.trim()) {
      toast.error("Please provide both a title and details for your request.");
      return;
    }

    if (!name.trim() || !email.trim()) {
      toast.error("Please provide your name and email so we can follow up.");
      return;
    }

    setSubmitting(true);
    try {
      const feedbackType = category === "bug" ? "bug" : "suggestion";
      const fullMessage = `[${category.toUpperCase()}] ${title.trim()}\n\n${message.trim()}`;

      const { error } = await supabase.from("feedback").insert({
        user_id: user?.id || null,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        type: feedbackType,
        message: fullMessage,
        status: "pending",
      });

      if (error) throw error;

      trackEvent("feature_suggested", {
        category,
        title: title.trim(),
        is_authenticated: Boolean(user),
      });

      setSubmitted(true);
      toast.success("Thank you! Your suggestion has been sent directly to the team.");

      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setTitle("");
        setMessage("");
      }, 1800);
    } catch (err: any) {
      console.error("Feedback submit error:", err);
      toast.error(err.message || "Failed to submit suggestion. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Pill */}
      <aside aria-label="Feature Feedback" className="fixed bottom-4 right-4 z-40 select-none">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-card/90 backdrop-blur-md border border-border/80 shadow-md hover:border-primary/60 hover:shadow-lg transition-all text-xs font-semibold text-foreground group"
          title="Suggest a Feature or Improvement"
        >
          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <MessageSquarePlus className="w-3.5 h-3.5" />
          </div>
          <span className="hidden sm:inline font-body">Suggest a Feature</span>
        </button>
      </aside>

      {/* Suggestion Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[480px] bg-card border border-border p-5 sm:p-6 rounded-2xl shadow-xl">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
              <MessageSquarePlus className="w-5 h-5 text-primary" />
              <span>Suggest a Feature or Improvement</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Help shape EventRally. Let our product team know what features or workflows you'd love to see.
            </DialogDescription>
          </DialogHeader>

          {submitted ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-heading text-base font-bold text-foreground">Suggestion Received!</h4>
              <p className="text-xs text-muted-foreground max-w-xs">
                Our development team reviews every request to prioritize our upcoming roadmap.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              {/* Category Segmented Buttons */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Category</Label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/60">
                  <button
                    type="button"
                    onClick={() => setCategory("feature")}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                      category === "feature"
                        ? "bg-card text-foreground shadow-xs border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-primary" />
                    <span>Feature</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory("improvement")}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                      category === "improvement"
                        ? "bg-card text-foreground shadow-xs border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-secondary" />
                    <span>Tweak</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory("bug")}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                      category === "bug"
                        ? "bg-card text-foreground shadow-xs border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                    <span>Issue</span>
                  </button>
                </div>
              </div>

              {/* Title Input */}
              <div className="space-y-1.5">
                <Label htmlFor="suggestion-title" className="text-xs font-semibold text-foreground">
                  Title / Short Summary *
                </Label>
                <Input
                  id="suggestion-title"
                  placeholder="e.g. Multi-day date range selector for crusades"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  className="h-9 text-xs bg-background border-border"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="suggestion-desc" className="text-xs font-semibold text-foreground">
                  Description / Details *
                </Label>
                <Textarea
                  id="suggestion-desc"
                  placeholder="Tell us what you want to achieve, how it should work, or what is currently missing..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  className="text-xs bg-background border-border resize-none"
                  required
                />
              </div>

              {/* Contact info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/60">
                <div className="space-y-1">
                  <Label htmlFor="suggestion-name" className="text-[11px] font-medium text-muted-foreground">
                    Your Name *
                  </Label>
                  <Input
                    id="suggestion-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Divine"
                    className="h-8 text-xs bg-background border-border"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="suggestion-email" className="text-[11px] font-medium text-muted-foreground">
                    Your Email *
                  </Label>
                  <Input
                    id="suggestion-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. you@example.com"
                    className="h-8 text-xs bg-background border-border"
                    required
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  disabled={submitting}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-primary text-primary-foreground font-semibold text-xs h-9 px-4 flex items-center gap-1.5 shadow-sm hover:opacity-90"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Suggestion</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
