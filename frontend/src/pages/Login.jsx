import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, Mail, Lock, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { formatError } from "@/lib/apiClient";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@registry.pro");
  const [password, setPassword] = useState("Admin@12345");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back");
      nav("/dashboard");
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background text-foreground">
      {/* Left visual */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 hero-gradient overflow-hidden">
        <div className="grain" />
        <div className="relative z-10 flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-heading font-extrabold text-xl leading-tight">Customer Registry Pro</div>
            <div className="text-[11px] text-muted-foreground -mt-0.5 font-mono">smart.support.platform</div>
          </div>
        </div>

        <div className="relative z-10 space-y-6 max-w-md">
          <h1 className="font-heading text-4xl xl:text-5xl font-extrabold leading-[1.05] tracking-tight">
            Customer support,<br />engineered for scale.
          </h1>
          <p className="text-muted-foreground text-base">
            An enterprise-grade platform for tracking customers, resolving complaints, and turning every interaction into insight.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { k: "12,480+", v: "Customers managed" },
              { k: "4.9/5", v: "Avg. CSAT rating" },
              { k: "< 6h", v: "Median resolution" },
              { k: "SOC 2", v: "Enterprise ready" },
            ].map((s) => (
              <div key={s.v} className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-4">
                <div className="font-heading text-2xl font-extrabold text-white">{s.k}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Encrypted, audited, and built for teams that ship.
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <form onSubmit={submit} className="w-full max-w-md space-y-6 fade-up" data-testid="login-form">
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center"><Sparkles className="w-4 h-4 text-white" /></div>
            <div className="font-heading font-extrabold">Registry Pro</div>
          </div>
          <div>
            <h2 className="font-heading text-3xl font-extrabold tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground mt-1">Access your customer command center.</p>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Work email</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 rounded-xl bg-black/30 border-border h-11" data-testid="login-email" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot?</Link>
              </div>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 rounded-xl bg-black/30 border-border h-11" data-testid="login-password" />
              </div>
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-primary hover:bg-blue-500 gap-2" data-testid="login-submit">
            {loading ? "Signing in…" : (<>Sign in <ArrowRight className="w-4 h-4" /></>)}
          </Button>
          <div className="text-sm text-muted-foreground text-center">
            No account? <Link to="/register" className="text-primary hover:underline" data-testid="link-register">Create one</Link>
          </div>
          <div className="rounded-xl border border-border bg-white/[0.02] p-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Demo:</span> admin@registry.pro / Admin@12345
          </div>
        </form>
      </div>
    </div>
  );
}
