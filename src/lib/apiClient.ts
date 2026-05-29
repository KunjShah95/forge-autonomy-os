import { events as initialMockEvents } from "./mock";

const API_BASE_URL = "http://localhost:8000/api/v1";

export interface ApiEvent {
  source: string;
  type: string;
  timestamp: string;
  trace_id: string;
  payload: any;
}

export interface ApiDecision {
  id: string;
  trace_id: string;
  agent: string;
  action: string;
  reason: string;
  confidence: number;
  risk: number;
  evidence: any;
  timestamp: string;
}

export interface ApiAudit {
  trace_id: string;
  events: ApiEvent[];
  decisions: ApiDecision[];
  status: string;
  outcome?: string;
  timestamp: string;
}

export interface ClassificationResult {
  trace_id: string;
  classification: string;
  confidence: number;
  evidence: string[];
  summary: string;
  timestamp: string;
}

export interface PolicyResult {
  trace_id: string;
  action_class: string;
  allowed: boolean;
  requires_approval: boolean;
  reason: string;
  conditions: string[];
  timestamp: string;
}

export interface RiskScoreResult {
  trace_id: string;
  service: string;
  version: string;
  overall_risk: number;
  risk_level: string;
  factors: Array<{name: string; score: number; description: string}>;
  recommendation: string;
  timestamp: string;
}

export interface RepairSuggestion {
  trace_id: string;
  fix_type: string;
  patch: string;
  description: string;
  confidence: number;
  pr_title: string;
  pr_body: string;
  timestamp: string;
}

export interface RerunResult {
  trace_id: string;
  status: string;
  new_run_id: number | null;
  workflow_url: string;
  message: string;
  timestamp: string;
}

export interface CanaryStatus {
  id: string;
  service: string;
  version: string;
  status: string;
  current_percentage: number;
  target_percentage: number;
  bake_minutes: number;
  bake_elapsed_minutes: number;
  errors_0: number;
  latency_p99_ms: number;
  error_budget_burn_rate: number;
  should_auto_rollback: boolean;
  steps: Array<{stage: number; percentage: number; bake_minutes: number; status: string}>;
  created_at: string;
  updated_at: string;
}

export interface IncidentSummary {
  incident_id: string;
  title: string;
  severity: string;
  status: string;
  root_cause: string;
  impact: string;
  mitigation: string;
  prevention: string[];
  timeline: Array<{timestamp: string; description: string; type: string}>;
  confidence: number;
  uncertainties: string[];
  exportable_markdown: string;
  generated_at: string;
}

export interface GuardianFinding {
  severity: string;
  category: string;
  title: string;
  description: string;
  remediation: string;
  score: number;
}

export interface GuardianCheckResult {
  trace_id: string;
  findings: GuardianFinding[];
  overall_health_score: number;
  timestamp: string;
}

export interface InjectedScenario {
  id: string;
  scenario: string;
  mode: string;
  trace_id: string;
  description: string;
  events: ApiEvent[];
  decisions: ApiDecision[];
  audit: ApiAudit | null;
  is_simulation: boolean;
  injected_at: string;
}

export interface ReplaySession {
  id: string;
  trace_id: string;
  status: string;
  current_step: number;
  total_steps: number;
  steps: Array<{step: number; type: string; timestamp: string; summary: string; [key: string]: any}>;
  created_at: string;
}

export interface RoleCheckResult {
  allowed: boolean;
  user_id: string;
  organization: string;
  role: string;
  reason: string;
  timestamp: string;
}

export interface IncidentSchema {
  id: string;
  title: string;
  severity: string;
  status: string;
  owner: string;
  service: string;
  trace_id: string;
  description: string;
  evidence: any;
  created_at: string;
  resolved_at: string | null;
  mttr_minutes: number | null;
}

export interface OwnershipRecord {
  service: string;
  team: string;
  slack_channel: string;
}

// Global flag to track backend connection status
let isLiveMode = false;

// Generic fetch wrapper with automated mock fallback
async function fetchWithFallback<T>(path: string, fallbackData: T, options?: RequestInit): Promise<T> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      throw new Error(`API error status ${res.status}`);
    }
    
    const data = await res.json();
    isLiveMode = true;
    return data as T;
  } catch (error) {
    console.log(`[ForgeAI API Client] Backend connection offline for path "${path}". Falling back to mock data.`, error);
    isLiveMode = false;
    return fallbackData;
  }
}

