import { useState, useEffect } from "react";
import { PageHeader, Panel, StatusPill } from "@/components/ui-kit/Panels";
import { Shield, Plus, Trash2, Check, X, Edit3, Save, Play, FileText, AlertTriangle } from "lucide-react";
import { apiClient } from "@/lib/apiClient";

interface PolicyCondition {
  field: string; operator: string; value: any;
}

interface PolicyRule {
  name: string; description: string; conditions: PolicyCondition[];
  action_class: string; allowed: boolean; requires_approval: boolean;
  priority: number; auto_approve_conditions: PolicyCondition[];
}

interface PolicyDefinition {
  name: string; version: string; description: string; enabled: boolean;
  applies_to: string[]; environments: string[];
  rules: PolicyRule[]; default_action_class: string;
}

const OPERATORS = [
  { value: "gt", label: ">" },
  { value: "gte", label: "≥" },
  { value: "lt", label: "<" },
  { value: "lte", label: "≤" },
  { value: "eq", label: "==" },
  { value: "neq", label: "!=" },
  { value: "in", label: "in" },
  { value: "contains", label: "contains" },
  { value: "matches", label: "matches" },
];

const PolicyManagement = () => {
  const [policies, setPolicies] = useState<PolicyDefinition[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const [evalContext, setEvalContext] = useState<string>('{\n  "action": "deploy",\n  "service": "billing-svc",\n  "environment": "production",\n  "risk_score": 72,\n  "confidence": 0.88,\n  "blast_radius": "medium"\n}');
  const [evalResult, setEvalResult] = useState<any>(null);
  const [evalLoading, setEvalLoading] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newPolicy, setNewPolicy] = useState({ name: "", description: "" });

  useEffect(() => {
    apiClient.listPolicies().then(setPolicies);
  }, []);

  const refreshPolicies = async () => {
    const updated = await apiClient.listPolicies();
    setPolicies(updated);
  };

  // ---- CRUD ----

  const handleCreate = async () => {
    if (!newPolicy.name) return;
    const policy: PolicyDefinition = {
      name: newPolicy.name,
      version: "1.0.0",
      description: newPolicy.description,
      enabled: true,
      applies_to: ["*"],
      environments: ["production"],
      rules: [],
      default_action_class: "B",
    };
    await apiClient.createPolicy(policy);
    setShowNewForm(false);
    setNewPolicy({ name: "", description: "" });
    await refreshPolicies();
  };

  const handleDelete = async (name: string) => {
    await apiClient.deletePolicy(name);
    if (selectedPolicy === name) setSelectedPolicy(null);
    if (editingPolicy === name) setEditingPolicy(null);
    await refreshPolicies();
  };

  const handleToggleEnabled = async (policy: PolicyDefinition) => {
    await apiClient.updatePolicy(policy.name, { ...policy, enabled: !policy.enabled });
    await refreshPolicies();
  };

  const handleSaveEdit = async () => {
    if (!editingPolicy || !editData) return;
    await apiClient.updatePolicy(editingPolicy, editData);
    setEditingPolicy(null);
    setSelectedPolicy(null);
    await refreshPolicies();
  };

  // ---- Evaluation ----

  const handleEvaluate = async () => {
    setEvalLoading(true);
    try {
      const ctx = JSON.parse(evalContext);
      const result = await apiClient.evaluatePolicyAsCode(ctx);
      setEvalResult(result);
    } catch (e) {
      setEvalResult({ error: "Invalid JSON context" });
    }
    setEvalLoading(false);
  };

  // ---- Helpers ----

  const getSelectedPolicy = () => policies.find(p => p.name === selectedPolicy);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="governance" title="Policy Management"
        desc="Define, edit, and evaluate policy-as-code rules. Policies control what actions are allowed, require approval, or auto-execute."
        actions={
          <button onClick={() => setShowNewForm(true)} className="mono text-xs px-3 py-2 rounded-md border border-border hover:border-primary/40 transition flex items-center gap-1.5">
            <Plus className="h-3 w-3" /> New policy
          </button>
        } />

      {/* New policy form */}
      {showNewForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={() => setShowNewForm(false)}>
          <div className="glass-strong rounded-xl p-6 max-w-sm w-full mx-4 border border-primary/30" onClick={e => e.stopPropagation()}>
            <div className="font-display text-lg font-semibold mb-4">Create Policy</div>
            <input value={newPolicy.name} onChange={e => setNewPolicy({ ...newPolicy, name: e.target.value })}
              placeholder="Policy name (e.g., staging-safety)" className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-border text-sm mb-3 focus:outline-none focus:border-primary/50" />
            <input value={newPolicy.description} onChange={e => setNewPolicy({ ...newPolicy, description: e.target.value })}
              placeholder="Description (optional)" className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-border text-sm mb-4 focus:outline-none focus:border-primary/50" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNewForm(false)} className="mono text-xs px-3 py-2 rounded-md border border-border">Cancel</button>
              <button onClick={handleCreate} disabled={!newPolicy.name} className="mono text-xs px-3 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50">Create</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4">
        {/* Policy list */}
        <Panel eyebrow={`${policies.length} policies`} title="Policy Definitions" className="col-span-4">
          <div className="divide-y divide-border overflow-y-auto max-h-[600px]">
            {policies.length === 0 && (
              <div className="p-6 text-center text-xs text-muted-foreground">No policies defined.</div>
            )}
            {policies.map(p => (
              <div key={p.name}
                className={`p-4 cursor-pointer hover:bg-secondary/40 transition ${selectedPolicy === p.name ? 'bg-primary/5' : ''}`}
                onClick={() => { setSelectedPolicy(p.name); setEditingPolicy(null); }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Shield className={`h-3.5 w-3.5 ${p.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-sm font-medium">{p.name}</span>
                  </div>
                  <button onClick={e => { e.stopPropagation(); handleToggleEnabled(p); }}
                    className={`mono text-[9px] px-2 py-0.5 rounded border ${p.enabled ? 'border-neon-green/40 text-neon-green' : 'border-border text-muted-foreground'}`}>
                    {p.enabled ? 'active' : 'disabled'}
                  </button>
                </div>
                <div className="mono text-[10px] text-muted-foreground truncate">{p.description}</div>
                <div className="flex gap-2 mt-1">
                  <StatusPill status={`v${p.version}`} />
                  <span className="mono text-[9px] text-muted-foreground">{p.rules.length} rules · class {p.default_action_class}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Policy detail / edit */}
        <Panel eyebrow={editingPolicy ? "editing" : selectedPolicy || "detail"} title={editingPolicy ? `Edit: ${editingPolicy}` : selectedPolicy || "Select a policy"}
          className="col-span-5" actions={
            selectedPolicy && !editingPolicy ? (
              <div className="flex gap-1">
                <button onClick={() => { setEditingPolicy(selectedPolicy); setEditData({ ...getSelectedPolicy() }); }}
                  className="mono text-[9px] px-2 py-1 rounded border border-border hover:border-primary/40 flex items-center gap-1">
                  <Edit3 className="h-3 w-3" /> Edit
                </button>
                <button onClick={() => handleDelete(selectedPolicy)}
                  className="mono text-[9px] px-2 py-1 rounded border border-neon-red/40 text-neon-red hover:bg-neon-red/10 flex items-center gap-1">
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            ) : editingPolicy ? (
              <button onClick={handleSaveEdit} className="mono text-[9px] px-2 py-1 rounded border border-neon-green/40 text-neon-green hover:bg-neon-green/10 flex items-center gap-1">
                <Save className="h-3 w-3" /> Save
              </button>
            ) : null
          }>
          <div className="p-4 space-y-4 overflow-y-auto max-h-[600px]">
            {editingPolicy && editData ? (
              // Edit mode
              <div className="space-y-3">
                <div>
                  <label className="mono text-[9px] uppercase tracking-widest text-muted-foreground block mb-1">Name</label>
                  <input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded bg-secondary/60 border border-border text-xs focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="mono text-[9px] uppercase tracking-widest text-muted-foreground block mb-1">Description</label>
                  <textarea value={editData.description} onChange={e => setEditData({ ...editData, description: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded bg-secondary/60 border border-border text-xs focus:outline-none focus:border-primary/50 h-16 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mono text-[9px] uppercase tracking-widest text-muted-foreground block mb-1">Default Action Class</label>
                    <select value={editData.default_action_class} onChange={e => setEditData({ ...editData, default_action_class: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-secondary/60 border border-border text-xs">
                      <option value="A">A (Suggest Only)</option>
                      <option value="B">B (Approval Required)</option>
                      <option value="C">C (Auto Execute)</option>
                    </select>
                  </div>
                  <div>
                    <label className="mono text-[9px] uppercase tracking-widest text-muted-foreground block mb-1">Applies To</label>
                    <input value={editData.applies_to?.join(", ") || ""} onChange={e => setEditData({ ...editData, applies_to: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })}
                      className="w-full px-2.5 py-1.5 rounded bg-secondary/60 border border-border text-xs" placeholder="service1, service2 or *" />
                  </div>
                </div>
                <div>
                  <label className="mono text-[9px] uppercase tracking-widest text-muted-foreground block mb-1">Environments</label>
                  <input value={editData.environments?.join(", ") || ""} onChange={e => setEditData({ ...editData, environments: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })}
                    className="w-full px-2.5 py-1.5 rounded bg-secondary/60 border border-border text-xs" placeholder="production, staging" />
                </div>
                <div className="border-t border-border pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="mono text-[9px] uppercase tracking-widest text-primary">Rules ({editData.rules?.length || 0})</span>
                    <button onClick={() => setEditData({
                      ...editData,
                      rules: [...(editData.rules || []), {
                        name: `rule-${Date.now()}`, description: "", conditions: [{ field: "risk_score", operator: "gte", value: 50 }],
                        action_class: "B", allowed: true, requires_approval: true, priority: 50, auto_approve_conditions: [],
                      }]
                    })} className="mono text-[9px] px-2 py-0.5 rounded border border-border">
                      + Add rule
                    </button>
                  </div>
                  {(editData.rules || []).map((rule: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg bg-secondary/40 border border-border mb-2">
                      <div className="flex items-center justify-between mb-2">
                        <input value={rule.name} onChange={e => {
                          const newRules = [...editData.rules];
                          newRules[i] = { ...newRules[i], name: e.target.value };
                          setEditData({ ...editData, rules: newRules });
                        }} className="mono text-[10px] px-1.5 py-0.5 rounded bg-transparent border border-border flex-1 mr-2" placeholder="Rule name" />
                        <button onClick={() => setEditData({ ...editData, rules: (editData.rules || []).filter((_: any, j: number) => j !== i) })}
                          className="p-1 rounded hover:bg-neon-red/10 text-muted-foreground hover:text-neon-red"><X className="h-3 w-3" /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="mono text-[8px] text-muted-foreground">Action Class</label>
                          <select value={rule.action_class} onChange={e => {
                            const newRules = [...editData.rules]; newRules[i] = { ...newRules[i], action_class: e.target.value };
                            setEditData({ ...editData, rules: newRules });
                          }} className="w-full px-1.5 py-1 rounded bg-secondary/60 border border-border text-[10px]">
                            <option value="A">A</option><option value="B">B</option><option value="C">C</option>
                          </select>
                        </div>
                        <div>
                          <label className="mono text-[8px] text-muted-foreground">Priority</label>
                          <input type="number" value={rule.priority} onChange={e => {
                            const newRules = [...editData.rules]; newRules[i] = { ...newRules[i], priority: parseInt(e.target.value) };
                            setEditData({ ...editData, rules: newRules });
                          }} className="w-full px-1.5 py-1 rounded bg-secondary/60 border border-border text-[10px]" />
                        </div>
                      </div>
                      <div className="mono text-[8px] text-muted-foreground mb-1">Conditions</div>
                      {(rule.conditions || []).map((cond: any, j: number) => (
                        <div key={j} className="flex gap-1 items-center mb-1">
                          <input value={cond.field} onChange={e => {
                            const newRules = [...editData.rules]; newRules[i].conditions[j] = { ...newRules[i].conditions[j], field: e.target.value };
                            setEditData({ ...editData, rules: newRules });
                          }} className="w-20 px-1 py-0.5 rounded bg-secondary/60 border border-border text-[9px]" placeholder="field" />
                          <select value={cond.operator} onChange={e => {
                            const newRules = [...editData.rules]; newRules[i].conditions[j] = { ...newRules[i].conditions[j], operator: e.target.value };
                            setEditData({ ...editData, rules: newRules });
                          }} className="px-1 py-0.5 rounded bg-secondary/60 border border-border text-[9px]">
                            {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                          </select>
                          <input value={cond.value !== undefined ? String(cond.value) : ""} onChange={e => {
                            const numVal = parseFloat(e.target.value);
                            const newRules = [...editData.rules]; newRules[i].conditions[j] = { ...newRules[i].conditions[j], value: isNaN(numVal) ? e.target.value : numVal };
                            setEditData({ ...editData, rules: newRules });
                          }} className="w-16 px-1 py-0.5 rounded bg-secondary/60 border border-border text-[9px]" placeholder="value" />
                          <button onClick={() => {
                            const newRules = [...editData.rules];
                            newRules[i].conditions = newRules[i].conditions.filter((_: any, k: number) => k !== j);
                            setEditData({ ...editData, rules: newRules });
                          }} className="p-0.5 text-muted-foreground hover:text-neon-red"><X className="h-2.5 w-2.5" /></button>
                        </div>
                      ))}
                      <button onClick={() => {
                        const newRules = [...editData.rules];
                        newRules[i].conditions = [...(newRules[i].conditions || []), { field: "risk_score", operator: "gte", value: 50 }];
                        setEditData({ ...editData, rules: newRules });
                      }} className="mono text-[8px] text-primary hover:text-accent transition">+ Add condition</button>
                    </div>
                  ))}
                </div>
              </div>
            ) : selectedPolicy ? (
              // View mode
              (() => {
                const p = getSelectedPolicy();
                if (!p) return <div className="text-xs text-muted-foreground">Policy not found.</div>;
                return (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <StatusPill status={`v${p.version}`} />
                      <span className="mono text-[10px] text-muted-foreground">{p.enabled ? '● active' : '○ disabled'}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-3">{p.description}</div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="p-3 rounded-lg bg-secondary/40 border border-border">
                        <div className="mono text-[9px] uppercase text-muted-foreground">Default Class</div>
                        <div className="font-display text-lg">{p.default_action_class}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-secondary/40 border border-border">
                        <div className="mono text-[9px] uppercase text-muted-foreground">Rules</div>
                        <div className="font-display text-lg">{p.rules.length}</div>
                      </div>
                    </div>
                    {p.applies_to && p.applies_to.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {p.applies_to.map((svc: string) => (
                          <span key={svc} className="mono text-[9px] px-1.5 py-0.5 rounded bg-primary/10 border border-primary/30">{svc}</span>
                        ))}
                      </div>
                    )}
                    {p.environments && p.environments.length > 0 && (
                      <div className="mb-3">
                        <div className="mono text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Environments</div>
                        <div className="flex gap-1">
                          {p.environments.map((env: string) => (
                            <span key={env} className="mono text-[9px] px-1.5 py-0.5 rounded bg-accent/10 border border-accent/30">{env}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {p.rules.length > 0 && (
                      <div>
                        <div className="mono text-[9px] uppercase tracking-widest text-primary mb-2">Rules</div>
                        {p.rules.map((rule: any, i: number) => (
                          <div key={i} className="p-3 rounded-lg bg-secondary/40 border border-border mb-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium">{rule.name}</span>
                              <span className="mono text-[9px] px-1.5 py-0.5 rounded bg-primary/10 border border-primary/30">Class {rule.action_class}</span>
                            </div>
                            <div className="mono text-[9px] text-muted-foreground mb-1">{rule.description}</div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span>Priority: {rule.priority}</span>
                              <span>·</span>
                              <span>{rule.allowed ? 'Allowed' : 'Blocked'}</span>
                              <span>·</span>
                              <span>{rule.requires_approval ? 'Approval needed' : 'Auto-execute'}</span>
                            </div>
                            {rule.conditions.length > 0 && (
                              <div className="mt-1">
                                <span className="mono text-[8px] text-muted-foreground">Conditions: </span>
                                {rule.conditions.map((c: any, j: number) => (
                                  <span key={j} className="mono text-[8px] text-primary ml-1">{c.field} {c.operator} {c.value}{j < rule.conditions.length - 1 ? ',' : ''}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <div className="text-sm">Select a policy to view its details</div>
                <div className="mono text-[10px] mt-1">or create a new one to get started</div>
              </div>
            )}
          </div>
        </Panel>

        {/* Evaluation panel */}
        <Panel eyebrow="try it" title="Evaluate Policy" className="col-span-3">
          <div className="p-4 space-y-3">
            <label className="mono text-[9px] uppercase tracking-widest text-muted-foreground block">Action Context (JSON)</label>
            <textarea value={evalContext} onChange={e => setEvalContext(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded bg-background/80 border border-border text-[10px] font-mono focus:outline-none focus:border-primary/50 h-32 resize-none" />
            <button onClick={handleEvaluate} disabled={evalLoading}
              className="w-full mono text-[10px] px-3 py-2 rounded-md bg-gradient-to-r from-primary to-accent text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-1.5">
              <Play className={`h-3 w-3 ${evalLoading ? 'animate-spin' : ''}`} />
              {evalLoading ? "Evaluating..." : "Evaluate"}
            </button>
            {evalResult && (
              <div className="p-3 rounded-lg border border-accent/30 bg-accent/5">
                {evalResult.error ? (
                  <div className="flex items-center gap-2 text-xs text-neon-red">
                    <AlertTriangle className="h-3.5 w-3.5" /> {evalResult.error}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-3.5 w-3.5 text-accent" />
                      <span className="mono text-[10px] uppercase tracking-widest text-accent">Result</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div><b>Policy:</b> {evalResult.matched_policy}</div>
                      <div><b>Rule:</b> {evalResult.matched_rule}</div>
                      <div><b>Class:</b> {evalResult.action_class} · <b>Allowed:</b> {evalResult.allowed ? <Check className="h-3 w-3 inline text-neon-green" /> : <X className="h-3 w-3 inline text-neon-red" />}</div>
                      <div><b>Approval:</b> {evalResult.requires_approval ? 'Required' : 'Auto-approved'} {evalResult.auto_approved && <Check className="h-3 w-3 inline text-neon-green" />}</div>
                      <div className="mono text-[9px] text-muted-foreground mt-1">{evalResult.description}</div>
                      {evalResult.policies_evaluated && <div className="mono text-[9px] text-muted-foreground">{evalResult.policies_evaluated} policy(ies) evaluated</div>}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default PolicyManagement;
