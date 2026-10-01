import { useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Check, Share2, Facebook, Twitter, Linkedin, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ShareEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventUrl: string;
  eventTitle: string;
  eventId?: string;
}

export function ShareEventModal({ isOpen, onClose, eventUrl, eventTitle, eventId }: ShareEventModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: eventTitle,
          text: `Check out ${eventTitle}!`,
          url: eventUrl,
        });
      } catch (err) {
        console.error("Error sharing", err);
      }
    }
  };

  const encodedUrl = encodeURIComponent(eventUrl);
  const encodedTitle = encodeURIComponent(`Join me at ${eventTitle}!`);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading font-700 text-xl text-center">Event Published!</DialogTitle>
          <DialogDescription className="font-body text-center text-muted-foreground">
            Your event is now live. Share the link below to start getting attendees.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center space-x-2 mt-4">
          <Input 
            readOnly 
            value={eventUrl} 
            className="flex-1 bg-background border-border font-body text-sm text-foreground"
          />
          <Button onClick={handleCopy} variant="secondary" size="icon" className="shrink-0 shadow-xs">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        <div className="flex flex-col space-y-3 mt-6">
          <p className="text-xs font-heading font-700 text-muted-foreground uppercase text-center tracking-wider">
            Share via
          </p>
          <div className="flex justify-center gap-3">
            {navigator.share && (
              <Button onClick={shareNative} variant="outline" size="icon" className="rounded-full w-10 h-10 border-border text-foreground hover:bg-muted">
                <Share2 className="w-4 h-4" />
              </Button>
            )}
            <Button asChild variant="outline" size="icon" className="rounded-full w-10 h-10 border-border text-[#1DA1F2] hover:bg-[#1DA1F2]/10">
              <a href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`} target="_blank" rel="noreferrer">
                <Twitter className="w-4 h-4 fill-current" />
              </a>
            </Button>
            <Button asChild variant="outline" size="icon" className="rounded-full w-10 h-10 border-border text-[#4267B2] hover:bg-[#4267B2]/10">
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank" rel="noreferrer">
                <Facebook className="w-4 h-4 fill-current" />
              </a>
            </Button>
            <Button asChild variant="outline" size="icon" className="rounded-full w-10 h-10 border-border text-[#0077b5] hover:bg-[#0077b5]/10">
              <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`} target="_blank" rel="noreferrer">
                <Linkedin className="w-4 h-4 fill-current" />
              </a>
            </Button>
          </div>
        </div>

        {/* Recommended Next Step for Event Day */}
        <div className="mt-5 pt-4 border-t border-border space-y-2">
          <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider text-center">
            Recommended Next Step
          </p>
          <div className="bg-muted/40 border border-border rounded-xl p-3 flex items-center justify-between gap-3 text-left">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Direct Attendee Broadcast</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                Send gate passes, venue directions, or reminders directly to confirmed phones.
              </p>
            </div>
            <Button asChild size="sm" variant="outline" className="text-xs font-bold shrink-0 border-border h-8 px-3">
              <Link to={eventId ? `/dashboard/campaigns?event_id=${eventId}&channel=sms` : "/dashboard/campaigns?channel=sms"}>
                Broadcast
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-border sm:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="w-full text-xs font-bold"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
