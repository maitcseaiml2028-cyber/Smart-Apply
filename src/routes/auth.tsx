import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Sparkles, Mail, Lock, ArrowRight, CheckCircle2, User as UserIcon, Loader2 } from "lucide-react";
import { useState } from "react";
import { signIn, signUp } from "@/lib/auth-server";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Smart Apply" },
      { name: "description", content: "Sign in or create your Smart Apply account to auto-fill forms and track applications." },
    ],
  }),
  component: AuthPage,
});

function FloatingInput({ icon: Icon, label, type = "text", value, onChange, required }: { icon: React.ComponentType<{ className?: string }>; label: string; type?: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  const [focus, setFocus] = useState(false);
  const float = focus || value.length > 0;
  return (
    <label className="block relative">
      <div className={`relative flex items-center rounded-xl border bg-card transition-all ${focus ? "border-ring ring-4 ring-ring/15" : "border-input"}`}>
        <Icon className="ml-3.5 h-4 w-4 text-muted-foreground" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          required={required}
          className="peer w-full bg-transparent px-3 pt-5 pb-2 text-sm focus:outline-none"
        />
        <span className={`pointer-events-none absolute left-10 transition-all ${float ? "top-1.5 text-[10px] text-primary font-medium" : "top-1/2 -translate-y-1/2 text-sm text-muted-foreground"}`}>
          {label}
        </span>
      </div>
    </label>
  );
}

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (mode === "signin") {
        const res = await signIn({ data: { email, password } });
        if (res && res.user) {
          document.cookie = `userId=${res.user.id}; path=/; max-age=31536000`;
          toast.success("Welcome back!");
          setSuccess("Login successful! Redirecting...");
          setTimeout(() => {
            navigate({ to: "/dashboard" });
          }, 1000);
        } else {
          setError("Login failed. Please check your credentials.");
        }
      } else {
        const res = await signUp({ data: { email, password, fullName } });
        if (res && res.user) {
          document.cookie = `userId=${res.user.id}; path=/; max-age=31536000`;
          toast.success("Account created successfully!");
          setSuccess("Account created successfully! Switching to login...");
          setEmail("");
          setPassword("");
          setFullName("");
          setTimeout(() => {
            setMode("signin");
            setSuccess("");
          }, 2000);
        } else {
          setError("Sign up failed. Please try again.");
        }
      }
    } catch (err: any) {
      const msg = err.message || "An error occurred. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Illustration side */}
      <div className="relative hidden lg:flex items-center justify-center overflow-hidden gradient-hero">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "var(--gradient-mesh)" }} />
        <div className="relative z-10 max-w-md px-12 text-primary-foreground">
          <button onClick={() => navigate({ to: "/" })} className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-semibold">Smart Apply</span>
          </button>
          <h1 className="mt-16 text-4xl font-semibold leading-tight tracking-tight">
            Apply once. <br />Track everything.
          </h1>
          <p className="mt-4 text-primary-foreground/80 leading-relaxed">
            Join thousands using Smart Apply to auto-fill applications and never miss a deadline again.
          </p>
          <div className="mt-10 space-y-3 text-sm">
            {["Auto-fill 200+ form types", "Encrypted document vault", "Smart deadline reminders"].map((t) => (
              <div key={t} className="flex items-center gap-2.5 text-primary-foreground/90">
                <CheckCircle2 className="h-4 w-4" /> {t}
              </div>
            ))}
          </div>
          <div className="mt-16 glass rounded-2xl p-4 text-foreground">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">PM</div>
              <div>
                <p className="text-sm leading-relaxed">"I filled 12 government forms in an afternoon. Smart Apply is genuinely magic."</p>
                <p className="text-xs text-muted-foreground mt-1.5">Priya M. — Bangalore</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-sm animate-slide-up">
          <button onClick={() => navigate({ to: "/" })} className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center"><Sparkles className="h-4 w-4 text-primary-foreground" /></div>
            <span className="font-semibold">Smart Apply</span>
          </button>

          <div className="inline-flex p-1 rounded-xl bg-secondary text-sm mb-6">
            <button onClick={() => setMode("signin")} className={`px-4 py-1.5 rounded-lg transition-all ${mode === "signin" ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"}`}>Sign in</button>
            <button onClick={() => setMode("signup")} className={`px-4 py-1.5 rounded-lg transition-all ${mode === "signup" ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"}`}>Create account</button>
          </div>

          <h2 className="text-3xl font-semibold tracking-tight">{mode === "signin" ? "Welcome back" : "Get started free"}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{mode === "signin" ? "Sign in to your Smart Apply account." : "No credit card required. Setup in 60 seconds."}</p>

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive flex-shrink-0 animate-pulse" />
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs font-medium flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-3">
            {mode === "signup" && <FloatingInput icon={UserIcon} label="Full name" value={fullName} onChange={setFullName} required />}
            <FloatingInput icon={Mail} label="Email address" type="email" value={email} onChange={setEmail} required />
            <FloatingInput icon={Lock} label="Password" type="password" value={password} onChange={setPassword} required />

            {mode === "signin" && (
              <div className="mt-3 text-right">
                <a href="#" className="text-xs text-primary hover:underline">Forgot password?</a>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl gradient-primary text-primary-foreground font-medium shadow-glow hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-70"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{mode === "signin" ? "Sign in" : "Create account"} <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-border" /> or continue with <div className="flex-1 h-px bg-border" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button className="py-2.5 rounded-xl border border-border bg-card text-sm hover-lift">Google</button>
            <button className="py-2.5 rounded-xl border border-border bg-card text-sm hover-lift">Apple</button>
          </div>

          <p className="mt-8 text-xs text-center text-muted-foreground">
            By continuing you agree to our <a className="underline">Terms</a> and <a className="underline">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
