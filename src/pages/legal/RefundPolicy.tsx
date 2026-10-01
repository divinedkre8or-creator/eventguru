import React from "react";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { RefreshCw, CheckCircle2, AlertOctagon, HelpCircle, ScanLine, Clock } from "lucide-react";

export const RefundPolicy: React.FC = () => {
  const tableOfContents = [
    { id: "overview", label: "Overview & Statutory Rights" },
    { id: "cancelled-events", label: "Event Cancellations" },
    { id: "postponed-events", label: "Postponements & Rescheduling" },
    { id: "buyer-change-of-mind", label: "Attendee Change of Mind" },
    { id: "service-fees", label: "Handling of Platform & Processing Fees" },
    { id: "gate-admission", label: "Gate QR Validation & Single-Admission Rule" },
    { id: "denial-of-entry", label: "Organizer Right to Deny Admission" },
    { id: "refund-process", label: "How to Request a Refund" },
  ];

  return (
    <LegalLayout
      title="Ticketing & Refund Policy"
      description="Clear, transparent terms governing ticket purchases, gate check-in admission, event cancellations, and refund eligibility under Nigerian consumer protection standards."
      lastUpdated="October 1, 2026"
      effectiveDate="October 1, 2026"
      tableOfContents={tableOfContents}
    >
      {/* Consumer Rights Callout */}
      <div className="p-4 sm:p-5 rounded-2xl bg-secondary/10 border border-secondary/20 text-foreground space-y-2 not-prose">
        <div className="flex items-center gap-2 font-heading font-bold text-sm text-secondary">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>FCCPA 2018 Consumer Protection Standard</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          EventRally complies with the Federal Competition and Consumer Protection Act (FCCPA) 2018. Consumers have the right 
          to fair value, truthful event representation, and prompt refunds when an event organizer fails to deliver the promised service.
        </p>
      </div>

      {/* Section 1 */}
      <section id="overview" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          1. Overview & Scope
        </h2>
        <p>
          This Ticketing & Refund Policy outlines the terms governing ticket passes, registrations, gate admission, and refund eligibility 
          for all events hosted on EventRally. When acquiring a ticket (whether paid or free), you enter into a binding admission contract 
          with the Event Organizer, facilitated through EventRally&apos;s digital infrastructure.
        </p>
      </section>

      {/* Section 2 */}
      <section id="cancelled-events" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          2. Event Cancellations
        </h2>
        <div className="p-3.5 rounded-xl bg-card border border-border text-xs space-y-1.5 not-prose">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <RefreshCw className="w-4 h-4 text-chart-green shrink-0" />
            <span>Guaranteed Refund on Complete Event Cancellation</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            If an event is cancelled in its entirety by the Organizer and not rescheduled, all ticket buyers are entitled to a refund of their ticket purchase price.
          </p>
        </div>
        <p>
          In the event of a cancellation:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
          <li>The Organizer is legally responsible for authorizing and funding refunds to all registered ticket holders.</li>
          <li>If ticket revenues remain held in EventRally&apos;s settlement escrow, EventRally will reverse the payments directly to the original bank account or card used during checkout within 7 to 14 business days.</li>
          <li>If ticket proceeds were previously disbursed to the Organizer, the Organizer remains exclusively liable under Nigerian law to execute full restitution to attendees.</li>
        </ul>
      </section>

      {/* Section 3 */}
      <section id="postponed-events" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          3. Postponements & Material Schedule Changes
        </h2>
        <p>
          If an event is postponed or the venue is substantially relocated (e.g., moved to a different city):
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
          <li>Your existing digital ticket will automatically remain valid for the new date and venue.</li>
          <li>If you are unable to attend on the rescheduled date, you have the right to request a full refund within fourteen (14) calendar days of the postponement announcement.</li>
        </ul>
      </section>

      {/* Section 4 */}
      <section id="buyer-change-of-mind" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          4. Attendee Change of Mind & Non-Attendance
        </h2>
        <p>
          Unless explicitly stated otherwise by the Organizer on the event details page:
        </p>
        <div className="p-3.5 rounded-xl bg-card border border-border text-xs space-y-1.5 not-prose">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <AlertOctagon className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Standard Industry Rule: All Sales Final</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Tickets are non-refundable if you are unable to attend, change your mind, arrive late, or fail to present your valid pass at the venue door.
          </p>
        </div>
        <p>
          However, most EventRally tickets are transferable. You may transfer or gift your digital pass to another individual unless the event is explicitly restricted to named ticket holders or VIP credentials requiring government ID matching.
        </p>
      </section>

      {/* Section 5 */}
      <section id="service-fees" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          5. Handling of Platform Service & Payment Processing Fees
        </h2>
        <p>
          When refunds are issued for cancelled events, the face value of the ticket will be returned to the buyer. Non-refundable third-party payment gateway transaction fees (such as direct card processing and bank gateway charges deducted by Paystack) may be deducted from the refund total unless the cancellation was directly caused by an operational failure of EventRally.
        </p>
      </section>

      {/* Section 6 */}
      <section id="gate-admission" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          6. Gate QR Validation & Single-Admission Rule
        </h2>
        <p>
          Each digital ticket issued by EventRally features a unique, cryptographically signed QR code. Entry validation operates under the following strict rules:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
          <li><strong>First Scan Authoritative:</strong> A ticket grants exactly one entry. The first time a QR code is scanned and verified by an authorized gate check-in terminal, the pass is marked as admitted in our live database.</li>
          <li><strong>Duplicate Passes Voided:</strong> Any subsequent scan of the same QR code will trigger an immediate &quot;Duplicate / Already Scanned&quot; fraud alert and admission will be denied.</li>
          <li><strong>Offline Wallet Passes:</strong> Attendees are encouraged to save their ticket to their device or access the offline pass wallet prior to reaching the venue gate in case of poor mobile network coverage.</li>
        </ul>
      </section>

      {/* Section 7 */}
      <section id="denial-of-entry" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          7. Organizer Right of Admission & Venue Ejection
        </h2>
        <p>
          Event Organizers and venue operators retain the legal right to refuse entry or eject any attendee without refund if the attendee:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
          <li>Engages in disorderly, abusive, violent, or drunken conduct.</li>
          <li>Attempts to bring prohibited items (such as weapons, illicit narcotics, or unauthorized recording equipment) into the venue.</li>
          <li>Fails to meet published age requirements (e.g., 18+ for nightlife events) or refuses required bag security screening.</li>
        </ul>
      </section>

      {/* Section 8 */}
      <section id="refund-process" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          8. How to Request a Refund
        </h2>
        <p>
          To request a refund for a cancelled or rescheduled event:
        </p>
        <ol className="list-decimal pl-5 space-y-1.5 text-xs sm:text-sm">
          <li>Contact the Event Organizer directly using the organizer contact button on the event page.</li>
          <li>If the organizer is unresponsive within forty-eight (48) hours or has improperly refused a refund for a cancelled event, open a dispute by emailing our support desk at <a href="mailto:eventrallyinfo@gmail.com" className="text-secondary font-semibold underline">eventrallyinfo@gmail.com</a>.</li>
          <li>Include your <strong>Ticket Reference ID</strong> (e.g. <code className="text-foreground">EVR-...</code>), the email used during checkout, and evidence of event cancellation.</li>
        </ol>
      </section>
    </LegalLayout>
  );
};

export default RefundPolicy;
