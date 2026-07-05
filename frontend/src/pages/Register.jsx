import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, Mail, Lock, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { formatError } from "@/lib/apiClient";
import { toast } from "sonner";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success("Account created");
      nav("/dashboard");
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <form onSubmit={submit} className="w-full max-w-md space-y-6 fade-up" data-testid="register-form">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center"><Sparkles className="w-5 h-5 text-white" /></div>
          <div>
            <div className="font-heading font-extrabold text-lg">Customer Registry Pro</div>
            <div className="text-[11px] text-muted-foreground -mt-0.5 font-mono">create.your.workspace</div>
          </div>
        </div>
        <div>
          <h2 className="font-heading text-3xl font-extrabold tracking-tight">Create account</h2>
          <p className="text-sm text-muted-foreground mt-1">Start managing your customers in minutes.</p>
        </div>
        <div className="space-y-4">
          <div>
            <Label>Full name</Label>
            <div className="relative mt-1.5"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="pl-9 h-11 rounded-xl bg-black/30" data-testid="register-name" />
            </div>
          </div>
          <div>
            <Label>Work email</Label>
            <div className="relative mt-1.5"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="pl-9 h-11 rounded-xl bg-black/30" data-testid="register-email" />
            </div>
          </div>
          <div>
            <Label>Password</Label>
            <div className="relative mt-1.5"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input required type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="pl-9 h-11 rounded-xl bg-black/30" data-testid="register-password" />
            </div>
          </div>
        </div>
        <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-primary hover:bg-blue-500 gap-2" data-testid="register-submit">
          {loading ? "Creating…" : (<>Create account <ArrowRight className="w-4 h-4" /></>)}
        </Button>
        <div className="text-sm text-muted-foreground text-center">
          Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
        </div>
      </form>
    </div>
  );
}
