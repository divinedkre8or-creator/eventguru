import { useState } from "react";
import { Shield, ShieldAlert, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AdminRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail?: string;
  defaultUserId?: string;
  onSuccess?: () => void;
}

export const AdminRoleModal = ({
  open,
  onOpenChange,
  defaultEmail = "",
  defaultUserId = "",
  onSuccess,
}: AdminRoleModalProps) => {
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const { toast } = useToast();

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = (email || defaultEmail).trim().toLowerCase();

    if (!cleanEmail) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please specify the user's account email address.",
      });
      return;
    }

    if (!confirmed) {
      toast({
        variant: "destructive",
        title: "Confirmation Required",
        description: "Please acknowledge the security warning before proceeding.",
      });
      return;
    }

    setLoading(true);
    try {
      // 1. Try server-enforced RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "promote_to_admin" as any,
        { target_email: cleanEmail }
      );

      if (rpcError) {
        // Fallback if migration not yet applied to live DB:
        // Attempt direct admin elevation if user ID is known
        if (defaultUserId) {
          const { error: insertError } = await supabase
            .from("user_roles")
            .insert({ user_id: defaultUserId, role: "admin" as any });

          if (insertError) {
            throw new Error(insertError.message || rpcError.message);
          }
        } else {
          throw new Error(rpcError.message);
        }
      }

      toast({
        title: "Super Admin Granted",
        description: `Successfully granted Super Admin privileges to ${cleanEmail}.`,
      });

      onOpenChange(false);
      setEmail("");
      setConfirmed(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("Failed to promote user to admin:", err);
      toast({
        variant: "destructive",
        title: "Role Elevation Failed",
        description: err.message || "An unexpected error occurred while granting admin access.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border font-sans">
        <form onSubmit={handlePromote} className="space-y-4">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mb-2">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <DialogTitle className="font-heading text-xl font-black text-foreground tracking-tight">
              Grant Super Admin Privileges
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Elevate an existing platform user to Super Administrator status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="p-3.5 rounded-xl bg-muted/60 border border-border space-y-2">
              <div className="flex items-center gap-2 text-foreground font-bold text-xs">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                <span>Elevated Security Warning</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Super Administrators hold unrestricted access to all financial transaction ledgers, dispute arbitration, organizer accounts, attendee records, and platform-wide configurations.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Target User Email Address
              </Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={email || defaultEmail}
                onChange={(e) => setEmail(e.target.value)}
                disabled={Boolean(defaultEmail)}
                className="bg-background border-border text-xs h-10 rounded-lg font-mono"
                required
              />
            </div>

            <label className="flex items-start gap-2.5 pt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-[11px] text-foreground/90 leading-tight">
                I verify that this account belongs to an authorized team member and should have full Super Admin capabilities.
              </span>
            </label>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs font-semibold border-border"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={loading || !confirmed}
              className="text-xs font-bold gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Authorizing...</span>
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5" />
                  <span>Confirm Admin Elevation</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
