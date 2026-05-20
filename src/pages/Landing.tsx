import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import {
  Sparkles, ArrowRight, Play, ShieldCheck, Zap, GitBranch,
  Activity, Brain, Workflow, Boxes, Terminal, ChevronRight,
} from "lucide-react";
import { ServiceGraph } from "@/components/ServiceGraph";

/* ---------- Cinematic 3D Core (CSS perspective + layered rings) ---------- */
const HoloCore = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center [perspective:1400px]">
      {/* ambient halos */}
      <div className="absolute w-[120%] h-[120%] rounded-full blur-3xl opacity-60"
        style={{ background: "radial-gradient(circle at 50% 50%, hsl(var(--primary)/0.35), transparent 55%)" }} />
      <div className="absolute w-[90%] h-[90%] rounded-full blur-3xl opacity-50"
        style={{ background: "radial-gradient(circle at 60% 40%, hsl(var(--accent)/0.35), transparent 60%)" }} />

      {/* rotating rings (real 3D transforms) */}
      <div className="relative w-[460px] h-[460px] max-w-[90vw] max-h-[90vw] [transform-style:preserve-3d]">
        {[
          { rx: 68, ry: 0, dur: 22, color: "hsl(var(--primary))", w: 1.2 },
          { rx: 68, ry: 60, dur: 30, color: "hsl(var(--accent))", w: 1 },
          { rx: 68, ry: -55, dur: 38, color: "hsl(var(--neon-pink))", w: 0.8 },
          { rx: 20, ry: 80, dur: 26, color: "hsl(var(--primary-glow))", w: 0.6 },
        ].map((r, i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border"
            style={{
              transform: `rotateX(${r.rx}deg) rotateY(${r.ry}deg)`,
              borderColor: r.color,
              borderWidth: r.w,
              boxShadow: `0 0 60px ${r.color}, inset 0 0 40px ${r.color}`,
              opacity: 0.55,
            }}
            animate={{ rotateZ: 360 }}
            transition={{ duration: r.dur, ease: "linear", repeat: Infinity }}
          />
        ))}

        {/* equator dashed */}
        <motion.div
          className="absolute inset-6 rounded-full border-2 border-dashed"
          style={{ borderColor: "hsl(var(--primary)/0.5)", transform: "rotateX(75deg)" }}
          animate={{ rotateZ: -360 }}
          transition={{ duration: 18, ease: "linear", repeat: Infinity }}
        />

        {/* core sphere */}
        <div className="absolute inset-[28%] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, hsl(var(--primary-glow)) 0%, hsl(var(--primary)) 35%, hsl(var(--accent)) 80%, hsl(230 30% 5%) 100%)",
            boxShadow:
              "0 0 80px hsl(var(--primary)/0.7), inset -20px -30px 60px hsl(230 50% 3% / 0.8), inset 10px 15px 30px hsl(var(--primary-glow)/0.6)",
          }}>
          <div className="absolute inset-0 rounded-full mix-blend-overlay opacity-60"
            style={{ background: "conic-gradient(from 0deg, transparent, hsl(var(--accent)/0.6), transparent 40%, hsl(var(--primary)/0.6), transparent)" }} />
        </div>

        {/* orbiting nodes */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full"
            style={{
              background: i % 2 ? "hsl(var(--accent))" : "hsl(var(--primary))",
              boxShadow: `0 0 16px ${i % 2 ? "hsl(var(--accent))" : "hsl(var(--primary))"}`,
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 14 + i * 3, ease: "linear", repeat: Infinity }}
            initial={{ x: -6, y: -6 }}
          >
            <div style={{ transform: `translateX(${180 + i * 6}px)` }} className="w-3 h-3 rounded-full bg-inherit" />
          </motion.div>
        ))}

        {/* HUD ticks */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          {Array.from({ length: 60 }).map((_, i) => {
            const a = (i / 60) * Math.PI * 2;
            const x1 = 50 + Math.cos(a) * 49;
            const y1 = 50 + Math.sin(a) * 49;
            const x2 = 50 + Math.cos(a) * (i % 5 === 0 ? 46 : 47.5);
            const y2 = 50 + Math.sin(a) * (i % 5 === 0 ? 46 : 47.5);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--primary)/0.5)" strokeWidth="0.2" vectorEffect="non-scaling-stroke" />;
          })}
        </svg>
      </div>

      {/* floating data chips */}
      {[
        { t: "agent.devops", v: "deploying", c: "primary", x: "-8%", y: "10%" },
        { t: "incident.api", v: "auto-resolved 18s", c: "neon-green", x: "82%", y: "16%" },
        { t: "qa.suite #4821", v: "passed 1,204/1,204", c: "accent", x: "-12%", y: "70%" },
        { t: "cost.optimizer", v: "-$2,140/day", c: "neon-amber", x: "78%", y: "74%" },
      ].map((chip, i) => (
        <motion.div
          key={i}
          className="absolute glass rounded-lg px-3 py-2 mono text-[10px] whitespace-nowrap hidden md:block"
          style={{ left: chip.x, top: chip.y }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: [0, -6, 0] }}
          transition={{ delay: 0.4 + i * 0.15, y: { duration: 4 + i, repeat: Infinity, ease: "easeInOut" } }}
        >
          <div className="text-muted-foreground uppercase tracking-widest text-[9px]">{chip.t}</div>
          <div className={`text-${chip.c} font-semibold`} style={{ color: `hsl(var(--${chip.c}))` }}>{chip.v}</div>
        </motion.div>
      ))}
    </div>
  );
};

