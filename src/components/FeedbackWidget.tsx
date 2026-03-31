import { useState } from "react";
import { MessageSquarePlus, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const FeedbackWidget = () => {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [type, setType] = useState<"bug" | "suggestion" | "complaint" | "support">("suggestion");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("Please provide a message");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await (supabase.from as any)("feedback").insert({
        user_id: user?.id || null,
        name: profile?.full_name || user?.email?.split('@')[0] || "Organizer",
        email: user?.email || "",
        type,
        message: message.trim(),
        status: "pending",
      });

      if (error) throw error;

      toast.success("Feedback submitted! Thank you.");
      setOpen(false);
      setMessage("");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to submit feedback. " + (err.message || ""));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button 
          className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-primary text-primary-foreground shadow-xl hover:bg-primary/90 transition-all hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-primary/30"
          aria-label="Send Feedback"
        >
          <MessageSquarePlus className="w-6 h-6" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-6 bg-card border-border font-[DM_Sans]">
        <div className="space-y-1 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquarePlus className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-heading font-bold text-xl text-foreground">Feedback & Support</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Let us know what's on your mind. We respond directly to inquiries.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="font-heading font-bold text-sm text-foreground">Category</Label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="suggestion">💡 Feature Suggestion</option>
              <option value="bug">🐛 Report a Bug</option>
              <option value="support">👋 General Support</option>
              <option value="complaint">⚠️ Complaint</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label className="font-heading font-bold text-sm text-foreground">Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us everything..."
              className="resize-none h-32 bg-background border-border text-foreground"
              required
            />
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting || !message.trim()} 
            className="w-full bg-primary text-primary-foreground font-heading font-bold hover:brightness-110 h-11 transition-all"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Send Message</>}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
