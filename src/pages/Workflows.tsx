import { PageHeader, Panel } from "@/components/ui-kit/Panels";
import { useState, useRef } from "react";
import { GitBranch, Bot, Rocket, ShieldAlert, AlertCircle, Webhook, Plus } from "lucide-react";

interface Node { id: string; type: string; x: number; y: number; label: string; icon: any; }

const initial: Node[] = [
  { id: "1", type: "trigger", x: 60, y: 80, label: "On commit to main", icon: GitBranch },
  { id: "2", type: "agent", x: 280, y: 80, label: "QA Agent · generate tests", icon: Bot },
  { id: "3", type: "agent", x: 500, y: 80, label: "Security Agent · scan", icon: ShieldAlert },
  { id: "4", type: "action", x: 280, y: 240, label: "Canary deploy 10%", icon: Rocket },
  { id: "5", type: "condition", x: 500, y: 240, label: "If error budget < 1x", icon: AlertCircle },
  { id: "6", type: "action", x: 720, y: 240, label: "Webhook · notify on-call", icon: Webhook },
];

const links: [string, string][] = [["1","2"],["2","3"],["3","4"],["4","5"],["5","6"]];

const typeStyle: Record<string, string> = {
  trigger: "border-primary/50 bg-primary/10 text-primary",
  agent: "border-accent/50 bg-accent/10 text-accent",
  action: "border-neon-green/50 bg-neon-green/10 text-neon-green",
  condition: "border-neon-amber/50 bg-neon-amber/10 text-neon-amber",
};

const Workflows = () => {
  const [nodes, setNodes] = useState(initial);
  const [drag, setDrag] = useState<{ id: string; ox: number; oy: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const onDown = (e: React.MouseEvent, n: Node) => {
    const rect = ref.current!.getBoundingClientRect();
    setDrag({ id: n.id, ox: e.clientX - rect.left - n.x, oy: e.clientY - rect.top - n.y });
  };
  const onMove = (e: React.MouseEvent) => {
    if (!drag) return;
    const rect = ref.current!.getBoundingClientRect();
    setNodes(ns => ns.map(n => n.id === drag.id ? { ...n, x: e.clientX - rect.left - drag.ox, y: e.clientY - rect.top - drag.oy } : n));
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="autonomous workflow studio" title="Workflow Builder"
        desc="Compose AI-native production automations. Drag nodes, wire agents to triggers, deploy to live."
        actions={<div className="flex gap-2">
          <button className="mono text-xs px-3 py-2 rounded-md border border-border flex items-center gap-1.5"><Plus className="h-3 w-3" />Add node</button>
          <button className="mono text-xs px-3 py-2 rounded-md bg-gradient-to-r from-primary to-accent text-primary-foreground">Publish workflow</button>
        </div>} />

      <div className="grid grid-cols-12 gap-4">
        <Panel eyebrow="palette" title="Nodes" className="col-span-2">
          <div className="p-3 space-y-2 text-xs">
            {[
              { t: "Trigger · Webhook", s: "trigger" },
              { t: "Trigger · Schedule", s: "trigger" },
              { t: "QA Agent", s: "agent" },
              { t: "Security Agent", s: "agent" },
              { t: "DevOps Agent", s: "agent" },
              { t: "Condition · If", s: "condition" },
              { t: "Action · Deploy", s: "action" },
              { t: "Action · Notify", s: "action" },
            ].map((p, i) => (
              <div key={i} className={`px-2.5 py-2 rounded-md border ${typeStyle[p.s]} cursor-grab mono text-[10px]`}>
                {p.t}
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="col-span-10 h-[600px] overflow-hidden relative">
          <div ref={ref} onMouseMove={onMove} onMouseUp={() => setDrag(null)} onMouseLeave={() => setDrag(null)}
            className="absolute inset-0 bg-grid">
            {/* edges */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {links.map(([a, b], i) => {
                const A = nodes.find(n => n.id === a)!, B = nodes.find(n => n.id === b)!;
                const x1 = A.x + 90, y1 = A.y + 24, x2 = B.x + 10, y2 = B.y + 24;
                const mx = (x1 + x2) / 2;
                return (
                  <path key={i} d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                    stroke="hsl(var(--primary))" strokeOpacity="0.5" strokeWidth="1.5" fill="none"
                    strokeDasharray="4 3" className="animate-dash" />
                );
              })}
            </svg>
            {nodes.map(n => (
              <div key={n.id} onMouseDown={(e) => onDown(e, n)}
                className={`absolute select-none cursor-grab active:cursor-grabbing w-44 rounded-lg border-2 glass p-3 ${typeStyle[n.type]}`}
                style={{ left: n.x, top: n.y }}>
                <div className="flex items-center gap-2 mb-1">
                  <n.icon className="h-3.5 w-3.5" />
                  <span className="mono text-[9px] uppercase tracking-widest opacity-80">{n.type}</span>
                </div>
                <div className="text-xs font-medium text-foreground">{n.label}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default Workflows;
