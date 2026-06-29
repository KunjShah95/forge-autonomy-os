# Forge Autonomy OS — Product + Engineering Roadmap

> **Current state:** ✅ **v1.0.0** — Production-ready. All 43 backlog items delivered across 8 milestones (11 versions).  
> **43 backend modules · 25 frontend pages · 100+ REST API endpoints · 121 backend tests · 15 frontend tests**

---

## 🏁 Milestone Summary

| Milestone | Version | Date | Theme | Modules Added |
|-----------|---------|------|-------|---------------|
| 0 | v0.0.0 | 2026-05-22 | Repository initialization | 0 |
| 0 | v0.1.0 | 2026-05-23 | FastAPI scaffold + frontend shell | 2 backend, 13 frontend |
| 1 | v0.2.0 | 2026-05-24 | Autonomous CI recovery | 6 backend |
| 2 | v0.3.0 | 2026-05-25 | Self-healing CI/CD + safety | 3 backend, 2 frontend |
| 3 | v0.4.0 | 2026-05-26 | Demo, replay, RBAC | 3 backend |
| 4 | v0.5.0 | 2026-05-27 | Policies, workflows, chaos | 4 backend, 1 frontend |
| 5 | v0.6.0 | 2026-05-28 | SQLite, PM agent, timeline, Docker | 6 backend, 3 frontend |
| 6 | v0.7.0 | 2026-05-29 | OTel, PostgreSQL, NATS, K8s operator | 5 backend, 15 frontend tests |
| 7 | v0.8.0 | 2026-06-27 | Canary agent + auto-rollback UI | 2 backend, 1 frontend |
| 8 | v0.9.0 | 2026-06-28 | Rerun agent + cross-service RCA | 1 backend, 2 frontend |
| 9 | **v1.0.0** | **2026-06-29** | **Production hardening + enterprise** | **7 backend, 3 frontend** |

---

## ✅ Milestone 0 — Foundation (Complete)

### v0.0.0 — 2026-05-22 — Repository initialization

- Vite + React + TypeScript scaffold with shadcn/ui, Tailwind CSS, routing
- Empty backend scaffold
- Git configuration (`.gitignore`)

### v0.1.0 — 2026-05-23 — FastAPI scaffold + frontend shell

**Backend:**
- FastAPI scaffold with CORS middleware, `/health` and `/api/v1/health` endpoints (`main.py`)
- Pydantic schemas: `EventSchema`, `DecisionSchema`, `AuditSchema` with full typing (`schemas.py`)
- In-memory database — `events_db`, `decisions_db`, `audit_db` with 2 seed incidents (`api.py`)
- Core REST API — Events CRUD, decisions CRUD, audit trail CRUD — 5 endpoints (`api.py`)

**Frontend:**
- React 18 + TypeScript 5.8 + Vite + Tailwind CSS + shadcn/ui
- App shell — Sidebar navigation, topbar, layout routing with React Router 6
- Landing page — Public-facing landing with product overview, features, CTA
- Login / Register / Onboarding pages — Authentication flow UI shell
- 38 shadcn/ui primitives — Button, Card, Dialog, Dropdown, Tabs, Tooltip, etc.
- Mock seed data — Log stream events, agent decisions, incidents (`mock.ts`)
- Project documentation scaffold — `README.md`, `docs/` (PIPELINE, ROADMAP, DEMO-RUNBOOK, IMPLEMENTATION-BACKLOG)
- MIT License

**Exit criteria:**
- [x] FastAPI server starts and serves `/health`
- [x] Frontend dev server starts with working navigation
- [x] All 38 shadcn/ui primitives import without errors
- [x] React Router routes resolve correctly

---

## ✅ Milestone 1 — Autonomous CI Recovery (Complete)

### v0.2.0 — 2026-05-24 — Webhooks + classifier + repair + CI/CD

**Layer 0 — Ingestion:**
- GitHub webhook ingestion — HMAC-SHA256 verification for `pull_request` and `check_suite` events; normalized to `EventSchema` with `trace_id` (`webhooks.py`)

**Layer 1 — Classification & Context:**
- **3-class CI failure classifier** — Pattern matching on log output for `dependency`, `config`, and `flake` failures; confidence scoring with evidence (`classifier.py`)
- **Architecture guardian** — 3 finding types (boundary violations, coupling, tech debt); service dependency graph; health scores (`guardian.py`)
- **Incident commander RCA** — Root cause analysis from timeline evidence with confidence tracking (`incident_summary.py`)
- **Context persistence** — Incidents CRUD + ownership mapping (service → team → slack_channel) (`context.py`)

