import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { 
  Camera, KeyRound, Search, CheckCircle2, AlertCircle, 
  Clock, ShieldCheck, Ticket, Users, RefreshCw, Loader2, ArrowLeft,
  Volume2, VolumeX, Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { SEOHead } from "@/components/seo/SEOHead";
import { QrScannerModal } from "@/components/checkin/QrScannerModal";
import { ScanResultOverlay, ScanResultData } from "@/components/checkin/ScanResultOverlay";
import { scannerAudio } from "@/lib/scannerAudio";
import { RollingCounter } from "@/components/ui/RollingCounter";
import { toast } from "sonner";

interface GateEvent {
  id: string;
  title: string;
  date: string;
  venue?: string;
  city?: string;
}

interface ManifestAttendee {
  id: string;
  full_name: string;
  ticket_type: string;
  checked_in: boolean;
  checked_in_at?: string;
  ref?: string;
}

export const Gatekeeper: React.FC = () => {
  const [searchParams] = useSearchParams();
  const urlEventId = searchParams.get("event") || "";
  const urlPin = searchParams.get("pin") || "";

  const [eventId, setEventId] = useState<string>(urlEventId);
  const [pin, setPin] = useState<string>(urlPin);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [eventData, setEventData] = useState<GateEvent | null>(null);

  // Manifest & Check-in Feed
  const [manifest, setManifest] = useState<ManifestAttendee[]>([]);
  const [isLoadingManifest, setIsLoadingManifest] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [recentScans, setRecentScans] = useState<ManifestAttendee[]>([]);

  // Scanner modal & result overlay
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<ScanResultData | null>(null);

  // Verify PIN and fetch event info
  const handleVerifyPin = useCallback(async (targetEventId: string, targetPin: string) => {
    if (!targetEventId || !targetPin) return;
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.rpc("verify_gatekeeper_pin", {
        p_event_id: targetEventId,
        p_pin: targetPin.trim(),
      });

      if (error) throw error;

      if (data?.valid && data?.event) {
        setEventData(data.event);
        setIsAuthenticated(true);
        // Save session
        sessionStorage.setItem("eventrally_gate_event", targetEventId);
        sessionStorage.setItem("eventrally_gate_pin", targetPin.trim());

        // Fetch manifest
        loadManifest(targetEventId, targetPin.trim());
      } else {
        toast.error(data?.error || "Invalid Gatekeeper PIN for this event");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to verify Gatekeeper PIN");
    } finally {
      setIsVerifying(false);
    }
  }, []);

  // Load manifest for offline resilience & fast search
  const loadManifest = async (tEventId: string, tPin: string) => {
    setIsLoadingManifest(true);
    const cacheKey = `gate_manifest_${tEventId}`;

    try {
      const { data, error } = await supabase.rpc("gatekeeper_get_manifest", {
        p_event_id: tEventId,
        p_pin: tPin,
      });

      if (!error && data?.ok && Array.isArray(data.attendees)) {
        setManifest(data.attendees);
        localStorage.setItem(cacheKey, JSON.stringify(data.attendees));
      } else {
        // Fallback to cache if network failure
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          setManifest(JSON.parse(cached));
          toast.info("Operating in cached offline manifest mode");
        }
      }
    } catch (err) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setManifest(JSON.parse(cached));
        toast.info("Offline mode active: loaded cached manifest");
      }
    } finally {
      setIsLoadingManifest(false);
    }
  };

  // Auto-verify on mount if params are present or saved
  useEffect(() => {
    const savedEvent = urlEventId || sessionStorage.getItem("eventrally_gate_event") || "";
    const savedPin = urlPin || sessionStorage.getItem("eventrally_gate_pin") || "";

    if (savedEvent && savedPin) {
      setEventId(savedEvent);
      setPin(savedPin);
      handleVerifyPin(savedEvent, savedPin);
    }
  }, [urlEventId, urlPin, handleVerifyPin]);

  // Process ticket scan
  const handleProcessScan = async (rawCode: string) => {
    try {
      const { data, error } = await supabase.rpc("gatekeeper_process_ticket", {
        p_event_id: eventId,
        p_pin: pin,
        p_ticket_query: rawCode,
      });

      if (error) throw error;

      const status = (data?.status || "not_found") as "success" | "already_checked_in" | "not_found" | "unpaid";

      const resData: ScanResultData = {
        status,
        message: data?.message,
        checkedInAt: data?.checked_in_at,
        attendee: data?.attendee,
      };

      setScanResult(resData);

      if (status === "success" && data?.attendee) {
        // Update manifest in state
        setManifest((prev) =>
          prev.map((a) => (a.id === data.attendee.id ? { ...a, checked_in: true, checked_in_at: new Date().toISOString() } : a))
        );
        // Add to recent scans
        setRecentScans((prev) => [
          {
            id: data.attendee.id,
            full_name: data.attendee.full_name,
            ticket_type: data.attendee.ticket_type,
            checked_in: true,
            checked_in_at: new Date().toISOString(),
          },
          ...prev.slice(0, 9),
        ]);
      }

      return { status };
    } catch (err: any) {
      // Offline fallback: check in against local manifest
      const clean = rawCode.trim().toLowerCase();
      const localMatch = manifest.find(
        (a) => a.id.toLowerCase() === clean || (a.ref && a.ref.toLowerCase() === clean)
      );

      if (localMatch) {
        if (localMatch.checked_in) {
          const resData: ScanResultData = {
            status: "already_checked_in",
            message: "Attendee already admitted (Local Cache)",
            checkedInAt: localMatch.checked_in_at,
            attendee: {
              id: localMatch.id,
              full_name: localMatch.full_name,
              ticket_type: localMatch.ticket_type,
            },
          };
          setScanResult(resData);
          return { status: "already_checked_in" as const };
        } else {
          localMatch.checked_in = true;
          localMatch.checked_in_at = new Date().toISOString();
          setManifest([...manifest]);

          const resData: ScanResultData = {
            status: "success",
            message: "Entry Approved (Offline Mode)",
            checkedInAt: localMatch.checked_in_at,
            attendee: {
              id: localMatch.id,
              full_name: localMatch.full_name,
              ticket_type: localMatch.ticket_type,
            },
          };
          setScanResult(resData);
          return { status: "success" as const };
        }
      }

      const resData: ScanResultData = {
        status: "not_found",
        message: "Ticket could not be verified.",
      };
      setScanResult(resData);
      return { status: "not_found" as const };
    }
  };

  // Filtered manifest for search
  const filteredManifest = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return manifest;
    return manifest.filter(
      (a) =>
        a.full_name.toLowerCase().includes(q) ||
        (a.ref && a.ref.toLowerCase().includes(q)) ||
        a.id.toLowerCase().includes(q)
    );
  }, [manifest, searchQuery]);

  const checkedInCount = useMemo(() => manifest.filter((a) => a.checked_in).length, [manifest]);
  const totalCount = manifest.length;

  // Render Gatekeeper PIN Form if not yet authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 sm:p-6 font-sans">
        <SEOHead title="Staff Gate Pass — EventRally" noIndex={true} />

        <div className="w-full max-w-sm mx-auto pt-6 flex items-center justify-between">
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <BrandLogo />
          </Link>
          <span className="text-[10px] font-mono font-bold uppercase bg-muted text-muted-foreground px-2.5 py-1 rounded-md">
            STAFF KIOSK
          </span>
        </div>

        <div className="w-full max-w-sm mx-auto my-auto py-8">
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h2 className="font-heading font-black text-xl text-foreground tracking-tight">
                Door Gate Pass
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Enter the 6-digit access PIN provided by the event organizer to unlock the mobile ticket scanner.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerifyPin(eventId, pin);
              }}
              className="space-y-4 pt-2"
            >
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold uppercase text-muted-foreground">
                  EVENT IDENTIFIER
                </label>
                <Input
                  placeholder="Event UUID or Code"
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  className="h-10 text-xs font-mono rounded-xl bg-background"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold uppercase text-muted-foreground">
                  6-DIGIT GATE PIN
                </label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="&bull; &bull; &bull; &bull; &bull; &bull;"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  className="h-12 text-center text-xl font-mono tracking-widest font-black rounded-xl bg-background"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isVerifying || !eventId || pin.length < 4}
                className="w-full bg-primary text-primary-foreground font-bold text-xs h-11 rounded-xl shadow-sm hover:opacity-90 active:scale-[0.98] transition-all"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>Verifying Access...</span>
                  </>
                ) : (
                  <span>Unlock Door Scanner</span>
                )}
              </Button>
            </form>

            <div className="pt-2 text-center">
              <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Protected staff kiosk mode. No financial data visible.
              </p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-sm mx-auto pb-4 text-center">
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" /> Return to EventRally
          </Link>
        </div>
      </div>
    );
  }

  // Render Kiosk Scanner View when authenticated
  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans antialiased flex flex-col justify-between selection:bg-emerald-500 selection:text-black">
      <SEOHead title={`Gate Pass — ${eventData?.title || "Check-in"}`} noIndex={true} />

      {/* Top Header Bar */}
      <header className="border-b border-white/10 bg-zinc-900/60 backdrop-blur-md px-4 py-3 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-emerald-400">
                GATEKEEPER ACTIVE
              </span>
            </div>
            <h1 className="font-heading font-black text-sm text-white truncate">
              {eventData?.title || "Door Check-in"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadManifest(eventId, pin)}
              disabled={isLoadingManifest}
              className="h-8 border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-mono"
              title="Refresh Manifest"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingManifest ? "animate-spin" : ""}`} />
            </Button>
            <button
              onClick={() => {
                sessionStorage.removeItem("eventrally_gate_pin");
                setIsAuthenticated(false);
              }}
              className="text-[10px] font-mono text-zinc-400 hover:text-white px-2 py-1 rounded bg-white/5"
            >
              LOCK
            </button>
          </div>
        </div>
      </header>

      {/* Main Kiosk Content */}
      <main className="max-w-2xl mx-auto w-full p-4 flex-1 space-y-5">
        {/* Statistics Hero Card */}
        <div className="bg-zinc-900/90 border border-white/10 rounded-2xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              ADMITTED AT DOOR
            </div>
            <div className="text-3xl font-black font-mono text-white tracking-tight flex items-baseline gap-2 mt-1">
              <RollingCounter value={checkedInCount} />
              <span className="text-zinc-500 text-lg font-normal">/ {totalCount}</span>
            </div>
            <div className="text-[11px] text-emerald-400 font-mono mt-1 font-bold">
              {totalCount > 0 ? `${Math.round((checkedInCount / totalCount) * 100)}% attendance rate` : "No attendees registered"}
            </div>
          </div>

          {/* Big Tactile Camera Scan Trigger Button */}
          <Button
            onClick={() => setIsScannerOpen(true)}
            className="h-16 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-black text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex flex-col items-center justify-center gap-1"
          >
            <Camera className="w-6 h-6 stroke-[2.5]" />
            <span className="text-[11px] font-mono tracking-wider uppercase">SCAN TICKET</span>
          </Button>
        </div>

        {/* Search Bar for manual lookup */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search attendee by name or reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-zinc-900/90 border-white/10 text-white placeholder:text-zinc-500 text-xs rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Attendee Manifest List */}
        <div className="bg-zinc-900/80 border border-white/10 rounded-2xl overflow-hidden shadow-lg">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              ATTENDEE MANIFEST ({filteredManifest.length})
            </span>
            <span className="text-[10px] font-mono text-zinc-500">TAP TO CHECK IN</span>
          </div>

          {isLoadingManifest && manifest.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-xs font-mono">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
              Loading guest manifests into gate cache...
            </div>
          ) : filteredManifest.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-xs font-mono">
              <Ticket className="w-8 h-8 mx-auto text-zinc-700 mb-2" />
              No attendees found matching search
            </div>
          ) : (
            <div className="divide-y divide-white/5 max-h-[50vh] overflow-y-auto">
              {filteredManifest.map((att) => (
                <div
                  key={att.id}
                  onClick={() => handleProcessScan(att.id)}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-white/5 cursor-pointer active:bg-white/10 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white truncate">{att.full_name}</span>
                      {att.checked_in && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          CHECKED IN
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-2 mt-0.5">
                      <span className="text-zinc-300 font-bold">{att.ticket_type}</span>
                      {att.ref && <span>&bull; {att.ref.slice(-8).toUpperCase()}</span>}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={att.checked_in ? "outline" : "default"}
                    className={`h-8 px-3 text-[11px] font-bold rounded-lg ${
                      att.checked_in
                        ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10 pointer-events-none"
                        : "bg-emerald-500 text-black hover:bg-emerald-400"
                    }`}
                  >
                    {att.checked_in ? (
                      <span className="flex items-center gap-1 font-mono text-[10px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> IN
                      </span>
                    ) : (
                      "Admit"
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Floating Camera Button (Mobile Quick Tap) */}
      <div className="fixed bottom-6 right-6 z-40 sm:hidden">
        <button
          onClick={() => setIsScannerOpen(true)}
          className="w-14 h-14 rounded-full bg-emerald-500 active:scale-95 text-black shadow-lg shadow-emerald-950 flex items-center justify-center font-bold"
          aria-label="Scan QR Code"
        >
          <Camera className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* Camera QR Scanner Modal */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleProcessScan}
        eventTitle={eventData?.title}
      />

      {/* Audio / Visual Scan Feedback Overlay */}
      <ScanResultOverlay
        result={scanResult}
        onDismiss={() => setScanResult(null)}
      />
    </div>
  );
};

export default Gatekeeper;
