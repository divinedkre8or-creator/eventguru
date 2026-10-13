import { useState, ChangeEvent, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import html2canvas from "html2canvas";
import { Download, Image as ImageIcon, Loader2, ArrowLeft, Share2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KenteStripe } from "@/components/KenteStripe";
import { toast } from "sonner";
import { compressImageToBase64 } from "@/lib/imageUtils";
import { slugify } from "@/lib/slugUtils";
import { SEOHead } from "@/components/seo/SEOHead";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useAuth } from "@/contexts/AuthContext";

const DPAttendeeView = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [attendeeName, setAttendeeName] = useState("");
  const [attendeePhoto, setAttendeePhoto] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const { data: template, isLoading, error } = useQuery({
    queryKey: ["public-dp-template", id],
    queryFn: async () => {
      let targetEventId = id;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || "");

      if (!isUUID && id) {
        // Resolve slug to event ID
        const { data: events } = await supabase.from("events").select("id, title");
        const found = (events || []).find((e) => slugify(e.title) === id);
        if (found) {
          targetEventId = found.id;
        }
      }

      const { data, error } = await (supabase as any)
        .from("dp_templates")
        .select("*, events(title)")
        .eq("event_id", targetEventId)
        .maybeSingle();

      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    try {
      const base64 = await compressImageToBase64(file);
      setAttendeePhoto(base64);
      toast.success("Photo loaded!");
    } catch (err) {
      toast.error("Failed to process your image.");
    }
  };

  const handleGenerate = async () => {
    if (!attendeePhoto) {
      toast.error("Please upload your photo first!");
      return;
    }
    if (!attendeeName.trim()) {
      toast.error("Please enter your name!");
      return;
    }
    if (!containerRef.current) return;

    setGenerating(true);
    try {
      // Small delay to ensure images are fully rendered
      await new Promise((r) => setTimeout(r, 200));

      const canvas = await html2canvas(containerRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2, // High resolution crisp export
        width: canvasWidth,
        height: canvasHeight,
        windowWidth: Math.max(document.documentElement.clientWidth, canvasWidth),
        windowHeight: Math.max(document.documentElement.clientHeight, canvasHeight),
        backgroundColor: null,
        onclone: (clonedDoc) => {
          // Normalize any scaled ancestor wrappers in the cloned tree so html2canvas renders full dimensions
          const wrapper = clonedDoc.querySelector("[data-dp-canvas-wrapper]");
          if (wrapper) {
            (wrapper as HTMLElement).style.transform = "none";
            (wrapper as HTMLElement).style.width = `${canvasWidth}px`;
            (wrapper as HTMLElement).style.height = `${canvasHeight}px`;
          }
        },
      });

      const dataUrl = canvas.toDataURL("image/png");
      const eventName = (template?.events as any)?.title || "Event";
      const cleanEventName = eventName.replace(/[^a-zA-Z0-9]/g, "_");
      const cleanAttendeeName = attendeeName.trim().replace(/\s+/g, "_");

      const link = document.createElement("a");
      link.download = `${cleanEventName}_I_Will_Be_Attending_${cleanAttendeeName}.png`;
      link.href = dataUrl;
      link.click();

      toast.success("Flyer downloaded! Post it on WhatsApp Status & Instagram Stories!");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to generate flyer. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !template || !template.template_image_url) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4 p-4 text-center">
        <ImageIcon className="w-16 h-16 text-muted-foreground/30" />
        <h1 className="font-heading text-2xl font-bold text-foreground">No DP Template Found</h1>
        <p className="text-muted-foreground text-sm font-[DM_Sans]">
          The organizer has not set up a Display Picture generator for this event yet.
        </p>
        <Link to={`/events/${id}`}>
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Event
          </Button>
        </Link>
      </div>
    );
  }

  const canvasWidth = Number(template.canvas_width) || 500;
  const canvasHeight = Number(template.canvas_height) || 500;

  // Responsive scale factor for the preview card
  const maxDisplayWidth = 460;
  const maxDisplayHeight = 560;
  const scale = Math.min(1, maxDisplayWidth / canvasWidth, maxDisplayHeight / canvasHeight);

  return (
    <div className="min-h-screen bg-background font-[DM_Sans] transition-colors duration-300">
      <SEOHead
        title={
          (template?.events as any)?.title
            ? `"I Will Be Attending" Flyer — ${(template.events as any).title}`
            : "Official Event Flyer Generator"
        }
        description={`Generate your personalized 'I Will Be Attending' social flyer for ${
          (template?.events as any)?.title || "this event"
        } on EventRally.`}
        ogImage={template?.template_image_url || "/ER full logo.png"}
      />
      <KenteStripe />

      {/* Top Header */}
      <header className="border-b border-border bg-card/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            to={user ? "/dashboard" : "/"}
            className="flex items-center gap-1 hover:opacity-90 transition-opacity"
            aria-label={user ? "EventRally Dashboard" : "EventRally Home"}
          >
            <BrandLogo />
          </Link>
          <Link to={`/events/${id}`}>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> View Event Details
            </Button>
          </Link>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8 pb-20">
        <div className="flex flex-col md:flex-row items-center gap-8 justify-center">
          {/* Controls Panel */}
          <div className="w-full md:w-[350px] space-y-6 bg-card p-6 md:p-8 rounded-2xl border border-border shadow-md shrink-0 order-2 md:order-1">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded inline-block mb-1.5">
                OFFICIAL EVENT FLYER
              </span>
              <h1 className="font-heading text-2xl font-black text-foreground leading-tight">
                "I Will Be Attending"
              </h1>
              <p className="text-muted-foreground text-xs mt-1 line-clamp-2">
                {(template.events as any)?.title}
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <div className="space-y-2">
                <Label className="font-bold text-foreground text-xs uppercase font-mono">
                  1. Upload Your Photo
                </Label>
                {!attendeePhoto ? (
                  <Button
                    onClick={() => document.getElementById("photo-upload")?.click()}
                    variant="outline"
                    className="w-full h-24 border-dashed border-2 bg-muted/20 hover:bg-muted/40 text-muted-foreground hover:text-foreground rounded-xl"
                  >
                    <div className="flex flex-col items-center">
                      <ImageIcon className="w-6 h-6 mb-2 text-primary" />
                      <span className="text-xs font-bold">Choose a clear photo of yourself</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG or WEBP</span>
                    </div>
                  </Button>
                ) : (
                  <Button
                    onClick={() => document.getElementById("photo-upload")?.click()}
                    variant="outline"
                    className="w-full border-border hover:bg-muted font-bold text-xs h-10 rounded-xl"
                  >
                    Change Selected Photo
                  </Button>
                )}
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-foreground text-xs uppercase font-mono">
                  2. Your Full Name
                </Label>
                <Input
                  placeholder="e.g. Divine Adeyemi"
                  value={attendeeName}
                  onChange={(e) => setAttendeeName(e.target.value)}
                  maxLength={30}
                  className="h-11 bg-background border-border text-xs font-bold"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={handleGenerate}
                disabled={generating || !attendeePhoto || !attendeeName.trim()}
                className="w-full bg-primary text-primary-foreground h-12 rounded-xl shadow-lg hover:brightness-110 font-heading font-extrabold text-sm gap-2"
              >
                {generating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Download className="w-5 h-5" /> Download Full-Quality Flyer
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 text-center pt-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Zero Watermarks • Full Aspect Ratio Export</span>
              </div>

              <p className="text-[10px] text-muted-foreground text-center leading-relaxed pt-2 px-1">
                By generating this flyer, you confirm you own the rights to the uploaded photo and agree to our{" "}
                <Link
                  to="/acceptable-use"
                  target="_blank"
                  className="text-secondary font-semibold hover:underline"
                >
                  Acceptable Use Policy
                </Link>
                .
              </p>
            </div>

            <div className="text-center pt-1 border-t border-border/50">
              <Link
                to={`/events/${id}`}
                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center justify-center"
              >
                <ArrowLeft className="w-3 h-3 mr-1" /> Return to Event Page
              </Link>
            </div>
          </div>

          {/* Canvas Preview Area */}
          <div className="w-full flex flex-col items-center justify-center order-1 md:order-2 overflow-hidden px-4 md:px-0 bg-muted/20 border border-border shadow-inner rounded-3xl py-6 relative">
            <div className="text-center w-full text-xs font-mono font-bold text-muted-foreground/60 tracking-wider mb-2">
              LIVE FLYER PREVIEW
            </div>

            {/* Responsive scale wrapper */}
            <div
              style={{
                width: canvasWidth * scale,
                height: canvasHeight * scale,
                position: "relative",
              }}
              className="rounded-xl shadow-2xl overflow-hidden border border-border/80 shrink-0"
            >
              <div
                data-dp-canvas-wrapper
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  width: canvasWidth,
                  height: canvasHeight,
                }}
              >
                <div
                  ref={containerRef}
                  className="relative overflow-hidden bg-white shrink-0"
                  style={{
                    width: canvasWidth,
                    height: canvasHeight,
                    backgroundImage: `url(${template.template_image_url})`,
                    backgroundSize: "100% 100%",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                >
                  {/* Placed Uploaded Photo */}
                  <div
                    className="absolute overflow-hidden"
                    style={{
                      left: template.image_x,
                      top: template.image_y,
                      width: template.image_width,
                      height: template.image_height,
                      borderRadius: template.image_rounded ? "50%" : "0",
                    }}
                  >
                    {attendeePhoto ? (
                      <img
                        src={attendeePhoto}
                        crossOrigin="anonymous"
                        alt="User"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-black/10 backdrop-blur-sm flex items-center justify-center border-2 border-dashed border-black/20">
                        <ImageIcon className="w-8 h-8 text-black/30" />
                      </div>
                    )}
                  </div>

                  {/* Placed Name */}
                  <div
                    className="absolute leading-tight whitespace-nowrap"
                    style={{
                      left: template.name_x,
                      top: template.name_y,
                      width: template.name_width || 300,
                      color: template.name_color,
                      fontSize: template.name_font_size,
                      fontFamily: template.name_font_family || "sans-serif",
                      textAlign: (template.name_text_align || "center") as any,
                      fontWeight: template.name_font_weight || "bold",
                    }}
                  >
                    {attendeeName || "Your Name"}
                  </div>
                  {/* ZERO WATERMARK! Fully unbranded & clean as requested */}
                </div>
              </div>
            </div>

            <div className="mt-3 text-[11px] font-mono text-muted-foreground">
              Exact flyer aspect ratio ({canvasWidth} × {canvasHeight} px) • Ready for WhatsApp &amp; Instagram
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DPAttendeeView;
