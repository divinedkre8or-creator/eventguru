// src/components/admin/sms/SmsCampaignsTab.tsx
import { useState } from "react";
import {
  Search,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  Loader2,
  Filter,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CampaignRecipientsModal } from "./CampaignRecipientsModal";
import { estimateDeliveryRate } from "@/lib/smsCalculations";

export interface SmsCampaignRecord {
  id: string;
  subject: string;
  body: string;
  status: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  organiser_name: string;
  event_title: string;
}

interface SmsCampaignsTabProps {
  campaigns: SmsCampaignRecord[];
  loading: boolean;
  onRefresh: () => void;
}

export function SmsCampaignsTab({
  campaigns,
  loading,
}: SmsCampaignsTabProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCampaignForInspect, setSelectedCampaignForInspect] = useState<{
    id: string;
    subject: string;
  } | null>(null);

  const filtered = campaigns.filter((c) => {
    const matchesStatus =
      statusFilter === "all" || c.status.toLowerCase() === statusFilter.toLowerCase();
    const query = search.toLowerCase();
    const matchesSearch =
      c.subject.toLowerCase().includes(query) ||
      c.body.toLowerCase().includes(query) ||
      c.organiser_name.toLowerCase().includes(query) ||
      c.event_title.toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns, events, organizers..."
            className="pl-9 text-xs h-9"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <div className="flex rounded-lg border border-border p-0.5 bg-muted/30">
            {["all", "sent", "sending", "failed"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium capitalize transition-all ${
                  statusFilter === st
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {st === "all" ? `All (${campaigns.length})` : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="border rounded-xl bg-card overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs">Loading campaign telemetry...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-xs">
            No bulk SMS campaigns found matching the filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-muted/40 text-muted-foreground text-[11px] font-semibold border-b">
                <tr>
                  <th className="p-3">Campaign / Message</th>
                  <th className="p-3">Event &amp; Organiser</th>
                  <th className="p-3">Recipients</th>
                  <th className="p-3">Delivered</th>
                  <th className="p-3">Delivery %</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Dispatched At</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((c) => {
                  const rate = estimateDeliveryRate(c.sent_count, c.failed_count);
                  return (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 max-w-[240px]">
                        <div className="font-semibold text-foreground truncate">
                          {c.subject || "Bulk SMS Broadcast"}
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {c.body}
                        </p>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-foreground">{c.event_title || "All Events"}</div>
                        <div className="text-[11px] text-muted-foreground">{c.organiser_name}</div>
                      </td>
                      <td className="p-3 font-mono font-medium text-foreground">
                        {c.recipient_count.toLocaleString()}
                      </td>
                      <td className="p-3 font-mono text-emerald-600 font-semibold">
                        {c.sent_count.toLocaleString()}
                        {c.failed_count > 0 && (
                          <span className="text-red-500 text-[11px] ml-1">
                            ({c.failed_count} failed)
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[11px] text-foreground">
                            {rate}%
                          </span>
                          <div className="w-12 bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${
                                rate >= 90
                                  ? "bg-emerald-500"
                                  : rate >= 70
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                              }`}
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {c.status === "sent" ? (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-500/20 bg-emerald-500/10 text-[10px] gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </Badge>
                        ) : c.status === "sending" ? (
                          <Badge variant="outline" className="text-blue-500 border-blue-500/20 bg-blue-500/10 text-[10px] gap-1">
                            <Clock className="w-3 h-3 animate-spin" />
                            Sending
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-500 border-red-500/20 bg-red-500/10 text-[10px] gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {c.status}
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground font-mono text-[11px]">
                        {new Date(c.created_at).toLocaleDateString("en-GB", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setSelectedCampaignForInspect({
                              id: c.id,
                              subject: c.subject || c.body.slice(0, 30),
                            })
                          }
                          className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delivery Inspector Modal */}
      <CampaignRecipientsModal
        isOpen={Boolean(selectedCampaignForInspect)}
        onClose={() => setSelectedCampaignForInspect(null)}
        campaignId={selectedCampaignForInspect?.id ?? null}
        campaignSubject={selectedCampaignForInspect?.subject ?? ""}
      />
    </div>
  );
}
