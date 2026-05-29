import { PageHeader, Panel, StatusPill } from "@/components/ui-kit/Panels";
import { useState, useRef, useEffect } from "react";
import {
  GitBranch, Bot, Rocket, ShieldAlert, AlertCircle, Webhook, Plus, Bug,
  RotateCcw, Sparkles, FlaskConical, Save, Download, Trash2, ChevronRight,
  Settings2, X, GripVertical, Check, Play
} from "lucide-react";
import { apiClient, InjectedScenario, ReplaySession } from "@/lib/apiClient";

interface WorkflowNode {
  id: string; type: string; x: number; y: number; label: string; icon: any;
  description?: string; properties?: Array<{key: string; label: string; type: string; value: any; options?: string[]}>;
}

interface WorkflowLink { source: string; target: string; label?: string; }

interface WorkflowDefinition {
  id: string; name: string; description: string; version: string; enabled: boolean;
  nodes: WorkflowNode[]; links: WorkflowLink[]; tags: string[];
}

const NODE_TYPES_PALETTE = [
  { type: "trigger", label: "Trigger · Webhook", icon: Webhook },
  { type: "trigger", label: "Trigger · Schedule", icon: GitBranch },
  { type: "agent", label: "QA Agent", icon: Bot },
  { type: "agent", label: "Security Agent", icon: ShieldAlert },
  { type: "agent", label: "DevOps Agent", icon: Bot },
  { type: "condition", label: "Condition · If", icon: AlertCircle },
  { type: "action", label: "Action · Deploy", icon: Rocket },
  { type: "action", label: "Action · Notify", icon: Webhook },
];

const typeStyle: Record<string, string> = {
  trigger: "border-primary/50 bg-primary/10 text-primary",
  agent: "border-accent/50 bg-accent/10 text-accent",
  action: "border-neon-green/50 bg-neon-green/10 text-neon-green",
  condition: "border-neon-amber/50 bg-neon-amber/10 text-neon-amber",
};

const typeIcons: Record<string, any> = {
  trigger: GitBranch, agent: Bot, action: Rocket, condition: AlertCircle,
};

const scenarioDescriptions: Record<string, string> = {
  dependency_mismatch: "A PR introduces a dependency that doesn't resolve in CI.",
  config_error: "A config change causes a type error during build.",
  flaky_test: "A CI pipeline fails due to a timeout in integration tests.",
  latency_spike: "A production latency spike triggers auto-rollback.",
};

