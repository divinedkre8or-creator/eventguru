import { useState } from "react";
import { Settings as SettingsIcon, Shield, Save, Key, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const AdminSettings = () => {
  const [platformName, setPlatformName] = useState("MyEventGuru");
  const [supportEmail, setSupportEmail] = useState("support@myeventguru.com");
  const [platformFee, setPlatformFee] = useState("2.5");
  const [currency, setCurrency] = useState("NGN");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Platform settings updated successfully!");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans pb-12">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded inline-block mb-2 font-bold">
          SUPER ADMIN CONTROL
        </div>
        <h1 className="font-heading text-3xl font-black text-foreground tracking-tight">Platform Configuration</h1>
        <p className="text-muted-foreground text-xs font-medium mt-1">
          Global system settings, fee structures, payment gateway credentials, and maintenance mode.
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Core Info */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-xs space-y-4">
          <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
            <SettingsIcon className="w-4 h-4 text-primary" /> General Platform Identity
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Platform Brand Name</Label>
              <Input
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="bg-background border-border text-xs h-10 rounded-lg"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Official Support Email</Label>
              <Input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="bg-background border-border text-xs h-10 rounded-lg"
                required
              />
            </div>
          </div>
        </div>

        {/* Financial & Fee Structures */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-xs space-y-4">
          <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
            <Key className="w-4 h-4 text-chart-green" /> Financial & Fee Configuration
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Platform Service Fee (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={platformFee}
                onChange={(e) => setPlatformFee(e.target.value)}
                className="bg-background border-border text-xs h-10 rounded-lg font-mono"
                required
              />
              <p className="text-[10px] text-muted-foreground">Commission percentage deducted on paid ticket sales</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Primary System Currency</Label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs text-foreground font-mono font-bold focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="NGN">NGN (Nigerian Naira ₦)</option>
                <option value="GHS">GHS (Ghanaian Cedi GH₵)</option>
                <option value="KES">KES (Kenyan Shilling KSh)</option>
                <option value="USD">USD (US Dollar $)</option>
              </select>
            </div>
          </div>
        </div>

        {/* System Controls */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-xs space-y-4">
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
              checked={maintenanceMode}
              onChange={(e) => setMaintenanceMode(e.target.checked)}
              className="w-4 h-4 accent-destructive rounded cursor-pointer"
            />
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border">
            <Label className="text-xs font-bold text-foreground">Global Platform Banner Announcement</Label>
            <Input
              placeholder="e.g. Scheduled platform maintenance tonight at 2:00 AM UTC"
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              className="bg-background border-border text-xs h-10 rounded-lg"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            className="bg-primary text-primary-foreground font-bold text-xs h-10 px-6 rounded-lg flex items-center gap-2 shadow-sm"
          >
            <Save className="w-4 h-4" /> Save Platform Settings
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdminSettings;
