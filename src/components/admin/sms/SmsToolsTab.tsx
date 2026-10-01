// src/components/admin/sms/SmsToolsTab.tsx
import { useState } from "react";
import {
  Send,
  Zap,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Radio,
  Users,
  ShieldAlert,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira, DEFAULT_WHOLESALE_SMS_PRICE_NGN } from "@/lib/smsCalculations";

interface SmsToolsTabProps {
  organisersCount: number;
}

export function SmsToolsTab({ organisersCount }: SmsToolsTabProps) {
  // Test SMS State
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState(
    "[EventRally Admin Test] SMS connectivity verified successfully."
  );
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  // Broadcast State
  const [broadcastTarget, setBroadcastTarget] = useState<"organisers" | "custom">("organisers");
  const [customNumbers, setCustomNumbers] = useState("");
  const [broadcastTitle, setBroadcastTitle] = useState("EventRally Update");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<any | null>(null);

  // Character calculations
  const totalChars = broadcastMessage.length + (broadcastTitle ? broadcastTitle.length + 3 : 0);
  const segments = Math.max(1, Math.ceil(totalChars / 160));

  const handleSendTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      toast.error("Please enter a destination phone number");
      return;
    }

    setTestLoading(true);
    setTestResult(null);

    try {
      const startTime = performance.now();
      const { data, error } = await supabase.functions.invoke("admin-sms-ops", {
        body: {
          action: "send_test_sms",
          recipientPhone: testPhone.trim(),
          message: testMessage.trim(),
        },
      });

      const elapsed = Math.round(performance.now() - startTime);

      if (error || !data?.ok) {
        throw new Error(data?.error || error?.message || "Failed to send test SMS");
      }

      setTestResult({
        success: true,
        recipient: data.recipient,
        elapsed,
        provider: data.providerResponse,
      });
      toast.success(`Test SMS delivered to ${data.recipient} in ${elapsed}ms`);
    } catch (err) {
      setTestResult({
        success: false,
        error: (err as Error).message,
      });
      toast.error((err as Error).message || "Test dispatch failed");
    } finally {
      setTestLoading(false);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) {
      toast.error("Please enter a broadcast message");
      return;
    }

    let recipients: string[] = [];

    if (broadcastTarget === "organisers") {
      setBroadcastLoading(true);
      // Fetch organiser phone numbers from registrations or profiles
      const { data: profs } = await supabase
        .from("profiles")
        .select("phone, user_id")
        .not("phone", "is", null);

      recipients = (profs || [])
        .map((p: any) => p.phone)
        .filter((ph: string) => ph && ph.length >= 10);

      if (recipients.length === 0) {
        setBroadcastLoading(false);
        toast.error("No organizers with phone numbers found in profiles.");
        return;
      }
    } else {
      recipients = customNumbers
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 10);

      if (recipients.length === 0) {
        toast.error("Please provide at least one valid recipient phone number.");
        return;
      }
    }

    const estimatedCost = recipients.length * segments * DEFAULT_WHOLESALE_SMS_PRICE_NGN;
    const confirmed = window.confirm(
      `Send broadcast to ${recipients.length} recipients?\nEstimated wholesale cost: ${formatNaira(
        estimatedCost
      )} (~${recipients.length * segments} SMS units)`
    );

    if (!confirmed) {
      setBroadcastLoading(false);
      return;
    }

    setBroadcastLoading(true);
    setBroadcastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("admin-sms-ops", {
        body: {
          action: "send_admin_broadcast",
          recipients,
          message: broadcastMessage.trim(),
          title: broadcastTitle.trim(),
        },
      });

      if (error || !data?.ok) {
        throw new Error(data?.error || error?.message || "Broadcast failed");
      }

      setBroadcastResult(data);
      toast.success(`Broadcast finished: ${data.sent} sent, ${data.failed} failed.`);
      setBroadcastMessage("");
    } catch (err) {
      toast.error((err as Error).message || "Broadcast failed");
      setBroadcastResult({ ok: false, error: (err as Error).message });
    } finally {
      setBroadcastLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Tool 1: Diagnostic 1-Click Test SMS */}
      <div className="p-6 rounded-2xl border bg-card shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Diagnostic Gateway Test</h3>
              <p className="text-xs text-muted-foreground">
                Verify Textflow API connectivity, sender ID routing, and latency in real time.
              </p>
            </div>
          </div>

          <form onSubmit={handleSendTestSms} className="space-y-4 mt-6">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Test Destination Number</Label>
              <div className="relative">
                <PhoneCall className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="e.g. 08012345678 or 2348012345678"
                  className="pl-9 text-xs"
                  required
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Local 080/090/070 numbers will automatically be converted to international 234 format.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Message Payload</Label>
              <Input
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={testLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 gap-1.5"
            >
              {testLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Testing Gateway Connection...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Dispatch Test SMS
                </>
              )}
            </Button>
          </form>

          {/* Test Diagnostic Result Console */}
          {testResult && (
            <div
              className={`mt-4 p-3.5 rounded-xl border text-xs font-mono space-y-1.5 ${
                testResult.success
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                  : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                {testResult.success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>SUCCESS ({testResult.elapsed}ms)</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    <span>FAILED</span>
                  </>
                )}
              </div>
              {testResult.success ? (
                <div className="text-[11px] leading-relaxed">
                  <div>Destination: {testResult.recipient}</div>
                  <div>Provider Status: {testResult.provider?.status || "delivered"}</div>
                  <div>Message ID: {testResult.provider?.data?.message_id || "ok"}</div>
                </div>
              ) : (
                <div className="text-[11px]">{testResult.error}</div>
              )}
            </div>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground mt-4 border-t pt-3">
          Sends 1 real SMS through the active Textflow account. Costs ~{formatNaira(DEFAULT_WHOLESALE_SMS_PRICE_NGN, true)} wholesale.
        </p>
      </div>

      {/* Tool 2: Super Admin Platform Broadcast */}
      <div className="p-6 rounded-2xl border bg-card shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Super Admin Broadcast</h3>
              <p className="text-xs text-muted-foreground">
                Dispatch platform announcements or urgent alerts to organizers or custom lists.
              </p>
            </div>
          </div>

          <form onSubmit={handleSendBroadcast} className="space-y-4 mt-6">
            {/* Target Audience */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Audience</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBroadcastTarget("organisers")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                    broadcastTarget === "organisers"
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>All Organizers ({organisersCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBroadcastTarget("custom")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                    broadcastTarget === "custom"
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Custom Phone List</span>
                </button>
              </div>
            </div>

            {/* Custom Numbers Textarea */}
            {broadcastTarget === "custom" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Recipient Numbers</Label>
                <Textarea
                  value={customNumbers}
                  onChange={(e) => setCustomNumbers(e.target.value)}
                  placeholder="Enter numbers separated by comma or new lines (e.g. 08012345678, 08098765432)"
                  rows={2}
                  className="text-xs font-mono resize-none"
                  required
                />
              </div>
            )}

            {/* Broadcast Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Header Tag</Label>
              <Input
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="e.g. EventRally Update"
                className="text-xs"
              />
            </div>

            {/* Message Body */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold">Broadcast Message</Label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {totalChars} chars ({segments} SMS {segments > 1 ? "segments" : "segment"})
                </span>
              </div>
              <Textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Type your platform announcement here..."
                rows={3}
                className="text-xs resize-none"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={broadcastLoading || !broadcastMessage.trim()}
              className="w-full font-semibold text-xs h-9 gap-1.5"
            >
              {broadcastLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Dispatching Broadcast...
                </>
              ) : (
                <>
                  <Radio className="w-3.5 h-3.5" />
                  Dispatch Platform Broadcast
                </>
              )}
            </Button>
          </form>

          {/* Broadcast Result */}
          {broadcastResult && (
            <div
              className={`mt-4 p-3.5 rounded-xl border text-xs font-mono space-y-1 ${
                broadcastResult.ok
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                  : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
              }`}
            >
              <div className="font-bold">
                {broadcastResult.ok
                  ? `Completed: ${broadcastResult.sent} Sent / ${broadcastResult.failed} Failed (Total ${broadcastResult.total})`
                  : `Failed: ${broadcastResult.error}`}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-4 border-t pt-3">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>Safety cap: Broadcasts are capped at 500 recipients per execution.</span>
        </div>
      </div>
    </div>
  );
}
