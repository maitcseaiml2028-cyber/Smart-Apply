import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, ShieldCheck, Zap, FileText, ArrowRight, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Apply — Smart form filling & application tracking" },
      { name: "description", content: "Store your details once. Auto-fill any form. Track every application — exams, jobs, government IDs — in one elegant dashboard." },
      { property: "og:title", content: "Smart Apply — Smart form filling & application tracking" },
      { property: "og:description", content: "Auto-fill forms and track every application from one elegant dashboard." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/60">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold tracking-tight">Smart Apply</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#how" className="hover:text-foreground transition">How it works</a>
            <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="text-sm px-3 py-2 rounded-lg hover:bg-secondary transition">Sign in</Link>
            <Link to="/dashboard" className="text-sm px-4 py-2 rounded-lg gradient-primary text-primary-foreground shadow-soft hover:shadow-glow transition-all">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card/60 text-xs text-muted-foreground mb-6 animate-fade-in">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            New — Auto-fill 200+ Indian government forms
          </div>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05] animate-slide-up">
            Fill any form.
            <br />
            <span className="gradient-text">In one click.</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground leading-relaxed">
            Store your details once. Smart Apply auto-fills exam, job and government applications — and tracks every deadline, admit card and result in one elegant place.
          </p>
          <div className="mt-9 flex items-center justify-center gap-3">
            <Link to="/dashboard" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-medium shadow-glow hover:scale-[1.02] transition-transform">
              Try the demo <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/auth" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-card border border-border font-medium hover-lift">
              Create account
            </Link>
          </div>
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Free to start</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Bank-grade encryption</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> No credit card</span>
          </div>
        </div>

        {/* Hero preview card */}
        <div className="max-w-5xl mx-auto px-6 pb-24">
          <div className="glass rounded-3xl p-2 shadow-elevated">
            <div className="rounded-2xl bg-gradient-to-br from-card to-secondary/40 p-8 border border-border/60">
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { icon: FileText, label: "Total Applications", value: "24", trend: "+3 this week", color: "primary" },
                  { icon: Zap, label: "Auto-filled", value: "187", trend: "saves ~9 hrs", color: "accent" },
                  { icon: ShieldCheck, label: "Verified Docs", value: "12", trend: "all up to date", color: "success" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-card border border-border p-5 hover-lift">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{s.label}</span>
                      <s.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="mt-3 text-3xl font-semibold tracking-tight">{s.value}</div>
                    <div className="mt-1 text-[11px] text-success">{s.trend}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Everything you need, nothing you don't</h2>
          <p className="mt-3 text-muted-foreground">Designed for the way you actually apply to things.</p>
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {[
            { icon: Zap, title: "One-tap auto-fill", desc: "Your saved profile fills out forms across exams, jobs and government portals." },
            { icon: FileText, title: "Smart tracker", desc: "Apply dates, admit cards, exams and results — all visible at a glance." },
            { icon: ShieldCheck, title: "Encrypted vault", desc: "Photos, signatures and IDs stored with end-to-end encryption." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl p-6 bg-card border border-border hover-lift">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border mt-12">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md gradient-primary flex items-center justify-center"><Sparkles className="h-3 w-3 text-primary-foreground" /></div>
            <span>© 2026 Smart Apply</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
