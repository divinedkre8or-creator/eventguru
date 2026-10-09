import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, CalendarDays, Megaphone, Loader2, Mail, CheckCircle2, AlertCircle, ArrowRight, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SEOHead } from "@/components/seo/SEOHead";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { supabase } from "@/integrations/supabase/client";

const Signup = () => {
  const [searchParams] = useSearchParams();
  const urlEmail = searchParams.get("email") || "";

  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(urlEmail);
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"attendee" | "organiser">("attendee");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const { signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isTicketClaim = Boolean(urlEmail || searchParams.get("redirect") === "/dashboard");

  useEffect(() => {
    if (urlEmail) {
      setEmail(urlEmail);
      setRole("attendee");
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
        toast({ title: "Email sent", description: "Verification link dispatched. Please check your inbox and spam folder." });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to resend email." });
    } finally {
      setResendingEmail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!role) {
      setFormError("Please choose whether you want to attend or organise events.");
      toast({ variant: "destructive", title: "Select a role", description: "Choose whether you want to attend or organise events." });
      return;
    }

    if (!fullName.trim() || !email.trim() || !password) {
      setFormError("Please complete all required fields.");
      return;
    }

    if (password.length < 6) {
      setFormError("Password must be at least 6 characters long.");
      return;
    }

    setSubmitting(true);
    try {
      const { session, error } = await signUp(email.trim(), password, fullName.trim(), role);
      setSubmitting(false);

      if (error) {
        setFormError(error);
        toast({ variant: "destructive", title: "Signup failed", description: error });
      } else if (session) {
        toast({ title: "Welcome to EventRally!", description: "Account created and logged in successfully." });
        navigate("/dashboard");
      } else {
        // Supabase created the user but requires email verification before creating a session
        setVerificationSent(true);
        toast({ title: "Account created", description: "Please check your inbox to confirm your email." });
      }
    } catch (err: any) {
      setSubmitting(false);
      const msg = err?.message || "An unexpected error occurred during signup.";
      setFormError(msg);
      toast({ variant: "destructive", title: "Signup error", description: msg });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-foreground antialiased">
      <SEOHead
        title="Create Your Event Free — Organizer Sign Up"
        description="Create your free EventRally account. Set up tickets in minutes, automate door check-in, and turn your attendees into a viral marketing team."
        canonicalPath="/signup"
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
                JOIN EVENTRALLY
              </span>
            </div>
            <h1 className="font-heading text-3xl font-black text-foreground tracking-tight">
              Create Account
            </h1>
            <p className="text-sm text-muted-foreground font-medium">
              Join Africa's leading event platform
            </p>
          </div>
          {isTicketClaim && (
            <div className="mb-6 p-3 rounded-xl bg-secondary/10 border border-secondary/20 text-center space-y-1">
              <div className="text-xs font-bold text-secondary">
                Claiming Event Ticket
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">
                Create a password to store your tickets and activate your Attendee Wallet.
              </p>
            </div>
          )}

          {/* Verification Sent State */}
          {verificationSent ? (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm text-center space-y-4 animate-in fade-in-50">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h2 className="font-heading text-xl font-bold text-foreground">Check Your Inbox</h2>
                <p className="text-xs text-muted-foreground">
                  We've sent a verification link to:
                </p>
                <p className="font-mono text-xs font-bold text-foreground bg-muted px-2.5 py-1 rounded-md inline-block">
                  {email}
                </p>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Click the confirmation link in the email to activate your account and access your EventRally attendee wallet.
              </p>

              {resendSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Verification link resent! Check spam if not found.</span>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <Button
                  onClick={handleResendVerification}
                  variant="outline"
                  disabled={resendingEmail}
                  className="w-full text-xs font-semibold h-10 gap-1.5 border-border"
                >
                  {resendingEmail ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Resending...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Resend Verification Email</span>
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => navigate(`/login?email=${encodeURIComponent(email)}`)}
                  variant="secondary"
                  className="w-full text-xs font-bold h-10 gap-1.5"
                >
                  <span>Proceed to Log In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setVerificationSent(false);
                    setResendSuccess(false);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
                >
                  Use a different email
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Inline Form Error */}
              {formError && (
                <div className="mb-5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Unable to Create Account</span>
                  </div>
                  <p className="leading-relaxed pl-6">{formError}</p>
                  {formError.toLowerCase().includes("already registered") && (
                    <div className="pl-6 pt-1">
                      <Link
                        to={`/login?email=${encodeURIComponent(email)}`}
                        className="font-bold underline text-foreground hover:opacity-80"
                      >
                        Log in with this email instead →
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Form */}
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">Full Name</Label>
                  <Input
                    type="text"
                    placeholder="Amaka Okonkwo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-primary h-11 rounded-lg"
                    required
                  />
                </div>

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
                  <Label className="text-xs font-bold text-foreground">Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-primary h-11 pr-10 rounded-lg"
                      required
                      minLength={6}
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

                {/* Role Selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">I want to</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole("attendee")}
                      className={`p-4 rounded-lg border text-center transition-all ${
                        role === "attendee"
                          ? "border-secondary bg-secondary/10 text-secondary shadow-sm"
                          : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-muted"
                      }`}
                    >
                      <CalendarDays className="w-5 h-5 mx-auto mb-2" />
                      <span className="text-xs font-bold block">Attend Events</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("organiser")}
                      className={`p-4 rounded-lg border text-center transition-all ${
                        role === "organiser"
                          ? "border-secondary bg-secondary/10 text-secondary shadow-sm"
                          : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-muted"
                      }`}
                    >
                      <Megaphone className="w-5 h-5 mx-auto mb-2" />
                      <span className="text-xs font-bold block">Organise Events</span>
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-muted-foreground text-center leading-relaxed px-1">
                  By creating an account, you agree to EventRally&apos;s{" "}
                  <Link to="/terms" target="_blank" className="text-secondary font-semibold hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and acknowledge our{" "}
                  <Link to="/privacy" target="_blank" className="text-secondary font-semibold hover:underline">
                    Privacy Policy
                  </Link>
                  {role === "organiser" && (
                    <>
                      {" "}and the{" "}
                      <Link to="/organizer-terms" target="_blank" className="text-secondary font-semibold hover:underline">
                        Organizer Agreement
                      </Link>
                    </>
                  )}.
                </div>

                <Button
                  type="submit"
                  variant="secondary"
                  disabled={submitting}
                  className="w-full font-bold text-sm h-11 rounded-lg transition-all shadow-sm mt-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
                </Button>
              </form>

              {/* Divider */}
              <div className="my-6 border-t border-border"></div>

              <p className="text-center text-muted-foreground text-sm font-medium">
                Already have an account?{" "}
                <Link to="/login" className="text-secondary font-bold hover:opacity-80 transition-opacity">
                  Log in
                </Link>
              </p>
            </>
          )}
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

export default Signup;
