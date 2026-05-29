import { useState, useEffect } from "react";
import { PageHeader, Panel, StatusPill } from "@/components/ui-kit/Panels";
import { deployments } from "@/lib/mock";
import { apiClient, ClassificationResult, CanaryStatus, RiskScoreResult } from "@/lib/apiClient";
import { CheckCircle2, Circle, AlertTriangle, Play, RotateCcw, Sparkles, GitCommit, FlaskConical, Shield, Gauge } from "lucide-react";

const stages = ["source", "build", "test", "scan", "canary", "deploy"];

const CICD = () => {
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [canaries, setCanaries] = useState<CanaryStatus[]>([]);
  const [riskScores, setRiskScores] = useState<Record<string, RiskScoreResult>>({});
  const [promoting, setPromoting] = useState<string | null>(null);

  // Load canaries on mount
  useEffect(() => {
    apiClient.listCanaries().then(setCanaries);
  }, []);

  const handleClassify = async () => {
    setClassifying(true);
    const result = await apiClient.classifyFailure(
      "cicd-demo",
      "TypeError: Cannot read properties of undefined (reading 'pool') at src/db/connection.ts:42"
    );
    setClassification(result);
    setClassifying(false);
  };

  const handleStartCanary = async () => {
    const canary = await apiClient.startCanary({
      service: "users-svc",
      version: "v3.8.1",
      target_percentage: 25,
      bake_minutes: 10,
      trace_id: `canary-${Date.now()}`,
    });
    setCanaries(prev => [...prev, canary]);
  };

  const handlePromote = async (id: string) => {
    setPromoting(id);
    const result = await apiClient.promoteCanary(id);
    setCanaries(prev => prev.map(c => c.id === id ? result : c));
    setPromoting(null);
  };

  const handleRollback = async (id: string) => {
    const result = await apiClient.rollbackCanary(id);
    setCanaries(prev => prev.map(c => c.id === id ? result : c));
  };

  const handleScoreRisk = async (deploy: typeof deployments[0]) => {
    const result = await apiClient.scoreRisk({
      service: deploy.service,
      version: deploy.version,
      files_changed: Math.floor(Math.random() * 20) + 1,
      lines_added: Math.floor(Math.random() * 200) + 10,
      lines_removed: Math.floor(Math.random() * 50),
      is_config_change: deploy.risk > 40,
      previous_incidents_30d: deploy.risk > 60 ? 3 : 1,
      deployment_count_30d: 8,
      trace_id: `risk-${deploy.id}`,
    });
    setRiskScores(prev => ({ ...prev, [deploy.id]: result }));
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="continuous intelligence" title="CI/CD Intelligence"
        desc="Pipelines that diagnose themselves. AI proposes fixes, scores risk, and orchestrates canary rollouts with automatic rollback."
        actions={
          <div className="flex gap-2">
            <button onClick={handleClassify} disabled={classifying}
              className="mono text-xs px-3 py-2 rounded-md border border-border hover:border-primary/40 transition flex items-center gap-1.5">
              <FlaskConical className="h-3.5 w-3.5" /> {classifying ? "Classifying..." : "Classify failure"}
            </button>
            <button className="mono text-xs px-3 py-2 rounded-md bg-gradient-to-r from-primary to-accent text-primary-foreground">
              <Play className="h-3 w-3 inline mr-1.5" />Trigger pipeline
            </button>
          </div>
        } />

      {/* Pipeline visualization */}
      <Panel eyebrow="orders-svc · v2.14.3" title="Active Pipeline" actions={<span className="mono text-[10px] text-neon-green">● running · 02:14 elapsed</span>}>
        <div className="p-6">
          <div className="flex items-center gap-2">
            {stages.map((s, i) => {
              const done = i < 4, active = i === 4, pending = i > 4;
              return (
                <div key={s} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-2">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 ${
                      done ? "bg-neon-green/10 border-neon-green text-neon-green" :
                      active ? "bg-primary/10 border-primary text-primary animate-pulse-glow" :
                      "bg-secondary border-border text-muted-foreground"}`}>
                      {done ? <CheckCircle2 className="h-5 w-5" /> : active ? <div className="h-3 w-3 rounded-full bg-primary animate-pulse" /> : <Circle className="h-4 w-4" />}
                    </div>
                    <span className="mono text-[10px] uppercase tracking-widest">{s}</span>
                  </div>
                  {i < stages.length - 1 && (
                    <div className="flex-1 h-0.5 mx-2 relative bg-border overflow-hidden">
                      <div className={`absolute inset-y-0 left-0 ${done ? "w-full bg-neon-green" : active ? "w-1/2 bg-primary" : "w-0"}`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel eyebrow="AI diagnostic" title="Failed Build → Suggested Fix">
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-neon-red/5 border border-neon-red/30">
              <AlertTriangle className="h-4 w-4 text-neon-red mt-0.5" />
              <div className="text-xs flex-1 mono">
                <div className="font-semibold text-neon-red">FAIL · billing-svc/build #4127</div>
                <div className="text-muted-foreground mt-1">TypeError: Cannot read properties of undefined (reading 'pool') at src/db/connection.ts:42</div>
              </div>
            </div>

            {classification && (
              <div className="p-3 rounded-lg bg-accent/5 border border-accent/30">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-3.5 w-3.5 text-accent" />
                  <span className="mono text-[10px] uppercase tracking-widest text-accent">
                    Classified: {classification.classification} · conf {Math.round(classification.confidence * 100)}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{classification.summary}</p>
                {classification.evidence.length > 0 && (
                  <div className="mono text-[10px] bg-background/40 p-2 rounded border border-border">
                    {classification.evidence.map((e, i) => <div key={i} className="text-muted-foreground">{e}</div>)}
                  </div>
                )}
              </div>
            )}

            <div className="p-3 rounded-lg bg-primary/5 border border-primary/30">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="mono text-[10px] uppercase tracking-widest text-primary">QA Agent · proposed fix · conf 92%</span>
              </div>
              <pre className="mono text-[11px] bg-background/60 p-3 rounded border border-border overflow-x-auto">
{`- const pool = config.db.pool
+ const pool = config.db?.pool ?? defaultPool
+ if (!config.db?.pool) logger.warn('using default pool')`}
              </pre>
              <div className="flex gap-2 mt-3">
                <button className="mono text-[10px] px-2.5 py-1.5 rounded bg-primary text-primary-foreground">Apply & retry</button>
                <button className="mono text-[10px] px-2.5 py-1.5 rounded border border-border">View context</button>
              </div>
            </div>
          </div>
        </Panel>

        <Panel eyebrow="risk model" title="Deployment Risk Scoring"
          actions={<button onClick={() => handleScoreRisk(deployments[0])} className="mono text-[10px] px-2 py-1 rounded border border-border hover:border-primary/40"><Gauge className="h-3 w-3 inline mr-1" />Score all</button>}>
          <div className="p-5 space-y-3">
            {deployments.slice(0, 4).map(d => {
              const score = riskScores[d.id];
              const displayRisk = score ? score.overall_risk : d.risk;
              const displayLevel = score ? score.risk_level : (d.risk > 60 ? "high" : d.risk > 30 ? "moderate" : "low");
              const displayRec = score ? score.recommendation : (
                d.risk > 60 ? "high · 3 critical signals · rollback armed" :
                d.risk > 30 ? "moderate · canary recommended @ 10%" : "low · safe to fast-forward"
              );
              return (
                <div key={d.id} className="p-3 rounded-lg border border-border bg-secondary/40 hover:border-primary/30 transition cursor-pointer" onClick={() => handleScoreRisk(d)}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="mono text-xs">{d.service} <span className="text-muted-foreground">{d.version}</span></div>
                    <StatusPill status={d.status} />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
                      <div className={`h-full ${displayRisk > 60 ? "bg-neon-red" : displayRisk > 30 ? "bg-neon-amber" : "bg-neon-green"}`} style={{ width: `${displayRisk}%` }} />
                    </div>
                    <span className="mono text-xs w-10 text-right">{displayRisk}</span>
                  </div>
                  <div className="mono text-[10px] text-muted-foreground mt-1">{displayRec}</div>
                  {score && score.factors.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {score.factors.map((f, i) => (
                        <span key={i} className="mono text-[9px] px-1.5 py-0.5 rounded bg-background/60 border border-border/50" title={f.description}>
                          {f.name}: {f.score}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel eyebrow="canary" title="Rollout Controls" className="lg:col-span-2">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-display font-semibold">users-svc v3.8.1</div>
                <div className="mono text-[10px] text-muted-foreground">canary in progress · 12m bake · 0 errors</div>
              </div>
              <div className="flex gap-2">
                <button className="mono text-[10px] px-2.5 py-1.5 rounded border border-border flex items-center gap-1"><RotateCcw className="h-3 w-3" /> Rollback</button>
                <button className="mono text-[10px] px-2.5 py-1.5 rounded bg-primary text-primary-foreground">Promote 50%</button>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[5, 10, 25, 50, 100].map((p, i) => (
                <div key={p} className={`rounded-lg p-3 border ${i <= 2 ? "border-primary/40 bg-primary/10" : "border-border bg-secondary/40"}`}>
                  <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">stage {i + 1}</div>
                  <div className="font-display text-2xl font-bold">{p}%</div>
                  <div className="mono text-[10px] text-muted-foreground">{i <= 2 ? "✓ baked" : "queued"}</div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
        <Panel eyebrow="coverage" title="Test Intelligence">
          <div className="p-5 space-y-3">
            {[
              { svc: "orders-svc", c: 87, ai: 23 },
              { svc: "users-svc", c: 91, ai: 14 },
              { svc: "billing-svc", c: 76, ai: 41 },
              { svc: "auth-svc", c: 94, ai: 9 },
            ].map(t => (
              <div key={t.svc}>
                <div className="flex justify-between mono text-[11px] mb-1">
                  <span>{t.svc}</span>
                  <span><span className="text-accent">+{t.ai}</span> ai · <span className="text-primary">{t.c}%</span></span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${t.c}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default CICD;
