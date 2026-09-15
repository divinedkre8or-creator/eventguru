import React from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  CheckCircle2, ArrowRight, ArrowUpRight, HelpCircle, 
  Sparkles, ShieldCheck, Users, Zap, BookOpen, PlusCircle
} from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { SiteHeader } from "@/components/navigation/SiteHeader";
import { SiteFooter } from "@/components/navigation/SiteFooter";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { FEATURES_DATA } from "@/data/featuresData";
import { GUIDES_DATA } from "@/data/guidesData";

export const FeatureDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const feature = slug ? FEATURES_DATA[slug] : null;

  if (!feature) {
    return <Navigate to="/features" replace />;
  }

  // Build JSON-LD structured data (SoftwareApplication, FAQPage)
  const featureSchema = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: `EventRally ${feature.title}`,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "NGN",
      },
      description: feature.immediateAnswer,
      url: `https://www.geteventrally.com/features/${feature.slug}`,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: feature.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased flex flex-col selection:bg-primary selection:text-primary-foreground">
      <SEOHead
        title={feature.metaTitle}
        description={feature.metaDescription}
        canonicalPath={`/features/${feature.slug}`}
        schema={featureSchema}
      />

      <SiteHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="border-b border-border bg-card/60 py-12 lg:py-16 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <Breadcrumbs
              items={[
                { label: "Features", href: "/features" },
                { label: feature.title, href: `/features/${feature.slug}` },
              ]}
            />

            <div className="space-y-4 pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-[11px] font-mono font-bold tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{feature.badge}</span>
              </div>

              <h1 className="font-heading text-3xl sm:text-5xl font-black text-foreground uppercase tracking-tight leading-[1.1]">
                {feature.h1}
              </h1>

              {/* Immediate Answer Block (AEO / GEO Direct Answer) */}
              <div className="p-5 sm:p-6 rounded-2xl border-2 border-secondary/30 bg-secondary/5 space-y-2">
                <div className="text-[10px] font-mono font-bold uppercase text-secondary tracking-wider">
                  QUICK OVERVIEW
                </div>
                <p className="text-sm sm:text-base text-foreground font-medium leading-relaxed">
                  {feature.immediateAnswer}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link to="/signup">
                  <Button variant="secondary" size="lg" className="font-bold text-sm h-12 px-7 rounded-lg shadow-md flex items-center gap-2">
                    <PlusCircle className="w-4 h-4" />
                    <span>Create Your Event Free</span>
                  </Button>
                </Link>
                <Link to="/events">
                  <Button variant="outline" size="lg" className="font-bold text-sm h-12 px-6 rounded-lg">
                    Explore Live Events
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Problem vs Solution Section */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-12">
          
          {/* Problem Box */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-destructive rounded-xs"></div>
              <span className="text-destructive font-mono text-[11px] font-bold tracking-widest uppercase">
                THE CHALLENGE ORGANIZERS FACE
              </span>
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-black text-foreground uppercase tracking-tight">
              {feature.problemHeading}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {feature.problemDescription}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {feature.problemPoints.map((point, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-xs text-muted-foreground leading-relaxed flex items-start gap-2.5">
                  <span className="text-destructive font-bold">✕</span>
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Solution Box */}
          <div className="space-y-4 pt-6 border-t border-border">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-secondary rounded-xs"></div>
              <span className="text-secondary font-mono text-[11px] font-bold tracking-widest uppercase">
                THE EVENTRALLY SOLUTION
              </span>
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-black text-foreground uppercase tracking-tight">
              {feature.solutionHeading}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {feature.solutionDescription}
            </p>
          </div>

        </section>

        {/* How It Works (Step-by-Step Breakdown) */}
        <section className="bg-card border-y border-border py-16 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto space-y-10">
            <div className="text-center space-y-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest bg-secondary/10 text-secondary px-3 py-1 rounded inline-block">
                SIMPLE WORKFLOW
              </span>
              <h2 className="font-heading text-2xl sm:text-3xl font-black uppercase text-foreground tracking-tight">
                How It Works in 4 Steps
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {feature.steps.map((step) => (
                <div key={step.step} className="p-6 rounded-2xl border border-border bg-background shadow-xs space-y-2">
                  <div className="font-mono text-xs font-black text-secondary uppercase">
                    STEP {step.step}
                  </div>
                  <h3 className="font-heading text-base font-bold text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Key Benefits Grid */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-8">
          <div className="space-y-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest bg-secondary/10 text-secondary px-3 py-1 rounded inline-block">
              KEY ADVANTAGES
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-black uppercase text-foreground tracking-tight">
              Outcome-Focused Capabilities
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {feature.benefits.map((benefit, idx) => (
              <div key={idx} className="p-5 rounded-xl border border-border bg-card shadow-2xs space-y-2">
                {benefit.badge && (
                  <span className="text-[10px] font-mono font-bold text-secondary uppercase">
                    {benefit.badge}
                  </span>
                )}
                <h3 className="font-heading text-sm font-bold text-foreground">
                  {benefit.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Who It Is For (Personas) */}
        <section className="bg-card border-y border-border py-16 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="space-y-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest bg-secondary/10 text-secondary px-3 py-1 rounded inline-block">
                TARGET AUDIENCE
              </span>
              <h2 className="font-heading text-2xl sm:text-3xl font-black uppercase text-foreground tracking-tight">
                Who Uses {feature.title}?
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {feature.personas.map((persona, idx) => (
                <div key={idx} className="p-5 rounded-xl border border-border bg-background space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center font-bold">
                    <Users className="w-4 h-4" />
                  </div>
                  <h3 className="font-heading text-sm font-bold text-foreground">
                    {persona.role}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {persona.useCase}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Frequently Asked Questions (AEO) */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-8">
          <div className="space-y-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest bg-secondary/10 text-secondary px-3 py-1 rounded inline-block">
              QUESTIONS & ANSWERS
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-black uppercase text-foreground tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {feature.faqs.map((faq, idx) => (
              <div key={idx} className="p-6 rounded-2xl border border-border bg-card shadow-2xs space-y-2">
                <h3 className="font-heading text-base font-bold text-foreground">
                  {faq.question}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Semantic Internal Linking (Related Features & Guides) */}
        <section className="bg-card border-y border-border py-16 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="space-y-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest bg-secondary/10 text-secondary px-3 py-1 rounded inline-block">
                EXPLORE ECOSYSTEM
              </span>
              <h2 className="font-heading text-2xl sm:text-3xl font-black uppercase text-foreground tracking-tight">
                Related Capabilities & Practical Guides
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Related Feature Links */}
              <div className="p-5 rounded-xl border border-border bg-background space-y-3">
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                  Interconnected Features
                </h3>
                <div className="space-y-2">
                  {feature.relatedSlugs.map((relSlug) => {
                    const relFeature = FEATURES_DATA[relSlug];
                    if (!relFeature) return null;
                    return (
                      <Link
                        key={relSlug}
                        to={`/features/${relSlug}`}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-border/80 hover:border-secondary transition-colors group"
                      >
                        <span className="text-xs font-bold text-foreground group-hover:text-secondary transition-colors">
                          {relFeature.title}
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-secondary transition-colors" />
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Related Guide Links */}
              <div className="p-5 rounded-xl border border-border bg-background space-y-3">
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                  Recommended Guides
                </h3>
                <div className="space-y-2">
                  {feature.relatedGuideSlugs.map((guideSlug) => {
                    const guide = GUIDES_DATA[guideSlug];
                    if (!guide) return null;
                    return (
                      <Link
                        key={guideSlug}
                        to={`/guides/${guideSlug}`}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-border/80 hover:border-secondary transition-colors group"
                      >
                        <span className="text-xs font-bold text-foreground group-hover:text-secondary transition-colors line-clamp-1">
                          {guide.title}
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-secondary transition-colors shrink-0 ml-2" />
                      </Link>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Conversion CTA */}
        <section className="py-20 px-4 sm:px-6 text-center">
          <div className="max-w-2xl mx-auto space-y-4">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-secondary/10 text-secondary px-3 py-1 rounded inline-block">
              READY TO LAUNCH?
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-black uppercase text-foreground tracking-tight">
              Start Using {feature.title} Today
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
              Set up your event in 2 minutes. Free events are 100% free forever with zero platform fees.
            </p>
            <div className="pt-2">
              <Link to="/signup">
                <Button variant="secondary" size="lg" className="font-bold text-sm h-12 px-8 rounded-lg shadow-md flex items-center gap-2 mx-auto">
                  <PlusCircle className="w-4 h-4" />
                  <span>Create Your Event Free</span>
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

export default FeatureDetail;
