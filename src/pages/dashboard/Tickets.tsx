import { useState } from "react";
import { Ticket, DollarSign, Users, TrendingUp, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const Tickets = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const { data: ticketData = [], isLoading } = useQuery({
    queryKey: ["organiser-tickets", user?.id],
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

  const totalRevenue = allTickets.reduce((sum: number, t: any) => sum + t.price * t.sold, 0);
  const totalSold = allTickets.reduce((sum: number, t: any) => sum + t.sold, 0);
  const totalAvailable = allTickets.reduce((sum: number, t: any) => sum + t.quantity, 0);

  const stats = [
    { label: "Total Revenue", value: `NGN ${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-primary" },
    { label: "Tickets Sold", value: totalSold.toLocaleString(), icon: Ticket, color: "text-emerald-500" },
    { label: "Total Capacity", value: totalAvailable.toLocaleString(), icon: Users, color: "text-blue-500" },
    { label: "Sell-through", value: totalAvailable > 0 ? `${Math.round((totalSold / totalAvailable) * 100)}%` : "0%", icon: TrendingUp, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-extrabold text-foreground">Tickets</h1>
        <p className="text-muted-foreground text-sm font-body mt-1">Manage ticket types across all your events</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-muted-foreground text-xs font-medium">{s.label}</span>
            </div>
            <div className={`font-heading text-xl font-extrabold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search tickets or events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card border-border text-foreground"
        />
      </div>

      {/* Tickets Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <Ticket className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
          <h3 className="font-heading text-lg font-bold text-foreground mb-1">No tickets found</h3>
          <p className="text-muted-foreground text-sm font-body">Create an event and add ticket types to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Header - desktop */}
          <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-2 text-xs font-heading font-bold text-muted-foreground uppercase tracking-wider">
            <div className="col-span-4">Ticket</div>
            <div className="col-span-3">Event</div>
            <div className="col-span-2 text-right">Price</div>
            <div className="col-span-2 text-right">Sold</div>
            <div className="col-span-1 text-right">Status</div>
          </div>
          {filtered.map((ticket: any) => {
            const pct = ticket.quantity > 0 ? (ticket.sold / ticket.quantity) * 100 : 0;
            return (
              <div key={ticket.id} className="bg-card rounded-xl border border-border p-4 sm:grid sm:grid-cols-12 sm:gap-3 sm:items-center">
                <div className="col-span-4 mb-2 sm:mb-0">
                  <div className="font-heading text-sm font-bold text-foreground">{ticket.name}</div>
                  <div className="sm:hidden text-xs text-muted-foreground font-body mt-0.5">{ticket.eventTitle}</div>
                </div>
                <div className="col-span-3 hidden sm:block text-sm text-muted-foreground font-body truncate">{ticket.eventTitle}</div>
                <div className="col-span-2 text-right font-heading text-sm font-bold text-primary">
                  {ticket.price > 0 ? `${ticket.currency} ${ticket.price.toLocaleString()}` : "Free"}
                </div>
                <div className="col-span-2 text-right">
                  <div className="text-sm font-body text-foreground">{ticket.sold}/{ticket.quantity}</div>
                  <div className="w-full h-1 bg-border rounded-full mt-1">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
                <div className="col-span-1 text-right">
                  <span className={`inline-block w-2 h-2 rounded-full ${ticket.is_active ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Tickets;
