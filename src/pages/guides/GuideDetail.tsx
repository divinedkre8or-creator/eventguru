import React from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { 
  Clock, Calendar, BookOpen, ArrowRight, ArrowLeft, 
  CheckCircle2, Sparkles, PlusCircle, Share2, Tag
} from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { SiteHeader } from "@/components/navigation/SiteHeader";
import { SiteFooter } from "@/components/navigation/SiteFooter";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { GUIDES_DATA } from "@/data/guidesData";
import { FEATURES_DATA } from "@/data/featuresData";

export const GuideDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const guide = slug ? GUIDES_DATA[slug] : null;

  if (!guide) {
    return <Navigate to="/guides" replace />;
  }

  const relatedFeature = FEATURES_DATA[guide.relatedFeatureSlug];

  // Build JSON-LD structured data (Article, HowTo, FAQPage)
  const guideSchema = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guide.title,
      description: guide.metaDescription,
      datePublished: `${guide.publishedDate}T08:00:00+01:00`,
      dateModified: `${guide.publishedDate}T08:00:00+01:00`,
      author: {
        "@type": "Organization",
        name: "EventRally Editorial Team",
        url: "https://www.geteventrally.com",
      },
      publisher: {
        "@type": "Organization",
        name: "EventRally",
        logo: {
          "@type": "ImageObject",
          url: "https://www.geteventrally.com/ER%20full%20logo.png",
        },
      },
      mainEntityOfPage: `https://www.geteventrally.com/guides/${guide.slug}`,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: guide.faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: f.answer,
        },
      })),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased flex flex-col selection:bg-primary selection:text-primary-foreground">
      <SEOHead
        title={guide.metaTitle}
        description={guide.metaDescription}
        canonicalPath={`/guides/${guide.slug}`}
        ogType="article"
        schema={guideSchema}
      />

      <SiteHeader />

      <main className="flex-1">
        {/* Article Header */}
        <section className="border-b border-border bg-card/60 py-12 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <Breadcrumbs
              items={[
                { label: "Guides", href: "/guides" },
                { label: guide.title, href: `/guides/${guide.slug}` },
              ]}
            />

            <div className="space-y-4 pt-2">
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="font-mono text-[10px] font-bold text-secondary uppercase bg-secondary/10 px-2.5 py-0.5 rounded">
                  {guide.category}
                </span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{guide.readTime}</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Updated {new Date(guide.publishedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>

              <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black text-foreground uppercase tracking-tight leading-[1.15]">
                {guide.h1}
              </h1>

              {/* Direct Answer Summary Block (AEO / GEO) */}
              <div className="p-5 rounded-2xl border-2 border-secondary/30 bg-secondary/5 space-y-1.5">
                <div className="text-[10px] font-mono font-bold uppercase text-secondary tracking-wider">
                  DIRECT ANSWER SUMMARY
                </div>
                <p className="text-sm sm:text-base text-foreground font-medium leading-relaxed">
                  {guide.directAnswer}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Article Body Content */}
        <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-10">
          
          {guide.sections.map((sec, idx) => (
            <section key={idx} className="space-y-4">
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight border-b border-border pb-2">
                {sec.heading}
              </h2>
              
              <div className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-line space-y-3 font-normal">
                {sec.content}
              </div>

              {sec.tip && (
                <div className="p-4 rounded-xl border border-border bg-card text-xs text-muted-foreground space-y-1">
                  <span className="font-mono font-bold text-secondary text-[10px] uppercase block">
                    PRO TIP
                  </span>
                  <p className="leading-relaxed">{sec.tip}</p>
                </div>
              )}
            </section>
          ))}

          {/* Contextual Feature Callout Box */}
          {relatedFeature && (
            <div className="p-6 rounded-2xl border-2 border-secondary/40 bg-secondary/5 space-y-4 my-8">
              <div className="flex items-center gap-2 text-secondary font-mono text-[10px] font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>HOW EVENTRALLY POWERS THIS</span>
              </div>
              <h3 className="font-heading text-lg font-bold text-foreground">
                Simplify this with the {relatedFeature.title}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {relatedFeature.immediateAnswer}
              </p>
              <div className="pt-1 flex flex-wrap gap-3">
                <Link to={`/features/${relatedFeature.slug}`}>
                  <Button variant="secondary" size="sm" className="font-bold text-xs h-9 px-4 rounded-lg shadow-sm flex items-center gap-1.5">
                    <span>Explore {relatedFeature.title}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="outline" size="sm" className="font-bold text-xs h-9 px-4 rounded-lg">
                    Host an Event Free
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Frequently Asked Questions */}
          {guide.faqs.length > 0 && (
            <section className="pt-8 border-t border-border space-y-6">
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                Frequently Asked Questions
              </h2>

              <div className="space-y-4">
                {guide.faqs.map((faq, fIdx) => (
                  <div key={fIdx} className="p-5 rounded-xl border border-border bg-card space-y-1.5 shadow-2xs">
                    <h3 className="font-heading text-sm font-bold text-foreground">
                      {faq.question}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Bottom Guide CTA */}
          <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <Link to="/guides" className="text-muted-foreground hover:text-foreground font-semibold flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Knowledge Hub
            </Link>

            <Link to="/signup">
              <Button variant="secondary" size="sm" className="font-bold text-xs h-9 px-5 rounded-lg shadow-sm flex items-center gap-1.5">
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Create Your Event Free</span>
              </Button>
            </Link>
          </div>

        </article>
      </main>

      <SiteFooter />
    </div>
  );
};

export default GuideDetail;
