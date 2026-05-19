import { Command } from "cmdk";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, GitBranch, Siren, Network, Workflow, BarChart3, LayoutDashboard, Sparkles, Rocket, ShieldCheck, RotateCcw } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

export const CommandPalette = ({ open, onOpenChange }: Props) => {
  const nav = useNavigate();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); onOpenChange(!open); }
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const go = (to: string) => { nav(to); onOpenChange(false); };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-background/70 backdrop-blur-sm animate-fade-in" onClick={() => onOpenChange(false)}>
      <Command className="w-full max-w-xl glass-strong rounded-xl overflow-hidden border-primary/30 shadow-[0_0_60px_hsl(var(--primary)/0.3)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 border-b border-border">
          <Sparkles className="h-4 w-4 text-primary" />
          <Command.Input placeholder="Run a command, jump to a service, ask Forge..." className="flex-1 h-12 bg-transparent outline-none text-sm" />
          <kbd className="mono text-[10px] px-1.5 py-0.5 rounded bg-secondary border border-border">ESC</kbd>
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">No matches.</Command.Empty>
          <Command.Group heading="Navigation" className="text-[10px] uppercase tracking-widest text-muted-foreground mono px-2 py-1">
            {[
              { i: LayoutDashboard, n: "Command Dashboard", p: "/" },
              { i: Bot, n: "AI Agents", p: "/agents" },
              { i: GitBranch, n: "CI/CD Intelligence", p: "/cicd" },
              { i: Siren, n: "Incident Command", p: "/incidents" },
              { i: Network, n: "Architecture Intelligence", p: "/architecture" },
              { i: Workflow, n: "Workflow Studio", p: "/workflows" },
              { i: BarChart3, n: "Analytics & Insights", p: "/analytics" },
            ].map(x => (
              <Command.Item key={x.p} onSelect={() => go(x.p)} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer data-[selected=true]:bg-primary/15 data-[selected=true]:text-primary">
                <x.i className="h-4 w-4" /> {x.n}
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Group heading="Actions" className="text-[10px] uppercase tracking-widest text-muted-foreground mono px-2 py-1 mt-2">
            {[
              { i: Rocket, n: "Deploy orders-svc v2.14.3 → production" },
              { i: RotateCcw, n: "Rollback billing-svc to v1.21.9" },
              { i: ShieldCheck, n: "Run security scan across all services" },
            ].map(x => (
              <Command.Item key={x.n} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer data-[selected=true]:bg-accent/15 data-[selected=true]:text-accent">
                <x.i className="h-4 w-4" /> {x.n}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
};
