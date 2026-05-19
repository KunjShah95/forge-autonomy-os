import { PageHeader, Panel, StatusPill } from "@/components/ui-kit/Panels";
import { incidents, latencyData } from "@/lib/mock";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceArea } from "recharts";
import { Siren, RotateCcw, Play, Sparkles } from "lucide-react";

const Incidents = () => {
  const active = incidents.filter(i => i.status !== "auto-resolved" && i.status !== "rolled-back");
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="war room" title="Incident Command Center"
        desc="Real-time anomaly detection, AI-driven root-cause analysis, autonomous remediation."
        actions={<button className="mono text-xs px-3 py-2 rounded-md border border-neon-red/40 text-neon-red bg-neon-red/10"><Siren className="h-3 w-3 inline mr-1.5" />Declare incident</button>} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel eyebrow="active" title="Open Incidents" className="lg:col-span-1">
          <div className="divide-y divide-border">
            {active.map(i => (
              <div key={i.id} className="p-4 hover:bg-secondary/40 cursor-pointer">
                <div className="flex items-center justify-between mb-1">
                  <span className="mono text-[10px] text-muted-foreground">{i.id}</span>
                  <StatusPill status={i.severity} />
                </div>
                <div className="text-sm font-medium">{i.title}</div>
                <div className="mono text-[10px] text-muted-foreground mt-1">{i.owner} · {i.time}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel eyebrow="anomaly detection · billing-svc" title="p99 latency" className="lg:col-span-2 h-[320px]">
          <div className="p-3 h-full">
            <ResponsiveContainer>
              <LineChart data={latencyData} margin={{ top: 6, right: 12, left: -10, bottom: 0 }}>
                <XAxis dataKey="t" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <ReferenceArea x1="16h" x2="20h" fill="hsl(var(--neon-red))" fillOpacity={0.08} />
                <Line type="monotone" dataKey="p50" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="p99" stroke="hsl(var(--neon-pink))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel eyebrow="INC-2847" title="Root Cause Analysis Timeline">
          <div className="p-5 space-y-4">
            {[
              { t: "00:14:22", e: "p99 spike detected", c: "anomaly" },
              { t: "00:14:25", e: "Correlated with deploy of billing-svc v1.22.0", c: "correlation" },
              { t: "00:14:28", e: "Diff isolated to connection pool config change", c: "diff" },
              { t: "00:14:33", e: "Rollback plan drafted; canary alternative scored 73", c: "plan" },
              { t: "00:14:38", e: "Awaiting human approval (auto-execute in 4:22)", c: "pending" },
            ].map((s, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
                  {i < 4 && <div className="flex-1 w-px bg-border my-1" />}
                </div>
                <div className="flex-1 pb-2">
                  <div className="mono text-[10px] text-muted-foreground">{s.t} · {s.c}</div>
                  <div className="text-sm">{s.e}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel eyebrow="AI remediation" title="Proposed Plan">
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="mono text-[10px] uppercase tracking-widest text-primary">SRE Agent · confidence 94%</span>
            </div>
            <ol className="space-y-2 text-sm">
              <li className="flex gap-2"><span className="mono text-[10px] text-muted-foreground mt-0.5">01</span> Drain billing-svc canary traffic to 0%</li>
              <li className="flex gap-2"><span className="mono text-[10px] text-muted-foreground mt-0.5">02</span> Rollback to v1.21.9 (pinned stable)</li>
              <li className="flex gap-2"><span className="mono text-[10px] text-muted-foreground mt-0.5">03</span> Open hotfix PR with pool fallback + observability</li>
              <li className="flex gap-2"><span className="mono text-[10px] text-muted-foreground mt-0.5">04</span> Re-run synthesized regression set (47 tests)</li>
              <li className="flex gap-2"><span className="mono text-[10px] text-muted-foreground mt-0.5">05</span> Post-mortem auto-drafted in 12m</li>
            </ol>
            <div className="flex gap-2 pt-3 border-t border-border">
              <button className="mono text-[10px] px-2.5 py-1.5 rounded bg-gradient-to-r from-primary to-accent text-primary-foreground flex items-center gap-1"><Play className="h-3 w-3" />Approve & execute</button>
              <button className="mono text-[10px] px-2.5 py-1.5 rounded border border-border flex items-center gap-1"><RotateCcw className="h-3 w-3" />Auto-rollback only</button>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default Incidents;
