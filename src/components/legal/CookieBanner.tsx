import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Cookie, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "eventrally_cookie_consent";

export const CookieBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if consent was already recorded
    const consent = localStorage.getItem(STORAGE_KEY);
    if (!consent) {
      // Delay showing banner slightly to avoid layout shift on initial load
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice: "all", date: new Date().toISOString() }));
    setIsVisible(false);
  };

  const handleAcceptEssential = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice: "essential", date: new Date().toISOString() }));
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <aside 
      aria-label="Cookie consent banner"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="p-4 sm:p-5 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-xl text-foreground space-y-3 font-sans">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
              <Cookie className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-heading font-bold text-foreground">
                Your Privacy & Cookie Choices
              </h4>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-chart-green" />
                NDPA 2023 Compliant
              </p>
            </div>
          </div>
          <button
            onClick={handleAcceptEssential}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          EventRally uses essential cookies to secure your account, store offline tickets in your browser wallet, and process ticket check-ins. Read our{" "}
          <Link to="/cookies" className="text-secondary font-semibold hover:underline">
            Cookie Policy
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="text-secondary font-semibold hover:underline">
            Privacy Policy
          </Link>
          .
        </p>

        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            onClick={handleAcceptAll}
            className="flex-1 bg-primary text-primary-foreground hover:opacity-90 font-bold text-xs h-9 rounded-xl shadow-xs"
          >
            Accept All
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAcceptEssential}
            className="flex-1 text-xs h-9 rounded-xl border-border font-medium hover:bg-muted"
          >
            Essential Only
          </Button>
        </div>
      </div>
    </aside>
  );
};
