import { Link } from "react-router-dom";
import { 
  Ticket, QrCode, Image, BarChart2, Mail, Layout, CreditCard, Users,
  ShoppingBag, Heart, GraduationCap, Music, MapPin, Calendar, Monitor
} from "lucide-react";
import { KenteStripe } from "@/components/KenteStripe";
import { ThemeToggle } from "@/components/ThemeToggle";
import { featuredEvents } from "@/data/mock";

const Index = () => {
  return (
    <div className="min-h-screen bg-background font-[DM_Sans] transition-colors duration-300">
      
      {/* KenteStripe at very top */}
      <KenteStripe />

      {/* Navigation */}
      <nav className="bg-background/95 backdrop-blur-[12px] sticky top-0 z-50 border-b border-border transition-colors duration-300">
        <div className="container max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="font-heading font-bold text-xl text-foreground">
            Event<span className="text-primary">stack</span>
          </Link>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link to="/login" className="text-foreground text-sm bg-transparent hover:opacity-80 transition-opacity font-medium">
              Log In
            </Link>
            <Link to="/signup">
              <button className="bg-primary text-primary-foreground font-heading font-bold text-sm rounded-[10px] px-5 py-2 hover:brightness-110 hover:-translate-y-[1px] transition-all">
                Get Started
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-background noise-overlay overflow-hidden pt-20 pb-16 transition-colors duration-300">
        <div className="absolute top-[-80px] right-[-120px] w-[520px] h-[520px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[60px] left-[-100px] w-[380px] h-[380px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, hsl(var(--destructive)) 0%, transparent 70%)' }} />

        <div className="max-w-[680px] mx-auto text-center relative z-10 px-4">
          <div className="inline-flex items-center text-sm font-medium text-muted-foreground bg-secondary/50 border border-border rounded-full px-4 py-1.5 mb-6">
            <span className="text-emerald-500 mr-2">●</span>
            Now live across 12 African countries
          </div>
          
          <h1 className="font-heading font-bold text-4xl md:text-6xl text-foreground tracking-[-1.5px] leading-[1.05] mb-2">
            Create, Promote and Sell Out
          </h1>
          <h2 className="font-heading font-bold text-4xl md:text-6xl text-primary tracking-[-1.5px] leading-[1.05] mb-6">
            Your Next Event.
          </h2>

          <p className="text-lg text-muted-foreground max-w-[500px] leading-[1.7] mx-auto mb-9">
            Eventstack is Africa's event management platform — built to handle everything from registration to real-time check-in, so you can focus on the experience.
          </p>

          <div className="flex justify-center gap-4 flex-col sm:flex-row">
            <Link to="/signup">
              <button className="bg-primary text-primary-foreground font-heading font-bold text-base px-8 py-3.5 rounded-[10px] hover:brightness-110 hover:-translate-y-[2px] transition-transform w-full sm:w-auto">
                Create Your Event →
              </button>
            </Link>
            <a href="#events">
              <button className="bg-transparent border-[1.5px] border-border text-foreground font-heading font-bold text-base px-8 py-3.5 rounded-[10px] hover:border-foreground transition-colors w-full sm:w-auto">
                Explore Events
              </button>
            </a>
          </div>

          <div className="text-sm text-muted-foreground mt-6 font-medium">
            ✓ Free to start &nbsp; ✓ No setup fees &nbsp; ✓ Paystack & Flutterwave ready
          </div>

          <div className="flex justify-center flex-wrap gap-3 mt-8">
            {["Conferences", "Trade Shows", "Church Events", "Concerts & Festivals", "Campus Events", "NGO Events"].map(pill => (
              <span key={pill} className="bg-secondary/50 border border-border text-muted-foreground font-heading font-bold text-xs tracking-[0.5px] px-4 py-2 rounded-full hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors cursor-default">
                {pill}
              </span>
            ))}
          </div>

          <div className="mt-14 pt-10 border-t border-border flex flex-col md:flex-row justify-center items-center max-w-[500px] mx-auto gap-6 md:gap-0">
            <div className="flex-1 text-center">
              <div className="font-heading font-bold text-3xl md:text-4xl text-primary">10 mins</div>
              <div className="text-sm font-medium text-muted-foreground mt-1">average time to go live</div>
            </div>
            <div className="w-[1px] h-10 bg-border hidden md:block mx-4" />
            <div className="flex-1 text-center">
              <div className="font-heading font-bold text-3xl md:text-4xl text-primary">500+</div>
              <div className="text-sm font-medium text-muted-foreground mt-1">events hosted across Africa</div>
            </div>
            <div className="w-[1px] h-10 bg-border hidden md:block mx-4" />
            <div className="flex-1 text-center">
              <div className="font-heading font-bold text-3xl md:text-4xl text-primary">12</div>
              <div className="text-sm font-medium text-muted-foreground mt-1">countries and counting</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-secondary/30 py-24 px-4 border-y border-border transition-colors duration-300">
        <div className="container max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-6 h-0.5 bg-primary" />
            <span className="font-heading font-bold text-xs tracking-[3px] text-primary uppercase">What's Inside</span>
          </div>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground tracking-[-1px] mb-3">Built for Every African Event</h2>
          <p className="text-base text-muted-foreground mb-12">8 powerful modules. One platform. Zero chaos.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: <Ticket className="w-5 h-5"/>, title: "Smart Ticketing", desc: "Multiple ticket types, dynamic pricing, promo codes, and group discounts." },
              { icon: <QrCode className="w-5 h-5"/>, title: "QR Check-In", desc: "Scan-to-verify with offline mode, multi-gate support, and real-time counts." },
              { icon: <Image className="w-5 h-5"/>, title: "DP Generator", desc: "Let attendees create branded profile pictures with custom event frames." },
              { icon: <BarChart2 className="w-5 h-5"/>, title: "Analytics Hub", desc: "Revenue tracking, attendee insights, registration funnels, and reports." },
              { icon: <Mail className="w-5 h-5"/>, title: "Campaigns", desc: "Email and SMS campaigns with templates, scheduling, and automated triggers." },
              { icon: <Layout className="w-5 h-5"/>, title: "Form Builder", desc: "Custom registration forms with conditional logic and multiple field types." },
              { icon: <CreditCard className="w-5 h-5"/>, title: "Payments", desc: "Paystack and Flutterwave integration with split payments and early payouts." },
              { icon: <Users className="w-5 h-5"/>, title: "Attendee CRM", desc: "Full attendee management with tags, notes, communication history, and exports." },
            ].map((f, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-6 border-l-[3px] border-l-primary transition-all duration-200 hover:shadow-lg hover:border-l-destructive hover:-translate-y-1">
                <div className="bg-primary/10 w-10 h-10 rounded-xl flex items-center justify-center text-primary mb-4">
                  {f.icon}
                </div>
                <h3 className="font-heading font-bold text-base text-card-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Kente Stripe before How It Works */}
      <KenteStripe />

      {/* How It Works Section */}
      <section className="bg-background noise-overlay py-24 px-4 transition-colors duration-300">
        <div className="container max-w-6xl mx-auto relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-6 h-0.5 bg-primary" />
            <span className="font-heading font-bold text-xs tracking-[3px] text-primary uppercase">How It Works</span>
          </div>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground mb-3">Everything in One Place.</h2>
          <p className="text-base text-muted-foreground mb-12">From first ticket to final check-in —<br/>Eventstack has every step covered.</p>

          <div className="flex flex-col md:flex-row gap-6 relative">
            <div className="hidden md:block absolute top-[40%] left-0 w-full h-0.5 border-t-2 border-dashed border-border -translate-y-1/2 z-0"></div>
            
            {[
              { bg: "01", title: "Create Your Event", desc: "Set up your event with our intuitive builder. Add your details, ticket types, pricing, and registration form in minutes." },
              { bg: "02", title: "Sell & Promote", desc: "Share your event page and start selling tickets instantly. Accept payments securely. Use built-in campaigns to fill seats fast." },
              { bg: "03", title: "Manage & Get Paid", desc: "Track registrations, check in guests with QR codes, run real-time analytics, and receive your payout automatically." }
            ].map((s) => (
              <div key={s.bg} className="flex-1 bg-secondary border border-border rounded-[20px] p-8 relative overflow-hidden z-10 transition-colors">
                <div className="absolute top-[-10px] right-4 font-heading font-bold text-[96px] text-muted-foreground/10 pointer-events-none select-none">{s.bg}</div>
                <div className="inline-block font-heading font-bold text-sm text-primary bg-primary/10 rounded-full px-3 py-1 mb-5">{s.bg}</div>
                <h3 className="font-heading font-bold text-xl text-foreground mb-3">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Events Section */}
      <section id="events" className="bg-secondary/30 py-24 px-4 border-y border-border transition-colors duration-300">
        <div className="container max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-6 h-0.5 bg-primary" />
            <span className="font-heading font-bold text-xs tracking-[3px] text-primary uppercase">Happening Across Africa</span>
          </div>
          <div className="flex justify-between items-end mb-10">
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground">Featured Events</h2>
            <a href="#" className="text-primary font-heading font-bold text-sm hover:underline mb-2">View all →</a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {featuredEvents.map(event => (
              <div key={event.id} className="bg-card rounded-[16px] border border-border overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
                <div className="h-48 relative overflow-hidden group">
                  <img src={event.image} alt={event.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
                  <span className="absolute top-3 left-3 bg-primary text-primary-foreground font-heading font-bold text-[10px] uppercase tracking-[1px] px-2.5 py-1 rounded-full">
                    {event.category}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="font-heading font-bold text-lg text-card-foreground mb-3 whitespace-nowrap overflow-hidden text-ellipsis">{event.title}</h3>
                  <div className="flex flex-col gap-2 text-sm text-muted-foreground mb-4">
                     <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /> {event.date}</span>
                     <span className="flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis"><MapPin className="w-4 h-4 text-muted-foreground" /> {event.venue}</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-border">
                    <span className="font-heading font-bold text-base text-primary">{event.price}</span>
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {event.attendees.toLocaleString()} attending</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Browse By Category Section */}
      <section className="bg-background noise-overlay py-24 px-4 transition-colors duration-300">
        <div className="container max-w-6xl mx-auto relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-6 h-0.5 bg-primary" />
            <span className="font-heading font-bold text-xs tracking-[3px] text-primary uppercase">Explore By Category</span>
          </div>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground mb-3">Find Your Kind of Event</h2>
          <p className="text-base text-muted-foreground mb-12">From church concerts to tech summits — it's all on Eventstack.</p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { name: "Tech Events", icon: <Monitor className="w-7 h-7"/>, count: "120+ events" },
              { name: "Trade Shows", icon: <ShoppingBag className="w-7 h-7"/>, count: "80+ events" },
              { name: "Church Events", icon: <Heart className="w-7 h-7"/>, count: "150+ events" },
              { name: "Concerts & Festivals", icon: <Music className="w-7 h-7"/>, count: "95+ events" },
              { name: "Campus Events", icon: <GraduationCap className="w-7 h-7"/>, count: "90+ events" },
              { name: "NGO & Community", icon: <Users className="w-7 h-7"/>, count: "70+ events" },
            ].map(cat => (
              <div key={cat.name} className="bg-secondary/50 border border-border rounded-xl p-6 text-center cursor-pointer transition-all duration-200 hover:bg-primary/10 hover:border-primary/25 hover:-translate-y-1">
                <div className="text-primary flex justify-center mb-3 mx-auto">{cat.icon}</div>
                <div className="font-heading font-bold text-sm text-foreground mb-1.5">{cat.name}</div>
                <div className="text-xs text-muted-foreground">{cat.count}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Before Footer CTA KenteStripe */}
      <KenteStripe />

      {/* Footer CTA Section */}
      <section className="bg-secondary/50 noise-overlay py-28 px-4 relative overflow-hidden border-t border-border transition-colors duration-300">
        <div className="absolute top-[-50px] right-[-50px] w-[300px] h-[300px] rounded-full opacity-10 bg-[radial-gradient(circle,hsl(var(--primary))_0%,transparent_70%)]" />
        <div className="absolute bottom-[-50px] left-[-50px] w-[300px] h-[300px] rounded-full opacity-10 bg-[radial-gradient(circle,hsl(var(--destructive))_0%,transparent_70%)]" />

        <div className="max-w-[600px] mx-auto text-center relative z-10">
          <div className="inline-block font-heading font-bold text-xs tracking-[3px] text-primary bg-primary/10 px-5 py-2 rounded-full mb-6 uppercase">
            Join 500+ Organisers
          </div>
          
          <h2 className="font-heading font-bold text-4xl md:text-5xl text-foreground tracking-[-1.5px] leading-[1.1] mb-5">
            Ready to Stack<br/>Your Next Event?
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-[420px] mx-auto mb-10">
            Join thousands of organisers building unforgettable experiences across Africa.
          </p>

          <Link to="/signup">
            <button className="bg-primary text-primary-foreground font-heading font-bold text-lg px-10 py-4 rounded-xl hover:brightness-110 hover:-translate-y-1 transition-all shadow-lg shadow-primary/20">
              Get Started Free →
            </button>
          </Link>
          <div className="text-sm text-muted-foreground mt-4 font-medium">
            No credit card required · Set up in 10 minutes
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border pt-16 transition-colors duration-300">
        <div className="container max-w-6xl mx-auto px-4 pb-12 flex flex-col items-center text-center">
          <Link to="/" className="font-heading font-bold text-2xl text-foreground mb-3 block">
            Event<span className="text-primary">stack</span>
          </Link>
          <p className="text-sm md:text-base text-muted-foreground max-w-[360px] mx-auto mb-10 leading-[1.6]">
            Africa's all-in-one event management platform. Built for organisers who demand excellence.
          </p>

          <div className="flex gap-8 mb-10 text-sm font-medium text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Product</a>
            <a href="#" className="hover:text-foreground transition-colors">Company</a>
            <a href="#" className="hover:text-foreground transition-colors">Legal</a>
          </div>

          <div className="text-sm text-muted-foreground">
            © 2026 Eventstack. All rights reserved.
          </div>
        </div>
        
        {/* Bottom of footer KenteStripe */}
        <KenteStripe />
      </footer>

    </div>
  );
};

export default Index;
