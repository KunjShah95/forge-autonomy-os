import { useState, useEffect } from "react";
import { Panel } from "@/components/ui-kit/Panels";
import { apiClient, ApiDecision } from "@/lib/apiClient";
import { Bot, GitBranch, Shield, Sparkles, Activity, AlertTriangle, CheckCircle2, XCircle, Clock } from "lucide-react";

interface TimelineEntry {
  id: string;
  timestamp: string;
  agent: string;
  agent_role: string;
  action: string;
  description: string;
  entry_type: string;
  trace_id: string;
  service: string;
  confidence?: number;
  risk?: number;
  status: string;
  outcome: string;
}

interface TimelineData {
  entries: TimelineEntry[];
  total_agents: number;
  agents_active: string[];
  time_range_hours: number;
  generated_at: string;
}

const AGENT_ICONS: Record<string, typeof Bot> = {
  "SRE Agent": Activity,
  "DevOps Agent": GitBranch,
  "QA Agent": Shield,
  "Security Agent": Shield,
  "Arch Agent": Sparkles,
  "PM Agent": Bot,
  "Incident Commander": AlertTriangle,
};

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  info: Clock,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const STATUS_COLORS: Record<string, string> = {
  info: "text-blue-400",
  success: "text-neon-green",
  warning: "text-neon-amber",
  error: "text-neon-red",
};

