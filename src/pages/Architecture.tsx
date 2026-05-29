import { useState, useEffect } from "react";
import { PageHeader, Panel } from "@/components/ui-kit/Panels";
import { ServiceGraph } from "@/components/ServiceGraph";
import { Flame, Users, Sparkles, Shield, RotateCw } from "lucide-react";
import { apiClient, GuardianCheckResult, GuardianFinding } from "@/lib/apiClient";

const debt = [
  { svc: "billing-svc", debt: 84, owner: "Payments" },
  { svc: "ml-inference", debt: 71, owner: "AI Platform" },
  { svc: "search-svc", debt: 52, owner: "Discovery" },
  { svc: "orders-svc", debt: 38, owner: "Commerce" },
  { svc: "users-svc", debt: 24, owner: "Identity" },
  { svc: "auth-svc", debt: 18, owner: "Identity" },
  { svc: "ledger-svc", debt: 12, owner: "Payments" },
  { svc: "api-gateway", debt: 9, owner: "Platform" },
];

const severityColor: Record<string, string> = {
  critical: "bg-neon-red/5 border-neon-red/30 text-neon-red",
  warning: "bg-neon-amber/5 border-neon-amber/30 text-neon-amber",
  info: "bg-primary/5 border-primary/30 text-primary",
};

const Architecture = () => {
  const [guardianResult, setGuardianResult] = useState<GuardianCheckResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [selectedService, setSelectedService] = useState<string>("");

  const handleGuardianCheck = async (service?: string) => {
    setScanning(true);
    const result = await apiClient.runGuardianCheck(service);
    setGuardianResult(result);
    setSelectedService(service || "");
    setScanning(false);
  };

  useEffect(() => {
    handleGuardianCheck();
  }, []);

  const findings = guardianResult?.findings || [];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="systems intelligence" title="Architecture Intelligence"
        desc="A living map of your software. The Architecture Agent surfaces bottlenecks, debt, and structural recommendations."
        actions={
          <button onClick={() => handleGuardianCheck(selectedService)} disabled={scanning}
            className="mono text-xs px-3 py-2 rounded-md border border-border hover:border-primary/40 transition flex items-center gap-1.5">
            <RotateCw className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? "Scanning..." : "Run guardian check"}
          </button>
        } />

      <Panel eyebrow="topology" title="Microservice Dependency Graph" className="h-[520px]"
        actions={
          <span className="mono text-[10px] text-muted-foreground">
            {guardianResult ? `health score ${guardianResult.overall_health_score}/100` : "hover any node"}
          </span>
        }>
        <ServiceGraph height={460} />
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel eyebrow="hotspots" title="Guardian Findings" className="lg:col-span-1">
          <div className="p-5 space-y-3 text-sm overflow-y-auto max-h-[300px]">
            {findings.length > 0 ? findings.map((f, i) => (
              <div key={i} className={`p-3 rounded-lg border ${severityColor[f.severity] || severityColor.info}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="h-4 w-4" />
                  <span className="mono text-[10px] uppercase">{f.severity}</span>
                </div>
                <div className="text-sm font-medium">{f.title}</div>
                <div className="mono text-[10px] text-muted-foreground mt-1">{f.description}</div>
                <div className="mono text-[10px] text-muted-foreground mt-1">Score: {f.score} · {f.remediation}</div>
              </div>
            )) : (
              <>
                <div className="p-3 rounded-lg bg-neon-red/5 border border-neon-red/30">
                  <div className="flex items-center gap-2 mb-1"><Flame className="h-4 w-4 text-neon-red" /><span className="mono text-[10px] uppercase text-neon-red">critical</span></div>
                  <div>search-svc → ml-inference</div>
                  <div className="mono text-[10px] text-muted-foreground mt-1">RPS +312% · p99 1.4s · queue depth 8.2k</div>
                </div>
                <div className="p-3 rounded-lg bg-neon-amber/5 border border-neon-amber/30">
                  <div className="mono text-[10px] uppercase text-neon-amber mb-1">moderate</div>
                  <div>billing-svc → ledger-svc</div>
                  <div className="mono text-[10px] text-muted-foreground mt-1">N+1 query pattern detected</div>
                </div>
              </>
            )}
          </div>
        </Panel>

        <Panel eyebrow="technical debt" title="Heatmap" className="lg:col-span-2">
          <div className="p-5 space-y-2">
            {debt.map(d => (
              <div key={d.svc} className="flex items-center gap-3">
                <div className="mono text-xs w-32 truncate">{d.svc}</div>
                <div className="flex-1 h-6 bg-secondary rounded overflow-hidden relative">
                  <div className="h-full transition-all" style={{
                    width: `${d.debt}%`,
                    background: `linear-gradient(90deg, hsl(var(--neon-green)) 0%, hsl(var(--neon-amber)) 50%, hsl(var(--neon-red)) 100%)`,
                    opacity: 0.85,
                  }} />
                  <div className="absolute inset-0 flex items-center px-2 mono text-[10px] text-foreground/90">{d.debt}</div>
                </div>
                <div className="mono text-[10px] text-muted-foreground w-24 text-right flex items-center justify-end gap-1"><Users className="h-3 w-3" />{d.owner}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel eyebrow="architecture agent" title="Recommendations">
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          {(findings.length > 0 ? findings : []).map((f, i) => (
            <div key={i} className="p-4 rounded-lg border border-border bg-secondary/40 hover:border-primary/40 transition">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span className="mono text-[10px] uppercase tracking-widest text-primary">score {f.score}</span>
              </div>
              <div className="font-display font-semibold mb-1">{f.title}</div>
              <div className="text-xs text-muted-foreground">{f.description}</div>
              <div className="mono text-[10px] text-accent mt-2">{f.remediation}</div>
            </div>
          ))}
          {findings.length === 0 && [
            { t: "Extract payments-svc", d: "Split billing-svc payment flows → reduces debt 18%, decouples ledger writes.", c: 88 },
            { t: "Add read replica for users-svc", d: "Read/write ratio is 12:1. Shift /me + /profile to replica.", c: 92 },
            { t: "Introduce ml-inference cache", d: "73% of queries are repeat embeddings. LRU + redis cuts p99 by 60%.", c: 84 },
          ].map((r, i) => (
            <div key={i} className="p-4 rounded-lg border border-border bg-secondary/40 hover:border-primary/40 transition">
              <div className="flex items-center gap-2 mb-2"><Sparkles className="h-3.5 w-3.5 text-primary" /><span className="mono text-[10px] uppercase tracking-widest text-primary">conf {r.c}%</span></div>
              <div className="font-display font-semibold mb-1">{r.t}</div>
              <div className="text-xs text-muted-foreground">{r.d}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
};

export default Architecture;
