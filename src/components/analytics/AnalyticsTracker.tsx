import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { initAnalytics, trackPageView, identifyUser, resetAnalytics } from "@/lib/analytics";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Global component mounted inside BrowserRouter that initializes PostHog
 * and tracks single-page application route transitions seamlessly.
 */
export const AnalyticsTracker = () => {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);

  useEffect(() => {
    if (user) {
      identifyUser(user.id, {
        email: user.email,
        name: user.user_metadata?.full_name,
        created_at: user.created_at,
      });
    } else {
      resetAnalytics();
    }
  }, [user]);

  return null;
};

