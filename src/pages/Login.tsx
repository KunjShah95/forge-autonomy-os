import { useNavigate } from "react-router-dom";
import { Sparkles, Github, Chrome } from "lucide-react";
import { ServiceGraph } from "@/components/ServiceGraph";

const Login = () => {
  const nav = useNavigate();
  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2">
      {/* Left visual */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 overflow-hidden border-r border-border">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-primary/20 blur-3xl rounded-full" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/20 blur-3xl rounded-full" />
        <div className="relative flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_30px_hsl(var(--primary)/0.6)]">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display font-bold text-xl">ForgeAI</div>
            <div className="mono text-[10px] text-muted-foreground uppercase tracking-widest">production OS · v4.2</div>
          </div>
        </div>
        <div className="relative flex-1 my-10">
          <ServiceGraph height={420} />
        </div>
        <div className="relative">
          <div className="mono text-[10px] uppercase tracking-[0.2em] text-primary mb-2">manifesto</div>
          <h2 className="font-display text-3xl font-bold leading-tight max-w-md">The Autonomous Operating System for Software Production.</h2>
          <p className="text-muted-foreground text-sm mt-3 max-w-md">Six AI agents orchestrate your pipelines, incidents, architecture and risk — so humans operate above the system, not inside it.</p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-10">
        <div className="w-full max-w-sm">
          <div className="mono text-[10px] uppercase tracking-[0.2em] text-primary mb-2">Sign in</div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Enter command.</h1>
          <p className="text-muted-foreground text-sm mt-2">Authenticate to your production OS.</p>

          <form className="space-y-3 mt-8" onSubmit={(e) => { e.preventDefault(); nav("/onboarding"); }}>
            <div>
              <label className="mono text-[10px] uppercase tracking-widest text-muted-foreground">Work email</label>
              <input defaultValue="anton@forge.ai" className="mt-1 w-full bg-secondary/60 border border-border rounded-md px-3 py-2.5 text-sm outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="mono text-[10px] uppercase tracking-widest text-muted-foreground">Password</label>
              <input type="password" defaultValue="••••••••••" className="mt-1 w-full bg-secondary/60 border border-border rounded-md px-3 py-2.5 text-sm outline-none focus:border-primary/50" />
            </div>
            <button type="submit" className="w-full py-2.5 rounded-md bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium shadow-[0_0_30px_hsl(var(--primary)/0.4)] hover:opacity-90 transition">
              Continue →
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => nav("/onboarding")} className="flex items-center justify-center gap-2 py-2.5 rounded-md border border-border hover:border-primary/40 text-sm"><Github className="h-4 w-4" />GitHub</button>
            <button onClick={() => nav("/onboarding")} className="flex items-center justify-center gap-2 py-2.5 rounded-md border border-border hover:border-primary/40 text-sm"><Chrome className="h-4 w-4" />Google</button>
          </div>

          <button onClick={() => nav("/")} className="mt-8 mono text-[11px] text-muted-foreground hover:text-primary block">Skip → enter demo →</button>
        </div>
      </div>
    </div>
  );
};

export default Login;
