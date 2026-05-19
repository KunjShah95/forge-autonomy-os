import { services, edges } from "@/lib/mock";
import { useState } from "react";

const statusColor = (s: string) =>
  s === "healthy" ? "hsl(var(--neon-green))" :
  s === "degraded" ? "hsl(var(--neon-amber))" :
  s === "warning" ? "hsl(var(--neon-amber))" : "hsl(var(--neon-red))";

export const ServiceGraph = ({ height = 420 }: { height?: number }) => {
  const [hover, setHover] = useState<string | null>(null);
  const map = Object.fromEntries(services.map(s => [s.id, s]));

  return (
    <div className="relative w-full" style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="edge" x1="0" x2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.3" />
          </linearGradient>
          <radialGradient id="node-glow">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </radialGradient>
        </defs>
        {edges.map(([a, b], i) => {
          const A = map[a], B = map[b];
          const active = hover === a || hover === b;
          return (
            <g key={i}>
              <line x1={A.x} y1={A.y} x2={B.x} y2={B.y}
                stroke="url(#edge)" strokeWidth={active ? 0.4 : 0.2}
                strokeDasharray="1 1" className="animate-dash" opacity={active ? 1 : 0.7} vectorEffect="non-scaling-stroke" />
            </g>
          );
        })}
      </svg>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        {services.map(s => (
          <g key={s.id} onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
            <circle cx={s.x} cy={s.y} r="3" fill="url(#node-glow)" opacity="0.6" />
            <circle cx={s.x} cy={s.y} r="1.4" fill={statusColor(s.status)} vectorEffect="non-scaling-stroke" />
            <circle cx={s.x} cy={s.y} r="1.4" fill="none" stroke={statusColor(s.status)} strokeWidth="0.2" className="animate-ping-slow" vectorEffect="non-scaling-stroke" />
          </g>
        ))}
      </svg>
      {/* Labels in HTML for crisp text */}
      <div className="absolute inset-0 pointer-events-none">
        {services.map(s => (
          <div key={s.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 mono text-[10px] whitespace-nowrap"
            style={{ left: `${s.x}%`, top: `${s.y + 5}%` }}>
            <span className="px-1.5 py-0.5 rounded bg-background/80 border border-border backdrop-blur-sm">
              {s.name} <span style={{ color: statusColor(s.status) }}>· {s.health}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
