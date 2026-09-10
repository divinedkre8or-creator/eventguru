import React, { useState } from "react";
import { 
  Download, Calendar, Share2, Image as ImageIcon, Check, 
  Copy, Loader2, ExternalLink, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  downloadTicketAsPng, 
  downloadIcsCalendarFile, 
  getGoogleCalendarUrl, 
  getSocialShareIntents, 
  copyToClipboard,
  formatTicketCode,
  TicketExportData
} from "@/lib/ticketUtils";
import { Link } from "react-router-dom";
import { getEventDpUrl } from "@/lib/slugUtils";

interface TicketActionsProps {
  registration: {
    id: string;
    full_name: string;
    email: string;
    ticket_type_id?: string | null;
  };
  event: {
    id: string;
    title: string;
    date: string;
    venue?: string | null;
    city?: string | null;
    category?: string | null;
    custom_slug?: string | null;
  };
  ticketTierName?: string;
  ticketDomId: string;
  className?: string;
}

export const TicketActions: React.FC<TicketActionsProps> = ({
  registration,
  event,
  ticketTierName = "Standard Pass",
  ticketDomId,
  className = "",
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const ticketCode = formatTicketCode(registration.id);

  const exportData: TicketExportData = {
    id: registration.id,
    ticketCode,
    fullName: registration.full_name,
    email: registration.email,
    ticketTierName,
    eventTitle: event.title,
    eventDate: event.date,
    eventVenue: event.venue || undefined,
    eventCity: event.city || undefined,
    eventCategory: event.category || undefined,
  };

  const canonicalUrl = `${window.location.origin}/tickets/${registration.id}`;
  const socialIntents = getSocialShareIntents(event.title, canonicalUrl, ticketCode);

  const handleDownloadPng = async () => {
    setIsDownloading(true);
    const filename = `EventRally-Ticket-${ticketCode}`;
    await downloadTicketAsPng(ticketDomId, filename);
    setIsDownloading(false);
  };

  const handleAddGoogleCalendar = () => {
    const url = getGoogleCalendarUrl(exportData);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDownloadIcs = () => {
    downloadIcsCalendarFile(exportData);
  };

  return (
    <div className={`w-full max-w-md mx-auto space-y-3 font-sans ${className}`}>
      {/* Primary Action Buttons Row */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Download Ticket PNG */}
        <Button
          onClick={handleDownloadPng}
          disabled={isDownloading}
          className="w-full bg-primary text-primary-foreground font-bold text-xs h-10 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          {isDownloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span>{isDownloading ? "Generating..." : "Download Pass"}</span>
        </Button>

        {/* Add to Calendar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full border-border bg-card hover:bg-muted text-foreground font-bold text-xs h-10 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Calendar className="w-4 h-4 text-secondary" />
              <span>Add to Calendar</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-auto" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover border-border rounded-xl shadow-lg p-1">
            <DropdownMenuItem
              onClick={handleAddGoogleCalendar}
              className="text-xs font-semibold cursor-pointer py-2 px-3 rounded-lg hover:bg-muted flex items-center justify-between"
            >
              <span>Google Calendar</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDownloadIcs}
              className="text-xs font-semibold cursor-pointer py-2 px-3 rounded-lg hover:bg-muted flex items-center justify-between"
            >
              <span>Apple / Outlook (.ics)</span>
              <Download className="w-3.5 h-3.5 opacity-60" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Secondary Row: Share & Event DP Flier */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Share That You're Going Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full border-border bg-card hover:bg-muted text-foreground font-bold text-xs h-10 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Share2 className="w-4 h-4 text-foreground" />
              <span>Share Pass</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-auto" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52 bg-popover border-border rounded-xl shadow-lg p-1">
            <DropdownMenuItem
              onClick={() => window.open(socialIntents.twitter, "_blank", "noopener,noreferrer")}
              className="text-xs font-semibold cursor-pointer py-2 px-3 rounded-lg hover:bg-muted flex items-center justify-between"
            >
              <span>Share on X (Twitter)</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => window.open(socialIntents.whatsapp, "_blank", "noopener,noreferrer")}
              className="text-xs font-semibold cursor-pointer py-2 px-3 rounded-lg hover:bg-muted flex items-center justify-between"
            >
              <span>Share on WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => window.open(socialIntents.linkedin, "_blank", "noopener,noreferrer")}
              className="text-xs font-semibold cursor-pointer py-2 px-3 rounded-lg hover:bg-muted flex items-center justify-between"
            >
              <span>Share on LinkedIn</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => copyToClipboard(canonicalUrl, "Ticket link")}
              className="text-xs font-semibold cursor-pointer py-2 px-3 rounded-lg hover:bg-muted flex items-center justify-between border-t border-border/50 mt-1 pt-2"
            >
              <span>Copy Ticket Link</span>
              <Copy className="w-3.5 h-3.5 opacity-60" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Create Event DP Flier */}
        <Link to={getEventDpUrl(event)} className="w-full">
          <Button
            variant="outline"
            className="w-full border-secondary/40 bg-secondary/10 hover:bg-secondary/20 text-secondary font-bold text-xs h-10 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Create Event DP</span>
          </Button>
        </Link>
      </div>
    </div>
  );
};
