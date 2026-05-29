import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Bot, GitBranch, Siren, Network, Workflow, BarChart3, Settings, Sparkles, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/app", label: "Command", icon: LayoutDashboard },
  { to: "/agents", label: "AI Agents", icon: Bot },
  { to: "/cicd", label: "CI/CD Intel", icon: GitBranch },
  { to: "/incidents", label: "Incidents", icon: Siren },
  { to: "/architecture", label: "Architecture", icon: Network },
  { to: "/workflows", label: "Workflows", icon: Workflow },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/policies", label: "Policies", icon: Shield },
];

export const AppSidebar = () => {
  const { pathname } = useLocation();
  return (
    <aside className="w-60 shrink-0 border-r border-border bg-sidebar/60 backdrop-blur-xl flex flex-col">
      <div className="h-16 flex items-center gap-2 px-5 border-b border-border">
        <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_20px_hsl(var(--primary)/0.5)]">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <div className="font-display font-bold text-sm tracking-tight">ForgeAI</div>
          <div className="mono text-[9px] text-muted-foreground uppercase tracking-widest">v4.2 · core</div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground px-3 mb-2">Operations</div>
        {nav.map((n) => {
          const active = pathname === n.to;
          return (
            <NavLink key={n.to} to={n.to}
              className={cn(
                "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all relative",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}>
              {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />}
              <n.icon className="h-4 w-4" />
              <span>{n.label}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border">
        <div className="glass rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="status-dot bg-neon-green animate-pulse-glow" />
            <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">System Health</span>
          </div>
          <div className="font-display text-2xl font-bold gradient-text">98.4%</div>
          <div className="mono text-[10px] text-muted-foreground">all SLOs nominal</div>
        </div>
        <NavLink to="/settings" className="mt-3 flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground">
          <Settings className="h-4 w-4" /> Settings
        </NavLink>
      </div>
    </aside>
  );
};
