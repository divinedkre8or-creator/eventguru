import { useState, useEffect } from "react";
import { 
  Settings as SettingsIcon, Shield, Save, Key, AlertTriangle, 
  CheckCircle2, CreditCard, Mail, Eye, EyeOff, Send, Loader2, MessageSquare, Phone, 
  Database as DatabaseIcon, Copy, ExternalLink, RefreshCw 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  getPlatformSettings, 
  fetchRemotePlatformSettings, 
  persistPlatformSettings, 
  PlatformSettings 
} from "@/lib/platformSettings";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AdminRoleModal } from "@/components/admin/AdminRoleModal";
import { UserCheck, UserX, ShieldCheck } from "lucide-react";

const SQL_MIGRATION_SCRIPT = `-- Supabase SQL Setup for EventRally Platform Settings
-- Run this once in your Supabase SQL Editor: https://supabase.com/dashboard/project/edpnvsakkudorleqqhxv/sql/new

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id TEXT PRIMARY KEY DEFAULT 'global_settings',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for checkout gateway keys and announcements)
DROP POLICY IF EXISTS "Public read platform_settings" ON public.platform_settings;
CREATE POLICY "Public read platform_settings"
  ON public.platform_settings
  FOR SELECT
  USING (true);

-- Allow authenticated admins to write settings
DROP POLICY IF EXISTS "Admin write platform_settings" ON public.platform_settings;
CREATE POLICY "Admin write platform_settings"
  ON public.platform_settings
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Seed initial row
INSERT INTO public.platform_settings (id, settings, updated_at)
VALUES ('global_settings', '{}'::jsonb, now())
ON CONFLICT (id) DO NOTHING;
`;

