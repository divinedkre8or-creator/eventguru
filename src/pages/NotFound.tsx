import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { SEOHead } from "@/components/seo/SEOHead";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground selection:bg-primary selection:text-primary-foreground">
      <SEOHead title="Page Not Found" description="The requested page could not be found on EventRally." noIndex={true} />
      
      <div className="text-center space-y-6 max-w-md">
        <Link to="/" className="inline-block hover:opacity-90 transition-opacity" aria-label="EventRally Home">
          <BrandLogo />
        </Link>
        <div className="space-y-2">
          <h1 className="text-6xl font-heading font-black text-foreground">404</h1>
          <h2 className="text-xl font-heading font-bold text-foreground">Page not found</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>
        </div>
        <Link to="/">
          <Button size="lg" className="bg-secondary text-secondary-foreground font-bold text-sm h-11 px-6 rounded-lg hover:opacity-90 transition-all shadow-md">
            Return to EventRally Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
