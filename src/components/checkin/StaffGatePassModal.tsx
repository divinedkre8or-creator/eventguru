import React, { useState } from "react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  KeyRound, Copy, Check, RefreshCw, Share2, ShieldCheck, 
  ExternalLink, Loader2, Users 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

interface StaffGatePassModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  gatekeeperPin: string;
  onPinRegenerated: (newPin: string) => void;
}

export const StaffGatePassModal: React.FC<StaffGatePassModalProps> = ({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  gatekeeperPin,
  onPinRegenerated,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const gatekeeperUrl = `${window.location.origin}/gatekeeper?event=${eventId}&pin=${gatekeeperPin}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(gatekeeperUrl);
    setCopiedLink(true);
    toast.success("Gatekeeper staff link copied to clipboard");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyPin = () => {
    navigator.clipboard.writeText(gatekeeperPin);
    setCopiedPin(true);
    toast.success("6-digit PIN copied");
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = `Door Gate Pass for *${eventTitle}*:\n\nTap this link on your phone to open the gate scanner:\n${gatekeeperUrl}\n\nAccess PIN: *${gatekeeperPin}*`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleResetPin = async () => {
    if (!confirm("Are you sure you want to reset the Gatekeeper PIN? Any staff using the old PIN will need the new one.")) {
      return;
    }
    setIsResetting(true);
    try {
      const { data, error } = await supabase.rpc("reset_gatekeeper_pin", {
        p_event_id: eventId,
      });
      if (error) throw error;
      if (data) {
        onPinRegenerated(data);
        toast.success("Gatekeeper PIN reset successfully!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to reset PIN");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full p-6 bg-card border-border rounded-2xl shadow-2xl font-sans">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Users className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
              STAFF DELEGATION
            </span>
          </div>
          <DialogTitle className="font-heading text-lg font-black tracking-tight text-foreground">
            Door Gatekeeper Pass
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Give ushers, bouncers, and volunteers check-in scanner access without giving them your organizer login credentials or financial balances.
          </DialogDescription>
        </DialogHeader>

        {/* PIN Box */}
        <div className="my-3 p-4 rounded-xl bg-muted/50 border border-border flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono font-bold uppercase text-muted-foreground flex items-center gap-1.5">
              <KeyRound className="w-3 h-3 text-primary" />
              6-DIGIT GATE PIN
            </div>
            <div className="font-mono text-2xl font-black text-foreground tracking-widest mt-1">
              {gatekeeperPin.slice(0, 3)} {gatekeeperPin.slice(3)}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyPin}
              className="h-8 text-xs font-bold"
            >
              {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              {copiedPin ? "Copied" : "Copy"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetPin}
              disabled={isResetting}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              title="Generate new PIN"
            >
              {isResetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>

        {/* QR Code for Fast Usher Phone Setup */}
        <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-background border border-border text-center space-y-2">
          <div className="p-2.5 bg-white rounded-xl shadow-sm border border-zinc-200">
            <QRCodeSVG value={gatekeeperUrl} size={130} level="M" />
          </div>
          <p className="text-[11px] text-muted-foreground max-w-xs leading-tight">
            Staff can point their smartphone camera at this QR code to launch the gate scanner immediately.
          </p>
        </div>

        {/* Share Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <Button
            onClick={handleCopyLink}
            variant="outline"
            className="w-full text-xs font-bold h-10 rounded-xl flex items-center justify-center gap-1.5"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            <span>{copiedLink ? "Link Copied!" : "Copy Staff Link"}</span>
          </Button>

          <Button
            onClick={handleShareWhatsApp}
            className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold h-10 rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Share2 className="w-4 h-4" />
            <span>Send on WhatsApp</span>
          </Button>
        </div>

        {/* Security Shield Banner */}
        <div className="pt-2 flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/60">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            Staff have access to ticket validation only. Payout details, bank accounts, and revenue stats are completely hidden.
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
