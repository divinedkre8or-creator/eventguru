import { useState, useEffect, useMemo } from "react";
import {
  Users, Search, Shield, Mail, Phone, Calendar,
  Ticket, CreditCard, ArrowUpRight, Loader2, CheckCircle2, Clock,
  Wallet, TrendingUp, Filter, ChevronRight, Zap, Target,
  Sparkles, Award, ArrowRight, HelpCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface PlatformUser {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  email: string;
  phone?: string | null;
  tickets_count: number;
  checked_in_count: number;
  total_spent: number;
  rally_xp: number;
  rally_level: string;
  joined_at: string;
}

interface RegistrationHistoryItem {
  id: string;
  event_id: string;
  event_title: string;
  ticket_type_name: string;
  amount_paid: number;
  status: string;
  checked_in: boolean;
  payment_reference: string | null;
  created_at: string;
  event_date?: string;
  event_venue?: string;
}

function computeRallyScore(ticketsCount: number, checkedInCount: number, paidCount: number): number {
  return (ticketsCount * 100) + (checkedInCount * 150) + (paidCount * 50);
}

function getRallyTitle(xp: number): string {
  if (xp >= 5000) return "Legend";
  if (xp >= 2500) return "Rally Captain";
  if (xp >= 1000) return "Trailblazer";
  if (xp >= 300) return "Explorer";
  return "Newcomer";
}

export const UsersPage = () => {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [uniqueTicketBuyersCount, setUniqueTicketBuyersCount] = useState(0);
  const [totalRegistrationsCount, setTotalRegistrationsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "active_wallet" | "empty_wallet" | "checked_in">("all");
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [userHistory, setUserHistory] = useState<RegistrationHistoryItem[]>([]);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // 1. Fetch all registrations to determine total ticket buyer population and unique buyers
      const { data: allRegistrations, error: regError } = await supabase
        .from("registrations")
        .select("id, user_id, email, phone, amount_paid, checked_in, created_at");

      if (regError) console.warn("Registrations fetch error:", regError);

      const allRegs = allRegistrations || [];
      setTotalRegistrationsCount(allRegs.length);

      const uniqueBuyerEmails = new Set(
        allRegs
          .map((r) => r.email?.trim().toLowerCase())
          .filter(Boolean)
      );
      setUniqueTicketBuyersCount(uniqueBuyerEmails.size);

      // 2. Fetch all user roles to identify non-organizers vs organizers
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role, created_at");

      if (rolesError) console.warn("Roles query warning:", rolesError);

      const roles = rolesData || [];
      const organizerIds = new Set(roles.filter((r) => r.role === "organiser").map((r) => r.user_id));
      const adminIds = new Set(roles.filter((r) => r.role === "admin").map((r) => r.user_id));

      // Also fetch events table to verify who is an organizer (created events)
      const { data: eventsData } = await supabase
        .from("events")
        .select("organiser_id");
      (eventsData || []).forEach((e) => {
        if (e.organiser_id) organizerIds.add(e.organiser_id);
      });

      // 3. Fetch profiles for attendee accounts
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url");

      const profiles = profilesData || [];

      // Find all user IDs that are attendees (NOT organizers and NOT admins)
      // A user is a non-organizer platform user if:
      // - They have role 'attendee' in user_roles OR
      // - They exist in profiles and are NOT in organizerIds and NOT in adminIds
      const attendeeRoleIds = roles
        .filter((r) => r.role === "attendee")
        .map((r) => r.user_id);

      const nonOrganizerProfileIds = profiles
        .map((p) => p.user_id)
        .filter((uid) => !organizerIds.has(uid) && !adminIds.has(uid));

      const distinctUserIds = Array.from(new Set([...attendeeRoleIds, ...nonOrganizerProfileIds]));

      // Assemble platform users
      const assembledList: PlatformUser[] = distinctUserIds.map((uid) => {
        const prof = profiles.find((p) => p.user_id === uid);
        const roleEntry = roles.find((r) => r.user_id === uid);

        // Find tickets matching either their user_id OR their contact email
        const userRegs = allRegs.filter((r) => r.user_id === uid);

        // Also check if we have their email in registrations
        const firstWithEmail = userRegs.find((r) => r.email);
        const userEmail = firstWithEmail?.email || "";
        const userPhone = firstWithEmail?.phone || null;

        // If userRegs is empty, see if there are any registrations with matching email (if known)
        let totalUserRegs = userRegs;
        if (userEmail) {
          totalUserRegs = allRegs.filter(
            (r) => r.user_id === uid || r.email?.toLowerCase() === userEmail.toLowerCase()
          );
        }

        const ticketsCount = totalUserRegs.length;
        const checkedInCount = totalUserRegs.filter((r) => Boolean(r.checked_in)).length;
        const paidCount = totalUserRegs.filter((r) => Number(r.amount_paid) > 0).length;
        const totalSpent = totalUserRegs.reduce(
          (sum, r) => sum + (Number(r.amount_paid) || 0),
          0
        );
        const xp = computeRallyScore(ticketsCount, checkedInCount, paidCount);
        const level = getRallyTitle(xp);

        return {
          user_id: uid,
          full_name: prof?.full_name || "Platform User",
          avatar_url: prof?.avatar_url,
          email: userEmail || "Account Registered",
          phone: userPhone,
          tickets_count: ticketsCount,
          checked_in_count: checkedInCount,
          total_spent: totalSpent,
          rally_xp: xp,
          rally_level: level,
          joined_at: roleEntry?.created_at || new Date().toISOString(),
        };
      });

      setUsers(assembledList);
    } catch (err) {
      console.error("Failed to load platform users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openUserHistory = async (user: PlatformUser) => {
    setSelectedUser(user);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    setUserHistory([]);

    try {
      let query = supabase
        .from("registrations")
        .select(`
          id,
          event_id,
          amount_paid,
          status,
          checked_in,
          payment_reference,
          created_at,
          events ( title, date, venue ),
          ticket_types ( name )
        `);

      if (user.user_id) {
        query = query.eq("user_id", user.user_id);
      } else if (user.email && user.email !== "Account Registered") {
        query = query.eq("email", user.email);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      const formatted: RegistrationHistoryItem[] = (data || []).map((row: any) => ({
        id: row.id,
        event_id: row.event_id,
        event_title: row.events?.title || "Event Registration",
        ticket_type_name: row.ticket_types?.name || "Standard Pass",
        amount_paid: Number(row.amount_paid) || 0,
        status: row.status || "confirmed",
        checked_in: Boolean(row.checked_in),
        payment_reference: row.payment_reference,
        created_at: row.created_at,
        event_date: row.events?.date,
        event_venue: row.events?.venue,
      }));

      setUserHistory(formatted);
    } catch (err) {
      console.error("Failed to fetch user registration history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return users.filter((u) => {
      // Search
      const term = search.toLowerCase();
      const matchesSearch =
        u.full_name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.user_id.toLowerCase().includes(term);

      if (!matchesSearch) return false;

      // Filter chips
      if (filterType === "active_wallet") return u.tickets_count > 0;
      if (filterType === "empty_wallet") return u.tickets_count === 0;
      if (filterType === "checked_in") return u.checked_in_count > 0;
      return true;
    });
  }, [users, search, filterType]);

  // Funnel & Experience Calculations
  const totalRegisteredUsers = users.length;
  const activeWalletsCount = users.filter((u) => u.tickets_count > 0).length;
  const emptyWalletsCount = totalRegisteredUsers - activeWalletsCount;
  const totalTicketsInWallets = users.reduce((sum, u) => sum + u.tickets_count, 0);
  const totalCheckedIn = users.reduce((sum, u) => sum + u.checked_in_count, 0);
  const totalUserSpend = users.reduce((sum, u) => sum + u.total_spent, 0);
  const totalRallyXP = users.reduce((sum, u) => sum + u.rally_xp, 0);

  // Conversion: ratio of unique ticket buyers who signed up on the platform
  const conversionRate = uniqueTicketBuyersCount > 0
    ? ((totalRegisteredUsers / uniqueTicketBuyersCount) * 100).toFixed(1)
    : "0.0";

  // Wallet Activation Rate: registered users with at least 1 ticket claimed
  const walletActivationRate = totalRegisteredUsers > 0
    ? ((activeWalletsCount / totalRegisteredUsers) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12 w-full min-w-0">
      {/* Header */}
      <div className="border-b border-border pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-secondary/10 text-secondary px-2.5 py-1 rounded inline-flex items-center gap-1.5 mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>NON-ORGANIZER PLATFORM USERS</span>
          </div>
          <h1 className="font-heading text-3xl font-black text-foreground tracking-tight">
            Users
          </h1>
          <p className="text-muted-foreground text-xs font-medium mt-1">
            Tracking regular attendees and customer accounts who interact with the Digital Wallet, Rally XP, and event tracking experience.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs px-3 py-1 bg-card">
            Separate Attendee Experience
          </Badge>
        </div>
      </div>

      {/* Primary KPI Grid: Answers User Questions Directly */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: How many persons are using platform that are NOT event organizers */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-xs border-l-4 border-l-primary">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-mono font-bold uppercase mb-1">
            <span>REGISTERED USERS</span>
            <Users className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="font-heading text-2xl sm:text-3xl font-black text-foreground">
            {totalRegisteredUsers.toLocaleString()}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Excludes organizers & admins
          </div>
        </div>

        {/* Metric 2: Ticket-to-User Conversion Strategy */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-xs border-l-4 border-l-secondary">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-mono font-bold uppercase mb-1">
            <span>SIGNUP CONVERSION</span>
            <TrendingUp className="w-3.5 h-3.5 text-secondary" />
          </div>
          <div className="font-heading text-2xl sm:text-3xl font-black text-secondary">
            {conversionRate}%
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
            {totalRegisteredUsers} users / {uniqueTicketBuyersCount} buyers
          </div>
        </div>

        {/* Metric 3: Active Digital Wallets */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-xs border-l-4 border-l-chart-blue">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-mono font-bold uppercase mb-1">
            <span>ACTIVE WALLETS</span>
            <Wallet className="w-3.5 h-3.5 text-chart-blue" />
          </div>
          <div className="font-heading text-2xl sm:text-3xl font-black text-chart-blue">
            {activeWalletsCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {walletActivationRate}% wallet claim rate
          </div>
        </div>

        {/* Metric 4: Tickets Managed in Wallets */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-xs border-l-4 border-l-chart-green">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-mono font-bold uppercase mb-1">
            <span>TICKETS IN WALLETS</span>
            <Ticket className="w-3.5 h-3.5 text-chart-green" />
          </div>
          <div className="font-heading text-2xl sm:text-3xl font-black text-chart-green">
            {totalTicketsInWallets.toLocaleString()}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {totalCheckedIn} checked in at gates
          </div>
        </div>
      </div>

      {/* Experience Tracking & Conversion Strategy Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Strategy Health & Conversion Funnel */}
        <div className="p-5 rounded-xl bg-card border border-border shadow-xs space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <h3 className="font-heading font-bold text-sm text-foreground">
                Ticket-to-Wallet Conversion Strategy
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase bg-primary/10 text-primary px-2 py-0.5 rounded">
              Funnel Health: {Number(conversionRate) > 20 ? "Strong" : Number(conversionRate) > 5 ? "Active" : "Early Stage"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
              <div className="text-[10px] font-mono text-muted-foreground uppercase font-bold">Step 1: Buyers</div>
              <div className="font-heading text-lg font-black text-foreground">{uniqueTicketBuyersCount}</div>
              <p className="text-[11px] text-muted-foreground leading-tight">Purchased tickets at checkout</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
              <div className="text-[10px] font-mono text-muted-foreground uppercase font-bold">Step 2: Signups</div>
              <div className="font-heading text-lg font-black text-foreground">{totalRegisteredUsers}</div>
              <p className="text-[11px] text-muted-foreground leading-tight">Clicked "Claim Ticket & Create Wallet"</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
              <div className="text-[10px] font-mono text-muted-foreground uppercase font-bold">Step 3: In Wallet</div>
              <div className="font-heading text-lg font-black text-foreground">{activeWalletsCount}</div>
              <p className="text-[11px] text-muted-foreground leading-tight">Actively viewing passes in portal</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed pt-1">
            <strong className="text-foreground">Strategy Insight:</strong> When guests complete a ticket purchase, EventRally prompts them with: <span className="font-mono text-foreground italic">"Keep all your tickets in one place — Claim Ticket & Create Free Wallet."</span> Tracking these metrics allows you to determine whether to increase conversion incentives or introduce WhatsApp/SMS wallet reminders.
          </p>
        </div>

        {/* Feature Engagement: What We Built for Users */}
        <div className="p-5 rounded-xl bg-card border border-border shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Zap className="w-4 h-4 text-secondary" />
            <h3 className="font-heading font-bold text-sm text-foreground">
              Attendee Experience Metrics
            </h3>
          </div>

          <div className="space-y-2.5 pt-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Lifetime User Spend:</span>
              <span className="font-mono font-bold text-foreground">₦{totalUserSpend.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Avg Spend Per User:</span>
              <span className="font-mono font-bold text-foreground">
                ₦{totalRegisteredUsers > 0 ? Math.round(totalUserSpend / totalRegisteredUsers).toLocaleString() : 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Rally XP Earned:</span>
              <span className="font-mono font-bold text-secondary">{totalRallyXP.toLocaleString()} XP</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Gate Check-in Rate:</span>
              <span className="font-mono font-bold text-foreground">
                {totalTicketsInWallets > 0 ? Math.round((totalCheckedIn / totalTicketsInWallets) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Avg Tickets Per User:</span>
              <span className="font-mono font-bold text-foreground">
                {totalRegisteredUsers > 0 ? (totalTicketsInWallets / totalRegisteredUsers).toFixed(1) : "0"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name, email, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border text-xs h-10 rounded-lg"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Button
            type="button"
            size="sm"
            variant={filterType === "all" ? "default" : "outline"}
            onClick={() => setFilterType("all")}
            className="h-8 text-xs font-semibold rounded-lg"
          >
            All Users ({users.length})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filterType === "active_wallet" ? "default" : "outline"}
            onClick={() => setFilterType("active_wallet")}
            className="h-8 text-xs font-semibold rounded-lg"
          >
            Active Wallets ({activeWalletsCount})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filterType === "empty_wallet" ? "default" : "outline"}
            onClick={() => setFilterType("empty_wallet")}
            className="h-8 text-xs font-semibold rounded-lg"
          >
            Empty Wallets ({emptyWalletsCount})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filterType === "checked_in" ? "default" : "outline"}
            onClick={() => setFilterType("checked_in")}
            className="h-8 text-xs font-semibold rounded-lg"
          >
            Checked In ({users.filter((u) => u.checked_in_count > 0).length})
          </Button>
        </div>
      </div>

      {/* Users Directory Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-medium">Fetching registered users directory…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card border border-dashed border-border rounded-xl space-y-2">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/30" />
          <h3 className="font-heading text-base font-bold text-foreground">No users found</h3>
          <p className="text-xs text-muted-foreground">
            {search ? "No registered users match your search criteria." : "No non-organizer users have registered an account yet."}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">
                    User Details
                  </th>
                  <th className="px-4 py-3 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">
                    Wallet Passes
                  </th>
                  <th className="px-4 py-3 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">
                    Gate Check-ins
                  </th>
                  <th className="px-4 py-3 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">
                    Total Spend
                  </th>
                  <th className="px-4 py-3 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">
                    Rally Tier
                  </th>
                  <th className="px-4 py-3 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">
                    Joined Date
                  </th>
                  <th className="px-4 py-3 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((user) => (
                  <tr key={user.user_id} className="hover:bg-muted/30 transition-colors">
                    {/* User Identity */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary font-bold text-xs shrink-0">
                          {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-foreground">
                            {user.full_name}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            ID: {user.user_id.slice(0, 10)}…
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <div className="text-xs text-foreground font-medium flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[180px]">{user.email}</span>
                        </div>
                        {user.phone && (
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Passes in Wallet */}
                    <td className="px-4 py-3">
                      {user.tickets_count > 0 ? (
                        <Badge variant="secondary" className="font-mono text-xs font-bold gap-1">
                          <Wallet className="w-3 h-3" />
                          <span>{user.tickets_count} {user.tickets_count === 1 ? "pass" : "passes"}</span>
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-muted-foreground font-mono italic">
                          Empty wallet
                        </span>
                      )}
                    </td>

                    {/* Gate Check-ins */}
                    <td className="px-4 py-3">
                      {user.checked_in_count > 0 ? (
                        <Badge className="bg-chart-green/10 text-chart-green border-chart-green/20 font-mono text-xs font-bold gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{user.checked_in_count} attended</span>
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-muted-foreground font-mono">
                          0 checked-in
                        </span>
                      )}
                    </td>

                    {/* Total Spend */}
                    <td className="px-4 py-3 font-mono font-bold text-xs text-foreground">
                      ₦{user.total_spent.toLocaleString()}
                    </td>

                    {/* Rally Tier */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold uppercase bg-muted px-2 py-0.5 rounded text-foreground">
                          {user.rally_level}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {user.rally_xp} XP
                        </span>
                      </div>
                    </td>

                    {/* Member Since */}
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(user.joined_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    {/* Inspect Wallet Button (NO Elevation Function) */}
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openUserHistory(user)}
                        className="h-8 px-3 text-xs font-semibold border-border hover:bg-muted"
                      >
                        <span>Inspect Wallet</span>
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Attendee Wallet & Ticket History Modal */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="max-w-2xl bg-card border-border font-sans">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-primary" />
              <DialogTitle className="font-heading text-lg font-bold text-foreground">
                Digital Wallet Pass Ledger
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Passes, check-in records, and payments for{" "}
              <strong className="text-foreground">{selectedUser?.full_name}</strong>{" "}
              ({selectedUser?.email}).
            </DialogDescription>
          </DialogHeader>

          {historyLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Accessing attendee wallet passes...</p>
            </div>
          ) : userHistory.length === 0 ? (
            <div className="p-8 text-center bg-muted/30 border border-dashed border-border rounded-xl space-y-2">
              <Ticket className="w-8 h-8 mx-auto text-muted-foreground/30" />
              <p className="text-xs font-medium text-foreground">No passes stored in this wallet yet.</p>
              <p className="text-[11px] text-muted-foreground">
                This user created an account but has not yet claimed or purchased an event pass under this user ID.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {userHistory.map((reg) => (
                <div
                  key={reg.id}
                  className="p-4 rounded-xl bg-background border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary/30 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="font-heading font-bold text-sm text-foreground">
                      {reg.event_title}
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2 font-mono">
                      <span>Pass: {reg.ticket_type_name}</span>
                      <span>·</span>
                      <span>₦{reg.amount_paid.toLocaleString()}</span>
                      {reg.event_date && (
                        <>
                          <span>·</span>
                          <span>{new Date(reg.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                        </>
                      )}
                    </div>
                    {reg.payment_reference && (
                      <div className="text-[10px] text-muted-foreground font-mono">
                        Ref: {reg.payment_reference}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    {reg.checked_in ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-chart-green/10 text-chart-green border border-chart-green/20">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Checked In at Door</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-muted text-muted-foreground border border-border">
                        <Clock className="w-3 h-3" />
                        <span>Not Checked In</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;