const Workflows = () => {
  // Editor state
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [links, setLinks] = useState<WorkflowLink[]>([]);
  const [drag, setDrag] = useState<{ id: string; ox: number; oy: number } | null>(null);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [workflowName, setWorkflowName] = useState("CI/CD Autonomous Pipeline");
  const [workflowDesc, setWorkflowDesc] = useState("Default CI/CD workflow with AI agents");
  const [savedWorkflows, setSavedWorkflows] = useState<WorkflowDefinition[]>([]);
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string>("wf-cicd-default");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Demo/replay state
  const [scenarios, setScenarios] = useState<Record<string, {description: string}>>({});
  const [injectingScenario, setInjectingScenario] = useState<string | null>(null);
  const [injectedScenario, setInjectedScenario] = useState<InjectedScenario | null>(null);
  const [replaySession, setReplaySession] = useState<ReplaySession | null>(null);
  const [replaying, setReplaying] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);

  // Load default seed workflow on mount
  useEffect(() => {
    const seedNodes: WorkflowNode[] = [
      { id: "n1", type: "trigger", x: 60, y: 120, label: "On commit to main", icon: GitBranch, description: "Triggers on push to main branch", properties: [{ key: "branch", label: "Branch", type: "text", value: "main" }, { key: "event", label: "Event", type: "select", value: "push", options: ["push", "pull_request", "merge"] }] },
      { id: "n2", type: "agent", x: 280, y: 120, label: "QA Agent · generate tests", icon: Bot, description: "AI agent generates unit + integration tests", properties: [{ key: "model", label: "Model", type: "select", value: "gpt-4", options: ["gpt-4", "claude-3", "llama-3"] }, { key: "coverage_target", label: "Coverage target", type: "number", value: 80 }] },
      { id: "n3", type: "agent", x: 500, y: 120, label: "Security Agent · scan", icon: ShieldAlert, description: "Scans for vulnerabilities", properties: [{ key: "severity_threshold", label: "Threshold", type: "select", value: "high", options: ["low", "medium", "high", "critical"] }] },
      { id: "n4", type: "action", x: 280, y: 300, label: "Canary deploy 10%", icon: Rocket, description: "Gradual canary deployment", properties: [{ key: "percentage", label: "Traffic %", type: "number", value: 10 }, { key: "bake_minutes", label: "Bake time", type: "number", value: 10 }, { key: "rollback_on_error", label: "Auto-rollback", type: "boolean", value: true }] },
      { id: "n5", type: "condition", x: 500, y: 300, label: "If error budget < 1x", icon: AlertCircle, description: "Check error budget burn rate", properties: [{ key: "threshold", label: "Burn rate threshold", type: "number", value: 1.0 }, { key: "metric", label: "Metric", type: "select", value: "error_budget_burn", options: ["error_budget_burn", "p99_latency", "error_rate"] }] },
      { id: "n6", type: "action", x: 720, y: 300, label: "Webhook · notify on-call", icon: Webhook, description: "Notify on-call engineer", properties: [{ key: "channel", label: "Channel", type: "select", value: "pagerduty", options: ["slack", "pagerduty", "email", "teams"] }, { key: "message_template", label: "Message template", type: "code", value: "Incident in {{service}}: {{description}}" }] },
    ];
    const seedLinks: WorkflowLink[] = [
      { source: "n1", target: "n2", label: "on commit" },
      { source: "n2", target: "n3", label: "tests pass" },
      { source: "n3", target: "n4", label: "scan ok" },
      { source: "n4", target: "n5", label: "deployed" },
      { source: "n5", target: "n6", label: "budget exceeded" },
    ];
    setNodes(seedNodes);
    setLinks(seedLinks);

    apiClient.getDemoScenarios().then(data => setScenarios(data.scenarios));
    apiClient.listWorkflows().then(setSavedWorkflows);
  }, []);

  // ---- Workflow CRUD ----

  const handleSave = async () => {
    setSaving(true);
    const workflow: WorkflowDefinition = {
      id: currentWorkflowId,
      name: saveName || workflowName,
      description: workflowDesc,
      version: "1.0.0",
      enabled: true,
      nodes: nodes.map(n => ({ ...n, icon: n.icon?.name || "Bot" })),
      links,
      tags: ["custom"],
    };
    try {
      const existing = savedWorkflows.find(w => w.id === currentWorkflowId);
      if (existing) {
        await apiClient.updateWorkflow(currentWorkflowId, workflow);
      } else {
        await apiClient.createWorkflow(workflow);
      }
    } catch (e) {}
    const updated = await apiClient.listWorkflows();
    setSavedWorkflows(updated);
    setShowSaveDialog(false);
    setSaving(false);
  };

  const handleLoad = async (wf: WorkflowDefinition) => {
    setCurrentWorkflowId(wf.id);
    setWorkflowName(wf.name);
    setWorkflowDesc(wf.description);
    // Reconstruct icon references from string names
    const iconMap: Record<string, any> = { GitBranch, Bot, Rocket, ShieldAlert, AlertCircle, Webhook };
    setNodes(wf.nodes.map(n => ({ ...n, icon: iconMap[n.icon as string] || Bot })));
    setLinks(wf.links);
    setSelectedNode(null);
    setShowLoadDialog(false);
  };

  const handleDelete = async (wfId: string) => {
    await apiClient.deleteWorkflow(wfId);
    const updated = await apiClient.listWorkflows();
    setSavedWorkflows(updated);
  };

  const handleExecute = async () => {
    setExecuting(true);
    try {
      const result = await apiClient.executeWorkflow(currentWorkflowId);
      setExecutionResult(result);
    } catch (e) {
      setExecutionResult({ status: "failed", steps: [] });
    }
    setExecuting(false);
    setTimeout(() => setExecutionResult(null), 5000);
  };

  // ---- Canvas interactions ----

  const addNode = (type: string, label: string) => {
    const id = `n${Date.now()}`;
    const icon = typeIcons[type] || Bot;
    const newNode: WorkflowNode = { id, type, x: 100 + Math.random() * 200, y: 100 + Math.random() * 200, label, icon, properties: [] };
    setNodes(prev => [...prev, newNode]);
  };

  const onDown = (e: React.MouseEvent, n: WorkflowNode) => {
    if (selectedNode?.id === n.id && e.button === 0) return; // handled by select
    const rect = ref.current!.getBoundingClientRect();
    setDrag({ id: n.id, ox: e.clientX - rect.left - n.x, oy: e.clientY - rect.top - n.y });
  };

  const onMove = (e: React.MouseEvent) => {
    if (!drag) return;
    const rect = ref.current!.getBoundingClientRect();
    setNodes(ns => ns.map(n => n.id === drag.id ? { ...n, x: Math.max(0, e.clientX - rect.left - drag.ox), y: Math.max(0, e.clientY - rect.top - drag.oy) } : n));
  };

  const updateNodeProperty = (nodeId: string, key: string, value: any) => {
    setNodes(ns => ns.map(n => n.id === nodeId ? { ...n, properties: (n.properties || []).map(p => p.key === key ? { ...p, value } : p) } : n));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(prev => prev ? { ...prev, properties: (prev.properties || []).map(p => p.key === key ? { ...p, value } : p) } : null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData("text/plain"));
    const rect = ref.current!.getBoundingClientRect();
    const id = `n${Date.now()}`;
    const icon = typeIcons[data.type] || Bot;
    const newNode: WorkflowNode = { id, type: data.type, x: e.clientX - rect.left - 90, y: e.clientY - rect.top - 24, label: data.label, icon, properties: [] };
    setNodes(prev => [...prev, newNode]);
  };

  // ---- Demo/Replay ----

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

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="autonomous workflow studio" title="Workflow Builder"
        desc="Compose AI-native production automations. Drag nodes, wire agents to triggers, deploy to live."
        actions={
          <div className="flex gap-2">
            <button onClick={() => { setSaveName(workflowName); setShowSaveDialog(true); }}
              className="mono text-xs px-3 py-2 rounded-md border border-border hover:border-primary/40 transition flex items-center gap-1.5">
              <Save className="h-3 w-3" />Save
            </button>
            <button onClick={() => setShowLoadDialog(true)}
              className="mono text-xs px-3 py-2 rounded-md border border-border hover:border-primary/40 transition flex items-center gap-1.5">
              <Download className="h-3 w-3" />Load
            </button>
            <button onClick={handleExecute} disabled={executing}
              className="mono text-xs px-3 py-2 rounded-md bg-gradient-to-r from-primary to-accent text-primary-foreground disabled:opacity-50 flex items-center gap-1.5">
              <Play className="h-3 w-3" />
              {executing ? "Executing..." : "Execute"}
            </button>
          </div>
        } />

      {/* Save/Load dialogs */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={() => setShowSaveDialog(false)}>
          <div className="glass-strong rounded-xl p-6 max-w-sm w-full mx-4 border border-primary/30" onClick={e => e.stopPropagation()}>
            <div className="font-display text-lg font-semibold mb-4">Save Workflow</div>
            <input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="Workflow name"
              className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-border text-sm focus:outline-none focus:border-primary/50 mb-4" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowSaveDialog(false)} className="mono text-xs px-3 py-2 rounded-md border border-border">Cancel</button>
              <button onClick={handleSave} disabled={saving || !saveName} className="mono text-xs px-3 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50">
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLoadDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={() => setShowLoadDialog(false)}>
          <div className="glass-strong rounded-xl p-6 max-w-lg w-full mx-4 border border-primary/30 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="font-display text-lg font-semibold mb-4">Load Workflow</div>
            {savedWorkflows.length === 0 ? (
              <div className="text-sm text-muted-foreground p-4 text-center">No saved workflows yet.</div>
            ) : (
              savedWorkflows.map(wf => (
                <div key={wf.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/40 border border-border mb-2">
                  <div className="flex-1 cursor-pointer" onClick={() => handleLoad(wf)}>
                    <div className="text-sm font-medium">{wf.name}</div>
                    <div className="mono text-[10px] text-muted-foreground">{wf.description} · {wf.nodes.length} nodes</div>
                  </div>
                  <button onClick={() => handleDelete(wf.id)} className="p-1.5 rounded hover:bg-neon-red/10 text-muted-foreground hover:text-neon-red transition">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Execution result toast */}
      {executionResult && (
        <div className="fixed bottom-6 right-6 z-50 glass-strong rounded-xl p-4 border border-neon-green/40 shadow-xl max-w-sm">
          <div className="flex items-center gap-2 mb-1">
            <Check className="h-4 w-4 text-neon-green" />
            <span className="mono text-[10px] uppercase tracking-widest text-neon-green">Execution Complete</span>
          </div>
          <div className="text-xs text-muted-foreground">{executionResult.status} · {executionResult.steps?.length || 0} steps</div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4">
        {/* Node Palette */}
        <Panel eyebrow="palette" title="Nodes" className="col-span-2">
          <div className="p-3 space-y-2 text-xs">
            {NODE_TYPES_PALETTE.map((p, i) => (
              <div key={i}
                draggable
                onDragStart={e => e.dataTransfer.setData("text/plain", JSON.stringify(p))}
                onClick={() => addNode(p.type, p.label)}
                className={`px-2.5 py-2 rounded-md border ${typeStyle[p.type]} cursor-grab active:cursor-grabbing mono text-[10px] hover:opacity-80 transition`}>
                <p.icon className="h-3 w-3 inline mr-1.5" />
                {p.label}
              </div>
            ))}
          </div>
        </Panel>

        <div className="col-span-7 space-y-4">
          {/* Demo Controls */}
          <Panel eyebrow="demo controls" title="Failure Injection & Replay"
            actions={<span className="mono text-[10px] text-muted-foreground">{Object.keys(scenarios).length} scenarios</span>}>
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

          {/* Canvas */}
          <Panel eyebrow="canvas" title={workflowName} className="h-[400px] overflow-hidden relative"
            actions={
              <div className="flex items-center gap-2">
                <input value={workflowName} onChange={e => setWorkflowName(e.target.value)}
                  className="mono text-[10px] px-2 py-1 rounded bg-transparent border border-border focus:outline-none focus:border-primary/50 w-48" />
              </div>
            }>
            <div ref={ref}
              onMouseMove={onMove}
              onMouseUp={() => setDrag(null)}
              onMouseLeave={() => setDrag(null)}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="absolute inset-0 bg-grid"
            >
              {/* SVG edges */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {links.map((link, i) => {
                  const source = nodes.find(n => n.id === link.source);
                  const target = nodes.find(n => n.id === link.target);
                  if (!source || !target) return null;
                  const x1 = source.x + 90, y1 = source.y + 24;
                  const x2 = target.x + 10, y2 = target.y + 24;
                  const mx = (x1 + x2) / 2;
                  return (
                    <g key={i}>
                      <path d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                        stroke="hsl(var(--primary))" strokeOpacity="0.5" strokeWidth="1.5" fill="none"
                        strokeDasharray="4 3" className="animate-dash" />
                      {link.label && (
                        <text x={mx} y={(y1 + y2) / 2 - 8} textAnchor="middle"
                          fill="hsl(var(--muted-foreground))" fontSize="8" className="mono">
                          {link.label}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Nodes */}
              {nodes.map(n => {
                const Icon = n.icon || typeIcons[n.type] || Bot;
                return (
                  <div key={n.id}
                    onClick={(e) => { e.stopPropagation(); setSelectedNode(n); }}
                    onMouseDown={(e) => { if (e.button === 0) onDown(e, n); }}
                    className={`absolute select-none cursor-grab active:cursor-grabbing w-44 rounded-lg border-2 glass p-3 transition-all ${typeStyle[n.type]} ${selectedNode?.id === n.id ? 'ring-2 ring-primary shadow-lg shadow-primary/20' : ''}`}
                    style={{ left: n.x, top: n.y }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-3.5 w-3.5" />
                      <span className="mono text-[9px] uppercase tracking-widest opacity-80">{n.type}</span>
                    </div>
                    <div className="text-xs font-medium text-foreground">{n.label}</div>
                    {n.description && <div className="mono text-[8px] text-muted-foreground mt-0.5 truncate">{n.description}</div>}
                  </div>
                );
              })}

              {/* Empty state */}
              {nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Drag nodes from the palette</div>
                    <div className="text-xs text-muted-foreground">or click a palette item to add it to the canvas</div>
                  </div>
                </div>
              )}
            </div>
          </Panel>
        </div>

        {/* Properties Panel */}
        <Panel eyebrow={selectedNode ? `node · ${selectedNode.type}` : "properties"} title={selectedNode ? selectedNode.label : "Node Properties"}
          className="col-span-3">
          <div className="p-4 space-y-3 overflow-y-auto max-h-[600px]">
            {selectedNode ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`px-2 py-0.5 rounded text-[9px] mono uppercase tracking-wider border ${typeStyle[selectedNode.type]}`}>
                    {selectedNode.type}
                  </div>
                  <button onClick={() => setSelectedNode(null)} className="ml-auto p-1 rounded hover:bg-secondary/60 transition">
                    <X className="h-3 w-3" />
                  </button>
                </div>

                <div>
                  <label className="mono text-[9px] uppercase tracking-widest text-muted-foreground block mb-1">Label</label>
                  <input value={selectedNode.label} onChange={e => {
                    const newLabel = e.target.value;
                    setSelectedNode(prev => prev ? { ...prev, label: newLabel } : null);
                    setNodes(ns => ns.map(n => n.id === selectedNode.id ? { ...n, label: newLabel } : n));
                  }} className="w-full px-2.5 py-1.5 rounded bg-secondary/60 border border-border text-xs focus:outline-none focus:border-primary/50" />
                </div>

                <div>
                  <label className="mono text-[9px] uppercase tracking-widest text-muted-foreground block mb-1">Description</label>
                  <input value={selectedNode.description || ''} onChange={e => {
                    const desc = e.target.value;
                    setSelectedNode(prev => prev ? { ...prev, description: desc } : null);
                    setNodes(ns => ns.map(n => n.id === selectedNode.id ? { ...n, description: desc } : n));
                  }} className="w-full px-2.5 py-1.5 rounded bg-secondary/60 border border-border text-xs focus:outline-none focus:border-primary/50" />
                </div>

                {(selectedNode.properties || []).length > 0 && (
                  <>
                    <div className="border-t border-border my-2" />
                    <div className="mono text-[9px] uppercase tracking-widest text-primary mb-2">Properties</div>
                    {(selectedNode.properties || []).map((prop, i) => (
                      <div key={i}>
                        <label className="mono text-[9px] uppercase tracking-widest text-muted-foreground block mb-1">{prop.label}</label>
                        {prop.type === "select" ? (
                          <select value={prop.value} onChange={e => updateNodeProperty(selectedNode.id, prop.key, e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded bg-secondary/60 border border-border text-xs focus:outline-none focus:border-primary/50">
                            {(prop.options || []).map((opt, j) => <option key={j} value={opt}>{opt}</option>)}
                          </select>
                        ) : prop.type === "boolean" ? (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={prop.value} onChange={e => updateNodeProperty(selectedNode.id, prop.key, e.target.checked)}
                              className="rounded border-border" />
                            <span className="text-xs">{prop.value ? "Enabled" : "Disabled"}</span>
                          </label>
                        ) : prop.type === "code" ? (
                          <textarea value={prop.value || ''} onChange={e => updateNodeProperty(selectedNode.id, prop.key, e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded bg-background/80 border border-border text-[10px] font-mono focus:outline-none focus:border-primary/50 h-16 resize-none" />
                        ) : (
                          <input type={prop.type === "number" ? "number" : "text"} value={prop.value || ''} onChange={e => updateNodeProperty(selectedNode.id, prop.key, prop.type === "number" ? parseFloat(e.target.value) : e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded bg-secondary/60 border border-border text-xs focus:outline-none focus:border-primary/50" />
                        )}
                      </div>
                    ))}
                  </>
                )}

                <div className="border-t border-border my-2" />
                <button onClick={() => {
                  setNodes(ns => ns.filter(n => n.id !== selectedNode.id));
                  setLinks(ls => ls.filter(l => l.source !== selectedNode.id && l.target !== selectedNode.id));
                  setSelectedNode(null);
                }} className="w-full mono text-[10px] px-2.5 py-1.5 rounded border border-neon-red/40 text-neon-red hover:bg-neon-red/10 transition flex items-center justify-center gap-1">
                  <Trash2 className="h-3 w-3" /> Delete Node
                </button>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Settings2 className="h-6 w-6 mx-auto mb-2 opacity-40" />
                <div className="text-xs">Click on a node to edit its properties</div>
                <div className="mono text-[10px] mt-2">Drag nodes to rearrange the canvas</div>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default Workflows;
