import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Clock, Calendar, ArrowRight, Sparkles, Tag, PlusCircle } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { SiteHeader } from "@/components/navigation/SiteHeader";
import { SiteFooter } from "@/components/navigation/SiteFooter";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { GUIDES_DATA } from "@/data/guidesData";

export const GuidesHub: React.FC = () => {
  const guidesList = Object.values(GUIDES_DATA);

  const hubSchema = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Event Organizer Knowledge Hub & Practical Guides | EventRally",
      description: "Comprehensive guides on ticketing in Nigeria, creating attendee flyers, QR gate check-in, and managing free RSVP events.",
      url: "https://www.geteventrally.com/guides",
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: guidesList.map((g, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        name: g.title,
        url: `https://www.geteventrally.com/guides/${g.slug}`,
      })),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased flex flex-col selection:bg-primary selection:text-primary-foreground">
      <SEOHead
        title="Event Organizer Knowledge Hub & Practical Guides"
        description="Master event ticketing, viral attendee marketing, QR gate scanning, and RSVP management with step-by-step guides from EventRally."
        canonicalPath="/guides"
        schema={hubSchema}
      />

      <SiteHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="border-b border-border bg-card/60 py-12 px-4 sm:px-6">
          <div className="max-w-[1440px] mx-auto space-y-4">
            <Breadcrumbs items={[{ label: "Guides", href: "/guides" }]} />

            <div className="max-w-3xl space-y-4 pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-[11px] font-mono font-bold tracking-wider uppercase">
                <BookOpen className="w-3.5 h-3.5" />
                <span>ORGANIZER KNOWLEDGE BASE</span>
              </div>

              <h1 className="font-heading text-3xl sm:text-5xl font-black text-foreground uppercase tracking-tight leading-[1.1]">
                Master Live Event Operations, Ticketing & Viral Growth.
              </h1>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Practical, actionable frameworks for event organizers, conference directors, campus conveners, and festival promoters. Zero filler—just real solutions to live event challenges.
              </p>
            </div>
          </div>
        </section>

        {/* Guides Grid */}
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {guidesList.map((guide, idx) => (
              <motion.div
                key={guide.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                whileHover={{ y: -5 }}
                className="bg-card border border-border rounded-2xl p-6 shadow-xs hover:border-secondary transition-all flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-mono text-[10px] font-bold text-secondary uppercase bg-secondary/10 px-2 py-0.5 rounded">
                      {guide.category}
                    </span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{guide.readTime}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h2 className="font-heading text-lg font-bold text-foreground group-hover:text-secondary transition-colors leading-snug">
                      {guide.title}
                    </h2>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {guide.directAnswer}
                    </p>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-border">
                  <Link to={`/guides/${guide.slug}`}>
                    <Button variant="secondary" size="sm" className="w-full font-bold text-xs h-9 rounded-lg flex items-center justify-center gap-1 shadow-xs">
                      <span>Read Guide</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="bg-card border-t border-border py-16 px-4 sm:px-6 text-center">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="font-heading text-2xl sm:text-3xl font-black uppercase text-foreground tracking-tight">
              Ready to put these strategies into action?
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              Create your event on EventRally in 2 minutes. Free events are 100% free forever.
            </p>
            <div className="pt-2">
              <Link to="/signup">
                <Button variant="secondary" size="lg" className="font-bold text-sm h-12 px-8 rounded-lg shadow-md flex items-center gap-2 mx-auto">
                  <PlusCircle className="w-4 h-4" />
                  <span>Host Your Event Free</span>
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

export default GuidesHub;
