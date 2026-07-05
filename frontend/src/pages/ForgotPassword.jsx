import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import api, { formatError } from "@/lib/apiClient";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      toast.success("If the email exists, an OTP was sent.");
      setStep(2);
    } catch (err) {
      toast.error(formatError(err));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md space-y-6 fade-up">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-white"><ArrowLeft className="w-4 h-4" /> Back to sign in</Link>
        {step === 1 ? (
          <form onSubmit={submit} className="space-y-6" data-testid="forgot-form">
            <div>
              <h2 className="font-heading text-3xl font-extrabold tracking-tight">Reset password</h2>
              <p className="text-sm text-muted-foreground mt-1">Enter your email — we'll send you a one-time code.</p>
            </div>
            <div>
              <Label>Email</Label>
              <div className="relative mt-1.5"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9 h-11 rounded-xl bg-black/30" data-testid="forgot-email" />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-primary hover:bg-blue-500" data-testid="forgot-submit">{loading ? "Sending…" : "Send OTP"}</Button>
          </form>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="font-heading text-3xl font-extrabold tracking-tight">Enter OTP</h2>
              <p className="text-sm text-muted-foreground mt-1">We sent a 6-digit code to <span className="text-white">{email}</span></p>
            </div>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp} data-testid="otp-input">
                <InputOTPGroup>
                  {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button disabled className="w-full h-11 rounded-xl bg-primary/60 cursor-not-allowed">
              <ShieldCheck className="w-4 h-4 mr-2" /> Verify (UI preview)
            </Button>
            <p className="text-xs text-center text-muted-foreground">OTP verification is a UI-only preview — reset token is logged to server for demo.</p>
          </div>
        )}
      </div>
    </div>
  );
}
