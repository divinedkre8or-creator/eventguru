import { useState, useEffect } from "react";
import { Users, Search, ShieldCheck, Mail, Calendar, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface OrganiserDetail {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
  events_count: number;
  total_revenue: number;
}

const AdminOrganisers = () => {
  const [organisers, setOrganisers] = useState<OrganiserDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchOrganisers = async () => {
      setLoading(true);
      try {
        // Fetch user roles
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id, role, created_at");

        if (!roles || roles.length === 0) {
          setOrganisers([]);
          setLoading(false);
          return;
        }

        const userIds = roles.map((r) => r.user_id);

        // Fetch profiles
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);

        // Fetch events per user
        const { data: events } = await supabase
          .from("events")
          .select("organiser_id, id")
          .in("organiser_id", userIds);

        // Fetch registrations revenue
        const eventIds = (events || []).map((e) => e.id);
        const { data: regs } = eventIds.length > 0
          ? await supabase
            .from("registrations")
            .select("event_id, amount_paid")
            .in("event_id", eventIds)
          : { data: [] };

        // Construct complete objects
        const list: OrganiserDetail[] = roles.map((r) => {
          const prof = (profiles || []).find((p) => p.user_id === r.user_id);
          const userEvents = (events || []).filter((e) => e.organiser_id === r.user_id);
          const userEvtIds = userEvents.map((e) => e.id);
          const revenue = (regs || [])
            .filter((reg) => userEvtIds.includes(reg.event_id))
            .reduce((sum, reg) => sum + (Number(reg.amount_paid) || 0), 0);

          return {
            user_id: r.user_id,
            full_name: prof?.full_name || "Account User",
            email: `user_${r.user_id.slice(0, 8)}@eventrally.com`,
            role: r.role,
            created_at: new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
            events_count: userEvents.length,
            total_revenue: revenue,
          };
        });

        setOrganisers(list);
      } catch (err) {
        console.error("Failed to load admin organisers:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganisers();
  }, []);

  const filtered = organisers.filter((o) =>
    o.full_name.toLowerCase().includes(search.toLowerCase()) ||
    o.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded inline-block mb-2 font-bold">
          SUPER ADMIN CONTROL
        </div>
        <h1 className="font-heading text-3xl font-black text-foreground tracking-tight">Platform Organisers</h1>
        <p className="text-muted-foreground text-xs font-medium mt-1">
          Registered event organisers, creators, and platform managers.
        </p>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search organisers by name or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card border-border text-xs h-10 rounded-lg"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-medium">Fetching registered accounts…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card border border-dashed border-border rounded-lg space-y-2">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/30" />
          <h3 className="font-heading text-base font-bold text-foreground">No accounts found</h3>
          <p className="text-xs text-muted-foreground">No organisers match your search term.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Organiser Name</th>
                  <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Role</th>
                  <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Events Created</th>
                  <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Gross Sales</th>
                  <th className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((org) => (
                  <tr key={org.user_id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 text-foreground text-xs font-bold">
                      {org.full_name}
                      <span className="block text-[10px] text-muted-foreground font-mono font-normal">ID: {org.user_id.slice(0, 12)}…</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        org.role === "admin"
                          ? "bg-primary/10 text-primary border border-primary/30"
                          : "bg-secondary/10 text-secondary border border-secondary/30"
                      }`}>
                        {org.role === "admin" ? "Super Admin" : "Organiser"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground text-xs font-mono font-bold">{org.events_count}</td>
                    <td className="px-4 py-3 text-foreground text-xs font-mono font-bold">₦{org.total_revenue.toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{org.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrganisers;
