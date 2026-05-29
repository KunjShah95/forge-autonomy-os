import { useEffect, useState } from "react";
import { events as seed } from "@/lib/mock";
import { apiClient, ApiEvent } from "@/lib/apiClient";

const levelColor: Record<string, string> = {
  info: "text-primary",
  ok: "text-neon-green",
  warn: "text-neon-amber",
  err: "text-neon-red",
};

// Map event types to display levels
function getEventLevel(event: ApiEvent): string {
  const type = event.type;
  if (type.includes("COMPLETED") || type.includes("SPIKE") || type.includes("BACKPRESSURE")) {
    return event.payload?.conclusion === "success" ? "ok" : "warn";
  }
  if (type.includes("CLOSED") || type.includes("ROLLBACK")) return "err";
  return "info";
}

// Map event to display agent name
function getEventAgent(event: ApiEvent): string {
  if (event.source === "github") {
    if (event.type.startsWith("PULL_REQUEST")) return "GitHub";
    if (event.type.startsWith("CHECK_SUITE")) return "CI";
    if (event.type.startsWith("WORKFLOW_RUN")) return "Actions";
  }
  return event.source.toUpperCase();
}

// Format event into a display message
function formatEventMessage(event: ApiEvent): string {
  const p = event.payload || {};
  switch (event.type) {
    case "PULL_REQUEST_OPENED":
      return `PR #${p.pr_number} opened: ${p.title || ""} (${p.head_branch} → ${p.base_branch})`;
    case "PULL_REQUEST_CLOSED":
      return `PR #${p.pr_number} ${p.merged ? "merged" : "closed"}: ${p.title || ""}`;
    case "PULL_REQUEST_SYNC":
      return `PR #${p.pr_number} updated: ${p.title || ""}`;
    case "CHECK_SUITE_COMPLETED":
      return `Check suite ${p.conclusion || "completed"} on ${p.head_branch || "unknown"} (${p.latest_check_runs_count || "?"} checks)`;
    case "CHECK_SUITE_REQUESTED":
      return `Check suite requested for ${p.head_branch || "unknown"}`;
    case "WORKFLOW_RUN_COMPLETED":
      return `Workflow ${p.workflow_name || ""} ${p.conclusion || "completed"} — ${p.head_branch}`;
    case "WORKFLOW_RUN_IN_PROGRESS":
      return `Workflow ${p.workflow_name || ""} running — ${p.head_branch}`;
    case "METRIC_LATENCY_SPIKE":
      return `Latency spike: ${p.metric || "p99"} = ${p.value || "?"} (threshold: ${p.threshold || "?"})`;
    case "QUEUE_BACKPRESSURE":
      return `Queue backpressure: depth ${p.queue_depth || "?"} (threshold: ${p.threshold || "?"})`;
    case "CPU_USAGE_ALERT":
      return `CPU alert: ${p.value || "?"} on ${p.service || "unknown"}`;
    default:
      return `[${event.type}] ${p.pr_number ? `PR #${p.pr_number}: ` : ""}${p.title || p.message || ""}`;
  }
}

const extras = [
  { agent: "SRE", msg: "Auto-scaled orders-svc 4→7 replicas (CPU 78%)", level: "info" },
  { agent: "QA", msg: "Synthesized 12 edge-case tests for billing-svc", level: "ok" },
  { agent: "Security", msg: "Rotated KMS key kms-prod-04 (90-day policy)", level: "ok" },
  { agent: "Arch", msg: "Proposed extracting payments → payments-svc (debt -18%)", level: "info" },
  { agent: "DevOps", msg: "Cache hit ratio +4.2% after redis warmup", level: "ok" },
  { agent: "SRE", msg: "Error budget for users-svc burned 3.1x in 10m window", level: "warn" },
];

export const LogStream = ({ max = 12 }: { max?: number }) => {
  const [items, setItems] = useState<{t: string; agent: string; msg: string; level: string}[]>(
    seed.slice(0, max).map(e => ({...e, t: e.t}))
  );

  // Load API events on mount and periodically
  useEffect(() => {
    const loadEvents = async () => {
      const events = await apiClient.getEvents();
      if (events.length > 0) {
        const formatted = events.map((e: ApiEvent) => ({
          t: new Date(e.timestamp).toLocaleTimeString("en-US", { hour12: false }),
          agent: getEventAgent(e),
          msg: formatEventMessage(e),
          level: getEventLevel(e),
        }));
        setItems(formatted.slice(0, max));
      }
    };

    loadEvents();
    const loadInterval = setInterval(loadEvents, 8000);
    return () => clearInterval(loadInterval);
  }, [max]);

  // Simulated periodic extras for ambient liveliness
  useEffect(() => {
    const id = setInterval(() => {
      const e = extras[Math.floor(Math.random() * extras.length)];
      const t = new Date().toISOString().slice(11, 19);
      setItems(prev => [{ t, ...e }, ...prev].slice(0, max));
    }, 2400);
    return () => clearInterval(id);
  }, [max]);
  return (
    <div className="font-mono text-[11px] leading-relaxed p-4 overflow-y-auto h-full">
      {items.map((e, i) => (
        <div key={i} className="flex gap-2 py-0.5 animate-fade-in">
          <span className="text-muted-foreground/60">{e.t}</span>
          <span className="text-accent">[{e.agent}]</span>
          <span className={levelColor[e.level]}>›</span>
          <span className="text-foreground/80 flex-1">{e.msg}</span>
        </div>
      ))}
    </div>
  );
};
