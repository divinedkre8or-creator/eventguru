import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SEOHead } from "@/components/seo/SEOHead";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const [searchParams] = useSearchParams();
  const urlEmail = searchParams.get("email") || "";

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(urlEmail);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const { signIn, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (urlEmail) {
      setEmail(urlEmail);
    }
  }, [urlEmail]);

  const handleResendVerification = async () => {
    if (!email) return;
    setResendingEmail(true);
    setResendSuccess(false);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });
      if (error) {
        toast({ variant: "destructive", title: "Resend failed", description: error.message });
      } else {
        setResendSuccess(true);
        toast({ title: "Email sent", description: "Verification email resent. Please check your inbox and spam folder." });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to resend email." });
    } finally {
      setResendingEmail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoginError(null);
    setResendSuccess(false);
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) {
      setLoginError(error);
      toast({ variant: "destructive", title: "Login failed", description: error });
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-foreground antialiased">
      <SEOHead
        title="Log In to Your Account"
        description="Sign in to your EventRally organizer dashboard to manage ticket sales, door check-in, and attendee marketing."
        canonicalPath="/login"
      />
      {/* Top Bar */}
      <header className="w-full border-b border-border bg-card/90 backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-1 hover:opacity-90 transition-opacity" aria-label={user ? "EventRally Dashboard" : "EventRally Home"}>
            <BrandLogo />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="text-center mb-8 space-y-2">
            <div className="flex items-center gap-2 justify-center">
              <div className="w-2.5 h-2.5 bg-secondary rounded-xs"></div>
              <span className="text-secondary font-mono text-[11px] font-bold tracking-widest uppercase">
                WELCOME BACK
              </span>
            </div>
            <h1 className="font-heading text-3xl font-black text-foreground tracking-tight">
              Log In
            </h1>
            <p className="text-sm text-muted-foreground font-medium">
              Sign in to manage your events and attendees
            </p>
          </div>

          {/* Inline Error Alert */}
          {loginError && (
            <div className="mb-5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Unable to Sign In</span>
              </div>
              <p className="leading-relaxed pl-6">{loginError}</p>

              {loginError.toLowerCase().includes("email not confirmed") && (
                <div className="pl-6 pt-1 space-y-2">
                  <p className="text-[11px] text-foreground/80">
                    Your email address needs to be confirmed before logging in. Check your inbox and spam folder, or click below:
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResendVerification}
                    disabled={resendingEmail}
                    className="w-full text-xs font-semibold h-9 gap-1.5 border-border bg-background text-foreground"
                  >
                    {resendingEmail ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending verification email...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Resend Verification Email</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {resendSuccess && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Verification email sent! Check your inbox to confirm your account.</span>
            </div>
          )}

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Email</Label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-primary h-11 rounded-lg"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">Password</Label>
                <span className="text-secondary text-xs font-bold cursor-pointer hover:opacity-80 transition-opacity">
                  Forgot password?
                </span>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-primary h-11 pr-10 rounded-lg"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="secondary"
              disabled={submitting}
              className="w-full font-bold text-sm h-11 rounded-lg transition-all shadow-sm mt-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Log In"}
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 border-t border-border"></div>

          <p className="text-center text-muted-foreground text-sm font-medium">
            Don't have an account?{" "}
            <Link to="/signup" className="text-secondary font-bold hover:opacity-80 transition-opacity">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-4 text-center text-xs text-muted-foreground flex flex-wrap items-center justify-center gap-3">
        <span>© 2026 EventRally. All rights reserved.</span>
        <span>•</span>
        <Link to="/terms" className="hover:text-foreground">Terms</Link>
        <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
        <Link to="/cookies" className="hover:text-foreground">Cookies</Link>
      </footer>
    </div>
  );
};

export default Login;
