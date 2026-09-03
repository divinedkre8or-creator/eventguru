import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      toast({ variant: "destructive", title: "Login failed", description: error });
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-foreground antialiased">
      {/* Top Bar */}
      <header className="w-full border-b border-border bg-card/90 backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="font-heading font-black text-lg sm:text-xl text-primary tracking-tighter uppercase flex items-center gap-1">
            MYEVENTGURU<span className="text-[10px] text-muted-foreground align-top">™</span>
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
              disabled={submitting}
              className="w-full bg-secondary text-secondary-foreground hover:opacity-90 font-bold text-sm h-11 rounded-lg transition-all shadow-sm mt-2"
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
      <footer className="border-t border-border py-6 px-4 text-center text-xs text-muted-foreground">
        © 2026 Eventguru. All rights reserved.
      </footer>
    </div>
  );
};

export default Login;