// Exportable unified API client
export const apiClient = {
  getIsLiveMode: () => isLiveMode,

  // ---- Events ----

  getEvents: async (limit?: number, offset?: number): Promise<ApiEvent[]> => {
    const fallbackEvents: ApiEvent[] = [
      {
        source: "github",
        type: "PULL_REQUEST_OPENED",
        timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
        trace_id: "gh-delivery-001",
        payload: { pr_number: 127, title: "fix: resolve db pool configuration", repo: "forge/autonomy-os", user: "dev-bot", head_branch: "fix/db-pool", base_branch: "main" }
      },
      {
        source: "github",
        type: "CHECK_SUITE_COMPLETED",
        timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
        trace_id: "gh-delivery-002",
        payload: { head_branch: "fix/db-pool", status: "completed", conclusion: "failure", repo: "forge/autonomy-os", latest_check_runs_count: 3 }
      },
      {
        source: "prometheus",
        type: "METRIC_LATENCY_SPIKE",
        timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
        trace_id: "trace-billing-101",
        payload: { metric: "p99_latency", value: "950ms", threshold: "250ms" }
      }
    ];
    const params = new URLSearchParams();
    if (limit !== undefined) params.set("limit", limit.toString());
    if (offset !== undefined) params.set("offset", offset.toString());
    const qs = params.toString();
    return fetchWithFallback<ApiEvent[]>(`/events${qs ? "?" + qs : ""}`, fallbackEvents);
  },

  // ---- Health ----

  getHealth: async (): Promise<{ status: string; isLive: boolean }> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const res = await fetch("http://localhost:8000/health", { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        isLiveMode = true;
        return { status: data.status, isLive: true };
      }
    } catch (e) {}
    isLiveMode = false;
    return { status: "offline", isLive: false };
  },

  // ---- Decisions ----

  getDecisions: async (limit?: number, offset?: number): Promise<ApiDecision[]> => {
    const fallbackDecisions: ApiDecision[] = [
      {
        id: "dec-101",
        trace_id: "trace-billing-101",
        agent: "SRE Agent",
        action: "Auto-rollback of billing-svc v1.22.0",
        reason: "Elevated p99 latency on billing-svc (950ms vs threshold 250ms).",
        confidence: 0.94,
        risk: 78,
        evidence: { p99: "950ms", error_rate: "12.4%" },
        timestamp: new Date(Date.now() - 11 * 60000).toISOString()
      },
      {
        id: "dec-102",
        trace_id: "trace-ml-102",
        agent: "DevOps Agent",
        action: "Scale ML inference replica set to 8",
        reason: "ML inference queue depth exceeded safe operational threshold.",
        confidence: 0.91,
        risk: 14,
        evidence: { queue_depth: "1420", max_capacity: "500" },
        timestamp: new Date(Date.now() - 30 * 60000).toISOString()
      }
    ];
    const params = new URLSearchParams();
    if (limit !== undefined) params.set("limit", limit.toString());
    if (offset !== undefined) params.set("offset", offset.toString());
    const qs = params.toString();
    return fetchWithFallback<ApiDecision[]>(`/decisions${qs ? "?" + qs : ""}`, fallbackDecisions);
  },

  // ---- Audit ----

  getAudit: async (traceId?: string, limit?: number, offset?: number): Promise<ApiAudit[]> => {
    let url = traceId ? `/audit?trace_id=${traceId}` : "/audit";
    const params = new URLSearchParams();
    if (limit !== undefined) params.set("limit", limit.toString());
    if (offset !== undefined) params.set("offset", offset.toString());
    const paramStr = params.toString();
    if (paramStr) {
      url += url.includes("?") ? `&${paramStr}` : `?${paramStr}`;
    }
    const fallbackAudits: ApiAudit[] = [
      {
        trace_id: "trace-billing-101",
        events: [{
          source: "billing-svc",
          type: "METRIC_LATENCY_SPIKE",
          timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
          trace_id: "trace-billing-101",
          payload: { metric: "p99_latency", value: "950ms", threshold: "250ms" }
        }],
        decisions: [{
          id: "dec-101",
          trace_id: "trace-billing-101",
          agent: "SRE Agent",
          action: "Auto-rollback of billing-svc v1.22.0",
          reason: "Elevated p99 latency on billing-svc (950ms vs threshold 250ms).",
          confidence: 0.94,
          risk: 78,
          evidence: { p99: "950ms", error_rate: "12.4%" },
          timestamp: new Date(Date.now() - 11 * 60000).toISOString()
        }],
        status: "RESOLVED",
        outcome: "Billing-svc rolled back to version v1.21.9. Latency recovered to 140ms.",
        timestamp: new Date(Date.now() - 10 * 60000).toISOString()
      },
      {
        trace_id: "trace-ml-102",
        events: [{
          source: "ml-inference-svc",
          type: "QUEUE_BACKPRESSURE",
          timestamp: new Date(Date.now() - 31 * 60000).toISOString(),
          trace_id: "trace-ml-102",
          payload: { queue_depth: "1420", threshold: "500" }
        }],
        decisions: [{
          id: "dec-102",
          trace_id: "trace-ml-102",
          agent: "DevOps Agent",
          action: "Scale ML inference replica set to 8",
          reason: "ML inference queue depth exceeded safe operational threshold.",
          confidence: 0.91,
          risk: 14,
          evidence: { queue_depth: "1420", max_capacity: "500" },
          timestamp: new Date(Date.now() - 30 * 60000).toISOString()
        }],
        status: "RESOLVED",
        outcome: "Successfully scaled ML inference services. Backlog cleared in 4 minutes.",
        timestamp: new Date(Date.now() - 26 * 60000).toISOString()
      }
    ];
    if (traceId) {
      const single = fallbackAudits.filter(a => a.trace_id === traceId);
      return fetchWithFallback<ApiAudit[]>(url, single);
    }
    return fetchWithFallback<ApiAudit[]>(url, fallbackAudits);
  },

  // ---- Ingest ----

  ingestEvent: async (event: Omit<ApiEvent, "timestamp">): Promise<ApiEvent> => {
    const eventWithTimestamp: ApiEvent = { ...event, timestamp: new Date().toISOString() };
    try {
      const res = await fetch(`${API_BASE_URL}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventWithTimestamp),
      });
      if (res.ok) {
        isLiveMode = true;
        return await res.json();
      }
    } catch (e) {}
    isLiveMode = false;
    return eventWithTimestamp;
  },

  // ---- Simulate ----

  simulateAction: async (): Promise<ApiAudit> => {
    const randomId = Math.random().toString(36).substring(7);
    const fallbackAudit: ApiAudit = {
      trace_id: `sim-fallback-${randomId}`,
      events: [{
        source: "search-svc",
        type: "CPU_USAGE_ALERT",
        timestamp: new Date().toISOString(),
        trace_id: `sim-fallback-${randomId}`,
        payload: { metric: "cpu_utilization", value: "98.2%", threshold: "85.0%" }
      }],
      decisions: [{
        id: `dec-${randomId}`,
        trace_id: `sim-fallback-${randomId}`,
        agent: "SRE Agent",
        action: "Dynamically scale search-svc auto-scaler replicas from 3 to 6",
        reason: "CPU utilization at 98.2% on search-svc, causing p99 latency drift.",
        confidence: 0.97,
        risk: 24,
        evidence: { cpu_utilization: "98.2%", active_pods: 3 },
        timestamp: new Date().toISOString()
      }],
      status: "RESOLVED",
      outcome: "Dynamically provisioned 3 additional search instances.",
      timestamp: new Date().toISOString()
    };
    try {
      const res = await fetch(`${API_BASE_URL}/simulate`, { method: "POST" });
      if (res.ok) {
        isLiveMode = true;
        return await res.json();
      }
    } catch (e) {}
    return fallbackAudit;
  },

  // ---- B-006: Classifier ----

  classifyFailure: async (traceId: string, logOutput: string): Promise<ClassificationResult> => {
    const fallback: ClassificationResult = {
      trace_id: traceId,
      classification: logOutput.toLowerCase().includes("cannot find") || logOutput.toLowerCase().includes("not found") ? "dependency" :
                       logOutput.toLowerCase().includes("undefined") || logOutput.toLowerCase().includes("typeerror") ? "config" :
                       logOutput.toLowerCase().includes("timeout") || logOutput.toLowerCase().includes("timed out") ? "flake" : "unclassified",
      confidence: 0.85,
      evidence: ["Pattern matched from log output analysis"],
      summary: "CI failure classified based on log pattern matching.",
      timestamp: new Date().toISOString()
    };
    try {
      const res = await fetch(`${API_BASE_URL}/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trace_id: traceId,
          log_output: logOutput,
        }),
      });
      if (res.ok) {
        isLiveMode = true;
        return await res.json();
      }
    } catch (e) {}
    return fetchWithFallback<ClassificationResult>("/classify", fallback);
  },

  // ---- B-009: Policy ----

  evaluatePolicy: async (req: {action: string; service: string; risk_score: number; confidence: number; blast_radius: string; trace_id?: string}): Promise<PolicyResult> => {
    const fallback: PolicyResult = {
      trace_id: req.trace_id || "",
      action_class: req.risk_score >= 70 ? "A" : req.risk_score >= 40 ? "B" : "C",
      allowed: true,
      requires_approval: req.risk_score >= 40,
      reason: `Risk score ${req.risk_score} maps to class ${req.risk_score >= 70 ? "A" : req.risk_score >= 40 ? "B" : "C"}`,
      conditions: ["risk-based classification"],
      timestamp: new Date().toISOString(),
    };
    try {
      const res = await fetch(`${API_BASE_URL}/policy/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (res.ok) {
        isLiveMode = true;
        return await res.json();
      }
    } catch (e) {}
    return fetchWithFallback<PolicyResult>("/policy/evaluate", fallback);
  },

  // ---- B-010: Risk ----

  scoreRisk: async (req: any): Promise<RiskScoreResult> => {
    const fallback: RiskScoreResult = {
      trace_id: req.trace_id || "",
      service: req.service,
      version: req.version,
      overall_risk: Math.min(30 + req.files_changed * 5 + (req.is_config_change ? 30 : 0), 100),
      risk_level: "moderate",
      factors: [
        { name: "change_volume", score: Math.min(req.files_changed * 10, 60), description: `Changed ${req.files_changed} files` },
        { name: "service_criticality", score: 50, description: `Service ${req.service}` },
      ],
      recommendation: "Standard canary deployment recommended.",
      timestamp: new Date().toISOString(),
    };
    try {
      const res = await fetch(`${API_BASE_URL}/risk/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (res.ok) {
        isLiveMode = true;
        return await res.json();
      }
    } catch (e) {}
    return fetchWithFallback<RiskScoreResult>("/risk/score", fallback);
  },

  // ---- B-007: Repair ----

  generateRepair: async (req: any): Promise<RepairSuggestion> => {
    const fallback: RepairSuggestion = {
      trace_id: req.trace_id,
      fix_type: req.classification,
      patch: "# Auto-generated fix patch\n- const val = config.some.setting\n+ const val = config?.some?.setting ?? defaultSetting",
      description: `Auto-fix for ${req.classification} failure in ${req.service}`,
      confidence: 0.88,
      pr_title: `fix(${req.service}): resolve ${req.classification} issue`,
      pr_body: `## Auto-fix PR\n\n**Classification**: ${req.classification}\n\nAuto-generated by Forge Autonomy OS.`,
      timestamp: new Date().toISOString(),
    };
    try {
      const res = await fetch(`${API_BASE_URL}/repair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (res.ok) {
        isLiveMode = true;
        return await res.json();
      }
    } catch (e) {}
    return fetchWithFallback<RepairSuggestion>("/repair", fallback);
  },

  // ---- B-036: GitHub PR Creation ----

  createPullRequest: async (req: {
    repo_owner: string;
    repo_name: string;
    file_path: string;
    file_content: string;
    pr_title: string;
    pr_body: string;
    commit_message?: string;
    fix_type?: string;
    base_branch?: string;
    service?: string;
    draft?: boolean;
  }): Promise<{ pr_url: string; pr_number: number; branch_name: string; status: string; success: boolean; message: string }> => {
    const fallback = {
      pr_url: `https://github.com/${req.repo_owner}/${req.repo_name}/pull/new/forge-auto-fix`,
      pr_number: Math.floor(Math.random() * 999) + 1,
      branch_name: `forge-auto/fix-${req.service || "unknown"}-${Date.now()}`,
      status: "open",
      success: true,
      message: "PR created (mock — GITHUB_TOKEN not configured)",
    };
    try {
      const res = await fetch(`${API_BASE_URL}/pr/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_owner: req.repo_owner,
          repo_name: req.repo_name,
          file_path: req.file_path,
          file_content: req.file_content,
          pr_title: req.pr_title,
          pr_body: req.pr_body,
          commit_message: req.commit_message || "fix: auto-generated repair patch",
          fix_type: req.fix_type || "fix",
          base_branch: req.base_branch || "main",
          service: req.service || "",
          draft: req.draft || false,
        }),
      });
      if (res.ok) {
        isLiveMode = true;
        return await res.json();
      }
    } catch (e) {}
    return fallback;
  },

  // ---- B-008: Rerun ----

  triggerRerun: async (req: any): Promise<RerunResult> => {
    const fallback: RerunResult = {
      trace_id: req.trace_id,
      status: "triggered",
      new_run_id: Math.floor(Math.random() * 100000),
      workflow_url: `https://github.com/${req.repo || "forge/autonomy-os"}/actions`,
      message: `Workflow rerun triggered on branch ${req.head_branch || "main"}`,
      timestamp: new Date().toISOString(),
    };
    try {
      const res = await fetch(`${API_BASE_URL}/rerun`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (res.ok) {
        isLiveMode = true;
        return await res.json();
      }
    } catch (e) {}
    return fetchWithFallback<RerunResult>("/rerun", fallback);
  },

  // ---- B-011: Canary ----

  startCanary: async (req: any): Promise<CanaryStatus> => {
    const fallback: CanaryStatus = {
      id: `canary-${req.service}-${(req.version || "v1").replace(/\./g, "-")}`,
      service: req.service,
      version: req.version,
      status: "baking",
      current_percentage: 5,
      target_percentage: req.target_percentage || 25,
      bake_minutes: req.bake_minutes || 10,
      bake_elapsed_minutes: 0,
      errors_0: 0,
      latency_p99_ms: 120,
      error_budget_burn_rate: 0.3,
      should_auto_rollback: false,
      steps: [
        { stage: 1, percentage: 5, bake_minutes: req.bake_minutes || 10, status: "baking" },
        { stage: 2, percentage: 10, bake_minutes: req.bake_minutes || 10, status: "pending" },
        { stage: 3, percentage: 25, bake_minutes: req.bake_minutes || 10, status: "pending" },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    try {
      const res = await fetch(`${API_BASE_URL}/canary/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (res.ok) {
        isLiveMode = true;
        return await res.json();
      }
    } catch (e) {}
    return fetchWithFallback<CanaryStatus>("/canary/start", fallback);
  },

  promoteCanary: async (canaryId: string): Promise<CanaryStatus> => {
    return apiFetchWithFallback<CanaryStatus>(`/canary/promote/${canaryId}`, {
      id: canaryId, service: "", version: "", status: "promoting",
      current_percentage: 25, target_percentage: 50, bake_minutes: 10, bake_elapsed_minutes: 0,
      errors_0: 0, latency_p99_ms: 120, error_budget_burn_rate: 0.3, should_auto_rollback: false,
      steps: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    } as CanaryStatus, "POST");
  },

  rollbackCanary: async (canaryId: string): Promise<CanaryStatus> => {
    return apiFetchWithFallback<CanaryStatus>(`/canary/rollback/${canaryId}`, {
      id: canaryId, service: "", version: "", status: "rolled_back",
      current_percentage: 0, target_percentage: 25, bake_minutes: 10, bake_elapsed_minutes: 0,
      errors_0: 0, latency_p99_ms: 0, error_budget_burn_rate: 0, should_auto_rollback: false,
      steps: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    } as CanaryStatus, "POST");
  },

  getCanary: async (canaryId: string): Promise<CanaryStatus | null> => {
    return apiFetchWithFallback<CanaryStatus | null>(`/canary/${canaryId}`, null);
  },

  listCanaries: async (): Promise<CanaryStatus[]> => {
    return apiFetchWithFallback<CanaryStatus[]>("/canaries", []);
  },

  // ---- B-012: Context ----

  listIncidents: async (service?: string, status?: string): Promise<IncidentSchema[]> => {
    let params = "";
    if (service) params += `?service=${service}`;
    if (status) params += `${params ? "&" : "?"}status=${status}`;
    const fallback: IncidentSchema[] = [
      { id: "INC-2847", title: "Elevated p99 latency on billing-svc", severity: "high", status: "investigating", owner: "SRE Agent", service: "billing-svc", trace_id: "trace-billing-101", description: "", evidence: { p99: "950ms" }, created_at: new Date(Date.now() - 720000).toISOString(), resolved_at: null, mttr_minutes: null },
      { id: "INC-2846", title: "ML inference queue backpressure", severity: "medium", status: "remediating", owner: "DevOps Agent", service: "ml-inference", trace_id: "trace-ml-102", description: "", evidence: { queue_depth: "1420" }, created_at: new Date(Date.now() - 1860000).toISOString(), resolved_at: null, mttr_minutes: null },
    ];
    return apiFetchWithFallback<IncidentSchema[]>(`/incidents${params}`, fallback);
  },

  getIncident: async (incidentId: string): Promise<IncidentSchema | null> => {
    return apiFetchWithFallback<IncidentSchema | null>(`/incidents/${incidentId}`, null);
  },

  getOwnership: async (): Promise<OwnershipRecord[]> => {
    return apiFetchWithFallback<OwnershipRecord[]>("/ownership", []);
  },

  // ---- B-014: Incident Summary ----

  summarizeIncident: async (incidentId: string, traceId?: string): Promise<IncidentSummary> => {
    const fallback: IncidentSummary = {
      incident_id: incidentId,
      title: "Incident Summary",
      severity: "high",
      status: "investigating",
      root_cause: "Deployment regression caused elevated p99 latency.",
      impact: "p99 latency spike to 950ms. Error rate increased to 12.4%.",
      mitigation: "Auto-rollback to previous stable version executed.",
      prevention: ["Add load testing to CI pipeline", "Implement gradual canary rollout"],
      timeline: [],
      confidence: 0.91,
      uncertainties: ["Exact root cause not yet confirmed"],
      exportable_markdown: "# Incident Summary\n\nAuto-generated summary.",
      generated_at: new Date().toISOString(),
    };
    try {
      const res = await fetch(`${API_BASE_URL}/incidents/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident_id: incidentId, trace_id: traceId }),
      });
      if (res.ok) {
        isLiveMode = true;
        return await res.json();
      }
    } catch (e) {}
    return fetchWithFallback<IncidentSummary>("/incidents/summarize", fallback);
  },

  // ---- B-013: Guardian ----

  runGuardianCheck: async (service?: string): Promise<GuardianCheckResult> => {
    const fallback: GuardianCheckResult = {
      trace_id: "guardian-fallback",
      findings: [
        { severity: "warning", category: "boundary", title: "Cross-domain dependency: search-svc → ml-inference", description: "search-svc (discovery) depends on ml-inference (ai-platform) which crosses domain boundaries.", remediation: "Mark the cross-domain dependency as explicitly allowed.", score: 65 },
        { severity: "info", category: "coupling", title: "High fan-in: ledger-svc (2 dependents)", description: "ledger-svc is depended on by 2 upstream services.", remediation: "Consider event-driven decoupling.", score: 45 },
        { severity: "info", category: "tech_debt", title: "High fan-out: api-gateway", description: "api-gateway depends on 3 services.", remediation: "Consider API gateway aggregation.", score: 30 },
      ],
      overall_health_score: 72,
      timestamp: new Date().toISOString(),
    };
    try {
      const res = await fetch(`${API_BASE_URL}/guardian/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: service || "", trace_id: `guardian-${Date.now()}` }),
      });
      if (res.ok) {
        isLiveMode = true;
        return await res.json();
      }
    } catch (e) {}
    return fetchWithFallback<GuardianCheckResult>("/guardian/check", fallback);
  },

  // ---- B-015: Demo ----

  getDemoScenarios: async (): Promise<{scenarios: Record<string, {description: string}>}> => {
    return apiFetchWithFallback<{scenarios: Record<string, {description: string}>}>("/demo/scenarios", {
      scenarios: {
        dependency_mismatch: { description: "A PR introduces a dependency that doesn't resolve in CI." },
        config_error: { description: "A config change causes a type error during build." },
        flaky_test: { description: "A CI pipeline fails due to a timeout in integration tests." },
        latency_spike: { description: "A production latency spike triggers auto-rollback." },
      }
    });
  },

  injectDemoFailure: async (scenario: string, mode: string = "live"): Promise<InjectedScenario> => {
    const fallback: InjectedScenario = {
      id: `demo-${Date.now()}`,
      scenario: scenario,
      mode: mode,
      trace_id: `demo-${scenario}-${Math.random().toString(36).substr(2, 8)}`,
      description: `Injected ${scenario} scenario for demonstration`,
      events: [],
      decisions: [],
      audit: null,
      is_simulation: true,
      injected_at: new Date().toISOString(),
    };
    try {
      const res = await fetch(`${API_BASE_URL}/demo/inject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario, mode }),
      });
      if (res.ok) {
        isLiveMode = true;
        return await res.json();
      }
    } catch (e) {}
    return fetchWithFallback<InjectedScenario>("/demo/inject", fallback);
  },

  // ---- B-016: Replay ----

  startReplay: async (traceId: string): Promise<ReplaySession> => {
    const fallback: ReplaySession = {
      id: `replay-${traceId}`,
      trace_id: traceId,
      status: "paused",
      current_step: 0,
      total_steps: 3,
      steps: [
        { step: 1, type: "event", timestamp: new Date().toISOString(), summary: "Event detected", event_type: "METRIC_LATENCY_SPIKE", source: "billing-svc" },
        { step: 2, type: "decision", timestamp: new Date().toISOString(), summary: "Decision made", action: "Auto-rollback", agent: "SRE Agent", confidence: 0.94, risk: 78 },
        { step: 3, type: "outcome", timestamp: new Date().toISOString(), summary: "Issue resolved", status: "RESOLVED" },
      ],
      created_at: new Date().toISOString(),
    };
    try {
      const res = await fetch(`${API_BASE_URL}/replay/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trace_id: traceId }),
      });
      if (res.ok) {
        isLiveMode = true;
        return await res.json();
      }
    } catch (e) {}
    return fetchWithFallback<ReplaySession>("/replay/start", fallback);
  },

  stepReplay: async (sessionId: string): Promise<ReplaySession> => {
    return apiFetchWithFallback<ReplaySession>(`/replay/${sessionId}/step`, null as any, "POST");
  },

  playReplay: async (sessionId: string): Promise<ReplaySession> => {
    return apiFetchWithFallback<ReplaySession>(`/replay/${sessionId}/play`, null as any, "POST");
  },

  pauseReplay: async (sessionId: string): Promise<ReplaySession> => {
    return apiFetchWithFallback<ReplaySession>(`/replay/${sessionId}/pause`, null as any, "POST");
  },

  resetReplay: async (sessionId: string): Promise<ReplaySession> => {
    return apiFetchWithFallback<ReplaySession>(`/replay/${sessionId}/reset`, null as any, "POST");
  },

  // ---- B-017: RBAC ----

  checkRbacAccess: async (req: any): Promise<RoleCheckResult> => {
    const fallback: RoleCheckResult = {
      allowed: true,
      user_id: req.user_id,
      organization: req.organization || "forge",
      role: "admin",
      reason: "Default allow in development mode",
      timestamp: new Date().toISOString(),
    };
    try {
      const res = await fetch(`${API_BASE_URL}/rbac/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (res.ok) {
        isLiveMode = true;
        return await res.json();
      }
    } catch (e) {}
    return fetchWithFallback<RoleCheckResult>("/rbac/check", fallback);
  },

  getRbacRoles: async (): Promise<Record<string, string[]>> => {
    return apiFetchWithFallback<Record<string, string[]>>("/rbac/roles", {
      admin: ["action:*", "deploy:*", "policy:manage"],
      operator: ["action:class_b", "action:class_c", "deploy:canary"],
      engineer: ["action:class_c", "incidents:view"],
      viewer: ["dashboard:view", "incidents:view"],
    });
  },

  exportAuditLog: async (): Promise<any[]> => {
    return apiFetchWithFallback<any[]>("/rbac/audit/export", []);
  },

  // ---- Policy-as-Code ----

  listPolicies: async (enabledOnly: boolean = false): Promise<any[]> => {
    const url = enabledOnly ? "/policy/policies?enabled_only=true" : "/policy/policies";
    return apiFetchWithFallback<any[]>(url, []);
  },

  getPolicy: async (name: string): Promise<any | null> => {
    return apiFetchWithFallback<any | null>(`/policy/policies/${name}`, null);
  },

  createPolicy: async (policy: any): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE_URL}/policy/policies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policy),
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return policy;
  },

  updatePolicy: async (name: string, policy: any): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE_URL}/policy/policies/${name}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policy),
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return policy;
  },

  deletePolicy: async (name: string): Promise<any> => {
    return apiFetchWithFallback<any>(`/policy/policies/${name}`, { status: "deleted" }, "DELETE");
  },

  evaluatePolicyAsCode: async (req: any): Promise<any> => {
    const fallback = {
      matched_policy: "production-safety",
      matched_rule: req.risk_score >= 70 ? "high-risk-block" : req.risk_score >= 40 ? "medium-risk-approval" : "high-risk-auto-approve",
      action_class: req.risk_score >= 70 ? "A" : req.risk_score >= 40 ? "B" : "C",
      allowed: req.risk_score < 70,
      requires_approval: req.risk_score >= 30,
      auto_approved: req.risk_score < 30 && req.confidence >= 0.85,
      policies_evaluated: 1,
      description: "Evaluated against applicable policies.",
    };
    try {
      const res = await fetch(`${API_BASE_URL}/policy/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (res.ok) {
        isLiveMode = true;
        return await res.json();
      }
    } catch (e) {}
    return fallback;
  },

  // ---- Workflows ----

  listWorkflows: async (): Promise<any[]> => {
    return apiFetchWithFallback<any[]>("/workflows", []);
  },

  getWorkflow: async (workflowId: string): Promise<any | null> => {
    return apiFetchWithFallback<any | null>(`/workflows/${workflowId}`, null);
  },

  createWorkflow: async (workflow: any): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE_URL}/workflows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workflow),
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return workflow;
  },

  updateWorkflow: async (workflowId: string, workflow: any): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE_URL}/workflows/${workflowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workflow),
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return workflow;
  },

  deleteWorkflow: async (workflowId: string): Promise<any> => {
    return apiFetchWithFallback<any>(`/workflows/${workflowId}`, { status: "deleted" }, "DELETE");
  },

  executeWorkflow: async (workflowId: string): Promise<any> => {
    return apiFetchWithFallback<any>(`/workflows/${workflowId}/execute`, { status: "completed", steps: [] }, "POST");
  },

  // ---- Chaos Engineering ----

  injectFault: async (req: any): Promise<any> => {
    const fallback = {
      id: `fault-${Math.random().toString(36).substr(2, 8)}`,
      service: req.service,
      fault_type: req.fault_type,
      duration_seconds: req.duration_seconds,
      intensity: req.intensity,
      target_percentage: req.target_percentage || 100,
      status: "active",
      started_at: new Date().toISOString(),
    };
    try {
      const res = await fetch(`${API_BASE_URL}/chaos/faults`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (res.ok) {
        isLiveMode = true;
        return await res.json();
      }
    } catch (e) {}
    return fallback;
  },

  listActiveFaults: async (): Promise<any[]> => {
    return apiFetchWithFallback<any[]>("/chaos/faults", []);
  },

  stopFault: async (faultId: string): Promise<any> => {
    return apiFetchWithFallback<any>(`/chaos/faults/${faultId}/stop`, { status: "stopped" }, "POST");
  },

  simulateFaultImpact: async (faultId: string): Promise<any> => {
    return apiFetchWithFallback<any>(`/chaos/faults/${faultId}/simulate`, {
      p99_latency_ms: 1200, error_rate_pct: 15.5
    }, "POST");
  },

  listResilienceTests: async (): Promise<any[]> => {
    return apiFetchWithFallback<any[]>("/chaos/tests", []);
  },

  getResilienceTest: async (testId: string): Promise<any | null> => {
    return apiFetchWithFallback<any | null>(`/chaos/tests/${testId}`, null);
  },

  createResilienceTest: async (test: any): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE_URL}/chaos/tests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(test),
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return test;
  },

  runResilienceTest: async (testId: string): Promise<any> => {
    return apiFetchWithFallback<any>(`/chaos/tests/${testId}/run`, { status: "completed" }, "POST");
  },

  getChaosSummary: async (): Promise<any> => {
    return apiFetchWithFallback<any>("/chaos/summary", {
      active_faults: 0, completed_tests: 3, services_affected: [],
      overall_resilience_score: 75, last_test_at: null,
    });
  },

  // ---- B-021: Quarantine ----

  handleRetryBackoff: async (req: any): Promise<any> => {
    const fallback = {
      trace_id: req.trace_id,
      test_name: req.test_name || "unknown-test",
      status: "quarantined",
      current_retry: 0, max_retries: 3, backoff_seconds: 10.0,
      quarantine_until: new Date(Date.now() + 30*60000).toISOString(),
      message: `Test quarantined for 30min with exponential backoff`,
    };
    try {
      const res = await fetch(`${API_BASE_URL}/quarantine/retry`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (res.ok) { isLiveMode = true; return await res.json(); }
    } catch (e) {}
    return fallback;
  },

  markTestPassed: async (testName: string): Promise<any> => {
    return apiFetchWithFallback<any>(`/quarantine/pass/${testName}`, { status: "passed" }, "POST");
  },

  listQuarantineRules: async (): Promise<any[]> => {
    return apiFetchWithFallback<any[]>("/quarantine/rules", []);
  },

  getQuarantineRule: async (name: string): Promise<any | null> => {
    return apiFetchWithFallback<any | null>(`/quarantine/rules/${name}`, null);
  },

  createQuarantineRule: async (rule: any): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE_URL}/quarantine/rules`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rule),
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return rule;
  },

  updateQuarantineRule: async (name: string, rule: any): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE_URL}/quarantine/rules/${name}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rule),
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return rule;
  },

  deleteQuarantineRule: async (name: string): Promise<any> => {
    return apiFetchWithFallback<any>(`/quarantine/rules/${name}`, { status: "deleted" }, "DELETE");
  },

  listQuarantinedTests: async (status?: string): Promise<any[]> => {
    const url = status ? `/quarantine/tests?status=${status}` : "/quarantine/tests";
    return apiFetchWithFallback<any[]>(url, []);
  },

  getQuarantinedTest: async (testName: string): Promise<any | null> => {
    return apiFetchWithFallback<any | null>(`/quarantine/tests/${testName}`, null);
  },

  // ---- B-022: Templates ----

  listTemplates: async (category?: string, enabledOnly?: boolean): Promise<any[]> => {
    let url = "/templates";
    const params = [];
    if (category) params.push(`category=${category}`);
    if (enabledOnly) params.push(`enabled_only=true`);
    if (params.length) url += `?${params.join("&")}`;
    return apiFetchWithFallback<any[]>(url, []);
  },

  getTemplate: async (name: string): Promise<any | null> => {
    return apiFetchWithFallback<any | null>(`/templates/${name}`, null);
  },

  createTemplate: async (template: any): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE_URL}/templates`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return template;
  },

  updateTemplate: async (name: string, template: any): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE_URL}/templates/${name}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return template;
  },

  deleteTemplate: async (name: string): Promise<any> => {
    return apiFetchWithFallback<any>(`/templates/${name}`, { status: "deleted" }, "DELETE");
  },

  applyTemplate: async (req: any): Promise<any> => {
    const fallback = {
      template_name: req.template_name, version: "1.0.0", applied: true,
      patch: "# Auto-generated fix patch from template",
      validation_errors: [], warnings: [],
      message: `Template '${req.template_name}' applied successfully`,
    };
    try {
      const res = await fetch(`${API_BASE_URL}/templates/apply`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (res.ok) { isLiveMode = true; return await res.json(); }
    } catch (e) {}
    return fallback;
  },

  // ---- B-023: PM Agent — Backlog, Sprints, Blockers ----

  listBacklogItems: async (status: string = "", priority: string = "", service: string = ""): Promise<any[]> => {
    let url = "/pm/backlog";
    const params = [];
    if (status) params.push(`status=${status}`);
    if (priority) params.push(`priority=${priority}`);
    if (service) params.push(`service=${service}`);
    if (params.length) url += `?${params.join("&")}`;
    return apiFetchWithFallback<any[]>(url, []);
  },

  getBacklogItem: async (itemId: string): Promise<any | null> => {
    return apiFetchWithFallback<any | null>(`/pm/backlog/${itemId}`, null);
  },

  createBacklogItem: async (item: any): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE_URL}/pm/backlog`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (res.ok) { return await res.json(); }
    } catch (e) {}
    return item;
  },

  updateBacklogItem: async (itemId: string, item: any): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE_URL}/pm/backlog/${itemId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return item;
  },

  deleteBacklogItem: async (itemId: string): Promise<any> => {
    return apiFetchWithFallback<any>(`/pm/backlog/${itemId}`, { status: "deleted" }, "DELETE");
  },

  decomposeBacklog: async (description: string, service: string = "", tags: string[] = []): Promise<any[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/pm/backlog/decompose`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, service, tags }),
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return [];
  },

  listBlockers: async (activeOnly: boolean = false): Promise<any[]> => {
    const url = activeOnly ? "/pm/blockers?active_only=true" : "/pm/blockers";
    return apiFetchWithFallback<any[]>(url, []);
  },

  detectBlockers: async (): Promise<any[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/pm/blockers/detect`, { method: "POST" });
      if (res.ok) return await res.json();
    } catch (e) {}
    return [];
  },

  resolveBlocker: async (blockerId: string): Promise<any> => {
    return apiFetchWithFallback<any>(`/pm/blockers/${blockerId}/resolve`, { status: "resolved" }, "POST");
  },

  listSprints: async (status: string = ""): Promise<any[]> => {
    const url = status ? `/pm/sprints?status=${status}` : "/pm/sprints";
    return apiFetchWithFallback<any[]>(url, []);
  },

  getSprint: async (sprintId: string): Promise<any | null> => {
    return apiFetchWithFallback<any | null>(`/pm/sprints/${sprintId}`, null);
  },

  generateSprintPlan: async (req: any): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE_URL}/pm/sprints/plan`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  startSprint: async (sprintId: string): Promise<any> => {
    return apiFetchWithFallback<any>(`/pm/sprints/${sprintId}/start`, null, "POST");
  },

  completeSprint: async (sprintId: string): Promise<any> => {
    return apiFetchWithFallback<any>(`/pm/sprints/${sprintId}/complete`, null, "POST");
  },

  // ---- B-025: Pilot Onboarding Dashboard ----

  getPilotDashboard: async (): Promise<any> => {
    return apiFetchWithFallback<any>("/onboarding/dashboard", {
      kpis: [], services: [], autonomy_metrics: [], tenants: [],
      overall_health_score: 0, active_incidents: 0,
      total_decisions_24h: 0, autonomy_rate_24h: 0,
      generated_at: new Date().toISOString(),
    });
  },

  getOnboardingKpis: async (): Promise<any[]> => {
    return apiFetchWithFallback<any[]>("/onboarding/kpis", []);
  },

  getServiceHealth: async (): Promise<any[]> => {
    return apiFetchWithFallback<any[]>("/onboarding/services", []);
  },

  getAutonomyMetrics: async (): Promise<any[]> => {
    return apiFetchWithFallback<any[]>("/onboarding/metrics/autonomy", []);
  },

  listTenants: async (status: string = ""): Promise<any[]> => {
    const url = status ? `/onboarding/tenants?status=${status}` : "/onboarding/tenants";
    return apiFetchWithFallback<any[]>(url, []);
  },

  getTenant: async (tenantId: string): Promise<any | null> => {
    return apiFetchWithFallback<any | null>(`/onboarding/tenants/${tenantId}`, null);
  },

  createTenant: async (tenant: any): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE_URL}/onboarding/tenants`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tenant),
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return tenant;
  },

  updateTenantReadiness: async (tenantId: string, checks: Record<string, boolean>): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE_URL}/onboarding/tenants/${tenantId}/readiness`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checks),
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  // ---- Persistence ----

  getPersistenceStats: async (): Promise<any> => {
    return apiFetchWithFallback<any>("/persistence/stats", { available: false, mode: "in-memory" });
  },

  resetPersistence: async (): Promise<any> => {
    return apiFetchWithFallback<any>("/persistence/reset", { status: "reset" }, "POST");
  },

  validateTemplateYaml: async (name: string, content: string): Promise<string[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/templates/${name}/validate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return [];
  },
};

// Helper for simple GET/POST with fallback
async function apiFetchWithFallback<T>(path: string, fallback: T, method: string = "GET"): Promise<T> {
  try {
    const opts: RequestInit = { method };
    if (method !== "GET") {
      opts.headers = { "Content-Type": "application/json" };
    }
    const res = await fetch(`${API_BASE_URL}${path}`, opts);
    if (res.ok) {
      isLiveMode = true;
      return await res.json();
    }
  } catch (e) {}
  return fallback;
}
