import { useState, useRef, ChangeEvent, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Calendar, MapPin, Tag, Ticket, Plus, Trash2, Loader2, ImagePlus, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { uploadImage } from "@/lib/storageUtils";
import { ShareEventModal } from "@/components/events/ShareEventModal";

const categories = [
  "conference", "trade-show", "concert", "workshop",
  "church", "campus", "networking", "sports", "festival", "other",
];

interface TicketDraft {
  id?: string;
  name: string;
  price: string;
  quantity: string;
  description: string;
  sold?: number;
}

interface ScheduleDay {
  date: string;
  startTime: string;
  endTime: string;
}

const emptyTicket: TicketDraft = { name: "", price: "0", quantity: "100", description: "" };

const CreateEvent = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(isEditMode);
  
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [publishedEventId, setPublishedEventId] = useState("");

  // Step 1: Details
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [category, setCategory] = useState("conference");
  const [isFree, setIsFree] = useState(false);
  const [maxAttendees, setMaxAttendees] = useState("");
  
  // Banner Image
  const [bannerDataUrl, setBannerDataUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Brand Color Customization
  const [brandColor, setBrandColor] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Schedule
  const [schedule, setSchedule] = useState<ScheduleDay[]>([
    { date: "", startTime: "", endTime: "" }
  ]);

  // Step 2: Tickets
  const [tickets, setTickets] = useState<TicketDraft[]>([{ ...emptyTicket, name: "General Admission" }]);

  // Load Event Data if Edit Mode
  useEffect(() => {
    if (!isEditMode || !user) return;
    
    const fetchEvent = async () => {
      try {
        const { data: event, error } = await supabase
          .from("events")
          .select("*, ticket_types(*)")
          .eq("id", id!)
          .single();
        
        if (error) throw error;
        if (event.organiser_id !== user.id) {
          toast({ title: "Unauthorized", description: "You cannot edit this event", variant: "destructive" });
          navigate("/dashboard/events");
          return;
        }

        setTitle(event.title || "");
        setVenue(event.venue || "");
        setCity(event.city || "");
        setCountry(event.country || "Nigeria");
        setCategory(event.category || "conference");
        setIsFree(event.is_free || false);
        setMaxAttendees(event.max_attendees ? event.max_attendees.toString() : "");
        setBannerDataUrl(event.image_url || null);
        
        // Parse custom delimited string
        let rawDesc = event.description || "";
        let parsedDesc = rawDesc;
        let parsedSchedule: ScheduleDay[] = [];
        let parsedAdditional = "";

        // Parse brand color
        let parsedBrandColor = "";
        if (rawDesc.includes("|||BRAND_COLOR|||")) {
          const parts = rawDesc.split("|||BRAND_COLOR|||");
          rawDesc = parts[0];
          parsedBrandColor = (parts[1] || "").trim();
        }

        if (rawDesc.includes("|||ADDITIONAL_INFO|||")) {
          const parts = rawDesc.split("|||ADDITIONAL_INFO|||");
          parsedDesc = parts[0];
          parsedAdditional = parts[1] || "";
        }

        if (parsedDesc.includes("|||SCHEDULE|||")) {
          const parts = parsedDesc.split("|||SCHEDULE|||");
          parsedDesc = parts[0];
          try {
            parsedSchedule = JSON.parse(parts[1]);
          } catch (e) {
            console.error("Failed to parse schedule JSON", e);
          }
        }

        setDescription(parsedDesc.trim());
        setAdditionalInfo(parsedAdditional.trim());
        setBrandColor(parsedBrandColor);
        if (parsedSchedule.length > 0) {
          setSchedule(parsedSchedule);
        } else if (event.date) {
           // fallback for older events without schedule JSON
           const d = new Date(event.date);
           setSchedule([{ 
             date: d.toISOString().split('T')[0], 
             startTime: d.toISOString().split('T')[1].substring(0,5), 
             endTime: "" 
           }]);
        }

        if (event.ticket_types && event.ticket_types.length > 0) {
          if (!event.is_free) {
            setTickets(event.ticket_types.map((t: any) => ({
              id: t.id,
              name: t.name,
              price: t.price.toString(),
              quantity: t.quantity.toString(),
              description: t.description || "",
              sold: t.sold || 0,
            })));
          }
        }
      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
        navigate("/dashboard/events");
      } finally {
        setIsLoadingEvent(false);
      }
    };

    fetchEvent();
  }, [isEditMode, id, user, navigate, toast]);

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file", variant: "destructive" });
      return;
    }

    try {
      setIsUploadingImage(true);
      const url = await uploadImage(file, "event-images", "flyers");
      setBannerDataUrl(url);
    } catch (err) {
      toast({ title: "Upload failed", description: "Failed to process image", variant: "destructive" });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const addScheduleDay = () => setSchedule([...schedule, { date: "", startTime: "", endTime: "" }]);
  const removeScheduleDay = (i: number) => setSchedule(schedule.filter((_, idx) => idx !== i));
  const updateScheduleDay = (i: number, field: keyof ScheduleDay, value: string) => {
    const updated = [...schedule];
    updated[i] = { ...updated[i], [field]: value };
    setSchedule(updated);
  };

  const addTicket = () => setTickets([...tickets, { ...emptyTicket }]);
  const removeTicket = (i: number) => setTickets(tickets.filter((_, idx) => idx !== i));
  const updateTicket = (i: number, field: keyof TicketDraft, value: string) => {
    const updated = [...tickets];
    updated[i] = { ...updated[i], [field]: value };
    setTickets(updated);
  };

  const canProceedStep1 = title.trim() && category && schedule[0].date && schedule[0].startTime;
  const canProceedStep2 = isFree || tickets.some((t) => t.name.trim());

  const handleSubmit = async (status: "draft" | "published") => {
    if (!user) return;
    setSubmitting(true);
    try {
      // Process schedule
      const sortedSchedule = [...schedule].filter(s => s.date && s.startTime).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      if (sortedSchedule.length === 0) throw new Error("At least one valid schedule day is required.");

      const startDate = new Date(`${sortedSchedule[0].date}T${sortedSchedule[0].startTime}`).toISOString();
      const endItem = sortedSchedule[sortedSchedule.length - 1];
      const endDate = endItem.endTime ? new Date(`${endItem.date}T${endItem.endTime}`).toISOString() : null;

      // Pack it all into description
      const finalDescription = `${description.trim()}\n\n|||SCHEDULE|||${JSON.stringify(sortedSchedule)}\n\n|||ADDITIONAL_INFO|||${additionalInfo.trim()}${brandColor ? `\n\n|||BRAND_COLOR|||${brandColor}` : ''}`;

      const eventPayload = {
        organiser_id: user.id,
        title: title.trim(),
        description: finalDescription,
        date: startDate,
        end_date: endDate,
        venue: venue.trim() || null,
        city: city.trim() || null,
        country,
        category,
        is_free: isFree,
        max_attendees: Number(maxAttendees) || null,
        status,
        image_url: bannerDataUrl,
      };

      let eventIdResult = id;

      if (isEditMode) {
        const { error: eventError } = await supabase
          .from("events")
          .update(eventPayload)
          .eq("id", id!);
        if (eventError) {
           console.error("Supabase Event Update Error:", eventError);
           throw eventError;
        }

        if (!isFree && tickets.length > 0) {
          const ticketRows = tickets.filter(t => t.name.trim()).map((t) => ({
             ...(t.id ? { id: t.id } : {}),
             event_id: id!,
             name: t.name.trim(),
             description: t.description.trim() || null,
             price: parseFloat(t.price) || 0,
             quantity: parseInt(t.quantity) || 100,
          }));
          const { error: ticketError } = await supabase.from("ticket_types").upsert(ticketRows);
          if (ticketError) {
            console.error("Supabase Ticket Update Error:", ticketError);
            throw ticketError;
          }
        }

      } else {
        const { data: event, error: eventError } = await supabase
          .from("events")
          .insert(eventPayload)
          .select("id")
          .single();

        if (eventError) {
          console.error("Supabase Event Insert Error:", eventError);
          throw eventError;
        }
        eventIdResult = event.id;

        if (!isFree && tickets.length > 0) {
          const ticketRows = tickets
            .filter((t) => t.name.trim())
            .map((t) => ({
              event_id: event.id,
              name: t.name.trim(),
              description: t.description.trim() || null,
              price: parseFloat(t.price) || 0,
              quantity: parseInt(t.quantity) || 100,
            }));

          if (ticketRows.length > 0) {
            const { error: ticketError } = await supabase.from("ticket_types").insert(ticketRows);
            if (ticketError) throw ticketError;
          }
        } else if (isFree) {
          await supabase.from("ticket_types").insert({
            event_id: event.id,
            name: "Free Admission",
            price: 0,
            quantity: Number(maxAttendees) || 1000,
          });
        }
      }

      toast({
        title: isEditMode ? "Event updated" : (status === "published" ? "Event published" : "Event saved as draft"),
        description: `"${title}" has been successfully ${isEditMode ? "updated" : (status === "published" ? "published" : "saved")}.`,
      });

      if (!isEditMode && status === "published") {
        setPublishedEventId(eventIdResult!);
        setShareModalOpen(true);
      } else {
        navigate("/dashboard/events");
      }
    } catch (err: any) {
      console.error("Submit Exception:", err);
      toast({ title: "Error", description: err.message || "Failed to save event.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const domain = window.location.origin;

  if (isLoadingEvent) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 pb-20 min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 w-full min-w-0">
        <button onClick={() => (step > 1 ? setStep(step - 1) : navigate("/dashboard/events"))} className="p-2 rounded-lg hover:bg-card text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="font-heading text-xl font-extrabold text-foreground truncate">{isEditMode ? "Edit Event" : "Create Event"}</h1>
          <p className="text-muted-foreground text-sm font-body">Step {step} of 3</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-2 w-full">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-border"}`} />
        ))}
      </div>

      {/* Step 1: Event Details */}
      {step === 1 && (
        <div className="space-y-5 bg-card rounded-xl border border-border p-4 sm:p-5 w-full min-w-0">
          {/* Banner Upload */}
          <div className="space-y-2">
            <Label className="font-heading text-sm font-bold">Event Banner</Label>
            <div 
              className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center gap-3 relative overflow-hidden group hover:border-primary/50 transition-colors bg-background/50 w-full"
              style={{ minHeight: "150px" }}
            >
              {isUploadingImage ? (
                <div className="flex flex-col items-center justify-center gap-2 py-6">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-xs font-body text-muted-foreground">Uploading banner image...</p>
                </div>
              ) : bannerDataUrl ? (
                <>
                  <img src={bannerDataUrl} alt="Banner" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>Change</Button>
                    <Button variant="destructive" size="sm" onClick={() => setBannerDataUrl(null)}>Remove</Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                    <ImagePlus className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-body text-foreground font-medium">Click to upload banner</p>
                    <p className="text-xs font-body text-muted-foreground mt-1">Recommended size: 1920x1080 (16:9). PNG, JPG up to 5MB.</p>
                  </div>
                  <Button variant="outline" size="sm" className="mt-2 text-foreground" onClick={() => fileInputRef.current?.click()}>
                    Select Image
                  </Button>
                </>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/png, image/jpeg, image/webp" 
                className="hidden" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-heading text-sm font-bold">Event Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Lagos Tech Summit 2026" className="bg-background border-border text-foreground w-full" />
          </div>

          {/* Dynamic Schedule */}
          <div className="space-y-3 w-full min-w-0">
            <div className="flex items-center justify-between">
              <Label className="font-heading text-sm font-bold">Event Schedule *</Label>
            </div>
            {schedule.map((day, i) => (
              <div key={i} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end bg-background p-3 rounded-lg border border-border w-full min-w-0">
                <div className="space-y-1 flex-1 w-full min-w-0">
                  <Label className="text-xs text-muted-foreground">Date *</Label>
                  <Input type="date" value={day.date} onChange={(e) => updateScheduleDay(i, "date", e.target.value)} className="bg-background border-border text-foreground w-full" />
                </div>
                <div className="space-y-1 flex-1 w-full min-w-0">
                  <Label className="text-xs text-muted-foreground">Start Time *</Label>
                  <Input type="time" value={day.startTime} onChange={(e) => updateScheduleDay(i, "startTime", e.target.value)} className="bg-background border-border text-foreground w-full" />
                </div>
                <div className="space-y-1 flex-1 w-full min-w-0">
                  <Label className="text-xs text-muted-foreground">End Time</Label>
                  <Input type="time" value={day.endTime} onChange={(e) => updateScheduleDay(i, "endTime", e.target.value)} className="bg-background border-border text-foreground w-full" />
                </div>
                {schedule.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeScheduleDay(i)} className="self-end sm:self-auto shrink-0 text-muted-foreground hover:text-destructive mb-[2px]">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addScheduleDay} className="w-full border-dashed text-foreground">
              <Plus className="w-4 h-4 mr-2" /> Add Another Day
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="font-heading text-sm font-bold">About the Event</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell people what your event is about..." rows={4} className="bg-background border-border resize-none text-foreground" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-heading text-sm font-bold">Venue</Label>
              <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Landmark Centre" className="bg-background border-border text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="font-heading text-sm font-bold">City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Lagos" className="bg-background border-border text-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-heading text-sm font-bold">Category *</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-heading font-bold capitalize transition-colors ${
                    category === cat ? "bg-primary text-primary-foreground" : "bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {cat.replace("-", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Brand Color Picker */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-muted-foreground" />
              <Label className="font-heading text-sm font-bold">Event Brand Color</Label>
              <span className="text-[10px] text-muted-foreground font-medium ml-auto">Optional</span>
            </div>
            <p className="text-xs text-muted-foreground -mt-1">Choose a custom accent color for your event landing page. Buttons, badges, and highlights on your public event page will use this color.</p>
            <div className="flex flex-wrap items-center gap-2">
              {["", "#0058BE", "#E11D48", "#16A34A", "#9333EA", "#EA580C", "#0891B2", "#CA8A04", "#DC2626"].map((color) => (
                <button
                  key={color || "default"}
                  onClick={() => setBrandColor(color)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all flex items-center justify-center ${
                    brandColor === color ? "border-foreground scale-110 shadow-md" : "border-border hover:border-muted-foreground"
                  }`}
                  style={color ? { backgroundColor: color } : undefined}
                  title={color || "Platform Default"}
                >
                  {!color && <span className="text-[9px] font-mono font-bold text-muted-foreground">DEF</span>}
                </button>
              ))}
              <div className="relative">
                <input
                  type="color"
                  value={brandColor || "#0058BE"}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border-2 border-border hover:border-muted-foreground"
                  title="Pick custom color"
                />
              </div>
            </div>
            {brandColor && (
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: brandColor }} />
                <span className="font-mono text-muted-foreground">{brandColor.toUpperCase()}</span>
                <button onClick={() => setBrandColor("")} className="text-destructive hover:underline ml-2 text-[10px] font-bold">Reset</button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
            <div>
              <Label className="font-heading text-sm font-bold">Free Event</Label>
              <p className="text-muted-foreground text-xs font-medium">No ticket purchase required</p>
            </div>
            <Switch checked={isFree} onCheckedChange={setIsFree} />
          </div>

          <Button onClick={() => setStep(2)} disabled={!canProceedStep1} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-heading font-bold">
            Next: {isFree ? "Review" : "Tickets"} <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Step 2: Tickets & Info */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <h2 className="font-heading text-lg font-bold">Ticketing Requirements</h2>
            {isFree ? (
              <div className="text-center p-6 border border-dashed border-border rounded-xl bg-background/50">
                <Ticket className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
                <h3 className="font-heading text-sm font-bold text-foreground mb-1">Free Event</h3>
                <p className="text-muted-foreground text-xs font-medium mb-4">Attendees can register without payment</p>
                <div className="space-y-2 max-w-xs mx-auto text-left">
                  <Label className="font-heading text-sm font-bold">Max Attendees (optional)</Label>
                  <Input type="number" value={maxAttendees} onChange={(e) => setMaxAttendees(e.target.value)} placeholder="Unlimited" className="bg-background border-border text-center text-foreground" />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket, i) => (
                  <div key={i} className="bg-background rounded-xl border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-heading text-sm font-bold text-foreground">Ticket {i + 1}</h3>
                      {tickets.length > 1 && (
                        <button onClick={() => removeTicket(i)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-muted-foreground">Name *</Label>
                        <Input value={ticket.name} onChange={(e) => updateTicket(i, "name", e.target.value)} placeholder="e.g. VIP" className="bg-background border-border text-foreground" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-muted-foreground">Price (NGN)</Label>
                        <Input type="number" value={ticket.price} onChange={(e) => updateTicket(i, "price", e.target.value)} placeholder="0" className="bg-background border-border text-foreground" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-muted-foreground">Quantity</Label>
                        <Input type="number" value={ticket.quantity} onChange={(e) => updateTicket(i, "quantity", e.target.value)} placeholder="100" className="bg-background border-border text-foreground" />
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={addTicket} className="w-full py-3 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors flex items-center justify-center gap-2 text-sm font-heading font-bold">
                  <Plus className="w-4 h-4" /> Add Ticket Type
                </button>
              </div>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
             <div className="space-y-2">
                <Label className="font-heading text-base font-bold">Additional Information</Label>
                <p className="text-xs text-muted-foreground -mt-1 mb-2">Include contact details, specific instructions, or event rules here. This will display below your tickets on the event page.</p>
                <Textarea 
                  value={additionalInfo} 
                  onChange={(e) => setAdditionalInfo(e.target.value)} 
                  placeholder="e.g. For inquiries contact us at hello@example.com..." 
                  rows={4} 
                  className="bg-background border-border resize-none text-foreground" 
                />
            </div>
          </div>

          <Button onClick={() => setStep(3)} disabled={!canProceedStep2} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-heading font-bold">
            Next: Review <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Step 3: Review & Publish */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            {bannerDataUrl && (
              <div className="w-full aspect-[21/9] rounded-lg overflow-hidden border border-border mb-4">
                <img src={bannerDataUrl} alt="Banner Preview" className="w-full h-full object-cover" />
              </div>
            )}
            <h3 className="font-heading text-lg font-bold text-foreground">{title}</h3>
            {description && <p className="text-muted-foreground text-sm font-medium line-clamp-2">{description}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm w-full min-w-0">
              <div className="flex items-center gap-2 text-muted-foreground font-medium min-w-0">
                <Calendar className="w-4 h-4 shrink-0" />
                <span className="truncate">{schedule[0].date ? `${new Date(schedule[0].date).toLocaleDateString()} ${schedule[0].startTime}` : "Not set"}</span>
              </div>
              {venue && (
                <div className="flex items-center gap-2 text-muted-foreground font-medium min-w-0">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="truncate">{venue}{city ? `, ${city}` : ""}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground font-medium min-w-0">
                <Tag className="w-4 h-4 shrink-0" />
                <span className="capitalize truncate">{category.replace("-", " ")}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground font-medium min-w-0">
                <Ticket className="w-4 h-4 shrink-0" />
                <span className="truncate">{isFree ? "Free" : `${tickets.filter(t => t.name.trim()).length} ticket type(s)`}</span>
              </div>
            </div>

            {!isFree && tickets.filter(t => t.name.trim()).length > 0 && (
              <div className="border-t border-border pt-3 space-y-2 w-full min-w-0">
                <h4 className="font-heading text-xs font-bold text-muted-foreground uppercase tracking-wider">Tickets</h4>
                {tickets.filter(t => t.name.trim()).map((t, i) => (
                  <div key={i} className="flex items-center justify-between text-sm gap-2">
                    <span className="font-medium text-foreground truncate">{t.name}</span>
                    <span className="font-heading font-bold text-primary shrink-0 text-right">
                      NGN {parseFloat(t.price || "0").toLocaleString()} <span className="text-muted-foreground font-medium font-normal">x {t.quantity}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full min-w-0">
             {isEditMode ? (
               <Button onClick={() => handleSubmit("published")} disabled={submitting} className="w-full sm:flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-heading font-bold shadow-xl py-6 text-lg">
                 {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                 Save & Update Event
               </Button>
             ) : (
               <>
                  <Button onClick={() => handleSubmit("draft")} disabled={submitting} variant="outline" className="w-full sm:flex-1 border border-border text-foreground hover:bg-muted font-heading font-bold h-11">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Save as Draft
                  </Button>
                  <Button onClick={() => handleSubmit("published")} disabled={submitting} className="w-full sm:flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-heading font-bold h-11">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Publish Event
                  </Button>
               </>
             )}
          </div>
        </div>
      )}

      {/* Share Modal */}
      <ShareEventModal 
        isOpen={shareModalOpen} 
        onClose={() => {
          setShareModalOpen(false);
          navigate("/dashboard/events");
        }} 
        eventUrl={`${domain}/events/${publishedEventId || id}`}
        eventTitle={title}
      />
    </div>
  );
};

export default CreateEvent;
