// src/pages/admin/SMSControlPanel.tsx
import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  Server,
  Users,
  Send,
  Wrench,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/seo/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { SmsOverviewTab, ProviderStatus } from "@/components/admin/sms/SmsOverviewTab";
import { SmsOrganisersTab, OrganiserSmsRecord } from "@/components/admin/sms/SmsOrganisersTab";
import { SmsCampaignsTab, SmsCampaignRecord } from "@/components/admin/sms/SmsCampaignsTab";
import { SmsToolsTab } from "@/components/admin/sms/SmsToolsTab";

export default function SMSControlPanel() {
  const [activeTab, setActiveTab] = useState<"overview" | "organisers" | "campaigns" | "tools">("overview");

  // Telemetry State
  const [provider, setProvider] = useState<ProviderStatus | null>(null);
  const [loadingProvider, setLoadingProvider] = useState(true);

  // Organisers State
  const [organisers, setOrganisers] = useState<OrganiserSmsRecord[]>([]);
  const [loadingOrganisers, setLoadingOrganisers] = useState(true);

  // Campaigns State
  const [campaigns, setCampaigns] = useState<SmsCampaignRecord[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

  // Metrics totals
  const [totalOrganiserLiabilities, setTotalOrganiserLiabilities] = useState(0);
  const [totalSmsSoldNgn, setTotalSmsSoldNgn] = useState(0);
  const [totalSmsSent, setTotalSmsSent] = useState(0);
  const [totalSmsFailed, setTotalSmsFailed] = useState(0);

  // Fetch Central Textflow Gateway Status via Edge Function
  const fetchProviderStatus = useCallback(async () => {
    setLoadingProvider(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-sms-ops", {
        body: { action: "get_provider_status" },
      });

      if (error || !data) {
        throw new Error(data?.error || error?.message || "Failed to query provider");
      }

      setProvider(data);
    } catch (err) {
      console.error("Provider fetch error:", err);
      setProvider({
        ok: false,
        configured: false,
        balance: 0,
        currency: "NGN",
        senderId: "Textflow",
        accountName: "Error loading provider",
        error: (err as Error).message,
      });
    } finally {
      setLoadingProvider(false);
    }
  }, []);

  // Fetch Organisers and Wallets
  const fetchOrganisers = useCallback(async () => {
    setLoadingOrganisers(true);
    try {
      // 1. Fetch all wallets
      const { data: wallets, error: wErr } = await (supabase.from as any)("organiser_wallets")
        .select("organiser_id, sms_balance, plan, updated_at");

      if (wErr) throw wErr;

      const walletList = (wallets || []) as any[];
      const userIds = walletList.map((w) => w.organiser_id);

      // 2. Fetch profiles
      const { data: profiles } = userIds.length > 0
        ? await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", userIds)
        : { data: [] };
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));

      // 3. Fetch user roles for email lookup
      const { data: roles } = userIds.length > 0
        ? await supabase
            .from("user_roles")
            .select("user_id, role")
            .in("user_id", userIds)
        : { data: [] };

      // 4. Fetch wallet transactions to sum funded amounts
      const { data: transactions } = await (supabase.from as any)("wallet_transactions")
        .select("organiser_id, type, amount");

      const fundedMap = new Map<string, number>();
      let allSoldNgn = 0;
      ((transactions || []) as any[]).forEach((tx) => {
        if (tx.type === "fund") {
          const curr = fundedMap.get(tx.organiser_id) || 0;
          fundedMap.set(tx.organiser_id, curr + Number(tx.amount));
          allSoldNgn += Number(tx.amount);
        }
      });

      // 5. Fetch sent count from campaigns
      const { data: camps } = await (supabase.from as any)("campaigns")
        .select("organiser_id, sent_count, channel")
        .eq("channel", "sms");

      const sentMap = new Map<string, number>();
      ((camps || []) as any[]).forEach((c) => {
        const curr = sentMap.get(c.organiser_id) || 0;
        sentMap.set(c.organiser_id, curr + (c.sent_count || 0));
      });

      // Assemble records
      let liabilitiesSum = 0;
      const records: OrganiserSmsRecord[] = walletList.map((w) => {
        const bal = Number(w.sms_balance) || 0;
        liabilitiesSum += bal;
        const name = profileMap.get(w.organiser_id) || "Organiser";
        return {
          organiser_id: w.organiser_id,
          full_name: name,
          email: `${w.organiser_id.slice(0, 8)}@eventrally.app`,
          sms_balance: bal,
          plan: w.plan || "free",
          total_funded_ngn: fundedMap.get(w.organiser_id) || 0,
          total_sms_sent: sentMap.get(w.organiser_id) || 0,
          updated_at: w.updated_at,
        };
      });

      setOrganisers(records);
      setTotalOrganiserLiabilities(liabilitiesSum);
      setTotalSmsSoldNgn(allSoldNgn);
    } catch (err) {
      console.error("Error fetching organisers:", err);
    } finally {
      setLoadingOrganisers(false);
    }
  }, []);

  // Fetch Campaigns
  const fetchCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    try {
      const { data: camps, error } = await (supabase.from as any)("campaigns")
        .select("id, subject, body, status, recipient_count, sent_count, failed_count, created_at, organiser_id, event_id")
        .eq("channel", "sms")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const campList = camps || [];
      const eventIds = campList.map((c) => c.event_id).filter(Boolean);
      const orgIds = campList.map((c) => c.organiser_id);

      // Fetch event titles
      const { data: events } = eventIds.length > 0
        ? await supabase
            .from("events")
            .select("id, title")
            .in("id", eventIds)
        : { data: [] };
      const eventMap = new Map((events || []).map((e: any) => [e.id, e.title]));

      // Fetch organiser names
      const { data: profs } = orgIds.length > 0
        ? await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", orgIds)
        : { data: [] };
      const profMap = new Map((profs || []).map((p: any) => [p.user_id, p.full_name]));

      let totalSent = 0;
      let totalFailed = 0;

      const records: SmsCampaignRecord[] = campList.map((c) => {
        totalSent += c.sent_count || 0;
        totalFailed += c.failed_count || 0;
        return {
          id: c.id,
          subject: c.subject || "SMS Broadcast",
          body: c.body || "",
          status: c.status || "draft",
          recipient_count: c.recipient_count || 0,
          sent_count: c.sent_count || 0,
          failed_count: c.failed_count || 0,
          created_at: c.created_at,
          organiser_name: profMap.get(c.organiser_id) || "Organiser",
          event_title: (c.event_id && eventMap.get(c.event_id)) || "All Events",
        };
      });

      setCampaigns(records);
      setTotalSmsSent(totalSent);
      setTotalSmsFailed(totalFailed);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
    } finally {
      setLoadingCampaigns(false);
    }
  }, []);

  const refreshAll = useCallback(() => {
    fetchProviderStatus();
    fetchOrganisers();
    fetchCampaigns();
  }, [fetchProviderStatus, fetchOrganisers, fetchCampaigns]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return (
    <div className="space-y-6">
      <SEOHead
        title="Super Admin - SMS & Messaging Control Panel"
        description="Monitor Textflow central balance, organizer SMS wallets, bulk campaigns, and gateway operations."
        noIndex={true}
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary text-primary-foreground shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                SMS &amp; Messaging Control Panel
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Upstream Textflow gateway telemetry, organizer wallet liabilities, delivery streams, and broadcast tools.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            className="text-xs gap-1.5 h-8 flex-1 sm:flex-initial"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync All</span>
          </Button>
          <a
            href="https://textflow.ng/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-initial"
          >
            <Button size="sm" className="text-xs gap-1.5 h-8 w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              <span>Textflow Dashboard</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </a>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex rounded-xl p-1 bg-muted/50 border border-border overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === "overview"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Overview &amp; Central Balance</span>
        </button>

        <button
          onClick={() => setActiveTab("organisers")}
          className={`flex items-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === "organisers"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Organiser Wallets ({organisers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("campaigns")}
          className={`flex items-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === "campaigns"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Campaign Stream ({campaigns.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("tools")}
          className={`flex items-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === "tools"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Diagnostic &amp; Broadcast Tools</span>
        </button>
      </div>

      {/* Active Tab View */}
      {activeTab === "overview" && (
        <SmsOverviewTab
          provider={provider}
          loadingProvider={loadingProvider}
          onRefreshProvider={fetchProviderStatus}
          totalOrganiserLiabilities={totalOrganiserLiabilities}
          totalSmsSoldNgn={totalSmsSoldNgn}
          totalSmsSent={totalSmsSent}
          totalSmsFailed={totalSmsFailed}
          onNavigateToTools={() => setActiveTab("tools")}
        />
      )}

      {activeTab === "organisers" && (
        <SmsOrganisersTab
          organisers={organisers}
          loading={loadingOrganisers}
          onRefresh={fetchOrganisers}
        />
      )}

      {activeTab === "campaigns" && (
        <SmsCampaignsTab
          campaigns={campaigns}
          loading={loadingCampaigns}
          onRefresh={fetchCampaigns}
        />
      )}

      {activeTab === "tools" && (
        <SmsToolsTab organisersCount={organisers.length} />
      )}
    </div>
  );
}
