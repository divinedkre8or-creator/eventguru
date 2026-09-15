import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronDown, Menu, X, Ticket, Image as ImageIcon, ScanLine, 
  Users, Mail, Award, Sparkles, BookOpen, ArrowRight, PlusCircle, Compass 
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const FEATURE_LINKS = [
  {
    title: "Viral DP Generator",
    desc: "Personalized 'I will be attending' social flyer maker",
    href: "/features/viral-dp-generator",
    icon: ImageIcon,
    hot: true,
  },
  {
    title: "Event Ticketing",
    desc: "Multi-tier tickets with instant automated payouts",
    href: "/features/event-ticketing",
    icon: Ticket,
  },
  {
    title: "Event Registration & RSVP",
    desc: "Free guest registration without Google Forms",
    href: "/features/event-registration",
    icon: Sparkles,
  },
  {
    title: "1-Second QR Check-In",
    desc: "Camera scanner app & offline mobile pass wallet",
    href: "/features/qr-check-in",
    icon: ScanLine,
  },
  {
    title: "Attendee Management",
    desc: "Searchable guest roster with clean CSV export",
    href: "/features/attendee-management",
    icon: Users,
  },
  {
    title: "Event Messaging",
    desc: "Direct SMS & email broadcasts to all attendees",
    href: "/features/event-messaging",
    icon: Mail,
  },
  {
    title: "Event Promotion",
    desc: "Attendee-powered peer marketing & viral growth",
    href: "/features/event-promotion",
    icon: Award,
  },
];

export const SiteHeader: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-card/95 backdrop-blur-md border-b border-border shadow-xs transition-all">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 h-16 sm:h-20 flex items-center justify-between">
        
        {/* Brand Logo & Desktop Nav */}
        <div className="flex items-center gap-8 lg:gap-10">
          <Link 
            to={user ? "/dashboard" : "/"} 
            className="flex items-center gap-1.5 hover:opacity-90 transition-opacity" 
            aria-label="EventRally Home"
          >
            <BrandLogo />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold text-muted-foreground">
            
            {/* Features Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setFeaturesOpen(true)}
              onMouseLeave={() => setFeaturesOpen(false)}
            >
              <Link 
                to="/features" 
                className="hover:text-foreground transition-colors flex items-center gap-1.5 py-2 font-bold text-sm"
              >
                Features <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${featuresOpen ? "rotate-180" : ""}`} />
              </Link>

              <AnimatePresence>
                {featuresOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 w-[520px] bg-card border border-border rounded-2xl shadow-2xl p-4 grid grid-cols-2 gap-2 z-50"
                  >
                    {FEATURE_LINKS.map((item) => (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setFeaturesOpen(false)}
                        className="flex items-start gap-3.5 p-3 rounded-xl hover:bg-muted/80 transition-colors group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0 group-hover:bg-secondary group-hover:text-white transition-colors">
                          <item.icon className="w-5 h-5" />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-foreground group-hover:text-secondary transition-colors truncate">
                              {item.title}
                            </span>
                            {item.hot && (
                              <span className="text-[10px] font-mono font-black bg-secondary/15 text-secondary px-1.5 py-0.5 rounded uppercase">
                                HOT
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1 leading-snug">
                            {item.desc}
                          </p>
                        </div>
                      </Link>
                    ))}
                    <div className="col-span-2 pt-3 mt-1 border-t border-border flex items-center justify-between text-xs px-2">
                      <Link 
                        to="/features" 
                        onClick={() => setFeaturesOpen(false)}
                        className="font-bold text-sm text-secondary hover:underline flex items-center gap-1.5"
                      >
                        View all platform capabilities <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link 
              to="/events" 
              className={`hover:text-foreground transition-colors font-bold text-sm ${location.pathname === "/events" ? "text-foreground" : ""}`}
            >
              Explore Events
            </Link>

            <Link 
              to="/guides" 
              className={`hover:text-foreground transition-colors font-bold text-sm ${location.pathname.startsWith("/guides") ? "text-foreground" : ""}`}
            >
              Guides & Resources
            </Link>

            <Link 
              to="/#faq" 
              className="hover:text-foreground transition-colors font-bold text-sm"
            >
              FAQ
            </Link>
          </nav>
        </div>

        {/* Desktop Right CTA (Hidden on Mobile) */}
        <div className="hidden lg:flex items-center gap-3">
          <ThemeToggle />

          {user ? (
            <Link to="/dashboard">
              <Button variant="secondary" className="font-bold text-sm h-10 px-5 rounded-xl shadow-sm">
                Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-sm font-bold text-foreground hover:opacity-80 px-3 py-2">
                Log in
              </Link>
              <Link to="/signup">
                <Button variant="secondary" className="font-bold text-sm h-10 px-5 rounded-xl shadow-sm flex items-center gap-2">
                  <PlusCircle className="w-4 h-4" />
                  <span>Organize Event</span>
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile View: Clean, Uncrowded Hamburger Button */}
        <div className="flex lg:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 rounded-xl text-foreground bg-muted/60 hover:bg-muted transition-colors flex items-center justify-center"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6 text-foreground" /> : <Menu className="w-6 h-6 text-foreground" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden border-b border-border bg-card px-5 py-6 space-y-6 overflow-hidden max-h-[85vh] overflow-y-auto shadow-2xl"
          >
            {/* Quick Action Top Bar inside Drawer */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <span className="text-xs font-mono font-bold uppercase text-muted-foreground tracking-wider">
                APPEARANCE & THEME
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">Theme</span>
                <ThemeToggle />
              </div>
            </div>

            {/* Platform Features Section */}
            <div className="space-y-2">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground px-1">
                PLATFORM CAPABILITIES
              </div>
              <div className="grid grid-cols-1 gap-1">
                {FEATURE_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4" />
                    </div>
                    <span className="flex-1">{item.title}</span>
                    {item.hot && (
                      <span className="text-[10px] font-mono font-black bg-secondary/15 text-secondary px-1.5 py-0.5 rounded uppercase">
                        HOT
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>

            {/* Discover & Learn Section */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground px-1">
                DISCOVER & EXPLORE
              </div>
              <Link
                to="/events"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-foreground hover:bg-muted rounded-xl transition-colors"
              >
                <Compass className="w-4 h-4 text-primary" />
                <span>Explore Live Events</span>
              </Link>
              <Link
                to="/guides"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-foreground hover:bg-muted rounded-xl transition-colors"
              >
                <BookOpen className="w-4 h-4 text-secondary" />
                <span>Organizer Knowledge Guides</span>
              </Link>
            </div>

            {/* Call to Action Buttons */}
            <div className="pt-4 border-t border-border flex flex-col gap-3">
              {user ? (
                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="secondary" className="w-full text-sm font-bold h-12 rounded-xl shadow-sm">
                    Go to Organizer Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="secondary" className="w-full text-sm font-bold h-12 rounded-xl shadow-sm flex items-center justify-center gap-2">
                      <PlusCircle className="w-4 h-4" />
                      <span>Create Your Event Free</span>
                    </Button>
                  </Link>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full text-sm font-bold h-11 rounded-xl border-border">
                      Log In to Your Account
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
