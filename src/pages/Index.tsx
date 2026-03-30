import { Link } from "react-router-dom";
import { 
  Ticket, QrCode, Image, BarChart2, Mail, Layout, CreditCard, Users,
  Mic, ShoppingBag, Heart, GraduationCap, Music, BookOpen,
  ArrowRight, MapPin, Calendar, ChevronRight 
} from "lucide-react";
import { KenteStripe } from "@/components/KenteStripe";
import { featuredEvents } from "@/data/mock";

const Index = () => {
  return (
    <div className="min-h-screen bg-[var(--ivory-hex)] font-[DM_Sans]">
      
      {/* KenteStripe at very top */}
      <KenteStripe />

      {/* Navigation */}
      <nav className="bg-[rgba(10,13,18,0.95)] backdrop-blur-[12px] sticky top-0 z-50 border-b border-white/5">
        <div className="container max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="font-heading font-bold text-[20px] text-white">
            Event<span className="text-[var(--amber-hex)]">stack</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link to="/login" className="text-white text-[14px] bg-transparent hover:opacity-80 transition-opacity">
              Log In
            </Link>
            <Link to="/signup">
              <button className="bg-[var(--amber-hex)] text-[var(--ink-hex)] font-heading font-bold text-[13px] rounded-[10px] px-[20px] py-[10px] hover:bg-[var(--amber2-hex)] hover:-translate-y-[1px] transition-transform">
                Get Started
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-[var(--ink-hex)] noise-overlay overflow-hidden pt-20 pb-16">
        <div className="absolute top-[-80px] right-[-120px] w-[520px] h-[520px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, var(--amber-hex) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[60px] left-[-100px] w-[380px] h-[380px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, var(--coral-hex) 0%, transparent 70%)' }} />
        <div className="absolute top-[40%] left-[40%] w-[260px] h-[260px] rounded-full opacity-[0.08]" style={{ background: 'radial-gradient(circle, var(--electric-hex) 0%, transparent 70%)' }} />

        <div className="max-w-[680px] mx-auto text-center relative z-10 px-4">
          <div className="inline-block text-[13px] text-white/55 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-6">
            <span className="text-[var(--teal-hex)] mr-2">●</span>
            Now live across 12 African countries
          </div>
          
          <h1 className="font-heading font-bold text-[38px] md:text-[64px] text-white tracking-[-2px] leading-[1] mb-2">
            Create, Promote and Sell Out
          </h1>
          <h2 className="font-heading font-bold text-[38px] md:text-[64px] text-[var(--amber-hex)] tracking-[-2px] leading-[1.1] mb-6">
            Your Next Event.
          </h2>

          <p className="text-[17px] text-white/55 max-w-[500px] leading-[1.7] mx-auto mb-9">
            Eventstack is Africa's event management platform — built to handle everything from registration to real-time check-in, so you can focus on the experience.
          </p>

          <div className="flex justify-center gap-4 flex-col sm:flex-row">
            <Link to="/signup">
              <button className="bg-[var(--amber-hex)] text-[var(--ink-hex)] font-heading font-bold text-[14px] px-[28px] py-[14px] rounded-[10px] hover:bg-[var(--amber2-hex)] hover:-translate-y-[2px] transition-transform w-full sm:w-auto">
                Create Your Event →
              </button>
            </Link>
            <a href="#events">
              <button className="bg-transparent border-[1.5px] border-white/25 text-white font-heading font-bold text-[14px] px-[28px] py-[14px] rounded-[10px] hover:border-white transition-colors w-full sm:w-auto">
                Explore Events
              </button>
            </a>
          </div>

          <div className="text-[12px] text-white/35 mt-4">
            ✓ Free to start &nbsp; ✓ No setup fees &nbsp; ✓ Paystack & Flutterwave ready
          </div>

          <div className="flex justify-center flex-wrap gap-3 mt-8">
            {["Conferences", "Trade Shows", "Church Events", "Campus Events"].map(pill => (
              <span key={pill} className="bg-white/5 border border-white/10 text-white/65 font-heading font-bold text-[11px] tracking-[0.5px] px-[16px] py-[7px] rounded-full hover:bg-[rgba(245,166,35,0.12)] hover:border-[rgba(245,166,35,0.3)] hover:text-[var(--amber-hex)] transition-colors cursor-default">
                {pill}
              </span>
            ))}
          </div>

          <div className="mt-14 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-center items-center max-w-[500px] mx-auto gap-6 md:gap-0">
            <div className="flex-1 text-center">
              <div className="font-heading font-bold text-[36px] text-[var(--amber-hex)]">₦500M+</div>
              <div className="text-[13px] text-white/40">in ticket sales processed</div>
            </div>
            <div className="w-[1px] h-10 bg-white/10 hidden md:block mx-4" />
            <div className="flex-1 text-center">
              <div className="font-heading font-bold text-[36px] text-[var(--amber-hex)]">500+</div>
              <div className="text-[13px] text-white/40">events hosted across Africa</div>
            </div>
            <div className="w-[1px] h-10 bg-white/10 hidden md:block mx-4" />
            <div className="flex-1 text-center">
              <div className="font-heading font-bold text-[36px] text-[var(--amber-hex)]">12</div>
              <div className="text-[13px] text-white/40">countries and counting</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-[var(--ivory-hex)] py-20 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-[24px] h-[2px] bg-[var(--amber-hex)]" />
            <span className="font-heading font-bold text-[11px] tracking-[3px] text-[var(--amber-hex)] uppercase">What's Inside</span>
          </div>
          <h2 className="font-heading font-bold text-[28px] md:text-[40px] text-[var(--ink-hex)] tracking-[-1px] mb-2">Built for Every African Event</h2>
          <p className="text-[15px] text-[#6B7280] mb-12">8 powerful modules. One platform. Zero chaos.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: <Ticket className="w-5 h-5"/>, title: "Smart Ticketing", desc: "Multiple ticket types, dynamic pricing, promo codes, and group discounts." },
              { icon: <QrCode className="w-5 h-5"/>, title: "QR Check-In", desc: "Scan-to-verify with offline mode, multi-gate support, and real-time counts." },
              { icon: <Image className="w-5 h-5"/>, title: "DP Generator", desc: "Let attendees create branded profile pictures with custom event frames." },
              { icon: <BarChart2 className="w-5 h-5"/>, title: "Analytics Hub", desc: "Revenue tracking, attendee insights, registration funnels, and post-event reports." },
              { icon: <Mail className="w-5 h-5"/>, title: "Campaigns", desc: "Email and SMS campaigns with templates, scheduling, and automated triggers." },
              { icon: <Layout className="w-5 h-5"/>, title: "Form Builder", desc: "Custom registration forms with conditional logic and multiple field types." },
              { icon: <CreditCard className="w-5 h-5"/>, title: "Payments", desc: "Paystack and Flutterwave integration with split payments and automated payouts." },
              { icon: <Users className="w-5 h-5"/>, title: "Attendee CRM", desc: "Full attendee management with tags, notes, communication history, and exports." },
            ].map((f, i) => (
              <div key={i} className="bg-white border border-[rgba(10,13,18,0.07)] rounded-[16px] p-6 border-l-[3px] border-l-[var(--amber-hex)] transition-all duration-200 hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:border-l-[var(--coral-hex)] hover:-translate-y-[2px]">
                <div className="bg-[#FFF3D4] w-[40px] h-[40px] rounded-[10px] flex items-center justify-center text-[var(--amber-hex)] mb-[14px]">
                  {f.icon}
                </div>
                <h3 className="font-heading font-bold text-[14px] text-[var(--ink-hex)] mb-[6px]">{f.title}</h3>
                <p className="text-[#6B7280] text-[13px] leading-[1.6]">
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
      <section className="bg-[var(--ink-hex)] noise-overlay py-20 px-4">
        <div className="container max-w-6xl mx-auto relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-[24px] h-[2px] bg-[var(--amber-hex)]" />
            <span className="font-heading font-bold text-[11px] tracking-[3px] text-[var(--amber-hex)] uppercase">How It Works</span>
          </div>
          <h2 className="font-heading font-bold text-[40px] text-white mb-2">Live in Minutes. Paid by Morning.</h2>
          <p className="text-[15px] text-white/45 mb-12">Three steps between you and a sold-out event.</p>

          <div className="flex flex-col md:flex-row gap-6 relative">
            <div className="hidden md:block absolute top-[40%] left-0 w-full h-[2px] border-t-[2px] border-dashed border-[rgba(245,166,35,0.2)] -translate-y-1/2 z-0"></div>
            
            {[
              { bg: "01", title: "Create Your Event", desc: "Set up your event with our intuitive builder. Add your details, ticket types, pricing, and registration form in minutes." },
              { bg: "02", title: "Sell & Promote", desc: "Share your event page and start selling tickets instantly. Accept payments via Paystack or Flutterwave. Use built-in email and SMS campaigns to fill seats fast." },
              { bg: "03", title: "Manage & Get Paid", desc: "Track registrations, check in guests with QR codes, run real-time analytics, and receive your payout automatically after the event." }
            ].map((s) => (
              <div key={s.bg} className="flex-1 bg-[rgba(255,255,255,0.04)] border border-white/10 rounded-[20px] p-[36px_28px] relative overflow-hidden z-10">
                <div className="absolute top-[-10px] right-[16px] font-heading font-bold text-[96px] text-[rgba(245,166,35,0.08)] pointer-events-none select-none">{s.bg}</div>
                <div className="inline-block font-heading font-bold text-[13px] text-[var(--amber-hex)] bg-[rgba(245,166,35,0.12)] rounded-full px-[12px] py-[4px] mb-5">{s.bg}</div>
                <h3 className="font-heading font-bold text-[18px] text-white mb-[10px]">{s.title}</h3>
                <p className="text-[13px] text-white/45 leading-[1.7]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Events Section */}
      <section id="events" className="bg-[var(--ivory-hex)] py-20 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-[24px] h-[2px] bg-[var(--amber-hex)]" />
            <span className="font-heading font-bold text-[11px] tracking-[3px] text-[var(--amber-hex)] uppercase">Happening Across Africa</span>
          </div>
          <div className="flex justify-between items-end mb-10">
            <h2 className="font-heading font-bold text-[40px] text-[var(--ink-hex)]">Featured Events</h2>
            <a href="#" className="text-[var(--amber-hex)] font-heading font-bold text-[13px] hover:underline mb-2">View all →</a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {featuredEvents.map(event => (
              <div key={event.id} className="bg-white rounded-[16px] border border-[rgba(10,13,18,0.07)] overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
                <div className="h-[180px] relative overflow-hidden group">
                  <img src={event.image} alt={event.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute bottom-0 left-0 right-0 h-[60px] bg-gradient-to-t from-[rgba(10,13,18,0.7)] to-transparent" />
                  <span className="absolute top-[10px] left-[10px] bg-[var(--amber-hex)] text-[var(--ink-hex)] font-heading font-bold text-[9px] uppercase tracking-[1px] px-[10px] py-[4px] rounded-full">
                    {event.category}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-heading font-bold text-[15px] text-[var(--ink-hex)] mb-2 whitespace-nowrap overflow-hidden text-ellipsis">{event.title}</h3>
                  <div className="flex gap-3 text-[12px] text-[#6B7280] mb-[10px]">
                     <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-[#6B7280]" /> {event.date}</span>
                     <span className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden text-ellipsis"><MapPin className="w-3 h-3 text-[#6B7280]" /> {event.venue}</span>
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-[rgba(10,13,18,0.04)]">
                    <span className="font-heading font-bold text-[14px] text-[var(--amber-hex)]">{event.price}</span>
                    <span className="text-[11px] text-[#6B7280] flex items-center gap-1.5"><Users className="w-3 h-3" /> {event.attendees.toLocaleString()} attending</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Browse By Category Section */}
      <section className="bg-[var(--ink-hex)] noise-overlay py-20 px-4">
        <div className="container max-w-6xl mx-auto relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-[24px] h-[2px] bg-[var(--amber-hex)]" />
            <span className="font-heading font-bold text-[11px] tracking-[3px] text-[var(--amber-hex)] uppercase">Explore By Category</span>
          </div>
          <h2 className="font-heading font-bold text-[40px] text-white mb-2">Find Your Kind of Event</h2>
          <p className="text-[15px] text-white/45 mb-10">From church concerts to tech summits — it's all on Eventstack.</p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { name: "Conferences", icon: <Mic className="w-8 h-8"/>, count: "120+ events" },
              { name: "Trade Shows", icon: <ShoppingBag className="w-8 h-8"/>, count: "80+ events" },
              { name: "Church Events", icon: <Heart className="w-8 h-8"/>, count: "150+ events" },
              { name: "Campus Events", icon: <GraduationCap className="w-8 h-8"/>, count: "90+ events" },
              { name: "Festivals", icon: <Music className="w-8 h-8"/>, count: "60+ events" },
              { name: "Workshops", icon: <BookOpen className="w-8 h-8"/>, count: "100+ events" },
            ].map(cat => (
              <div key={cat.name} className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-[24px_16px] text-center cursor-pointer transition-all duration-200 hover:bg-[rgba(245,166,35,0.08)] hover:border-[rgba(245,166,35,0.25)] hover:-translate-y-[2px]">
                <div className="text-[var(--amber-hex)] flex justify-center mb-[10px] mx-auto">{cat.icon}</div>
                <div className="font-heading font-bold text-[13px] text-white mb-1">{cat.name}</div>
                <div className="text-[11px] text-white/35">{cat.count}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Before Footer CTA KenteStripe */}
      <KenteStripe />

      {/* Footer CTA Section */}
      <section className="bg-[var(--ink-hex)] noise-overlay py-24 px-4 relative overflow-hidden">
        <div className="absolute top-[-50px] right-[-50px] w-[300px] h-[300px] rounded-full opacity-12 bg-[radial-gradient(circle,var(--amber-hex)_0%,transparent_70%)]" />
        <div className="absolute bottom-[-50px] left-[-50px] w-[300px] h-[300px] rounded-full opacity-[0.08] bg-[radial-gradient(circle,var(--coral-hex)_0%,transparent_70%)]" />

        <div className="max-w-[600px] mx-auto text-center relative z-10">
          <div className="inline-block font-heading font-bold text-[11px] tracking-[3px] text-[var(--amber-hex)] bg-[rgba(245,166,35,0.1)] px-[16px] py-[6px] rounded-full mb-5 uppercase">
            Join 500+ Organisers
          </div>
          
          <h2 className="font-heading font-bold text-[34px] md:text-[52px] text-white tracking-[-1.5px] leading-[1.05] mb-4">
            Ready to Stack<br/>Your Next Event?
          </h2>
          <p className="text-[15px] text-white/45 max-w-[420px] mx-auto mb-8">
            Join thousands of organisers building unforgettable experiences across Africa.
          </p>

          <Link to="/signup">
            <button className="bg-[var(--amber-hex)] text-[var(--ink-hex)] font-heading font-bold text-[15px] px-[36px] py-[16px] rounded-[10px] hover:bg-[var(--amber2-hex)] hover:-translate-y-[2px] transition-transform">
              Get Started Free →
            </button>
          </Link>
          <div className="text-[12px] text-white/25 mt-3">
            No credit card required · Set up in 10 minutes
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--ink-hex)] border-t border-[rgba(255,255,255,0.06)] pt-12">
        <div className="container max-w-6xl mx-auto px-4 pb-12 flex flex-col items-center text-center">
          <Link to="/" className="font-heading font-bold text-[18px] text-white mb-2 block">
            Event<span className="text-[var(--amber-hex)]">stack</span>
          </Link>
          <p className="text-[13px] text-white/35 max-w-[320px] mx-auto mb-8 leading-[1.6]">
            Africa's all-in-one event management platform. Built for organisers who demand excellence.
          </p>

          <div className="flex gap-8 mb-8 text-[13px] text-white/50 font-[DM_Sans]">
            <a href="#" className="hover:text-white transition-colors">Product</a>
            <a href="#" className="hover:text-white transition-colors">Company</a>
            <a href="#" className="hover:text-white transition-colors">Legal</a>
          </div>

          <div className="text-[12px] text-white/20 font-[DM_Sans]">
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
