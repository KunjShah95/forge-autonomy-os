import { useState, useEffect } from "react";
import { PageHeader, Panel, StatusPill } from "@/components/ui-kit/Panels";
import { incidents, latencyData } from "@/lib/mock";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceArea } from "recharts";
import { Siren, RotateCcw, Play, Sparkles, FileText } from "lucide-react";
import { apiClient, IncidentSummary, IncidentSchema } from "@/lib/apiClient";

const Incidents = () => {
  const [apiIncidents, setApiIncidents] = useState<IncidentSchema[]>([]);
  const [summaries, setSummaries] = useState<Record<string, IncidentSummary>>({});
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState<string | null>(null);

  useEffect(() => {
    apiClient.listIncidents().then(setApiIncidents);
  }, []);

  const handleSummarize = async (id: string) => {
    setSummarizing(id);
    const summary = await apiClient.summarizeIncident(id, `trace-${id}`);
    setSummaries(prev => ({ ...prev, [id]: summary }));
    setSelectedIncident(id);
    setSummarizing(null);
  };

  const active = incidents.filter(i => i.status !== "auto-resolved" && i.status !== "rolled-back");
  const displayedIncidents = apiIncidents.length > 0 ? apiIncidents : active;
  const selectedSummary = selectedIncident ? summaries[selectedIncident] : null;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="war room" title="Incident Command Center"
        desc="Real-time anomaly detection, AI-driven root-cause analysis, autonomous remediation."
        actions={<button className="mono text-xs px-3 py-2 rounded-md border border-neon-red/40 text-neon-red bg-neon-red/10"><Siren className="h-3 w-3 inline mr-1.5" />Declare incident</button>} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel eyebrow="active" title="Open Incidents" className="lg:col-span-1">
          <div className="divide-y divide-border overflow-y-auto max-h-[360px]">
            {displayedIncidents.map((i: any) => (
              <div key={i.id} className="p-4 hover:bg-secondary/40 cursor-pointer transition" onClick={() => handleSummarize(i.id)}>
                <div className="flex items-center justify-between mb-1">
                  <span className="mono text-[10px] text-muted-foreground">{i.id}</span>
                  <StatusPill status={i.severity || "unknown"} />
                </div>
                <div className="text-sm font-medium">{i.title || i.description}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="mono text-[10px] text-muted-foreground">{i.owner || "AI Agent"} · {i.time || "just now"}</span>
                  {summarizing === i.id && <span className="mono text-[9px] text-primary animate-pulse">summarizing...</span>}
                </div>
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
        <Panel eyebrow={selectedSummary ? selectedSummary.incident_id : "selected incident"} title={selectedSummary ? selectedSummary.title : "Root Cause Analysis Timeline"}>
          <div className="p-5 space-y-4">
            {selectedSummary ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <StatusPill status={selectedSummary.severity} />
                  <span className="mono text-[10px] text-muted-foreground">confidence {Math.round(selectedSummary.confidence * 100)}%</span>
                  <span className="mono text-[10px] text-accent">{selectedSummary.status}</span>
                </div>
                <div className="p-3 rounded-lg bg-secondary/40 border border-border">
                  <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Root Cause</div>
                  <div className="text-sm">{selectedSummary.root_cause}</div>
                </div>
                <div className="p-3 rounded-lg bg-secondary/40 border border-border">
                  <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Impact</div>
                  <div className="text-sm">{selectedSummary.impact}</div>
                </div>
                <div className="p-3 rounded-lg bg-secondary/40 border border-border">
                  <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Mitigation</div>
                  <div className="text-sm">{selectedSummary.mitigation}</div>
                </div>
                {selectedSummary.prevention.length > 0 && (
                  <div className="p-3 rounded-lg bg-secondary/40 border border-border">
                    <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Prevention</div>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {selectedSummary.prevention.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </div>
                )}
                {selectedSummary.timeline.length > 0 && (
                  <div className="space-y-2">
                    <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">Timeline</div>
                    {selectedSummary.timeline.map((s, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
                          {i < selectedSummary.timeline.length - 1 && <div className="flex-1 w-px bg-border my-1" />}
                        </div>
                        <div className="flex-1 pb-2">
                          <div className="mono text-[10px] text-muted-foreground">{s.timestamp} · {s.type}</div>
                          <div className="text-sm">{s.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
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
              </>
            )}
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
