import { useState, ChangeEvent, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import html2canvas from "html2canvas";
import { Download, Image as ImageIcon, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KenteStripe } from "@/components/KenteStripe";
import { toast } from "sonner";
import { compressImageToBase64 } from "@/lib/imageUtils";

const DPAttendeeView = () => {
  const { id } = useParams<{ id: string }>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [attendeeName, setAttendeeName] = useState("");
  const [attendeePhoto, setAttendeePhoto] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const { data: template, isLoading, error } = useQuery({
    queryKey: ["public-dp-template", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dp_templates")
        .select("*, events(title)")
        .eq("event_id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
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
        scale: 2, // High resolution
        backgroundColor: null,
      });

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `EventDP-${attendeeName.replace(/\s+/g, "_")}.png`;
      link.href = dataUrl;
      link.click();
      
      toast.success("DP Downloaded successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to generate DP. Please try again.");
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
        <p className="text-muted-foreground text-sm font-[DM_Sans]">The organizer has not set up a Display Picture generator for this event yet.</p>
        <Link to={`/events/${id}`}>
           <Button variant="outline" className="mt-4"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Event</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-[DM_Sans] transition-colors duration-300">
      <KenteStripe />

      <main className="container max-w-4xl mx-auto px-4 py-8 pb-20">
        <div className="flex flex-col md:flex-row items-center gap-8 justify-center">
          
          {/* Controls Panel */}
          <div className="w-full md:w-[350px] space-y-6 bg-card p-6 md:p-8 rounded-2xl border border-border shadow-md shrink-0 order-2 md:order-1">
             <div>
               <h1 className="font-heading text-2xl font-extrabold text-foreground leading-tight">Get Your DP</h1>
               <p className="text-muted-foreground text-sm mt-1">{(template.events as any)?.title}</p>
             </div>

             <div className="space-y-4 pt-4 border-t border-border">
                <div className="space-y-2">
                   <Label className="font-bold text-foreground text-sm">Upload Your Best Photo</Label>
                   {!attendeePhoto ? (
                      <Button onClick={() => document.getElementById("photo-upload")?.click()} variant="outline" className="w-full h-24 border-dashed border-2 bg-secondary text-muted-foreground hover:text-foreground">
                         <div className="flex flex-col items-center">
                           <ImageIcon className="w-6 h-6 mb-2 text-primary" />
                           <span className="text-xs">Click to choose image</span>
                         </div>
                      </Button>
                   ) : (
                      <Button onClick={() => document.getElementById("photo-upload")?.click()} variant="outline" className="w-full bg-secondary border-border">
                         Change Photo
                      </Button>
                   )}
                   <input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </div>

                <div className="space-y-2">
                   <Label className="font-bold text-foreground text-sm">Your Name</Label>
                   <Input 
                      placeholder="e.g. Divine Adeyemi" 
                      value={attendeeName}
                      onChange={(e) => setAttendeeName(e.target.value)}
                      maxLength={30}
                      className="h-12 bg-background border-border"
                   />
                </div>
             </div>

             <div className="pt-6">
                <Button 
                   onClick={handleGenerate} 
                   disabled={generating || !attendeePhoto || !attendeeName.trim()} 
                   className="w-full bg-primary text-primary-foreground h-12 rounded-xl shadow-lg hover:brightness-110 font-heading font-extrabold text-base"
                >
                  {generating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <><Download className="w-5 h-5 mr-2" /> Download DP</>
                  )}
                </Button>
             </div>
             
             <div className="text-center pt-2">
                <Link to={`/events/${id}`} className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center justify-center">
                   <ArrowLeft className="w-3 h-3 mr-1" /> Return to Event Page
                </Link>
             </div>
          </div>

          {/* Canvas Preview Area */}
          <div className="w-full flex justify-center order-1 md:order-2 overflow-hidden px-4 md:px-0 bg-muted/20 border border-border shadow-inner rounded-3xl py-6 relative">
             <div className="text-center absolute top-2 w-full text-xs font-bold text-muted-foreground/50 tracking-wider">PREVIEW</div>
             {/* Scale wrapper for mobile responsiveness, but actual DOM captures Original 500x500 */}
             <div className="origin-top" style={{ transform: 'scale(min(1, calc(100vw / 550)))' }}>
               
               <div 
                  ref={containerRef}
                  className="relative overflow-hidden bg-white shrink-0"
                  style={{ 
                    width: 500, 
                    height: 500, 
                    backgroundImage: `url(${template.template_image_url})`, 
                    backgroundSize: "cover", 
                    backgroundPosition: "center" 
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
                     borderRadius: template.image_rounded ? '50%' : '0'
                   }}
                 >
                   {attendeePhoto ? (
                     <img src={attendeePhoto} crossOrigin="anonymous" alt="User" className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full bg-black/10 backdrop-blur-sm flex items-center justify-center border-2 border-dashed border-black/20">
                       <ImageIcon className="w-8 h-8 text-black/30" />
                     </div>
                   )}
                 </div>

                 {/* Placed Name */}
                 <div
                   className="absolute font-heading leading-tight whitespace-nowrap"
                   style={{
                     left: template.name_x,
                     top: template.name_y,
                     color: template.name_color,
                     fontSize: template.name_font_size,
                     fontWeight: template.name_font_weight || 'bold'
                   }}
                 >
                   {attendeeName || "Your Name"}
                 </div>
                 
               </div>
             </div>
             
          </div>

        </div>
      </main>
    </div>
  );
};

export default DPAttendeeView;
