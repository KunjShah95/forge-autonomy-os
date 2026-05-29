import { PageHeader, Panel, StatusPill } from "@/components/ui-kit/Panels";
import { agents } from "@/lib/mock";
import * as Icons from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { apiClient, ReplaySession, RoleCheckResult } from "@/lib/apiClient";
import { RotateCcw, Shield, CheckCircle2, XCircle } from "lucide-react";

const Agents = () => {
  const [open, setOpen] = useState<string | null>(null);
  const [replaySessions, setReplaySessions] = useState<Record<string, ReplaySession>>({});
  const [replaying, setReplaying] = useState<string | null>(null);
  const [rbacResult, setRbacResult] = useState<RoleCheckResult | null>(null);
  const current = agents.find(a => a.id === open);

  // Check RBAC on mount
  useEffect(() => {
    apiClient.checkRbacAccess({
      user_id: "demo-user",
      organization: "forge",
      action: "action:class_b"
    }).then(setRbacResult);
  }, []);

  const handleOpenTrace = async (agentId: string) => {
    setOpen(agentId);
    const agent = agents.find(a => a.id === agentId);
    if (agent && !replaySessions[agentId]) {
      const session = await apiClient.startReplay(`agent-${agentId}-trace`);
      setReplaySessions(prev => ({ ...prev, [agentId]: session }));
    }
  };

  const handleStepReplay = async (agentId: string) => {
    setReplaying(agentId);
    const session = replaySessions[agentId];
    if (session) {
      const updated = await apiClient.stepReplay(session.id);
      setReplaySessions(prev => ({ ...prev, [agentId]: updated }));
    }
    setReplaying(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="orchestration layer" title="AI Agents" desc="Six specialized agents collaborate continuously to drive your production system. Each operates under explicit policies with full audit trails." />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {agents.map(a => {
          const Icon = (Icons as any)[a.icon] || Icons.Bot;
          return (
            <button key={a.id} onClick={() => handleOpenTrace(a.id)}
              className="text-left glass glow-border rounded-xl p-5 hover:border-primary/40 transition group relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/15 transition" />
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-display font-semibold">{a.name}</div>
                  <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">{a.role}</div>
                </div>
                <StatusPill status={a.status} />
              </div>
              <p className="text-sm text-muted-foreground mb-4">{a.desc}</p>
              <div className="space-y-2">
                <div className="flex justify-between mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span>Confidence</span><span className="text-primary">{a.confidence}%</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${a.confidence}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border">
                <div><div className="mono text-[9px] uppercase text-muted-foreground">Tasks</div><div className="font-display text-lg">{a.tasks}</div></div>
                <div><div className="mono text-[9px] uppercase text-muted-foreground">Decisions</div><div className="font-display text-lg">{a.decisions}</div></div>
                <div><div className="mono text-[9px] uppercase text-muted-foreground">MTTR</div><div className="font-display text-lg">{a.mttr}</div></div>
              </div>
            </button>
          );
        })}
      </div>

      <Dialog open={!!open} onOpenChange={() => setOpen(null)}>
        <DialogContent className="glass-strong border-primary/30 max-w-2xl">
          {current && (
            <>
              <DialogHeader>
                <div className="mono text-[10px] uppercase tracking-widest text-primary">{current.role}</div>
                <DialogTitle className="font-display text-2xl">{current.name} · Decision Trace</DialogTitle>
                <DialogDescription>{current.desc}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 mt-4">
                {replaySessions[current.id] && (
                  <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="mono text-[10px] uppercase tracking-widest text-primary">
                        Replay: step {replaySessions[current.id].current_step}/{replaySessions[current.id].total_steps}
                      </span>
                      <button onClick={() => handleStepReplay(current.id)} disabled={replaying === current.id}
                        className="mono text-[10px] px-2 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50 flex items-center gap-1">
                        <RotateCcw className="h-3 w-3" />
                        {replaying === current.id ? "..." : "Step forward"}
                      </button>
                    </div>
                    {replaySessions[current.id].steps.slice(0, replaySessions[current.id].current_step + 1).map((step, i) => (
                      <div key={i} className="flex gap-2 items-start text-xs mono text-muted-foreground py-1">
                        <span className="text-primary mt-1">●</span>
                        <div className="flex-1">
                          <span className="text-[10px] uppercase text-primary">{step.type}</span>
                          <div className="text-xs">{step.summary}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {[
                  { t: "00:14:22", d: "Observed p99 spike in billing-svc (212ms → 384ms)", c: 96 },
                  { t: "00:14:28", d: "Correlated with new connection pool config in v1.22.0", c: 91 },
                  { t: "00:14:31", d: "Drafted rollback plan + canary alternative", c: 88 },
                  { t: "00:14:33", d: "Notified DevOps Agent + awaiting human approval", c: 94 },
                ].map((s, i) => (
                  <div key={i} className="flex gap-4 p-3 rounded-lg bg-secondary/40 border border-border">
                    <div className="mono text-[10px] text-muted-foreground w-20">{s.t}</div>
                    <div className="flex-1 text-sm">{s.d}</div>
                    <div className="mono text-[10px] text-primary">conf {s.c}%</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                  <Shield className="h-3 w-3" /> Access Control
                </div>
                {rbacResult ? (
                  <div className="flex items-center gap-2 text-xs">
                    {rbacResult.allowed ? 
                      <CheckCircle2 className="h-3.5 w-3.5 text-neon-green" /> : 
                      <XCircle className="h-3.5 w-3.5 text-neon-red" />
                    }
                    <span>{rbacResult.role} · {rbacResult.reason}</span>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">Checking permissions...</div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Agents;
