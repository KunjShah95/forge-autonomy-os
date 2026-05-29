import { Link } from "react-router-dom";
import { ArrowRight, Bot, ShieldCheck, Workflow, Gauge, Layers3, Sparkles } from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "Multi-agent control loop",
    desc: "Coordinate SRE, QA, DevOps, Security, PM, and Architecture agents through one shared decision pipeline.",
  },
  {
    icon: ShieldCheck,
    title: "Policy-bounded automation",
    desc: "Every action is gated by safety rules, trace evidence, and rollback policies before it can execute.",
  },
  {
    icon: Workflow,
    title: "Live runbook orchestration",
    desc: "Turn operational playbooks into guided flows that can observe, classify, repair, verify, and learn.",
  },
  {
    icon: Gauge,
    title: "Real-time insights",
    desc: "Surface performance, risk, and incident context with the same crisp visual hierarchy used elsewhere in the site.",
  },
];

export default function Features() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-black selection:text-white">
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="absolute -top-32 right-1/4 h-[26rem] w-[26rem] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-[24rem] w-[24rem] rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <header className="relative z-10 w-full border-b border-black/5 bg-white/90 backdrop-blur-md">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-12">
          <Link to="/" className="font-display text-2xl tracking-tight hover:opacity-80 transition-opacity">
            ForgeAI<sup className="text-xs font-sans font-semibold align-super">®</sup>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-xs uppercase tracking-wider text-muted-foreground">
            <Link to="/about" className="hover:text-black transition-colors">About</Link>
            <Link to="/features" className="text-black">Features</Link>
            <Link to="/pricing" className="hover:text-black transition-colors">Pricing</Link>
            <Link to="/contact" className="hover:text-black transition-colors">Contact</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="rounded-full border border-black px-5 py-3 text-xs font-semibold uppercase tracking-wider transition-all hover:bg-black hover:text-white">
              Sign in
            </Link>
            <Link to="/register" className="rounded-full bg-black px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white shadow-[0_0_26px_hsl(var(--primary)/0.55)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_38px_hsl(var(--primary)/0.8)]">
              Get started
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-24">
        <section className="max-w-4xl">
          <div className="mono text-[10px] uppercase tracking-[0.35em] text-[#6F6F6F] mb-5 flex items-center gap-2">
            <span className="inline-block h-px w-6 bg-[#6F6F6F]/60" />
            Features
          </div>
          <h1 className="font-display text-5xl md:text-7xl tracking-tight leading-[0.92]">
            A full stack of autonomy for software production.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-[#6F6F6F]">
            The product should feel like one continuous system from the marketing pages to the login flow and into the console. These feature blocks keep the same rounded, glowing, high-contrast design language.
          </p>
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-2">
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="glass rounded-3xl p-7 border border-black/5 shadow-[0_0_40px_hsl(var(--primary)/0.06)]">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white shadow-[0_0_24px_hsl(var(--primary)/0.35)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="mono text-[10px] uppercase tracking-[0.3em] text-[#6F6F6F]">Core capability</span>
                </div>
                <h2 className="mt-5 font-display text-2xl tracking-tight">{item.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-[#6F6F6F]">{item.desc}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-16 glass rounded-3xl p-8 md:p-10 border border-black/5 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mono text-[10px] uppercase tracking-[0.35em] text-[#6F6F6F] mb-4">What ties it together</div>
            <h2 className="font-display text-3xl md:text-4xl tracking-tight">Glowing buttons, rounded cards, and the same visual language everywhere.</h2>
            <p className="mt-4 text-sm md:text-base leading-relaxed text-[#6F6F6F]">
              The next step is simply to keep the flow consistent across the remaining pages, so every route feels like part of one polished product experience.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/about" className="inline-flex items-center gap-2 rounded-full border border-black px-6 py-3 text-xs font-semibold uppercase tracking-wider transition-all hover:bg-black hover:text-white">
              Learn more <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link to="/register" className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white shadow-[0_0_26px_hsl(var(--primary)/0.5)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_38px_hsl(var(--primary)/0.8)]">
              <Sparkles className="h-3.5 w-3.5" /> Start now
            </Link>
            <Link to="/app" className="inline-flex items-center gap-2 rounded-full border border-black/15 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-black/80 transition-all hover:border-black hover:text-black">
              Open console <Layers3 className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
