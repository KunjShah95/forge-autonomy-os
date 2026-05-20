import { Link } from "react-router-dom";
import {
  motion, useScroll, useTransform, useSpring, useMotionValue, useMotionTemplate,
} from "framer-motion";
import { useEffect, useRef } from "react";
import {
  Sparkles, ArrowRight, ShieldCheck, GitBranch, Activity, Brain,
  Workflow, Boxes, Terminal, ChevronRight, Bot, Cloud, Check,
} from "lucide-react";
import { ServiceGraph } from "@/components/ServiceGraph";

/* ============================================================
   HoloCore — a quieter, more deliberate 3D centerpiece.
   Two concentric wireframe rings, a slow sphere, parallax on
   pointer. No flashing chips, no neon spam.
   ============================================================ */
const HoloCore = () => {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 80, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-12, 12]), { stiffness: 80, damping: 18 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = ref.current; if (!el) return;
      const r = el.getBoundingClientRect();
      mx.set((e.clientX - r.left) / r.width - 0.5);
      my.set((e.clientY - r.top) / r.height - 0.5);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [mx, my]);

  const transform = useMotionTemplate`rotateX(${rx}deg) rotateY(${ry}deg)`;

  return (
    <div ref={ref} className="relative w-full h-full flex items-center justify-center [perspective:1600px]">
      {/* ambient — one soft halo, not three */}
      <div className="absolute inset-0 rounded-full blur-3xl opacity-50 pointer-events-none"
        style={{ background: "radial-gradient(circle at 50% 45%, hsl(var(--primary)/0.25), transparent 55%)" }} />

      <motion.div
        className="relative w-[440px] h-[440px] max-w-[88vw] max-h-[88vw] [transform-style:preserve-3d]"
        style={{ transform }}
      >
        {/* sphere */}
        <div className="absolute inset-[30%] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 32% 28%, hsl(210 30% 96%/0.85), hsl(var(--primary)/0.9) 30%, hsl(var(--accent)/0.7) 70%, hsl(230 40% 4%) 100%)",
            boxShadow:
              "inset -24px -32px 60px hsl(230 50% 3% / 0.85), inset 14px 18px 36px hsl(var(--primary-glow)/0.5), 0 0 90px hsl(var(--primary)/0.35)",
          }}
        />

        {/* two clean rings, slow rotation */}
        <motion.div
          className="absolute inset-0 rounded-full border"
          style={{ transform: "rotateX(72deg)", borderColor: "hsl(var(--primary)/0.55)", borderWidth: 1 }}
          animate={{ rotateZ: 360 }} transition={{ duration: 60, ease: "linear", repeat: Infinity }}
        />
        <motion.div
          className="absolute inset-4 rounded-full border"
          style={{ transform: "rotateX(72deg) rotateY(34deg)", borderColor: "hsl(var(--accent)/0.4)", borderWidth: 1 }}
          animate={{ rotateZ: -360 }} transition={{ duration: 80, ease: "linear", repeat: Infinity }}
        />

        {/* a single tracked node on each ring */}
        <motion.div
          className="absolute top-1/2 left-1/2"
          style={{ transform: "rotateX(72deg)" }}
          animate={{ rotateZ: 360 }} transition={{ duration: 60, ease: "linear", repeat: Infinity }}
        >
          <div style={{ transform: "translateX(220px) translateY(-3px)" }}
            className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />
        </motion.div>
        <motion.div
          className="absolute top-1/2 left-1/2"
          style={{ transform: "rotateX(72deg) rotateY(34deg)" }}
          animate={{ rotateZ: -360 }} transition={{ duration: 80, ease: "linear", repeat: Infinity }}
        >
          <div style={{ transform: "translateX(216px) translateY(-3px)" }}
            className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_12px_hsl(var(--accent))]" />
        </motion.div>

        {/* precision ticks — subtle */}
        <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 100 100">
          {Array.from({ length: 48 }).map((_, i) => {
            const a = (i / 48) * Math.PI * 2;
            const x1 = 50 + Math.cos(a) * 49.6;
            const y1 = 50 + Math.sin(a) * 49.6;
            const long = i % 6 === 0;
            const x2 = 50 + Math.cos(a) * (long ? 47.2 : 48.4);
            const y2 = 50 + Math.sin(a) * (long ? 47.2 : 48.4);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="hsl(var(--foreground)/0.5)" strokeWidth="0.15" vectorEffect="non-scaling-stroke" />;
          })}
        </svg>
      </motion.div>

      {/* coordinate readout — informational, not decorative */}
      <div className="absolute bottom-4 left-4 mono text-[10px] text-muted-foreground tracking-wider">
        prod-us-east-1 · 14 services · 6 agents
      </div>
      <div className="absolute top-4 right-4 mono text-[10px] text-muted-foreground tracking-wider flex items-center gap-2">
        <span className="status-dot bg-neon-green text-neon-green" /> nominal
      </div>
    </div>
  );
};

