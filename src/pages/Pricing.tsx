import { Link } from "react-router-dom";
import { Check, Sparkles, ArrowRight, ShieldCheck, Rocket } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "$0",
    desc: "For exploring the autonomous control loop and getting familiar with the product flow.",
    highlights: ["Public landing pages", "Onboarding flow", "Console preview"],
    cta: "Start free",
    accent: false,
  },
  {
    name: "Team",
    price: "$299",
    desc: "For teams that want guided CI recovery, safer releases, and shared operational context.",
    highlights: ["All Starter features", "Agent orchestration", "Policy-bound automation"],
    cta: "Register team",
    accent: true,
  },
  {
    name: "Enterprise",
    price: "$999",
    desc: "For organizations that need governance, custom rollout controls, and deeper integration work.",
    highlights: ["Advanced policy gates", "Enterprise support", "Rollout intelligence"],
    cta: "Talk to sales",
    accent: false,
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-black selection:text-white">
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="absolute -top-32 right-1/4 h-[24rem] w-[24rem] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-[22rem] w-[22rem] rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <header className="relative z-10 w-full border-b border-black/5 bg-white/90 backdrop-blur-md">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-12">
          <Link to="/" className="font-display text-2xl tracking-tight hover:opacity-80 transition-opacity">
            ForgeAI<sup className="text-xs font-sans font-semibold align-super">®</sup>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-xs uppercase tracking-wider text-muted-foreground">
            <Link to="/about" className="hover:text-black transition-colors">About</Link>
            <Link to="/features" className="hover:text-black transition-colors">Features</Link>
            <Link to="/contact" className="hover:text-black transition-colors">Contact us</Link>
            <Link to="/pricing" className="text-black">Pricing</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="rounded-full border border-black px-5 py-3 text-xs font-semibold uppercase tracking-wider transition-all hover:bg-black hover:text-white">
              Login
            </Link>
            <Link to="/register" className="rounded-full bg-black px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white shadow-[0_0_26px_hsl(var(--primary)/0.55)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_38px_hsl(var(--primary)/0.8)]">
              Register
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-24">
        <section className="max-w-4xl">
          <div className="mono text-[10px] uppercase tracking-[0.35em] text-[#6F6F6F] mb-5 flex items-center gap-2">
            <span className="inline-block h-px w-6 bg-[#6F6F6F]/60" />
            Pricing
          </div>
          <h1 className="font-display text-5xl md:text-7xl tracking-tight leading-[0.92]">
            Straightforward plans for every stage of autonomy.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-[#6F6F6F]">
            Choose a plan that matches your team size and rollout ambitions, while keeping the same polished, rounded, glowy interface across the site.
          </p>
        </section>

        <section className="mt-16 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`glass rounded-3xl p-8 border ${plan.accent ? "border-primary/30 shadow-[0_0_40px_hsl(var(--primary)/0.12)]" : "border-black/5"}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mono text-[10px] uppercase tracking-[0.3em] text-[#6F6F6F]">Plan</div>
                  <h2 className="mt-3 font-display text-3xl tracking-tight">{plan.name}</h2>
                </div>
                {plan.accent ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-black px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-[0_0_20px_hsl(var(--primary)/0.45)]">
                    <Sparkles className="h-3 w-3" /> Recommended
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <ShieldCheck className="h-3 w-3" /> Standard
                  </span>
                )}
              </div>

              <div className="mt-6 flex items-end gap-2">
                <div className="font-display text-5xl tracking-tight">{plan.price}</div>
                <div className="pb-1 text-sm text-[#6F6F6F]">/ month</div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-[#6F6F6F]">{plan.desc}</p>

              <ul className="mt-6 space-y-3 text-sm text-[#6F6F6F]">
                {plan.highlights.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-black" />
                    {item}
                  </li>
                ))}
              </ul>

              <Link
                to={plan.name === "Starter" ? "/register" : "/contact"}
                className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-wider transition-all hover:-translate-y-0.5 ${
                  plan.accent
                    ? "bg-black text-white shadow-[0_0_28px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_40px_hsl(var(--primary)/0.8)]"
                    : "border border-black text-black hover:bg-black hover:text-white"
                }`}
              >
                {plan.cta} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </article>
          ))}
        </section>

        <section className="mt-16 glass rounded-3xl p-8 md:p-10 border border-black/5 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mono text-[10px] uppercase tracking-[0.35em] text-[#6F6F6F] mb-4">Next step</div>
            <h2 className="font-display text-3xl md:text-4xl tracking-tight">Ready to see the product in action?</h2>
            <p className="mt-4 text-sm md:text-base leading-relaxed text-[#6F6F6F]">
              Login if you already have an account, or register to start the guided onboarding flow.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/login" className="inline-flex items-center gap-2 rounded-full border border-black px-6 py-3 text-xs font-semibold uppercase tracking-wider transition-all hover:bg-black hover:text-white">
              Login <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link to="/register" className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white shadow-[0_0_26px_hsl(var(--primary)/0.5)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_38px_hsl(var(--primary)/0.8)]">
              <Sparkles className="h-3.5 w-3.5" /> Register
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
