import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Search, CheckCircle2, QrCode, Ticket, Loader2, ScanLine, 
  Camera, Users, KeyRound, ExternalLink, ShieldCheck, RefreshCw 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { QrScannerModal } from "@/components/checkin/QrScannerModal";
import { ScanResultOverlay, ScanResultData } from "@/components/checkin/ScanResultOverlay";
import { StaffGatePassModal } from "@/components/checkin/StaffGatePassModal";
import { RollingCounter } from "@/components/ui/RollingCounter";
import { scannerAudio } from "@/lib/scannerAudio";
import { toast } from "sonner";

const Checkin = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResultData | null>(null);

  // 1. Fetch organizer's events (including gatekeeper_pin)
  const { data: events = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ["organiser-events-list-v3", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, date, gatekeeper_pin")
        .eq("organiser_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Array<{ id: string; title: string; date: string; gatekeeper_pin?: string }>;
    },
    enabled: !!user?.id,
  });

  // Current active event for gate pass
  const activeEvent = useMemo(() => {
    if (selectedEventId !== "all") {
      return events.find((e) => e.id === selectedEventId) || events[0] || null;
    }
    return events[0] || null;
  }, [events, selectedEventId]);

  // 2. Fetch attendees (registrations) for selected event
  const { data: attendees = [], isLoading: isLoadingAttendees, refetch: refetchAttendees } = useQuery({
    queryKey: ["checkin-attendees-v3", selectedEventId, user?.id],
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
        .update({ checked_in, checked_in_at: checked_in ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
      return { id, checked_in };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["checkin-attendees-v3", selectedEventId, user?.id], (old: any) => {
        if (!old) return old;
        return old.map((a: any) => (a.id === data.id ? { ...a, checked_in: data.checked_in } : a));
      });
      if (data.checked_in) {
        scannerAudio.playSuccess();
        toast.success("Attendee checked in!");
      } else {
        toast.info("Check-in reversed");
      }
    },
    onError: (error: any) => {
      scannerAudio.playError();
      toast.error(error.message || "Failed to update check-in status");
    },
  });

  // Scanner handler (processes ticket scanned via camera)
  const handleScannerDecode = async (rawCode: string) => {
    let cleanCode = rawCode.trim();

    // Parse JSON QR payloads
    if (cleanCode.startsWith("{") && cleanCode.endsWith("}")) {
      try {
        const parsed = JSON.parse(cleanCode);
        cleanCode = parsed.id || parsed.ref || cleanCode;
      } catch {}
    }

    // Extract UUID from URL
    const uuidMatch = cleanCode.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (uuidMatch) {
      cleanCode = uuidMatch[0];
    }

    // Find match in current attendee manifest
    const match = attendees.find((a: any) => {
      const cleanAId = (a.id || "").toLowerCase();
      const cleanRef = (a.payment_reference || "").toLowerCase();
      const target = cleanCode.toLowerCase();
      return cleanAId === target || cleanRef === target || cleanAId.replace(/-/g, "") === target.replace(/-/g, "");
    });

    if (!match) {
      setScanResult({
        status: "not_found",
        message: "No matching attendee found in your current events manifest.",
      });
      return { status: "not_found" as const };
    }

    if (match.checked_in) {
      setScanResult({
        status: "already_checked_in",
        message: "Attendee already admitted",
        checkedInAt: match.checked_in_at,
        attendee: {
          id: match.id,
          full_name: match.full_name,
          ticket_type: (match.ticket_types as any)?.name || "Standard",
          reference: match.payment_reference,
        },
      });
      return { status: "already_checked_in" as const };
    }

    // Mark as checked in
    try {
      await checkinMutation.mutateAsync({ id: match.id, checked_in: true });
      setScanResult({
        status: "success",
        message: "Entry Approved",
        checkedInAt: new Date().toISOString(),
        attendee: {
          id: match.id,
          full_name: match.full_name,
          ticket_type: (match.ticket_types as any)?.name || "Standard",
          reference: match.payment_reference,
        },
      });
      return { status: "success" as const };
    } catch {
      setScanResult({
        status: "not_found",
        message: "Failed to record check-in on the database.",
      });
      return { status: "not_found" as const };
    }
  };

  const filteredAttendees = attendees.filter((a: any) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const cleanId = (a.id || "").replace(/-/g, "").toLowerCase();
    const cleanQ = q.replace(/^evr-?/i, "").replace(/-/g, "").toLowerCase();
    return (
      a.full_name?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      a.payment_reference?.toLowerCase().includes(q) ||
      a.id?.toLowerCase().includes(q) ||
      (cleanQ.length >= 4 && cleanId.startsWith(cleanQ))
    );
  });

  const checkedInCount = filteredAttendees.filter((a: any) => a.checked_in).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12 w-full min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6 w-full min-w-0">
        <div>
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-muted px-2.5 py-1 rounded inline-block mb-2 text-foreground">
            ON SITE MANAGEMENT
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Rapid Check-in
          </h1>
          <p className="text-muted-foreground text-xs font-medium mt-1">
            Scan attendee QR badges with camera or delegate gatekeeper PIN access to ushers
          </p>
        </div>

        {/* Action Buttons: Camera Scanner & Staff Gate Pass */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Staff Gate Pass Button */}
          {activeEvent && (
            <Button
              onClick={() => setIsStaffModalOpen(true)}
              variant="outline"
              className="h-10 px-3.5 border-border bg-card hover:bg-muted text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm"
            >
              <KeyRound className="w-4 h-4 text-primary" />
              <span>Staff Gate Pass</span>
            </Button>
          )}

          {/* Launch Camera Scanner Button */}
          <Button
            onClick={() => setIsScannerOpen(true)}
            className="h-10 px-4 bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all"
          >
            <Camera className="w-4 h-4" />
            <span>Open Camera Scanner</span>
          </Button>

          {/* Checked-in Stat Counter */}
          <div className="bg-card border border-border px-4 py-2 rounded-xl flex items-center gap-3 text-xs shadow-sm">
            <ScanLine className="w-4 h-4 text-emerald-500" />
            <div>
              <div className="font-mono font-bold text-foreground flex items-center gap-1">
                <RollingCounter value={checkedInCount} /> / {filteredAttendees.length}
              </div>
              <div className="text-[10px] text-muted-foreground">Checked In</div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Event Filter & Search */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 w-full min-w-0">
        <div className="md:col-span-4 space-y-1.5 min-w-0">
          <label className="text-xs font-mono font-bold uppercase text-muted-foreground">SELECT EVENT</label>
          <select
            className="w-full h-10 px-3 rounded-xl border border-border bg-card text-foreground text-xs font-medium focus:outline-none focus:border-primary"
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

        <div className="md:col-span-8 space-y-1.5 min-w-0">
          <label className="text-xs font-mono font-bold uppercase text-muted-foreground">SEARCH ATTENDEE</label>
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search full name, email address, or order reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-card border-border text-xs rounded-xl w-full"
            />
          </div>
        </div>
      </div>

      {/* Attendees Table / List Card */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        {isLoadingEvents || isLoadingAttendees ? (
          <div className="flex flex-col items-center justify-center p-16 text-muted-foreground text-xs font-mono">
            <Loader2 className="w-7 h-7 animate-spin text-primary mb-3" />
            Fetching attendee manifests...
          </div>
        ) : filteredAttendees.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-muted-foreground text-center space-y-2">
            <Ticket className="w-10 h-10 text-muted-foreground/30" />
            <h3 className="font-heading font-bold text-base text-foreground">No attendees found</h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              No confirmed registrations match your current event or search parameters.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border w-full min-w-0">
            {filteredAttendees.map((a: any) => (
              <div
                key={a.id}
                className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-muted/40 transition-colors w-full min-w-0"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-mono font-bold text-xs ${
                      a.checked_in
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                        : "bg-muted text-foreground border border-border"
                    }`}
                  >
                    {a.checked_in ? <CheckCircle2 className="w-5 h-5" /> : a.full_name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-xs text-foreground truncate">{a.full_name}</h4>
                      {a.checked_in && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-500 text-white shrink-0">
                          CHECKED IN
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5 break-all">
                      <span className="truncate max-w-[200px] sm:max-w-none">{a.email}</span>
                      <span>&bull;</span>
                      <span className="font-mono font-bold text-foreground">
                        {(a.ticket_types as any)?.name || "Standard Pass"}
                      </span>
                      {a.payment_reference && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          ({a.payment_reference.slice(-8).toUpperCase()})
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
                  <Button
                    onClick={() => checkinMutation.mutate({ id: a.id, checked_in: !a.checked_in })}
                    disabled={checkinMutation.isPending}
                    variant={a.checked_in ? "outline" : "default"}
                    className={`w-full sm:w-auto h-9 px-4 text-xs font-bold rounded-xl transition-all active:scale-[0.98] ${
                      a.checked_in
                        ? "border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                        : "bg-primary text-primary-foreground hover:opacity-90"
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

      {/* Live Camera Scanner Modal */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScannerDecode}
        eventTitle={activeEvent?.title}
      />

      {/* Staff Gate Pass PIN Modal */}
      {activeEvent && (
        <StaffGatePassModal
          isOpen={isStaffModalOpen}
          onClose={() => setIsStaffModalOpen(false)}
          eventId={activeEvent.id}
          eventTitle={activeEvent.title}
          gatekeeperPin={activeEvent.gatekeeper_pin || "123456"}
          onPinRegenerated={(newPin) => {
            queryClient.setQueryData(["organiser-events-list-v3", user?.id], (old: any) => {
              if (!old) return old;
              return old.map((e: any) => (e.id === activeEvent.id ? { ...e, gatekeeper_pin: newPin } : e));
            });
          }}
        />
      )}

      {/* Sensory Audio / Visual Feedback Overlay */}
      <ScanResultOverlay
        result={scanResult}
        onDismiss={() => setScanResult(null)}
      />
    </div>
  );
};

export default Checkin;