**Layer 2 — Remediation & Recovery:**
- **Auto-fix PR patch generation** — Template-based patches for all 3 failure classes; PR body with diff summary (`repair.py`)
- **Workflow rerun orchestration** — CI workflow re-triggering with optional config per branch (`orchestrator.py`)

**Layer 0 — Messaging:**
- NATS event bus — Basic pub/sub abstraction with JSON envelope (`event_bus.py`)

**Frontend:**
- API client — 30+ API methods with 2-second mock fallback (`apiClient.ts`)
- CI/CD frontend page — Pipeline visualization, classifier integration, repair controls (`CICD.tsx`)

**Exit criteria:**
- [x] Webhooks accept and validate HMAC-SHA256 signatures
- [x] Classifier correctly identifies dependency/config/flake failures with ≥0.70 confidence
- [x] Repair generates valid patches for all 3 failure classes
- [x] 21 backend modules, 51 REST API endpoints across 13 domains

---

## ✅ Milestone 2 — Self-Healing CI/CD + Safety (Complete)

### v0.3.0 — 2026-05-25 — Safety, risk scoring, canary

**Layer 3 — Safety & Policy:**
- **A/B/C action class policy engine** — 3-tier classification (Suggest, Approve, Auto-Execute) based on risk + blast radius (`policy.py`)
- **Weighted deployment risk scoring** — 5-factor model: files changed (30%), service criticality (25%), config change (20%), DB migration (15%), frequency (10%) (`risk.py`)
- **Canary rollout + auto-rollback controller** — 3-stage progression (5% → 10% → 25%), configurable bake times, burn-rate triggers (`canary.py`)

**Frontend:**
- CI/CD frontend page — Pipeline visualization, classifier integration, repair controls (`CICD.tsx`)
- Dashboard frontend page — Events feed, decisions log, incident display, canary status, policy stats (`Dashboard.tsx`)

**Changed:**
- Backend test suite expanded to 56 tests

**Exit criteria:**
- [x] Risk scoring produces valid scores 0-100 for any input
- [x] Policy engine correctly classifies actions as A/B/C
- [x] Canary controller progresses through 3 stages with auto-rollback
- [x] 56 backend tests passing

---

## ✅ Milestone 3 — Demo + Replay + RBAC (Complete)

### v0.4.0 — 2026-05-26 — Demo controller, replay, RBAC

- **Deterministic demo failure injection** — 4 live scenarios (dependency, config, flake, latency), live + replay modes (`demo.py`)
- **Decision replay engine** — Step-by-step replay sessions with play/pause/reset; timeline evidence per step (`replay.py`)
- **Multi-tenant RBAC** — 4 roles (admin, operator, engineer, viewer), 3 tenants, granular permissions, access check endpoint, role matrix export (`rbac.py`)

**Exit criteria:**
- [x] Demo injector triggers all 4 failure scenarios
- [x] Replay engine step-through works with play/pause/reset
- [x] RBAC correctly restricts access by role and tenant

---

## ✅ Milestone 4 — Policies + Workflows + Chaos (Complete)

### v0.5.0 — 2026-05-27 — Policies, workflows, chaos engineering

**Layer 3 — Safety & Policy:**
- **Policy-as-code YAML engine** — YAML-defined policies with condition-based rule evaluation, CRUD endpoints, 2 seeded policies (`policy_engine.py`)

**Layer 6 — Automation & Orchestration:**
- **Visual workflow editor** — Backend CRUD + 7-step seeded CI/CD pipeline with execute endpoint (`workflows.py`)
- **Chaos engineering suite** — 5 fault types (latency, error, dependency, resource exhaustion, network partition), resilience test CRUD + execution (`chaos.py`)

**Frontend:**
- Workflows drag-and-drop canvas with node properties (`Workflows.tsx`)

**Tests:**
- 17 chaos engineering tests (`test_chaos.py`)

**Exit criteria:**
- [x] Policy engine evaluates YAML conditions correctly
- [x] Workflow pipeline executes 7 steps in order
- [x] Chaos engineering injects all 5 fault types
- [x] 17 chaos tests passing

---

## ✅ Milestone 5 — Persistence + PM Agent + Observability (Complete)

### v0.6.0 — 2026-05-28 — SQLite, PM agent, timeline, Docker