const CollaborationTimeline = () => {
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterAgent, setFilterAgent] = useState<string>("");
  const [stats, setStats] = useState<any>(null);

  const loadTimeline = async () => {
    try {
      let url = "/timeline?limit=100&offset=0";
      if (filterAgent) url += `&agent=${filterAgent}`;
      
      // Use fetch directly since apiClient doesn't have timeline yet
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`http://localhost:8000/api/v1${url}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        setTimeline(data);
      }
    } catch (e) {
      // Fallback mock data
      setTimeline({
        entries: MOCK_ENTRIES,
        total_agents: 6,
        agents_active: ["SRE Agent", "DevOps Agent", "QA Agent", "Security Agent", "Arch Agent", "PM Agent"],
        time_range_hours: 24,
        generated_at: new Date().toISOString(),
      });
    }
    setLoading(false);
  };

  const loadStats = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch("http://localhost:8000/api/v1/timeline/summary", { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) setStats(await res.json());
    } catch (e) {}
  };

  useEffect(() => {
    loadTimeline();
    loadStats();
    const interval = setInterval(loadTimeline, 6000);
    return () => clearInterval(interval);
  }, [filterAgent]);

  const formatTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return ts;
    }
  };

  const getAgentIcon = (agent: string) => AGENT_ICONS[agent] || Bot;
  const getStatusIcon = (status: string) => STATUS_ICONS[status] || Clock;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative glass rounded-2xl p-6 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-accent/10 blur-3xl rounded-full pointer-events-none" />
        <div className="relative">
          <div className="mono text-[10px] uppercase tracking-[0.2em] text-primary flex items-center gap-2 mb-2">
            <Sparkles className="h-3.5 w-3.5" /> Cross-Agent Collaboration · B-024
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Collaboration Timeline</h1>
          <p className="text-muted-foreground mt-2 text-sm max-w-2xl">
            Unified chronological view of decisions, events, incidents, and audit actions across all AI agents.
            See which agent acted when, why, and what the outcome was.
          </p>
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Panel eyebrow="Activity" title="Decisions (24h)" className="!p-4">
            <div className="font-display text-2xl font-bold">{stats.recent_decisions_24h || 0}</div>
          </Panel>
          <Panel eyebrow="Agents" title="Active Agents" className="!p-4">
            <div className="font-display text-2xl font-bold">{timeline?.total_agents || 0}</div>
          </Panel>
          <Panel eyebrow="Total" title="All Decisions" className="!p-4">
            <div className="font-display text-2xl font-bold">{stats.total_decisions || 0}</div>
          </Panel>
          <Panel eyebrow="Events" title="Total Events" className="!p-4">
            <div className="font-display text-2xl font-bold">{stats.total_events || 0}</div>
          </Panel>
        </div>
      )}

      {/* Agent Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterAgent("")}
          className={`mono text-xs px-3 py-1.5 rounded-full border transition ${
            !filterAgent ? "bg-primary/20 border-primary text-primary" : "border-border hover:border-primary/40"
          }`}
        >
          All Agents
        </button>
        {(timeline?.agents_active || []).map((agent) => (
          <button
            key={agent}
            onClick={() => setFilterAgent(agent === filterAgent ? "" : agent)}
            className={`mono text-xs px-3 py-1.5 rounded-full border transition ${
              filterAgent === agent ? "bg-accent/20 border-accent text-accent" : "border-border hover:border-accent/40"
            }`}
          >
            {agent}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <Panel eyebrow="Chronological" title="Agent Activity Feed" className="">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading timeline...</div>
        ) : (
          <div className="divide-y divide-border/50 max-h-[600px] overflow-y-auto">
            {timeline?.entries.map((entry) => {
              const Icon = getAgentIcon(entry.agent);
              const StatusIcon = getStatusIcon(entry.status);
              const color = STATUS_COLORS[entry.status] || "text-muted-foreground";
              return (
                <div key={entry.id} className="flex gap-4 px-5 py-3 hover:bg-secondary/40 transition group">
                  {/* Timeline line indicator */}
                  <div className="flex flex-col items-center gap-1.5 pt-0.5">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center ${color} bg-background border border-border/50`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="w-px flex-1 bg-border/30 min-h-[24px]" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="mono text-[11px] text-accent font-semibold">{entry.agent}</span>
                      <span className="mono text-[9px] text-muted-foreground uppercase tracking-wider">{entry.agent_role}</span>
                      <span className="mono text-[9px] text-muted-foreground">{formatTime(entry.timestamp)}</span>
                      <span className={`mono text-[9px] uppercase ${color}`}>{entry.entry_type}</span>
                    </div>
                    <div className="text-sm font-medium mt-0.5">{entry.action}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{entry.description}</div>
                    
                    {/* Meta badges */}
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      {entry.confidence && (
                        <span className="mono text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          confidence {Math.round(entry.confidence * 100)}%
                        </span>
                      )}
                      {entry.risk !== undefined && (
                        <span className={`mono text-[9px] px-1.5 py-0.5 rounded ${
                          entry.risk >= 70 ? "bg-neon-red/10 text-neon-red" :
                          entry.risk >= 40 ? "bg-neon-amber/10 text-neon-amber" :
                          "bg-neon-green/10 text-neon-green"
                        }`}>
                          risk {entry.risk}
                        </span>
                      )}
                      {entry.service && (
                        <span className="mono text-[9px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
                          {entry.service}
                        </span>
                      )}
                      {entry.trace_id && (
                        <span className="mono text-[9px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
                          {entry.trace_id}
                        </span>
                      )}
                      {entry.outcome && (
                        <span className={`mono text-[9px] flex items-center gap-1 ${color}`}>
                          <StatusIcon className="h-3 w-3" /> {entry.outcome}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {timeline?.entries.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">No timeline entries found.</div>
            )}
          </div>
        )}
      </Panel>

      {/* Agent decision distribution */}
      {stats?.agent_decision_counts && (
        <Panel eyebrow="Distribution" title="Decisions by Agent">
          <div className="p-5 space-y-3">
            {Object.entries(stats.agent_decision_counts).map(([agent, count]) => {
              const maxCount = Math.max(...Object.values(stats.agent_decision_counts)) as number;
              const pct = ((count as number) / maxCount) * 100;
              const AgentIcon = AGENT_ICONS[agent] || Bot;
              return (
                <div key={agent} className="flex items-center gap-3">
                  <AgentIcon className="h-4 w-4 text-accent shrink-0" />
                  <span className="text-sm w-32 shrink-0">{agent}</span>
                  <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="mono text-xs text-muted-foreground w-12 text-right">{count as number}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
};

// Mock fallback entries when backend is offline
const MOCK_ENTRIES: TimelineEntry[] = [
  {
    id: "tl-1",
    timestamp: new Date(Date.now() - 60000).toISOString(),
    agent: "SRE Agent",
    agent_role: "Site Reliability",
    action: "Auto-rollback of billing-svc v1.22.0",
    description: "Elevated p99 latency on billing-svc (950ms vs threshold 250ms). Auto-rollback executed with 94% confidence.",
    entry_type: "decision",
    trace_id: "trace-billing-101",
    service: "billing-svc",
    confidence: 0.94,
    risk: 78,
    status: "warning",
    outcome: "rolled back",
  },
  {
    id: "tl-2",
    timestamp: new Date(Date.now() - 120000).toISOString(),
    agent: "CI",
    agent_role: "CI/CD Pipeline",
    action: "Event: CHECK_SUITE_COMPLETED",
    description: "Check suite completed with conclusion: failure on branch fix/db-pool (3 checks)",
    entry_type: "event",
    trace_id: "gh-delivery-002",
    service: "forge/autonomy-os",
    status: "error",
    outcome: "failure",
  },
  {
    id: "tl-3",
    timestamp: new Date(Date.now() - 300000).toISOString(),
    agent: "DevOps Agent",
    agent_role: "DevOps",
    action: "Scale ML inference replica set to 8",
    description: "ML inference queue depth exceeded safe operational threshold (1420 vs 500 max).",
    entry_type: "decision",
    trace_id: "trace-ml-102",
    service: "ml-inference",
    confidence: 0.91,
    risk: 14,
    status: "success",
    outcome: "scaled",
  },
  {
    id: "tl-4",
    timestamp: new Date(Date.now() - 600000).toISOString(),
    agent: "prometheus",
    agent_role: "Monitoring",
    action: "Event: METRIC_LATENCY_SPIKE",
    description: "p99_latency = 950ms (threshold: 250ms) on billing-svc",
    entry_type: "event",
    trace_id: "trace-billing-101",
    service: "billing-svc",
    status: "warning",
    outcome: "",
  },
  {
    id: "tl-5",
    timestamp: new Date(Date.now() - 900000).toISOString(),
    agent: "Security Agent",
    agent_role: "Security",
    action: "Rotated KMS key kms-prod-04 (90-day policy)",
    description: "Automated key rotation per security policy. New key activated with 30-day grace period.",
    entry_type: "decision",
    trace_id: "sec-auto-042",
    confidence: 0.99,
    risk: 55,
    status: "success",
    outcome: "rotated",
  },
  {
    id: "tl-6",
    timestamp: new Date(Date.now() - 1500000).toISOString(),
    agent: "PM Agent",
    agent_role: "Project Management",
    action: "Reprioritized 4 backlog items based on incident pattern",
    description: "Resequenced sprint priorities: 2 items promoted to critical, 2 demoted to backlog based on billing-svc incident correlation.",
    entry_type: "decision",
    trace_id: "pm-auto-1293",
    confidence: 0.86,
    risk: 12,
    status: "info",
    outcome: "reprioritized",
  },
  {
    id: "tl-7",
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    agent: "QA Agent",
    agent_role: "Quality Assurance",
    action: "Synthesized 12 edge-case tests for billing-svc",
    description: "Auto-generated regression tests based on p99 latency patterns. 12/12 test cases validated.",
    entry_type: "decision",
    trace_id: "qa-auto-v2.14.3",
    confidence: 0.97,
    risk: 5,
    status: "success",
    outcome: "synthesized",
  },
  {
    id: "tl-8",
    timestamp: new Date(Date.now() - 2400000).toISOString(),
    agent: "Arch Agent",
    agent_role: "Architecture Guardian",
    action: "Cross-domain dependency: search-svc → ml-inference",
    description: "search-svc (discovery) depends on ml-inference (ai-platform) which crosses domain boundaries. Score: 65.",
    entry_type: "decision",
    trace_id: "guardian-auto-442",
    service: "search-svc",
    confidence: 0.88,
    risk: 45,
    status: "warning",
    outcome: "flagged",
  },
];

export default CollaborationTimeline;
