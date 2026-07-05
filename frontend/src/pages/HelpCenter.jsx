import { LifeBuoy, BookOpen, MessageCircle, Sparkles } from "lucide-react";

export default function HelpCenter() {
  const items = [
    { icon: BookOpen, title: "Getting started", desc: "Onboarding guide for new teams" },
    { icon: Sparkles, title: "Best practices", desc: "How top teams triage complaints" },
    { icon: MessageCircle, title: "Ask the community", desc: "1,200+ active support pros" },
    { icon: LifeBuoy, title: "Contact support", desc: "Enterprise SLA response < 2h" },
  ];
  return (
    <div className="space-y-6 fade-up">
      <div>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">Help Center</h1>
        <p className="text-sm text-muted-foreground">Guides, docs and support to level up your team</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {items.map((i) => (
          <div key={i.title} className="rounded-2xl border border-border bg-card p-5 card-lift">
            <i.icon className="w-8 h-8 text-primary" />
            <div className="mt-3 font-heading font-bold">{i.title}</div>
            <div className="text-xs text-muted-foreground">{i.desc}</div>
          </div>
        ))}
      </div>
      <div className="rounded-3xl border border-border hero-gradient p-8 relative overflow-hidden">
        <div className="grain" />
        <div className="relative max-w-xl">
          <h2 className="font-heading text-2xl font-extrabold">Need a hand?</h2>
          <p className="text-sm text-muted-foreground mt-1">Our team ships product improvements daily. Send us a note and we'll get back within one business day.</p>
        </div>
      </div>
    </div>
  );
}
