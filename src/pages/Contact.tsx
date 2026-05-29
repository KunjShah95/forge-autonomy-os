import { Link } from "react-router-dom";
import { Mail, MessageCircle, Phone, Sparkles, ArrowRight } from "lucide-react";

const channels = [
  {
    icon: Mail,
    title: "Email",
    value: "hello@forge.ai",
    desc: "For partnerships, product questions, and platform access requests.",
  },
  {
    icon: MessageCircle,
    title: "Support",
    value: "#forge-support",
    desc: "For onboarding help, product issues, and account troubleshooting.",
  },
  {
    icon: Phone,
    title: "Enterprise",
    value: "+1 (555) 014-4422",
    desc: "For security reviews, pilots, and rollout planning with your team.",
  },
];

export default function Contact() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-black selection:text-white">
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="absolute -top-32 left-1/4 h-[24rem] w-[24rem] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 h-[22rem] w-[22rem] rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <header className="relative z-10 w-full border-b border-black/5 bg-white/90 backdrop-blur-md">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-12">
          <Link to="/" className="font-display text-2xl tracking-tight hover:opacity-80 transition-opacity">
            ForgeAI<sup className="text-xs font-sans font-semibold align-super">®</sup>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-xs uppercase tracking-wider text-muted-foreground">
            <Link to="/about" className="hover:text-black transition-colors">About</Link>
            <Link to="/features" className="hover:text-black transition-colors">Features</Link>
            <Link to="/contact" className="text-black">Contact us</Link>
            <Link to="/pricing" className="hover:text-black transition-colors">Pricing</Link>
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
            Contact us
          </div>
          <h1 className="font-display text-5xl md:text-7xl tracking-tight leading-[0.92]">
            Talk to the team behind the autonomous operating system.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-[#6F6F6F]">
            Reach out for product questions, enterprise access, or help getting your first autonomous workflow online. The same polished design language carries through the entire experience.
          </p>
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-3">
          {channels.map((channel) => {
            const Icon = channel.icon;
            return (
              <article key={channel.title} className="glass rounded-3xl p-6 border border-black/5 shadow-[0_0_40px_hsl(var(--primary)/0.06)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white shadow-[0_0_24px_hsl(var(--primary)/0.35)]">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-5 font-display text-2xl tracking-tight">{channel.title}</h2>
                <div className="mt-2 text-sm font-medium text-black">{channel.value}</div>
                <p className="mt-3 text-sm leading-relaxed text-[#6F6F6F]">{channel.desc}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <aside className="glass rounded-3xl p-8 border border-black/5">
            <div className="mono text-[10px] uppercase tracking-[0.35em] text-[#6F6F6F] mb-4">Fast path</div>
            <h2 className="font-display text-3xl tracking-tight">Need a quicker route?</h2>
            <p className="mt-4 text-sm leading-relaxed text-[#6F6F6F]">
              Register an account, then jump directly into onboarding and the live dashboard. It’s the fastest way to see the system in motion.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white shadow-[0_0_26px_hsl(var(--primary)/0.5)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_38px_hsl(var(--primary)/0.8)]">
                <Sparkles className="h-3.5 w-3.5" /> Register now
              </Link>
              <Link to="/features" className="inline-flex items-center gap-2 rounded-full border border-black px-6 py-3 text-xs font-semibold uppercase tracking-wider transition-all hover:bg-black hover:text-white">
                View features <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </aside>

          <form className="glass rounded-3xl p-8 border border-black/5">
            <div className="mono text-[10px] uppercase tracking-[0.35em] text-[#6F6F6F] mb-4">Send a message</div>
            <div className="grid gap-4">
              <div>
                <label className="mono text-[10px] uppercase tracking-widest text-muted-foreground">Name</label>
                <input className="mt-1 w-full rounded-full border border-black/10 bg-black/[0.03] px-4 py-3 text-sm outline-none transition focus:border-primary/50" placeholder="Your name" />
              </div>
              <div>
                <label className="mono text-[10px] uppercase tracking-widest text-muted-foreground">Email</label>
                <input className="mt-1 w-full rounded-full border border-black/10 bg-black/[0.03] px-4 py-3 text-sm outline-none transition focus:border-primary/50" placeholder="you@company.com" />
              </div>
              <div>
                <label className="mono text-[10px] uppercase tracking-widest text-muted-foreground">Message</label>
                <textarea rows={5} className="mt-1 w-full rounded-3xl border border-black/10 bg-black/[0.03] px-4 py-3 text-sm outline-none transition focus:border-primary/50" placeholder="Tell us what you’re building..." />
              </div>
              <button type="submit" className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-primary to-accent px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_0_34px_hsl(var(--primary)/0.45)] transition-all hover:-translate-y-0.5 hover:opacity-95">
                Send message
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