/* ---------- Section helpers ---------- */
const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <div className="mono text-[10px] uppercase tracking-[0.3em] text-primary inline-flex items-center gap-2">
    <span className="inline-block w-6 h-px bg-primary" /> {children}
  </div>
);

/* ---------- The Landing Page ---------- */
const Landing = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0.2]);

  return (
    <div className="min-h-screen w-full bg-background text-foreground overflow-x-hidden">
      {/* NAV */}
      <header className="fixed top-0 inset-x-0 z-50">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_24px_hsl(var(--primary)/0.6)]">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="font-display font-bold text-lg tracking-tight">ForgeAI</div>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#platform" className="hover:text-foreground transition">Platform</a>
            <a href="#agents" className="hover:text-foreground transition">Agents</a>
            <a href="#workflow" className="hover:text-foreground transition">Workflow</a>
            <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-foreground px-3 py-2">Sign in</Link>
            <Link to="/app" className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-md bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.5)] hover:opacity-90 transition">
              Launch console <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section ref={ref} className="relative pt-32 pb-24 md:pt-40 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute inset-x-0 top-0 h-[80vh] bg-gradient-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(var(--accent)/0.6), transparent 60%)" }} />

        <div className="relative mx-auto max-w-7xl px-6 grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
          <motion.div style={{ y: heroY, opacity: heroOpacity }}>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Eyebrow>v4.2 · now with autonomous incident response</Eyebrow>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.7 }}
              className="font-display font-bold mt-5 text-5xl md:text-7xl leading-[0.95] tracking-tight">
              The autonomous{" "}
              <span className="gradient-text">operating system</span>{" "}
              for software production.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7 }}
              className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
              Six AI agents ship, monitor, heal and optimize your stack — 24/7. Replace toil with
              orchestration. Operate <span className="text-foreground">above</span> the system, not inside it.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
              className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/onboarding" className="group inline-flex items-center gap-2 px-5 py-3 rounded-md bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium shadow-[0_0_40px_hsl(var(--primary)/0.45)] hover:shadow-[0_0_60px_hsl(var(--primary)/0.7)] transition">
                Start orchestrating <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition" />
              </Link>
              <Link to="/app" className="group inline-flex items-center gap-2 px-5 py-3 rounded-md border border-border glass hover:border-primary/40 transition">
                <Play className="h-4 w-4 text-primary" /> Watch live demo
              </Link>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
              className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 mono text-[11px] uppercase tracking-widest text-muted-foreground">
              <span className="flex items-center gap-2"><span className="status-dot bg-neon-green text-neon-green" /> 99.998% uptime</span>
              <span className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> SOC2 · ISO 27001</span>
              <span className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-accent" /> 1.2M deploys / day</span>
            </motion.div>
          </motion.div>

          {/* 3D Core */}
          <div className="relative h-[520px] md:h-[600px]">
            <HoloCore />
          </div>
        </div>

        {/* logo strip */}
        <div className="relative mx-auto max-w-7xl px-6 mt-16">
          <div className="text-center mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-5">
            Trusted by teams operating planet-scale systems
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 opacity-60">
            {["NEBULA", "AXIOM", "HELIOS", "VANTA", "MERIDIAN", "PARALLAX", "QUANTUM"].map(n => (
              <div key={n} className="mono text-sm tracking-[0.25em] text-foreground/70">{n}</div>
            ))}
          </div>
        </div>
      </section>

      {/* LIVE PREVIEW */}
      <section id="platform" className="relative py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-[1fr_1.4fr] gap-10 items-center">
            <div>
              <Eyebrow>Live mission control</Eyebrow>
              <h2 className="font-display text-4xl md:text-5xl font-bold mt-4 tracking-tight">
                Your entire stack, <span className="gradient-text">one cinematic console.</span>
              </h2>
              <p className="text-muted-foreground mt-5 leading-relaxed">
                Watch services breathe in real time. Trace failures across boundaries. Approve agent
                actions with a single keystroke. Built for operators who think in systems, not tickets.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  "Animated dependency graph with health heat",
                  "⌘K command palette over every action",
                  "Replayable agent decision traces",
                  "Glassmorphic incident war-room",
                ].map(i => (
                  <li key={i} className="flex items-center gap-2 text-foreground/80">
                    <ChevronRight className="h-4 w-4 text-primary" /> {i}
                  </li>
                ))}
              </ul>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 30, rotateX: 10 }} whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.8 }}
              className="relative glass glow-border rounded-2xl p-4 shadow-[0_30px_120px_-20px_hsl(var(--primary)/0.5)]"
              style={{ transformStyle: "preserve-3d" }}>
              <div className="flex items-center gap-2 px-2 pb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-neon-red" />
                <span className="w-2.5 h-2.5 rounded-full bg-neon-amber" />
                <span className="w-2.5 h-2.5 rounded-full bg-neon-green" />
                <div className="ml-3 mono text-[10px] uppercase tracking-widest text-muted-foreground">forge://prod/topology</div>
              </div>
              <div className="rounded-xl bg-background/60 border border-border overflow-hidden">
                <ServiceGraph height={420} />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* AGENTS */}
      <section id="agents" className="relative py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-2xl mx-auto">
            <Eyebrow>The crew</Eyebrow>
            <h2 className="font-display text-4xl md:text-5xl font-bold mt-4 tracking-tight">
              Six specialized agents. <span className="gradient-text">One relentless team.</span>
            </h2>
            <p className="text-muted-foreground mt-4">
              Each agent owns a domain, reasons with full context, and collaborates through a shared
              memory graph. You set intent — they negotiate execution.
            </p>
          </div>

          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { i: Brain, n: "Architect", d: "Designs services, picks patterns, justifies trade-offs.", c: "primary" },
              { i: GitBranch, n: "DevOps", d: "Owns CI/CD, deploys with canaries, auto-rolls back.", c: "accent" },
              { i: ShieldCheck, n: "Sentinel", d: "Detects, triages and contains incidents in seconds.", c: "neon-pink" },
              { i: Activity, n: "Observer", d: "Watches metrics, traces anomalies, surfaces RCA.", c: "neon-green" },
              { i: Workflow, n: "Conductor", d: "Plans cross-team workflows from a single intent.", c: "neon-amber" },
              { i: Boxes, n: "Optimizer", d: "Trims cost, rightsizes infra, kills waste nightly.", c: "primary" },
            ].map((a, i) => (
              <motion.div key={a.n}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                className="group relative glass rounded-2xl p-6 hover:border-primary/40 transition overflow-hidden">
                <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl opacity-40 group-hover:opacity-70 transition"
                  style={{ background: `hsl(var(--${a.c})/0.5)` }} />
                <div className="relative">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center border border-border bg-background/60"
                    style={{ boxShadow: `0 0 24px hsl(var(--${a.c})/0.4)` }}>
                    <a.i className="h-5 w-5" style={{ color: `hsl(var(--${a.c}))` }} />
                  </div>
                  <div className="mt-4 font-display text-xl font-semibold">{a.n}</div>
                  <p className="text-sm text-muted-foreground mt-1.5">{a.d}</p>
                  <div className="mt-4 mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <span className="status-dot" style={{ color: `hsl(var(--${a.c}))`, background: `hsl(var(--${a.c}))` }} /> online · confidence 0.9{i + 1}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* QUOTE / MSG */}
      <section className="relative py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <Eyebrow>From operators</Eyebrow>
          <blockquote className="font-display text-3xl md:text-4xl font-semibold mt-6 leading-snug tracking-tight">
            “ForgeAI replaced our pager rotation, our deploy review, and 80% of our incident
            channel noise. <span className="gradient-text">We sleep now.</span>”
          </blockquote>
          <div className="mt-6 mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Lin Wei · Head of Platform · Meridian Systems
          </div>
        </div>
      </section>

      {/* WORKFLOW STRIP */}
      <section id="workflow" className="relative py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-2xl mx-auto">
            <Eyebrow>How it operates</Eyebrow>
            <h2 className="font-display text-4xl md:text-5xl font-bold mt-4 tracking-tight">
              Intent in. <span className="gradient-text">Production out.</span>
            </h2>
          </div>
          <div className="mt-14 grid md:grid-cols-4 gap-4">
            {[
              { n: "01", t: "Declare intent", d: "Speak the outcome. Plain language or YAML." },
              { n: "02", t: "Agents plan", d: "The Conductor decomposes work across the crew." },
              { n: "03", t: "Autonomous build", d: "Code, infra, tests and rollout — orchestrated." },
              { n: "04", t: "Self-heal & learn", d: "Sentinel patches, Observer rewires the graph." },
            ].map((s) => (
              <div key={s.n} className="relative glass rounded-2xl p-6">
                <div className="mono text-[10px] uppercase tracking-[0.3em] text-primary">{s.n}</div>
                <div className="mt-3 font-display text-xl font-semibold">{s.t}</div>
                <p className="text-sm text-muted-foreground mt-2">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TERMINAL FEEL */}
      <section className="relative py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="glass rounded-2xl overflow-hidden border border-border shadow-[0_30px_100px_-30px_hsl(var(--accent)/0.5)]">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-background/60">
              <Terminal className="h-3.5 w-3.5 text-primary" />
              <div className="mono text-[11px] text-muted-foreground">forge ~ agent stream</div>
            </div>
            <div className="p-6 mono text-[12px] leading-relaxed">
              {[
                ["12:04:18", "conductor", "intent received: ‘ship checkout v3 to EU, zero downtime’"],
                ["12:04:19", "architect", "topology plan accepted · 3 services impacted"],
                ["12:04:22", "devops", "canary 5% → eu-west-2 · health green"],
                ["12:05:01", "observer", "p99 latency -12ms vs baseline"],
                ["12:05:14", "sentinel", "no anomalies · ramp to 100%"],
                ["12:05:30", "optimizer", "scaled down 4 idle pods · saving $214/day"],
              ].map(([t, a, m], i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className="flex gap-3">
                  <span className="text-muted-foreground">{t}</span>
                  <span className="text-primary">[{a}]</span>
                  <span className="text-foreground/85">{m}</span>
                </motion.div>
              ))}
              <div className="flex gap-3 mt-2">
                <span className="text-accent">▌</span>
                <span className="text-muted-foreground">awaiting intent…</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section id="pricing" className="relative py-28">
        <div className="mx-auto max-w-5xl px-6">
          <div className="relative glass glow-border rounded-3xl p-12 md:p-16 text-center overflow-hidden">
            <div className="absolute inset-0 opacity-50 pointer-events-none"
              style={{ background: "radial-gradient(circle at 50% 0%, hsl(var(--primary)/0.4), transparent 60%)" }} />
            <div className="absolute inset-x-0 -bottom-32 h-64 blur-3xl opacity-40 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at 50% 50%, hsl(var(--accent)/0.6), transparent 60%)" }} />
            <div className="relative">
              <Eyebrow>Ready when you are</Eyebrow>
              <h2 className="font-display text-4xl md:text-6xl font-bold mt-5 tracking-tight">
                Stop operating. <span className="gradient-text">Start commanding.</span>
              </h2>
              <p className="text-muted-foreground mt-5 max-w-xl mx-auto">
                Spin up the console in 90 seconds. Free for 14 days. No card. No agent left behind.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link to="/onboarding" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-md bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium shadow-[0_0_60px_hsl(var(--primary)/0.6)] hover:opacity-90 transition">
                  Deploy ForgeAI <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/app" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-md border border-border glass hover:border-primary/40 transition">
                  Tour the console
                </Link>
              </div>
              <div className="mt-8 mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                90s setup · no card · cancel any orbit
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/60 py-10 mt-10">
        <div className="mx-auto max-w-7xl px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <div className="mono text-[11px] uppercase tracking-widest text-muted-foreground">ForgeAI · production OS</div>
          </div>
          <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
            © 2026 · built for operators
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