/* ---------- small primitives ---------- */
const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <div className="mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground inline-flex items-center gap-2">
    <span className="inline-block w-6 h-px bg-primary/60" />
    <span className="text-foreground/80">{children}</span>
  </div>
);

/* Reveal — drives fade/translate from this section's own scroll progress.
   That makes each section feel like a small camera move, not a global fade. */
const Reveal = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-15% 0px -10% 0px" }}
    transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

/* ============================================================
   Landing
   ============================================================ */
const Landing = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroP } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(heroP, [0, 1], [0, -80]);
  const heroBlur = useTransform(heroP, [0, 1], [0, 6]);
  const heroFilter = useMotionTemplate`blur(${heroBlur}px)`;
  const heroOpacity = useTransform(heroP, [0, 0.7], [1, 0]);
  const coreScale = useTransform(heroP, [0, 1], [1, 0.92]);
  const coreY = useTransform(heroP, [0, 1], [0, -40]);

  /* page-level vignette that brightens slightly as you scroll — subtle "camera iris" */
  const { scrollYProgress: pageP } = useScroll();
  const vignette = useTransform(pageP, [0, 0.5, 1], [0.55, 0.35, 0.55]);

  return (
    <div className="min-h-screen w-full bg-background text-foreground overflow-x-hidden relative">
      {/* global cinematic vignette */}
      <motion.div
        className="pointer-events-none fixed inset-0 z-[1]"
        style={{
          opacity: vignette,
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 40%, hsl(230 40% 2%) 100%)",
        }}
      />

      {/* NAV */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-background/40 border-b border-border/40">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <div className="font-display font-semibold tracking-tight">ForgeAI</div>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#platform" className="hover:text-foreground transition">Platform</a>
            <a href="#agents" className="hover:text-foreground transition">Agents</a>
            <a href="#flow" className="hover:text-foreground transition">How it works</a>
            <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-foreground px-3 py-2">Sign in</Link>
            <Link to="/onboarding" className="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-1.5 rounded-md border border-primary/40 text-foreground hover:bg-primary/10 transition">
              Start setup <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ============= HERO ============= */}
      <section ref={heroRef} className="relative pt-32 pb-28 md:pt-40 md:pb-36">
        <div className="absolute inset-0 bg-grid opacity-[0.18]" />
        <div className="absolute inset-x-0 top-0 h-[60vh] pointer-events-none"
          style={{ background: "linear-gradient(180deg, hsl(var(--primary)/0.07), transparent)" }} />

        <div className="relative mx-auto max-w-7xl px-6 grid lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
          <motion.div style={{ y: heroY, opacity: heroOpacity, filter: heroFilter }}>
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <Eyebrow>Production OS · v4.2</Eyebrow>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="font-display font-semibold mt-5 text-[2.75rem] md:text-6xl leading-[1.02] tracking-[-0.025em]"
            >
              Run your production
              <br />
              <span className="text-foreground/55">with an operator,</span>
              <br />
              <span className="gradient-text">not a checklist.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.25 }}
              className="mt-6 text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed"
            >
              ForgeAI connects to your repos and cloud, then deploys six specialized agents that
              ship, watch and heal your stack. You set intent. They handle the rest.
            </motion.p>

            {/* CTA aligned with onboarding */}
            <motion.div
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.4 }}
              className="mt-9"
            >
              <Link
                to="/onboarding"
                className="group inline-flex items-center gap-2.5 pl-5 pr-3 py-3 rounded-md bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium shadow-[0_0_40px_hsl(var(--primary)/0.35)] hover:shadow-[0_0_60px_hsl(var(--primary)/0.55)] transition"
              >
                Start setup — 4 steps, ~90s
                <span className="inline-flex items-center justify-center h-7 w-7 rounded bg-background/20">
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition" />
                </span>
              </Link>

              {/* what happens after click — explicit, not vague */}
              <ol className="mt-5 grid sm:grid-cols-2 gap-x-6 gap-y-1.5 mono text-[11px] text-muted-foreground max-w-lg">
                {[
                  "01 · Sign in with GitHub or email",
                  "02 · Connect repos — we scan ownership",
                  "03 · Pick which agents go on duty",
                  "04 · Console opens, agents come online",
                ].map((s) => (
                  <li key={s} className="flex items-center gap-2">
                    <span className="text-primary/70">›</span>{s}
                  </li>
                ))}
              </ol>

              <div className="mt-6 flex items-center gap-4">
                <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
                  Skip · view a live demo console <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.div>
          </motion.div>

          <motion.div style={{ scale: coreScale, y: coreY }} className="relative h-[520px] md:h-[600px]">
            <HoloCore />
          </motion.div>
        </div>

        {/* logo strip */}
        <Reveal className="relative mx-auto max-w-6xl px-6 mt-20" delay={0.1}>
          <div className="text-center mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70 mb-5">
            Operating production at
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-3 opacity-60">
            {["NEBULA", "AXIOM", "HELIOS", "VANTA", "MERIDIAN", "PARALLAX"].map((n) => (
              <div key={n} className="mono text-xs tracking-[0.3em] text-foreground/70">{n}</div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ============= PLATFORM ============= */}
      <PlatformSection />

      {/* ============= AGENTS ============= */}
      <section id="agents" className="relative py-28">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal className="max-w-2xl">
            <Eyebrow>The crew</Eyebrow>
            <h2 className="font-display text-4xl md:text-5xl font-semibold mt-4 tracking-[-0.02em] leading-[1.05]">
              Six agents. <span className="text-foreground/55">Six clear responsibilities.</span>
            </h2>
            <p className="text-muted-foreground mt-4">
              Each agent owns a domain and operates under explicit policy. Toggle who's on duty in
              the onboarding flow — turn them off any time from the console.
            </p>
          </Reveal>

          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border/60 rounded-2xl overflow-hidden border border-border">
            {[
              { i: Brain, n: "Architect", d: "Designs services and justifies trade-offs in writing." },
              { i: GitBranch, n: "DevOps", d: "Owns CI/CD, canaries deploys, auto-rolls back on regression." },
              { i: ShieldCheck, n: "Sentinel", d: "Detects, triages and contains incidents inside SLO." },
              { i: Activity, n: "Observer", d: "Watches metrics, traces anomalies, surfaces root cause." },
              { i: Workflow, n: "Conductor", d: "Plans cross-team workflows from a single declared intent." },
              { i: Boxes, n: "Optimizer", d: "Rightsizes infra, removes idle capacity, reports savings." },
            ].map((a, i) => (
              <motion.div
                key={a.n}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ delay: i * 0.05, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="group relative bg-card p-7 hover:bg-card/60 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md border border-border bg-background/60 flex items-center justify-center">
                    <a.i className="h-4 w-4 text-primary" />
                  </div>
                  <div className="font-display text-lg font-semibold">{a.n}</div>
                </div>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{a.d}</p>
                <div className="mt-5 mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                  <span className="status-dot bg-neon-green text-neon-green" /> policy v{i + 1}.0
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============= QUOTE ============= */}
      <QuoteSection />

      {/* ============= FLOW ============= */}
      <section id="flow" className="relative py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal className="max-w-2xl">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="font-display text-4xl md:text-5xl font-semibold mt-4 tracking-[-0.02em] leading-[1.05]">
              Intent in. <span className="text-foreground/55">Production out.</span>
            </h2>
          </Reveal>

          <div className="mt-14 grid md:grid-cols-4 gap-4">
            {[
              { i: Sparkles, n: "01", t: "Declare intent", d: "Plain language or YAML — describe the outcome you want." },
              { i: Bot,      n: "02", t: "Agents plan",    d: "The Conductor decomposes work across the crew with full context." },
              { i: Cloud,    n: "03", t: "Autonomous build", d: "Code, infra, tests and rollout — orchestrated end to end." },
              { i: Check,    n: "04", t: "Self-heal",      d: "Sentinel patches regressions. Observer rewires the graph." },
            ].map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ delay: i * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="relative rounded-xl border border-border bg-card/40 p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="mono text-[10px] uppercase tracking-[0.3em] text-primary">{s.n}</div>
                  <s.i className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-4 font-display text-lg font-semibold">{s.t}</div>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{s.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============= TERMINAL ============= */}
      <TerminalSection />

      {/* ============= FINAL CTA ============= */}
      <section id="pricing" className="relative py-32">
        <div className="mx-auto max-w-4xl px-6">
          <Reveal>
            <div className="relative rounded-3xl border border-border bg-card/40 p-12 md:p-16 text-center overflow-hidden">
              <div className="absolute inset-0 opacity-50 pointer-events-none"
                style={{ background: "radial-gradient(circle at 50% 0%, hsl(var(--primary)/0.25), transparent 60%)" }} />
              <div className="relative">
                <Eyebrow>Ready when you are</Eyebrow>
                <h2 className="font-display text-4xl md:text-5xl font-semibold mt-5 tracking-[-0.02em] leading-[1.05]">
                  Setup takes <span className="gradient-text">about ninety seconds.</span>
                </h2>
                <p className="text-muted-foreground mt-5 max-w-lg mx-auto">
                  Free for 14 days. No credit card. You'll be in the console before your coffee cools.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Link to="/onboarding" className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium shadow-[0_0_40px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_60px_hsl(var(--primary)/0.6)] transition">
                    Start setup <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link to="/app" className="inline-flex items-center gap-2 px-5 py-3 rounded-md border border-border hover:border-primary/40 transition">
                    Tour the console
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto max-w-7xl px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-primary-foreground" />
            </div>
            <div className="mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">ForgeAI · production OS</div>
          </div>
          <div className="mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            © 2026
          </div>
        </div>
      </footer>
    </div>
  );
};

/* ---------- Platform section with its own scroll camera ---------- */
const PlatformSection = () => {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.96, 1, 0.98]);
  const rotate = useTransform(scrollYProgress, [0, 1], [4, -4]);
  return (
    <section id="platform" ref={ref} className="relative py-28">
      <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-[1fr_1.35fr] gap-12 items-center">
        <Reveal>
          <Eyebrow>Live mission control</Eyebrow>
          <h2 className="font-display text-4xl md:text-5xl font-semibold mt-4 tracking-[-0.02em] leading-[1.05]">
            Your entire stack,
            <br/>
            <span className="text-foreground/55">one console.</span>
          </h2>
          <p className="text-muted-foreground mt-5 leading-relaxed max-w-md">
            Services breathe in real time. Failures trace across boundaries. Agent actions wait for
            a single keystroke. Built for operators who think in systems.
          </p>
          <ul className="mt-7 space-y-3 text-sm">
            {[
              "Animated dependency graph with health signal",
              "⌘K command palette over every action",
              "Replayable agent decision traces",
              "Incident war-room with shared cursor",
            ].map((i) => (
              <li key={i} className="flex items-center gap-2.5 text-foreground/80">
                <span className="h-1 w-1 rounded-full bg-primary" /> {i}
              </li>
            ))}
          </ul>
        </Reveal>

        <motion.div
          style={{ y, scale, rotateX: rotate, transformPerspective: 1200 }}
          className="relative rounded-2xl border border-border bg-card/40 backdrop-blur p-3 shadow-[0_40px_120px_-30px_hsl(var(--primary)/0.4)]"
        >
          <div className="flex items-center gap-2 px-2 pb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-neon-red/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-neon-amber/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-neon-green/80" />
            <div className="ml-3 mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">forge://prod/topology</div>
          </div>
          <div className="rounded-xl bg-background/60 border border-border overflow-hidden">
            <ServiceGraph height={420} />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

/* ---------- Quote with letter-by-letter reveal driven by scroll ---------- */
const QuoteSection = () => {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 50%"] });
  const text = "We replaced the pager rotation, the deploy review, and most of the incident channel. Now we operate above the system.";
  const words = text.split(" ");
  return (
    <section ref={ref} className="relative py-28">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <Reveal><Eyebrow>From operators</Eyebrow></Reveal>
        <p className="font-display text-2xl md:text-[2.25rem] font-medium mt-6 leading-[1.25] tracking-[-0.015em]">
          {words.map((w, i) => {
            const start = i / words.length;
            const end = (i + 1) / words.length;
            const o = useTransform(scrollYProgress, [start, end], [0.18, 1]);
            return (
              <motion.span key={i} style={{ opacity: o }} className="inline-block mr-[0.25em]">
                {w}
              </motion.span>
            );
          })}
        </p>
        <Reveal delay={0.2}>
          <div className="mt-8 mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Lin Wei · Head of Platform · Meridian
          </div>
        </Reveal>
      </div>
    </section>
  );
};

/* ---------- Terminal with timed line reveal driven by scroll ---------- */
const TerminalSection = () => {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 90%", "end 60%"] });
  const lines: [string, string, string][] = [
    ["12:04:18", "conductor", "intent received — ship checkout v3 to EU, zero downtime"],
    ["12:04:19", "architect", "topology plan accepted · 3 services impacted"],
    ["12:04:22", "devops",    "canary 5% → eu-west-2 · health green"],
    ["12:05:01", "observer",  "p99 latency -12ms vs baseline"],
    ["12:05:14", "sentinel",  "no anomalies · ramping to 100%"],
    ["12:05:30", "optimizer", "scaled down 4 idle pods · -$214/day"],
  ];
  return (
    <section ref={ref} className="relative py-24">
      <div className="mx-auto max-w-4xl px-6">
        <Reveal>
          <div className="rounded-2xl overflow-hidden border border-border bg-card/40 backdrop-blur shadow-[0_30px_100px_-30px_hsl(var(--accent)/0.35)]">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-background/40">
              <Terminal className="h-3.5 w-3.5 text-primary" />
              <div className="mono text-[11px] text-muted-foreground">forge ~ agent stream</div>
              <div className="ml-auto mono text-[10px] text-muted-foreground">live</div>
            </div>
            <div className="p-6 mono text-[12px] leading-relaxed">
              {lines.map(([t, a, m], i) => {
                const start = i / lines.length * 0.8;
                const o = useTransform(scrollYProgress, [start, start + 0.12], [0, 1]);
                const x = useTransform(scrollYProgress, [start, start + 0.12], [-8, 0]);
                return (
                  <motion.div key={i} style={{ opacity: o, x }} className="flex gap-3">
                    <span className="text-muted-foreground">{t}</span>
                    <span className="text-primary">[{a}]</span>
                    <span className="text-foreground/85">{m}</span>
                  </motion.div>
                );
              })}
              <div className="flex gap-3 mt-2">
                <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.4, repeat: Infinity }} className="text-accent">▌</motion.span>
                <span className="text-muted-foreground">awaiting intent…</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default Landing;
