import React from "react";
import { CheckCircle2, ShieldCheck, MapPin, Calendar, Users, Award } from "lucide-react";

export interface HostAchievementFlyerProps {
  eventTitle: string;
  organiserName: string;
  category?: string;
  dateStr: string;
  venueName: string;
  totalAttendees: number;
  checkedInCount: number;
  checkinPercentage: number;
  eventId: string;
}

/**
 * HostAchievementFlyer — Professional Host Verification & Performance Pass.
 * Designed in the style of high-end Nigerian creative studios:
 * High contrast, razor-sharp editorial typography, strict monochrome + royal blue palette.
 * Zero AI slop, zero random gradients, zero sparkles.
 */
export const HostAchievementFlyer = React.forwardRef<HTMLDivElement, HostAchievementFlyerProps>(
  (
    {
      eventTitle,
      organiserName,
      category = "Conference",
      dateStr,
      venueName,
      totalAttendees,
      checkedInCount,
      checkinPercentage,
      eventId,
    },
    ref
  ) => {
    const formattedRefId = `EG-VERIFIED-${eventId.slice(0, 8).toUpperCase()}`;

    return (
      <div
        ref={ref}
        id="host-achievement-flyer"
        className="w-full max-w-[540px] mx-auto bg-[#0A0E17] text-white p-6 sm:p-8 rounded-xl border border-slate-800 shadow-2xl relative overflow-hidden font-sans select-none"
        style={{
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.7)",
        }}
      >
        {/* Top Crisp Hairline Border Indicator */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#0058BE]" />

        {/* Outer Frame Box */}
        <div className="border border-slate-800/80 rounded-lg p-5 sm:p-6 space-y-6 relative bg-[#0D121F]/60">
          
          {/* Header Row: Brand + Official Verification Stamp */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-[#0058BE] flex items-center justify-center font-black text-xs text-white tracking-tighter">
                ER
              </div>
              <div>
                <span className="font-extrabold text-sm tracking-wider uppercase text-white block">
                  EVENTRALLY
                </span>
                <span className="text-[9px] font-mono font-semibold tracking-widest uppercase text-slate-300 block -mt-0.5">
                  EVENT OPERATING SYSTEM
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-700/80">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0058BE]" />
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-300">
                OFFICIAL RECORD
              </span>
            </div>
          </div>

          {/* Event Category Badge & Status */}
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              {category.replace(/-/g, " ")} &bull; CONCLUDED
            </span>
            <span className="text-slate-400 tracking-wider">
              {formattedRefId}
            </span>
          </div>

          {/* Event Title & Organizer Name */}
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-black text-white leading-tight tracking-tight uppercase line-clamp-2">
              {eventTitle}
            </h1>
            <div className="flex items-center gap-2 pt-1 text-slate-300 text-xs sm:text-sm">
              <span className="font-mono text-slate-400 text-[11px] uppercase tracking-wider">
                HOSTED BY:
              </span>
              <span className="font-bold text-white tracking-wide">
                {organiserName}
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            </div>
          </div>

          {/* Logistics Metadata Line */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-md p-3 text-xs text-slate-300 space-y-1.5">
            <div className="flex items-center gap-2 truncate">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-medium truncate">{dateStr}</span>
            </div>
            <div className="flex items-center gap-2 truncate">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-medium truncate">{venueName}</span>
            </div>
          </div>

          {/* Verified Performance Metrics Grid */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div className="bg-[#0A0E17] border border-slate-800 rounded-lg p-3 text-center">
              <div className="text-[9px] font-mono font-bold text-sky-400 uppercase tracking-wider mb-1">
                ADMISSIONS
              </div>
              <div className="text-lg sm:text-xl font-black text-white font-mono leading-none">
                {totalAttendees}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Issued Passes
              </div>
            </div>

            <div className="bg-[#0A0E17] border border-slate-800 rounded-lg p-3 text-center">
              <div className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-wider mb-1">
                CHECKED-IN
              </div>
              <div className="text-lg sm:text-xl font-black text-emerald-400 font-mono leading-none">
                {checkedInCount}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Gate Validated
              </div>
            </div>

            <div className="bg-[#0A0E17] border border-slate-800 rounded-lg p-3 text-center">
              <div className="text-[9px] font-mono font-bold text-violet-400 uppercase tracking-wider mb-1">
                TURNOUT
              </div>
              <div className="text-lg sm:text-xl font-black text-violet-400 font-mono leading-none">
                {checkinPercentage}%
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Gate Efficiency
              </div>
            </div>
          </div>

          {/* Official Verification Seal & Platform Attribution Footer */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full border border-[#0058BE]/40 flex items-center justify-center bg-blue-950/30">
                <Award className="w-3.5 h-3.5 text-[#0058BE]" />
              </div>
              <div>
                <div className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-200">
                  VERIFIED HOST COMPLIANCE
                </div>
                <div className="text-[9px] text-slate-400 font-mono">
                  AUTHENTICATED BY EVENTRALLY PROTOCOL
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-mono font-bold text-slate-300">
                GETEVENTRALLY.COM
              </div>
              <div className="text-[9px] text-slate-400 font-mono">
                WHERE EVENTS LIVE
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }
);

HostAchievementFlyer.displayName = "HostAchievementFlyer";

