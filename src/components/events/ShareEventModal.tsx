import { useState } from "react";
import { Copy, Check, Share2, Facebook, Twitter, Linkedin } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ShareEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventUrl: string;
  eventTitle: string;
}

export function ShareEventModal({ isOpen, onClose, eventUrl, eventTitle }: ShareEventModalProps) {
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
      </DialogContent>
    </Dialog>
  );
}
