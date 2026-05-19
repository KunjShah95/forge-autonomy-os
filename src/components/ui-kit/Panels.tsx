import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const PageHeader = ({ eyebrow, title, desc, actions }: { eyebrow?: string; title: string; desc?: string; actions?: ReactNode }) => (
  <div className="flex items-end justify-between gap-4 mb-6">
    <div>
      {eyebrow && <div className="mono text-[10px] uppercase tracking-[0.2em] text-primary mb-2">{eyebrow}</div>}
      <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
      {desc && <p className="text-muted-foreground mt-1 text-sm max-w-2xl">{desc}</p>}
    </div>
    {actions}
  </div>
);

export const MetricCard = ({ label, value, delta, icon: Icon, accent = "primary" }: { label: string; value: ReactNode; delta?: string; icon: any; accent?: "primary" | "accent" | "neon-green" | "neon-pink" | "neon-amber" }) => {
  const colorMap: Record<string, string> = {
    "primary": "text-primary",
    "accent": "text-accent",
    "neon-green": "text-neon-green",
    "neon-pink": "text-neon-pink",
    "neon-amber": "text-neon-amber",
  };
  return (
    <div className="glass glow-border rounded-xl p-5 relative overflow-hidden group hover:border-primary/30 transition">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-primary/5 to-accent/5 pointer-events-none" />
      <div className="flex items-start justify-between">
        <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className={cn("h-4 w-4", colorMap[accent])} />
      </div>
      <div className="font-display text-3xl font-bold mt-3">{value}</div>
      {delta && <div className={cn("mono text-[11px] mt-1", colorMap[accent])}>{delta}</div>}
    </div>
  );
};

export const Panel = ({ title, eyebrow, actions, children, className }: { title?: string; eyebrow?: string; actions?: ReactNode; children: ReactNode; className?: string }) => (
  <div className={cn("glass rounded-xl flex flex-col", className)}>
    {(title || actions) && (
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div>
          {eyebrow && <div className="mono text-[9px] uppercase tracking-widest text-primary">{eyebrow}</div>}
          {title && <div className="font-display font-semibold text-sm">{title}</div>}
        </div>
        {actions}
      </div>
    )}
    <div className="flex-1 min-h-0">{children}</div>
  </div>
);

export const StatusPill = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    healthy: "text-neon-green border-neon-green/40 bg-neon-green/10",
    deployed: "text-neon-green border-neon-green/40 bg-neon-green/10",
    active: "text-neon-green border-neon-green/40 bg-neon-green/10",
    watching: "text-primary border-primary/40 bg-primary/10",
    canary: "text-accent border-accent/40 bg-accent/10",
    testing: "text-accent border-accent/40 bg-accent/10",
    degraded: "text-neon-amber border-neon-amber/40 bg-neon-amber/10",
    warning: "text-neon-amber border-neon-amber/40 bg-neon-amber/10",
    investigating: "text-neon-amber border-neon-amber/40 bg-neon-amber/10",
    remediating: "text-primary border-primary/40 bg-primary/10",
    "auto-resolved": "text-neon-green border-neon-green/40 bg-neon-green/10",
    "rolled-back": "text-neon-pink border-neon-pink/40 bg-neon-pink/10",
    high: "text-neon-red border-neon-red/40 bg-neon-red/10",
    medium: "text-neon-amber border-neon-amber/40 bg-neon-amber/10",
    low: "text-primary border-primary/40 bg-primary/10",
  };
  return (
    <span className={cn("mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md border", map[status] || "text-muted-foreground border-border")}>
      {status}
    </span>
  );
};
