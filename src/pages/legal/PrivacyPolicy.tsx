import React from "react";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { ShieldCheck, Lock, Database, UserCheck, Eye, FileCheck } from "lucide-react";

export const PrivacyPolicy: React.FC = () => {
  const tableOfContents = [
    { id: "overview", label: "Overview & Scope" },
    { id: "roles", label: "Data Controller vs Data Processor" },
    { id: "data-collected", label: "Categories of Data We Collect" },
    { id: "lawful-basis", label: "Lawful Basis for Processing (NDPA 2023)" },
    { id: "use-of-data", label: "How We Use Your Personal Data" },
    { id: "subprocessors", label: "Sub-Processors & Data Sharing" },
    { id: "cross-border", label: "Cross-Border Data Transfers" },
    { id: "dp-generator-data", label: "Viral DP Studio & Image Rights" },
    { id: "data-security", label: "Data Security & Encryption" },
    { id: "retention", label: "Data Retention & Storage" },
    { id: "subject-rights", label: "Your Rights as a Data Subject" },
    { id: "dpo-contact", label: "Data Protection Officer (DPO)" },
  ];

  return (
    <LegalLayout
      title="Privacy Policy"
      description="EventRally is committed to safeguarding personal data in strict compliance with the Nigeria Data Protection Act (NDPA) 2023 and African data protection regulations."
      lastUpdated="October 1, 2026"
      effectiveDate="October 1, 2026"
      tableOfContents={tableOfContents}
    >
      {/* NDPA 2023 Compliance Badge */}
      <div className="p-4 sm:p-5 rounded-2xl bg-chart-green/10 border border-chart-green/20 text-foreground space-y-2 not-prose">
        <div className="flex items-center gap-2 font-heading font-bold text-sm text-chart-green">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Statutory Compliance: Nigeria Data Protection Act (NDPA) 2023</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          This Privacy Policy sets out how EventRally collects, uses, processes, stores, and protects personal data of event organizers, 
          attendees, and platform visitors. We adhere to the principles of lawful processing, purpose specification, data minimization, 
          accuracy, storage limitation, integrity, and accountability enforced by the Nigeria Data Protection Commission (NDPC).
        </p>
      </div>

      {/* Section 1 */}
      <section id="overview" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          1. Overview & Scope
        </h2>
        <p>
          EventRally (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the digital event operating system and ticketing platform at 
          <code className="text-foreground"> geteventrally.com</code>. This Privacy Policy applies to all interactions with our website, 
          attendee ticket wallet, mobile QR gate check-in systems, Viral Display Picture (DP) Studio, and Campaign Studio messaging services.
        </p>
      </section>

      {/* Section 2 */}
      <section id="roles" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          2. Data Controller vs Data Processor Status
        </h2>
        <p>
          Under the Nigeria Data Protection Act 2023 (NDPA), EventRally acts in two distinct legal capacities:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose pt-1">
          <div className="p-4 rounded-xl border border-border bg-card space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-foreground">
              <UserCheck className="w-4 h-4 text-secondary" />
              <span>EventRally as Data Controller</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We are the Data Controller for your platform account information, login credentials, billing and payout records, 
              security audit logs, and direct inquiries. We determine the purposes and means of processing this data.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-foreground">
              <Database className="w-4 h-4 text-chart-green" />
              <span>EventRally as Data Processor</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              When attendees register for a specific third-party event and provide answers to <strong>custom organizer questions</strong> 
              (e.g., dietary preferences, company title, sizing), the <strong>Event Organizer</strong> is the primary Data Controller, 
              and EventRally acts as the Data Processor on their behalf.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3 */}
      <section id="data-collected" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          3. Categories of Personal Data We Collect
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm">
          <li>
            <strong>Identity & Contact Information:</strong> Full name, email address, mobile telephone number, and account password hash.
          </li>
          <li>
            <strong>Registration & Event Details:</strong> Ticket tier selected, registration timestamps, admission status, gate check-in records, and responses provided to custom organizer checkout questions.
          </li>
          <li>
            <strong>Financial & Payout Information:</strong> Transaction amounts, currency (e.g. NGN), payment references, and organizer bank settlement account details (bank name, account number, and verified account name). <em>Note: EventRally never stores full credit/debit card numbers or CVV codes; all card processing is tokenized directly by PCI-DSS certified gateway Paystack.</em>
          </li>
          <li>
            <strong>User-Generated Media & Photos:</strong> Photographs and headshots uploaded to our Viral DP Studio to generate event badges and fliers.
          </li>
          <li>
            <strong>Technical & Device Data:</strong> IP address, browser type and version, device identifier, time zone, and operating system.
          </li>
        </ul>
      </section>

      {/* Section 4 */}
      <section id="lawful-basis" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          4. Lawful Basis for Processing under NDPA 2023
        </h2>
        <p>
          In accordance with Section 25 of the NDPA 2023, EventRally only processes your personal data where a recognized lawful basis exists:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
          <li><strong>Contractual Necessity:</strong> To generate your ticket, send QR passes to your email, validate gate entry, and disburse ticket revenues to organizers.</li>
          <li><strong>Consent:</strong> Freely given and informed consent provided when signing up, purchasing tickets, or uploading your portrait to the DP Studio.</li>
          <li><strong>Legal Obligation:</strong> Compliance with Nigerian financial reporting, anti-money laundering (AML/CFT) laws, and consumer protection mandates.</li>
          <li><strong>Legitimate Interests:</strong> Protecting platform security, detecting fraudulent transactions, and preventing unauthorized duplication of tickets.</li>
        </ul>
      </section>

      {/* Section 5 */}
      <section id="use-of-data" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          5. How We Use Your Personal Data
        </h2>
        <p>We process your personal information for the following specific purposes:</p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
          <li>Delivering instant digital event tickets and scannable QR passes via email and SMS.</li>
          <li>Providing event organizers with accurate attendee rosters and real-time gate entry analytics.</li>
          <li>Processing payments, refunds, and bank payouts through our licensed gateway partners.</li>
          <li>Enabling organizers to dispatch legitimate event updates, venue notices, or schedule changes.</li>
          <li>Facilitating viral social sharing through the branded DP Generator.</li>
        </ul>
      </section>

      {/* Section 6 */}
      <section id="subprocessors" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          6. Sub-Processors & Third-Party Service Providers
        </h2>
        <p>
          EventRally works with industry-leading third-party service providers (&quot;Sub-Processors&quot;) who are contractually bound 
          to uphold strict data confidentiality and security standards:
        </p>
        <div className="overflow-x-auto not-prose">
          <table className="w-full text-xs text-left border border-border rounded-xl overflow-hidden">
            <thead className="bg-muted text-foreground font-mono uppercase text-[10px]">
              <tr>
                <th className="p-3 border-b border-border">Sub-Processor</th>
                <th className="p-3 border-b border-border">Function</th>
                <th className="p-3 border-b border-border">Jurisdiction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="p-3 font-semibold text-foreground">Paystack Payments Limited</td>
                <td className="p-3">Payment processing, card tokenization, bank settlements</td>
                <td className="p-3">Nigeria / USA</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-foreground">Supabase, Inc.</td>
                <td className="p-3">Encrypted database storage, authentication, file storage</td>
                <td className="p-3">USA / Global Cloud</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-foreground">Resend, Inc.</td>
                <td className="p-3">Transactional ticket delivery & organizer email updates</td>
                <td className="p-3">USA / Global Cloud</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-foreground">Termii & Textflow</td>
                <td className="p-3">Direct SMS ticket confirmation & gate reminder delivery</td>
                <td className="p-3">Nigeria</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 7 */}
      <section id="cross-border" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          7. Cross-Border Data Transfers
        </h2>
        <p>
          Certain cloud infrastructure utilized by EventRally (such as secure database and transactional email servers) is hosted 
          outside Nigeria. Pursuant to Section 41 of the NDPA 2023, EventRally ensures that cross-border transfers occur only to countries 
          offering adequate levels of personal data protection or under standard contractual clauses guaranteeing equivalent privacy safeguards.
        </p>
      </section>

      {/* Section 8 */}
      <section id="dp-generator-data" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          8. Viral DP Studio & Attendee Portrait Processing
        </h2>
        <p>
          When you upload your photo to the EventRally DP Generator, the image is processed on the client side or transiently stored 
          to generate your branded event graphic. EventRally does not harvest, sell, or perform facial biometric recognition or commercial 
          profiling on user photographs. Users can request immediate deletion of their DP assets at any time.
        </p>
      </section>

      {/* Section 9 */}
      <section id="data-security" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          9. Data Security & Encryption Standards
        </h2>
        <p>
          We employ state-of-the-art security measures to protect your personal data from unauthorized access, alteration, disclosure, or destruction. 
          This includes HTTPS / TLS 1.3 encryption in transit, AES-256 encryption at rest in our database, cryptographic ticket QR hashing, 
          Row-Level Security (RLS) policies isolating organizer data, and strict role-based access controls for administrative personnel.
        </p>
      </section>

      {/* Section 10 */}
      <section id="retention" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          10. Data Retention Policy
        </h2>
        <p>
          Personal data is retained only for as long as necessary to fulfill the purposes for which it was collected:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
          <li><strong>Attendee Records:</strong> Kept for the duration of the event lifecycle and access wallet functionality, or until deletion is requested.</li>
          <li><strong>Financial & Payment Audit Records:</strong> Retained for a minimum of six (6) years in compliance with Nigerian tax regulations and CAMA 2020 record-keeping requirements.</li>
        </ul>
      </section>

      {/* Section 11 */}
      <section id="subject-rights" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          11. Your Statutory Rights under NDPA 2023
        </h2>
        <p>As a data subject in Nigeria and across Africa, you have the following guaranteed rights:</p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
          <li><strong>Right to Access:</strong> Request a copy of all personal data held about you by EventRally.</li>
          <li><strong>Right to Rectification:</strong> Request correction of inaccurate or incomplete personal information.</li>
          <li><strong>Right to Erasure (&quot;Right to be Forgotten&quot;):</strong> Request the permanent deletion of your data where no overriding legal or regulatory basis exists.</li>
          <li><strong>Right to Data Portability:</strong> Obtain your personal registration data in a structured, commonly used CSV format.</li>
          <li><strong>Right to Object:</strong> Object at any time to the processing of your data for direct marketing or promotional SMS broadcasts.</li>
          <li><strong>Right to Lodge a Complaint:</strong> Lodge a formal grievance with the <strong>Nigeria Data Protection Commission (NDPC)</strong> (<code className="text-foreground">ndpc.gov.ng</code>) if you believe your privacy rights have been breached.</li>
        </ul>
      </section>

      {/* Section 12 */}
      <section id="dpo-contact" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          12. Data Protection Officer (DPO) Contact
        </h2>
        <p>
          To exercise your privacy rights or submit inquiries regarding our data handling practices, please contact our designated Data Protection Officer:
        </p>
        <div className="p-4 rounded-xl bg-card border border-border text-xs space-y-1.5 not-prose">
          <p className="font-bold text-foreground">Data Protection Officer (DPO) — EventRally</p>
          <p className="text-muted-foreground">Email: <a href="mailto:dpo@geteventrally.com" className="text-secondary font-medium hover:underline">dpo@geteventrally.com</a></p>
          <p className="text-muted-foreground">Privacy Desk: <a href="mailto:privacy@geteventrally.com" className="text-secondary font-medium hover:underline">privacy@geteventrally.com</a></p>
          <p className="text-muted-foreground">Lagos, Federal Republic of Nigeria</p>
        </div>
      </section>
    </LegalLayout>
  );
};

export default PrivacyPolicy;
