import React from "react";
import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ArrowUpRight, ShieldCheck, Heart } from "lucide-react";

export const SiteFooter: React.FC = () => {
  return (
    <footer className="bg-card border-t border-border pt-16 pb-12 px-4 sm:px-6 font-sans">
      <div className="max-w-[1440px] mx-auto space-y-12">
        
        {/* Main Footer Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          
          {/* Brand & Entity Summary */}
          <div className="col-span-2 space-y-4 pr-0 lg:pr-6">
            <Link to="/" className="inline-block" aria-label="EventRally Home">
              <BrandLogo className="h-7" imgClassName="h-7" />
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              EventRally is an event operating system and ticketing platform built for creators, conference conveners, campus leaders, and festival promoters. Free events are 100% free forever.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
              <ShieldCheck className="w-4 h-4 text-secondary" />
              <span>Instant Bank Settlements • Automated QR Gate Check-In</span>
            </div>
          </div>

          {/* Platform Features Column */}
          <div className="space-y-3">
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-foreground">
              Core Capabilities
            </h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link to="/features/viral-dp-generator" className="hover:text-foreground transition-colors font-medium">
                  Viral DP Generator
                </Link>
              </li>
              <li>
                <Link to="/features/event-ticketing" className="hover:text-foreground transition-colors font-medium">
                  Event Ticketing Platform
                </Link>
              </li>
              <li>
                <Link to="/features/event-registration" className="hover:text-foreground transition-colors font-medium">
                  Event Registration & RSVP
                </Link>
              </li>
              <li>
                <Link to="/features/qr-check-in" className="hover:text-foreground transition-colors font-medium">
                  1-Second QR Check-In
                </Link>
              </li>
              <li>
                <Link to="/features/attendee-management" className="hover:text-foreground transition-colors font-medium">
                  Attendee Management
                </Link>
              </li>
              <li>
                <Link to="/features/event-messaging" className="hover:text-foreground transition-colors font-medium">
                  Attendee SMS & Email
                </Link>
              </li>
              <li>
                <Link to="/features/event-promotion" className="hover:text-foreground transition-colors font-medium">
                  Event Promotion Engine
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-secondary font-bold transition-colors inline-flex items-center gap-1 pt-1">
                  View All Features <ArrowUpRight className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Guides & Resources Column */}
          <div className="space-y-3">
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-foreground">
              Guides & Education
            </h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link to="/guides/how-to-sell-tickets-online-in-nigeria" className="hover:text-foreground transition-colors">
                  Sell Tickets in Nigeria
                </Link>
              </li>
              <li>
                <Link to="/guides/how-to-create-an-i-will-be-attending-flyer" className="hover:text-foreground transition-colors">
                  Attending Flyer Guide
                </Link>
              </li>
              <li>
                <Link to="/guides/event-registration-vs-google-forms" className="hover:text-foreground transition-colors">
                  Event Registration vs Forms
                </Link>
              </li>
              <li>
                <Link to="/guides/how-to-check-in-attendees-using-qr-codes" className="hover:text-foreground transition-colors">
                  QR Gate Check-In Guide
                </Link>
              </li>
              <li>
                <Link to="/guides/how-to-send-reminders-and-updates-to-event-attendees" className="hover:text-foreground transition-colors">
                  Attendee Messaging Guide
                </Link>
              </li>
              <li>
                <Link to="/guides/how-to-manage-free-events-and-rsvps-online" className="hover:text-foreground transition-colors">
                  Free Event Management
                </Link>
              </li>
              <li>
                <Link to="/guides" className="hover:text-secondary font-bold transition-colors inline-flex items-center gap-1 pt-1">
                  Knowledge Hub <ArrowUpRight className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Discovery & Account Column */}
          <div className="space-y-3">
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-foreground">
              Event Directory
            </h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link to="/events" className="hover:text-foreground transition-colors">
                  Explore Live Events
                </Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-foreground transition-colors font-medium">
                  Host an Event Free
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-foreground transition-colors">
                  Attendee Ticket Wallet
                </Link>
              </li>
              <li>
                <Link to="/#faq" className="hover:text-foreground transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Legal / Copyright Bar */}
        <div className="border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>© 2026 EVENTRALLY (geteventrally.com). All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[11px]">WHERE EVERYONE'S GOING.</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
