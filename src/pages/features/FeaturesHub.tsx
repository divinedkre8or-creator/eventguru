import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Ticket, Image as ImageIcon, ScanLine, Users, Mail, 
  Award, Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Zap, PlusCircle
} from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { SiteHeader } from "@/components/navigation/SiteHeader";
import { SiteFooter } from "@/components/navigation/SiteFooter";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { FEATURES_DATA } from "@/data/featuresData";

const FEATURE_ICONS: Record<string, any> = {
  "viral-dp-generator": ImageIcon,
  "event-ticketing": Ticket,
  "event-registration": Sparkles,
  "qr-check-in": ScanLine,
  "attendee-management": Users,
  "event-messaging": Mail,
  "event-promotion": Award,
};

export const FeaturesHub: React.FC = () => {
  const featuresList = Object.values(FEATURES_DATA);

  const hubSchema = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "EventRally Platform Features & Operating System",
      description: "Explore EventRally's all-in-one event management tools: viral DP generator, multi-tier ticketing, 1-second gate QR scanner, and attendee broadcasts.",
      url: "https://www.geteventrally.com/features",
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: featuresList.map((f, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        name: f.title,
        url: `https://www.geteventrally.com/features/${f.slug}`,
      })),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased flex flex-col selection:bg-primary selection:text-primary-foreground">
      <SEOHead
        title="Platform Features — Viral DP Generator, Ticketing & QR Gate Scanner"
        description="Discover EventRally's event operating system: automated 'I will be attending' flyer generator, multi-tier ticketing, 1-second camera QR scanner, and direct attendee messaging."
        canonicalPath="/features"
        schema={hubSchema}
      />
      
      <SiteHeader />

      <main className="flex-1">
        {/* Breadcrumbs & Hero Header */}
        <section className="border-b border-border bg-card/60 py-12 px-4 sm:px-6">
          <div className="max-w-[1440px] mx-auto space-y-4">
            <Breadcrumbs items={[{ label: "Features", href: "/features" }]} />
            
            <div className="max-w-3xl space-y-4 pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-[11px] font-mono font-bold tracking-wider uppercase">
                <Zap className="w-3.5 h-3.5" />
                <span>ALL-IN-ONE EVENT OPERATING SYSTEM</span>
              </div>

              <h1 className="font-heading text-3xl sm:text-5xl font-black text-foreground uppercase tracking-tight leading-[1.1]">
                Everything You Need to Pack Your Venue & Run Event Day Calmly.
              </h1>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                EventRally consolidates ticket sales, door operations, attendee data, and viral social media marketing into one unified platform. Free for free events with automated direct bank settlements.
              </p>
            </div>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuresList.map((feature, idx) => {
              const IconComponent = FEATURE_ICONS[feature.slug] || Sparkles;
              return (
                <motion.div
                  key={feature.slug}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.08 }}
                  whileHover={{ y: -5 }}
                  className="bg-card border border-border rounded-2xl p-6 shadow-xs hover:border-secondary transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center font-bold group-hover:bg-secondary group-hover:text-white transition-colors">
                      <IconComponent className="w-6 h-6" />
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-[10px] font-mono font-bold uppercase text-secondary tracking-wider">
                        {feature.badge}
                      </div>
                      <h2 className="font-heading text-xl font-bold text-foreground group-hover:text-secondary transition-colors">
                        {feature.title}
                      </h2>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {feature.immediateAnswer}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border/60 space-y-2">
                      <div className="text-[11px] font-bold text-foreground">Key Advantages:</div>
                      {feature.benefits.slice(0, 2).map((b, bIdx) => (
                        <div key={bIdx} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <CheckCircle2 className="w-3.5 h-3.5 text-secondary shrink-0 mt-0.5" />
                          <span><strong className="text-foreground">{b.title}:</strong> {b.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-border">
                    <Link to={`/features/${feature.slug}`}>
                      <Button variant="secondary" size="sm" className="w-full font-bold text-xs h-10 rounded-lg flex items-center justify-center gap-1 shadow-xs">
                        <span>Explore {feature.title}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Comparison / Why EventRally Banner */}
        <section className="bg-card border-y border-border py-16 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto space-y-8 text-center">
            <div className="space-y-3">
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest bg-secondary/10 text-secondary px-3 py-1 rounded inline-block">
                THE UNIFIED EVENT LIFECYCLE
              </span>
              <h2 className="font-heading text-2xl sm:text-4xl font-black uppercase text-foreground tracking-tight">
                Traditional Fragmented Tools vs. EventRally
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div className="p-6 rounded-2xl border border-destructive/30 bg-destructive/5 space-y-3">
                <h3 className="font-heading font-bold text-sm text-destructive uppercase tracking-wide">
                  The Old Fragmented Workflow
                </h3>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li>• Google Forms with unverified duplicate submissions</li>
                  <li>• Graphic designers manually making flyers for each person</li>
                  <li>• Manual bank transfer screenshot verification</li>
                  <li>• 40-minute entrance queues with paper rosters</li>
                  <li>• Juggling 5 different disconnected software subscriptions</li>
                </ul>
              </div>

              <div className="p-6 rounded-2xl border border-secondary/40 bg-secondary/5 space-y-3">
                <h3 className="font-heading font-bold text-sm text-secondary uppercase tracking-wide">
                  The Unified EventRally Flow
                </h3>
                <ul className="space-y-2 text-xs text-foreground font-medium">
                  <li>✓ 2-Minute event publish with verified ticket tiers</li>
                  <li>✓ Automated 1-click "I Will Be Attending" flyer generator</li>
                  <li>✓ Automated direct local bank account settlements</li>
                  <li>✓ 1-Second camera QR gate check-in on any smartphone</li>
                  <li>✓ All-in-one organizer studio with zero subscription fees</li>
                </ul>
              </div>
            </div>

            <div className="pt-4">
              <Link to="/signup">
                <Button variant="secondary" size="lg" className="font-bold text-sm h-12 px-8 rounded-lg shadow-md flex items-center gap-2 mx-auto">
                  <PlusCircle className="w-4 h-4" />
                  <span>Start Hosting on EventRally Free</span>
                </Button>
              </Link>
            </div>
          </div>
        </section>

      </main>

      <SiteFooter />
    </div>
  );
};

export default FeaturesHub;
