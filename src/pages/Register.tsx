import { useNavigate } from "react-router-dom";
import { Github, Chrome, Sparkles } from "lucide-react";
import { AuthShell } from "@/components/layout/AuthShell";

const Register = () => {
  const nav = useNavigate();

  return (
    <AuthShell
      eyebrow="Create account"
      title="Open a new ForgeAI workspace."
      subtitle="Register to connect repositories, launch agents, and keep the same high-contrast, glowy design language across the platform."
      footnote="By creating an account you unlock the same autonomous production experience used in the console, onboarding, and public pages."
      primaryAction={
        <button
          onClick={() => nav("/onboarding")}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white shadow-[0_0_26px_hsl(var(--primary)/0.55)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_38px_hsl(var(--primary)/0.8)]"
        >
          <Sparkles className="h-3.5 w-3.5" /> Guided setup
        </button>
      }
      secondaryAction={
        <button
          onClick={() => nav("/login")}
          className="inline-flex items-center justify-center rounded-full border border-black px-6 py-3 text-xs font-semibold uppercase tracking-wider transition-all hover:bg-black hover:text-white"
        >
          I already have an account
        </button>
      }
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); nav("/onboarding"); }}>
        <div>
          <label className="mono text-[10px] uppercase tracking-widest text-muted-foreground">Name</label>
          <input defaultValue="Kunj Shah" className="mt-1 w-full rounded-full border border-black/10 bg-black/[0.03] px-4 py-3 text-sm outline-none transition focus:border-primary/50" />
        </div>
        <div>
          <label className="mono text-[10px] uppercase tracking-widest text-muted-foreground">Work email</label>
          <input defaultValue="anton@forge.ai" className="mt-1 w-full rounded-full border border-black/10 bg-black/[0.03] px-4 py-3 text-sm outline-none transition focus:border-primary/50" />
        </div>
        <div>
          <label className="mono text-[10px] uppercase tracking-widest text-muted-foreground">Password</label>
          <input type="password" defaultValue="••••••••••" className="mt-1 w-full rounded-full border border-black/10 bg-black/[0.03] px-4 py-3 text-sm outline-none transition focus:border-primary/50" />
        </div>
        <button type="submit" className="w-full rounded-full bg-gradient-to-r from-primary to-accent px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_0_34px_hsl(var(--primary)/0.45)] transition-all hover:-translate-y-0.5 hover:opacity-95">
          Register and continue
        </button>
      </form>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button onClick={() => nav("/onboarding")} className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 px-4 py-3 text-sm transition-all hover:border-primary/40 hover:bg-black/[0.03]">
          <Github className="h-4 w-4" /> GitHub
        </button>
        <button onClick={() => nav("/onboarding")} className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 px-4 py-3 text-sm transition-all hover:border-primary/40 hover:bg-black/[0.03]">
          <Chrome className="h-4 w-4" /> Google
        </button>
      </div>
    </AuthShell>
  );
};

export default Register;
