import { useState, useEffect } from "react";
import { 
  Settings as SettingsIcon, Shield, Save, Key, AlertTriangle, 
  CheckCircle2, CreditCard, Mail, Eye, EyeOff, Send, Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getPlatformSettings, savePlatformSettings, PlatformSettings } from "@/lib/platformSettings";

const AdminSettings = () => {
  const [settings, setSettings] = useState<PlatformSettings>(getPlatformSettings());
  const [showPublicKey, setShowPublicKey] = useState(false);
  const [showResendKey, setShowResendKey] = useState(false);
  
  // Test email state
  const [testEmailRecipient, setTestEmailRecipient] = useState("");
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  useEffect(() => {
    setSettings(getPlatformSettings());
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    savePlatformSettings(settings);
    toast.success("Platform settings, payment gateway keys, and email configuration updated successfully!");
  };

  const handleSendTestEmail = async () => {
    if (!settings.resend_api_key || settings.resend_api_key.trim() === "") {
      toast.error("Please enter your Resend API Key and save settings first.");
      return;
    }
    const targetEmail = testEmailRecipient.trim() || settings.support_email;
    if (!targetEmail) {
      toast.error("Please specify a recipient email address for testing.");
      return;
    }

    setSendingTestEmail(true);
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${settings.resend_api_key.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${settings.email_sender_name} <${settings.email_sender_address}>`,
          to: targetEmail,
          subject: "EventRally Test Dispatch: Resend Integration Active",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px; background-color: #ffffff; color: #0f172a;">
              <div style="border-bottom: 2px solid #0058BE; padding-bottom: 12px; margin-bottom: 20px;">
                <span style="font-size: 11px; font-family: monospace; font-weight: bold; color: #0058BE; text-transform: uppercase;">SUPER ADMIN VERIFICATION</span>
                <h1 style="font-size: 20px; font-weight: 900; margin: 4px 0 0 0; color: #0f172a;">Resend Email Pipeline Is Operational</h1>
              </div>
              <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                Hello Super Admin, this test confirms that your Resend API key and sender identity (<strong>${settings.email_sender_address}</strong>) are properly configured and operational for automated ticket passes, QR entry codes, and notifications.
              </p>
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; margin: 18px 0; font-size: 13px;">
                <div><strong>Sender:</strong> ${settings.email_sender_name} &lt;${settings.email_sender_address}&gt;</div>
                <div><strong>Timestamp:</strong> ${new Date().toUTCString()}</div>
                <div><strong>Platform:</strong> ${settings.platform_name}</div>
              </div>
              <p style="font-size: 12px; color: #64748b; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
                Dispatched from EventRally Super Admin Control Panel.
              </p>
            </div>
          `,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Resend API rejected with status ${res.status}`);
      }

      toast.success(`Test email dispatched successfully to ${targetEmail}! Check inbox/spam.`);
    } catch (err: any) {
      console.error("Test email failed:", err);
      toast.error(err.message || "Failed to dispatch test email via Resend API");
    } finally {
      setSendingTestEmail(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans pb-16 w-full min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="border-b border-border pb-6 w-full min-w-0">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded inline-block mb-2">
          SUPER ADMIN CONTROL
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-black text-foreground tracking-tight">Platform Configuration</h1>
        <p className="text-muted-foreground text-xs font-medium mt-1">
          Global system settings, payment gateway keys, automated Resend email delivery, fee schedules, and maintenance mode.
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6 w-full min-w-0">
        
        {/* Payment Gateway Configuration */}
        <div className="bg-card border border-border rounded-xl p-5 sm:p-6 shadow-xs space-y-4 w-full min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
            <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-secondary" /> Direct Payment Gateway Credentials
            </h2>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase">
              {settings.gateway_environment === "live" ? "Live Mode Active" : "Sandbox / Test Mode"}
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Plug in your payment gateway credentials below. Once saved, the checkout modal will instantly utilize this public key for card, bank transfer, and USSD payments.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 min-w-0 sm:col-span-2">
              <Label className="text-xs font-bold text-foreground">Gateway Public Key *</Label>
              <div className="relative">
                <Input
                  type={showPublicKey ? "text" : "password"}
                  value={settings.gateway_public_key}
                  onChange={(e) => setSettings({ ...settings, gateway_public_key: e.target.value })}
                  placeholder="pk_live_... or pk_test_..."
                  className="bg-background border-border text-xs h-10 rounded-lg pr-10 font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPublicKey(!showPublicKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPublicKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">Used securely on the frontend checkout modal to initialize attendee payments.</p>
            </div>

            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs font-bold text-foreground">Gateway Environment</Label>
              <select
                value={settings.gateway_environment}
                onChange={(e: any) => setSettings({ ...settings, gateway_environment: e.target.value })}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs text-foreground font-bold focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="test">Sandbox / Test Mode (Simulated Money)</option>
                <option value="live">Live Production (Real Bank Settlement)</option>
              </select>
            </div>

            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs font-bold text-foreground">Platform Service Fee (%)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="30"
                value={settings.platform_fee_percent}
                onChange={(e) => setSettings({ ...settings, platform_fee_percent: parseFloat(e.target.value) || 0 })}
                className="bg-background border-border text-xs h-10 rounded-lg font-mono"
                required
              />
              <p className="text-[10px] text-muted-foreground">Platform commission deducted from ticket sales (e.g. 2.5%).</p>
            </div>
          </div>
        </div>

        {/* Email Delivery Platform (Resend) */}
        <div className="bg-card border border-border rounded-xl p-5 sm:p-6 shadow-xs space-y-4 w-full min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
            <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" /> Email Delivery Service (Resend Integration)
            </h2>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase">
              Transactional & Broadcast
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Configure your Resend API credentials to automate ticket delivery, entry QR barcodes, organizer alerts, and promotional broadcasts.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 min-w-0 sm:col-span-2">
              <Label className="text-xs font-bold text-foreground">Resend API Key *</Label>
              <div className="relative">
                <Input
                  type={showResendKey ? "text" : "password"}
                  value={settings.resend_api_key}
                  onChange={(e) => setSettings({ ...settings, resend_api_key: e.target.value })}
                  placeholder="re_1234567890abcdef..."
                  className="bg-background border-border text-xs h-10 rounded-lg pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowResendKey(!showResendKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showResendKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">Obtain this key from your Resend dashboard at resend.com/api-keys.</p>
            </div>

            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs font-bold text-foreground">Sender From Email *</Label>
              <Input
                type="email"
                value={settings.email_sender_address}
                onChange={(e) => setSettings({ ...settings, email_sender_address: e.target.value })}
                placeholder="tickets@yourdomain.com"
                className="bg-background border-border text-xs h-10 rounded-lg"
                required
              />
              <p className="text-[10px] text-muted-foreground">Must be verified on Resend (e.g. tickets@yourdomain.com or onboarding@resend.dev for test).</p>
            </div>

            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs font-bold text-foreground">Sender Display Name</Label>
              <Input
                value={settings.email_sender_name}
                onChange={(e) => setSettings({ ...settings, email_sender_name: e.target.value })}
                placeholder="EventRally Official"
                className="bg-background border-border text-xs h-10 rounded-lg"
                required
              />
              <p className="text-[10px] text-muted-foreground">Appears in attendee email inboxes as the sender name.</p>
            </div>
          </div>

          {/* Test Dispatch Bar */}
          <div className="bg-muted/40 border border-border/80 rounded-lg p-3.5 space-y-2.5 mt-2">
            <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-secondary" /> Verify Resend Dispatcher
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Input
                type="email"
                placeholder="Recipient email to test (e.g. your email)..."
                value={testEmailRecipient}
                onChange={(e) => setTestEmailRecipient(e.target.value)}
                className="bg-background border-border text-xs h-9 rounded-lg flex-1"
              />
              <Button
                type="button"
                onClick={handleSendTestEmail}
                disabled={sendingTestEmail}
                variant="outline"
                className="border-border text-xs font-bold h-9 px-4 rounded-lg flex items-center justify-center gap-1.5 shrink-0"
              >
                {sendingTestEmail ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Send Test Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* General Identity */}
        <div className="bg-card border border-border rounded-xl p-5 sm:p-6 shadow-xs space-y-4 w-full min-w-0">
          <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
            <SettingsIcon className="w-4 h-4 text-primary" /> General Platform Identity
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs font-bold text-foreground">Platform Brand Name</Label>
              <Input
                value={settings.platform_name}
                onChange={(e) => setSettings({ ...settings, platform_name: e.target.value })}
                className="bg-background border-border text-xs h-10 rounded-lg"
                required
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs font-bold text-foreground">Official Support Email</Label>
              <Input
                type="email"
                value={settings.support_email}
                onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                className="bg-background border-border text-xs h-10 rounded-lg"
                required
              />
            </div>
          </div>
        </div>

        {/* Safety & Maintenance */}
        <div className="bg-card border border-border rounded-xl p-5 sm:p-6 shadow-xs space-y-4 w-full min-w-0">
          <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
            <AlertTriangle className="w-4 h-4 text-destructive" /> Platform Safety & Maintenance
          </h2>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-foreground">System Maintenance Mode</div>
              <div className="text-[11px] text-muted-foreground">Temporarily pause new event creation and public checkouts</div>
            </div>
            <input
              type="checkbox"
              checked={settings.maintenance_mode}
              onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
              className="w-4 h-4 accent-destructive rounded cursor-pointer"
            />
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border">
            <Label className="text-xs font-bold text-foreground">Global Platform Announcement Banner</Label>
            <Input
              placeholder="e.g. Scheduled platform maintenance tonight at 2:00 AM UTC"
              value={settings.announcement_banner}
              onChange={(e) => setSettings({ ...settings, announcement_banner: e.target.value })}
              className="bg-background border-border text-xs h-10 rounded-lg"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end w-full sm:w-auto">
          <Button
            type="submit"
            className="w-full sm:w-auto bg-primary text-primary-foreground font-bold text-xs h-11 px-6 rounded-lg flex items-center justify-center gap-2 shadow-sm hover:opacity-90"
          >
            <Save className="w-4 h-4" /> Save Platform Configuration
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdminSettings;
