import React from "react";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { ShieldCheck, AlertCircle, Scale, Building2, HelpCircle } from "lucide-react";

export const TermsOfService: React.FC = () => {
  const tableOfContents = [
    { id: "introduction", label: "Introduction & Capacity" },
    { id: "platform-role", label: "EventRally's Role as Intermediary" },
    { id: "user-accounts", label: "User Accounts & Security" },
    { id: "organizer-terms", label: "Organizer Obligations" },
    { id: "attendee-terms", label: "Attendee & Buyer Terms" },
    { id: "payments-fees", label: "Fees & Payment Processing" },
    { id: "ip-rights", label: "Intellectual Property & Licenses" },
    { id: "prohibited-activities", label: "Prohibited Conduct" },
    { id: "disclaimers", label: "Disclaimer of Warranties" },
    { id: "limitation-liability", label: "Limitation of Liability" },
    { id: "indemnification", label: "Indemnification" },
    { id: "governing-law", label: "Dispute Resolution & Nigerian Law" },
    { id: "contact", label: "Legal Contact Information" },
  ];

  return (
    <LegalLayout
      title="Terms of Service"
      description="These Terms of Service govern your access to and use of EventRally, including our website, mobile passes, viral DP studio, messaging tools, and ticketing software."
      lastUpdated="October 1, 2026"
      effectiveDate="October 1, 2026"
      tableOfContents={tableOfContents}
    >
      {/* Preamble Callout */}
      <div className="p-4 sm:p-5 rounded-2xl bg-secondary/10 border border-secondary/20 text-foreground space-y-2 not-prose">
        <div className="flex items-center gap-2 font-heading font-bold text-sm text-secondary">
          <Scale className="w-4 h-4 shrink-0" />
          <span>Binding Legal Agreement for Nigeria & African Operations</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Please read these Terms of Service carefully before creating an account or purchasing any ticket on EventRally. 
          By registering, accessing our website, or using any part of the service, you agree to be bound by these Terms and 
          all incorporated policies, including our Privacy Policy, Organizer Agreement, and Refund Policy.
        </p>
      </div>

      {/* Section 1 */}
      <section id="introduction" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          1. Introduction & Capacity to Contract
        </h2>
        <p>
          Welcome to <strong>EventRally</strong> (accessible at <code className="text-foreground">geteventrally.com</code>, operated under 
          the registered technology entity in Nigeria). These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement 
          between you (whether an event organizer, ticket purchaser, attendee, or website visitor, hereinafter &quot;User&quot;, &quot;you&quot;, or &quot;your&quot;) 
          and EventRally (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
        </p>
        <p>
          By creating an account, publishing an event, or acquiring a ticket pass, you represent and warrant that:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
          <li>You are at least 18 years of age or possess the legal capacity under the laws of the Federal Republic of Nigeria (or your jurisdiction of residence) to enter into a binding contract.</li>
          <li>If you are registering an event on behalf of a company, religious organization, institution, or collective, you possess verified authority to bind that entity to these Terms.</li>
          <li>All information provided during registration or checkout is truthful, accurate, and kept up to date.</li>
        </ul>
      </section>

      {/* Section 2 */}
      <section id="platform-role" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          2. EventRally&apos;s Role as a Technology Intermediary
        </h2>
        <div className="p-3.5 rounded-xl bg-card border border-border text-xs space-y-1.5 not-prose">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Building2 className="w-4 h-4 text-chart-green shrink-0" />
            <span>Marketplace Intermediary Notice (FCCPA 2018 Compliance)</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            EventRally is an independent ticketing, check-in, and marketing software platform. EventRally is <strong>not</strong> the event organizer, promoter, host, sponsor, producer, or venue owner.
          </p>
        </div>
        <p>
          EventRally provides the digital infrastructure enabling independent organizers (&quot;Organizers&quot;) to list events, issue tickets, 
          generate personalized viral promotional flyers (Display Pictures or &quot;DPs&quot;), send attendee updates, and validate door access 
          via QR code scanning.
        </p>
        <p>
          When you purchase a ticket or RSVP for an event, the contract for event admission, scheduling, safety, venue compliance, and performance 
          is exclusively between you (the Attendee) and the Organizer. EventRally acts solely as a limited payment collection facilitator on 
          behalf of the Organizer.
        </p>
      </section>

      {/* Section 3 */}
      <section id="user-accounts" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          3. User Accounts & Account Security
        </h2>
        <p>
          To access organizer features, save tickets to your offline wallet, or manage registrations, you may be required to register an account. 
          You agree to maintain the confidentiality of your login credentials and accept responsibility for all activities that occur under your account.
        </p>
        <p>
          You must immediately notify EventRally at <a href="mailto:support@geteventrally.com" className="text-secondary font-semibold underline">support@geteventrally.com</a> of 
          any unauthorized use of your account or security breach. EventRally will not be liable for any loss or damage arising from your failure to protect your login information.
        </p>
      </section>

      {/* Section 4 */}
      <section id="organizer-terms" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          4. Organizer Obligations & Event Warranties
        </h2>
        <p>
          Organizers listing events on EventRally represent and warrant that:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
          <li>The event is authentic, lawful, properly licensed, and physically or virtually verified.</li>
          <li>All venue permits, municipal safety clearances, copyright performance licenses (e.g. COSON / MCSN where required in Nigeria), and security measures have been secured.</li>
          <li>The event details, date, time, ticket pricing, and venue address displayed to attendees are accurate and not misleading.</li>
          <li>You will promptly honor all verified admission passes generated through the EventRally gate check-in scanner.</li>
          <li>In the event of cancellation or material rescheduling, you will adhere strictly to our Refund Policy and consumer protection standards under the Federal Competition and Consumer Protection Act 2018 (FCCPA).</li>
        </ul>
      </section>

      {/* Section 5 */}
      <section id="attendee-terms" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          5. Attendee & Ticket Buyer Terms
        </h2>
        <p>
          When obtaining a free or paid ticket on EventRally:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
          <li>Each ticket pass incorporates a unique cryptographic QR code. Each ticket grants <strong>one single admission</strong>. The first valid scan at the event gate terminal will validate entry and invalidate subsequent attempts.</li>
          <li>You are responsible for safeguarding your ticket pass. EventRally is not liable for unauthorized duplication, forwarding, or theft of digital passes.</li>
          <li>Event organizers reserve the legal right to enforce venue age restrictions, dress codes, health checks, and bag inspection at the gate, and may deny entry for unruly conduct without refund.</li>
        </ul>
      </section>

      {/* Section 6 */}
      <section id="payments-fees" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          6. Fees, Taxes & Payment Processing
        </h2>
        <p>
          <strong>Free Events:</strong> EventRally provides 100% free hosting and ticketing for free events with no listing charges or attendee RSVP fees.
        </p>
        <p>
          <strong>Paid Events:</strong> For paid ticket sales, EventRally applies a competitive service fee (disclosed transparently during event creation and checkout). Payment processing is executed securely via our licensed payment gateway partners (including Paystack, a registered Payment Solutions Service Provider under the Central Bank of Nigeria).
        </p>
        <p>
          <strong>Taxes:</strong> Fees charged by EventRally are subject to applicable Value Added Tax (VAT) at the statutory rate of 7.5% in Nigeria. Organizers are solely responsible for calculating and remitting any corporate income, withholding, or entertainment consumption taxes owed on their ticket sales.
        </p>
      </section>

      {/* Section 7 */}
      <section id="ip-rights" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          7. Intellectual Property & User Content
        </h2>
        <p>
          <strong>Platform Rights:</strong> All software, designs, algorithms, logos, trademarks, QR gate validation protocols, and styling of EventRally are the exclusive property of EventRally and protected under Nigerian and international copyright and trademark laws.
        </p>
        <p>
          <strong>Organizer & Attendee Content:</strong> When you upload event banners, promotional flyers, branding elements, or personal photos (such as for the Viral DP Generator), you retain ownership of your content. However, you grant EventRally a worldwide, non-exclusive, royalty-free license to host, display, resize, and process such assets solely for the purpose of operating the event and generating your ticket or flyer.
        </p>
      </section>

      {/* Section 8 */}
      <section id="prohibited-activities" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          8. Prohibited Conduct
        </h2>
        <p>You agree not to engage in any of the following activities on EventRally:</p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
          <li>Publishing fictitious, Ponzi, fraudulent, or multi-level marketing (MLM) schemes disguised as events.</li>
          <li>Uploading content that is defamatory, obscene, pornographic, promoting violence, or violating intellectual property rights.</li>
          <li>Attempting to circumvent, decompile, reverse-engineer, or tamper with our QR gate validation, payment settlement, or security systems.</li>
          <li>Sending unsolicited, spam, or harassing communications to attendees through our Campaign Studio in violation of Nigerian Communications Commission (NCC) regulations.</li>
        </ul>
      </section>

      {/* Section 9 */}
      <section id="disclaimers" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          9. Disclaimer of Warranties
        </h2>
        <p>
          The platform, its features, and all content are provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind, either express or implied. 
          EventRally makes no warranty that the platform will meet your requirements, be uninterrupted, timely, secure, or error-free, or that event listings 
          created by third-party organizers are complete or accurate.
        </p>
      </section>

      {/* Section 10 */}
      <section id="limitation-liability" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          10. Limitation of Liability
        </h2>
        <p>
          To the maximum extent permitted by applicable law in Nigeria and international jurisdictions, EventRally, its directors, officers, employees, 
          and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, loss of data, 
          venue cancellations, personal injury, property damage, or theft occurring at any third-party event.
        </p>
        <p>
          In any event, EventRally&apos;s total aggregate liability arising out of or related to these Terms or the use of our services shall not exceed 
          the lesser of: (a) the total service fees retained by EventRally on your transactions in the three (3) months preceding the claim, or (b) Fifty Thousand Nigerian Naira (₦50,000).
        </p>
      </section>

      {/* Section 11 */}
      <section id="indemnification" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          11. Indemnification
        </h2>
        <p>
          You agree to defend, indemnify, and hold harmless EventRally and its affiliates from and against any claims, liabilities, damages, judgments, 
          awards, losses, costs, expenses, or legal fees arising out of your breach of these Terms, your event listing, your use of attendee data, or your 
          infringement of any third-party intellectual property or privacy rights.
        </p>
      </section>

      {/* Section 12 */}
      <section id="governing-law" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          12. Dispute Resolution & Governing Law
        </h2>
        <p>
          These Terms and any dispute arising from them shall be governed by, and construed in accordance with, the laws of the 
          <strong> Federal Republic of Nigeria</strong>.
        </p>
        <p>
          In the event of any dispute, claim, or controversy, the parties agree to first attempt resolution through good-faith informal negotiations 
          for a period of thirty (30) business days. If unresolved, the dispute shall be referred to and finally resolved by binding arbitration in 
          Lagos, Nigeria, under the provisions of the Arbitration and Mediation Act 2023. The language of arbitration shall be English.
        </p>
      </section>

      {/* Section 13 */}
      <section id="contact" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          13. Legal Contact Information
        </h2>
        <p>
          If you have any questions, regulatory inquiries, or legal notices concerning these Terms of Service, please contact our legal counsel:
        </p>
        <div className="p-4 rounded-xl bg-card border border-border text-xs space-y-1.5 not-prose">
          <p className="font-bold text-foreground">EventRally Legal & Regulatory Affairs</p>
          <p className="text-muted-foreground">Email: <a href="mailto:legal@geteventrally.com" className="text-secondary font-medium hover:underline">legal@geteventrally.com</a></p>
          <p className="text-muted-foreground">General Support: <a href="mailto:support@geteventrally.com" className="text-secondary font-medium hover:underline">support@geteventrally.com</a></p>
          <p className="text-muted-foreground">Lagos, Nigeria</p>
        </div>
      </section>
    </LegalLayout>
  );
};

export default TermsOfService;
