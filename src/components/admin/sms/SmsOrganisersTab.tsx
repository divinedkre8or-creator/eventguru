// src/components/admin/sms/SmsOrganisersTab.tsx
import { useState } from "react";
import {
  Search,
  Coins,
  History,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { GrantCreditsModal } from "./GrantCreditsModal";
import {
  formatNaira,
  DEFAULT_RETAIL_SMS_PRICE_NGN,
} from "@/lib/smsCalculations";
import { supabase } from "@/integrations/supabase/client";

export interface OrganiserSmsRecord {
  organiser_id: string;
  full_name: string;
  email: string;
  sms_balance: number;
  plan: string;
  total_funded_ngn: number;
  total_sms_sent: number;
  updated_at: string;
}

interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  reference: string;
  description: string;
  created_at: string;
}

interface SmsOrganisersTabProps {
  organisers: OrganiserSmsRecord[];
  loading: boolean;
  onRefresh: () => void;
}

export function SmsOrganisersTab({
  organisers,
  loading,
  onRefresh,
}: SmsOrganisersTabProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "zero">("all");
  const [selectedOrganiserForGrant, setSelectedOrganiserForGrant] = useState<{
    organiser_id: string;
    full_name: string;
    email: string;
    current_balance: number;
  } | null>(null);

  // History ledger state
  const [ledgerOrganiser, setLedgerOrganiser] = useState<OrganiserSmsRecord | null>(null);
  const [ledgerTransactions, setLedgerTransactions] = useState<WalletTransaction[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const handleOpenLedger = async (org: OrganiserSmsRecord) => {
    setLedgerOrganiser(org);
    setLoadingLedger(true);
    try {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("id, type, amount, balance_after, reference, description, created_at")
        .eq("organiser_id", org.organiser_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLedgerTransactions((data as WalletTransaction[]) || []);
    } catch (err) {
      console.error("Failed to fetch wallet transactions:", err);
    } finally {
      setLoadingLedger(false);
    }
  };

  const filtered = organisers.filter((org) => {
    const matchesSearch =
      org.full_name.toLowerCase().includes(search.toLowerCase()) ||
      org.email.toLowerCase().includes(search.toLowerCase());

    if (filter === "active") return matchesSearch && org.sms_balance > 0;
    if (filter === "zero") return matchesSearch && org.sms_balance <= 0;
    return matchesSearch;
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
            placeholder="Search organizer by name or email..."
            className="pl-9 text-xs h-9"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <div className="flex rounded-lg border border-border p-0.5 bg-muted/30">
            <button
              onClick={() => setFilter("all")}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                filter === "all"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({organisers.length})
            </button>
            <button
              onClick={() => setFilter("active")}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                filter === "active"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              With Balance
            </button>
            <button
              onClick={() => setFilter("zero")}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                filter === "zero"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Zero Balance
            </button>
          </div>
        </div>
      </div>

      {/* Organisers Table */}
      <div className="border rounded-xl bg-card overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs">Loading organizer wallets...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-xs">
            No organizers found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-muted/40 text-muted-foreground text-[11px] font-semibold border-b">
                <tr>
                  <th className="p-3">Organiser</th>
                  <th className="p-3">Wallet Balance</th>
                  <th className="p-3">Capacity</th>
                  <th className="p-3">Lifetime Top-ups</th>
                  <th className="p-3">SMS Sent</th>
                  <th className="p-3">Plan</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((org) => {
                  const units = Math.floor(org.sms_balance / DEFAULT_RETAIL_SMS_PRICE_NGN);
                  return (
                    <tr key={org.organiser_id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">
                        <div className="font-semibold text-foreground">{org.full_name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{org.email}</div>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-foreground font-mono text-sm">
                          {formatNaira(org.sms_balance)}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={
                            units > 0
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-mono"
                              : "bg-muted text-muted-foreground font-mono"
                          }
                        >
                          ~{units.toLocaleString()} units
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-muted-foreground">
                        {formatNaira(org.total_funded_ngn)}
                      </td>
                      <td className="p-3 font-mono text-foreground font-semibold">
                        {org.total_sms_sent.toLocaleString()}
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary" className="capitalize text-[10px]">
                          {org.plan || "free"}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenLedger(org)}
                            className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                          >
                            <History className="w-3 h-3" />
                            <span>Ledger</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setSelectedOrganiserForGrant({
                                organiser_id: org.organiser_id,
                                full_name: org.full_name,
                                email: org.email,
                                current_balance: org.sms_balance,
                              })
                            }
                            className="h-7 px-2.5 text-[11px] gap-1 font-semibold border-primary/20 hover:border-primary/40 hover:bg-primary/5 text-primary"
                          >
                            <Coins className="w-3 h-3" />
                            <span>Adjust</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grant/Adjust Modal */}
      <GrantCreditsModal
        isOpen={Boolean(selectedOrganiserForGrant)}
        onClose={() => setSelectedOrganiserForGrant(null)}
        organiser={selectedOrganiserForGrant}
        onSuccess={onRefresh}
      />

      {/* Ledger History Dialog */}
      <Dialog open={Boolean(ledgerOrganiser)} onOpenChange={(open) => !open && setLedgerOrganiser(null)}>
        <DialogContent className="sm:max-w-[620px] max-h-[85vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              <span>Wallet Ledger: {ledgerOrganiser?.full_name}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Audit log of all credits, top-ups, campaign debits, and adjustments.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto border rounded-lg min-h-[220px] max-h-[360px] my-2">
            {loadingLedger ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Loading transactions...</span>
              </div>
            ) : ledgerTransactions.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-xs">
                No transactions recorded yet for this wallet.
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-muted/50 text-muted-foreground text-[11px] font-semibold sticky top-0 border-b">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Amount</th>
                    <th className="p-2.5">Balance After</th>
                    <th className="p-2.5">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ledgerTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/20">
                      <td className="p-2.5 text-muted-foreground font-mono text-[11px]">
                        {new Date(tx.created_at).toLocaleDateString("en-GB", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-2.5">
                        {tx.type === "fund" ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                            <ArrowUpRight className="w-3 h-3" /> Fund
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                            <ArrowDownRight className="w-3 h-3" /> Debit
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 font-bold font-mono text-foreground">
                        {formatNaira(tx.amount)}
                      </td>
                      <td className="p-2.5 font-mono text-muted-foreground">
                        {formatNaira(tx.balance_after)}
                      </td>
                      <td className="p-2.5 text-muted-foreground text-[11px] max-w-[200px] truncate" title={tx.description}>
                        {tx.description}
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
              onClick={() => setLedgerOrganiser(null)}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