const AdminSettings = () => {
  const { user: currentAuthUser } = useAuth();
  const [settings, setSettings] = useState<PlatformSettings>(getPlatformSettings());
  const [loadingRemote, setLoadingRemote] = useState(true);
  const [isDbSynced, setIsDbSynced] = useState<boolean | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Admin Delegation State
  const [admins, setAdmins] = useState<{ user_id: string; full_name: string; created_at: string }[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [roleModalOpen, setRoleModalOpen] = useState(false);

  const fetchAdmins = async () => {
    setAdminsLoading(true);
    try {
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id, created_at")
        .eq("role", "admin");

      if (adminRoles && adminRoles.length > 0) {
        const uids = adminRoles.map((a) => a.user_id);
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", uids);

        const list = adminRoles.map((a) => {
          const prof = (profs || []).find((p) => p.user_id === a.user_id);
          return {
            user_id: a.user_id,
            full_name: prof?.full_name || "Platform Administrator",
            created_at: a.created_at,
          };
        });
        setAdmins(list);
      } else {
        setAdmins([]);
      }
    } catch (err) {
      console.error("Failed to load admin list:", err);
    } finally {
      setAdminsLoading(false);
    }
  };

  const handleDemoteAdmin = async (targetUserId: string) => {
    if (admins.length <= 1) {
      toast.error("Cannot revoke role: The platform must retain at least one Super Administrator.");
      return;
    }

    if (!confirm("Are you sure you want to revoke Super Administrator access for this account?")) {
      return;
    }

    try {
      const { error: rpcErr } = await supabase.rpc("demote_admin" as any, { target_user_id: targetUserId });
      if (rpcErr) {
        const { error: delErr } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", targetUserId)
          .eq("role", "admin");
        if (delErr) throw delErr;
      }
      toast.success("Administrator role revoked successfully.");
      fetchAdmins();
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke admin role.");
    }
  };

  const checkDbStatus = async () => {
    setLoadingRemote(true);
    const result = await fetchRemotePlatformSettings();
    setSettings(result.settings);
    setIsDbSynced(result.isDatabasePersisted);
    setDbError(result.error || null);
    setLoadingRemote(false);
  };

  useEffect(() => {
    checkDbStatus();
    fetchAdmins();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const ok = await persistPlatformSettings(settings);
      if (ok) {
        toast.success("Platform settings saved successfully.");
      } else {
        toast.error("Failed to save platform settings to database.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
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
          Global system settings, fee schedules, branding, and infrastructure status. API credentials are encrypted and managed via secure environment variables.
        </p>
      </div>

      {/* Infrastructure Security Banner */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-chart-green/10 text-chart-green flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading text-sm font-bold text-foreground">API Credentials Managed Securely</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-chart-green/10 text-chart-green uppercase">Hardened</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Paystack, Resend, Textflow, and Termii API keys are bound to the secure runtime environment to prevent accidental browser exposure or tampering.
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={checkDbStatus}
          variant="outline"
          size="sm"
          className="text-xs font-bold border-border shrink-0 self-start sm:self-center"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh Status
        </Button>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6 w-full min-w-0">
        
        {/* Payment Gateway Configuration */}
        <div className="bg-card border border-border rounded-xl p-5 sm:p-6 shadow-xs space-y-4 w-full min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
            <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-secondary" /> Payment Gateway & Financial Rules
            </h2>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase">
              {settings.gateway_environment === "live" ? "Live Mode Active" : "Sandbox / Test Mode"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-1 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-chart-green" /> Paystack Gateway Provider
                </span>
                <span className="text-[10px] font-mono font-bold text-chart-green uppercase bg-chart-green/10 px-2 py-0.5 rounded">
                  System Configured
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Payment keys are loaded authoritatively from environment configuration. Attendee checkouts route securely through this provider.
              </p>
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
              <p className="text-[10px] text-muted-foreground">Platform commission automatically deducted from paid ticket sales (e.g. 2.5%).</p>
            </div>

            <div className="space-y-1.5 min-w-0 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">Paystack Public Key</Label>
                <span className="text-[10px] font-mono font-bold text-muted-foreground">
                  {settings.gateway_public_key?.startsWith("pk_live_") ? "🟢 Live Production Key" : "🟡 Test Key"}
                </span>
              </div>
              <Input
                type="text"
                value={settings.gateway_public_key}
                onChange={(e) => setSettings({ ...settings, gateway_public_key: e.target.value.trim() })}
                placeholder="pk_live_... or pk_test_..."
                className="bg-background border-border text-xs h-10 rounded-lg font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                Public key used for Paystack checkout popups (ticket purchases and organizer SMS wallet top-ups).
              </p>
            </div>
          </div>
        </div>

        {/* Messaging & Dispatch Service Identity */}
        <div className="bg-card border border-border rounded-xl p-5 sm:p-6 shadow-xs space-y-4 w-full min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
            <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" /> Email & SMS Dispatch Settings
            </h2>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase">
              Transactional & Alerts
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-1 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-chart-green" /> Resend & Textflow / Termii Pipelines
                </span>
                <span className="text-[10px] font-mono font-bold text-chart-green uppercase bg-chart-green/10 px-2 py-0.5 rounded">
                  System Configured
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Automated ticket delivery, entry QR passes, organizer alerts, and promotional broadcasts are dispatched using server-level API keys with lock-screen brand prefixing.
              </p>
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
              <p className="text-[10px] text-muted-foreground">The verified email address from which tickets are dispatched.</p>
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
              <p className="text-[10px] text-muted-foreground">Appears in attendee inboxes as the sender identity.</p>
            </div>

            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs font-bold text-foreground">SMS Sender ID (Textflow)</Label>
              <Input
                value={settings.textflow_sender_id}
                onChange={(e) => setSettings({ ...settings, textflow_sender_id: e.target.value })}
                placeholder="Textflow"
                maxLength={11}
                className="bg-background border-border text-xs h-10 rounded-lg font-mono uppercase"
              />
              <p className="text-[10px] text-muted-foreground">Default: "Textflow" for 100% DND bypass without CAC paperwork.</p>
            </div>

            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs font-bold text-foreground">SMS Sender ID (Termii Fallback)</Label>
              <Input
                value={settings.termii_sender_id}
                onChange={(e) => setSettings({ ...settings, termii_sender_id: e.target.value })}
                placeholder="EventRally"
                maxLength={11}
                className="bg-background border-border text-xs h-10 rounded-lg font-mono uppercase"
              />
              <p className="text-[10px] text-muted-foreground">Approved 11-character alphanumeric Sender ID on Termii.</p>
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

        {/* Super Administrators & Access Control */}
        <div className="bg-card border border-border rounded-xl p-5 sm:p-6 shadow-xs space-y-4 w-full min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> Super Administrators & Access Control
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Accounts granted full administrative control, financial ledger oversight, and platform authority.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setRoleModalOpen(true)}
              className="bg-primary hover:opacity-90 text-primary-foreground text-xs font-bold gap-1.5 h-9 px-3.5 rounded-lg shadow-xs"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Add Platform Administrator</span>
            </Button>
          </div>

          {adminsLoading ? (
            <div className="py-8 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Loading active administrators…</span>
            </div>
          ) : admins.length === 0 ? (
            <div className="p-4 rounded-lg bg-muted/40 text-center text-xs text-muted-foreground">
              No Super Administrators currently registered.
            </div>
          ) : (
            <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
              {admins.map((admin) => (
                <div
                  key={admin.user_id}
                  className="p-3 bg-card hover:bg-muted/30 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-bold text-xs text-foreground flex items-center gap-2">
                      <span className="truncate">{admin.full_name}</span>
                      {admin.user_id === currentAuthUser?.id && (
                        <span className="text-[10px] font-mono font-bold uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground truncate">
                      ID: {admin.user_id} · Appointed: {new Date(admin.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>

                  {admins.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDemoteAdmin(admin.user_id)}
                      className="text-xs font-semibold text-destructive hover:bg-destructive/10 h-8 px-2.5"
                    >
                      <UserX className="w-3.5 h-3.5 mr-1" />
                      <span>Revoke</span>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex justify-end w-full sm:w-auto">
          <Button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto bg-primary text-primary-foreground font-bold text-xs h-11 px-6 rounded-lg flex items-center justify-center gap-2 shadow-sm hover:opacity-90"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving to Database..." : "Save Platform Configuration"}
          </Button>
        </div>
      </form>

      {/* Admin Role Elevation Modal */}
      <AdminRoleModal
        open={roleModalOpen}
        onOpenChange={setRoleModalOpen}
        onSuccess={() => {
          fetchAdmins();
        }}
      />
    </div>
  );
};

export default AdminSettings;
