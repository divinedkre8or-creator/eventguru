import React from "react";
import { Link, useLocation } from "react-router-dom";
import { SiteHeader } from "@/components/navigation/SiteHeader";
import { SiteFooter } from "@/components/navigation/SiteFooter";
import { SEOHead } from "@/components/seo/SEOHead";
import { 
  FileText, Shield, UserCheck, RefreshCw, AlertTriangle, 
  Cookie, Printer, ExternalLink, Scale, CheckCircle2 
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface LegalLayoutProps {
  title: string;
  description: string;
  lastUpdated: string;
  effectiveDate: string;
  children: React.ReactNode;
  tableOfContents?: { id: string; label: string }[];
}

export const LEGAL_TABS = [
  { path: "/terms", label: "Terms of Service", icon: FileText },
  { path: "/privacy", label: "Privacy Policy", icon: Shield },
  { path: "/organizer-terms", label: "Organizer Agreement", icon: UserCheck },
  { path: "/refund-policy", label: "Ticketing & Refunds", icon: RefreshCw },
  { path: "/acceptable-use", label: "Acceptable Use & DP", icon: AlertTriangle },
  { path: "/cookies", label: "Cookie Policy", icon: Cookie },
];

export const LegalLayout: React.FC<LegalLayoutProps> = ({
  title,
  description,
  lastUpdated,
  effectiveDate,
  children,
  tableOfContents = [],
}) => {
  const location = useLocation();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <SEOHead 
        title={`${title} | Legal & Compliance — EventRally`}
        description={description}
      />
      <SiteHeader />

      {/* Hero Banner */}
      <section className="border-b border-border bg-gradient-to-b from-muted/40 via-card to-background pt-28 pb-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-semibold tracking-wide uppercase">
            <Scale className="w-3.5 h-3.5" />
            Legal, Regulatory & Trust Framework
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-extrabold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl leading-relaxed">
            {description}
          </p>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2 text-xs text-muted-foreground border-t border-border/60">
            <div>
              <span className="font-semibold text-foreground">Last Updated:</span> {lastUpdated}
            </div>
            <div>
              <span className="font-semibold text-foreground">Effective Date:</span> {effectiveDate}
            </div>
            <div className="flex items-center gap-1.5 text-chart-green font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Compliant with NDPA 2023 & FCCPA 2018</span>
            </div>
            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs h-8 border-border hover:bg-muted"
              >
                <Printer className="w-3.5 h-3.5" />
                Print / Save PDF
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Sub-Tabs */}
      <div className="sticky top-16 z-30 bg-card/90 backdrop-blur-md border-b border-border shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <nav className="flex items-center gap-2 overflow-x-auto py-2.5 no-scrollbar text-xs font-medium">
            {LEGAL_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = location.pathname === tab.path;
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-secondary text-white font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Document Body */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Quick-Jump Table of Contents Sidebar */}
          {tableOfContents.length > 0 && (
            <aside className="hidden lg:block lg:col-span-4 space-y-6">
              <div className="sticky top-32 p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  Document Sections
                </h3>
                <nav className="space-y-1 text-xs">
                  {tableOfContents.map((item, idx) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="block py-1.5 px-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    >
                      <span className="font-mono text-muted-foreground/60 mr-1.5">{idx + 1}.</span>
                      {item.label}
                    </a>
                  ))}
                </nav>

                <div className="pt-4 border-t border-border space-y-3">
                  <div className="text-[11px] text-muted-foreground">
                    Have questions about this policy or regulatory inquiries?
                  </div>
                  <a
                    href="mailto:eventrallyinfo@gmail.com"
                    className="inline-flex items-center gap-1 text-xs text-secondary font-bold hover:underline"
                  >
                    Contact Legal & Support <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </aside>
          )}

          {/* Main Legal Copy */}
          <article className={`${tableOfContents.length > 0 ? "lg:col-span-8" : "lg:col-span-12"} space-y-8 prose prose-neutral dark:prose-invert max-w-none text-sm leading-relaxed text-muted-foreground`}>
            {children}
          </article>

        </div>
      </main>

      <SiteFooter />
    </div>
  );
};
