import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Sparkles, Workflow, BrainCircuit, Layers3 } from "lucide-react";

const pillars = [
  {
    icon: BrainCircuit,
    title: "Reasoning with context",
    desc: "ForgeAI combines runtime signals, architectural metadata, and policy boundaries before it takes action.",
  },
  {
    icon: ShieldCheck,
    title: "Guardrails everywhere",
    desc: "Every mutation is evaluated through explicit policy gates, trace evidence, and rollback criteria.",
  },
  {
    icon: Workflow,
    title: "End-to-end coordination",
    desc: "Agents collaborate across CI, incidents, deployments, and planning without losing provenance.",
  },
  {
    icon: Layers3,
    title: "One operating system",
    desc: "The same visual language and interaction model carries across the public site and product console.",
  },
];

export default function About() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-black selection:text-white">
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="absolute -top-32 left-1/3 h-[26rem] w-[26rem] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute top-32 right-0 h-[22rem] w-[22rem] rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <header className="relative z-10 w-full border-b border-black/5 bg-white/90 backdrop-blur-md">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-12">
          <Link to="/" className="font-display text-2xl tracking-tight hover:opacity-80 transition-opacity">
            ForgeAI<sup className="text-xs font-sans font-semibold align-super">®</sup>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-xs uppercase tracking-wider text-muted-foreground">
            <Link to="/features" className="hover:text-black transition-colors">Features</Link>
            <Link to="/about" className="text-black">About</Link>
            <Link to="/pricing" className="hover:text-black transition-colors">Pricing</Link>
            <Link to="/contact" className="hover:text-black transition-colors">Contact</Link>
                      </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="rounded-full border border-black px-5 py-3 text-xs font-semibold uppercase tracking-wider transition-all hover:bg-black hover:text-white hover:shadow-[0_0_24px_hsl(var(--primary)/0.35)]">
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
            About ForgeAI
          </div>
          <h1 className="font-display text-5xl md:text-7xl tracking-tight leading-[0.92]">
            An autonomous operating system for software production.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-[#6F6F6F]">
            ForgeAI keeps the same cinematic, high-contrast design language across the entire site while explaining the product in a clear, structured flow. The goal is simple: make production systems easier to understand, safer to operate, and faster to repair.
          </p>
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {pillars.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="glass rounded-3xl p-6 border border-black/5 shadow-[0_0_40px_hsl(var(--primary)/0.06)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white shadow-[0_0_24px_hsl(var(--primary)/0.35)]">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-5 font-display text-2xl tracking-tight">{item.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-[#6F6F6F]">{item.desc}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <article className="glass rounded-3xl p-8 border border-black/5">
            <div className="mono text-[10px] uppercase tracking-[0.35em] text-[#6F6F6F] mb-4">Why it matters</div>
            <h2 className="font-display text-3xl md:text-4xl tracking-tight">A shared system across every page and every action.</h2>
            <p className="mt-4 text-sm md:text-base leading-relaxed text-[#6F6F6F]">
              The public pages, onboarding flow, and product console all use the same visual rhythm: bold typography, rounded controls, glass panels, and subtle neon glow. That consistency makes the product feel cohesive instead of stitched together.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/features" className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white shadow-[0_0_26px_hsl(var(--primary)/0.5)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_38px_hsl(var(--primary)/0.8)]">
                Explore features <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link to="/register" className="inline-flex items-center gap-2 rounded-full border border-black px-6 py-3 text-xs font-semibold uppercase tracking-wider transition-all hover:bg-black hover:text-white">
                Create account <Sparkles className="h-3.5 w-3.5" />
              </Link>
            </div>
          </article>

          <aside className="glass rounded-3xl p-8 border border-black/5">
            <div className="mono text-[10px] uppercase tracking-[0.35em] text-[#6F6F6F] mb-4">Design notes</div>
            <ul className="space-y-4 text-sm leading-relaxed text-[#6F6F6F]">
              <li>• Rounded, oversized CTAs with soft glow</li>
              <li>• Black / white base with neon accents</li>
              <li>• Glass panels and subtle grid overlays</li>
              <li>• Same typography hierarchy across pages</li>
            </ul>
          </aside>
        </section>
      </main>
    </div>
  );
}
