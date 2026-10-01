import React from "react";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { Cookie, ShieldCheck, Settings, CheckCircle2 } from "lucide-react";

export const CookiePolicy: React.FC = () => {
  const tableOfContents = [
    { id: "what-are-cookies", label: "What Are Cookies & Local Storage?" },
    { id: "cookies-we-use", label: "Types of Cookies We Use" },
    { id: "specific-tokens", label: "Key Storage Items on EventRally" },
    { id: "third-party", label: "Third-Party Technologies" },
    { id: "managing-cookies", label: "How to Control & Disable Cookies" },
    { id: "contact", label: "Cookie Inquiries" },
  ];

  return (
    <LegalLayout
      title="Cookie Policy"
      description="Learn how EventRally uses cookies, local browser storage, and related technologies to provide a fast, secure ticketing experience."
      lastUpdated="October 1, 2026"
      effectiveDate="October 1, 2026"
      tableOfContents={tableOfContents}
    >
      {/* Policy Notice */}
      <div className="p-4 sm:p-5 rounded-2xl bg-secondary/10 border border-secondary/20 text-foreground space-y-2 not-prose">
        <div className="flex items-center gap-2 font-heading font-bold text-sm text-secondary">
          <Cookie className="w-4 h-4 shrink-0" />
          <span>Transparent & Minimal Cookie Usage</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          EventRally uses essential cookies and browser storage primarily to keep you securely logged in, preserve your theme preferences, 
          and store offline tickets in your browser wallet. We do <strong>not</strong> sell your data to third-party ad networks.
        </p>
      </div>

      {/* Section 1 */}
      <section id="what-are-cookies" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          1. What Are Cookies & Browser Local Storage?
        </h2>
        <p>
          Cookies are small text files stored on your computer, smartphone, or tablet when you visit websites. 
          Similar storage technologies—such as <em>HTML5 Local Storage</em> and <em>Session Storage</em>—allow modern web applications 
          like EventRally to retain session states, offline tickets, and personalized settings across page visits.
        </p>
      </section>

      {/* Section 2 */}
      <section id="cookies-we-use" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          2. Categories of Cookies We Use
        </h2>
        <div className="space-y-3 text-xs sm:text-sm">
          <div className="p-4 rounded-xl border border-border bg-card space-y-1.5 not-prose">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <ShieldCheck className="w-4 h-4 text-chart-green" />
              <span>1. Strictly Necessary & Security Cookies (Always Active)</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              These cookies and tokens are vital for the core functionality of the platform. They authenticate your account session, 
              prevent fraudulent form submissions (CSRF protection), and power our instant checkout system. Without them, you cannot log in or buy tickets.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card space-y-1.5 not-prose">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Settings className="w-4 h-4 text-secondary" />
              <span>2. Functional & Preference Storage</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              These tokens remember your personal interface preferences, such as your chosen color theme (light or dark mode), 
              cached tickets for offline door validation, and language preferences.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3 */}
      <section id="specific-tokens" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          3. Specific Storage Items Used on EventRally
        </h2>
        <div className="overflow-x-auto not-prose">
          <table className="w-full text-xs text-left border border-border rounded-xl overflow-hidden">
            <thead className="bg-muted text-foreground font-mono uppercase text-[10px]">
              <tr>
                <th className="p-3 border-b border-border">Name</th>
                <th className="p-3 border-b border-border">Type</th>
                <th className="p-3 border-b border-border">Purpose & Lifespan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="p-3 font-semibold text-foreground">sb-*-auth-token</td>
                <td className="p-3">Local Storage</td>
                <td className="p-3">Secures your authenticated user session with Supabase. Persistent until logout.</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-foreground">vite-ui-theme</td>
                <td className="p-3">Local Storage</td>
                <td className="p-3">Preserves your preferred theme (Dark Mode / Light Mode). Persistent.</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-foreground">eventrally_cookie_consent</td>
                <td className="p-3">Local Storage</td>
                <td className="p-3">Remembers your acknowledgment of our legal and cookie policies. 1 Year.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 4 */}
      <section id="third-party" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          4. Third-Party Integrations
        </h2>
        <p>
          When you execute a payment on EventRally, our payment partner <strong>Paystack</strong> may initialize temporary security tokens 
          necessary to verify fraud prevention protocols (such as 3D Secure card authentication mandated by the Central Bank of Nigeria).
        </p>
      </section>

      {/* Section 5 */}
      <section id="managing-cookies" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          5. How to Control or Delete Cookies
        </h2>
        <p>
          You have the right to accept or decline cookies through your browser settings. Most browsers automatically accept cookies, 
          but you can usually modify your browser setting to decline cookies if you prefer:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
          <li><strong>Google Chrome:</strong> Settings → Privacy and Security → Cookies and other site data</li>
          <li><strong>Apple Safari:</strong> Preferences → Privacy → Manage Website Data</li>
          <li><strong>Mozilla Firefox:</strong> Settings → Privacy & Security → Enhanced Tracking Protection</li>
        </ul>
        <p className="text-xs text-muted-foreground">
          <em>Note: If you choose to disable essential cookies or browser storage, key areas of EventRally (such as logging into your dashboard or accessing offline ticket passes) may not function properly.</em>
        </p>
      </section>

      {/* Section 6 */}
      <section id="contact" className="space-y-3 pt-4 border-t border-border/60">
        <h2 className="text-xl font-heading font-bold text-foreground">
          6. Inquiries
        </h2>
        <p>
          For any questions regarding our use of cookies or tracking technologies, please contact <a href="mailto:eventrallyinfo@gmail.com" className="text-secondary font-medium hover:underline">eventrallyinfo@gmail.com</a>.
        </p>
      </section>
    </LegalLayout>
  );
};

export default CookiePolicy;
