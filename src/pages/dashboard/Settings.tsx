import { useState, useEffect } from "react";
import { User, Lock, Bell, Building, ShieldCheck, CheckCircle2, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";

const Settings = () => {
  const { user, profile } = useAuth();

  // Profile Form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [orgName, setOrgName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Notification toggles
  const [notifyOnRegistration, setNotifyOnRegistration] = useState(true);
  const [notifyDailyDigest, setNotifyDailyDigest] = useState(true);

  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    } else if (user?.user_metadata?.full_name) {
      setFullName(user.user_metadata.full_name);
    }
  }, [profile, user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSavingProfile(true);
    try {
      // 1. Update profiles table with onConflict target
      const { error: profErr } = await supabase
        .from("profiles")
        .upsert(
          {
            user_id: user.id,
            full_name: fullName,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      if (profErr) throw profErr;

      // 2. Update user metadata
      await supabase.auth.updateUser({
        data: { full_name: fullName },
      });

      toast.success("Profile updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      toast.success("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans pb-12">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-muted px-2.5 py-1 rounded inline-block mb-2 text-foreground">
          ACCOUNT PREFERENCES
        </div>
        <h1 className="font-heading text-3xl font-black text-foreground tracking-tight">Organiser Settings</h1>
        <p className="text-muted-foreground text-xs font-medium mt-1">
          Manage your personal profile, security credentials, and system preferences.
        </p>
      </div>

      {/* Profile Section */}
      <form onSubmit={handleUpdateProfile} className="bg-card border border-border rounded-xl p-6 shadow-xs space-y-5">
        <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
          <User className="w-4 h-4 text-primary" /> Profile Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Full Name *</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Amaka Okafor"
              className="bg-background border-border text-xs h-10 rounded-lg"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Email Address</Label>
            <Input
              value={user?.email || ""}
              disabled
              className="bg-muted text-muted-foreground border-border text-xs h-10 rounded-lg cursor-not-allowed"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={savingProfile}
            className="bg-primary text-primary-foreground font-bold text-xs h-9 px-5 rounded-lg flex items-center gap-1.5"
          >
            {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Profile Changes
          </Button>
        </div>
      </form>

      {/* Change Password Section */}
      <form onSubmit={handleChangePassword} className="bg-card border border-border rounded-xl p-6 shadow-xs space-y-5">
        <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
          <Lock className="w-4 h-4 text-secondary" /> Security & Password
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="bg-background border-border text-xs h-10 rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Confirm New Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="bg-background border-border text-xs h-10 rounded-lg"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={updatingPassword}
            variant="outline"
            className="border-border text-foreground font-bold text-xs h-9 px-5 rounded-lg flex items-center gap-1.5"
          >
            {updatingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
            Update Password
          </Button>
        </div>
      </form>

      {/* System Preferences */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-xs space-y-5">
        <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
          <Bell className="w-4 h-4 text-chart-purple" /> Notification Preferences & Theme
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-foreground">Instant Ticket Sales Notifications</div>
              <div className="text-[11px] text-muted-foreground">Receive an email whenever an attendee completes registration</div>
            </div>
            <input
              type="checkbox"
              checked={notifyOnRegistration}
              onChange={(e) => setNotifyOnRegistration(e.target.checked)}
              className="w-4 h-4 accent-secondary rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <div>
              <div className="text-xs font-bold text-foreground">Daily Event Digest</div>
              <div className="text-[11px] text-muted-foreground">Receive daily attendance and check-in summaries</div>
            </div>
            <input
              type="checkbox"
              checked={notifyDailyDigest}
              onChange={(e) => setNotifyDailyDigest(e.target.checked)}
              className="w-4 h-4 accent-secondary rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <div>
              <div className="text-xs font-bold text-foreground">Interface Appearance</div>
              <div className="text-[11px] text-muted-foreground">Switch between Dark Mode, Light Mode, or System Default</div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
