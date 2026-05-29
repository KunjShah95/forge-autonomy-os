import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { 
  Bot, 
  Activity, 
  ShieldAlert, 
  Network, 
  Cog, 
  Briefcase, 
  ArrowRight, 
  Check, 
  Lock, 
  Play, 
  RefreshCw, 
  Terminal, 
  ArrowUpRight, 
  ShieldCheck, 
  Layers, 
  GitBranch, 
  Cpu, 
  ChevronRight,
  Menu,
  X
} from "lucide-react";

// Agent definitions matching mock.ts exactly
const agentsData = [
  { id: "sre", name: "SRE Agent", role: "Reliability", icon: Activity, color: "border-[#D97706]/40 text-[#D97706] bg-[#D97706]/5", status: "watching", confidence: 93, mttr: "1m", desc: "Watches SLOs, handles anomaly detection, and triggers automatic rollbacks.", logs: ["LOG-041: anomaly detected in billing-svc p99 latency", "LOG-042: triggering safe deployment auto-rollback", "LOG-043: traffic shifted to stable replica set (v1.21.9)"] },
  { id: "devops", name: "DevOps Agent", role: "Pipelines & Infra", icon: Cog, color: "border-black/40 text-black bg-black/5", status: "active", confidence: 91, mttr: "3m", desc: "Manages CI/CD, tracks IaC infrastructure drift, and coordinates deployments.", logs: ["LOG-021: check_suite failures parsed on auth-svc/v3.8.1", "LOG-022: generated config retry policy patch", "LOG-023: rerun CI pipeline triggered successfully"] },
  { id: "qa", name: "QA Agent", role: "Quality Assurance", icon: ShieldCheck, color: "border-black/40 text-black bg-black/5", status: "active", confidence: 97, mttr: "2m", desc: "Auto-generates localized test suites, validates regressions, and scores test coverage.", logs: ["LOG-011: impact-based test analyzer parsed 14 modules", "LOG-012: synthesized 12 edge-case regression tests", "LOG-013: test run successful: 100% assertions green"] },
  { id: "sec", name: "Security Agent", role: "AppSec & Compliance", icon: ShieldAlert, color: "border-[#DB2777]/40 text-[#DB2777] bg-[#DB2777]/5", status: "active", confidence: 88, mttr: "8m", desc: "Scans dependencies, handles IAM policies, inspects static code, and audits secrets.", logs: ["LOG-051: running dependency vulnerability scanner", "LOG-052: CVE-2025-31021 identified in auth-svc tree", "LOG-053: PR opened to update dependency package to v2.4.1"] },
  { id: "pm", name: "PM Agent", role: "Product Management", icon: Briefcase, color: "border-black/40 text-black bg-black/5", status: "active", confidence: 94, mttr: "4m", desc: "Prioritizes backlogs, drafts specs from logs, and surfaces engineering bottlenecks.", logs: ["LOG-001: ingested incident postmortem for INC-2847", "LOG-002: updated backlog item B-012 with RCA artifacts", "LOG-003: synchronized sprint dashboard progress tags"] },
  { id: "arch", name: "Architecture Agent", role: "Systems Design", icon: Network, color: "border-black/40 text-black bg-black/5", status: "active", confidence: 89, mttr: "12m", desc: "Maps live services, surfaces structural coupling risks, and tracks system debt.", logs: ["LOG-061: recalculating graph distance indices", "LOG-062: boundary check: search-svc couples ml-inference", "LOG-063: proposed refactoring payments boundary (debt -18%)"] }
];

// Interactive runbook steps matching golden flow
const runbookSteps = [
  {
    step: "01",
    title: "Inject Failure",
    desc: "A developer pushes a buggy PR containing a dependency mismatch, triggering a CI pipeline crash.",
    evidence: "GitHub check_suite failed (Exit Code 1)",
    code: `// PR #421: auth-svc/package.json
- "jsonwebtoken": "^9.0.0",
+ "jsonwebtoken": "^8.5.1", // Incompatible with auth_helper.ts`,
    output: `[SYSTEM] GitHub webhook ingested: pull_request.opened (trace_id: tx-8472)
[SYSTEM] Normalizing envelope: source=github, type=CHECK_SUITE_FAILED
[SYSTEM] Event normalizer completed.`
  },
  {
    step: "02",
    title: "AI Triage & RCA",
    desc: "DevOps & QA agents analyze the crash logs, categorize the error class, and isolate the exact faulty lines.",
    evidence: "Crash isolated to jsonwebtoken import mismatch (98% confidence)",
    code: `// DevOps Agent - Log Analysis
Analyzing container build logs...
ERROR in src/auth_helper.ts: L14
"sign" requires options.algorithm mismatch in ^8.5.1
Error Class: DEPENDENCY_MISMATCH`,
    output: `[DevOps Agent] Event enriched with code graph & ownership metadata
[DevOps Agent] Log scan complete. Isolated mismatch in jsonwebtoken version.
[DevOps Agent] Classification: DEPENDENCY_MISMATCH (Confidence: 98%)`
  },
  {
    step: "03",
    title: "Auto-Fix PR",
    desc: "DevOps agent automatically drafts a repair branch, resolves the dependency mismatch, and submits a PR.",
    evidence: "Repair PR #422 submitted to main",
    code: `// Proposed Auto-Fix Patch
- "jsonwebtoken": "^8.5.1",
+ "jsonwebtoken": "^9.0.2", // Remediated by DevOps Agent`,
    output: `[DevOps Agent] Generating config patch for auth-svc dependency tree...
[DevOps Agent] Opening Repair PR #422 (auth-svc-hotfix-tx-8472)
[DevOps Agent] PR description written with logs, trace backlink, and RCA rationale.`
  },
  {
    step: "04",
    title: "Verify Recovery",
    desc: "The QA Agent auto-generates localized regression test suites to verify that the patch fixes the error without side-effects.",
    evidence: "Pipeline turns green. 12 synthetic test cases passed.",
    code: `// Test Suite: auth_helper_test.ts
describe("token signing verification", () => {
  it("verifies RS256 algorithm execution", () => {
    const token = signToken({ uid: 1 }, { algorithm: "RS256" });
    expect(token).toBeDefined();
  });
});`,
    output: `[QA Agent] Running impact-based test selector.
[QA Agent] 12 test assertions synthesized for auth-svc modules.
[QA Agent] Running test suite...
[SYSTEM] Test pipeline passed. CI status: GREEN (tx-8472)`
  },
  {
    step: "05",
    title: "Guarded Release",
    desc: "Forge begins a progressive canary rollout of the fix, overlaying real-time risk scores onto the deployment.",
    evidence: "Risk Score: 12% (Safe). Rolling out 10% -> 25% traffic.",
    code: `// Canary Rollout Policy Configuration
{
  "service": "auth-svc",
  "canary_steps": [10, 25, 50, 100],
  "monitoring_window_ms": 30000,
  "max_allowed_risk": 30
}`,
    output: `[SYSTEM] Initiating canary rollout for auth-svc v3.8.2
[SRE Agent] Calculating pre-deploy risk profile...
[SRE Agent] Risk score: 12% (Low change blast radius). Canary step: 10% traffic.`
  },
  {
    step: "06",
    title: "Anomaly Rollback",
    desc: "When a synthetic latency spike burns the error budget, the SRE Agent triggers a safe autonomous rollback in seconds.",
    evidence: "Anomaly: Latency spike (950ms). Reverted to v3.8.0.",
    code: `// SRE Agent - Autonomous Action Log
SLO Burn Rate: 3.1x (Threshold 2.0x)
Blast Radius: Safe
Rollback Plan: Executing deployment revert to auth-svc:v3.8.0`,
    output: `[SRE Agent] SLO violation detected: auth-svc p99 latency exceeded 250ms (measured: 950ms)
[SRE Agent] Initiating policy-bounded auto-rollback...
[SRE Agent] Production mutation executed safely. Rollback complete in 2.4s.`
  }
];

