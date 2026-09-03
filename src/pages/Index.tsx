import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  CalendarDays, Ticket, Users, ScanLine, BarChart3, Mail, ChevronRight, 
  ArrowUpRight, Calendar, MapPin, CheckCircle2, ShieldCheck, Globe, Star,
  Loader2, Zap, Award, Image as ImageIcon
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { getEventUrl } from "@/lib/slugUtils";

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
      {/* Navigation Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full bg-card/90 backdrop-blur-md border-b border-border sticky top-0 z-50"
      >
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="font-heading font-black text-lg sm:text-xl text-primary tracking-tighter uppercase flex items-center gap-1">
              MYEVENTGURU<span className="text-[10px] text-muted-foreground align-top">™</span>
            </Link>
            <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-muted-foreground">
              <a className="hover:text-foreground transition-colors flex items-center gap-1" href="#features">
                Features <ChevronRight className="w-3 h-3 rotate-90" />
              </a>
              <a className="hover:text-foreground transition-colors flex items-center gap-1" href="#how-it-works">
                Solutions <ChevronRight className="w-3 h-3 rotate-90" />
              </a>
              <a className="hover:text-foreground transition-colors" href="#events">
                Events
              </a>
              <a className="hover:text-foreground transition-colors" href="#pricing">
                Pricing
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
                <Button size="sm" className="bg-secondary text-secondary-foreground font-bold text-xs h-9 px-3 sm:px-4 rounded-lg hover:opacity-90 transition-all shadow-sm">
                  <span className="sm:hidden">Get Started</span>
                  <span className="hidden sm:inline">Get Started Free</span>
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
                THE AFRICAN EVENT OPERATING SYSTEM
              </span>
            </motion.div>

            <motion.h1 
              variants={itemVariants} 
              className="font-heading text-3xl sm:text-5xl lg:text-[54px] leading-[1.15] font-black tracking-tight text-foreground uppercase"
            >
              Plan, Sell, Manage, & Grow Your Events{" "}
              <span className="relative inline-block text-secondary underline decoration-secondary decoration-[3.5px] underline-offset-[8px]">
                from one place
              </span>
            </motion.h1>

            <motion.div variants={itemVariants} className="w-16 h-[2px] bg-primary my-1"></motion.div>

            <motion.p 
              variants={itemVariants} 
              className="text-base sm:text-lg text-muted-foreground max-w-lg leading-relaxed font-medium"
            >
              EventGuru is Africa's premier all-in-one event operating system—built to help creators, organizers, and brands publish events, sell tickets, manage attendees, and drive revenue across the continent.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mt-2">
              <Link to="/signup">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button size="lg" className="bg-secondary text-secondary-foreground font-bold text-sm h-12 px-6 rounded-lg hover:opacity-90 transition-all shadow-md">
                    Start Your First Event
                  </Button>
                </motion.div>
              </Link>
              <a href="#events">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button variant="outline" size="lg" className="border-border text-foreground font-bold text-sm h-12 px-6 rounded-lg hover:bg-muted transition-all flex items-center gap-2">
                    Explore Events <ArrowUpRight className="w-4 h-4" />
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
                Be among the first organizers on <span className="font-bold text-foreground">MyEventGuru</span> — early access is live now.
              </p>
            </motion.div>
          </motion.div>

          {/* Hero Graphic Standalone */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: "easeOut" }}
            className="w-full flex items-center justify-center"
          >
            <motion.img 
              src="/heroimg.webp" 
              alt="MyEventGuru Platform Showcase" 
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ duration: 0.3 }}
              className="w-full h-auto max-h-[560px] object-contain rounded-2xl shadow-2xl transition-all"
            />
          </motion.div>
        </section>

        {/* Inverted Contrast Features Grid Section (Black in Light Mode, White in Dark Mode) */}
        <section id="features" className="bg-neutral-950 text-neutral-100 dark:bg-white dark:text-neutral-950 border-y border-neutral-800 dark:border-neutral-200 py-16 px-4 sm:px-6 transition-colors duration-300">
          <div className="max-w-[1440px] mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-2 mb-8 justify-center sm:justify-start"
            >
              <div className="w-2.5 h-2.5 rounded-xs bg-secondary"></div>
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-600">
                CORE PLATFORM MODULES
              </span>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
              {[
                { icon: CalendarDays, title: "Event Creation", desc: "Create stunning event pages in minutes with our smart event builder." },
                { icon: Ticket, title: "Ticketing Engine", desc: "Flexible ticket types, early bird pricing, promos, bundles and more." },
                { icon: Users, title: "Attendee CRM", desc: "Collect data, manage guest lists, and export insights with ease." },
                { icon: ScanLine, title: "Rapid Check-In", desc: "Lightning fast QR check-in, gate security, and live attendance tracking." },
                { icon: BarChart3, title: "Analytics Hub", desc: "Powerful analytics to track sales, engagement, and revenue in real time." },
                { icon: Mail, title: "Email & SMS", desc: "Run targeted marketing campaigns that drive engagement and conversions." },
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

        {/* DP Generator Spotlight Section — Major Platform Selling Point */}
        <section className="bg-card border-b border-border py-20 px-4 sm:px-6 relative overflow-hidden">
          <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <motion.div 
              initial={{ opacity: 0, x: -25 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-6 space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-[11px] font-mono font-bold tracking-wider uppercase">
                <Award className="w-3.5 h-3.5" /> SIGNATURE SELLING POINT
              </div>

              <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black text-foreground uppercase tracking-tight leading-[1.15]">
                Turn Every Attendee Into Your Marketing Team.
              </h2>

              <p className="text-sm text-muted-foreground leading-relaxed">
                Most event platforms only give you tickets. <strong className="text-foreground">MyEventGuru gives you virality.</strong> Our built-in Display Picture (DP) Generator lets organizers upload a custom photo frame. When attendees register, they generate branded profile pictures in 1-click to share across WhatsApp, Instagram, X (Twitter), and LinkedIn.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl border border-border bg-background space-y-1">
                  <div className="font-heading text-lg font-bold text-foreground">1-Click Generation</div>
                  <p className="text-xs text-muted-foreground">Attendees upload their photo and get a crisp branded flier instantly.</p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-background space-y-1">
                  <div className="font-heading text-lg font-bold text-foreground">Zero Design Skills Needed</div>
                  <p className="text-xs text-muted-foreground">Organizers position name badges and frames visually in minutes.</p>
                </div>
              </div>

              <div className="pt-2">
                <Link to="/signup">
                  <Button size="lg" className="bg-secondary text-secondary-foreground font-bold text-sm h-12 px-7 rounded-lg hover:opacity-90 shadow-md">
                    Build Your Event DP Frame Now →
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* Visual Showcase Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, x: 25 }}
              whileInView={{ opacity: 1, scale: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="lg:col-span-6 flex justify-center"
            >
              <div className="relative w-full max-w-md bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-neutral-100 space-y-6">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-secondary"></div>
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-400">LIVE DP PREVIEW</span>
                  </div>
                  <span className="text-[10px] font-mono bg-neutral-800 px-2 py-0.5 rounded text-neutral-300">AUTOMATIC ALIGNMENT</span>
                </div>

                {/* Simulated DP Frame Display */}
                <div className="relative aspect-square w-full rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden flex items-center justify-center p-4 shadow-inner">
                  {/* Decorative Background Grid */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] opacity-30"></div>
                  
                  {/* Sample DP Frame Mockup */}
                  <div className="relative z-10 w-full h-full rounded-xl border-4 border-secondary flex flex-col items-center justify-center p-6 text-center space-y-3 bg-gradient-to-t from-neutral-950 via-neutral-900/90 to-transparent">
                    <div className="w-24 h-24 rounded-full border-4 border-white/20 overflow-hidden shadow-xl bg-neutral-800 flex items-center justify-center">
                      <Users className="w-12 h-12 text-neutral-500" />
                    </div>
                    <div>
                      <div className="font-heading font-black text-lg text-white uppercase tracking-tight">I Am Attending!</div>
                      <div className="text-xs font-bold text-secondary font-mono">LAGOS TECH SUMMIT 2026</div>
                    </div>
                    <div className="text-[10px] bg-secondary text-secondary-foreground font-mono font-bold px-3 py-1 rounded-full uppercase shadow-xs">
                      Official Attendee Badge
                    </div>
                  </div>
                </div>

                <div className="text-center text-xs text-neutral-400 font-medium">
                  "Every attendee share brings 10+ new visitors to your ticket page."
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
                  BUILT FOR EVERY EVENT
                </span>
              </div>
              <h2 className="font-heading text-3xl sm:text-4xl font-black text-foreground uppercase tracking-tight leading-tight">
                ONE PLATFORM.<br/>EVERY POSSIBLE EVENT.
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                From tech summits and music festivals to corporate galas and campus expos, EventGuru gives African organizers the tools to deliver world-class experiences.
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
                  { value: "8", label: "Core Modules" },
                  { value: "60+", label: "Platform Features" },
                  { value: "99.9%", label: "Platform Uptime" },
                  { value: "Africa", label: "Built For" },
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
                <p className="text-xs text-muted-foreground max-w-sm">Be the first to create an event on MyEventGuru. Your event will be featured right here.</p>
              </div>
              <Link to="/signup">
                <Button size="sm" className="bg-secondary text-secondary-foreground font-bold text-xs h-9 px-5 rounded-lg">
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
                        <Button size="sm" className="bg-secondary text-secondary-foreground font-bold text-xs h-8 px-3 rounded">
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
              READY TO ELEVATE YOUR EVENTS?
            </span>
            <h2 className="font-heading text-4xl sm:text-5xl font-black uppercase tracking-tight text-foreground">
              Start Building Unforgettable Experiences.
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              Start managing your events with MyEventGuru — create, sell tickets, and check in attendees seamlessly.
            </p>
            <div className="pt-4">
              <Link to="/signup">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="inline-block">
                  <Button size="lg" className="bg-secondary text-secondary-foreground font-bold text-sm h-12 px-8 rounded-lg hover:opacity-90 transition-all shadow-md">
                    Create Your Free Account →
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
          <div className="flex items-center gap-2">
            <span className="font-heading font-black text-foreground text-sm uppercase">MYEVENTGURU™</span>
            <span>•</span>
            <span>Africa's Event Operating System</span>
          </div>
          <div>© 2026 MYEVENTGURU. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
