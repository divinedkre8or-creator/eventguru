import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, CheckCircle2, QrCode, Ticket, Loader2, ScanLine, Filter } from "lucide-react";
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
    queryKey: ["organiser-events-list-v2", user?.id],
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
    queryKey: ["checkin-attendees-v2", selectedEventId, user?.id],
    queryFn: async () => {
      let query = supabase
        .from("registrations")
        .select("*, events!inner(title, organiser_id), ticket_types(name)")
        .in("status", ["confirmed", "completed"])
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

  // 3. Mutation to toggle check-in status
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
      queryClient.setQueryData(["checkin-attendees-v2", selectedEventId, user?.id], (old: any) => {
        if (!old) return old;
        return old.map((a: any) => a.id === data.id ? { ...a, checked_in: data.checked_in } : a);
      });
      toast.success(data.checked_in ? "Attendee checked in!" : "Check-in reversed");
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
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-muted px-2.5 py-1 rounded inline-block mb-2 text-foreground">
            ON SITE MANAGEMENT
          </div>
          <h1 className="font-heading text-3xl font-black text-foreground tracking-tight">Rapid Check-in</h1>
          <p className="text-muted-foreground text-xs font-medium mt-1">Search attendees and process entry badges at the gate</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-card border border-border px-4 py-2 rounded-lg flex items-center gap-3 text-xs shadow-sm">
            <ScanLine className="w-4 h-4 text-chart-green" />
            <div>
              <div className="font-mono font-bold text-foreground">{checkedInCount} / {filteredAttendees.length}</div>
              <div className="text-[10px] text-muted-foreground">Checked In</div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Event Filter & Search */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-4 space-y-1.5">
          <label className="text-xs font-mono font-bold uppercase text-muted-foreground">SELECT EVENT</label>
          <select 
            className="w-full h-10 px-3 rounded-lg border border-border bg-card text-foreground text-xs font-medium focus:outline-none focus:border-primary"
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

        <div className="md:col-span-8 space-y-1.5">
          <label className="text-xs font-mono font-bold uppercase text-muted-foreground">SEARCH ATTENDEE</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search full name, email address, or order reference..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-card border-border text-xs rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Attendees Table / List Card */}
      <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
        {isLoadingEvents || isLoadingAttendees ? (
          <div className="flex flex-col items-center justify-center p-16 text-muted-foreground text-xs font-mono">
            <Loader2 className="w-7 h-7 animate-spin text-primary mb-3" />
            Fetching attendee manifests...
          </div>
        ) : filteredAttendees.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-muted-foreground text-center space-y-2">
            <Ticket className="w-10 h-10 text-muted-foreground/30" />
            <h3 className="font-heading font-bold text-base text-foreground">No attendees found</h3>
            <p className="text-xs text-muted-foreground max-w-xs">No confirmed registrations match your current event or search parameters.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredAttendees.map((a: any) => (
              <div key={a.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/40 transition-colors">
                
                <div className="flex items-center gap-3.5">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-mono font-bold text-xs ${
                    a.checked_in ? 'bg-chart-green/10 text-chart-green border border-chart-green/30' : 'bg-muted text-foreground border border-border'
                  }`}>
                    {a.checked_in ? <CheckCircle2 className="w-5 h-5" /> : a.full_name.charAt(0).toUpperCase()}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs text-foreground">{a.full_name}</h4>
                      {a.checked_in && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-chart-green text-white">
                          CHECKED IN
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-2 mt-0.5">
                      <span>{a.email}</span>
                      <span>•</span>
                      <span className="font-mono font-bold text-foreground">{(a.ticket_types as any)?.name}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <Button 
                    onClick={() => checkinMutation.mutate({ id: a.id, checked_in: !a.checked_in })}
                    disabled={checkinMutation.isPending}
                    variant={a.checked_in ? "outline" : "default"}
                    className={`h-9 px-4 text-xs font-bold rounded-lg transition-all ${
                      a.checked_in 
                        ? 'border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30' 
                        : 'bg-primary text-primary-foreground hover:opacity-90'
                    }`}
                  >
                    {checkinMutation.isPending && checkinMutation.variables?.id === a.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : a.checked_in ? (
                      "Reverse Check-In"
                    ) : (
                      "Check In Now"
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