// Roadmap milestones matching ROADMAP.md
const roadmapMilestones = [
  { id: "M0", name: "Milestone 0: Foundation", timeline: "Week 1", desc: "Define canonical event, decision, and audit schemas. Establish the basic control loop and state tracking contracts.", status: "completed", exit: "One synthetic event can be ingested and rendered in UI timeline." },
  { id: "M1", name: "Milestone 1: CI Recovery Vertical Slice", timeline: "Weeks 2-3", desc: "Automate failure classification, auto-fix patches, and CI rerun workflows for webhook events.", status: "current", exit: "failing CI is auto-repaired and redeployed with fully traceable evidence logs." },
  { id: "M2", name: "Milestone 2: CI/CD Self-Healing Expansion", timeline: "Weeks 4-5", desc: "Build intelligent test quarantines, flaky-test detectors, retry/backoff engines, and baseline risk scoring.", status: "planned", exit: ">=3 failure archetypes auto-remediated in staging environments." },
  { id: "M3", name: "Milestone 3: Deployment Intelligence", timeline: "Weeks 6-7", desc: "Implement progressive rollouts (canary) coupled with latency anomaly detection and auto-rollbacks.", status: "planned", exit: "Controlled canary release + autonomous rollback loops validate safely." },
  { id: "M4", name: "Milestone 4: Incident Commander", timeline: "Weeks 8-9", desc: "Auto-generate full incident timelines, root cause maps, and architecture boundaries alignment reports.", status: "planned", exit: "Incident scenarios automatically produce root cause graphs and fix patches." },
  { id: "M5", name: "Milestone 5: Workflow Studio", timeline: "Weeks 10-11", desc: "Visual runbook orchestrator, planning intelligence agent, and multi-agent collaborative task timelines.", status: "planned", exit: "Visual sprint planning generated directly from live engineering telemetry." },
  { id: "M6", name: "Milestone 6: Enterprise Hardening", timeline: "Week 12", desc: "Incorporate strict RBAC control, policy-as-code packages, tenant isolation boundaries, and chaos suites.", status: "planned", exit: "Complete policy audit log export with zero safety violations." }
];

