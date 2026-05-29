import { PageHeader, Panel, StatusPill } from "@/components/ui-kit/Panels";
import { useState, useRef, useEffect } from "react";
import { GitBranch, Bot, Rocket, ShieldAlert, AlertCircle, Webhook, Plus, Bug, RotateCcw, Sparkles, FlaskConical } from "lucide-react";
import { apiClient, InjectedScenario, ReplaySession } from "@/lib/apiClient";

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

const scenarioDescriptions: Record<string, string> = {
  dependency_mismatch: "A PR introduces a dependency that doesn't resolve in CI.",
  config_error: "A config change causes a type error during build.",
  flaky_test: "A CI pipeline fails due to a timeout in integration tests.",
  latency_spike: "A production latency spike triggers auto-rollback.",
};

const Workflows = () => {
  const [nodes, setNodes] = useState(initial);
  const [drag, setDrag] = useState<{ id: string; ox: number; oy: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [scenarios, setScenarios] = useState<Record<string, {description: string}>>({});
  const [injectingScenario, setInjectingScenario] = useState<string | null>(null);
  const [injectedScenario, setInjectedScenario] = useState<InjectedScenario | null>(null);
  const [replaySession, setReplaySession] = useState<ReplaySession | null>(null);
  const [replaying, setReplaying] = useState(false);

  useEffect(() => {
    apiClient.getDemoScenarios().then(data => setScenarios(data.scenarios));
  }, []);

  const handleInjectFailure = async (scenario: string) => {
    setInjectingScenario(scenario);
    const result = await apiClient.injectDemoFailure(scenario, "live");
    setInjectedScenario(result);
    setInjectingScenario(null);
  };

  const handleStartReplay = async (traceId: string) => {
    const session = await apiClient.startReplay(traceId);
    setReplaySession(session);
  };

  const handleStepReplay = async () => {
    if (!replaySession) return;
    setReplaying(true);
    const session = await apiClient.stepReplay(replaySession.id);
    setReplaySession(session);
    setReplaying(false);
  };

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

        <div className="col-span-10 space-y-4">
          <Panel eyebrow="demo controls" title="Failure Injection & Replay"
            actions={<span className="mono text-[10px] text-muted-foreground">{Object.keys(scenarios).length} scenarios available</span>}>
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                {Object.keys(scenarioDescriptions).map(scenario => (
                  <button key={scenario} onClick={() => handleInjectFailure(scenario)} disabled={injectingScenario === scenario}
                    className="mono text-[10px] px-2.5 py-1.5 rounded border border-border hover:border-primary/40 transition flex items-center gap-1.5">
                    <Bug className="h-3 w-3" />
                    {injectingScenario === scenario ? "Injecting..." : `Inject ${scenario.replace(/_/g, ' ')}`}
                  </button>
                ))}
              </div>
              {injectedScenario && (
                <div className="p-3 rounded-lg bg-accent/5 border border-accent/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-accent" />
                      <span className="mono text-[10px] uppercase tracking-widest text-accent">
                        Injected: {injectedScenario.scenario} · {injectedScenario.mode} mode
                      </span>
                    </div>
                    <button onClick={() => handleStartReplay(injectedScenario.trace_id)}
                      className="mono text-[10px] px-2 py-1 rounded border border-border flex items-center gap-1">
                      <RotateCcw className="h-3 w-3" /> Replay
                    </button>
                  </div>
                  <div className="mono text-[10px] text-muted-foreground">{injectedScenario.description}</div>
                  <div className="mono text-[10px] text-muted-foreground mt-1">trace: {injectedScenario.trace_id}</div>
                </div>
              )}
              {replaySession && (
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="mono text-[10px] uppercase tracking-widest text-primary">
                      Replay: step {replaySession.current_step}/{replaySession.total_steps} · {replaySession.status}
                    </span>
                    <button onClick={handleStepReplay} disabled={replaying || replaySession.current_step >= replaySession.total_steps}
                      className="mono text-[10px] px-2 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50">
                      {replaying ? 'Stepping...' : 'Step →'}
                    </button>
                  </div>
                  {replaySession.steps.slice(0, replaySession.current_step + 1).map((step, i) => (
                    <div key={i} className="flex gap-2 items-center text-xs mono text-muted-foreground py-1">
                      <span className="text-primary">●</span>
                      <span className="w-24">{step.type}</span>
                      <span>{step.summary}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Panel>

          <Panel className="h-[400px] overflow-hidden relative">
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
    </div>
  );
};

export default Workflows;
