// src/components/admin/accounting/TicketEconomicsTab.tsx
import { Ticket, TrendingUp, CalendarDays, Users, Award, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

export interface EventEconomicRow {
  id: string;
  title: string;
  organiser_name: string;
  tickets_sold: number;
  gross_revenue: number;
  platform_fee: number;
  organiser_net: number;
}

interface Props {
  totalPaidTickets: number;
  totalFreeTickets: number;
  grossTicketSales: number;
  platformFeesCaptured: number;
  topEvents: EventEconomicRow[];
}

export const TicketEconomicsTab = ({
  totalPaidTickets,
  totalFreeTickets,
  grossTicketSales,
  platformFeesCaptured,
  topEvents,
}: Props) => {
  const totalTickets = totalPaidTickets + totalFreeTickets;
  const avgTicketPrice = totalPaidTickets > 0 ? grossTicketSales / totalPaidTickets : 0;
  const avgCommissionPerTicket = totalPaidTickets > 0 ? platformFeesCaptured / totalPaidTickets : 0;

  return (
    <div className="space-y-6">
      {/* 4 Unit Economic Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-mono font-bold uppercase">
            <span>Total Tickets Issued</span>
            <Ticket className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black font-mono mt-2 text-foreground">
            {totalTickets.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {totalPaidTickets.toLocaleString()} paid • {totalFreeTickets.toLocaleString()} free
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-mono font-bold uppercase">
            <span>Gross Ticket Sales</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono mt-2 text-emerald-600 dark:text-emerald-400">
            ₦{grossTicketSales.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Customer ticket spend
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-mono font-bold uppercase">
            <span>Average Ticket Price</span>
            <Award className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black font-mono mt-2 text-foreground">
            ₦{avgTicketPrice.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Across paid tier tickets
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-mono font-bold uppercase">
            <span>Avg Commission / Ticket</span>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black font-mono mt-2 text-primary">
            ₦{avgCommissionPerTicket.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Platform fee take-home
          </div>
        </div>
      </div>

      {/* Top Revenue Contributing Events */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border/60 flex items-center justify-between">
          <div>
            <h3 className="font-heading font-black text-sm uppercase tracking-wide flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              Top Revenue & Commission Generating Events
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ranked by gross ticket volume and platform fee contributions.
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-muted px-2.5 py-1 rounded text-muted-foreground">
            Top {topEvents.length} Events
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground font-mono font-bold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Event</th>
                <th className="py-3 px-4">Organizer</th>
                <th className="py-3 px-4 text-center">Tickets Sold</th>
                <th className="py-3 px-4 text-right">Gross GMV</th>
                <th className="py-3 px-4 text-right text-primary">Platform Cut (2.5%)</th>
                <th className="py-3 px-4 text-right text-muted-foreground">Organizer Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-sans">
              {topEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    No event sales recorded in selected timeframe.
                  </td>
                </tr>
              ) : (
                topEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-foreground">
                      <Link
                        to={`/events/${evt.id}`}
                        target="_blank"
                        className="hover:underline flex items-center gap-1.5"
                      >
                        {evt.title}
                        <ExternalLink className="w-3 h-3 text-muted-foreground opacity-60" />
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {evt.organiser_name}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-foreground">
                      {evt.tickets_sold}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                      ₦{evt.gross_revenue.toLocaleString("en-NG")}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-primary">
                      ₦{evt.platform_fee.toLocaleString("en-NG")}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                      ₦{evt.organiser_net.toLocaleString("en-NG")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
