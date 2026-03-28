import { Link } from "react-router-dom";
import { Ticket, ScanLine, Image, BarChart3, Mail, FileText, Wallet, Users, ArrowRight, MapPin, Calendar, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { featuredEvents, eventCategories, features } from "@/data/mock";

const featureIcons: Record<string, React.ReactNode> = {
  ticket: <Ticket className="w-6 h-6" />,
  scan: <ScanLine className="w-6 h-6" />,
  image: <Image className="w-6 h-6" />,
  chart: <BarChart3 className="w-6 h-6" />,
  mail: <Mail className="w-6 h-6" />,
  form: <FileText className="w-6 h-6" />,
  wallet: <Wallet className="w-6 h-6" />,
  users: <Users className="w-6 h-6" />,
};

const Index = () => {
  return (
    <div className="min-h-screen bg-ivory">
      {/* Kente Strip */}
      <div className="kente-strip" />

      {/* Navigation */}
      <nav className="bg-ink sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14 px-4">
          <Link to="/" className="font-heading text-xl font-800 text-ivory tracking-tight">
            Event<span className="text-amber">stack</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-ivory/80 hover:text-ivory hover:bg-white/10 font-body text-sm">
                Log in
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="bg-amber text-ink hover:bg-amber/90 font-heading text-sm font-700">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-ink noise-overlay overflow-hidden">
        {/* Gradient blobs */}
        <div className="absolute top-20 -left-20 w-72 h-72 bg-amber/20 rounded-full blur-[100px] animate-pulse-glow" />
        <div className="absolute bottom-10 right-0 w-96 h-96 bg-teal/10 rounded-full blur-[120px] animate-pulse-glow" style={{ animationDelay: "2s" }} />
        <div className="absolute top-40 right-20 w-48 h-48 bg-coral/10 rounded-full blur-[80px] animate-pulse-glow" style={{ animationDelay: "1s" }} />

        <div className="container relative z-10 px-4 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6">
              <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
              <span className="text-ivory/70 text-xs font-body">Now live across 12 African countries</span>
            </div>

            <h1 className="font-heading text-4xl md:text-6xl font-800 text-ivory leading-[1.1] mb-4 text-balance">
              Africa's Event
              <br />
              <span className="text-amber">Platform</span>
            </h1>

            <p className="text-ivory/60 font-body text-base md:text-lg mb-8 max-w-md mx-auto leading-relaxed">
              Create, manage, and scale events with smart ticketing, real-time analytics, and tools built for the African market.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
              <Link to="/signup">
                <Button className="bg-amber text-ink hover:bg-amber/90 font-heading font-700 h-12 px-6 text-base w-full sm:w-auto">
                  Create Your Event
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <a href="#events">
                <Button variant="outline" className="border-white/20 text-ivory hover:bg-white/5 font-heading font-700 h-12 px-6 text-base w-full sm:w-auto">
                  Explore Events
                </Button>
              </a>
            </div>

            {/* Category pills */}
            <div className="flex flex-wrap justify-center gap-2">
              {eventCategories.slice(0, 4).map((cat) => (
                <span key={cat.name} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-ivory/60 text-xs font-body">
                  <cat.icon className="w-3 h-3" /> {cat.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-ink border-t border-white/5">
        <div className="container px-4 py-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="font-heading text-2xl md:text-3xl font-800 text-amber">8</div>
              <div className="text-ivory/50 text-xs font-body mt-1">Core Modules</div>
            </div>
            <div>
              <div className="font-heading text-2xl md:text-3xl font-800 text-teal">60+</div>
              <div className="text-ivory/50 text-xs font-body mt-1">Features</div>
            </div>
            <div>
              <div className="font-heading text-2xl md:text-3xl font-800 text-coral">12</div>
              <div className="text-ivory/50 text-xs font-body mt-1">Countries</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24 bg-ivory">
        <div className="container px-4">
          <div className="text-center mb-12">
            <h2 className="font-heading text-2xl md:text-4xl font-800 text-ink mb-3">Everything You Need</h2>
            <p className="text-muted-foreground font-body text-sm md:text-base max-w-md mx-auto">
              8 powerful modules designed for African event organisers.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f) => (
              <div key={f.title} className="group p-5 rounded-xl bg-white border border-border hover:border-amber/30 hover:shadow-lg hover:shadow-amber/5 transition-all duration-300">
                <div className="w-10 h-10 rounded-lg bg-ink flex items-center justify-center text-amber mb-3 group-hover:scale-110 transition-transform">
                  {featureIcons[f.icon]}
                </div>
                <h3 className="font-heading text-sm font-700 text-ink mb-1">{f.title}</h3>
                <p className="text-muted-foreground text-xs font-body leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-surface">
        <div className="container px-4">
          <div className="text-center mb-12">
            <h2 className="font-heading text-2xl md:text-4xl font-800 text-ink mb-3">How It Works</h2>
            <p className="text-muted-foreground font-body text-sm max-w-md mx-auto">Get your event live in minutes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { step: "01", title: "Create", desc: "Set up your event with our intuitive builder. Add details, tickets, and registration forms." },
              { step: "02", title: "Sell", desc: "Share your event page and start selling tickets. Accept payments via Paystack or Flutterwave." },
              { step: "03", title: "Manage", desc: "Track registrations, check-in attendees, run campaigns, and view real-time analytics." },
            ].map((s) => (
              <div key={s.step} className="text-center p-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber/10 text-amber font-heading text-lg font-800 mb-4">
                  {s.step}
                </div>
                <h3 className="font-heading text-lg font-700 text-ink mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm font-body leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Events */}
      <section id="events" className="py-16 md:py-24 bg-ivory">
        <div className="container px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-heading text-2xl md:text-3xl font-800 text-ink">Featured Events</h2>
              <p className="text-muted-foreground font-body text-sm mt-1">Discover what's happening across Africa</p>
            </div>
            <Button variant="ghost" className="text-amber hover:text-amber/80 font-heading text-sm hidden sm:flex">
              View all <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredEvents.map((event) => (
              <div key={event.id} className="group rounded-xl bg-white border border-border overflow-hidden hover:shadow-lg hover:shadow-ink/5 transition-all duration-300">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-ink/80 backdrop-blur-sm text-ivory text-[10px] font-heading font-700 uppercase tracking-wider">
                    {event.category}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-heading text-sm font-700 text-ink mb-2 truncate">{event.title}</h3>
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-body mb-1">
                    <Calendar className="w-3 h-3 shrink-0" />
                    <span className="truncate">{event.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-body mb-3">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{event.venue}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-heading text-sm font-700 text-amber">{event.price}</span>
                    <span className="text-muted-foreground text-[10px] font-body">{event.attendees.toLocaleString()} attending</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="sm:hidden mt-6 text-center">
            <Button variant="ghost" className="text-amber hover:text-amber/80 font-heading text-sm">
              View all events <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-surface">
        <div className="container px-4">
          <h2 className="font-heading text-2xl md:text-3xl font-800 text-ink mb-8 text-center">Browse by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {eventCategories.map((cat) => (
              <button key={cat.name} className="group p-4 rounded-xl bg-white border border-border hover:border-amber/30 text-center transition-all duration-200 hover:shadow-md">
                <cat.icon className="w-6 h-6 mx-auto mb-2 text-amber" />
                <div className="font-heading text-xs font-700 text-ink mb-0.5">{cat.name}</div>
                <div className="text-muted-foreground text-[10px] font-body">{cat.count} events</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-ink noise-overlay relative">
        <div className="absolute top-10 left-10 w-64 h-64 bg-amber/10 rounded-full blur-[100px]" />
        <div className="container relative z-10 px-4 text-center">
          <h2 className="font-heading text-3xl md:text-5xl font-800 text-ivory mb-4 text-balance">
            Ready to Stack
            <br />
            Your Next Event?
          </h2>
          <p className="text-ivory/60 font-body text-sm md:text-base max-w-md mx-auto mb-8">
            Join thousands of organisers building unforgettable experiences across Africa.
          </p>
          <Link to="/signup">
            <Button className="bg-amber text-ink hover:bg-amber/90 font-heading font-700 h-12 px-8 text-base">
              Get Started Free
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-ink">
        <div className="kente-strip" />
        <div className="container px-4 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="font-heading text-xl font-800 text-ivory mb-3">
                Event<span className="text-amber">stack</span>
              </div>
              <p className="text-ivory/40 text-xs font-body leading-relaxed">
                Africa's all-in-one event management platform. Built for organisers who demand excellence.
              </p>
            </div>
            <div>
              <h4 className="font-heading text-xs font-700 text-ivory/80 mb-3 uppercase tracking-wider">Product</h4>
              <ul className="space-y-2">
                {["Ticketing", "Check-in", "Analytics", "Campaigns"].map((i) => (
                  <li key={i}><span className="text-ivory/40 text-xs font-body hover:text-ivory/60 cursor-pointer transition-colors">{i}</span></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-heading text-xs font-700 text-ivory/80 mb-3 uppercase tracking-wider">Company</h4>
              <ul className="space-y-2">
                {["About", "Blog", "Careers", "Contact"].map((i) => (
                  <li key={i}><span className="text-ivory/40 text-xs font-body hover:text-ivory/60 cursor-pointer transition-colors">{i}</span></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-heading text-xs font-700 text-ivory/80 mb-3 uppercase tracking-wider">Legal</h4>
              <ul className="space-y-2">
                {["Privacy", "Terms", "Refund Policy"].map((i) => (
                  <li key={i}><span className="text-ivory/40 text-xs font-body hover:text-ivory/60 cursor-pointer transition-colors">{i}</span></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 pt-6 text-center">
            <p className="text-ivory/30 text-xs font-body">© 2026 Eventstack. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
