import { useState, useEffect } from "react";
import {
  Users, Search, Shield, ShieldCheck, Mail, Phone, Calendar,
  Ticket, CreditCard, ArrowUpRight, Loader2, CheckCircle2, Clock,
  ExternalLink, Filter, ChevronRight
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
import { AdminRoleModal } from "@/components/admin/AdminRoleModal";

interface PlatformUser {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  email: string;
  phone?: string | null;
  tickets_count: number;
  total_spent: number;
  joined_at: string;
  last_activity?: string | null;
  is_admin?: boolean;
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
}

export const UsersPage = () => {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [userHistory, setUserHistory] = useState<RegistrationHistoryItem[]>([]);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Admin Delegation Modal state
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [targetAdminEmail, setTargetAdminEmail] = useState("");
  const [targetAdminUserId, setTargetAdminUserId] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // 1. Attempt server-side RPC first
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "get_admin_platform_users" as any,
        { search_query: "", limit_val: 150, offset_val: 0 }
      );

      if (!rpcError && Array.isArray(rpcData)) {
        setUsers(rpcData as PlatformUser[]);
        setLoading(false);
        return;
      }

      // 2. Resilient fallback: Query tables directly if RPC is not yet created in remote DB
      const { data: attendeeRoles } = await supabase
        .from("user_roles")
        .select("user_id, role, created_at")
        .eq("role", "attendee");

      if (!attendeeRoles || attendeeRoles.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      const userIds = attendeeRoles.map((r) => r.user_id);

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      // Fetch all admin roles to flag existing admins
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      const adminIdSet = new Set((adminRoles || []).map((a) => a.user_id));

      // Fetch registrations for these user IDs
      const { data: registrations } = await supabase
        .from("registrations")
        .select("id, user_id, email, phone, amount_paid, created_at")
        .in("user_id", userIds);

      const assembledList: PlatformUser[] = attendeeRoles.map((roleRecord) => {
        const prof = (profiles || []).find((p) => p.user_id === roleRecord.user_id);
        const userRegs = (registrations || []).filter((r) => r.user_id === roleRecord.user_id);
        const totalSpent = userRegs.reduce((sum, r) => sum + (Number(r.amount_paid) || 0), 0);

        // Derive contact info
        const firstRegWithContact = userRegs.find((r) => r.email || r.phone);
        const email = firstRegWithContact?.email || "";
        const phone = firstRegWithContact?.phone || null;

        return {
          user_id: roleRecord.user_id,
          full_name: prof?.full_name || "Platform Attendee",
          avatar_url: prof?.avatar_url,
          email,
          phone,
          tickets_count: userRegs.length,
          total_spent: totalSpent,
          joined_at: roleRecord.created_at,
          is_admin: adminIdSet.has(roleRecord.user_id),
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
      // Fetch registrations for this user_id or email
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
          events ( title ),
          ticket_types ( name )
        `);

      if (user.user_id) {
        query = query.eq("user_id", user.user_id);
      } else if (user.email) {
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
      }));

      setUserHistory(formatted);
    } catch (err) {
      console.error("Failed to fetch user registration history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handlePromoteClick = (user: PlatformUser) => {
    setTargetAdminEmail(user.email);
    setTargetAdminUserId(user.user_id);
    setRoleModalOpen(true);
  };

  const filtered = users.filter((u) => {
    const term = search.toLowerCase();
    return (
      u.full_name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.user_id.toLowerCase().includes(term)
    );
  });

  const totalAttendees = users.length;
  const totalTicketsIssued = users.reduce((sum, u) => sum + (u.tickets_count || 0), 0);
  const totalSpend = users.reduce((sum, u) => sum + (u.total_spent || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Header */}
      <div className="border-b border-border pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded inline-flex items-center gap-1.5 mb-2">
            <Shield className="w-3 h-3" />
            <span>SUPER ADMIN CONTROL</span>
          </div>
          <h1 className="font-heading text-3xl font-black text-foreground tracking-tight">
            Platform Users & Attendees
          </h1>
          <p className="text-muted-foreground text-xs font-medium mt-1">
            Registered platform accounts, ticket buyers, and community members who are not event organizers.
          </p>
        </div>

        <Button
          onClick={() => {
            setTargetAdminEmail("");
            setTargetAdminUserId("");
            setRoleModalOpen(true);
          }}
          className="bg-primary hover:opacity-90 text-primary-foreground text-xs font-bold gap-2 h-9 px-4 rounded-lg shadow-xs"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Elevate User to Admin</span>
        </Button>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
            <Users className="w-4 h-4 text-primary" />
            <span>Total Attendees</span>
          </div>
          <div className="font-heading text-2xl font-black text-foreground">
            {totalAttendees.toLocaleString()}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Non-organizer accounts</div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
            <Ticket className="w-4 h-4 text-chart-blue" />
            <span>Total Tickets Registered</span>
          </div>
          <div className="font-heading text-2xl font-black text-chart-blue">
            {totalTicketsIssued.toLocaleString()}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Confirmed event bookings</div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
            <CreditCard className="w-4 h-4 text-chart-green" />
            <span>Attendee Gross Volume</span>
          </div>
          <div className="font-heading text-2xl font-black text-chart-green">
            ₦{totalSpend.toLocaleString()}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Cumulative ticket purchase spend</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or user ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border text-xs h-10 rounded-lg"
          />
        </div>
        <div className="text-xs text-muted-foreground font-mono font-medium hidden sm:block">
          Showing {filtered.length} of {users.length} accounts
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-medium">Fetching platform users directory…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card border border-dashed border-border rounded-xl space-y-2">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/30" />
          <h3 className="font-heading text-base font-bold text-foreground">No accounts found</h3>
          <p className="text-xs text-muted-foreground">
            {search ? "No platform users matched your search criteria." : "No non-organizer accounts registered yet."}
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
                    Contact Information
                  </th>
                  <th className="px-4 py-3 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">
                    Tickets Registered
                  </th>
                  <th className="px-4 py-3 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">
                    Total Spend
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
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                          {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                            <span>{user.full_name}</span>
                            {user.is_admin && (
                              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 py-0">
                                Admin
                              </Badge>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            ID: {user.user_id.slice(0, 12)}…
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <div className="text-xs text-foreground font-medium flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span>{user.email || "No email on record"}</span>
                        </div>
                        {user.phone && (
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="font-mono text-xs font-bold">
                        {user.tickets_count} {user.tickets_count === 1 ? "ticket" : "tickets"}
                      </Badge>
                    </td>

                    <td className="px-4 py-3 font-mono font-bold text-xs text-foreground">
                      ₦{user.total_spent.toLocaleString()}
                    </td>

                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(user.joined_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openUserHistory(user)}
                          className="h-8 px-2.5 text-xs font-semibold border-border hover:bg-muted"
                        >
                          <span>History</span>
                        </Button>
                        {!user.is_admin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handlePromoteClick(user)}
                            className="h-8 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                            title="Promote to Super Admin"
                          >
                            <Shield className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Ticket Registration History Dialog */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="sm:max-w-2xl bg-card border-border font-sans">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-black text-foreground">
              Registration & Ticket History
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Event tickets and check-in records for {selectedUser?.full_name} ({selectedUser?.email || "Attendee"}).
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {historyLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Loading registration ledger…</p>
              </div>
            ) : userHistory.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-border rounded-lg">
                <p className="text-xs text-muted-foreground">No event ticket registrations on record for this account.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {userHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between text-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-foreground">{item.event_title}</div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>Tier: {item.ticket_type_name}</span>
                        <span>·</span>
                        <span>{new Date(item.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                        {item.payment_reference && (
                          <>
                            <span>·</span>
                            <span className="font-mono text-[10px]">Ref: {item.payment_reference}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="font-mono font-bold text-foreground">
                        ₦{item.amount_paid.toLocaleString()}
                      </div>
                      <div>
                        {item.checked_in ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] py-0">
                            Checked In
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] py-0 text-muted-foreground">
                            {item.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Role Elevation Modal */}
      <AdminRoleModal
        open={roleModalOpen}
        onOpenChange={setRoleModalOpen}
        defaultEmail={targetAdminEmail}
        defaultUserId={targetAdminUserId}
        onSuccess={() => {
          fetchUsers();
        }}
      />
    </div>
  );
};

export default UsersPage;