export default function Landing() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [opacity, setOpacity] = useState(0);
  const [activeAgent, setActiveAgent] = useState("sre");
  const [activeStep, setActiveStep] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let animationFrameId: number;
    let isResetting = false;

    const checkVideoTransition = () => {
      if (!video || isResetting) {
        animationFrameId = requestAnimationFrame(checkVideoTransition);
        return;
      }

      const current = video.currentTime;
      const duration = video.duration;

      if (duration > 0) {
        const fadeInDuration = 0.5; // 0.5s fade-in at the start
        const fadeOutDuration = 0.5; // 0.5s fade-out at the end

        if (current < fadeInDuration) {
          setOpacity(current / fadeInDuration);
        } else if (current > duration - fadeOutDuration) {
          const timeRemaining = duration - current;
          setOpacity(Math.max(0, timeRemaining / fadeOutDuration));
        } else {
          setOpacity(1);
        }
      }

      animationFrameId = requestAnimationFrame(checkVideoTransition);
    };

    const handlePlay = () => {
      animationFrameId = requestAnimationFrame(checkVideoTransition);
    };

    const handleEnded = () => {
      isResetting = true;
      cancelAnimationFrame(animationFrameId);
      setOpacity(0);

      setTimeout(() => {
        if (video) {
          video.currentTime = 0;
          video.play()
            .then(() => {
              isResetting = false;
              animationFrameId = requestAnimationFrame(checkVideoTransition);
            })
            .catch((err) => {
              console.warn("[ForgeAI] Video loop replay failed:", err);
              isResetting = false;
            });
        }
      }, 100);
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("ended", handleEnded);

    video.play().catch((err) => {
      console.log("[ForgeAI] Auto-play pending interaction:", err);
    });

    return () => {
      cancelAnimationFrame(animationFrameId);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("ended", handleEnded);
    };
  }, []);

  const selectedAgent = agentsData.find(a => a.id === activeAgent) || agentsData[0];

  return (
    <div 
      className="relative min-h-screen w-full overflow-hidden bg-white text-black font-inter selection:bg-black selection:text-white" 
      style={{ backgroundColor: "#FFFFFF" }}
    >
      {/* 1px Vertical Border Grid Lines */}
      <div className="absolute inset-y-0 left-8 w-px bg-black/5 pointer-events-none hidden md:block" />
      <div className="absolute inset-y-0 right-8 w-px bg-black/5 pointer-events-none hidden md:block" />
      <div className="absolute inset-y-0 left-1/4 w-px bg-black/[0.02] pointer-events-none hidden lg:block" />
      <div className="absolute inset-y-0 right-1/4 w-px bg-black/[0.02] pointer-events-none hidden lg:block" />

      {/* Navigation (z-20) */}
      <header className="relative z-20 w-full border-b border-black/5 bg-white/90 backdrop-blur-md">
        <nav className="flex justify-between items-center px-6 md:px-12 py-5 max-w-7xl mx-auto">
          {/* Logo */}
          <Link 
            to="/" 
            className="font-instrument text-2xl tracking-tight text-[#000000] hover:opacity-85 transition-opacity flex items-center gap-1.5"
          >
            ForgeAI<sup className="text-xs font-sans font-semibold align-super">®</sup>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/app" className="text-xs font-medium uppercase tracking-wider text-[#000000] transition-colors hover:text-black/60">
              Console Dashboard
            </Link>
            <a href="#control-loop" className="text-xs font-medium uppercase tracking-wider text-[#6F6F6F] transition-colors hover:text-black">
              The Loop
            </a>
            <a href="#agents" className="text-xs font-medium uppercase tracking-wider text-[#6F6F6F] transition-colors hover:text-black">
              Agents
            </a>
            <a href="#runbook-sim" className="text-xs font-medium uppercase tracking-wider text-[#6F6F6F] transition-colors hover:text-black">
              Runbook Live
            </a>
            <a href="#safety" className="text-xs font-medium uppercase tracking-wider text-[#6F6F6F] transition-colors hover:text-black">
              Safety Gates
            </a>
            <a href="#roadmap" className="text-xs font-medium uppercase tracking-wider text-[#6F6F6F] transition-colors hover:text-black">
              Roadmap
            </a>
          </div>

          {/* CTAs */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              to="/app"
              className="border border-black px-5 py-2 text-xs font-medium uppercase tracking-wider text-[#000000] hover:bg-black hover:text-white transition-all duration-300"
            >
              Open Console
            </Link>
            <Link
              to="/onboarding"
              className="bg-[#000000] px-5 py-2 text-xs font-medium uppercase tracking-wider text-white hover:bg-black/80 transition-all duration-300"
            >
              Start Setup
            </Link>
          </div>

          {/* Mobile hamburger menu */}
          <div className="md:hidden">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-black p-1 focus:outline-none"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </nav>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-black/5 bg-white py-6 px-6 space-y-4 animate-fade-rise duration-200">
            <Link 
              to="/app" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold tracking-wide text-black"
            >
              Console Dashboard
            </Link>
            <a 
              href="#control-loop" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold tracking-wide text-[#6F6F6F]"
            >
              The Control Loop
            </a>
            <a 
              href="#agents" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold tracking-wide text-[#6F6F6F]"
            >
              Autonomous Agents
            </a>
            <a 
              href="#runbook-sim" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold tracking-wide text-[#6F6F6F]"
            >
              Interactive Runbook
            </a>
            <a 
              href="#safety" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold tracking-wide text-[#6F6F6F]"
            >
              Safety Policies
            </a>
            <a 
              href="#roadmap" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold tracking-wide text-[#6F6F6F]"
            >
              Development Roadmap
            </a>
            <div className="pt-4 border-t border-black/5 flex flex-col gap-3">
              <Link
                to="/app"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center border border-black py-2.5 text-xs font-semibold uppercase tracking-wider text-black"
              >
                Open Console
              </Link>
              <Link
                to="/onboarding"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center bg-black py-2.5 text-xs font-semibold uppercase tracking-wider text-white"
              >
                Start Setup
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Cinematic Hero Background Video (z-0) */}
      <div 
        className="absolute z-0 overflow-hidden select-none pointer-events-none w-full" 
        style={{ 
          top: "280px", 
          inset: "280px 0 0 0",
          height: "440px"
        }}
      >
        <video
          ref={videoRef}
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4"
          className="w-full h-full object-cover transition-opacity duration-75"
          style={{ opacity: opacity }}
          muted
          playsInline
          disablePictureInPicture
        />
        {/* Soft edge masking gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white pointer-events-none" />
        <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-white to-transparent pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none" />
      </div>

      {/* Main Hero Container (z-10) */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 max-w-7xl mx-auto pt-24 pb-48">
        {/* Eyebrow */}
        <div className="mono text-[10px] uppercase tracking-[0.35em] text-[#6F6F6F] mb-6 flex items-center gap-2 select-none animate-fade-rise">
          <span className="inline-block w-6 h-px bg-[#6F6F6F]/60" />
          Autonomous Production Control Loop
        </div>

        {/* Headings */}
        <h1 
          className="animate-fade-rise font-instrument text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-normal text-black max-w-6xl tracking-tighter"
          style={{ 
            lineHeight: 0.9,
            letterSpacing: "-2.86px",
            color: "#000000"
          }}
        >
          Run your production <br />
          <span className="text-[#6F6F6F] italic font-normal">with an operator,</span> not a <span className="text-[#6F6F6F] italic font-normal">checklist.</span>
        </h1>

        {/* Subtitle */}
        <p 
          className="animate-fade-rise-delay text-base sm:text-lg md:text-xl text-[#6F6F6F] max-w-3xl mt-8 leading-relaxed font-normal"
          style={{ color: "#6F6F6F" }}
        >
          Forge Autonomy OS coordinates software production end-to-end. By coupling live engineering signals, multi-agent reasoning, and safety policy gates, we remediate CI failures, quarantine flakiness, evaluate risk, and roll back anomalies autonomously.
        </p>

        {/* Action Buttons */}
        <div className="animate-fade-rise-delay-2 mt-12 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/onboarding"
            className="rounded-full px-10 py-4.5 text-xs font-semibold uppercase tracking-wider text-white bg-black active:scale-98 transition-all duration-300 shadow-[0_0_30px_hsl(var(--primary)/0.55)] hover:shadow-[0_0_44px_hsl(var(--primary)/0.8)] hover:-translate-y-0.5"
            style={{ backgroundColor: "#000000", color: "#FFFFFF" }}
          >
            Start Integration — 90s
          </Link>
          
          <Link
            to="/app"
            className="rounded-full border border-black px-10 py-4.5 text-xs font-semibold uppercase tracking-wider text-black bg-white/50 backdrop-blur-sm transition-all duration-300 shadow-[0_0_18px_hsl(var(--foreground)/0.08)] hover:bg-black hover:text-white hover:shadow-[0_0_28px_hsl(var(--foreground)/0.16)] hover:-translate-y-0.5"
          >
            Open Live Console
          </Link>
        </div>
      </section>

      {/* SECTION 01 — THE CONTROL LOOP */}
      <section id="control-loop" className="relative z-10 border-t border-black/5 bg-white py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          {/* Header row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
            <div>
              <span className="mono text-xs font-medium text-[#6F6F6F] tracking-widest block mb-2">01 / PROCESS PIPELINE</span>
              <h2 className="font-instrument text-4xl md:text-5xl text-black tracking-tight leading-none">
                The Autonomous Control Loop
              </h2>
            </div>
            <p className="text-sm text-[#6F6F6F] max-w-md leading-relaxed">
              Every production signal is processed through an immutable, eight-stage control cycle designed for safety, trace verification, and recursive learning.
            </p>
          </div>

          {/* 8-stage pipeline grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-black/10 border border-black/10">
            {[
              { num: "01", name: "Ingest", desc: "Pipes live hooks from GitHub, CI providers, Kubernetes, monitoring engines, and chat contexts." },
              { num: "02", name: "Normalize", desc: "Converts diverse payloads into a unified canonical event envelope ensuring correlation." },
              { num: "03", name: "Enrich", desc: "Injects deep context: ownership graphs, code branches, active architecture maps, and incident logs." },
              { num: "04", name: "Reason", desc: "Collaborates across specialized agents (SRE, QA, DevOps, Security) evaluating raw evidence." },
              { num: "05", name: "Decide", desc: "Weighs risk scores and confidence rates against explicit policy gates to draft action classes." },
              { num: "06", name: "Execute", desc: "Mutates production safely: auto-PRs, pipeline restarts, scaling instances, or rolls back rollouts." },
              { num: "07", name: "Verify", desc: "Validates change impact against real-time SLO error budgets, synthetic metrics, and health scores." },
              { num: "08", name: "Learn", desc: "Feeds outcome metadata back to the context engine to optimize future confidence algorithms." }
            ].map((step, idx) => (
              <div key={idx} className="bg-white p-8 group hover:bg-[#F9F9F9] transition-colors duration-300">
                <span className="mono text-[10px] text-[#6F6F6F]/60 block mb-4">{step.num} // CONTROL LOOP</span>
                <h3 className="font-semibold text-lg text-black mb-2 flex items-center justify-between">
                  {step.name}
                  <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 text-[#6F6F6F]" />
                </h3>
                <p className="text-xs text-[#6F6F6F] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 02 — SPECIALIZED AGENTS */}
      <section id="agents" className="relative z-10 border-t border-black/5 bg-[#FAFAFA] py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
            <div>
              <span className="mono text-xs font-medium text-[#6F6F6F] tracking-widest block mb-2">02 / COLLABORATIVE ORCHESTRATION</span>
              <h2 className="font-instrument text-4xl md:text-5xl text-black tracking-tight leading-none">
                Six Specialized Agents
              </h2>
            </div>
            <p className="text-sm text-[#6F6F6F] max-w-md leading-relaxed">
              Operating under strict, bounded mandates, six dedicated agents coordinate live to keep software shipping, performing, and healing.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Agent selection list */}
            <div className="lg:col-span-5 flex flex-col divide-y divide-black/5 border border-black/10 bg-white">
              {agentsData.map((agent) => {
                const Icon = agent.icon;
                const isSelected = activeAgent === agent.id;
                return (
                  <button
                    key={agent.id}
                    onClick={() => setActiveAgent(agent.id)}
                    className={`w-full text-left p-6 flex items-start justify-between transition-colors duration-300 ${isSelected ? 'bg-black/5' : 'hover:bg-black/[0.01]'}`}
                  >
                    <div className="flex gap-4">
                      <div className={`p-2 border ${agent.color} mt-0.5`}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-sm text-black">{agent.name}</h3>
                          <span className={`px-2 py-0.5 text-[9px] uppercase tracking-wider border font-mono ${
                            agent.status === 'watching' ? 'border-[#D97706]/40 text-[#D97706] bg-[#D97706]/5 animate-pulse' : 'border-black/35 text-black/80 bg-black/[0.02]'
                          }`}>
                            {agent.status}
                          </span>
                        </div>
                        <p className="text-xs text-[#6F6F6F] mt-1 font-mono">{agent.role}</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className={`text-[#6F6F6F] transition-transform duration-300 ${isSelected ? 'translate-x-1 text-black' : ''}`} />
                  </button>
                );
              })}
            </div>

            {/* Right Column: Live Agent Sandbox Inspect */}
            <div className="lg:col-span-7 border border-black/10 bg-white p-8 flex flex-col h-full min-h-[460px] justify-between">
              <div>
                {/* Agent Header */}
                <div className="flex items-start justify-between border-b border-black/5 pb-6">
                  <div>
                    <span className="mono text-[10px] text-[#6F6F6F] uppercase tracking-widest block mb-1">Live Sandbox Terminal</span>
                    <h3 className="font-instrument text-3xl text-black">{selectedAgent.name}</h3>
                    <p className="text-xs text-[#6F6F6F] font-mono mt-1">{selectedAgent.role} Module</p>
                  </div>
                  <div className="text-right">
                    <span className="mono text-[10px] text-[#6F6F6F] uppercase block mb-1">Agent Confidence</span>
                    <span className="font-instrument text-4xl text-black font-semibold">{selectedAgent.confidence}%</span>
                  </div>
                </div>

                {/* Agent Detail description */}
                <div className="py-6">
                  <h4 className="mono text-[10px] text-[#6F6F6F] uppercase tracking-wider mb-2">Mandate & Directives</h4>
                  <p className="text-sm text-[#000000] leading-relaxed">{selectedAgent.desc}</p>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4 border-t border-b border-black/5 py-4 my-2">
                  <div>
                    <span className="mono text-[9px] text-[#6F6F6F] uppercase block">Mean Time to Mitigation (MTTM)</span>
                    <span className="font-mono text-sm font-semibold text-black">{selectedAgent.mttr}</span>
                  </div>
                  <div>
                    <span className="mono text-[9px] text-[#6F6F6F] uppercase block">Authorized Actions Scope</span>
                    <span className="font-mono text-sm font-semibold text-black">Class A, B, C</span>
                  </div>
                </div>

                {/* Live Console Output Simulation */}
                <div className="mt-4">
                  <h4 className="mono text-[10px] text-[#6F6F6F] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Terminal size={12} />
                    Current Operational Logs
                  </h4>
                  <div className="bg-black text-white p-4 font-mono text-[11px] leading-relaxed space-y-1.5 overflow-x-auto select-all">
                    {selectedAgent.logs.map((log, lIdx) => (
                      <div key={lIdx} className="flex gap-2">
                        <span className="text-[#6F6F6F] select-none">[{lIdx + 1}]</span>
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-black/5 flex items-center justify-between">
                <span className="text-[10px] text-[#6F6F6F] font-mono">Trace Sync: ACTIVE · prod-us-east-1</span>
                <Link 
                  to="/app" 
                  className="text-xs font-semibold uppercase tracking-wider text-black flex items-center gap-1 hover:underline"
                >
                  View full decision logs
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 03 — SAFETY AND POLICIES */}
      <section id="safety" className="relative z-10 border-t border-b border-black/5 bg-white py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
            <div>
              <span className="mono text-xs font-medium text-[#6F6F6F] tracking-widest block mb-2">03 / POLICY-BOUNDED DEPLOYMENT</span>
              <h2 className="font-instrument text-4xl md:text-5xl text-black tracking-tight leading-none">
                Safety Controls & Action Classes
              </h2>
            </div>
            <p className="text-sm text-[#6F6F6F] max-w-md leading-relaxed">
              We separate autonomous authority into distinct classes governed by policy rules, audit persistence, and rollback guarantees.
            </p>
          </div>

          {/* Action Classes Rows */}
          <div className="space-y-6">
            {[
              {
                classTag: "Class A",
                title: "Suggest-Only Model",
                desc: "High blast-radius actions like restructuring database boundaries, modifying routing architectures, or introducing significant version changes. Forge runs reasoning networks, calculates risks, outputs code structures, and prepares draft tickets but executes nothing automatically.",
                scope: "Database extractions, Coupling architecture changes, Network VPC route updates",
                badge: "Human Sign-off Mandatory"
              },
              {
                classTag: "Class B",
                title: "Approval-Required Rollout",
                desc: "Non-trivial configurations, environment variables, or core code changes with moderate blast radius. The agents draft the repair pull request and execute CI validations automatically, but block release deployment until an authorized operator clicks 'Approve' inside Slack or the Forge console.",
                scope: "Minor package updates, critical code hotfixes, infra config drift reconciliations",
                badge: "Operator Gate Required"
              },
              {
                classTag: "Class C",
                title: "Autonomous Safe Execution",
                desc: "Low blast-radius, bounded actions that are completely reversible. Includes isolating flaky test blocks, retrying network rate-limits, autoscaling resource footprints on CPU spikes, and triggering canary rollbacks on burn-rate anomalies. Fully autonomous, audited, and resolved in seconds.",
                scope: "Flaky test quarantine, auto-rollbacks, instance autoscaling, dependency mismatches",
                badge: "Autonomous Execution Active"
              }
            ].map((scope, cIdx) => (
              <div key={cIdx} className="border border-black/10 bg-white p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-start hover:border-black transition-colors duration-300">
                <div className="md:col-span-2">
                  <span className="mono text-xs uppercase tracking-widest bg-black text-white px-3 py-1 inline-block">
                    {scope.classTag}
                  </span>
                </div>
                <div className="md:col-span-7">
                  <h3 className="font-instrument text-2xl text-black font-normal mb-2">{scope.title}</h3>
                  <p className="text-xs text-[#6F6F6F] leading-relaxed mb-4">{scope.desc}</p>
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] text-black font-mono">Applicable Scopes:</span>
                    <span className="text-[10px] text-[#6F6F6F] font-mono bg-black/5 px-2 py-0.5 rounded">{scope.scope}</span>
                  </div>
                </div>
                <div className="md:col-span-3 md:text-right flex flex-col justify-between h-full items-start md:items-end">
                  <span className="text-[10px] font-mono border border-black/15 px-2.5 py-1 text-black font-semibold bg-black/[0.01]">
                    {scope.badge}
                  </span>
                  <span className="text-[10px] text-[#6F6F6F] font-mono mt-4 md:mt-12">Idempotent execution verified</span>
                </div>
              </div>
            ))}
          </div>

          {/* Bounded Safety Policy details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 border-t border-black/5 pt-12">
            <div>
              <h4 className="mono text-xs text-black uppercase tracking-wider mb-2 font-bold flex items-center gap-1.5">
                <Check size={14} className="text-[#6F6F6F]" />
                Idempotency Guarantees
              </h4>
              <p className="text-xs text-[#6F6F6F] leading-relaxed">
                Every transaction and autonomous action carries a unique session token preventing duplicate builds, racing conditions, or infinite mutation loops.
              </p>
            </div>
            <div>
              <h4 className="mono text-xs text-black uppercase tracking-wider mb-2 font-bold flex items-center gap-1.5">
                <Check size={14} className="text-[#6F6F6F]" />
                Immutable Audit Trails
              </h4>
              <p className="text-xs text-[#6F6F6F] leading-relaxed">
                Forge records all input events, enriched context graphs, model reasonings, validation logs, and rollback outcomes into an immutable audit timeline.
              </p>
            </div>
            <div>
              <h4 className="mono text-xs text-black uppercase tracking-wider mb-2 font-bold flex items-center gap-1.5">
                <Check size={14} className="text-[#6F6F6F]" />
                Mandatory Rollbacks
              </h4>
              <p className="text-xs text-[#6F6F6F] leading-relaxed">
                Every auto-executed production mutation is forced to supply a pre-validated, automated rollback plan before traffic shifting begins.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 04 — INTERACTIVE TIMELINE RUNBOOK SIMULATOR */}
      <section id="runbook-sim" className="relative z-10 border-b border-black/5 bg-[#FAFAFA] py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
            <div>
              <span className="mono text-xs font-medium text-[#6F6F6F] tracking-widest block mb-2">04 / THE GOLDEN FLOW DEMO</span>
              <h2 className="font-instrument text-4xl md:text-5xl text-black tracking-tight leading-none">
                Interactive Runbook Simulator
              </h2>
            </div>
            <p className="text-sm text-[#6F6F6F] max-w-md leading-relaxed">
              Step through the exact Golden Demo incident runbook. See how Forge Autonomy OS processes a crashing PR down to a completed, guarded revert.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Steps selectors */}
            <div className="lg:col-span-4 space-y-3">
              {runbookSteps.map((step, sIdx) => {
                const isActive = activeStep === sIdx;
                return (
                  <button
                    key={sIdx}
                    onClick={() => setActiveStep(sIdx)}
                    className={`w-full text-left p-5 border transition-all duration-300 flex items-start gap-4 ${
                      isActive ? 'bg-black text-white border-black' : 'bg-white text-black border-black/10 hover:border-black/30'
                    }`}
                  >
                    <span className={`mono text-xs font-semibold ${isActive ? 'text-white' : 'text-[#6F6F6F]'}`}>
                      {step.step}
                    </span>
                    <div>
                      <h3 className="font-medium text-xs uppercase tracking-wider">{step.title}</h3>
                      <p className={`text-[11px] mt-1 line-clamp-2 leading-relaxed ${isActive ? 'text-white/80' : 'text-[#6F6F6F]'}`}>
                        {step.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Screen: Live simulated timeline dashboard state */}
            <div className="lg:col-span-8 border border-black/10 bg-white p-6 md:p-8 flex flex-col justify-between">
              <div>
                {/* Simulated Screen Header */}
                <div className="flex items-center justify-between border-b border-black/5 pb-4 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-black/80 animate-pulse" />
                    <span className="mono text-[10px] text-black tracking-wider uppercase font-semibold">Incident Timeline Terminal</span>
                  </div>
                  <span className="text-[10px] text-[#6F6F6F] font-mono">Trace ID: tx-8472-demo</span>
                </div>

                {/* Summary Card */}
                <div className="border border-black/5 bg-[#FAFAFA] p-5 mb-6">
                  <span className="mono text-[9px] text-[#6F6F6F] uppercase">Active Stage Evidence</span>
                  <h4 className="font-instrument text-2xl text-black mt-1 mb-2 font-normal">
                    {runbookSteps[activeStep].title}
                  </h4>
                  <p className="text-xs text-[#6F6F6F] leading-relaxed mb-3">
                    {runbookSteps[activeStep].desc}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-black font-mono font-bold">Telemetry Verified:</span>
                    <span className="text-[10px] text-red-600 bg-red-50 border border-red-200/50 px-2 py-0.5 rounded font-mono font-semibold">
                      {runbookSteps[activeStep].evidence}
                    </span>
                  </div>
                </div>

                {/* Tabs to show raw code diff vs raw log output */}
                <div className="space-y-4">
                  <div>
                    <h5 className="mono text-[10px] text-[#6F6F6F] uppercase tracking-wider mb-2">Simulated Code/Config Diff</h5>
                    <div className="bg-black/95 text-white p-4 font-mono text-[11px] leading-relaxed overflow-x-auto select-all">
                      <pre className="text-[#34D399]">{runbookSteps[activeStep].code}</pre>
                    </div>
                  </div>

                  <div>
                    <h5 className="mono text-[10px] text-[#6F6F6F] uppercase tracking-wider mb-2">Forge Control Loop Logs</h5>
                    <div className="bg-black/95 text-[#9CA3AF] p-4 font-mono text-[11px] leading-relaxed overflow-x-auto select-all border-t border-white/5">
                      <pre className="text-white/80">{runbookSteps[activeStep].output}</pre>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step Nav footer */}
              <div className="mt-8 pt-6 border-t border-black/5 flex items-center justify-between">
                <button
                  disabled={activeStep === 0}
                  onClick={() => setActiveStep(prev => Math.max(0, prev - 1))}
                  className="text-xs font-semibold uppercase tracking-wider text-[#6F6F6F] hover:text-black disabled:opacity-30 disabled:pointer-events-none"
                >
                  Previous Step
                </button>
                <div className="flex gap-1.5">
                  {runbookSteps.map((_, dotIdx) => (
                    <button
                      key={dotIdx}
                      onClick={() => setActiveStep(dotIdx)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${activeStep === dotIdx ? 'bg-black w-4' : 'bg-black/20'}`}
                    />
                  ))}
                </div>
                <button
                  disabled={activeStep === runbookSteps.length - 1}
                  onClick={() => setActiveStep(prev => Math.min(runbookSteps.length - 1, prev + 1))}
                  className="text-xs font-semibold uppercase tracking-wider text-black hover:opacity-75 disabled:opacity-30 disabled:pointer-events-none"
                >
                  Next Step
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 05 — THE CONTEXT ENGINE ARCHITECTURE */}
      <section className="relative z-10 border-b border-black/5 bg-white py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
            <div>
              <span className="mono text-xs font-medium text-[#6F6F6F] tracking-widest block mb-2">05 / SYSTEM UNDERPINNINGS</span>
              <h2 className="font-instrument text-4xl md:text-5xl text-black tracking-tight leading-none">
                The Context Engine
              </h2>
            </div>
            <p className="text-sm text-[#6F6F6F] max-w-md leading-relaxed">
              Copilots generate raw code. Forge Autonomy OS operates production. Our core advantage is our continuous three-dimensional database context engine.
            </p>
          </div>

          {/* 3D context engine boxes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="border border-black/10 p-8 hover:border-black transition-colors duration-300">
              <div className="p-3 border border-black/15 bg-black/[0.01] w-fit mb-6">
                <Layers size={18} />
              </div>
              <h3 className="font-instrument text-2xl text-black font-normal mb-2">Operational State DB</h3>
              <span className="mono text-[10px] text-[#6F6F6F] bg-black/5 px-2 py-0.5 rounded font-semibold block w-fit mb-4">PostgreSQL State Engine</span>
              <p className="text-xs text-[#6F6F6F] leading-relaxed">
                Tracks current deployment targets, ongoing canary ratios, active alert structures, active agent session keys, and immutable compliance audit logs for every system mutation.
              </p>
            </div>

            <div className="border border-black/10 p-8 hover:border-black transition-colors duration-300">
              <div className="p-3 border border-black/15 bg-black/[0.01] w-fit mb-6">
                <Network size={18} />
              </div>
              <h3 className="font-instrument text-2xl text-black font-normal mb-2">Dependency & Boundary Graph</h3>
              <span className="mono text-[10px] text-[#6F6F6F] bg-black/5 px-2 py-0.5 rounded font-semibold block w-fit mb-4">Neo4j Topology Engine</span>
              <p className="text-xs text-[#6F6F6F] leading-relaxed">
                Maps microservice relationships, structural boundary dependencies, software package ownership lists, VPC limits, and historic blast radius paths of outages.
              </p>
            </div>

            <div className="border border-black/10 p-8 hover:border-black transition-colors duration-300">
              <div className="p-3 border border-black/15 bg-black/[0.01] w-fit mb-6">
                <Cpu size={18} />
              </div>
              <h3 className="font-instrument text-2xl text-black font-normal mb-2">Semantic Incident Memory</h3>
              <span className="mono text-[10px] text-[#6F6F6F] bg-black/5 px-2 py-0.5 rounded font-semibold block w-fit mb-4">Qdrant Vector Engine</span>
              <p className="text-xs text-[#6F6F6F] leading-relaxed">
                Stores previous PR remediation descriptions, Slack troubleshooting transcripts, deployment postmortems, and runbook updates to guide confidence-scoring.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 06 — DEVELOPMENT ROADMAP & MILESTONES */}
      <section id="roadmap" className="relative z-10 border-b border-black/5 bg-[#FAFAFA] py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
            <div>
              <span className="mono text-xs font-medium text-[#6F6F6F] tracking-widest block mb-2">06 / PRODUCT TIMELINE</span>
              <h2 className="font-instrument text-4xl md:text-5xl text-black tracking-tight leading-none">
                Multi-Milestone Roadmap
              </h2>
            </div>
            <p className="text-sm text-[#6F6F6F] max-w-md leading-relaxed">
              Our week-by-week implementation roadmap, tracking from initial schema foundations to complete enterprise chaos validation rules.
            </p>
          </div>

          {/* Roadmap list */}
          <div className="space-y-6">
            {roadmapMilestones.map((milestone, mIdx) => (
              <div 
                key={milestone.id} 
                className={`border bg-white p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-300 hover:border-black ${
                  milestone.status === 'completed' ? 'border-black/5 opacity-65' : 
                  milestone.status === 'current' ? 'border-black border-2 shadow-sm' : 'border-black/10'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-6 max-w-4xl">
                  {/* Milestone Badge */}
                  <div className="flex items-center gap-3">
                    <span className="mono text-xs uppercase bg-black text-white px-3 py-1 font-semibold block w-fit shrink-0">
                      {milestone.id}
                    </span>
                    <span className="mono text-[10px] text-[#6F6F6F] font-semibold block w-fit shrink-0 uppercase tracking-widest border border-black/10 px-2 py-0.5">
                      {milestone.timeline}
                    </span>
                  </div>
                  {/* Title & Desc */}
                  <div>
                    <h3 className="font-instrument text-2xl text-black font-normal mb-1">{milestone.name}</h3>
                    <p className="text-xs text-[#6F6F6F] leading-relaxed mb-2">{milestone.desc}</p>
                    <div className="text-[10px] font-mono leading-relaxed flex flex-wrap gap-1.5 items-center">
                      <span className="text-black font-bold">Exit Criteria:</span>
                      <span className="text-[#6F6F6F] bg-black/[0.03] border border-black/5 px-2 py-0.5">{milestone.exit}</span>
                    </div>
                  </div>
                </div>

                {/* Status Column */}
                <div className="text-right shrink-0 flex items-center gap-2 md:block">
                  <span className="mono text-[10px] text-[#6F6F6F] uppercase block md:mb-1">Progress Status</span>
                  {milestone.status === 'completed' && (
                    <span className="mono text-[10px] border border-black/20 bg-black/5 text-[#000000] font-semibold px-2 py-0.5 rounded">
                      [x] Completed
                    </span>
                  )}
                  {milestone.status === 'current' && (
                    <span className="mono text-[10px] border border-black text-black font-bold px-2 py-0.5 rounded flex items-center gap-1.5 animate-pulse">
                      <RefreshCw size={10} className="animate-spin" />
                      In Progress
                    </span>
                  )}
                  {milestone.status === 'planned' && (
                    <span className="mono text-[10px] border border-black/15 text-[#6F6F6F] px-2 py-0.5 rounded">
                      [ ] Planned
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 07 — PRICING & FAQs */}
      <section className="relative z-10 border-b border-black/5 bg-white py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
            <div>
              <span className="mono text-xs font-medium text-[#6F6F6F] tracking-widest block mb-2">07 / LICENSING & QUESTIONS</span>
              <h2 className="font-instrument text-4xl md:text-5xl text-black tracking-tight leading-none">
                Sizing & Frequently Asked Questions
              </h2>
            </div>
            <p className="text-sm text-[#6F6F6F] max-w-md leading-relaxed">
              We align with modern engineering scaling rules. Simple monotone licenses based on changes per day, pipelines count, and active environment layers.
            </p>
          </div>

          {/* Pricing cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            <div className="border border-black/10 p-8 flex flex-col justify-between hover:border-black transition-colors duration-300 bg-white">
              <div>
                <span className="mono text-[10px] text-[#6F6F6F] tracking-wider uppercase block mb-1">Developer Wedge</span>
                <h3 className="font-instrument text-3xl text-black mb-4">Sandbox Core</h3>
                <p className="text-xs text-[#6F6F6F] leading-relaxed mb-6">
                  Perfect for local dev exploration and testing webhook signature ingestion in sandbox repositories.
                </p>
                <div className="font-instrument text-5xl text-black mb-6 font-semibold">$0 <span className="text-xs font-sans font-normal text-[#6F6F6F]">/ month</span></div>
                <ul className="space-y-2 border-t border-black/5 pt-6 text-xs text-[#6F6F6F]">
                  <li className="flex items-center gap-2"><Check size={12} className="text-black" /> Local FastAPI development sandbox</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-black" /> Synthetic incident simulator</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-black" /> Timeline visualizer UI</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-black" /> Bounded mock databases fallback</li>
                </ul>
              </div>
              <Link 
                to="/onboarding"
                className="w-full text-center border border-black/25 py-3 text-xs font-semibold uppercase tracking-wider text-black mt-8 hover:bg-black hover:text-white transition-all duration-300"
              >
                Sign up free
              </Link>
            </div>

            <div className="border border-black-2 border-2 p-8 flex flex-col justify-between hover:border-black shadow-sm transition-colors duration-300 bg-white">
              <div>
                <span className="mono text-[10px] text-[#D97706] tracking-wider uppercase block mb-1 font-semibold">Recommended Slice</span>
                <h3 className="font-instrument text-3xl text-black mb-4">Self-Healing CI</h3>
                <p className="text-xs text-[#6F6F6F] leading-relaxed mb-6">
                  Best for engineering squads looking to dramatically slash MTTR by auto-repairing build breaks and test flakiness.
                </p>
                <div className="font-instrument text-5xl text-black mb-6 font-semibold">$299 <span className="text-xs font-sans font-normal text-[#6F6F6F]">/ month</span></div>
                <ul className="space-y-2 border-t border-black/5 pt-6 text-xs text-[#6F6F6F]">
                  <li className="flex items-center gap-2"><Check size={12} className="text-black" /> All Free features included</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-black" /> CI Failure classification (3 archetypes)</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-black" /> Auto-fix PR generator endpoint</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-black" /> Bounded Class C auto-reruns</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-black" /> 5 Active pipeline targets synced</li>
                </ul>
              </div>
              <Link 
                to="/onboarding"
                className="w-full text-center bg-black py-3.5 text-xs font-semibold uppercase tracking-wider text-white mt-8 hover:bg-black/90 transition-all duration-300"
              >
                Initiate onboarding
              </Link>
            </div>

            <div className="border border-black/10 p-8 flex flex-col justify-between hover:border-black transition-colors duration-300 bg-white">
              <div>
                <span className="mono text-[10px] text-[#6F6F6F] tracking-wider uppercase block mb-1">Scale Controls</span>
                <h3 className="font-instrument text-3xl text-black mb-4">Production Autonomy</h3>
                <p className="text-xs text-[#6F6F6F] leading-relaxed mb-6">
                  For organizations shifting to controlled autonomous deployments, canary gates, rollbacks, and full governance audits.
                </p>
                <div className="font-instrument text-5xl text-black mb-6 font-semibold">$999 <span className="text-xs font-sans font-normal text-[#6F6F6F]">/ month</span></div>
                <ul className="space-y-2 border-t border-black/5 pt-6 text-xs text-[#6F6F6F]">
                  <li className="flex items-center gap-2"><Check size={12} className="text-black" /> All CI features included</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-black" /> Canary controller & anomaly rollbacks</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-black" /> Context graph engines (Neo4j, Qdrant)</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-black" /> Custom Class A/B policy configurations</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-black" /> Dedicated SRE incident briefs</li>
                </ul>
              </div>
              <Link 
                to="/onboarding"
                className="w-full text-center border border-black/25 py-3 text-xs font-semibold uppercase tracking-wider text-black mt-8 hover:bg-black hover:text-white transition-all duration-300"
              >
                Request Enterprise trial
              </Link>
            </div>
          </div>

          {/* FAQ Accordion Lists */}
          <div className="border-t border-black/5 pt-16 max-w-4xl mx-auto">
            <h3 className="font-instrument text-3xl text-black text-center mb-12">Frequently Answered Queries</h3>
            <div className="space-y-8">
              <div>
                <h4 className="font-medium text-sm text-black mb-2 flex items-center gap-2">
                  <span className="text-[#6F6F6F]">Q:</span> Why is this different from existing AI coding copilots?
                </h4>
                <p className="text-xs text-[#6F6F6F] leading-relaxed pl-6">
                  Existing copilots focus entirely on generating raw syntax blocks within an IDE. Forge Autonomy OS operates the entire production loop: ingesting real check failures, normalizing signals, reasoning over active architecture bounds, executing patches, rerunning verify suites, scoring deployment risks, and executing canary rollback sequences autonomously.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-sm text-black mb-2 flex items-center gap-2">
                  <span className="text-[#6F6F6F]">Q:</span> How do you prevent unsafe, runaway autonomous loop actions?
                </h4>
                <p className="text-xs text-[#6F6F6F] leading-relaxed pl-6">
                  We enforce explicit action class policies (Suggest-Only, Approval-Required, Auto-Execute), safe session-correlation idempotency keys, and blast-radius check limits. Every production mutation must supply a pre-validated automated rollback path. Runaway actions are hard-terminated by policy-as-code controllers if retry bounds are broken.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-sm text-black mb-2 flex items-center gap-2">
                  <span className="text-[#6F6F6F]">Q:</span> What is the product wedge and core moat?
                </h4>
                <p className="text-xs text-[#6F6F6F] leading-relaxed pl-6">
                  Our wedge product is self-healing CI/CD pipelines that immediately slash MTTR. Our continuous multi-dimensional context engine (integrating the Neo4j dependency/ownership graph, PostgreSQL operational state log, and Qdrant semantic incident memory) makes up the core product moat that no standard generic LLM wrapper can match.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-sm text-black mb-2 flex items-center gap-2">
                  <span className="text-[#6F6F6F]">Q:</span> Can we audit and replay the system decisions historically?
                </h4>
                <p className="text-xs text-[#6F6F6F] leading-relaxed pl-6">
                  Yes. Every event ingested, reason draft evaluated, decision class chosen, PR generated, and rollback triggered is saved immutably as audit envelopes indexed by unique trace IDs. You can inspect the entire historical chain of actions inside the console or export them as standard markdown briefs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL MONOTONE FOOTER */}
      <footer className="relative z-10 border-t border-black/10 bg-white py-16">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <Link 
              to="/" 
              className="font-instrument text-2xl tracking-tight text-[#000000] hover:opacity-85 transition-opacity"
            >
              ForgeAI<sup className="text-xs font-sans font-semibold align-super ml-0.5">®</sup>
            </Link>
            <p className="text-xs text-[#6F6F6F] mt-2 font-mono">
              The AI-Native Production Operating System for Engineering Teams.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-8 text-xs text-[#6F6F6F] font-mono">
            <Link to="/app" className="hover:text-black transition-colors">Console Dashboard</Link>
            <Link to="/onboarding" className="hover:text-black transition-colors">Onboarding Setup</Link>
            <a href="#control-loop" className="hover:text-black transition-colors">Control Loop</a>
            <a href="#agents" className="hover:text-black transition-colors">Special Agents</a>
            <a href="#roadmap" className="hover:text-black transition-colors">Roadmap Index</a>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-[#6F6F6F] font-mono block">
              © {new Date().getFullYear()} Forge Autonomy OS. Bounded by Policy-as-Code.
            </span>
            <span className="text-[9px] text-[#6F6F6F]/60 font-mono block mt-1">
              All transactions verified with idempotent session keys.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
