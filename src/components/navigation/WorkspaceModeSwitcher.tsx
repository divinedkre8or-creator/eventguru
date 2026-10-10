import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftRight, Sparkles, Loader2, CalendarPlus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface WorkspaceModeSwitcherProps {
  variant?: "header" | "drawer" | "card";
  onSwitchComplete?: () => void;
  className?: string;
}

export const WorkspaceModeSwitcher = ({
  variant = "header",
  onSwitchComplete,
  className = "",
}: WorkspaceModeSwitcherProps) => {
  const { roles, activeMode, switchMode, upgradeToOrganiser } = useAuth();
  const navigate = useNavigate();
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  const hasOrganiserRole = roles.includes("organiser") || roles.includes("admin");

  const handleToggle = async () => {
    if (activeMode === "organiser") {
      switchMode("attendee");
      toast.success("Switched to Attendee Portal (Ticket Wallet)");
      navigate("/dashboard");
      onSwitchComplete?.();
      return;
    }

    // Currently in attendee mode
    if (hasOrganiserRole) {
      switchMode("organiser");
      toast.success("Switched to Organizer Studio");
      navigate("/dashboard");
      onSwitchComplete?.();
    } else {
      // Prompt upgrade dialog
      setUpgradeDialogOpen(true);
    }
  };

  const handleConfirmUpgrade = async () => {
    setUpgrading(true);
    const result = await upgradeToOrganiser();
    setUpgrading(false);

    if (result.success) {
      setUpgradeDialogOpen(false);
      toast.success("🎉 Organizer workspace activated! Welcome to your Studio.");
      navigate("/dashboard");
      onSwitchComplete?.();
    } else {
      toast.error(result.error || "Failed to activate organizer tools.");
    }
  };

  return (
    <>
      {variant === "drawer" ? (
        /* Mobile Drawer Footer Blue Button */
        <Button
          onClick={handleToggle}
          className={`w-full h-11 bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all ${className}`}
        >
          <ArrowLeftRight className="w-4 h-4 shrink-0" />
          <span className="truncate">
            {activeMode === "organiser"
              ? "Switch to Attendee Mode"
              : hasOrganiserRole
                ? "Switch to Organizer Mode"
                : "Organize an Event"}
          </span>
        </Button>
      ) : variant === "card" ? (
        /* In-Settings or In-Dashboard Card Action */
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="space-y-0.5">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
              CURRENT WORKSPACE
            </div>
            <div className="font-heading font-black text-sm text-foreground">
              {activeMode === "organiser" ? "Organizer Studio" : "Attendee Ticket Wallet"}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeMode === "organiser"
                ? "You are managing events, bulk SMS, and attendee check-ins."
                : "You are viewing your registered tickets, QR passes, and Rally XP."}
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleToggle}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold text-xs h-9 px-4 rounded-lg shrink-0 flex items-center gap-2 shadow-xs"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>
              {activeMode === "organiser"
                ? "Switch to Attendee Mode"
                : hasOrganiserRole
                  ? "Switch to Organizer Mode"
                  : "Organize an Event"}
            </span>
          </Button>
        </div>
      ) : (
        /* Desktop Top Header Pill */
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggle}
          className={`h-9 px-3 text-xs font-bold rounded-lg border-border hover:bg-muted/80 text-foreground flex items-center gap-1.5 transition-all shadow-2xs ${
            activeMode === "attendee" && !hasOrganiserRole
              ? "bg-secondary/10 border-secondary/40 text-secondary hover:bg-secondary/20"
              : "bg-background"
          } ${className}`}
          title={
            activeMode === "organiser"
              ? "Switch to Attendee View (Your Tickets)"
              : hasOrganiserRole
                ? "Switch to Organizer View (Events & Campaigns)"
                : "Organize an Event"
          }
        >
          {activeMode === "attendee" && !hasOrganiserRole ? (
            <CalendarPlus className="w-3.5 h-3.5 text-secondary shrink-0" />
          ) : (
            <ArrowLeftRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          )}
          <span className="hidden sm:inline">
            {activeMode === "organiser"
              ? "Switch to Attendee"
              : hasOrganiserRole
                ? "Switch to Organizer"
                : "Organize an Event"}
          </span>
          <span className="sm:hidden">
            {activeMode === "organiser" ? "Attendee" : "Organizer"}
          </span>
        </Button>
      )}

      {/* Upgrade Modal for Attendees */}
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
          <DialogHeader className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center mb-1">
              <Sparkles className="w-5 h-5" />
            </div>
            <DialogTitle className="font-heading text-xl font-black text-foreground">
              Host Events on EventGuru
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Activate your free Organizer Workspace to sell tickets, create custom attendee fliers, broadcast bulk SMS, and manage on-site QR gate entry.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 py-3 border-y border-border/80 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-chart-green shrink-0" />
              <span>Instant activation &bull; no extra email or password required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-chart-green shrink-0" />
              <span>Your attendee tickets and Rally points remain 100% saved</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-chart-green shrink-0" />
              <span>Switch back and forth between modes whenever you want</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUpgradeDialogOpen(false)}
              disabled={upgrading}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmUpgrade}
              disabled={upgrading}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-xs font-bold h-9 px-4 rounded-lg flex items-center gap-2"
            >
              {upgrading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Activating...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" /> Activate Organizer Studio
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
