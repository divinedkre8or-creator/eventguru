import { useState, ChangeEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Rnd } from "react-rnd";
import { ImagePlus, Save, Loader2, LayoutTemplate, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { compressImageToBase64 } from "@/lib/imageUtils";

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
};

const DPGenerator = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [template, setTemplate] = useState<DpTemplate>(defaultTemplate);
  const [isEditing, setIsEditing] = useState(false);

  // 1. Fetch Organizer Events
  const { data: events = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ["organiser-events-dp", user?.id],
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
    queryKey: ["dp-template", selectedEventId],
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
      queryClient.invalidateQueries({ queryKey: ["dp-template", selectedEventId] });
      setIsEditing(true);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save template. Make sure Lovable has applied the DP database migration!");
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
      const base64 = await compressImageToBase64(file);
      setTemplate({ ...template, template_image_url: base64 });
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
    return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-[DM_Sans]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-foreground">Interactive DP Builder</h1>
          <p className="text-muted-foreground text-sm mt-1">Design a branded photo frame. Attendees upload their picture, and the system merges it!</p>
        </div>
        
        {isEditing && (
           <Button onClick={copyPublicLink} variant="outline" className="border-primary text-primary hover:bg-primary/10 hidden sm:flex">
             <Copy className="w-4 h-4 mr-2" /> Share DP Generator
           </Button>
        )}
      </div>

      <div className="space-y-3">
        <Label className="font-heading font-bold">Configure Event</Label>
        <select 
          className="w-full sm:w-1/2 h-11 px-3 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
        >
          {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
      </div>

      {isLoadingTemplate ? (
         <div className="p-10 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Canvas Wrapper */}
          <div className="lg:col-span-8 flex flex-col items-center border border-border bg-muted/30 p-4 rounded-xl shadow-sm overflow-hidden">
             
             {!template.template_image_url ? (
               <div className="w-full max-w-[500px] aspect-square border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center bg-card text-muted-foreground">
                  <LayoutTemplate className="w-12 h-12 mb-4 text-muted-foreground/50" />
                  <p className="font-heading font-bold text-foreground">No Template Image</p>
                  <p className="text-sm mt-1 mb-4 text-center px-4">Upload a square frame (e.g. 1080x1080) for your attendees to be masked into.</p>
                  <Button variant="outline" onClick={() => document.getElementById("template-upload")?.click()}>
                    <ImagePlus className="w-4 h-4 mr-2" /> Upload Background
                  </Button>
               </div>
             ) : (
               <div className="relative border border-border shadow-lg" style={{ width: 500, height: 500, backgroundImage: `url(${template.template_image_url})`, backgroundSize: "cover", backgroundPosition: "center" }}>
                 
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
                   <span className="text-primary font-heading font-extrabold rotate-[-15deg] opacity-70 cursor-move pointer-events-none select-none text-center leading-tight">
                     ATTENDEE<br/>PHOTO
                   </span>
                 </Rnd>

                 {/* Name Placeholder Bounding Box */}
                 <Rnd
                    size={{ width: 300, height: template.name_font_size + 10 }} // Fixed width for name wrapper
                    position={{ x: template.name_x, y: template.name_y }}
                    onDragStop={(e, d) => setTemplate({ ...template, name_x: d.x, name_y: d.y })}
                    enableResizing={false}
                    bounds="parent"
                    className="border border-blue-500 border-dashed bg-blue-500/10 cursor-move flex items-center justify-center hover:bg-blue-500/20"
                 >
                   <div style={{ color: template.name_color, fontSize: template.name_font_size }} className="font-heading font-extrabold select-none whitespace-nowrap cursor-move pointer-events-none">
                     Attendee Name
                   </div>
                 </Rnd>
               </div>
             )}
             
             <input type="file" id="template-upload" className="hidden" accept="image/*" onChange={handleImageUpload} />
          </div>

          {/* Configuration Panel */}
          <div className="lg:col-span-4 space-y-6 bg-card p-6 rounded-xl border border-border shadow-sm">
             <div className="space-y-4">
                <h3 className="font-heading font-bold text-lg text-foreground border-b border-border pb-2">Properties</h3>
                
                <div className="space-y-2">
                  <Button variant="outline" className="w-full border-border bg-secondary hover:brightness-95" onClick={() => document.getElementById("template-upload")?.click()}>
                    <ImagePlus className="w-4 h-4 mr-2" /> Change Background
                  </Button>
                </div>

                <div className="space-y-3 pt-4">
                   <Label className="font-bold text-muted-foreground text-xs uppercase">Photo Cutout</Label>
                   <div className="flex items-center justify-between">
                     <span className="text-sm font-medium">Circular Mask</span>
                     <Switch checked={template.image_rounded} onCheckedChange={(c) => setTemplate({ ...template, image_rounded: c })} />
                   </div>
                </div>

                <div className="space-y-3 pt-4">
                   <Label className="font-bold text-muted-foreground text-xs uppercase">Text Styling</Label>
                   <div className="space-y-2">
                      <Label className="text-xs">Font Color</Label>
                      <div className="flex gap-2">
                        <Input type="color" className="w-12 h-10 p-1 cursor-pointer" value={template.name_color} onChange={(e) => setTemplate({ ...template, name_color: e.target.value })} />
                        <Input className="flex-1 font-mono uppercase text-sm" value={template.name_color} onChange={(e) => setTemplate({ ...template, name_color: e.target.value })} />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <Label className="text-xs">Font Size (px)</Label>
                      <Input type="number" min="12" max="100" value={template.name_font_size} onChange={(e) => setTemplate({ ...template, name_font_size: Number(e.target.value) })} />
                   </div>
                </div>
             </div>

             <div className="pt-6 border-t border-border">
                <Button 
                  onClick={() => saveMutation.mutate(template)} 
                  disabled={saveMutation.isPending || !template.template_image_url} 
                  className="w-full bg-primary text-primary-foreground font-heading font-bold h-11 hover:brightness-110"
                >
                  {saveMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save DP Template</>}
                </Button>
                
                {isEditing && (
                  <Button onClick={copyPublicLink} variant="link" className="w-full mt-2 text-muted-foreground hover:text-foreground md:hidden">
                    <Copy className="w-4 h-4 mr-2" /> Copy Public Link
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
