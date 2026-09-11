import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  CalendarDays, Ticket, Users, ScanLine, BarChart3, Mail, ChevronRight, 
  ArrowUpRight, Calendar, MapPin, CheckCircle2, ShieldCheck, Globe, Star,
  Loader2, Zap, Award, Image as ImageIcon, Wallet, PlusCircle, Share2, Download
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { getEventUrl } from "@/lib/slugUtils";
import { SEOHead } from "@/components/seo/SEOHead";
import { BrandLogo } from "@/components/brand/BrandLogo";

const FAQ_ITEMS = [
  {
    question: "What is EventRally?",
    answer:
      "EventRally is an all-in-one event operating system and ticketing platform that combines ticket sales, 1-second gate QR check-in, and viral attendee marketing into one unified dashboard.",
  },
  {
    question: "Is EventRally free for free events?",
    answer:
      "Yes, EventRally is 100% free for free events with unlimited registrations, zero monthly subscription fees, and no upfront listing charges.",
  },
  {
    question: "How does the Viral DP (Display Picture) Generator work?",
    answer:
      "Organizers upload their official event frame once. When an attendee secures a ticket or visits the event link, they upload their photo to instantly generate a branded social flier ready to share on WhatsApp, Instagram, and X.",
  },
  {
    question: "How do automated ticket payouts work?",
    answer:
      "Ticket revenues are collected through multi-channel checkout with automated bank settlement, transferring ticket proceeds directly to the organizer's designated bank account.",
  },
  {
    question: "How does 1-second gate QR check-in work at venues with weak internet?",
    answer:
      "EventRally includes an offline digital wallet that caches admission passes directly on attendees' phones, while the door scanner operates quickly on any phone camera without gate delays.",
  },
];

const HOMEPAGE_SCHEMA = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "EventRally",
    url: "https://eventrally.com",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://eventrally.com/events?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring", stiffness: 90, damping: 14 }
  },
};

