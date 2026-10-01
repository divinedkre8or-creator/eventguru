import React from "react";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { UserCheck, Landmark, AlertTriangle, ShieldAlert, Award, FileSpreadsheet } from "lucide-react";

export const OrganizerAgreement: React.FC = () => {
  const tableOfContents = [
    { id: "overview", label: "Merchant Terms & Relationship" },
    { id: "eligibility", label: "Event Eligibility & Verification" },
    { id: "payouts-escrow", label: "Ticket Settlements & Payout Escrow" },
    { id: "fees-pricing", label: "Platform Fees & Invoicing" },
    { id: "cancellations-refunds", label: "Cancellation & Refund Obligations" },
    { id: "attendee-data", label: "Attendee Data Privacy (NDPA Compliance)" },
    { id: "campaign-broadcasts", label: "SMS & Email Broadcast Regulations" },
    { id: "chargebacks-fraud", label: "Chargebacks, Disputes & Fraud Liability" },
    { id: "indemnity", label: "Organizer Indemnification" },
    { id: "suspension-termination", label: "Account Suspension & Termination" },
  ];

  return (
    <LegalLayout
      title="Event Organizer Agreement"
      description="This Merchant Agreement governs the terms under which event creators, corporate conveners, and promoters list events, sell tickets, and receive bank payouts on EventRally."
      lastUpdated="October 1, 2026"
      effectiveDate="October 1, 2026"
      tableOfContents={tableOfContents}
    >
      {/* Escrow & Fraud Safeguard Callout */}
      <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-foreground space-y-2 not-prose">
        <div className="flex items-center gap-2 font-heading font-bold text-sm text-amber-600 dark:text-amber-400">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>Organizer Payout, Escrow & Consumer Trust Standards</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          EventRally maintains a zero-tolerance policy towards event fraud, misleading listings, and unfulfilled promises. 
          To protect ticket buyers and comply with the Federal Competition and Consumer Protection Act (FCCPA) 2018, 
          ticket revenues may be subject to settlement verification, tiered holds, or post-event clearance.
        </p>
      </div>

      {/* Section 1 */}
      <section id="overview" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          1. Merchant Terms & Legal Relationship
        </h2>
        <p>
          This Event Organizer Agreement (&quot;Agreement&quot;) constitutes a binding legal contract between EventRally 
          and any individual, enterprise, promoter, or organization (&quot;Organizer&quot;, &quot;Merchant&quot;, or &quot;Host&quot;) who creates an event 
          or distributes passes on the platform.
        </p>
        <p>
          <strong>Independent Contractor Status:</strong> You expressly acknowledge that you and EventRally are independent contractors. 
          Nothing in this Agreement creates a partnership, joint venture, employer-employee relationship, franchise, or agency relationship. 
          EventRally is strictly your limited technology provider and payment collection facilitator.
        </p>
      </section>

      {/* Section 2 */}
      <section id="eligibility" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          2. Event Eligibility & Compliance Warranties
        </h2>
        <p>By publishing an event on EventRally, the Organizer covenants, represents, and warrants that:</p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
          <li>You are legally registered under the Corporate Affairs Commission (CAC) if operating as a corporate entity, or possess valid national identification (NIN or BVN) in Nigeria.</li>
          <li>You hold all necessary municipal permits, health safety approvals, venue agreements, and intellectual property/music performance licenses (e.g., MCSN / COSON licenses for live music events in Nigeria).</li>
          <li>The event is bona fide and will take place as represented. No event may promote illegal gambling, Ponzi/pyramid schemes, explicit adult entertainment, unlicensed pharmaceutical sales, or extremist gatherings.</li>
          <li>You are fully responsible for crowd management, venue safety, physical security, first aid provision, and adherence to local emergency codes.</li>
        </ul>
      </section>

      {/* Section 3 */}
      <section id="payouts-escrow" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          3. Ticket Settlements, Banking & Payout Escrow Policy
        </h2>
        <p>
          All ticket revenues paid via debit card, bank transfer, or USSD are collected via our licensed gateway partner, Paystack, 
          and processed according to the following settlement rules:
        </p>
        <div className="space-y-2 text-xs sm:text-sm">
          <p>
            <strong>Verified Bank Account:</strong> Payouts can only be disbursed to a valid commercial bank account in Nigeria (or eligible African jurisdiction) where the verified account name matches the Organizer&apos;s registered profile or corporate CAC registration.
          </p>
          <p>
            <strong>Settlement Timeline & Staggered Release:</strong> Standard ticket proceeds are remitted within 24 to 48 hours following the verified conclusion of the event (T+1 post-event settlement). For verified corporate hosts with established transaction histories, EventRally may approve rolling advance payouts.
          </p>
          <p>
            <strong>Fraud & Dispute Hold (Escrow):</strong> EventRally reserves the absolute right to freeze, withhold, or delay ticket settlements if:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>There is a credible report or suspicion of event cancellation, abandonment, or venue unavailability.</li>
            <li>The chargeback or dispute rate exceeds 1% of total ticket volume.</li>
            <li>The event details violate our Acceptable Use Policy or applicable consumer protection laws.</li>
          </ul>
        </div>
      </section>

      {/* Section 4 */}
      <section id="fees-pricing" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          4. Platform Fees & Taxation
        </h2>
        <p>
          <strong>Platform Convenience Fee:</strong> For paid events, EventRally charges a transaction service fee (a small percentage plus payment gateway processing costs). The exact fee is displayed transparently when creating ticket tiers. Free events incur zero fees.
        </p>
        <p>
          <strong>Organizer Tax Liabilities:</strong> The Organizer acknowledges that they are exclusively responsible for calculating, reporting, and remitting any Value Added Tax (VAT), Withholding Tax (WHT), or State Entertainment Taxes (such as Lagos State Tourism & Entertainment Tax) arising from ticket sales. EventRally remits VAT solely on its own platform service commission.
        </p>
      </section>

      {/* Section 5 */}
      <section id="cancellations-refunds" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          5. Cancellation & Refund Obligations
        </h2>
        <p>
          Under the Nigerian Federal Competition and Consumer Protection Act 2018 (FCCPA), attendees are entitled to services of acceptable quality. If an event is cancelled, postponed, or substantially modified:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
          <li>The Organizer is legally obligated to initiate or fund full refunds to all affected ticket purchasers within seven (7) business days.</li>
          <li>If ticket proceeds have already been disbursed to the Organizer&apos;s bank account, the Organizer agrees to immediately return the funds to EventRally for disbursement to attendees, or directly process refunds.</li>
          <li>If an Organizer fails or refuses to refund attendees for a cancelled event, EventRally reserves the right to pursue full recovery through legal and regulatory channels, including blacklisting and referral to the FCCPC and law enforcement agencies.</li>
        </ul>
      </section>

      {/* Section 6 */}
      <section id="attendee-data" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          6. Attendee Data Stewardship & NDPA Compliance
        </h2>
        <p>
          Organizers receive access to attendee names, email addresses, phone numbers, and custom survey responses solely for the purpose of organizing and managing the specific event. As a Data Controller under the NDPA 2023, the Organizer covenants that:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
          <li>You will not sell, rent, lease, or distribute attendee personal data to third-party marketing companies, advertisers, or loan providers.</li>
          <li>You will implement appropriate organizational safeguards to prevent data breaches when exporting attendee rosters to CSV files.</li>
          <li>You will immediately honor attendee requests to unsubscribe or have their data deleted from your private mailing lists.</li>
        </ul>
      </section>

      {/* Section 7 */}
      <section id="campaign-broadcasts" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          7. SMS & Email Broadcast Regulations (Campaign Studio)
        </h2>
        <p>
          EventRally provides direct messaging tools allowing Organizers to send updates and reminders to registered guests. 
          When utilizing our Campaign Studio (SMS and Email credits):
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
          <li>You may only dispatch messages directly relevant to the event for which the attendee registered.</li>
          <li>You strictly agree not to send spam, financial solicitations, betting tips, political campaign messages, or adult content.</li>
          <li>You must comply with all Nigerian Communications Commission (NCC) Value Added Service regulations and respect Do-Not-Disturb (DND) subscriber preferences.</li>
        </ul>
      </section>

      {/* Section 8 */}
      <section id="chargebacks-fraud" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          8. Chargebacks, Disputes & Fraud Liability
        </h2>
        <p>
          If an attendee files a payment dispute or card chargeback with their issuing bank due to event cancellation, non-admission, or false advertising, the Organizer is 100% financially liable for the chargeback amount and any associated gateway penalty fees. 
          EventRally is authorized to deduct such chargeback liabilities directly from future payouts or demand immediate reimbursement.
        </p>
      </section>

      {/* Section 9 */}
      <section id="indemnity" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          9. Organizer Indemnification
        </h2>
        <p>
          The Organizer agrees to indemnify, defend, and hold harmless EventRally, its parent entity, directors, officers, employees, 
          and agents from any third-party claims, lawsuits, damages, penalties, fines, or losses (including legal fees) arising out of:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
          <li>Any personal injury, bodily harm, food poisoning, assault, stampede, fire, or fatality occurring at the event venue.</li>
          <li>Copyright, trademark, or artist right infringement in event branding, promotional flyers, or performance lineups.</li>
          <li>Violation of local laws, failure to acquire necessary permits, or cancellation without refunds.</li>
        </ul>
      </section>

      {/* Section 10 */}
      <section id="suspension-termination" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          10. Account Suspension & Termination
        </h2>
        <p>
          EventRally reserves the right to immediately terminate or suspend an Organizer&apos;s account, unpublish active events, 
          and freeze pending settlements upon breach of this Agreement, credible allegations of fraud, or violation of applicable Nigerian laws.
        </p>
      </section>
    </LegalLayout>
  );
};

export default OrganizerAgreement;
