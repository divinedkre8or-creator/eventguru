// src/components/admin/sms/CampaignRecipientsModal.tsx
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, CheckCircle2, AlertCircle, Clock, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CampaignRecipient {
  id: string;
  contact: string;
  name: string | null;
  status: "sent" | "failed" | "pending";
  error: string | null;
  sent_at: string | null;
  created_at: string;
}

interface CampaignRecipientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string | null;
  campaignSubject: string;
}

export function CampaignRecipientsModal({
  isOpen,
  onClose,
  campaignId,
  campaignSubject,
}: CampaignRecipientsModalProps) {
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [filter, setFilter] = useState<"all" | "sent" | "failed">("all");

  useEffect(() => {
    if (!isOpen || !campaignId) return;

    const fetchRecipients = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("campaign_recipients")
          .select("id, contact, name, status, error, sent_at, created_at")
          .eq("campaign_id", campaignId)
          .order("created_at", { ascending: true });

        if (error) throw error;
        setRecipients((data as CampaignRecipient[]) || []);
      } catch (err) {
        console.error("Failed to fetch recipients:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipients();
  }, [isOpen, campaignId]);

  const filtered = recipients.filter((r) => {
    const matchesFilter = filter === "all" || r.status === filter;
    const matchesSearch =
      r.contact.toLowerCase().includes(search.toLowerCase()) ||
      (r.name && r.name.toLowerCase().includes(search.toLowerCase())) ||
      (r.error && r.error.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const total = recipients.length;
  const sentCount = recipients.filter((r) => r.status === "sent").length;
  const failedCount = recipients.filter((r) => r.status === "failed").length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] flex flex-col p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Delivery Inspector</DialogTitle>
              <DialogDescription className="text-xs line-clamp-1">
                Recipients & delivery telemetry for: <span className="font-semibold text-foreground">{campaignSubject || "Untitled Campaign"}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Status Metrics Bar */}
        <div className="grid grid-cols-3 gap-2 my-2">
          <div
            onClick={() => setFilter("all")}
            className={`p-2.5 rounded-lg border text-center cursor-pointer transition-all ${
              filter === "all" ? "bg-muted border-primary shadow-xs" : "bg-card hover:bg-muted/50"
            }`}
          >
            <div className="text-[11px] text-muted-foreground font-medium">Total Targets</div>
            <div className="text-base font-bold text-foreground">{total}</div>
          </div>
          <div
            onClick={() => setFilter("sent")}
            className={`p-2.5 rounded-lg border text-center cursor-pointer transition-all ${
              filter === "sent" ? "bg-emerald-500/10 border-emerald-500/50 shadow-xs" : "bg-card hover:bg-muted/50"
            }`}
          >
            <div className="text-[11px] text-emerald-600 font-medium">Delivered</div>
            <div className="text-base font-bold text-emerald-600">{sentCount}</div>
          </div>
          <div
            onClick={() => setFilter("failed")}
            className={`p-2.5 rounded-lg border text-center cursor-pointer transition-all ${
              filter === "failed" ? "bg-red-500/10 border-red-500/50 shadow-xs" : "bg-card hover:bg-muted/50"
            }`}
          >
            <div className="text-[11px] text-red-500 font-medium">Failed</div>
            <div className="text-base font-bold text-red-500">{failedCount}</div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative my-1">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by phone, name, or failure reason..."
            className="pl-9 text-xs h-8"
          />
        </div>

        {/* Recipients Table List */}
        <div className="flex-1 overflow-y-auto border rounded-lg min-h-[260px] max-h-[380px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-xs">Loading recipient logs...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-xs">
              No recipients match the selected criteria.
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-muted/50 text-muted-foreground text-[11px] font-semibold sticky top-0 border-b">
                <tr>
                  <th className="p-2.5">Recipient</th>
                  <th className="p-2.5">Phone Number</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Sent / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="p-2.5 font-medium text-foreground">
                      {r.name || "Anonymous"}
                    </td>
                    <td className="p-2.5 font-mono text-muted-foreground">
                      {r.contact}
                    </td>
                    <td className="p-2.5">
                      {r.status === "sent" ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10 text-[10px] gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Delivered
                        </Badge>
                      ) : r.status === "failed" ? (
                        <Badge variant="outline" className="text-red-500 border-red-500/30 bg-red-500/10 text-[10px] gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Failed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10 text-[10px] gap-1">
                          <Clock className="w-3 h-3" />
                          Pending
                        </Badge>
                      )}
                    </td>
                    <td className="p-2.5 text-muted-foreground text-[11px]">
                      {r.status === "failed" && r.error ? (
                        <span className="text-red-500 font-mono text-[10px] line-clamp-1" title={r.error}>
                          {r.error}
                        </span>
                      ) : r.sent_at ? (
                        new Date(r.sent_at).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
