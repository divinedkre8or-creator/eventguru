import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { 
  X, Camera, SwitchCamera, Zap, ZapOff, Volume2, 
  VolumeX, Loader2, AlertCircle, ScanLine, Keyboard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { scannerAudio } from "@/lib/scannerAudio";
import { motion, AnimatePresence } from "framer-motion";

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => Promise<{ status: "success" | "already_checked_in" | "not_found" | "unpaid" }>;
  eventTitle?: string;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  eventTitle,
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "eventrally-qr-reader";

  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState<number>(0);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(scannerAudio.isSoundEnabled());
  const [isCooldown, setIsCooldown] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>("");
  const [isManualSubmitting, setIsManualSubmitting] = useState<boolean>(false);
  const [showManualInput, setShowManualInput] = useState<boolean>(false);

  const lastScannedCodeRef = useRef<string>("");
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Toggle audio
  const handleToggleSound = () => {
    const next = !soundEnabled;
    scannerAudio.setSoundEnabled(next);
    setSoundEnabled(next);
  };

  // Handle scanned token
  const handleDecoded = useCallback(
    async (decodedText: string) => {
      const trimmed = decodedText.trim();
      if (!trimmed) return;

      // Duplicate debounce: avoid re-scanning the exact same code within 3 seconds
      if (isCooldown && lastScannedCodeRef.current === trimmed) {
        return;
      }

      lastScannedCodeRef.current = trimmed;
      setIsCooldown(true);

      try {
        const result = await onScan(trimmed);
        if (result.status === "success") {
          scannerAudio.playSuccess();
        } else if (result.status === "already_checked_in") {
          scannerAudio.playWarning();
        } else {
          scannerAudio.playError();
        }
      } catch (err) {
        scannerAudio.playError();
      } finally {
        if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = setTimeout(() => {
          setIsCooldown(false);
          lastScannedCodeRef.current = "";
        }, 2200);
      }
    },
    [isCooldown, onScan]
  );

  // Start Scanner
  const startScanner = useCallback(
    async (cameraId?: string) => {
      try {
        setCameraError(null);
        if (scannerRef.current) {
          try {
            await scannerRef.current.stop();
          } catch {}
          scannerRef.current = null;
        }

        const html5QrCode = new Html5Qrcode(containerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.EAN_13,
          ],
          verbose: false,
        });
        scannerRef.current = html5QrCode;

        const config = {
          fps: 15,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0,
        };

        const targetCamera = cameraId
          ? { deviceId: { exact: cameraId } }
          : { facingMode: "environment" };

        await html5QrCode.start(
          targetCamera,
          config,
          (decodedText) => handleDecoded(decodedText),
          () => {} // suppress per-frame failure logs
        );

        setIsScanning(true);

        // Check torch capabilities
        try {
          const track = (html5QrCode as any).getRunningTrackCameraCapabilities?.();
          if (track && track.torchFeature && track.torchFeature().isSupported()) {
            setHasTorch(true);
          } else {
            setHasTorch(false);
          }
        } catch {
          setHasTorch(false);
        }
      } catch (err: any) {
        console.error("Camera start error:", err);
        setCameraError(
          err.message?.includes("Permission")
            ? "Camera permission denied. Please allow camera access in your browser settings to scan tickets."
            : "Unable to start camera scanner. Use manual code lookup below."
        );
        setIsScanning(false);
      }
    },
    [handleDecoded]
  );

  // Switch camera (front / rear)
  const handleSwitchCamera = async () => {
    if (cameras.length < 2) return;
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);
    await startScanner(cameras[nextIndex].id);
  };

  // Toggle Torch
  const handleToggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      await (scannerRef.current as any).applyVideoConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn("Torch toggle not supported:", e);
    }
  };

  // Initialize camera list on open
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!mounted) return;
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Pick rear/back camera if available
          const backCamIndex = devices.findIndex((d) =>
            d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("rear") || d.label.toLowerCase().includes("environment")
          );
          const initialIndex = backCamIndex >= 0 ? backCamIndex : 0;
          setCurrentCameraIndex(initialIndex);
          startScanner(devices[initialIndex].id);
        } else {
          startScanner();
        }
      })
      .catch((err) => {
        if (!mounted) return;
        console.warn("Could not enumerate cameras, falling back to facingMode:", err);
        startScanner();
      });

    return () => {
      mounted = false;
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch(() => {});
        } catch {}
        scannerRef.current = null;
      }
      setIsScanning(false);
    };
  }, [isOpen, startScanner]);

  // Handle manual code submit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    setIsManualSubmitting(true);
    await handleDecoded(manualCode.trim());
    setIsManualSubmitting(false);
    setManualCode("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-4 sm:p-6 text-white overflow-hidden select-none">
      {/* Top Header Controls */}
      <div className="w-full max-w-md flex items-center justify-between z-20">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-zinc-400">
              RAPID GATE SCANNER
            </span>
          </div>
          <h3 className="font-heading font-black text-sm text-white tracking-tight line-clamp-1">
            {eventTitle || "Gate Check-in"}
          </h3>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          {/* Torch toggle */}
          {hasTorch && (
            <button
              onClick={handleToggleTorch}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                torchOn ? "bg-amber-400 text-black font-bold" : "bg-white/10 text-white hover:bg-white/20"
              }`}
              title="Toggle flashlight"
            >
              {torchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}

          {/* Switch camera */}
          {cameras.length > 1 && (
            <button
              onClick={handleSwitchCamera}
              className="w-9 h-9 rounded-xl bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-colors"
              title="Switch camera"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          )}

          {/* Sound toggle */}
          <button
            onClick={handleToggleSound}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              soundEnabled ? "bg-white/10 text-emerald-400" : "bg-white/5 text-zinc-500"
            }`}
            title={soundEnabled ? "Audio chime active" : "Audio muted"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Close modal */}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center Viewport & Scanner Reticle */}
      <div className="relative w-full max-w-sm aspect-square my-auto flex items-center justify-center overflow-hidden rounded-3xl bg-zinc-950 border border-white/15 shadow-2xl">
        {/* HTML5 QR Code Mount Node */}
        <div id={containerId} className="w-full h-full object-cover" />

        {/* Custom HUD Overlays */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Viewfinder Target Box */}
            <div className="relative w-64 h-64 rounded-2xl border-2 border-emerald-500/30 overflow-hidden">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

              {/* Animated Laser Scanning Beam */}
              <motion.div
                animate={{ y: [0, 240, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#10b981]"
              />
            </div>
          </div>
        )}

        {/* Loading state before stream starts */}
        {!isScanning && !cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 text-zinc-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            <p className="text-xs font-mono font-medium">Initializing camera optical sensor...</p>
          </div>
        )}

        {/* Camera Permission / Error State */}
        {cameraError && (
          <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-zinc-950/95 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">Camera Access Required</h4>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-xs">{cameraError}</p>
            <Button
              onClick={() => startScanner()}
              variant="outline"
              className="text-xs font-bold border-white/20 hover:bg-white/10 text-white"
            >
              Retry Camera
            </Button>
          </div>
        )}

        {/* Cooldown feedback badge */}
        {isCooldown && (
          <div className="absolute top-4 inset-x-0 mx-auto w-fit px-3 py-1 rounded-full bg-emerald-500/90 text-black text-[10px] font-mono font-black tracking-wider uppercase shadow-lg">
            PROCESSING BADGE
          </div>
        )}
      </div>

      {/* Bottom Control Bar & Manual Fallback */}
      <div className="w-full max-w-md space-y-3 z-20">
        <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
          <span className="flex items-center gap-1.5 font-mono text-[11px]">
            <ScanLine className="w-3.5 h-3.5 text-emerald-400" />
            Point lens at attendee ticket QR code
          </span>
          <button
            onClick={() => setShowManualInput(!showManualInput)}
            className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <Keyboard className="w-3.5 h-3.5" />
            {showManualInput ? "Hide Keyboard" : "Enter Code"}
          </button>
        </div>

        {/* Manual Code Input Drawer */}
        <AnimatePresence>
          {showManualInput && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleManualSubmit}
              className="flex items-center gap-2 overflow-hidden"
            >
              <Input
                placeholder="Enter 8-digit ref (e.g. EVR-ORD-4A92)"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="bg-zinc-900 border-white/15 text-white placeholder:text-zinc-500 text-xs h-10 rounded-xl"
              />
              <Button
                type="submit"
                disabled={isManualSubmitting || !manualCode.trim()}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs h-10 px-4 rounded-xl shrink-0"
              >
                {isManualSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
