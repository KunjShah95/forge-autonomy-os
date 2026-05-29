import { useState, useEffect } from "react";
import { PageHeader, MetricCard, Panel } from "@/components/ui-kit/Panels";
import { velocityData, latencyData } from "@/lib/mock";
import { Area, AreaChart, Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Rocket, Clock, Bot, TrendingUp, Gauge, Shield, FlaskConical } from "lucide-react";
import { apiClient, ClassificationResult, PolicyResult } from "@/lib/apiClient";

const Analytics = () => {
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [policyResult, setPolicyResult] = useState<PolicyResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runSampleAnalysis = async () => {
    setLoading(true);
    // Run a sample classification + policy evaluation to demonstrate API connectivity
    const cls = await apiClient.classifyFailure(
      "analytics-demo",
      "Error: Cannot find module 'react-dom' - dependency resolution failed"
    );
    setClassification(cls);
    const pol = await apiClient.evaluatePolicy({
      action: "auto-deploy",
      service: "billing-svc",
      risk_score: 72,
      confidence: 0.88,
      blast_radius: "medium",
      trace_id: "analytics-demo",
    });
    setPolicyResult(pol);
    setLoading(false);
  };

  useEffect(() => {
    runSampleAnalysis();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="insights" title="Analytics & Insights"
        desc="Engineering velocity, AI intervention effectiveness, and predictive outage analytics across all environments."
        actions={
          <button onClick={runSampleAnalysis} disabled={loading}
            className="mono text-xs px-3 py-2 rounded-md border border-border hover:border-primary/40 transition flex items-center gap-1.5">
            <FlaskConical className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? "Analyzing..." : "Run sample analysis"}
          </button>
        } />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Deploy frequency" value="14.2/d" delta="▲ DORA elite" icon={Rocket} accent="primary" />
        <MetricCard label="MTTR" value="6m 24s" delta="▼ 38% MoM" icon={Clock} accent="neon-green" />
        <MetricCard label="AI intervention rate" value="71%" delta="2,418 actions" icon={Bot} accent="accent" />
        <MetricCard label="Predicted outages avoided" value="9" delta="last 30d" icon={TrendingUp} accent="neon-amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel eyebrow="velocity" title="Deploys vs Incidents (14d)" className="h-[300px]">
          <div className="p-3 h-full">
            <ResponsiveContainer>
              <BarChart data={velocityData} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="deploys" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                <Bar dataKey="incidents" fill="hsl(var(--neon-pink))" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel eyebrow="reliability" title="p50 / p99 latency (24h)" className="h-[300px]">
          <div className="p-3 h-full">
            <ResponsiveContainer>
              <LineChart data={latencyData} margin={{ top: 6, right: 6, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="t" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="p50" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="p99" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel eyebrow="AI analysis" title="Sample Classification & Policy">
          <div className="p-5 space-y-3">
            {classification && (
              <div className="p-3 rounded-lg bg-accent/5 border border-accent/30">
                <div className="flex items-center gap-2 mb-1">
                  <Gauge className="h-3.5 w-3.5 text-accent" />
                  <span className="mono text-[10px] uppercase tracking-widest text-accent">Classifier result</span>
                </div>
                <div className="text-sm"><b>Type:</b> {classification.classification}</div>
                <div className="text-xs text-muted-foreground">confidence {Math.round(classification.confidence * 100)}%</div>
                <div className="text-xs text-muted-foreground mt-1">{classification.summary}</div>
              </div>
            )}
            {policyResult && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/30">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  <span className="mono text-[10px] uppercase tracking-widest text-primary">Policy evaluation</span>
                </div>
                <div className="text-sm"><b>Class:</b> {policyResult.action_class} · <b>Allowed:</b> {policyResult.allowed ? "✓" : "✗"}</div>
                <div className="text-xs text-muted-foreground">{policyResult.reason}</div>
              </div>
            )}
          </div>
        </Panel>

        <Panel eyebrow="team" title="Productivity index by squad">
          <div className="p-5 space-y-3">
            {[
              { team: "Commerce", v: 92 }, { team: "Identity", v: 88 }, { team: "Payments", v: 71 },
              { team: "Discovery", v: 84 }, { team: "AI Platform", v: 79 }, { team: "Platform", v: 94 },
            ].map(t => (
              <div key={t.team}>
                <div className="flex justify-between mono text-[11px] mb-1"><span>{t.team}</span><span className="text-primary">{t.v}</span></div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${t.v}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default Analytics;
