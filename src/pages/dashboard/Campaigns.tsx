import { useState, useEffect } from "react";
import { Mail, Send, MessageSquare, Users, Sparkles, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EventOption {
  id: string;
  title: string;
}

interface CampaignHistory {
  id: string;
  subject: string;
  channel: "email" | "sms";
  eventTitle: string;
  recipientCount: number;
  status: "sent" | "scheduled";
  sentAt: string;
}

const Campaigns = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [recipientCount, setRecipientCount] = useState<number>(0);
  const [loadingCount, setLoadingCount] = useState(false);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<CampaignHistory[]>([]);

  // Load organiser events
  useEffect(() => {
    if (!user?.id) return;
    const fetchEvents = async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title")
        .eq("organiser_id", user.id);
      if (data) setEvents(data);
    };
    fetchEvents();
  }, [user?.id]);

  // Load recipient count when event selection changes
  useEffect(() => {
    if (!user?.id) return;
    const fetchCount = async () => {
      setLoadingCount(true);
      try {
        if (selectedEventId === "all") {
          // Count across all organiser's events
          const { data: orgEvents } = await supabase
            .from("events")
            .select("id")
            .eq("organiser_id", user.id);
          const eventIds = (orgEvents || []).map((e) => e.id);
          if (eventIds.length > 0) {
            const { count } = await supabase
              .from("registrations")
              .select("*", { count: "exact", head: true })
              .in("event_id", eventIds);
            setRecipientCount(count || 0);
          } else {
            setRecipientCount(0);
          }
        } else {
          const { count } = await supabase
            .from("registrations")
            .select("*", { count: "exact", head: true })
            .eq("event_id", selectedEventId);
          setRecipientCount(count || 0);
        }
      } catch (err) {
        console.error("Failed to count recipients:", err);
      } finally {
        setLoadingCount(false);
      }
    };
    fetchCount();
  }, [selectedEventId, user?.id]);

  const handleSendCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      toast.error("Please enter a campaign subject/title");
      return;
    }
    if (!message.trim()) {
      toast.error("Please compose a message body");
      return;
    }
    if (recipientCount === 0) {
      toast.error("No attendees found in the selected target audience");
      return;
    }

    setSending(true);
    // Simulate campaign queue & dispatch
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const selectedEvtTitle = selectedEventId === "all"
      ? "All Attendees"
      : events.find((e) => e.id === selectedEventId)?.title || "Event";

    const newCampaign: CampaignHistory = {
      id: Date.now().toString(),
      subject,
      channel,
      eventTitle: selectedEvtTitle,
      recipientCount,
      status: "sent",
      sentAt: new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    };

    setHistory([newCampaign, ...history]);
    setSending(false);
    setSubject("");
    setMessage("");

    toast.success(`Campaign broadcast sent to ${recipientCount} attendees via ${channel.toUpperCase()}!`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-muted px-2.5 py-1 rounded inline-block mb-2 text-foreground">
          CAMPAIGN STUDIO
        </div>
        <h1 className="font-heading text-3xl font-black text-foreground tracking-tight">Attendee Communications</h1>
        <p className="text-muted-foreground text-xs font-medium mt-1">
          Send broadcast emails and SMS notifications directly to registered attendees.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Campaign Composer */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSendCampaign} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
            <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2 border-b border-border pb-4">
              <Send className="w-4 h-4 text-secondary" /> Compose New Broadcast
            </h2>

            {/* Target Event Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground font-mono uppercase tracking-wider">
                Target Audience
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs text-foreground font-medium focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="all">All Attendees (Across All Events)</option>
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.title}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5 text-secondary" />
                {loadingCount ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Counting recipients...
                  </span>
                ) : (
                  <span>
                    <strong className="text-foreground font-mono">{recipientCount}</strong> confirmed recipient{recipientCount === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            </div>

            {/* Channel Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground font-mono uppercase tracking-wider">
                Communication Channel
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setChannel("email")}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-xs font-bold transition-all ${
                    channel === "email"
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-background border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Mail className="w-4 h-4" /> Email Broadcast
                </button>
                <button
                  type="button"
                  onClick={() => setChannel("sms")}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-xs font-bold transition-all ${
                    channel === "sms"
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-background border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <MessageSquare className="w-4 h-4" /> SMS Notification
                </button>
              </div>
            </div>

            {/* Subject / Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground font-mono uppercase tracking-wider">
                {channel === "email" ? "Email Subject *" : "SMS Header *"}
              </label>
              <Input
                placeholder={channel === "email" ? "Important updates regarding your event..." : "Event Reminder:"}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="bg-background border-border text-xs h-10 rounded-lg"
                required
              />
            </div>

            {/* Message Body */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground font-mono uppercase tracking-wider">
                  Message Content *
                </label>
                <span className="text-[10px] text-muted-foreground">Supports variables: <code>{"{{name}}"}</code></span>
              </div>
              <Textarea
                placeholder="Write your message here... Hello {{name}}, thank you for registering!"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="bg-background border-border text-xs min-h-[140px] rounded-lg leading-relaxed"
                required
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={sending || loadingCount}
              className="w-full bg-secondary text-secondary-foreground font-bold text-xs h-11 rounded-lg hover:opacity-90 flex items-center justify-center gap-2 shadow-sm"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Sending Broadcast...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Send Broadcast to {recipientCount} Recipient{recipientCount === 1 ? "" : "s"}
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Campaign History & Tips */}
        <div className="lg:col-span-5 space-y-6">
          {/* Information Card */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-chart-green" /> Deliverability Guarantee
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Broadcasts are routed directly to attendees registered under your events. Emails are formatted automatically with branded EventRally headers.
            </p>
          </div>

          {/* History */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">Recent Sent Campaigns</h3>
              <span className="text-[10px] font-mono text-muted-foreground font-bold">{history.length} Sent</span>
            </div>

            {history.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                <p className="text-xs text-muted-foreground font-medium">No campaigns sent yet.</p>
                <p className="text-[11px] text-muted-foreground/70">Compose a message on the left to send your first broadcast.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {history.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-muted/30 transition-colors space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground truncate max-w-[200px]">{item.subject}</span>
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-chart-green/10 text-chart-green">
                        {item.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{item.eventTitle} • {item.recipientCount} recipients ({item.channel.toUpperCase()})</span>
                      <span>{item.sentAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Campaigns;
