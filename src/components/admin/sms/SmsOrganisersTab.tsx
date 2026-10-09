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
      const { data, error } = await (supabase.from as any)("wallet_transactions")
        .select("id, type, amount, balance_after, reference, description, created_at")
        .eq("organiser_id", org.organiser_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLedgerTransactions(((data || []) as unknown) as WalletTransaction[]);
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search organizer by name or email..."
            className="pl-9 text-xs h-9 w-full"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0 hidden sm:block" />
          <div className="grid grid-cols-3 sm:flex rounded-lg border border-border p-0.5 bg-muted/30 w-full sm:w-auto">
            <button
              onClick={() => setFilter("all")}
              className={`px-2.5 py-1.5 text-xs rounded-md font-medium text-center transition-all ${
                filter === "all"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({organisers.length})
            </button>
            <button
              onClick={() => setFilter("active")}
              className={`px-2.5 py-1.5 text-xs rounded-md font-medium text-center transition-all ${
                filter === "active"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              With Balance
            </button>
            <button
              onClick={() => setFilter("zero")}
              className={`px-2.5 py-1.5 text-xs rounded-md font-medium text-center transition-all ${
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

      {/* Organisers Directory */}
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
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
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

            {/* Mobile Card List View */}
            <div className="block md:hidden divide-y divide-border">
              {filtered.map((org) => {
                const units = Math.floor(org.sms_balance / DEFAULT_RETAIL_SMS_PRICE_NGN);
                return (
                  <div key={org.organiser_id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-foreground truncate">{org.full_name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono truncate">{org.email}</div>
                      </div>
                      <Badge variant="secondary" className="capitalize text-[10px] shrink-0">
                        {org.plan || "free"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground block font-medium">Wallet Balance</span>
                        <span className="font-bold font-mono text-sm text-foreground">{formatNaira(org.sms_balance)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block font-medium">Capacity</span>
                        <Badge
                          variant="outline"
                          className={
                            units > 0
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-mono text-[10px] px-1.5 py-0"
                              : "bg-muted text-muted-foreground font-mono text-[10px] px-1.5 py-0"
                          }
                        >
                          ~{units.toLocaleString()} units
                        </Badge>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block font-medium">Lifetime Top-ups</span>
                        <span className="font-mono text-muted-foreground">{formatNaira(org.total_funded_ngn)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block font-medium">SMS Dispatched</span>
                        <span className="font-mono font-semibold text-foreground">{org.total_sms_sent.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenLedger(org)}
                        className="flex-1 h-8 text-xs gap-1.5"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>Ledger</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() =>
                          setSelectedOrganiserForGrant({
                            organiser_id: org.organiser_id,
                            full_name: org.full_name,
                            email: org.email,
                            current_balance: org.sms_balance,
                          })
                        }
                        className="flex-1 h-8 text-xs gap-1.5 font-bold"
                      >
                        <Coins className="w-3.5 h-3.5" />
                        <span>Adjust Credits</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
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
        <DialogContent className="w-[95vw] sm:max-w-[620px] max-h-[85vh] flex flex-col p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
              <History className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate">Wallet Ledger: {ledgerOrganiser?.full_name}</span>
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
              <>
                {/* Desktop Ledger Table */}
                <table className="hidden sm:table w-full text-xs text-left border-collapse">
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

                {/* Mobile Ledger List */}
                <div className="block sm:hidden divide-y divide-border">
                  {ledgerTransactions.map((tx) => (
                    <div key={tx.id} className="p-3 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString("en-GB", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {tx.type === "fund" ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[10px] text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            <ArrowUpRight className="w-3 h-3" /> FUND
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-[10px] text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            <ArrowDownRight className="w-3 h-3" /> DEBIT
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="font-bold font-mono text-foreground">{formatNaira(tx.amount)}</span>
                        <span className="text-[11px] font-mono text-muted-foreground">Bal: {formatNaira(tx.balance_after)}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
                        {tx.description}
                      </p>
                    </div>
                  ))}
                </div>
              </>
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
