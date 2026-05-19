// Realistic fake data for ForgeAI
export const agents = [
  { id: "pm", name: "PM Agent", role: "Product Management", icon: "Briefcase", color: "primary", status: "active", confidence: 94, tasks: 7, decisions: 142, mttr: "4m", desc: "Prioritizes backlog, drafts specs, syncs cross-team OKRs." },
  { id: "qa", name: "QA Agent", role: "Quality Assurance", icon: "ShieldCheck", color: "accent", status: "active", confidence: 97, tasks: 24, decisions: 891, mttr: "2m", desc: "Auto-generates test suites, validates regressions." },
  { id: "devops", name: "DevOps Agent", role: "Pipelines & Infra", icon: "Cog", color: "primary", status: "active", confidence: 91, tasks: 12, decisions: 412, mttr: "3m", desc: "Manages CI/CD, IaC drift, deployments." },
  { id: "sec", name: "Security Agent", role: "AppSec & Compliance", icon: "ShieldAlert", color: "neon-pink", status: "active", confidence: 88, tasks: 5, decisions: 211, mttr: "8m", desc: "Scans dependencies, IAM, secrets, SAST." },
  { id: "sre", name: "SRE Agent", role: "Reliability", icon: "Activity", color: "neon-amber", status: "watching", confidence: 93, tasks: 3, decisions: 1042, mttr: "1m", desc: "Watches SLOs, anomaly detection, auto-rollbacks." },
  { id: "arch", name: "Architecture Agent", role: "Systems Design", icon: "Network", color: "accent", status: "active", confidence: 89, tasks: 9, decisions: 76, mttr: "12m", desc: "Maps services, surfaces bottlenecks & debt." },
];

export const services = [
  { id: "gateway", name: "api-gateway", x: 50, y: 15, health: 99, status: "healthy" },
  { id: "auth", name: "auth-svc", x: 20, y: 35, health: 98, status: "healthy" },
  { id: "users", name: "users-svc", x: 50, y: 40, health: 96, status: "healthy" },
  { id: "billing", name: "billing-svc", x: 80, y: 35, health: 87, status: "degraded" },
  { id: "orders", name: "orders-svc", x: 30, y: 65, health: 99, status: "healthy" },
  { id: "ledger", name: "ledger-svc", x: 70, y: 65, health: 100, status: "healthy" },
  { id: "search", name: "search-svc", x: 50, y: 85, health: 92, status: "healthy" },
  { id: "ml", name: "ml-inference", x: 15, y: 80, health: 78, status: "warning" },
  { id: "cache", name: "redis-cluster", x: 85, y: 80, health: 100, status: "healthy" },
];

export const edges = [
  ["gateway","auth"],["gateway","users"],["gateway","billing"],
  ["users","orders"],["billing","ledger"],["orders","ledger"],
  ["users","search"],["orders","search"],["search","ml"],["billing","cache"],["users","cache"],
];

export const incidents = [
  { id: "INC-2847", title: "Elevated p99 latency on billing-svc", severity: "high", status: "investigating", owner: "SRE Agent", time: "12m ago", progress: 64 },
  { id: "INC-2846", title: "ML inference queue backpressure", severity: "medium", status: "remediating", owner: "DevOps Agent", time: "31m ago", progress: 82 },
  { id: "INC-2845", title: "Auth token TTL drift detected", severity: "low", status: "auto-resolved", owner: "Security Agent", time: "1h ago", progress: 100 },
  { id: "INC-2844", title: "Canary failed health check (orders-svc v2.14)", severity: "high", status: "rolled-back", owner: "DevOps Agent", time: "2h ago", progress: 100 },
];

export const deployments = [
  { id: "dep-9412", service: "orders-svc", version: "v2.14.3", env: "prod", status: "deployed", risk: 12, time: "3m" },
  { id: "dep-9411", service: "users-svc", version: "v3.8.1", env: "prod", status: "canary", risk: 28, time: "8m" },
  { id: "dep-9410", service: "billing-svc", version: "v1.22.0", env: "staging", status: "testing", risk: 41, time: "14m" },
  { id: "dep-9409", service: "search-svc", version: "v4.1.0", env: "prod", status: "deployed", risk: 8, time: "22m" },
  { id: "dep-9408", service: "ml-inference", version: "v0.9.2", env: "prod", status: "rolled-back", risk: 78, time: "1h" },
];

export const events = [
  { t: "00:14", agent: "SRE", msg: "Detected anomaly in billing-svc p99 → opened INC-2847", level: "warn" },
  { t: "00:13", agent: "DevOps", msg: "Promoted users-svc v3.8.1 canary → 25% traffic", level: "info" },
  { t: "00:12", agent: "QA", msg: "Generated 47 regression tests for orders-svc/v2.14.3", level: "info" },
  { t: "00:11", agent: "Security", msg: "CVE-2025-31021 patched in auth-svc dependency tree", level: "ok" },
  { t: "00:10", agent: "PM", msg: "Reprioritized sprint: pulled in 3 P0s, deferred 1 P3", level: "info" },
  { t: "00:09", agent: "Arch", msg: "Bottleneck detected: search-svc → ml-inference (RPS+312%)", level: "warn" },
  { t: "00:08", agent: "DevOps", msg: "Rolled back ml-inference v0.9.2 (error budget burn 4.2x)", level: "err" },
  { t: "00:07", agent: "QA", msg: "Coverage +2.1% on orders-svc (now 87.4%)", level: "ok" },
];

export const velocityData = Array.from({ length: 14 }, (_, i) => ({
  day: `D${i + 1}`,
  deploys: 8 + Math.round(Math.sin(i / 2) * 6 + Math.random() * 4),
  incidents: Math.max(0, Math.round(3 - Math.sin(i / 3) * 2 + Math.random() * 2)),
  ai: 12 + Math.round(Math.cos(i / 2) * 5 + Math.random() * 4),
}));

export const latencyData = Array.from({ length: 24 }, (_, i) => ({
  t: `${i}h`,
  p50: 40 + Math.round(Math.sin(i / 3) * 10 + Math.random() * 8),
  p99: 180 + Math.round(Math.sin(i / 2) * 60 + Math.random() * 40),
}));
