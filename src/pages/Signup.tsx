import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, CalendarDays, Megaphone, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"attendee" | "organiser" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) {
      toast({ variant: "destructive", title: "Select a role", description: "Choose whether you want to attend or organise events." });
      return;
    }
    if (!fullName || !email || !password) return;
    setSubmitting(true);
    const { error } = await signUp(email, password, fullName, role);
    setSubmitting(false);
    if (error) {
      toast({ variant: "destructive", title: "Signup failed", description: error });
    } else {
      toast({ title: "Account created", description: "Check your email to verify your account." });
      navigate("/login");
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
            <h1 className="font-heading text-2xl font-800 text-ivory mb-2">Create Account</h1>
            <p className="text-ivory/50 text-sm font-body">Join Africa's leading event platform</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label className="text-ivory/70 text-xs font-body">Full Name</Label>
              <Input
                type="text"
                placeholder="Amaka Okonkwo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-white/5 border-white/10 text-ivory placeholder:text-ivory/30 focus-visible:ring-amber h-11"
                required
              />
            </div>

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
              <Label className="text-ivory/70 text-xs font-body">Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="--------"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/5 border-white/10 text-ivory placeholder:text-ivory/30 focus-visible:ring-amber h-11 pr-10"
                  required
                  minLength={6}
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

            <div className="space-y-2">
              <Label className="text-ivory/70 text-xs font-body">I want to</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("attendee")}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    role === "attendee"
                      ? "border-amber bg-amber/10 text-amber"
                      : "border-white/10 bg-white/5 text-ivory/60 hover:border-white/20"
                  }`}
                >
                  <CalendarDays className="w-5 h-5 mx-auto mb-1.5" />
                  <span className="text-xs font-heading font-700 block">Attend Events</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("organiser")}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    role === "organiser"
                      ? "border-amber bg-amber/10 text-amber"
                      : "border-white/10 bg-white/5 text-ivory/60 hover:border-white/20"
                  }`}
                >
                  <Megaphone className="w-5 h-5 mx-auto mb-1.5" />
                  <span className="text-xs font-heading font-700 block">Organise Events</span>
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-amber text-ink hover:bg-amber/90 font-heading font-700 h-11"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-ivory/40 text-sm font-body mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-amber hover:text-amber/80 font-medium">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
