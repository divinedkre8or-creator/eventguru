import { useState } from "react";
import { Shield, ShieldAlert, CheckCircle2, Loader2, AlertCircle, Copy, Check, ExternalLink } from "lucide-react";
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
  const [sqlErrorNotice, setSqlErrorNotice] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const { toast } = useToast();

  const targetEmail = (email || defaultEmail).trim().toLowerCase();

  const generatedSql = `-- Execute in Supabase SQL Editor (https://supabase.com/dashboard/project/edpnvsakkudorleqqhxv/sql/new):
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role 
FROM auth.users 
WHERE lower(email) = '${targetEmail || "user@example.com"}'
ON CONFLICT (user_id, role) DO NOTHING;`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(generatedSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    setSqlErrorNotice(null);

    if (!targetEmail) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please specify the user's registered account email address.",
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
      let success = false;

      // 1. Try secure Edge Function with SERVICE_ROLE_KEY
      try {
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke(
          "admin-sms-ops",
          {
            body: { action: "promote_admin", targetEmail },
          }
        );

        if (!edgeError && edgeData?.ok) {
          success = true;
        } else if (edgeError && !edgeError.message?.includes("FunctionsFetchError")) {
          console.warn("Edge function promote attempt:", edgeError);
        }
      } catch (edgeEx) {
        console.warn("Edge function invocation bypassed:", edgeEx);
      }

      // 2. If edge function didn't complete, try database RPC
      if (!success) {
        const { error: rpcError } = await supabase.rpc(
          "promote_to_admin" as any,
          { target_email: targetEmail }
        );

        if (!rpcError) {
          success = true;
        } else {
          // If RPC is missing in schema cache, check if target user ID is known
          if (defaultUserId) {
            const { error: insertError } = await supabase
              .from("user_roles")
              .insert({ user_id: defaultUserId, role: "admin" as any });

            if (!insertError) {
              success = true;
            }
          }

          if (!success) {
            setSqlErrorNotice(
              rpcError?.message?.includes("schema cache")
                ? "The promote_to_admin RPC function is not yet registered in your Supabase schema cache. Run the SQL statement below to immediately grant this user Super Admin access."
                : rpcError?.message || "Database elevation requires running the SQL statement in your Supabase SQL editor."
            );
            return;
          }
        }
      }

      toast({
        title: "Super Admin Granted",
        description: `Successfully granted Super Admin privileges to ${targetEmail}.`,
      });

      onOpenChange(false);
      setEmail("");
      setConfirmed(false);
      setSqlErrorNotice(null);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("Failed to promote user to admin:", err);
      setSqlErrorNotice(err.message || "An unexpected error occurred while granting admin access.");
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
              Elevate an existing registered user account to Super Administrator status.
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
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSqlErrorNotice(null);
                }}
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

            {/* SQL Fallback / Schema Cache Resolver Card */}
            {sqlErrorNotice && (
              <div className="p-3.5 rounded-xl bg-destructive/5 border border-destructive/20 space-y-2.5">
                <div className="flex items-center gap-2 text-destructive font-bold text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Direct Database Command Required</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {sqlErrorNotice}
                </p>
                <div className="relative">
                  <pre className="p-2.5 rounded-lg bg-background border border-border text-[10px] font-mono text-foreground overflow-x-auto whitespace-pre-wrap">
                    {generatedSql}
                  </pre>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={copySqlToClipboard}
                    className="h-8 text-xs font-bold gap-1.5 border-border"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-chart-green" />
                        <span className="text-chart-green">SQL Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy SQL Command</span>
                      </>
                    )}
                  </Button>
                  <a
                    href="https://supabase.com/dashboard/project/edpnvsakkudorleqqhxv/sql/new"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline"
                  >
                    <span>Open Supabase SQL Editor</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
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
