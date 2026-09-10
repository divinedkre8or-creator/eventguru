import { useState, ChangeEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Rnd } from "react-rnd";
import { ImagePlus, Save, Loader2, LayoutTemplate, Copy, Image, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { uploadImage } from "@/lib/storageUtils";

interface DpTemplate {
  id?: string;
  event_id: string;
  template_image_url: string;
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
  image_x: 150,
  image_y: 100,
  image_width: 200,
  image_height: 200,
  image_rounded: true,
  name_x: 150,
  name_y: 320,
  name_color: "#000000",
  name_font_size: 28,
  name_text_align: "center",
  name_font_family: "Inter, sans-serif",
  name_width: 300,
};

const DPGenerator = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [template, setTemplate] = useState<DpTemplate>(defaultTemplate);
  const [isEditing, setIsEditing] = useState(false);

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
      const { data, error } = await supabase
        .from("dp_templates")
        .select("*")
        .eq("event_id", selectedEventId)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setTemplate(data);
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
      if (payload.id) {
        const { error } = await supabase.from("dp_templates").update(payload).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("dp_templates").insert({ ...payload, id: undefined });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("DP Template saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["dp-template-v2", selectedEventId] });
      setIsEditing(true);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save template.");
    }
  });

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    try {
      const url = await uploadImage(file, "dp-templates", "frames");
      setTemplate({ ...template, template_image_url: url });
      toast.success("Frame template processed");
    } catch (err) {
      toast.error("Failed to process image");
    }
  };

  const copyPublicLink = () => {
    const link = `${window.location.origin}/events/${selectedEventId}/dp`;
    navigator.clipboard.writeText(link);
    toast.success("Public DP Generator link copied!");
  };

  if (isLoadingEvents) {
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="animate-spin w-7 h-7 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-muted px-2.5 py-1 rounded inline-block mb-2 text-foreground">
            ENGAGEMENT TOOLS
          </div>
          <h1 className="font-heading text-3xl font-black text-foreground tracking-tight">Interactive DP Builder</h1>
          <p className="text-muted-foreground text-xs font-medium mt-1">Design a branded photo frame. Attendees upload their picture, and the system merges it!</p>
        </div>
        
        {isEditing && (
          <Button onClick={copyPublicLink} variant="outline" className="border-border text-foreground hover:bg-muted font-bold text-xs h-10 px-4 rounded-lg hidden sm:flex items-center gap-2">
            <Copy className="w-4 h-4" /> Share DP Generator
          </Button>
        )}
      </div>

      {/* Select Event */}
      <div className="space-y-1.5 max-w-md">
        <label className="text-xs font-mono font-bold uppercase text-muted-foreground">TARGET EVENT</label>
        <select 
          className="w-full h-10 px-3 rounded-lg border border-border bg-card text-foreground text-xs font-medium focus:outline-none focus:border-primary"
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
        >
          {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
      </div>

      {isLoadingTemplate ? (
        <div className="p-16 flex justify-center text-xs font-mono text-muted-foreground">
          <Loader2 className="animate-spin w-6 h-6 text-primary mr-2" /> Loading DP template...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full min-w-0">
          
          {/* Canvas Wrapper */}
          <div className="lg:col-span-8 flex flex-col items-center border border-border bg-card p-3 sm:p-6 rounded-lg shadow-sm overflow-hidden w-full min-w-0">
             
             {!template.template_image_url ? (
               <div className="w-full max-w-[500px] aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center bg-muted/30 text-muted-foreground p-6">
                  <LayoutTemplate className="w-12 h-12 mb-3 text-muted-foreground/40" />
                  <p className="font-heading font-bold text-foreground text-sm">No Template Image Uploaded</p>
                  <p className="text-xs mt-1 mb-4 text-center px-4">Upload a square frame graphic (e.g. 1080x1080) for your attendees to be masked into.</p>
                  <Button variant="outline" size="sm" className="font-bold text-xs h-9 px-4 rounded-lg border-border" onClick={() => document.getElementById("template-upload")?.click()}>
                    <ImagePlus className="w-4 h-4 mr-2" /> Upload Background
                  </Button>
               </div>
             ) : (
               <div className="w-full overflow-x-auto py-2 flex justify-center max-w-full">
                 <div className="relative border border-border shadow-md rounded overflow-hidden shrink-0" style={{ width: 500, height: 500, backgroundImage: `url(${template.template_image_url})`, backgroundSize: "cover", backgroundPosition: "center" }}>
                   
                   {/* Image Placeholder Bounding Box */}
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
                          image_y: position.y
                        });
                      }}
                      bounds="parent"
                      className={`border-2 border-primary border-dashed bg-primary/20 backdrop-blur-[2px] cursor-move flex items-center justify-center ${template.image_rounded ? 'rounded-full' : ''}`}
                   >
                     <span className="text-primary font-mono font-black rotate-[-15deg] opacity-80 cursor-move pointer-events-none select-none text-center leading-tight text-xs">
                       ATTENDEE<br/>PHOTO
                     </span>
                   </Rnd>

                   {/* Name Placeholder Bounding Box */}
                   <Rnd
                      size={{ width: template.name_width, height: template.name_font_size + 10 }}
                      position={{ x: template.name_x, y: template.name_y }}
                      onDragStop={(e, d) => setTemplate({ ...template, name_x: d.x, name_y: d.y })}
                      onResizeStop={(e, direction, ref, delta, position) => {
                        setTemplate({
                          ...template,
                          name_width: parseInt(ref.style.width),
                          name_x: position.x,
                          name_y: position.y
                        });
                      }}
                      bounds="parent"
                      enableResizing={{ top:false, right:true, bottom:false, left:true, topRight:false, bottomRight:false, bottomLeft:false, topLeft:false }}
                      className="border border-chart-blue border-dashed bg-chart-blue/10 cursor-move flex items-center"
                   >
                     <div style={{ color: template.name_color, fontSize: template.name_font_size, fontFamily: template.name_font_family, textAlign: template.name_text_align as any, width: "100%" }} className="font-bold select-none whitespace-nowrap cursor-move pointer-events-none">
                       Attendee Name
                     </div>
                   </Rnd>
                 </div>
               </div>
             )}
             
             <input type="file" id="template-upload" className="hidden" accept="image/*" onChange={handleImageUpload} />
          </div>

          {/* Configuration Panel */}
          <div className="lg:col-span-4 space-y-6 bg-card p-5 rounded-lg border border-border shadow-sm">
             <div className="space-y-4">
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground border-b border-border pb-2">PROPERTIES & STYLING</h3>
                
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full h-9 text-xs font-bold border-border bg-muted/50 hover:bg-muted" onClick={() => document.getElementById("template-upload")?.click()}>
                    <ImagePlus className="w-4 h-4 mr-2" /> Change Background Image
                  </Button>
                </div>

                <div className="space-y-2 pt-2">
                   <Label className="text-xs font-mono font-bold text-muted-foreground uppercase">Photo Cutout Mask</Label>
                   <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border border-border">
                     <span className="text-xs font-bold text-foreground">Circular Cutout Mask</span>
                     <Switch checked={template.image_rounded} onCheckedChange={(c) => setTemplate({ ...template, image_rounded: c })} />
                   </div>
                </div>

                <div className="space-y-3 pt-2">
                   <Label className="text-xs font-mono font-bold text-muted-foreground uppercase">Attendee Name Typography</Label>
                   
                   <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Font Family</Label>
                      <select 
                        className="w-full h-9 px-3 rounded-lg border border-border bg-card text-xs font-medium focus:outline-none focus:border-primary"
                        value={template.name_font_family}
                        onChange={(e) => setTemplate({ ...template, name_font_family: e.target.value })}
                      >
                         <option value="Inter, sans-serif">Inter (Default)</option>
                         <option value="sans-serif">System Sans-Serif</option>
                         <option value="serif">System Serif</option>
                         <option value="JetBrains Mono, monospace">Monospace</option>
                         <option value="Impact, sans-serif">Impact Bold</option>
                      </select>
                   </div>

                   <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Alignment</Label>
                      <select 
                        className="w-full h-9 px-3 rounded-lg border border-border bg-card text-xs font-medium focus:outline-none focus:border-primary"
                        value={template.name_text_align}
                        onChange={(e) => setTemplate({ ...template, name_text_align: e.target.value })}
                      >
                         <option value="left">Left Aligned</option>
                         <option value="center">Center Aligned</option>
                         <option value="right">Right Aligned</option>
                      </select>
                   </div>

                   <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Font Size (px)</Label>
                        <Input type="number" min="12" max="100" value={template.name_font_size} onChange={(e) => setTemplate({ ...template, name_font_size: Number(e.target.value) })} className="h-9 text-xs" />
                     </div>
                     <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Color</Label>
                        <div className="flex gap-2">
                          <Input type="color" className="w-10 h-9 p-1 cursor-pointer" value={template.name_color} onChange={(e) => setTemplate({ ...template, name_color: e.target.value })} />
                          <Input className="flex-1 font-mono uppercase text-xs h-9 px-2" value={template.name_color} onChange={(e) => setTemplate({ ...template, name_color: e.target.value })} />
                        </div>
                     </div>
                   </div>
                </div>
             </div>

             <div className="pt-4 border-t border-border space-y-2">
                <Button 
                  onClick={() => saveMutation.mutate(template)} 
                  disabled={saveMutation.isPending || !template.template_image_url} 
                  className="w-full bg-primary text-primary-foreground font-bold text-xs h-10 rounded-lg hover:opacity-90"
                >
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save DP Template</>}
                </Button>
                
                {isEditing && (
                  <Button onClick={copyPublicLink} variant="outline" className="w-full text-xs font-bold h-9 border-border text-foreground hover:bg-muted sm:hidden">
                    <Copy className="w-3.5 h-3.5 mr-2" /> Copy Public Link
                  </Button>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DPGenerator;

