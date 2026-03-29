import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Calendar, MapPin, Tag, Ticket, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const categories = [
  "conference", "trade-show", "concert", "workshop",
  "church", "campus", "networking", "sports", "festival", "other",
];

interface TicketDraft {
  name: string;
  price: string;
  quantity: string;
  description: string;
}

const emptyTicket: TicketDraft = { name: "", price: "0", quantity: "100", description: "" };

const CreateEvent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Details
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [category, setCategory] = useState("conference");
  const [isFree, setIsFree] = useState(false);
  const [maxAttendees, setMaxAttendees] = useState("");

  // Step 2: Tickets
  const [tickets, setTickets] = useState<TicketDraft[]>([{ ...emptyTicket, name: "General Admission" }]);

  const addTicket = () => setTickets([...tickets, { ...emptyTicket }]);
  const removeTicket = (i: number) => setTickets(tickets.filter((_, idx) => idx !== i));
  const updateTicket = (i: number, field: keyof TicketDraft, value: string) => {
    const updated = [...tickets];
    updated[i] = { ...updated[i], [field]: value };
    setTickets(updated);
  };

  const canProceedStep1 = title.trim() && date && category;
  const canProceedStep2 = isFree || tickets.some((t) => t.name.trim());

  const handleSubmit = async (status: "draft" | "published") => {
    if (!user) return;
    setSubmitting(true);
    try {
      const { data: event, error: eventError } = await supabase
        .from("events")
        .insert({
          organiser_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          date: new Date(date).toISOString(),
          end_date: endDate ? new Date(endDate).toISOString() : null,
          venue: venue.trim() || null,
          city: city.trim() || null,
          country,
          category,
          is_free: isFree,
          max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
          status,
        })
        .select("id")
        .single();

      if (eventError) throw eventError;

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
          quantity: maxAttendees ? parseInt(maxAttendees) : 1000,
        });
      }

      toast({
        title: status === "published" ? "Event published" : "Event saved as draft",
        description: `"${title}" has been ${status === "published" ? "published" : "saved"}.`,
      });
      navigate("/dashboard/events");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => (step > 1 ? setStep(step - 1) : navigate("/dashboard/events"))} className="p-2 rounded-lg hover:bg-card text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-heading text-xl font-800 text-foreground">Create Event</h1>
          <p className="text-muted-foreground text-sm font-body">Step {step} of 3</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? "bg-amber" : "bg-border"}`} />
        ))}
      </div>

      {/* Step 1: Event Details */}
      {step === 1 && (
        <div className="space-y-5 bg-card rounded-xl border border-border p-5">
          <div className="space-y-2">
            <Label className="font-heading text-sm font-700">Event Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Lagos Tech Summit 2026" className="bg-background border-border" />
          </div>

          <div className="space-y-2">
            <Label className="font-heading text-sm font-700">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell people what your event is about..." rows={4} className="bg-background border-border resize-none" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-heading text-sm font-700">Start Date & Time *</Label>
              <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="bg-background border-border" />
            </div>
            <div className="space-y-2">
              <Label className="font-heading text-sm font-700">End Date & Time</Label>
              <Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-background border-border" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-heading text-sm font-700">Venue</Label>
              <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Landmark Centre" className="bg-background border-border" />
            </div>
            <div className="space-y-2">
              <Label className="font-heading text-sm font-700">City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Lagos" className="bg-background border-border" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-heading text-sm font-700">Category *</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-heading font-700 capitalize transition-colors ${
                    category === cat ? "bg-amber text-ink" : "bg-background border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat.replace("-", " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
            <div>
              <Label className="font-heading text-sm font-700">Free Event</Label>
              <p className="text-muted-foreground text-xs font-body">No ticket purchase required</p>
            </div>
            <Switch checked={isFree} onCheckedChange={setIsFree} />
          </div>

          <Button onClick={() => setStep(2)} disabled={!canProceedStep1} className="w-full bg-amber text-ink hover:bg-amber/90 font-heading font-700">
            Next: {isFree ? "Review" : "Tickets"} <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Step 2: Tickets */}
      {step === 2 && (
        <div className="space-y-4">
          {isFree ? (
            <div className="bg-card rounded-xl border border-border p-5 text-center">
              <Ticket className="w-10 h-10 mx-auto mb-3 text-teal" />
              <h3 className="font-heading text-sm font-700 text-foreground mb-1">Free Event</h3>
              <p className="text-muted-foreground text-xs font-body mb-4">Attendees can register without payment</p>
              <div className="space-y-2 max-w-xs mx-auto">
                <Label className="font-heading text-sm font-700">Max Attendees (optional)</Label>
                <Input type="number" value={maxAttendees} onChange={(e) => setMaxAttendees(e.target.value)} placeholder="Unlimited" className="bg-background border-border text-center" />
              </div>
            </div>
          ) : (
            <>
              {tickets.map((ticket, i) => (
                <div key={i} className="bg-card rounded-xl border border-border p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading text-sm font-700 text-foreground">Ticket {i + 1}</h3>
                    {tickets.length > 1 && (
                      <button onClick={() => removeTicket(i)} className="p-1.5 rounded-lg hover:bg-coral/10 text-muted-foreground hover:text-coral transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-body text-muted-foreground">Name *</Label>
                      <Input value={ticket.name} onChange={(e) => updateTicket(i, "name", e.target.value)} placeholder="e.g. VIP" className="bg-background border-border" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-body text-muted-foreground">Price (NGN)</Label>
                      <Input type="number" value={ticket.price} onChange={(e) => updateTicket(i, "price", e.target.value)} placeholder="0" className="bg-background border-border" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-body text-muted-foreground">Quantity</Label>
                      <Input type="number" value={ticket.quantity} onChange={(e) => updateTicket(i, "quantity", e.target.value)} placeholder="100" className="bg-background border-border" />
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addTicket} className="w-full py-3 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-amber/30 transition-colors flex items-center justify-center gap-2 text-sm font-heading font-700">
                <Plus className="w-4 h-4" /> Add Ticket Type
              </button>
            </>
          )}
          <Button onClick={() => setStep(3)} disabled={!canProceedStep2} className="w-full bg-amber text-ink hover:bg-amber/90 font-heading font-700">
            Next: Review <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Step 3: Review & Publish */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <h3 className="font-heading text-lg font-700 text-foreground">{title}</h3>
            {description && <p className="text-muted-foreground text-sm font-body">{description}</p>}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground font-body">
                <Calendar className="w-4 h-4 shrink-0" />
                <span className="truncate">{date ? new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Not set"}</span>
              </div>
              {venue && (
                <div className="flex items-center gap-2 text-muted-foreground font-body">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="truncate">{venue}{city ? `, ${city}` : ""}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground font-body">
                <Tag className="w-4 h-4 shrink-0" />
                <span className="capitalize">{category.replace("-", " ")}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground font-body">
                <Ticket className="w-4 h-4 shrink-0" />
                <span>{isFree ? "Free" : `${tickets.filter(t => t.name.trim()).length} ticket type(s)`}</span>
              </div>
            </div>

            {!isFree && tickets.filter(t => t.name.trim()).length > 0 && (
              <div className="border-t border-border pt-3 space-y-2">
                <h4 className="font-heading text-xs font-700 text-muted-foreground uppercase tracking-wider">Tickets</h4>
                {tickets.filter(t => t.name.trim()).map((t, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="font-body text-foreground">{t.name}</span>
                    <span className="font-heading font-700 text-amber">
                      NGN {parseFloat(t.price || "0").toLocaleString()} <span className="text-muted-foreground font-body font-400">x {t.quantity}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => handleSubmit("draft")} disabled={submitting} variant="ghost" className="flex-1 border border-border text-foreground hover:bg-card font-heading font-700">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Save as Draft
            </Button>
            <Button onClick={() => handleSubmit("published")} disabled={submitting} className="flex-1 bg-amber text-ink hover:bg-amber/90 font-heading font-700">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Publish Event
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateEvent;
