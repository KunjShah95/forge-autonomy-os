import { useState, useEffect } from "react";
import { MetricCard, Panel, StatusPill } from "@/components/ui-kit/Panels";
import { Rocket, ShieldCheck, Activity, Bot, TrendingUp, AlertTriangle, Zap } from "lucide-react";
import { ServiceGraph } from "@/components/ServiceGraph";
import { LogStream } from "@/components/LogStream";
import { incidents, deployments, velocityData } from "@/lib/mock";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiClient, ApiDecision } from "@/lib/apiClient";

const Dashboard = () => {
  const [isLive, setIsLive] = useState(false);
  const [decisions, setDecisions] = useState<ApiDecision[]>([]);
  const [loadingSim, setLoadingSim] = useState(false);

  // Poll for connection health and decisions feed
  const loadData = async () => {
    const health = await apiClient.getHealth();
    setIsLive(health.isLive);
    const data = await apiClient.getDecisions();
    setDecisions(data);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000); // poll every 4s
    return () => clearInterval(interval);
  }, []);

  const handleSimulate = async () => {
    setLoadingSim(true);
    await apiClient.simulateAction();
    await loadData();
    setLoadingSim(false);
  };

  return (
    <div className="space-y-6">
      {/* Hero / Header */}
      <div className="relative glass rounded-2xl p-6 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-accent/10 blur-3xl rounded-full pointer-events-none" />
        
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <div className="mono text-[10px] uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                <span className="status-dot bg-neon-green animate-pulse-glow" /> Production Operating System · live
              </div>
              
              {/* Dynamic live connection status indicator (Sprint 1 B-004) */}
              {isLive ? (
                <span className="mono text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 select-none">
                  ● Live API Connected
                </span>
              ) : (
                <span className="mono text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 select-none">
                  ▲ Offline Fallback Mode (Mock)
                </span>
              )}
            </div>
            
            <h1 className="font-display text-4xl font-bold tracking-tight">Command Dashboard</h1>
            <p className="text-muted-foreground mt-2 text-sm max-w-xl">
              Autonomous orchestration across 14 services, 6 AI agents, 4 environments. The Autonomous OS for Software Production.
            </p>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={handleSimulate}
              disabled={loadingSim}
              className="mono text-xs px-3 py-2 rounded-md border border-border hover:border-primary/40 transition flex items-center gap-2 bg-[#000000]/10 hover:bg-[#000000]/20 disabled:opacity-50"
            >
              <Zap className={`h-3.5 w-3.5 ${loadingSim ? 'animate-spin' : ''}`} /> 
              {loadingSim ? "Simulating..." : "Trigger simulation"}
            </button>
            <button className="mono text-xs px-3 py-2 rounded-md bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.4)] flex items-center gap-2">
              <Rocket className="h-3.5 w-3.5" /> Deploy v2.14.3
            </button>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Deployments today" value="47" delta="▲ 12% vs avg" icon={Rocket} accent="primary" />
        <MetricCard label="AI-resolved incidents" value="23" delta="84% autonomy" icon={ShieldCheck} accent="neon-green" />
        <MetricCard label="System health score" value="98.4" delta="all SLOs nominal" icon={Activity} accent="accent" />
        <MetricCard label="Active AI agents" value="6/6" delta="2,418 decisions / 24h" icon={Bot} accent="primary" />
      </div>

      {/* Topology + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel eyebrow="Live topology" title="Service Dependency Graph" className="lg:col-span-2 h-[480px]"
          actions={<span className="mono text-[10px] text-muted-foreground">9 services · 11 edges</span>}>
          <ServiceGraph height={420} />
        </Panel>
        <div className="space-y-4">
          <Panel eyebrow="AI insight" title="Production Insights" className="">
            <div className="p-5 space-y-3 text-sm">
              <div className="flex gap-2"><TrendingUp className="h-4 w-4 text-primary mt-0.5" /><span><b>billing-svc</b> p99 trending up — recommend canary at 5%.</span></div>
              <div className="flex gap-2"><AlertTriangle className="h-4 w-4 text-neon-amber mt-0.5" /><span>Bottleneck: <b>search → ml-inference</b> at +312% RPS.</span></div>
              <div className="flex gap-2"><ShieldCheck className="h-4 w-4 text-neon-green mt-0.5" /><span>Security: <b>0 unpatched CVEs</b> across prod tree.</span></div>
              <div className="flex gap-2"><Bot className="h-4 w-4 text-accent mt-0.5" /><span>PM Agent reprioritized 4 backlog items based on incident pattern.</span></div>
            </div>
          </Panel>
          <Panel eyebrow="Velocity" title="14-day production rhythm" className="">
            <div className="h-[180px] p-3">
              <ResponsiveContainer>
                <AreaChart data={velocityData} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="deploys" stroke="hsl(var(--primary))" fill="url(#g1)" strokeWidth={2} />
                  <Area type="monotone" dataKey="ai" stroke="hsl(var(--accent))" fill="url(#g2)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>

      {/* Live + decisions + deployments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel eyebrow="Terminal" title="Live Event Stream" className="h-[360px] relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent animate-scan" />
          <LogStream />
        </Panel>
        
        {/* Statefully driven Decision Feed (Sprint 1 B-003 / B-004) */}
        <Panel eyebrow="Autonomous" title="Decision Feed" className="h-[360px]">
          <div className="p-4 space-y-3 text-sm overflow-y-auto h-full">
            {decisions.map((d, i) => (
              <div key={d.id || i} className="p-3 rounded-lg border border-border bg-secondary/40 hover:border-primary/30 transition group">
                <div className="flex items-center justify-between mb-1">
                  <span className="mono text-[10px] text-accent uppercase tracking-widest">{d.agent}</span>
                  <span className="mono text-[10px] text-muted-foreground">risk {d.risk}</span>
                </div>
                <div className="font-medium text-sm">{d.action}</div>
                <div className="text-xs text-muted-foreground mt-1">{d.reason}</div>
              </div>
            ))}
          </div>
        </Panel>
        
        <Panel eyebrow="Pipeline" title="Active Deployments" className="h-[360px]">
          <div className="p-2 overflow-y-auto h-full">
            <table className="w-full text-xs">
              <tbody>
                {deployments.map(d => (
                  <tr key={d.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 px-2">
                      <div className="mono text-[11px]">{d.service}</div>
                      <div className="mono text-[10px] text-muted-foreground">{d.version} · {d.env}</div>
                    </td>
                    <td className="px-2"><StatusPill status={d.status} /></td>
                    <td className="px-2 mono text-[10px] text-muted-foreground text-right">
                      risk <span className={d.risk > 60 ? "text-neon-red" : d.risk > 30 ? "text-neon-amber" : "text-neon-green"}>{d.risk}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* Incidents */}
      <Panel eyebrow="Active" title="Incident Monitoring">
        <div className="divide-y divide-border">
          {incidents.map(i => (
            <div key={i.id} className="flex items-center gap-4 px-5 py-3 hover:bg-secondary/40 transition">
              <span className="mono text-[11px] text-muted-foreground w-20">{i.id}</span>
              <StatusPill status={i.severity} />
              <span className="text-sm flex-1">{i.title}</span>
              <span className="mono text-[10px] text-accent">{i.owner}</span>
              <StatusPill status={i.status} />
              <span className="mono text-[10px] text-muted-foreground w-16 text-right">{i.time}</span>
              <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${i.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
};

export default Dashboard;
