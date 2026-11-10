import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, Clock, Ticket, X } from "lucide-react";

export type ScanStatus = "success" | "already_checked_in" | "not_found" | "unpaid";

export interface ScanResultData {
  status: ScanStatus;
  message?: string;
  checkedInAt?: string;
  attendee?: {
    id?: string;
    full_name?: string;
    ticket_type?: string;
    reference?: string;
  };
}

interface ScanResultOverlayProps {
  result: ScanResultData | null;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export const ScanResultOverlay: React.FC<ScanResultOverlayProps> = ({
  result,
  onDismiss,
  autoDismissMs = 2600,
}) => {
  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, autoDismissMs);
    return () => clearTimeout(timer);
  }, [result, onDismiss, autoDismissMs]);

  if (!result) return null;

  const isSuccess = result.status === "success";
  const isAlready = result.status === "already_checked_in";
  const isDenied = result.status === "not_found" || result.status === "unpaid";

  const formattedTime = result.checkedInAt
    ? new Date(result.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ type: "spring", stiffness: 450, damping: 30 }}
        onClick={onDismiss}
        className="fixed inset-x-4 bottom-6 sm:bottom-8 sm:inset-x-auto sm:right-8 sm:w-96 z-50 cursor-pointer select-none"
      >
        <div
          className={`rounded-2xl p-5 shadow-2xl border backdrop-blur-xl transition-all ${
            isSuccess
              ? "bg-zinc-950/95 text-white border-emerald-500/40 shadow-emerald-950/40 ring-2 ring-emerald-500/20"
              : isAlready
              ? "bg-zinc-950/95 text-white border-amber-500/40 shadow-amber-950/40 ring-2 ring-amber-500/20"
              : "bg-zinc-950/95 text-white border-rose-500/40 shadow-rose-950/40 ring-2 ring-rose-500/20"
          }`}
        >
          {/* Top Status Banner */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isSuccess
                    ? "bg-emerald-500/20 text-emerald-400"
                    : isAlready
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-rose-500/20 text-rose-400"
                }`}
              >
                {isSuccess && <CheckCircle2 className="w-5 h-5" />}
                {isAlready && <AlertTriangle className="w-5 h-5" />}
                {isDenied && <XCircle className="w-5 h-5" />}
              </div>
              <div>
                <span
                  className={`text-[11px] font-mono font-black uppercase tracking-wider block ${
                    isSuccess ? "text-emerald-400" : isAlready ? "text-amber-400" : "text-rose-400"
                  }`}
                >
                  {isSuccess ? "ENTRY APPROVED" : isAlready ? "ALREADY CHECKED IN" : "ADMISSION DENIED"}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {formattedTime}
                </span>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Attendee Details */}
          <div className="pt-3.5 space-y-2">
            {result.attendee?.full_name ? (
              <div>
                <h4 className="text-base font-black tracking-tight text-white line-clamp-1">
                  {result.attendee.full_name}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white/10 text-emerald-300 text-[10px] font-mono font-bold uppercase">
                    <Ticket className="w-3 h-3" />
                    {result.attendee.ticket_type || "Standard Admission"}
                  </span>
                  {result.attendee.reference && (
                    <span className="text-[10px] font-mono text-zinc-400">
                      REF: {result.attendee.reference.slice(-8).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                {result.message || "This pass code could not be verified in the event registry."}
              </p>
            )}

            {isAlready && (
              <p className="text-[11px] text-amber-300/90 font-medium bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                This badge has already been used for entry. Check attendee ID or supervisor override.
              </p>
            )}

            {isDenied && result.attendee?.full_name && (
              <p className="text-[11px] text-rose-300/90 font-medium bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                {result.message || "Unconfirmed order status. Ticket invalid."}
              </p>
            )}
          </div>

          {/* Tap hint */}
          <div className="pt-3 text-center">
            <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">
              TAP ANYWHERE TO DISMISS &bull; READY FOR NEXT SCAN
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