const Index = () => {
  const [featuredEvents, setFeaturedEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    const fetchPublishedEvents = async () => {
      setLoadingEvents(true);
      const { data, error } = await supabase
        .from('events')
        .select('id, title, date, venue, city, category, image_url, is_free, max_attendees')
        .eq('status', 'published')
        .order('date', { ascending: true })
        .limit(6);
      if (!error && data) setFeaturedEvents(data);
      setLoadingEvents(false);
    };
    fetchPublishedEvents();
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground antialiased selection:bg-primary selection:text-primary-foreground overflow-x-hidden">
      <SEOHead
        title="Event Management, Ticketing & Viral Growth Platform"
        description="Sell out tickets, automate door check-in, and turn attendees into a viral marketing team with custom event fliers. Free for free events."
        canonicalPath="/"
        schema={HOMEPAGE_SCHEMA}
      />
      {/* Navigation Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full bg-card/90 backdrop-blur-md border-b border-border sticky top-0 z-50"
      >
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-1 hover:opacity-90 transition-opacity" aria-label="EventRally Home">
              <BrandLogo />
            </Link>
            <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-muted-foreground">
              <a className="hover:text-foreground transition-colors flex items-center gap-1" href="#features">
                Features <ChevronRight className="w-3 h-3 rotate-90" />
              </a>
              <Link to="/events" className="hover:text-foreground transition-colors">
                Explore Events
              </Link>
              <a className="hover:text-foreground transition-colors" href="#faq">
                FAQ
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link to="/login" className="hidden sm:inline-block text-xs font-bold text-foreground hover:opacity-80 px-2 py-1">
              Log in
            </Link>
            <Link to="/signup">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Button variant="secondary" size="sm" className="font-bold text-xs h-9 px-3 sm:px-4 rounded-lg shadow-sm">
                  Organize an Event
                </Button>
              </motion.div>
            </Link>
          </div>
        </div>
      </motion.header>

      <main>
        {/* Hero Section */}
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 py-12 lg:py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-5 pr-0 lg:pr-8 items-center text-center lg:items-start lg:text-left"
          >
            <motion.div variants={itemVariants} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-secondary rounded-xs"></div>
              <span className="text-secondary font-mono text-[11px] font-bold tracking-widest uppercase">
                THE EVENT PLATFORM FOR CREATORS & ORGANIZERS
              </span>
            </motion.div>

            <motion.h1 
              variants={itemVariants} 
              className="font-heading text-3xl sm:text-5xl lg:text-[54px] leading-[1.15] font-black tracking-tight text-foreground uppercase"
            >
              Pack your venue. Sell out tickets.{" "}
              <span className="relative inline-block text-secondary underline decoration-secondary decoration-[3.5px] underline-offset-[8px]">
                Get paid instantly.
              </span>
            </motion.h1>

            <motion.div variants={itemVariants} className="w-16 h-[2px] bg-primary my-1"></motion.div>

            <motion.p 
              variants={itemVariants} 
              className="text-base sm:text-lg text-muted-foreground max-w-lg leading-relaxed font-medium"
            >
              Everything you need to host unforgettable events. Set up ticket sales in 2 minutes, get paid directly to your bank account with automated bank settlement, and turn your attendees into a viral marketing team with custom 1-click event fliers.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mt-2">
              <Link to="/signup">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button variant="secondary" size="lg" className="font-bold text-sm h-12 px-6 rounded-lg shadow-md">
                    Create Your Event Free
                  </Button>
                </motion.div>
              </Link>
              <a href="#events">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button variant="outline" size="lg" className="border-border text-foreground font-bold text-sm h-12 px-6 rounded-lg hover:bg-muted transition-all flex items-center gap-2">
                    Explore Live Events <ArrowUpRight className="w-4 h-4" />
                  </Button>
                </motion.div>
              </a>
            </motion.div>

            {/* Social Proof Bar */}
            <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mt-6 pt-6 border-t border-border w-full">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center font-bold text-[10px] text-primary">AO</div>
                <div className="w-8 h-8 rounded-full bg-secondary/10 border-2 border-background flex items-center justify-center font-bold text-[10px] text-secondary">CN</div>
                <div className="w-8 h-8 rounded-full bg-chart-green/10 border-2 border-background flex items-center justify-center font-bold text-[10px] text-chart-green">EK</div>
                <div className="w-8 h-8 rounded-full bg-chart-purple/10 border-2 border-background flex items-center justify-center font-bold text-[10px] text-chart-purple">★</div>
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                Trusted by organizers across Nigeria & Africa. Free events are <span className="font-bold text-foreground">100% free forever</span>.
              </p>
            </motion.div>
          </motion.div>

          {/* Hero Graphic Showcase with Floating Metric Badges */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: "easeOut" }}
            className="w-full flex items-center justify-center relative"
          >
            <div className="relative w-full max-w-[560px]">
              {/* Floating Badge 1: Live Ticket Revenue */}
              <div className="absolute -top-4 -left-2 sm:-left-6 z-20 bg-card/95 backdrop-blur-md border border-border px-3.5 py-2.5 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in zoom-in-95 duration-500">
                <div className="w-9 h-9 rounded-lg bg-chart-green/15 text-chart-green flex items-center justify-center font-bold">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold uppercase text-muted-foreground">TICKET REVENUE</div>
                  <div className="font-heading text-sm font-black text-foreground">₦2,450,000 <span className="text-[10px] text-chart-green font-mono font-bold">PAID</span></div>
                </div>
              </div>

              {/* Floating Badge 2: Rapid Gate Check-In */}
              <div className="absolute -bottom-4 -right-2 sm:-right-6 z-20 bg-card/95 backdrop-blur-md border border-border px-3.5 py-2.5 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in zoom-in-95 duration-500">
                <div className="w-9 h-9 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center font-bold">
                  <ScanLine className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold uppercase text-muted-foreground">GATE SCANNER</div>
                  <div className="font-heading text-sm font-black text-foreground">1-Sec QR Entry <span className="text-[10px] text-secondary font-mono font-bold">LIVE</span></div>
                </div>
              </div>

              {/* Main Dashboard Preview Image */}
              <motion.img 
                src="/heroimg.webp" 
                alt="EventRally Organizer Dashboard Showcase" 
                whileHover={{ y: -4, scale: 1.01 }}
                transition={{ duration: 0.3 }}
                className="w-full h-auto max-h-[560px] object-contain rounded-2xl shadow-2xl transition-all border border-border/60 bg-card"
              />
            </div>
          </motion.div>
        </section>

        {/* Inverted Contrast Features Grid Section */}
        <section id="features" className="bg-neutral-950 text-neutral-100 dark:bg-white dark:text-neutral-950 border-y border-neutral-800 dark:border-neutral-200 py-16 px-4 sm:px-6 transition-colors duration-300">
          <div className="max-w-[1440px] mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
            >
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-xs bg-secondary"></div>
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-600">
                  BUILT FOR SMOOTH EVENTS FROM START TO FINISH
                </span>
              </div>
              <span className="text-xs text-neutral-400 dark:text-neutral-600 font-mono">
                ZERO COMPLICATED SETUPS
              </span>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
              {[
                { icon: Ticket, title: "Launch in 2 Minutes", desc: "Create free passes, VIP tables, early bird pricing, and promo codes in minutes." },
                { icon: Wallet, title: "Instant Bank Payouts", desc: "Collect payments seamlessly with automated multi-channel checkout. Your money goes straight to your account." },
                { icon: ImageIcon, title: "Viral DP Generator", desc: "Attendees get custom branded event fliers in 1 click to post on WhatsApp and X." },
                { icon: ScanLine, title: "1-Second Gate Scan", desc: "Scan digital passes on any phone camera or laptop. Fast queues, zero fake tickets." },
                { icon: ShieldCheck, title: "Offline Pass Passes", desc: "Attendees open their tickets and QR codes even with zero phone signal at the gate." },
                { icon: BarChart3, title: "Live Sales Numbers", desc: "Track ticket revenue, check-in percentages, and attendance live as it happens." },
              ].map((mod, idx) => (
                <motion.div 
                  key={idx} 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.08 }}
                  whileHover={{ y: -5 }}
                  className="bg-neutral-900/90 border border-neutral-800 dark:bg-neutral-50 dark:border-neutral-200/80 rounded-xl p-5 shadow-xs hover:border-secondary transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-secondary text-white flex items-center justify-center font-bold mb-4 group-hover:scale-110 transition-transform shadow-sm">
                      <mod.icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-sm text-white dark:text-neutral-950 tracking-tight">{mod.title}</h3>
                    <p className="text-xs text-neutral-400 dark:text-neutral-600 leading-relaxed mt-1.5">{mod.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* DP Generator Spotlight Section (Hot Feature) */}
        <section className="bg-card border-b border-border py-16 sm:py-20 px-4 sm:px-6 relative overflow-hidden">
          <div className="max-w-[1440px] mx-auto">
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="max-w-3xl space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-[11px] font-mono font-bold tracking-wider uppercase">
                <Award className="w-3.5 h-3.5" />
                <span>HOT FEATURE • VIRAL EVENT MARKETING</span>
              </div>

              <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black text-foreground uppercase tracking-tight leading-[1.1]">
                Turn Every Attendee Into Your Marketing Team.
              </h2>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Traditional social ads get scrolled past. The highest-converting endorsement for any event is an attendee posting, <strong className="text-foreground">"I am attending."</strong> With EventRally, upload your official event frame once. The moment an attendee registers or secures a ticket, the platform automatically renders a personalized, branded picture flier ready for 1-click sharing to WhatsApp Status, Instagram, and X.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                <div className="p-4 rounded-xl border border-border bg-background/60 space-y-1">
                  <div className="text-[11px] font-mono font-bold uppercase text-secondary">AUTOMATED</div>
                  <div className="font-heading text-sm font-bold text-foreground">Zero Design Overhead</div>
                  <p className="text-xs text-muted-foreground">No Photoshop or designer delays. Attendee avatar and details merge automatically into your template.</p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-background/60 space-y-1">
                  <div className="text-[11px] font-mono font-bold uppercase text-secondary">VIRAL LOOP</div>
                  <div className="font-heading text-sm font-bold text-foreground">1-Click Downloads</div>
                  <p className="text-xs text-muted-foreground">Attendees generate high-resolution fliers right at checkout or from their attendee ticket wallet.</p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-background/60 space-y-1">
                  <div className="text-[11px] font-mono font-bold uppercase text-secondary">CONVERSION</div>
                  <div className="font-heading text-sm font-bold text-foreground">Organic Ticket Hype</div>
                  <p className="text-xs text-muted-foreground">250 attendees posting on WhatsApp status reaches 12,000+ local contacts organically.</p>
                </div>
              </div>

              {/* Organizer Primary Call-to-Action (Single Clean Port) */}
              <div className="pt-2 space-y-3">
                <div>
                  <Link to="/signup">
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="inline-block">
                      <Button variant="secondary" size="lg" className="font-bold text-sm h-12 px-7 rounded-lg shadow-md flex items-center gap-2">
                        <PlusCircle className="w-4 h-4" />
                        <span>Organize an Event</span>
                      </Button>
                    </motion.div>
                  </Link>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-medium pt-1">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />
                    <span>Free for free events</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-border"></div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />
                    <span>Instant automated bank payouts</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-border"></div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />
                    <span>Live in 2 minutes</span>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </section>
        {/* Social Proof & Stats Section */}
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 py-20 border-b border-border">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-5 flex flex-col gap-3 lg:pr-8 lg:border-r border-border"
            >
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-secondary"></div>
                <span className="text-secondary font-mono text-[11px] font-bold tracking-widest uppercase">
                  RELIABLE EVENT INFRASTRUCTURE
                </span>
              </div>
              <h2 className="font-heading text-3xl sm:text-4xl font-black text-foreground uppercase tracking-tight leading-tight">
                BUILT FOR SOLD-OUT EVENTS OF ANY SIZE.
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                Whether you're hosting an intimate 50-person creator workshop, a 500-seat corporate summit, or a 5,000-person concert, EventRally gives organizers the speed, control, and reliability to run without stress.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-7 flex flex-col justify-center"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 divide-x divide-border">
                {[
                  { value: "100%", label: "Free For Free Events" },
                  { value: "<1s", label: "Gate QR Verification" },
                  { value: "₦0", label: "Upfront Setup Fees" },
                  { value: "Direct", label: "Automated Bank Payouts" },
                ].map((stat, idx) => (
                  <div key={idx} className="flex flex-col gap-1 pl-4 first:pl-0 border-l-0">
                    <span className="font-heading text-3xl sm:text-4xl font-black text-foreground tracking-tighter">{stat.value}</span>
                    <span className="text-xs font-bold text-muted-foreground">{stat.label}</span>
                  </div>
                ))}
              </div>

              {/* Event Categories Authority Badges */}
              <div className="mt-12 pt-8 border-t border-border">
                <p className="text-xs font-mono font-bold text-muted-foreground uppercase mb-4">POWERING EVENT CATEGORIES ACROSS AFRICA</p>
                <div className="flex flex-wrap items-center gap-2">
                  {["TECH SUMMITS", "MUSIC FESTIVALS", "CORPORATE CONFERENCES", "COMMUNITY GATHERINGS", "CAMPUS EXPOS", "CHURCH EVENTS"].map((cat, idx) => (
                    <motion.span 
                      key={idx}
                      whileHover={{ scale: 1.05 }}
                      className="font-mono text-xs font-bold border border-border bg-card px-3 py-1.5 rounded-lg cursor-default shadow-2xs"
                    >
                      {cat}
                    </motion.span>
                  ))}
                  <span className="font-mono text-xs font-bold text-secondary bg-secondary/10 border border-secondary/20 px-3 py-1.5 rounded-lg">& MORE</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Featured Events Section */}
        <section id="events" className="max-w-[1440px] mx-auto px-4 sm:px-6 py-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-muted px-2.5 py-1 rounded inline-block mb-2 text-foreground">
                HAPPENING ACROSS AFRICA
              </div>
              <h2 className="font-heading text-3xl font-black text-foreground tracking-tight">Featured Events</h2>
            </div>
            <Link to="/signup" className="text-xs font-bold text-secondary hover:underline flex items-center gap-1">
              Create your event <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loadingEvents ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-secondary" />
              <p className="text-xs text-muted-foreground font-medium">Loading events…</p>
            </div>
          ) : featuredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 border border-dashed border-border rounded-xl bg-muted/30">
              <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center">
                <CalendarDays className="w-7 h-7 text-secondary" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-heading text-lg font-bold text-foreground">No Events Yet</h3>
                <p className="text-xs text-muted-foreground max-w-sm">Be the first to create an event on EventRally. Your event will be featured right here.</p>
              </div>
              <Link to="/signup">
                <Button variant="secondary" size="sm" className="font-bold text-xs h-9 px-5 rounded-lg shadow-sm">
                  Create Your First Event →
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredEvents.map((event, idx) => (
                <motion.div 
                  key={event.id} 
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                  whileHover={{ y: -6 }}
                  className="bg-card border border-border rounded-lg overflow-hidden flex flex-col justify-between hover:border-secondary/40 transition-all shadow-xs group"
                >
                  <div>
                    <div className="relative aspect-[16/9] bg-muted overflow-hidden">
                      {event.image_url ? (
                        <img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <CalendarDays className="w-10 h-10 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">
                        {event.category}
                      </div>
                    </div>
                    <div className="p-4 space-y-2">
                      <h3 className="font-heading text-base font-bold text-foreground truncate">{event.title}</h3>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>{new Date(event.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        {(event.venue || event.city) && (
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{[event.venue, event.city].filter(Boolean).join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <div className="flex items-center justify-between pt-3 border-t border-border text-xs">
                      <span className="font-mono font-bold text-foreground">{event.is_free ? 'Free' : 'Paid'}</span>
                      <Link to={getEventUrl(event)}>
                        <Button variant="secondary" size="sm" className="font-bold text-xs h-8 px-3 rounded shadow-xs">
                          View Event
                        </Button>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* AEO Frequently Asked Questions Section */}
        <section id="faq" className="max-w-[1440px] mx-auto px-4 sm:px-6 py-20 border-t border-border">
          <div className="max-w-3xl mx-auto space-y-10">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-[11px] font-mono font-bold tracking-wider uppercase">
                <span>FREQUENTLY ASKED QUESTIONS</span>
              </div>
              <h2 className="font-heading text-3xl sm:text-4xl font-black text-foreground uppercase tracking-tight">
                Everything you need to know about EventRally
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Clear, direct answers for event organizers, conference conveners, and attendees.
              </p>
            </div>

            <div className="space-y-4">
              {FAQ_ITEMS.map((item, idx) => (
                <div key={idx} className="p-6 rounded-xl border border-border bg-card shadow-2xs space-y-2">
                  <h3 className="font-heading text-base sm:text-lg font-bold text-foreground">
                    {item.question}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Theme-Aware Dark Mode Friendly Footer CTA Section */}
        <section className="bg-card border-t border-border py-20 px-4 sm:px-6 text-center relative overflow-hidden">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto space-y-4 relative z-10"
          >
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-secondary/10 text-secondary px-3 py-1 rounded inline-block">
              START SELLING TICKETS IN 2 MINUTES
            </span>
            <h2 className="font-heading text-4xl sm:text-5xl font-black uppercase tracking-tight text-foreground">
              Ready to sell out your next event?
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Publish your event page, set up tickets in minutes, and turn your attendees into your biggest promoters. Free events are 100% free forever.
            </p>
            <div className="pt-4">
              <Link to="/signup">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="inline-block">
                  <Button variant="secondary" size="lg" className="font-bold text-sm h-12 px-8 rounded-lg shadow-md">
                    Create Your Event Free →
                  </Button>
                </motion.div>
              </Link>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-10 px-4 sm:px-6">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-6" imgClassName="h-6" />
            <span>•</span>
            <span>Where Everyone's Going.</span>
          </div>
          <div>© 2026 EVENTRALLY. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
