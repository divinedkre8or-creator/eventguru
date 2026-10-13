// src/components/dp/DPStudioGuide.tsx
import { useState } from "react";
import {
  Lightbulb,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  HelpCircle,
  Share2,
  Maximize2,
  Palette,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onLoadSample: (type: "square" | "story" | "portrait") => void;
  onOpenPreview?: () => void;
  hasTemplate: boolean;
}

export const DPStudioGuide = ({ onLoadSample, onOpenPreview, hasTemplate }: Props) => {
  const [expanded, setExpanded] = useState(!hasTemplate);
  const [showTips, setShowTips] = useState(false);

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden mb-6 transition-all">
      {/* Guide Header Banner */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/30 border-b border-border/60">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5 sm:mt-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-black text-sm uppercase tracking-wider text-foreground">
                How It Works: "I Will Be Attending" Flyer Studio
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                1-Click Viral Reach
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload your event flyer once. Attendees personalize it with their photo and name to post on WhatsApp Status &amp; Instagram.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasTemplate && onOpenPreview && (
            <Button
              onClick={onOpenPreview}
              variant="outline"
              size="sm"
              className="text-xs font-bold h-8 border-border gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-primary" /> Test Preview
            </Button>
          )}

          <Button
            onClick={() => setExpanded(!expanded)}
            variant="ghost"
            size="sm"
            className="text-xs font-bold h-8 text-muted-foreground hover:text-foreground gap-1"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" /> Collapse Guide
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" /> Show Guide
              </>
            )}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 sm:p-6 space-y-6">
          {/* 3 Step Interactive Workflow */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1 */}
            <div className="p-4 rounded-xl bg-card border border-border/80 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px]">
                    1
                  </span>
                  <span>Upload Any Flyer Format</span>
                </div>
                <h4 className="font-bold text-xs text-foreground mt-2">
                  No Image Cropping or 1:1 Restriction
                </h4>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  Upload your flyer in <strong>any aspect ratio</strong>: Instagram Square (1:1), WhatsApp/Instagram Story (9:16), or Feed Portrait (4:5). The tool automatically matches your exact dimensions without cutting off edges!
                </p>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground bg-muted/40 p-2 rounded border border-border/40">
                💡 Leave a blank circular or square spot in your design for the attendee's picture.
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-xl bg-card border border-border/80 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px]">
                    2
                  </span>
                  <span>Position Photo &amp; Name</span>
                </div>
                <h4 className="font-bold text-xs text-foreground mt-2">
                  Drag, Resize &amp; Style Visually
                </h4>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  Click and drag the <strong>Attendee Photo</strong> box over your flyer's photo spot. Toggle between circular or square cutout, and style the <strong>Attendee Name</strong> typography and color to match your branding.
                </p>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground bg-muted/40 p-2 rounded border border-border/40">
                🎯 The attendee's photo will be placed directly into this bounding box.
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-xl bg-card border border-border/80 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px]">
                    3
                  </span>
                  <span>Save &amp; Share Public Link</span>
                </div>
                <h4 className="font-bold text-xs text-foreground mt-2">
                  Zero Watermark On Clean Exports
                </h4>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  Save your template. Attendees can generate their flyer immediately after purchasing a ticket, or via your custom public link. Clean, high-resolution PNG export with <strong>no watermark</strong>!
                </p>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground bg-muted/40 p-2 rounded border border-border/40">
                🚀 WhatsApp status posts from attendees drive up to 40% of extra ticket sales.
              </div>
            </div>
          </div>

          {/* Quick Tips Toggle & Sample Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-border/60">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowTips(!showTips)}
                variant="ghost"
                size="sm"
                className="text-xs font-bold text-primary hover:bg-primary/10 gap-1.5"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                {showTips ? "Hide Pro Tips" : "View Creator Pro Tips (Canva Tricks, WhatsApp Reach)"}
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-muted-foreground font-mono">Test Sample:</span>
              <Button
                onClick={() => onLoadSample("square")}
                variant="outline"
                size="sm"
                className="text-xs font-bold h-8 border-border hover:bg-muted gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Load Sample Flyer (1:1)
              </Button>
              <Button
                onClick={() => onLoadSample("story")}
                variant="outline"
                size="sm"
                className="text-xs font-bold h-8 border-border hover:bg-muted"
              >
                Story Sample (9:16)
              </Button>
            </div>
          </div>

          {/* Expandable Pro Tips Card */}
          {showTips && (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3 text-xs">
              <div className="font-heading font-black text-xs uppercase tracking-wide text-primary flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4" />
                Organizer Playbook: How To Maximize Attendance With DP Flyers
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-muted-foreground">
                <div className="space-y-1">
                  <div className="font-bold text-foreground">1. Design For Circular/Square Cutouts</div>
                  <p className="text-[11px] leading-relaxed">
                    When designing your flyer on Canva, Photoshop, or CorelDraw, add a placeholder circle with a prompt like <em>"Your Photo Here"</em>. Keep the background behind that circle solid or clean.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-foreground">2. Prompt Buyers at Checkout</div>
                  <p className="text-[11px] leading-relaxed">
                    EventRally automatically prompts ticket buyers right after successful payment with: <em>"Get your official 'I Will Be Attending' flyer"</em> so excitement is at its peak.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-foreground">3. High-Contrast Attendee Names</div>
                  <p className="text-[11px] leading-relaxed">
                    If your flyer has a dark background, choose white or light gold (#FFFFFF, #FACC15) for the name. If light, pick solid black (#000000) or navy blue.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-foreground">4. No Watermarks, Full Creator Freedom</div>
                  <p className="text-[11px] leading-relaxed">
                    Exported flyers are 100% clean and unbranded with no platform watermarks, so your event branding remains the star of the show.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