**Layer 5 — Persistence:**
- **SQLite persistence engine** — 18 auto-created tables, generic CRUD helpers, store-specific helpers, API stats/reset endpoints (`persistence.py`)
- **Persistence sync adapter** — 14 sync functions bridging in-memory stores ↔ SQLite; startup load from persisted data (`persistence_sync.py`)

**Layer 6 — Automation & Orchestration:**
- **PM agent** — Backlog decomposition from natural language, sprint plan generation with velocity/blockers, 15 API endpoints (`pm_agent.py`)

**Layer 4 — Observability:**
- **Cross-agent collaboration timeline** — Unified chronological feed across all agents with agent filter, decision stats, bar chart, live polling (`timeline.py`)
- **SSE live event stream** — Real-time EventSource broadcasting with init/ambient/snapshot events, client tracking, graceful disconnect (`stream.py`)

**Infrastructure:**
- Multi-stage Python 3.13-slim backend Dockerfile
- Node 20 → Nginx frontend Dockerfile
- 3-service docker-compose with health checks
- GitHub Actions CI workflow — Backend test, frontend test, TypeScript check, Vite build on push/PR to `main`

**Frontend:**
- PM Sprint Planning — 3-tab layout: Backlog / Sprints / Blockers; AI decomposition; sprint plan generator (`SprintPlanning.tsx`)
- Pilot Dashboard — 6 KPI cards, service health, autonomy KPIs vs baseline, tenant onboarding with readiness progress (`PilotDashboard.tsx`)
- Collaboration Timeline — Chronological agent activity feed, agent filter chips, decision distribution bar chart (`CollaborationTimeline.tsx`)
- LogStream — SSE-powered live event feed with polling fallback (`LogStream.tsx`)

**Cleanup:**
- Fixed `datetime.utcnow()` deprecation — all 84 instances replaced with `datetime.now(timezone.utc)` across 24 backend modules
- All list endpoints support `limit` and `offset` query parameters

**Exit criteria:**
- [x] SQLite persists all 18 entity types
- [x] PM agent decomposes NL descriptions into backlog items
- [x] SSE stream delivers real-time events to frontend
- [x] Docker images build and compose services start
- [x] GitHub Actions CI passes (backend tests, frontend tests, typecheck, build)

---

## ✅ Milestone 6 — Production Infrastructure (Complete)

### v0.7.0 — 2026-05-29 — OTel, PostgreSQL, NATS, K8s operator, docs

**Layer 4 — Observability:**
- **OpenTelemetry instrumentation** — OTLP exporter with console fallback, FastAPI middleware tracking request/error/duration, Prometheus `/metrics` endpoint (`telemetry.py`)

**Layer 5 — Persistence:**
- **PostgreSQL persistence** — asyncpg-based engine with connection pooling, SQLAlchemy metadata, Alembic migrations, auto-schema creation, silent fallback to SQLite (`pg_persistence.py`, `alembic/`)

**Layer 0 — Ingestion:**
- **NATS event bus (mature)** — Async pub/sub with JSON envelope, 5 built-in subjects (`forge.events`, `forge.decisions`, etc.), connect/subscribe/publish lifecycle, graceful degradation (`event_bus.py`)

**Layer 6 — Automation & Orchestration:**
- **K8s operator** — kopf-based operator with `ForgeRemedy` CRD handlers, NATS-driven remediation dispatcher, 7 K8s manifests (`operator.py`, `deploy/kubernetes/`)

**Layer 1 — Classification & Context:**
- **GitHub API integration** — Real branch creation, file commit, PR opening via GitHub REST API. Supports draft PRs, sanitized branch naming, and full error handling (`github_client.py`)

**Layer 2 — Remediation & Recovery:**
- **Flaky test quarantine** — Exponential backoff with jitter, quarantine rule CRUD, test status tracking (`quarantine.py`)
- **Config/YAML remediation templates** — 6 versioned templates (npm, pip, config, flake, yaml, dockerfile) with variable substitution and YAML validation (`templates.py`)

**Frontend:**
- 15 unit tests across Dashboard, SprintPlanning, PilotDashboard (Vitest + React Testing Library)

**Documentation:**
- `README.md` — Complete rewrite with Mermaid architecture diagram (7 layers, 27 components), end-to-end flow diagram, component catalog, safety architecture, K8s deployment guide, key metrics table
- `SECURITY.md` — Vulnerability reporting policy, security hardening checklist, component risk assessment
- `CONTRIBUTING.md` — Comprehensive contributor guide
- `CHANGELOG.md` — Release tracking

