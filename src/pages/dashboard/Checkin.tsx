import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, CheckCircle2, QrCode, Ticket, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Checkin = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Fetch organizer's events
  const { data: events = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ["organiser-events-list", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, date")
        .eq("organiser_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // 2. Fetch attendees (registrations) for selected event
  const { data: attendees = [], isLoading: isLoadingAttendees } = useQuery({
    queryKey: ["checkin-attendees", selectedEventId, user?.id],
    queryFn: async () => {
      let query = supabase
        .from("registrations")
        .select("*, events!inner(title, organiser_id), ticket_types(name)")
        .eq("status", "confirmed")
        .eq("events.organiser_id", user!.id)
        .order("created_at", { ascending: false });

      if (selectedEventId !== "all") {
        query = query.eq("event_id", selectedEventId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // 3. Mutation to toggle check-in
  const checkinMutation = useMutation({
    mutationFn: async ({ id, checked_in }: { id: string; checked_in: boolean }) => {
      const { error } = await supabase
        .from("registrations")
        .update({ checked_in })
        .eq("id", id);
      if (error) throw error;
      return { id, checked_in };
    },
    onSuccess: (data) => {
      // Optimistically update cache or just invalidate
      queryClient.setQueryData(["checkin-attendees", selectedEventId, user?.id], (old: any) => {
        if (!old) return old;
        return old.map((a: any) => a.id === data.id ? { ...a, checked_in: data.checked_in } : a);
      });
      toast.success(data.checked_in ? "Guest checked in!" : "Check-in reversed");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update check-in status");
    }
  });

  const filteredAttendees = attendees.filter((a: any) => {
    const q = searchQuery.toLowerCase();
    return a.full_name?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q) || a.payment_reference?.toLowerCase().includes(q);
  });

  const checkedInCount = filteredAttendees.filter((a: any) => a.checked_in).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-[DM_Sans]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-foreground">Rapid Check-in</h1>
          <p className="text-muted-foreground text-sm mt-1">Search and mark attendees as arrived at the venue.</p>
        </div>
        
        {/* Future QR Scanner Hook */}
        <Button disabled variant="outline" className="border-border text-foreground hover:bg-secondary hidden sm:flex">
          <QrCode className="w-4 h-4 mr-2" /> Scanner (Coming Soon)
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-4 space-y-2">
          <label className="text-sm font-bold text-foreground">Select Event</label>
          <select 
            className="w-full h-11 px-3 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
          >
            <option value="all">All Active Events</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title} ({new Date(e.date).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-8 space-y-2">
           <label className="text-sm font-bold text-foreground flex justify-between">
              <span>Search Attendees</span>
              <span className="text-primary">{checkedInCount} / {filteredAttendees.length} Checked In</span>
           </label>
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
             <Input 
               placeholder="Search name, email, or reference ID..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="pl-10 h-11 bg-card border-border text-foreground"
             />
           </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        {isLoadingEvents || isLoadingAttendees ? (
           <div className="flex flex-col items-center justify-center p-20 text-muted-foreground">
             <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
             Loading attendees...
           </div>
        ) : filteredAttendees.length === 0 ? (
           <div className="flex flex-col items-center justify-center p-20 text-muted-foreground text-center">
             <Ticket className="w-12 h-12 mb-4 text-muted-foreground/30" />
             <h3 className="font-heading font-bold text-lg text-foreground mb-1">No attendees found</h3>
             <p className="text-sm">No confirmed registrations match your criteria.</p>
           </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredAttendees.map((a: any) => (
              <div key={a.id} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/50 transition-colors">
                
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                     a.checked_in ? 'bg-emerald-500/20 text-emerald-500' : 'bg-primary/10 text-primary'
                  }`}>
                    {a.checked_in ? <CheckCircle2 className="w-6 h-6" /> : <span className="font-heading font-bold text-lg">{a.full_name.charAt(0)}</span>}
                  </div>
                  
                  <div>
                    <h4 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
                       {a.full_name}
                       {a.checked_in && <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-white">In Venue</span>}
                    </h4>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
                       <span>{a.email}</span>
                       <span className="hidden sm:inline">•</span>
                       <span className="font-medium text-foreground">{(a.ticket_types as any)?.name}</span>
                    </p>
                    {selectedEventId === "all" && (
                       <p className="text-xs text-primary font-medium mt-1 truncate max-w-[250px] sm:max-w-md">{(a.events as any)?.title}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end">
                   <Button 
                      onClick={() => checkinMutation.mutate({ id: a.id, checked_in: !a.checked_in })}
                      disabled={checkinMutation.isPending}
                      variant={a.checked_in ? "outline" : "default"}
                      className={`min-w-[120px] font-heading font-bold h-11 ${
                         a.checked_in 
                          ? 'border-border text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30' 
                          : 'bg-primary text-primary-foreground hover:brightness-110'
                      }`}
                   >
                     {checkinMutation.isPending && checkinMutation.variables?.id === a.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                     ) : a.checked_in ? (
                        "Reverse Check-in"
                     ) : (
                        "Check In"
                     )}
                   </Button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default Checkin;
