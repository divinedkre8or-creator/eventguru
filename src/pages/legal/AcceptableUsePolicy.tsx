import React from "react";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { AlertTriangle, Image as ImageIcon, ShieldAlert, MailCheck, Flag, CheckCircle2 } from "lucide-react";

export const AcceptableUsePolicy: React.FC = () => {
  const tableOfContents = [
    { id: "overview", label: "Purpose & Scope" },
    { id: "dp-generator-rules", label: "Viral DP Studio & Image Rights" },
    { id: "prohibited-content", label: "Prohibited Content & Events" },
    { id: "messaging-rules", label: "Campaign Studio & Anti-Spam Policy" },
    { id: "copyright-takedown", label: "Copyright Notice & Takedown Protocol" },
    { id: "enforcement", label: "Violations, Suspension & Reporting" },
  ];

  return (
    <LegalLayout
      title="Acceptable Use & Content Policy"
      description="Standards governing user-generated content, flyer uploads, Viral DP Studio portrait rights, and broadcast messaging across EventRally."
      lastUpdated="October 1, 2026"
      effectiveDate="October 1, 2026"
      tableOfContents={tableOfContents}
    >
      {/* Notice */}
      <div className="p-4 sm:p-5 rounded-2xl bg-secondary/10 border border-secondary/20 text-foreground space-y-2 not-prose">
        <div className="flex items-center gap-2 font-heading font-bold text-sm text-secondary">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Zero-Tolerance Policy for Harmful, Infringing, or Fraudulent Content</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          EventRally exists to empower community gatherings, educational summits, music concerts, and celebrations. 
          To protect attendees, partners, and our community, we strictly prohibit any malicious, deceptive, infringing, 
          or offensive use of our platform.
        </p>
      </div>

      {/* Section 1 */}
      <section id="overview" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          1. Purpose & Scope
        </h2>
        <p>
          This Acceptable Use & Content Policy (&quot;AUP&quot;) applies to all individuals and entities who upload images, 
          design DP frames, publish event flyers, create event descriptions, or send messages using EventRally. 
          By utilizing any of these features, you agree to adhere strictly to these guidelines.
        </p>
      </section>

      {/* Section 2 */}
      <section id="dp-generator-rules" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          2. Viral DP Studio & Portrait Rights Policy
        </h2>
        <div className="p-3.5 rounded-xl bg-card border border-border text-xs space-y-1.5 not-prose">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <ImageIcon className="w-4 h-4 text-secondary shrink-0" />
            <span>Attendee Image Ownership & Right of Publicity</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Every attendee owns the rights to their personal likeness and portrait. Uploading another person&apos;s photo without their explicit consent is strictly prohibited.
          </p>
        </div>
        <p>
          When using the EventRally DP Generator:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
          <li><strong>Ownership of Likeness:</strong> You represent and warrant that you are the person depicted in the photograph you upload, or that you have received documented authorization from the individual.</li>
          <li><strong>No Minors Without Parental Consent:</strong> You must not upload photographs of children under 13 years of age without express parental or legal guardian authorization.</li>
          <li><strong>Organizer Frame Designs:</strong> Organizers designing DP frames warrant that they own or have licensed all graphics, logos, brand emblems, and background artwork incorporated into their frames.</li>
        </ul>
      </section>

      {/* Section 3 */}
      <section id="prohibited-content" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          3. Prohibited Content & Banned Event Categories
        </h2>
        <p>You may not list, advertise, or upload materials relating to any of the following:</p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
          <li><strong>Fraudulent Schemes:</strong> Ponzi schemes, &quot;get-rich-quick&quot; pyramid operations, unregistered crypto token ICOs, deceptive loan schemes, or unauthorized betting syndicates.</li>
          <li><strong>Explicit Adult Content:</strong> Sexually explicit imagery, pornography, commercial escort services, or non-consensual sexual content.</li>
          <li><strong>Hate Speech & Defamation:</strong> Content promoting violence, discrimination, tribalism, or religious incitement under Nigerian penal legislation.</li>
          <li><strong>Weapons & Illegal Substances:</strong> Events promoting the sale, trade, or consumption of illegal narcotics, unregulated pharmaceuticals, or firearms.</li>
          <li><strong>Impersonation:</strong> Falsely representing yourself as a celebrity, political figure, brand ambassador, or government agency.</li>
        </ul>
      </section>

      {/* Section 4 */}
      <section id="messaging-rules" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          4. Campaign Studio & Anti-Spam Policy (SMS & Email)
        </h2>
        <p>
          EventRally provides direct messaging capabilities to keep registered attendees informed. 
          To prevent telecom abuses and adhere to the regulations of the Nigerian Communications Commission (NCC):
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
          <li><strong>No Third-Party Lists:</strong> You may only broadcast messages to individuals who voluntarily registered for your specific event. Uploading, buying, or scraping external contact lists is grounds for immediate permanent account ban.</li>
          <li><strong>Event-Related Only:</strong> All communications must pertain directly to event logistics (e.g. venue directions, schedule updates, dress codes, speaker announcements). You may not use event lists to advertise unrelated products, loans, or services.</li>
          <li><strong>Compulsory Unsubscribe:</strong> Every promotional broadcast must include clear opt-out instructions or an unsubscribe link.</li>
        </ul>
      </section>

      {/* Section 5 */}
      <section id="copyright-takedown" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          5. Intellectual Property & Copyright Takedown (Nigerian Copyright Act 2022)
        </h2>
        <p>
          EventRally respects the intellectual property rights of creators, graphic artists, and musicians. 
          Under Section 54 of the Nigerian Copyright Act 2022, EventRally operates a notice-and-takedown procedure:
        </p>
        <p>
          If you believe an event flyer, DP template, or listing infringes your copyright or trademark, please send a written takedown notice to 
          <a href="mailto:copyright@geteventrally.com" className="text-secondary font-semibold underline"> copyright@geteventrally.com</a> containing:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
          <li>Identification of the copyrighted work claimed to have been infringed.</li>
          <li>The specific URL link to the infringing event or DP frame on EventRally.</li>
          <li>Evidence of your copyright ownership or authorization to act on behalf of the owner.</li>
          <li>Your full contact details and a statement that the information in the notification is accurate under penalty of perjury.</li>
        </ul>
        <p>
          Upon receipt of a valid notice, EventRally will promptly remove or disable access to the infringing material within twenty-four (24) hours.
        </p>
      </section>

      {/* Section 6 */}
      <section id="enforcement" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          6. Violations, Penalties & Community Reporting
        </h2>
        <p>
          Violation of this Policy may result in immediate event cancellation without refund, permanent termination of organizer accounts, 
          forfeiture of platform messaging credits, and submission of incident reports to law enforcement agencies or the FCCPC where criminal fraud is detected.
        </p>
        <p>
          To report a suspicious event or abusive content, email <a href="mailto:trust@geteventrally.com" className="text-secondary font-semibold underline">trust@geteventrally.com</a>.
        </p>
      </section>
    </LegalLayout>
  );
};

export default AcceptableUsePolicy;