**Exit criteria:**
- [x] OpenTelemetry metrics export to Prometheus
- [x] PostgreSQL persistence with Alembic migrations
- [x] NATS event bus with 5 subjects
- [x] K8s operator deploys with ForgeRemedy CRD
- [x] GitHub API creates real PRs
- [x] All 7 K8s manifests valid
- [x] 15 frontend tests passing

---

## ✅ Milestone 7 — Deploy Intelligence (Complete)

### v0.8.0 — 2026-06-27 — Canary agent + auto-rollback UI

**Layer 2 — Remediation & Recovery:**
- **Canary agent** — Autonomous AI agent monitoring canary deployments; health evaluation (error rate, p99 latency, burn rate, traffic shift); promote/hold/rollback decisions with confidence scoring; deploy intelligence with per-service analytics; 11 API endpoints (`canary_agent.py`)

**Frontend:**
- Canary Dashboard — Auto-rollback UI, live canary monitoring with deploy status, health metrics, stage progression; agent decision log; scenario simulator for healthy/degraded/critical/rollback modes (`CanaryDashboard.tsx`)

**Exit criteria:**
- [x] Canary agent makes promote/hold/rollback decisions with confidence scoring
- [x] Auto-rollback UI renders live monitoring and scenario simulation
- [x] 11 canary agent API endpoints operational

---

## ✅ Milestone 8 — Intelligence & RCA (Complete)

### v0.9.0 — 2026-06-28 — Rerun agent + cross-service RCA + Guardian UI

**Layer 2 — Remediation & Recovery:**
- **Workflow rerun agent** — Autonomous CI rerun decisions with flaky test analysis; exponential backoff with auto-escalation for recurring failures; 8 API endpoints (`rerun_agent.py`)

**Layer 1 — Classification & Context:**
- **Cross-service RCA** — Cascading failure chain analysis across services; blast radius scoring; service dependency maps; systemic fix recommendations; 6 API endpoints (`incident_summary.py`)

**Frontend:**
- Architecture Guardian UI — Service comparison grid with metrics across the stack; layered findings (boundary/coupling/C4/tech_debt) with severity; check timeline + discovery wizard (`Architecture.tsx`)
- Incidents page — Enhanced with cross-service cascading failure chains and dependency maps (`Incidents.tsx`)
- CI/CD Intel — Rerun agent panel, failure patterns, workflow history (`CICD.tsx`)

**Exit criteria:**
- [x] Rerun agent makes autonomous rerun decisions with flake analysis
- [x] Cross-service RCA identifies cascading failure chains with blast radius
- [x] Architecture Guardian comparison grid renders layered findings
- [x] 8 rerun agent + 6 cross-service RCA API endpoints operational

---

## ✅ Milestone 9 — Production 1.0.0 (Complete)

### v1.0.0 — 2026-06-29 — Production hardening + enterprise features

**Production Hardening:**
- Replaced deprecated `@app.on_event("startup")` with FastAPI `lifespan` context manager
- Consolidated all startup initialization into single lifespan handler
- Proper shutdown cleanup for NATS event bus (`main.py`)

**Layer 1 — Classification & Context (2 new modules):**
- **Security scanner (SAST)** — 12 secret patterns, 11 insecure config patterns, 3 vulnerable dependency patterns with CVSS scoring; 3 API endpoints (`security_scanner.py`)
- **Classifier enhancement** — Expanded to 4-class system (dependency, config, flake, performance_regression) with 18 regex patterns for benchmark/load test failures, latency increases, throughput drops, memory leaks (`classifier.py`)
- **Guardian enhancement** — Configuration drift detection across 5 services with baseline comparison; drift types (missing/added/changed parameters); severity scoring (`guardian.py`)

**Layer 2 — Remediation & Recovery (1 new module):**
- **Test selection agent** — Impact-based test selection; 21 direct file-to-test mappings; module dependency chain impact; commit message analysis (`test_selection.py`)

**Layer 3 — Safety & Policy (2 new modules):**
- **Enterprise RBAC with SSO** — Multi-provider OIDC/OAuth2 (Google, GitHub, Azure AD, custom); session management with Bearer tokens; SSO role to Forge RBAC role mapping; SAML configuration (`sso.py`)
- **Compliance reporting** — 14 SOC2 controls + 7 ISO27001 controls; multi-format export (JSON, CSV, markdown); report generation with auto-execution rate (`compliance.py`)

