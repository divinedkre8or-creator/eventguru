import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronDown, Menu, X, Ticket, Image as ImageIcon, ScanLine, 
  Users, Mail, Award, Sparkles, BookOpen, ArrowRight, PlusCircle 
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const FEATURE_LINKS = [
  {
    title: "Viral DP Generator",
    desc: "Personalized 'I will be attending' flyer maker",
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
    <header className="w-full bg-card/90 backdrop-blur-md border-b border-border sticky top-0 z-50">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-1 hover:opacity-90 transition-opacity" aria-label="EventRally Home">
            <BrandLogo />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-muted-foreground">
            
            {/* Features Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setFeaturesOpen(true)}
              onMouseLeave={() => setFeaturesOpen(false)}
            >
              <Link 
                to="/features" 
                className="hover:text-foreground transition-colors flex items-center gap-1 py-2 font-bold"
              >
                Features <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${featuresOpen ? "rotate-180" : ""}`} />
              </Link>

              <AnimatePresence>
                {featuresOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 w-[480px] bg-card border border-border rounded-xl shadow-xl p-4 grid grid-cols-2 gap-2 z-50"
                  >
                    {FEATURE_LINKS.map((item) => (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setFeaturesOpen(false)}
                        className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/80 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0 group-hover:bg-secondary group-hover:text-white transition-colors">
                          <item.icon className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-foreground group-hover:text-secondary transition-colors truncate">
                              {item.title}
                            </span>
                            {item.hot && (
                              <span className="text-[9px] font-mono font-black bg-secondary/15 text-secondary px-1.5 py-0.2 rounded uppercase">
                                HOT
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-1 leading-snug">
                            {item.desc}
                          </p>
                        </div>
                      </Link>
                    ))}
                    <div className="col-span-2 pt-2 border-t border-border flex items-center justify-between text-xs px-1">
                      <Link 
                        to="/features" 
                        onClick={() => setFeaturesOpen(false)}
                        className="font-bold text-secondary hover:underline flex items-center gap-1"
                      >
                        View all platform capabilities <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link 
              to="/events" 
              className={`hover:text-foreground transition-colors font-bold ${location.pathname === "/events" ? "text-foreground" : ""}`}
            >
              Explore Events
            </Link>

            <Link 
              to="/guides" 
              className={`hover:text-foreground transition-colors font-bold ${location.pathname.startsWith("/guides") ? "text-foreground" : ""}`}
            >
              Guides & Resources
            </Link>

            <Link 
              to="/#faq" 
              className="hover:text-foreground transition-colors font-bold"
            >
              FAQ
            </Link>
          </nav>
        </div>

        {/* Right CTA / Theme Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />

          {user ? (
            <Link to="/dashboard">
              <Button variant="secondary" size="sm" className="font-bold text-xs h-9 px-3 sm:px-4 rounded-lg shadow-sm">
                Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login" className="hidden sm:inline-block text-xs font-bold text-foreground hover:opacity-80 px-2 py-1">
                Log in
              </Link>
              <Link to="/signup">
                <Button variant="secondary" size="sm" className="font-bold text-xs h-9 px-3 sm:px-4 rounded-lg shadow-sm flex items-center gap-1.5">
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Organize Event</span>
                </Button>
              </Link>
            </>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-foreground hover:bg-muted transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
            className="lg:hidden border-b border-border bg-card px-4 py-6 space-y-5 overflow-hidden"
          >
            <div className="space-y-1">
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground px-2 mb-2">
                PLATFORM FEATURES
              </div>
              <div className="grid grid-cols-1 gap-1">
                {FEATURE_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-xs font-bold text-foreground hover:bg-muted"
                  >
                    <item.icon className="w-4 h-4 text-secondary shrink-0" />
                    <span>{item.title}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-1 pt-3 border-t border-border">
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground px-2 mb-2">
                DISCOVER & LEARN
              </div>
              <Link
                to="/events"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-2 py-1.5 text-xs font-bold text-foreground hover:bg-muted rounded-lg"
              >
                Explore Live Events
              </Link>
              <Link
                to="/guides"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-2 py-1.5 text-xs font-bold text-foreground hover:bg-muted rounded-lg"
              >
                Organizer Knowledge Hub & Guides
              </Link>
            </div>

            <div className="pt-3 border-t border-border flex flex-col gap-2">
              {!user && (
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full text-xs font-bold h-10">
                    Log In
                  </Button>
                </Link>
              )}
              <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="secondary" size="sm" className="w-full text-xs font-bold h-10 shadow-sm">
                  Create Your Event Free
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
