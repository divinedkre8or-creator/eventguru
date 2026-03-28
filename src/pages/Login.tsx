import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

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
    <div className="min-h-screen bg-ink flex flex-col">
      <div className="kente-strip" />

      <div className="container px-4 py-4">
        <Link to="/" className="font-heading text-xl font-800 text-ivory tracking-tight">
          Event<span className="text-amber">stack</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="font-heading text-2xl font-800 text-ivory mb-2">Welcome Back</h1>
            <p className="text-ivory/50 text-sm font-body">Log in to manage your events</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label className="text-ivory/70 text-xs font-body">Email</Label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-white/10 text-ivory placeholder:text-ivory/30 focus-visible:ring-amber h-11"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-ivory/70 text-xs font-body">Password</Label>
                <span className="text-amber text-xs font-body cursor-pointer hover:text-amber/80">Forgot password?</span>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="--------"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/5 border-white/10 text-ivory placeholder:text-ivory/30 focus-visible:ring-amber h-11 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ivory/40 hover:text-ivory/60"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-amber text-ink hover:bg-amber/90 font-heading font-700 h-11"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Log In"}
            </Button>
          </form>

          <p className="text-center text-ivory/40 text-sm font-body mt-6">
            Don't have an account?{" "}
            <Link to="/signup" className="text-amber hover:text-amber/80 font-medium">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