**Layer 6 — Automation & Orchestration (1 new module):**
- **LangGraph/Temporal agent orchestrator** — DAG-based workflow orchestration with 3 predefined workflows (CI Auto-Recovery, Incident Response, Test & Deploy); dependency graph resolution with parallel step execution; retry with exponential backoff (`orchestrator_agent.py`)

**Kubernetes:**
- Multi-cluster support — Cluster profiles for staging/production/regional configs
- Deployment script targeting 3 clusters with environment-specific resource sizing (`cluster-config.yaml`, `deploy-multi-cluster.sh`)

**Frontend (3 new pages):**
- Security Scanner page — SAST scan input, result severity display, rule browser (`Security.tsx`)
- Compliance Portal page — SOC2/ISO27001 control mapping, report generation, JSON/CSV/markdown export buttons (`Compliance.tsx`)
- Agent Orchestrator page — DAG workflow selection, step execution visualization, execution logs (`Orchestrator.tsx`)

**Tests:**
- 33 v1.0.0 unit tests covering all 5 new modules (`test_v100.py`)
- Full test suite expanded to 121 backend tests (88 existing + 33 new)

**Exit criteria:**
- [x] All FastAPI deprecations resolved — lifespan handler replaces deprecated startup/shutdown
- [x] Security scanning detects secrets, insecure configs, and vulnerable deps with CVSS scoring
- [x] SSO login flow with OIDC/OAuth2 (Google, GitHub, Azure AD, custom)
- [x] Compliance audit report exportable in JSON, CSV, and Markdown
- [x] Multi-cluster K8s deployment script verified for 3 clusters
- [x] Agent orchestrator executes 3 predefined DAG workflows with parallel steps
- [x] **121 backend tests passing**
- [x] **15 frontend tests passing**
- [x] **0 TypeScript errors**
- [x] **Vite production build succeeds (2,943 modules, 1.9 MB JS)**

---

## 📊 Architecture Layer Coverage

| Layer | Theme | Modules | Status |
|-------|-------|---------|--------|
| **Layer 0** | Ingestion | GitHub Webhooks, NATS Event Bus | ✅ Complete |
| **Layer 1** | Classification & Context | Classifier, GitHub Client, Guardian, Incident RCA, Context, Security Scanner | ✅ Complete |
| **Layer 2** | Remediation & Recovery | Repair, Rerun Agent, Quarantine, Templates, Test Selection, Canary Agent | ✅ Complete |
| **Layer 3** | Safety & Policy | Policy Engine, Policy-as-Code, Risk Scoring, Canary Controller, RBAC, SSO, Compliance | ✅ Complete |
| **Layer 4** | Observability | OpenTelemetry, SSE Stream, Timeline | ✅ Complete |
| **Layer 5** | Persistence | SQLite, PostgreSQL, Sync Adapter | ✅ Complete |
| **Layer 6** | Automation & Orchestration | K8s Operator, PM Agent, Chaos, Workflows, Orchestrator, Demo, Replay | ✅ Complete |
| **Layer 7** | Frontend | 25 pages, 38 UI components | ✅ Complete |

---

## 🔮 Post-1.0 Vision

### Potential Future Milestones

| Area | Ideas |
|------|-------|
| **AI/ML** | ML-based failure prediction, anomaly detection on metrics, automated root cause ranking |
| **Scale** | Horizontal sharding for PostgreSQL, NATS JetStream clustering, multi-region active-active |
| **Integrations** | GitLab/Bitbucket webhooks, PagerDuty/Opsgenie alerting, Slack/Teams notifications |
| **Governance** | Approval workflows with human-in-the-loop, SOX/HIPAA compliance modules, SLA tracking |
| **Developer Experience** | VS Code extension, Forge CLI tool, Terraform provider, API versioning with OpenAPI 3.1 |
| **Advanced Chaos** | Game day automation, fault injection scheduling, blast radius simulation, steady-state hypothesis testing |
| **Cost Intelligence** | Cloud cost anomaly detection, right-sizing recommendations, spot instance utilization |

---

## 📐 Roadmap Principles

1. **Incremental delivery** — Every milestone produces working, testable software
2. **Backward compatibility** — API changes are additive within a major version
3. **Safety-first** — Policy gates, risk scoring, and RBAC precede autonomous execution
4. **Observability by default** — Every action is logged, traced, and streamed
5. **Test-driven** — Each milestone increases the test baseline

---

<p align="center">
  <i>Forge Autonomy OS — AI-Native Production Operating System</i>
</p>
