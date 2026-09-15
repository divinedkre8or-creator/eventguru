import { useState } from "react";
import {
  Mail, Send, MessageSquare, Users, Loader2, AlertCircle,
  Wallet, Gauge, Crown, ShieldCheck, Plus, Sparkles,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FREE_EMAIL_MONTHLY_LIMIT, getCurrentUsagePeriod } from "@/lib/campaignConstants";
import { MessagingWalletModal } from "@/components/campaigns/MessagingWalletModal";

// The campaigns/wallet/usage tables are newer than the generated Supabase types,
// so we access them through an untyped handle.
const db = supabase as any;

interface EventOption {
  id: string;
  title: string;
}

interface CampaignRow {
  id: string;
  subject: string | null;
  channel: "email" | "sms";
  status: "draft" | "sending" | "sent" | "failed";
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  error: string | null;
  created_at: string;
  event_id: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  sent: "bg-chart-green/10 text-chart-green",
  sending: "bg-secondary/10 text-secondary",
  failed: "bg-destructive/10 text-destructive",
  draft: "bg-muted text-muted-foreground",
};

const SMS_UNIT_PRICE_NAIRA = 6.5;

const Campaigns = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const period = getCurrentUsagePeriod();

  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  // --- Organiser events (target selector) -----------------------------------
  const { data: events = [] } = useQuery({
    queryKey: ["campaign-events-v2", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<EventOption[]> => {
      const { data } = await supabase
        .from("events")
        .select("id, title")
        .eq("organiser_id", user!.id)
        .order("created_at", { ascending: false });
      return (data as EventOption[]) || [];
    },
  });

  // --- Recipient counts for email vs phone ----------------------------------
  const { data: audience = { emailCount: 0, phoneCount: 0 }, isLoading: loadingCount } = useQuery({
    queryKey: ["campaign-recipient-counts-v3", user?.id, selectedEventId, events.length],
    enabled: !!user?.id,
    queryFn: async () => {
      let targetEventIds: string[] = [];
      if (selectedEventId === "all") {
        targetEventIds = events.map((e) => e.id);
        if (targetEventIds.length === 0) return { emailCount: 0, phoneCount: 0 };
      } else {
        targetEventIds = [selectedEventId];
      }

      const { data: regs } = await supabase
        .from("registrations")
        .select("email, phone_number, phone")
        .in("event_id", targetEventIds);

      let emailCount = 0;
      let phoneCount = 0;
      const seenEmails = new Set<string>();
      const seenPhones = new Set<string>();

      for (const r of (regs as any[]) || []) {
        const em = (r.email || "").trim().toLowerCase();
        if (em && !seenEmails.has(em)) {
          seenEmails.add(em);
          emailCount++;
        }
        const rawPhone = (r.phone_number || r.phone || "").trim().replace(/[\s\-\(\)]/g, "");
        if (rawPhone && rawPhone.length >= 10 && !seenPhones.has(rawPhone)) {
          seenPhones.add(rawPhone);
          phoneCount++;
        }
      }

      return { emailCount, phoneCount };
    },
  });

  // --- Monthly email usage (freemium meter) ---------------------------------
  const { data: emailUsed = 0 } = useQuery({
    queryKey: ["campaign-email-usage-v2", user?.id, period],
    enabled: !!user?.id,
    queryFn: async (): Promise<number> => {
      const { data } = await db
        .from("organiser_email_usage")
        .select("sent_count")
        .eq("organiser_id", user!.id)
        .eq("period", period)
        .maybeSingle();
      return data?.sent_count || 0;
    },
  });

  // --- Wallet (SMS balance + plan) ------------------------------------------
  const { data: wallet } = useQuery({
    queryKey: ["campaign-wallet-v2", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await db
        .from("organiser_wallets")
        .select("sms_balance, plan")
        .eq("organiser_id", user!.id)
        .maybeSingle();
      return data as { sms_balance: number; plan: "free" | "pro" } | null;
    },
  });

  // --- Campaign history ------------------------------------------------------
  const { data: history = [] } = useQuery({
    queryKey: ["campaigns-history-v2", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<CampaignRow[]> => {
      const { data } = await db
        .from("campaigns")
        .select("*")
        .eq("organiser_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(25);
      return (data as CampaignRow[]) || [];
    },
  });

  const isPro = wallet?.plan === "pro";
  const emailRemaining = Math.max(0, FREE_EMAIL_MONTHLY_LIMIT - emailUsed);
  const emailAtLimit = !isPro && emailRemaining <= 0;
  const usagePct = Math.min(100, Math.round((emailUsed / FREE_EMAIL_MONTHLY_LIMIT) * 100));

  const targetCount = channel === "email" ? audience.emailCount : audience.phoneCount;
  const currentSmsBalance = Number(wallet?.sms_balance) || 0;
  const estimatedSmsCost = targetCount * SMS_UNIT_PRICE_NAIRA;
  const hasEnoughSmsBalance = currentSmsBalance >= estimatedSmsCost;

  // SMS character length and segments calculation
  const smsCharLength = message.length;
  const smsSegments = Math.max(1, Math.ceil(smsCharLength / 160));

  const eventTitleFor = (id: string | null) =>
    !id ? "All Attendees" : events.find((e) => e.id === id)?.title || "Event";

  // --- Send mutation: create the campaign row, then invoke the server sender -
  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("You must be signed in.");

      const { data: created, error: insErr } = await db
        .from("campaigns")
        .insert({
          organiser_id: user.id,
          event_id: selectedEventId === "all" ? null : selectedEventId,
          channel,
          subject: channel === "email" ? subject.trim() : null,
          body: message.trim(),
          status: "draft",
        })
        .select("id")
        .single();
      if (insErr || !created) throw new Error(insErr?.message || "Could not create the campaign.");

      const { data, error } = await supabase.functions.invoke("send-campaign", {
        body: { campaignId: created.id },
      });

      if (error) throw new Error("Could not reach the campaign sender. Please try again shortly.");
      if (!data?.ok) throw new Error(data?.message || "The campaign could not be sent.");
      return data as { sent: number; failed: number; total: number };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns-history-v2", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["campaign-email-usage-v2", user?.id, period] });
      queryClient.invalidateQueries({ queryKey: ["campaign-wallet-v2", user?.id] });
      setSubject("");
      setMessage("");
      const failedNote = result.failed > 0 ? ` (${result.failed} failed)` : "";
      toast.success(`${channel === "email" ? "Email" : "SMS"} broadcast sent to ${result.sent} recipient${result.sent === 1 ? "" : "s"}${failedNote}.`);
    },
    onError: (err: any) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns-history-v2", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["campaign-wallet-v2", user?.id] });
      toast.error(err?.message || "Failed to send campaign.");
    },
  });

  const handleSendCampaign = (e: React.FormEvent) => {
    e.preventDefault();

    if (channel === "email" && !subject.trim()) {
      toast.error("Please enter an email subject.");
      return;
    }
    if (!message.trim()) {
      toast.error("Please compose a message body.");
      return;
    }
    if (targetCount === 0) {
      toast.error(
        channel === "email"
          ? "No attendees with email addresses found in the selected target."
          : "No attendees with phone numbers found in the selected target."
      );
      return;
    }
    if (channel === "email" && emailAtLimit) {
      toast.error(`You've used all ${FREE_EMAIL_MONTHLY_LIMIT} free emails this month. Upgrade to Pro or wait for next month.`);
      return;
    }
    if (channel === "sms" && !hasEnoughSmsBalance) {
      toast.error(`Insufficient SMS balance (₦${currentSmsBalance.toLocaleString()} available vs ₦${estimatedSmsCost.toLocaleString()} required). Please fund your wallet.`);
      setIsWalletModalOpen(true);
      return;
    }
    sendMutation.mutate();
  };

  const sending = sendMutation.isPending;

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12 w-full min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="border-b border-border pb-6 w-full min-w-0">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-muted px-2.5 py-1 rounded inline-block mb-2 text-foreground">
          CAMPAIGN STUDIO
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-black text-foreground tracking-tight">Attendee Communications</h1>
        <p className="text-muted-foreground text-xs font-medium mt-1">
          Reach your attendees via verified Email and SMS notifications. Every email includes one-click unsubscribe, and SMS broadcasts deliver instantly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 w-full min-w-0">
        {/* Campaign Composer */}
        <div className="lg:col-span-7 space-y-6 w-full min-w-0">
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
                    Audience: <strong className="text-foreground font-mono">{audience.emailCount}</strong> with email ·{" "}
                    <strong className="text-foreground font-mono">{audience.phoneCount}</strong> with phone
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
                  className={`relative flex items-center justify-center gap-2 py-2.5 rounded-lg border text-xs font-bold transition-all ${
                    channel === "sms"
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-background border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <MessageSquare className="w-4 h-4" /> SMS Notification
                  <span className="text-[9px] font-mono font-bold uppercase bg-chart-green/20 text-chart-green px-1.5 py-0.2 rounded-full">
                    Active
                  </span>
                </button>
              </div>
            </div>

            {/* Subject / Title (Only for Email) */}
            {channel === "email" && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground font-mono uppercase tracking-wider">
                  Email Subject *
                </label>
                <Input
                  placeholder="Important updates regarding your event..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="bg-background border-border text-xs h-10 rounded-lg"
                  required
                />
              </div>
            )}

            {/* Message Body */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground font-mono uppercase tracking-wider">
                  Message Content *
                </label>
                <span className="text-[10px] text-muted-foreground">Supports variables: <code>{"{{name}}"}</code></span>
              </div>
              <Textarea
                placeholder={
                  channel === "email"
                    ? "Write your email message here... Hello {{name}}, thank you for registering!"
                    : "Event Reminder: Hello {{name}}, doors open in 2 hours. Venue: Landmark Centre, Lagos."
                }
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="bg-background border-border text-xs min-h-[130px] rounded-lg leading-relaxed"
                required
              />
              {/* Live SMS Counter */}
              {channel === "sms" && (
                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-1">
                  <span>
                    {smsCharLength} / 160 characters ({smsSegments} segment{smsSegments > 1 ? "s" : ""})
                  </span>
                  <span className="font-bold text-foreground">
                    Est. Cost: ₦{(targetCount * SMS_UNIT_PRICE_NAIRA * smsSegments).toLocaleString()} ({targetCount} phones)
                  </span>
                </div>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              variant="secondary"
              disabled={
                sending || 
                loadingCount || 
                (channel === "email" && emailAtLimit) || 
                (channel === "sms" && (!hasEnoughSmsBalance || targetCount === 0))
              }
              className="w-full font-bold text-xs h-11 rounded-lg flex items-center justify-center gap-2 shadow-sm"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Dispatching Broadcast...
                </>
              ) : channel === "email" && emailAtLimit ? (
                <>
                  <AlertCircle className="w-4 h-4" /> Monthly Free Limit Reached
                </>
              ) : channel === "sms" && !hasEnoughSmsBalance ? (
                <>
                  <Wallet className="w-4 h-4" /> Insufficient SMS Wallet Balance
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Send {channel === "email" ? "Email Broadcast" : `SMS Broadcast (${targetCount} Attendees)`}
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Right rail: usage, wallet, history */}
        <div className="lg:col-span-5 space-y-6 w-full min-w-0">
          {/* Email usage meter */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-secondary" /> Email Allowance
              </h3>
              {isPro ? (
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-secondary/10 text-secondary flex items-center gap-1">
                  <Crown className="w-3 h-3" /> Pro
                </span>
              ) : (
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">
                  Free
                </span>
              )}
            </div>

            {isPro ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground font-mono">{emailUsed}</strong> emails sent this month. Pro plan — no monthly cap.
              </p>
            ) : (
              <>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${usagePct >= 100 ? "bg-destructive" : "bg-secondary"}`}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground font-mono">{emailUsed}</strong> / {FREE_EMAIL_MONTHLY_LIMIT} free emails used this month
                  {" · "}
                  <strong className="text-foreground font-mono">{emailRemaining}</strong> left
                </p>
                <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                  Resets on the 1st. Need more reach? Pro removes the monthly cap.
                </p>
              </>
            )}
          </div>

          {/* Wallet (SMS credits) */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-secondary" /> SMS Messaging Wallet
              </h3>
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-chart-green/10 text-chart-green">
                Pay As You Go
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <div className="font-heading text-2xl font-black text-foreground tabular-nums">
                  ₦{currentSmsBalance.toLocaleString()}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  ~{Math.floor(currentSmsBalance / SMS_UNIT_PRICE_NAIRA).toLocaleString()} SMS units available
                </div>
              </div>
              <Button
                type="button"
                onClick={() => setIsWalletModalOpen(true)}
                className="bg-primary text-primary-foreground text-xs font-bold h-9 px-3.5 rounded-lg flex items-center gap-1.5 shadow-sm hover:opacity-90"
              >
                <Plus className="w-3.5 h-3.5" /> Fund Wallet
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
              Credits never expire. Top up in bundles of 250, 750, or 2,500 units via Paystack to send instant mobile SMS reminders.
            </p>
          </div>

          {/* Compliance note */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-2">
            <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-chart-green" /> Sent responsibly
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Broadcasts go only to people who registered for your events — never bought or uploaded lists. Every email carries a working
              unsubscribe link, and opt-outs are honoured automatically on future sends.
            </p>
          </div>

          {/* History */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">Recent Campaigns</h3>
              <span className="text-[10px] font-mono text-muted-foreground font-bold">{history.length}</span>
            </div>

            {history.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                <p className="text-xs text-muted-foreground font-medium">No campaigns yet.</p>
                <p className="text-[11px] text-muted-foreground/70">Compose a message on the left to send your first broadcast.</p>
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
                {history.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-muted/30 transition-colors space-y-1">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-bold text-foreground truncate">{item.subject || "(no subject)"}</span>
                      <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded shrink-0 ${STATUS_STYLES[item.status] || STATUS_STYLES.draft}`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground gap-2">
                      <span className="truncate">
                        {eventTitleFor(item.event_id)} · {item.channel.toUpperCase()}
                        {item.status === "sent" && ` · ${item.sent_count} sent`}
                        {item.failed_count > 0 && ` · ${item.failed_count} failed`}
                      </span>
                      <span className="shrink-0">
                        {new Date(item.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {item.status === "failed" && item.error && (
                      <p className="text-[11px] text-destructive/80 leading-snug">{item.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messaging Wallet Modal */}
      {user?.id && (
        <MessagingWalletModal
          isOpen={isWalletModalOpen}
          onClose={() => setIsWalletModalOpen(false)}
          organiserId={user.id}
          userEmail={user.email || ""}
          userName={user.user_metadata?.full_name || "Event Organiser"}
          currentBalance={currentSmsBalance}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["campaign-wallet-v2", user?.id] });
          }}
        />
      )}
    </div>
  );
};

export default Campaigns;
