import { PageHeader, MetricCard, Panel } from "@/components/ui-kit/Panels";
import { velocityData, latencyData } from "@/lib/mock";
import { Area, AreaChart, Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Rocket, Clock, Bot, TrendingUp } from "lucide-react";

const Analytics = () => {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="insights" title="Analytics & Insights"
        desc="Engineering velocity, AI intervention effectiveness, and predictive outage analytics across all environments." />

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

        <Panel eyebrow="AI effectiveness" title="Autonomous actions by agent" className="h-[300px]">
          <div className="p-3 h-full">
            <ResponsiveContainer>
              <AreaChart data={velocityData} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="ai-g" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="ai" stroke="hsl(var(--accent))" fill="url(#ai-g)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
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
