import { useState } from "react";
import { Ticket, DollarSign, Users, TrendingUp, Search, PlusCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

const Tickets = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const { data: ticketData = [], isLoading } = useQuery({
    queryKey: ["organiser-tickets-v2", user?.id],
    queryFn: async () => {
      const { data: events } = await supabase
        .from("events")
        .select("id, title, status, ticket_types(id, name, price, currency, quantity, sold, is_active)")
        .eq("organiser_id", user!.id)
        .order("created_at", { ascending: false });
      return events || [];
    },
    enabled: !!user?.id,
  });

  const allTickets = ticketData.flatMap((event: any) =>
    (event.ticket_types || []).map((t: any) => ({ ...t, eventTitle: event.title, eventStatus: event.status }))
  );

  const filtered = allTickets.filter((t: any) =>
    t.name.toLowerCase().includes(search.toLowerCase()) || t.eventTitle.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = allTickets.reduce((sum: number, t: any) => sum + (t.price || 0) * (t.sold || 0), 0);
  const totalSold = allTickets.reduce((sum: number, t: any) => sum + (t.sold || 0), 0);
  const totalAvailable = allTickets.reduce((sum: number, t: any) => sum + (t.quantity || 0), 0);

  const stats = [
    { label: "Total Ticket Revenue", value: `₦${totalRevenue.toLocaleString()}`, color: "text-foreground" },
    { label: "Total Tickets Sold", value: totalSold.toLocaleString(), color: "text-chart-green" },
    { label: "Total Event Capacity", value: totalAvailable.toLocaleString(), color: "text-chart-blue" },
    { label: "Sell-Through Rate", value: totalAvailable > 0 ? `${Math.round((totalSold / totalAvailable) * 100)}%` : "0%", color: "text-chart-orange" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-muted px-2.5 py-1 rounded inline-block mb-2 text-foreground">
            COMMERCE & INVENTORY
          </div>
          <h1 className="font-heading text-3xl font-black text-foreground tracking-tight">Ticket Inventory</h1>
          <p className="text-muted-foreground text-xs font-medium mt-1">Manage ticket pricing, tiers, and capacity across all events</p>
        </div>
        <Link to="/dashboard/events/create">
          <Button className="bg-primary text-primary-foreground font-bold text-xs h-10 px-4 rounded-lg hover:opacity-90 flex items-center gap-1.5 shadow-sm">
            <PlusCircle className="w-4 h-4" /> Add Ticket Tier
          </Button>
        </Link>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, idx) => (
          <div key={idx} className="bg-card rounded-lg border border-border p-4 shadow-sm">
            <div className="text-xs font-mono font-bold text-muted-foreground uppercase">{s.label}</div>
            <div className={`font-heading text-2xl font-black ${s.color} mt-1`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative w-full sm:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search tickets by tier name or event..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card border-border text-xs h-10 rounded-lg"
        />
      </div>

      {/* Tickets Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-card border border-border rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card border border-dashed border-border rounded-lg space-y-2">
          <Ticket className="w-10 h-10 mx-auto text-muted-foreground/30" />
          <h3 className="font-heading text-base font-bold text-foreground">No ticket tiers found</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">Create an event and define ticket tiers to start accepting registrations.</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 pl-4">Ticket Tier</th>
                  <th className="p-3.5">Associated Event</th>
                  <th className="p-3.5">Price</th>
                  <th className="p-3.5">Inventory Sold</th>
                  <th className="p-3.5 text-right pr-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((ticket: any) => {
                  const pct = ticket.quantity > 0 ? (ticket.sold / ticket.quantity) * 100 : 0;
                  return (
                    <tr key={ticket.id} className="hover:bg-muted/40 transition-colors">
                      <td className="p-3.5 pl-4 font-bold text-foreground">{ticket.name}</td>
                      <td className="p-3.5 text-muted-foreground truncate max-w-[200px]">{ticket.eventTitle}</td>
                      <td className="p-3.5 font-mono font-bold text-foreground">
                        {ticket.price > 0 ? `₦${ticket.price.toLocaleString()}` : "FREE"}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-foreground">{ticket.sold} / {ticket.quantity}</span>
                          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                            <div className="h-full bg-chart-green transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 text-right pr-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          ticket.is_active !== false ? "bg-chart-green/10 text-chart-green border border-chart-green/30" : "bg-muted text-muted-foreground"
                        }`}>
                          {ticket.is_active !== false ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tickets;

