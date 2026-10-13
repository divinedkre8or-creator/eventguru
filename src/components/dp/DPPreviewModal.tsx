// src/components/dp/DPPreviewModal.tsx
import { useState, useRef, ChangeEvent } from "react";
import html2canvas from "html2canvas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Loader2, Image as ImageIcon, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { compressImageToBase64 } from "@/lib/imageUtils";

interface DpTemplateData {
  template_image_url: string;
  canvas_width: number;
  canvas_height: number;
  image_x: number;
  image_y: number;
  image_width: number;
  image_height: number;
  image_rounded: boolean;
  name_x: number;
  name_y: number;
  name_color: string;
  name_font_size: number;
  name_text_align: string;
  name_font_family: string;
  name_width: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: DpTemplateData;
  eventTitle?: string;
}

const DEFAULT_SAMPLE_PHOTO =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200' width='200' height='200'><rect width='200' height='200' fill='%234F46E5'/><circle cx='100' cy='75' r='38' fill='%23FFFFFF'/><path d='M35,175 C35,130 65,120 100,120 C135,120 165,130 165,175 Z' fill='%23FFFFFF'/></svg>";

export const DPPreviewModal = ({ open, onOpenChange, template, eventTitle }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [testName, setTestName] = useState("Alex Johnson");
  const [testPhoto, setTestPhoto] = useState<string>(DEFAULT_SAMPLE_PHOTO);
  const [downloading, setDownloading] = useState(false);

  const canvasWidth = template.canvas_width || 500;
  const canvasHeight = template.canvas_height || 500;

  // Compute a responsive scale factor so the preview fits comfortably inside the modal
  const maxDisplayWidth = 420;
  const maxDisplayHeight = 520;
  const scale = Math.min(1, maxDisplayWidth / canvasWidth, maxDisplayHeight / canvasHeight);

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImageToBase64(file);
      setTestPhoto(base64);
    } catch {
      toast.error("Failed to load image");
    }
  };

  const handleTestDownload = async () => {
    if (!containerRef.current) return;
    setDownloading(true);
    try {
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
          // Normalize wrapper transform in cloned tree to capture full unscaled dimensions
          const wrapper = clonedDoc.querySelector("[data-dp-canvas-wrapper]");
          if (wrapper) {
            (wrapper as HTMLElement).style.transform = "none";
            (wrapper as HTMLElement).style.width = `${canvasWidth}px`;
            (wrapper as HTMLElement).style.height = `${canvasHeight}px`;
          }
        },
      });

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `Sample-Flyer-${testName.replace(/\s+/g, "_")}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Sample Flyer downloaded! Check your downloads folder.");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to generate test image.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 font-sans">
        <DialogHeader className="pb-3 border-b border-border">
          <DialogTitle className="font-heading font-black text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Live Attendee Experience Preview
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Test how attendees will experience your flyer. Notice there are <strong>zero watermarks</strong> and <strong>no image cutoffs</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2 items-center">
          {/* Controls */}
          <div className="md:col-span-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Attendee Name</Label>
              <Input
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="e.g. Alex Johnson"
                className="h-10 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Attendee Photo</Label>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => document.getElementById("preview-test-photo")?.click()}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-bold h-9 border-border"
                >
                  <ImageIcon className="w-4 h-4 mr-1.5" /> Upload Test Photo
                </Button>
                <input
                  id="preview-test-photo"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1 font-mono text-[11px] text-muted-foreground">
              <div>Canvas: <strong>{canvasWidth} × {canvasHeight} px</strong></div>
              <div>Aspect Ratio: <strong>{(canvasWidth / canvasHeight).toFixed(2)}:1</strong></div>
              <div className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Zero Watermark</div>
              <div className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Full Ratio Export</div>
            </div>

            <div className="pt-2">
              <Button
                onClick={handleTestDownload}
                disabled={downloading}
                className="w-full bg-primary text-primary-foreground font-bold text-xs h-10 rounded-xl shadow-md gap-1.5"
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Download className="w-4 h-4" /> Download Test PNG
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Canvas Render Preview */}
          <div className="md:col-span-7 flex justify-center bg-muted/20 border border-border rounded-2xl p-4 overflow-hidden">
            <div
              style={{
                width: canvasWidth * scale,
                height: canvasHeight * scale,
                position: "relative",
              }}
              className="shrink-0 rounded-lg shadow-lg overflow-hidden border border-border/80"
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
                  }}
                >
                  {/* Photo Placeholder */}
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
                    <img
                      src={testPhoto}
                      crossOrigin="anonymous"
                      alt="User"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Name Placement */}
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
                      fontWeight: "bold",
                    }}
                  >
                    {testName}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
