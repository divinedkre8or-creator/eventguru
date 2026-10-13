import { useState, ChangeEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Rnd } from "react-rnd";
import {
  ImagePlus,
  Save,
  Loader2,
  LayoutTemplate,
  Copy,
  ExternalLink,
  Eye,
  Maximize2,
  Sparkles,
  HelpCircle,
  RotateCcw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { uploadImage } from "@/lib/storageUtils";
import { DPStudioGuide } from "@/components/dp/DPStudioGuide";
import { DPPreviewModal } from "@/components/dp/DPPreviewModal";

interface DpTemplate {
  id?: string;
  event_id: string;
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

const defaultTemplate: DpTemplate = {
  event_id: "",
  template_image_url: "",
  canvas_width: 500,
  canvas_height: 500,
  image_x: 160,
  image_y: 110,
  image_width: 180,
  image_height: 180,
  image_rounded: true,
  name_x: 100,
  name_y: 310,
  name_color: "#FFFFFF",
  name_font_size: 26,
  name_text_align: "center",
  name_font_family: "Inter, sans-serif",
  name_width: 300,
};

const SAMPLE_FLYERS = {
  square: {
    url: "/sample-eventrally-flyer.png",
    width: 500,
    height: 500,
    photoX: 286,
    photoY: 119,
    photoSize: 144,
    nameX: 275,
    nameY: 338,
    nameWidth: 170,
    nameColor: "#FFFFFF",
    rounded: true,
  },
  story: {
    url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1080&auto=format&fit=crop&q=80",
    width: 420,
    height: 746, // 9:16 ratio
    photoX: 120,
    photoY: 210,
    photoSize: 180,
    nameX: 60,
    nameY: 410,
    nameWidth: 300,
    nameColor: "#FFFFFF",
    rounded: true,
  },
  portrait: {
    url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1080&auto=format&fit=crop&q=80",
    width: 480,
    height: 600, // 4:5 ratio
    photoX: 150,
    photoY: 140,
    photoSize: 180,
    nameX: 90,
    nameY: 340,
    nameWidth: 300,
    nameColor: "#FFFFFF",
    rounded: true,
  },
};

const DPGenerator = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [template, setTemplate] = useState<DpTemplate>(defaultTemplate);
  const [isEditing, setIsEditing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // 1. Fetch Organizer Events
  const { data: events = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ["organiser-events-dp-v2", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title")
        .eq("organiser_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data && data.length > 0 && !selectedEventId) {
        setSelectedEventId(data[0].id);
      }
      return data || [];
    },
    enabled: !!user?.id,
  });

  // 2. Fetch DP Template for selected event
  const { isLoading: isLoadingTemplate } = useQuery({
    queryKey: ["dp-template-v2", selectedEventId],
    queryFn: async () => {
      if (!selectedEventId) return null;
      const { data, error } = await (supabase as any)
        .from("dp_templates")
        .select("*")
        .eq("event_id", selectedEventId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setTemplate({
          ...defaultTemplate,
          ...(data as DpTemplate),
          canvas_width: Number(data.canvas_width) || 500,
          canvas_height: Number(data.canvas_height) || 500,
        });
        setIsEditing(true);
      } else {
        setTemplate({ ...defaultTemplate, event_id: selectedEventId });
        setIsEditing(false);
      }
      return data;
    },
    enabled: !!selectedEventId,
  });

  // 3. Save Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: DpTemplate) => {
      const cleanPayload = {
        event_id: selectedEventId,
        template_image_url: payload.template_image_url,
        canvas_width: Math.round(payload.canvas_width || 500),
        canvas_height: Math.round(payload.canvas_height || 500),
        image_x: Math.round(payload.image_x),
        image_y: Math.round(payload.image_y),
        image_width: Math.round(payload.image_width),
        image_height: Math.round(payload.image_height),
        image_rounded: Boolean(payload.image_rounded),
        name_x: Math.round(payload.name_x),
        name_y: Math.round(payload.name_y),
        name_color: payload.name_color || "#FFFFFF",
        name_font_size: Number(payload.name_font_size) || 26,
        name_text_align: payload.name_text_align || "center",
        name_font_family: payload.name_font_family || "Inter, sans-serif",
        name_width: Math.round(payload.name_width || 300),
      };

      if (payload.id) {
        const { error } = await (supabase as any)
          .from("dp_templates")
          .update(cleanPayload)
          .eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("dp_templates")
          .insert(cleanPayload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Flyer Template saved! Attendees can now generate clean DP flyers.");
      queryClient.invalidateQueries({ queryKey: ["dp-template-v2", selectedEventId] });
      setIsEditing(true);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save template.");
    },
  });

  // Handle Image Upload with Dynamic Aspect Ratio Detection
  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setUploadingImage(true);
    try {
      // 1. Read natural dimensions of flyer
      const objectUrl = URL.createObjectURL(file);
      const img = new window.Image();

      img.onload = async () => {
        const naturalWidth = img.naturalWidth || 1080;
        const naturalHeight = img.naturalHeight || 1080;
        URL.revokeObjectURL(objectUrl);

        const ratio = naturalHeight / naturalWidth;

        // Base width for the studio editing canvas
        let baseWidth = 500;
        let baseHeight = Math.round(500 * ratio);

        // Responsive boundary handling for tall Story (9:16) or wide (16:9) flyers
        if (ratio > 1.4) {
          baseWidth = 420;
          baseHeight = Math.round(420 * ratio);
        } else if (ratio < 0.75) {
          baseWidth = 560;
          baseHeight = Math.round(560 * ratio);
        }

        // Auto-center photo and name placeholders inside the new dimensions
        const photoSize = Math.round(Math.min(baseWidth, baseHeight) * 0.36);
        const photoX = Math.round((baseWidth - photoSize) / 2);
        const photoY = Math.round(baseHeight * 0.28);

        const nameWidth = Math.min(320, Math.round(baseWidth * 0.8));
        const nameX = Math.round((baseWidth - nameWidth) / 2);
        const nameY = Math.round(photoY + photoSize + 24);

        try {
          const url = await uploadImage(file, "dp-templates", "frames");
          setTemplate((prev) => ({
            ...prev,
            template_image_url: url,
            canvas_width: baseWidth,
            canvas_height: baseHeight,
            image_x: photoX,
            image_y: photoY,
            image_width: photoSize,
            image_height: photoSize,
            name_x: nameX,
            name_y: nameY,
            name_width: nameWidth,
          }));

          const formatName =
            ratio > 1.5 ? "9:16 Story" : ratio > 1.15 ? "4:5 Portrait" : ratio < 0.8 ? "Landscape" : "1:1 Square";

          toast.success(`Flyer loaded! Aspect ratio detected: ${formatName} (${naturalWidth}×${naturalHeight}px)`);
        } catch (uploadErr) {
          toast.error("Failed to upload image.");
        } finally {
          setUploadingImage(false);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        setUploadingImage(false);
        toast.error("Could not read image file.");
      };

      img.src = objectUrl;
    } catch (err) {
      setUploadingImage(false);
      toast.error("Failed to process image");
    }
  };

  // Load sample template for instant testing
  const handleLoadSample = (type: "square" | "story" | "portrait") => {
    const s = SAMPLE_FLYERS[type];
    setTemplate({
      ...template,
      template_image_url: s.url,
      canvas_width: s.width,
      canvas_height: s.height,
      image_x: s.photoX,
      image_y: s.photoY,
      image_width: s.photoSize,
      image_height: s.photoSize,
      image_rounded: s.rounded ?? true,
      name_x: s.nameX,
      name_y: s.nameY,
      name_width: s.nameWidth,
      name_color: s.nameColor,
    });
    toast.success(`Loaded sample ${type.toUpperCase()} template! Drag elements to test.`);
  };

  const copyPublicLink = () => {
    const link = `${window.location.origin}/events/${selectedEventId}/dp`;
    navigator.clipboard.writeText(link);
    toast.success("Public DP Generator link copied! Share this with attendees.");
  };

  const currentRatioLabel = () => {
    if (!template.canvas_width || !template.canvas_height) return "1:1 Square";
    const ratio = template.canvas_height / template.canvas_width;
    if (ratio > 1.5) return "9:16 WhatsApp / Instagram Story";
    if (ratio > 1.15) return "4:5 Portrait Feed";
    if (ratio < 0.8) return "16:9 Landscape";
    return "1:1 Instagram Square";
  };

  if (isLoadingEvents) {
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="animate-spin w-7 h-7 text-primary" />
      </div>
    );
  }

  const selectedEventTitle = events.find((e) => e.id === selectedEventId)?.title || "Event";

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded inline-block mb-2 font-bold">
            VIRAL ATTENDEE PROMOTION
          </div>
          <h1 className="font-heading text-3xl font-black text-foreground tracking-tight">
            "I Will Be Attending" Flyer Studio
          </h1>
          <p className="text-muted-foreground text-xs font-medium mt-1">
            Turn every registered ticket buyer into an active promoter. Attendees merge their photo &amp; name into your flyer without watermarks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {template.template_image_url && (
            <Button
              onClick={() => setPreviewOpen(true)}
              variant="outline"
              className="border-border text-foreground hover:bg-muted font-bold text-xs h-10 px-4 rounded-xl flex items-center gap-2"
            >
              <Eye className="w-4 h-4 text-primary" /> Test As Attendee
            </Button>
          )}

          {isEditing && (
            <Button
              onClick={copyPublicLink}
              variant="outline"
              className="border-border text-foreground hover:bg-muted font-bold text-xs h-10 px-4 rounded-xl hidden sm:flex items-center gap-2"
            >
              <Copy className="w-4 h-4" /> Copy Public Link
            </Button>
          )}
        </div>
      </div>

      {/* Target Event Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-card border border-border rounded-2xl">
        <div className="space-y-1">
          <label className="text-[11px] font-mono font-bold uppercase text-muted-foreground">
            SELECT EVENT TO CONFIGURE
          </label>
          <div className="text-xs text-muted-foreground">
            Choose which event this branded promotional flyer belongs to.
          </div>
        </div>

        <select
          className="w-full sm:w-80 h-10 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-bold focus:outline-none focus:border-primary"
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
        >
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
      </div>

      {/* In-Feature Quick Guide & Interactive Walkthrough */}
      <DPStudioGuide
        hasTemplate={Boolean(template.template_image_url)}
        onLoadSample={handleLoadSample}
        onOpenPreview={() => setPreviewOpen(true)}
      />

      {isLoadingTemplate ? (
        <div className="p-16 flex justify-center text-xs font-mono text-muted-foreground">
          <Loader2 className="animate-spin w-6 h-6 text-primary mr-2" /> Loading DP template...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full min-w-0">
          {/* Canvas Wrapper */}
          <div className="lg:col-span-8 flex flex-col items-center border border-border bg-card p-4 sm:p-6 rounded-2xl shadow-sm overflow-hidden w-full min-w-0">
            {!template.template_image_url ? (
              <div className="w-full max-w-[500px] aspect-square border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center bg-muted/20 text-muted-foreground p-8 text-center">
                <div className="p-4 rounded-full bg-primary/10 text-primary mb-3">
                  <LayoutTemplate className="w-8 h-8" />
                </div>
                <h3 className="font-heading font-black text-foreground text-base">
                  No Event Flyer Uploaded Yet
                </h3>
                <p className="text-xs mt-1 mb-4 text-muted-foreground max-w-sm">
                  Upload your event flyer in <strong>any format</strong> (Square 1:1, Story 9:16, or Portrait 4:5). We preserve your flyer's full aspect ratio with zero image cropping!
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    onClick={() => document.getElementById("template-upload")?.click()}
                    disabled={uploadingImage}
                    className="font-bold text-xs h-10 px-5 rounded-xl bg-primary text-primary-foreground gap-2"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ImagePlus className="w-4 h-4" />
                    )}
                    Upload Your Flyer
                  </Button>

                  <Button
                    onClick={() => handleLoadSample("square")}
                    variant="outline"
                    className="font-bold text-xs h-10 px-4 rounded-xl border-border hover:bg-muted"
                  >
                    Try Sample Flyer (1:1)
                  </Button>
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center">
                {/* Aspect Ratio Badge & Reset */}
                <div className="w-full flex items-center justify-between pb-3 text-xs border-b border-border/60 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      📐 {currentRatioLabel()}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      ({template.canvas_width} × {template.canvas_height} px)
                    </span>
                  </div>

                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    ✓ Clean Export (No Watermark)
                  </div>
                </div>

                {/* Scaled/Scrollable Canvas Container */}
                <div className="w-full overflow-x-auto py-2 flex justify-center max-w-full">
                  <div
                    className="relative border border-border shadow-xl rounded-lg overflow-hidden shrink-0"
                    style={{
                      width: template.canvas_width,
                      height: template.canvas_height,
                      backgroundImage: `url(${template.template_image_url})`,
                      backgroundSize: "100% 100%",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                    }}
                  >
                    {/* Draggable Attendee Photo Box */}
                    <Rnd
                      size={{ width: template.image_width, height: template.image_height }}
                      position={{ x: template.image_x, y: template.image_y }}
                      onDragStop={(e, d) => setTemplate({ ...template, image_x: d.x, image_y: d.y })}
                      onResizeStop={(e, direction, ref, delta, position) => {
                        setTemplate({
                          ...template,
                          image_width: parseInt(ref.style.width),
                          image_height: parseInt(ref.style.height),
                          image_x: position.x,
                          image_y: position.y,
                        });
                      }}
                      bounds="parent"
                      className={`border-2 border-primary border-dashed bg-primary/25 backdrop-blur-[1px] cursor-move flex items-center justify-center transition-shadow shadow-md ${
                        template.image_rounded ? "rounded-full" : "rounded-md"
                      }`}
                    >
                      <span className="text-primary font-mono font-black rotate-[-12deg] opacity-90 cursor-move pointer-events-none select-none text-center leading-tight text-xs bg-white/80 dark:bg-black/80 px-2 py-1 rounded">
                        ATTENDEE PHOTO
                      </span>
                    </Rnd>

                    {/* Draggable Attendee Name Box */}
                    <Rnd
                      size={{ width: template.name_width, height: template.name_font_size + 14 }}
                      position={{ x: template.name_x, y: template.name_y }}
                      onDragStop={(e, d) => setTemplate({ ...template, name_x: d.x, name_y: d.y })}
                      onResizeStop={(e, direction, ref, delta, position) => {
                        setTemplate({
                          ...template,
                          name_width: parseInt(ref.style.width),
                          name_x: position.x,
                          name_y: position.y,
                        });
                      }}
                      bounds="parent"
                      enableResizing={{
                        top: false,
                        right: true,
                        bottom: false,
                        left: true,
                        topRight: false,
                        bottomRight: false,
                        bottomLeft: false,
                        topLeft: false,
                      }}
                      className="border border-chart-blue border-dashed bg-chart-blue/15 cursor-move flex items-center px-1"
                    >
                      <div
                        style={{
                          color: template.name_color,
                          fontSize: template.name_font_size,
                          fontFamily: template.name_font_family,
                          textAlign: template.name_text_align as any,
                          width: "100%",
                        }}
                        className="font-bold select-none whitespace-nowrap cursor-move pointer-events-none"
                      >
                        Attendee Name
                      </div>
                    </Rnd>
                  </div>
                </div>

                <div className="text-[11px] text-muted-foreground mt-3 flex items-center gap-2">
                  <span>💡 Drag elements to position them. Resize by dragging edges.</span>
                </div>
              </div>
            )}

            <input
              type="file"
              id="template-upload"
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
            />
          </div>

          {/* Configuration Panel */}
          <div className="lg:col-span-4 space-y-6 bg-card p-5 rounded-2xl border border-border shadow-sm">
            <div className="space-y-4">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground border-b border-border pb-2 flex items-center justify-between">
                <span>PROPERTIES &amp; STYLING</span>
                <span className="text-[10px] text-muted-foreground font-normal">Visual Controls</span>
              </h3>

              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploadingImage}
                  className="w-full h-10 text-xs font-bold border-border bg-muted/40 hover:bg-muted"
                  onClick={() => document.getElementById("template-upload")?.click()}
                >
                  {uploadingImage ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ImagePlus className="w-4 h-4 mr-2" />
                  )}
                  {template.template_image_url ? "Replace Flyer Graphic" : "Upload Event Flyer"}
                </Button>
              </div>

              {/* Photo Mask */}
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-mono font-bold text-muted-foreground uppercase">
                  Photo Cutout Shape
                </Label>
                <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border">
                  <span className="text-xs font-bold text-foreground">
                    {template.image_rounded ? "Circular Avatar" : "Square / Rectangle"}
                  </span>
                  <Switch
                    checked={template.image_rounded}
                    onCheckedChange={(c) => setTemplate({ ...template, image_rounded: c })}
                  />
                </div>
              </div>

              {/* Typography Controls */}
              <div className="space-y-3 pt-2">
                <Label className="text-xs font-mono font-bold text-muted-foreground uppercase">
                  Attendee Name Typography
                </Label>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Font Family</Label>
                  <select
                    className="w-full h-9 px-3 rounded-lg border border-border bg-card text-xs font-medium focus:outline-none focus:border-primary"
                    value={template.name_font_family}
                    onChange={(e) => setTemplate({ ...template, name_font_family: e.target.value })}
                  >
                    <option value="Inter, sans-serif">Inter (Modern &amp; Clean)</option>
                    <option value="sans-serif">System Sans-Serif</option>
                    <option value="serif">Classic Serif</option>
                    <option value="JetBrains Mono, monospace">Monospace Tech</option>
                    <option value="Impact, sans-serif">Impact Bold</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Text Alignment</Label>
                  <select
                    className="w-full h-9 px-3 rounded-lg border border-border bg-card text-xs font-medium focus:outline-none focus:border-primary"
                    value={template.name_text_align}
                    onChange={(e) => setTemplate({ ...template, name_text_align: e.target.value })}
                  >
                    <option value="center">Center Aligned</option>
                    <option value="left">Left Aligned</option>
                    <option value="right">Right Aligned</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Font Size (px)</Label>
                    <Input
                      type="number"
                      min="14"
                      max="80"
                      value={template.name_font_size}
                      onChange={(e) =>
                        setTemplate({ ...template, name_font_size: Number(e.target.value) })
                      }
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Text Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        className="w-10 h-9 p-1 cursor-pointer"
                        value={template.name_color}
                        onChange={(e) => setTemplate({ ...template, name_color: e.target.value })}
                      />
                      <Input
                        className="flex-1 font-mono uppercase text-xs h-9 px-2"
                        value={template.name_color}
                        onChange={(e) => setTemplate({ ...template, name_color: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border space-y-2.5">
              <Button
                onClick={() => saveMutation.mutate(template)}
                disabled={saveMutation.isPending || !template.template_image_url}
                className="w-full bg-primary text-primary-foreground font-bold text-xs h-10 rounded-xl hover:opacity-90 shadow-sm"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" /> Save DP Template
                  </>
                )}
              </Button>

              {template.template_image_url && (
                <Button
                  onClick={() => setPreviewOpen(true)}
                  variant="outline"
                  className="w-full text-xs font-bold h-9 border-border text-foreground hover:bg-muted"
                >
                  <Eye className="w-3.5 h-3.5 mr-2 text-primary" /> Test Live Preview &amp; Download
                </Button>
              )}

              {isEditing && (
                <Button
                  onClick={copyPublicLink}
                  variant="outline"
                  className="w-full text-xs font-bold h-9 border-border text-foreground hover:bg-muted sm:hidden"
                >
                  <Copy className="w-3.5 h-3.5 mr-2" /> Copy Public Link
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live Attendee Preview Modal */}
      {template.template_image_url && (
        <DPPreviewModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          template={template}
          eventTitle={selectedEventTitle}
        />
      )}
    </div>
  );
};

export default DPGenerator;
