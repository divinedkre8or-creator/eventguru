import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Lightbulb, ArrowRight, Mail, CheckCircle2, Loader2, Sparkles, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRecommendedGrowthTip, GrowthPlaybookTip } from "@/lib/newsletterTips";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface WeeklyDigestWidgetProps {
  nearestEvent?: {
    id: string;
    title: string;
    date: string;
  } | null;
  hasEvents: boolean;
  totalTicketsSold: number;
}

export const WeeklyDigestWidget: React.FC<WeeklyDigestWidgetProps> = ({
  nearestEvent,
  hasEvents,
  totalTicketsSold,
}) => {
  const { user } = useAuth();
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  // Calculate days until nearest event
  let daysUntilEvent: number | null = null;
  if (nearestEvent?.date) {
    const eventTime = new Date(nearestEvent.date).getTime();
    const now = Date.now();
    daysUntilEvent = Math.ceil((eventTime - now) / (1000 * 60 * 60 * 24));
  }

  const tip: GrowthPlaybookTip = getRecommendedGrowthTip(daysUntilEvent);

  const handleSendDigestEmail = async () => {
    if (!user?.email) {
      toast.error("No verified email address found on your account.");
      return;
    }

    setSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-organizer-digest", {
        body: {
          testEmail: user.email,
          targetOrganiserId: user.id,
        },
      });

      if (error) throw error;

      setSentSuccess(true);
      toast.success("Weekly Digest sent to " + user.email);
      setTimeout(() => setSentSuccess(false), 5000);
    } catch (err: any) {
      console.error("Failed to send digest email:", err);
      toast.error(err?.message || "Failed to trigger email digest. Try again shortly.");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs relative overflow-hidden transition-all hover:border-primary/40">
      {/* Top Banner Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/80">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Lightbulb className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-secondary/15 text-secondary px-2 py-0.5 rounded">
                Weekly Playbook
              </span>
              <span className="text-xs font-semibold text-muted-foreground font-mono">
                {tip.stage}
              </span>
            </div>
          </div>
        </div>

        {/* Action: Send Email Digest on Demand */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleSendDigestEmail}
          disabled={sendingEmail || sentSuccess}
          className="h-8 text-xs font-bold border-border/80 text-foreground hover:bg-muted self-start sm:self-auto flex items-center gap-1.5"
        >
          {sendingEmail ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>Sending Digest...</span>
            </>
          ) : sentSuccess ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-chart-green" />
              <span>Sent to Inbox!</span>
            </>
          ) : (
            <>
              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Email Me This Digest</span>
            </>
          )}
        </Button>
      </div>

      {/* Content Body */}
      <div className="pt-4 space-y-2.5">
        <h4 className="font-heading text-base sm:text-lg font-black text-foreground tracking-tight">
          {tip.headline}
        </h4>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {tip.content}
        </p>

        {/* Call to action & context footer */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
          <Link to={tip.actionLink}>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold h-9 px-4 rounded-lg flex items-center gap-1.5 shadow-xs"
            >
              <span>{tip.actionText}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>

          {nearestEvent && daysUntilEvent !== null && (
            <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
              <span>Next Event:</span>
              <span className="font-bold text-foreground truncate max-w-[140px] sm:max-w-[200px]">
                {nearestEvent.title}
              </span>
              <span className="text-primary font-bold">
                ({daysUntilEvent <= 0 ? "Today" : `in ${daysUntilEvent}d`})
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeeklyDigestWidget;
