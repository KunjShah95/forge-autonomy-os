import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, GitBranch, Cloud, Check, Sparkles } from "lucide-react";

const steps = [
  { title: "Welcome, Operator", desc: "ForgeAI deploys 6 AI agents into your production stack. Let's get them online." },
  { title: "Connect your repos", desc: "We'll scan for services, pipelines, and ownership signals." },
  { title: "Pick your agents", desc: "Each agent operates under explicit policy. Toggle who's on duty." },
  { title: "You're live", desc: "Forge is now watching prod. Welcome to autonomous production." },
];

const Onboarding = () => {
  const [i, setI] = useState(0);
  const nav = useNavigate();
  const step = steps[i];
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-grid">
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 blur-3xl rounded-full pointer-events-none" />
      <div className="w-full max-w-2xl glass-strong rounded-2xl p-8 relative">
        <div className="flex items-center gap-1 mb-8">
          {steps.map((_, n) => (
            <div key={n} className={`h-1 flex-1 rounded-full ${n <= i ? "bg-gradient-to-r from-primary to-accent" : "bg-secondary"}`} />
          ))}
        </div>
        <div className="mono text-[10px] uppercase tracking-[0.2em] text-primary mb-2">Step {i + 1} of {steps.length}</div>
        <h1 className="font-display text-3xl font-bold tracking-tight">{step.title}</h1>
        <p className="text-muted-foreground mt-2">{step.desc}</p>

        <div className="mt-8 min-h-[260px]">
          {i === 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[{i: Bot, t: "6 agents"}, {i: GitBranch, t: "CI/CD intel"}, {i: Cloud, t: "Live topology"}].map((c, k) => (
                <div key={k} className="p-5 rounded-xl border border-border bg-secondary/40 text-center">
                  <c.i className="h-6 w-6 text-primary mx-auto mb-2" />
                  <div className="mono text-xs">{c.t}</div>
                </div>
              ))}
            </div>
          )}
          {i === 1 && (
            <div className="space-y-2">
              {["github.com/forge/commerce", "github.com/forge/identity", "github.com/forge/platform"].map(r => (
                <label key={r} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/40 cursor-pointer hover:border-primary/40">
                  <input type="checkbox" defaultChecked className="accent-primary" />
                  <GitBranch className="h-4 w-4 text-muted-foreground" />
                  <span className="mono text-sm">{r}</span>
                  <span className="ml-auto mono text-[10px] text-neon-green">● connected</span>
                </label>
              ))}
            </div>
          )}
          {i === 2 && (
            <div className="grid grid-cols-2 gap-2">
              {["PM Agent", "QA Agent", "DevOps Agent", "Security Agent", "SRE Agent", "Architecture Agent"].map(a => (
                <label key={a} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/40 cursor-pointer hover:border-primary/40">
                  <input type="checkbox" defaultChecked className="accent-primary" />
                  <Bot className="h-4 w-4 text-accent" />
                  <span className="text-sm">{a}</span>
                </label>
              ))}
            </div>
          )}
          {i === 3 && (
            <div className="flex flex-col items-center justify-center text-center py-8">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 shadow-[0_0_40px_hsl(var(--primary)/0.6)] animate-pulse-glow">
                <Check className="h-8 w-8 text-primary-foreground" />
              </div>
              <div className="font-display text-2xl font-bold">All systems online.</div>
              <div className="mono text-[11px] text-muted-foreground mt-2">6 agents · 14 services · prod-us-east-1</div>
            </div>
          )}
        </div>

        <div className="flex justify-between mt-6">
          <button onClick={() => i === 0 ? nav("/login") : setI(i - 1)} className="inline-flex min-h-12 items-center rounded-full border border-black/10 px-5 py-3 text-xs font-semibold uppercase tracking-wider transition-all hover:bg-black hover:text-white">
            ← Back
          </button>
          <button
            onClick={() => i === steps.length - 1 ? nav("/app") : setI(i + 1)}
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-gradient-to-r from-primary to-accent px-6 py-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground shadow-[0_0_30px_hsl(var(--primary)/0.45)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_42px_hsl(var(--primary)/0.7)]">
            <Sparkles className="h-3 w-3" /> {i === steps.length - 1 ? "Enter ForgeAI" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
