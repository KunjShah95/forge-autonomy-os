# Changelog

All notable changes to **Forge Autonomy OS** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Current status:** Pre-1.0 development. Every version milestone represents a set of delivered backlog items and architectural layers.

---

## [0.7.0] — 2026-05-29

### Added

- **GitHub API integration** — Real branch creation, file commit, and PR opening via GitHub REST API (`github_client.py`). Supports draft PRs, sanitized branch naming, and full error handling.
- **PostgreSQL persistence** — asyncpg-based engine with connection pooling, SQLAlchemy metadata, Alembic migrations, auto-schema creation, and silent fallback to SQLite (`pg_persistence.py`).
- **OpenTelemetry instrumentation** — OTLP exporter with console fallback, FastAPI middleware tracking request/error/duration, Prometheus `/metrics` endpoint (`telemetry.py`).
- **NATS event bus** — Async pub/sub with JSON envelope, 5 built-in subjects (`forge.events`, `forge.decisions`, etc.), connect/subscribe/publish lifecycle, graceful degradation (`event_bus.py`).
- **K8s operator** — kopf-based operator with `ForgeRemedy` CRD handlers, NATS-driven remediation dispatcher, 7 K8s manifests (`operator.py`, `deploy/kubernetes/`).
- **Frontend unit tests** — 15 tests across Dashboard, SprintPlanning, and PilotDashboard (Vitest + React Testing Library).
- **API pagination** — `limit/offset` params added to all list endpoints across 10 backend modules.
- **`SECURITY.md`** — Vulnerability reporting policy, security hardening checklist, and component risk assessment.
- **Flaky test quarantine** — Exponential backoff with jitter, quarantine rule CRUD, test status tracking (`quarantine.py`).
- **Config/YAML remediation templates** — 6 versioned templates (npm, pip, config, flake, yaml, dockerfile) with variable substitution and YAML validation (`templates.py`).
- **`CHANGELOG.md`** — This file for release tracking.
- **`CONTRIBUTING.md`** — Comprehensive contributor guide with setup instructions, coding standards, and PR process.

### Changed

- **README.md** — Complete rewrite for recruiters with Mermaid architecture diagram (7 layers, 27 components), end-to-end flow diagram, component catalog, safety architecture, K8s deployment guide, and key metrics table.
- **Run demo** — Added `--chaos` flag exercising all 5 fault types, resilience tests, and chaos summary.
- **Icon fix** — Replaced `Timeline` (unavailable in lucide-react) with `Waypoints` in sidebar navigation.

### Fixed

- Code review: duplicate volume mounts in NATS manifest corrected.
- Code review: `VITE_API_BASE_URL` path normalized in frontend deployment.
- Code review: `publish_event()` and `publish_decision()` wrappers now properly `return await` the publish result.
- Tests: import isolation in NATS event bus mocked publish tests corrected.

---

## [0.6.0] — 2026-05-28

### Added

- **SQLite persistence engine** — 18 auto-created tables, generic CRUD helpers, store-specific helpers, API stats/reset endpoints (`persistence.py`).
- **Persistence sync adapter** — 14 sync functions bridging in-memory stores ↔ SQLite; startup load from persisted data (`persistence_sync.py`).
- **PM agent** — Backlog decomposition from natural language, sprint plan generation with velocity/blockers, 15 API endpoints, full frontend with 3-tab UI (`pm_agent.py`, `SprintPlanning.tsx`).
- **Cross-agent collaboration timeline** — Unified chronological feed across all agents with agent filter, decision stats, bar chart, live polling (`timeline.py`, `CollaborationTimeline.tsx`).
- **Pilot onboarding dashboard** — 6 KPI cards, service health, autonomy KPIs vs baseline, tenant onboarding with readiness progress (`onboarding.py`, `PilotDashboard.tsx`).
- **Docker + docker-compose** — Multi-stage Python 3.13-slim backend Dockerfile, Node 20 → Nginx frontend Dockerfile, 3-service compose with health checks.
- **GitHub Actions CI workflow** — Backend test (72), frontend test (15), TypeScript check, Vite build on push/PR to `main`.
- **SSE live event stream** — Real-time EventSource broadcasting with init/ambient/snapshot events, client tracking, graceful disconnect (`stream.py`, `LogStream.tsx`).
- **`datetime.utcnow()` deprecation fix** — All 84 instances replaced with `datetime.now(timezone.utc)` across 24 backend modules.

### Changed

- All list endpoints now support `limit` and `offset` query parameters.

---

## [0.5.0] — 2026-05-27

### Added

- **Policy-as-code YAML engine** — YAML-defined policies with condition-based rule evaluation, CRUD endpoints, 2 seeded policies (`policy_engine.py`).
- **Visual workflow editor** — Backend CRUD + 7-step seeded CI/CD pipeline with execute endpoint; frontend drag-and-drop canvas with node properties (`workflows.py`, `Workflows.tsx`).
- **Chaos engineering suite** — 5 fault types (latency, error, dependency, resource exhaustion, network partition), resilience test CRUD + execution, 17 test cases (`chaos.py`, `test_chaos.py`).

### Changed

- `package.json` version remains at `0.0.0` (Vite template default — will be set to `0.5.0` at first tagged release).

---

## [0.4.0] — 2026-05-26

### Added

- **Deterministic demo failure injection** — 4 live scenarios (dependency, config, flake, latency), live + replay modes (`demo.py`).
- **Decision replay engine** — Step-by-step replay sessions with play/pause/reset; timeline evidence per step (`replay.py`).
- **Multi-tenant RBAC** — 4 roles (admin, operator, engineer, viewer), 3 tenants, granular permissions, access check endpoint, role matrix export (`rbac.py`).

---

## [0.3.0] — 2026-05-25

### Added

- **A/B/C action class policy engine** — 3-tier classification (Suggest, Approve, Auto-Execute) based on risk + blast radius (`policy.py`).
- **Weighted deployment risk scoring** — 5-factor model: files changed (30%), service criticality (25%), config change (20%), DB migration (15%), frequency (10%) (`risk.py`).
- **Canary rollout + auto-rollback controller** — 3-stage progression (5% → 10% → 25%), configurable bake times, burn-rate triggers (`canary.py`).
- **CI/CD frontend page** — Pipeline visualization, classifier integration, repair controls (`CICD.tsx`).
- **Dashboard frontend page** — Events feed, decisions log, incident display, canary status, policy stats (`Dashboard.tsx`).

### Changed

- Backend test suite expanded to 56 tests.

---

## [0.2.0] — 2026-05-24

### Added

- **GitHub webhook ingestion** — HMAC-SHA256 verification for `pull_request` and `check_suite` events; normalized to `EventSchema` with `trace_id` (`webhooks.py`).
- **3-class CI failure classifier** — Pattern matching on log output for `dependency`, `config`, and `flake` failures; confidence scoring with evidence (`classifier.py`).
- **Auto-fix PR patch generation** — Template-based patches for all 3 failure classes; PR body with diff summary (`repair.py`).
- **Workflow rerun orchestration** — CI workflow re-triggering with optional config per branch (`orchestrator.py`).
- **Context persistence** — Incidents CRUD + ownership mapping (service → team → slack_channel) (`context.py`).
- **Architecture guardian** — 3 finding types (boundary violations, coupling, tech debt); service dependency graph; health scores (`guardian.py`).
- **Incident commander RCA** — Root cause analysis from timeline evidence with confidence tracking (`incident_summary.py`).
- **NATS event bus (initial)** — Basic pub/sub abstraction with JSON envelope (`event_bus.py` — expanded in 0.7.0).
- **Frontend API client** — 30+ API methods with 2-second mock fallback (`apiClient.ts`).

### Changed

- Backend now has 21 modules, 51 REST API endpoints across 13 domains.

---

## [0.1.0] — 2026-05-23

### Added

- **FastAPI scaffold** with CORS middleware, `/health` and `/api/v1/health` endpoints (`main.py`).
- **Pydantic schemas** — `EventSchema`, `DecisionSchema`, `AuditSchema` with full typing (`schemas.py`).
- **In-memory database** — `events_db`, `decisions_db`, `audit_db` with 2 seed incidents (`api.py`).
- **Core REST API** — Events CRUD, decisions CRUD, audit trail CRUD — 5 endpoints (`api.py`).
- **Frontend scaffold** — React 18 + TypeScript 5.8 + Vite + Tailwind CSS + shadcn/ui.
- **App shell** — Sidebar navigation, topbar, layout routing with React Router 6.
- **Landing page** — Public-facing landing with product overview, features, and CTA.
- **Login / Register / Onboarding pages** — Authentication flow UI shell.
- **38 shadcn/ui primitives** — Button, Card, Dialog, Dropdown, Tabs, Tooltip, etc.
- **Mock seed data** — Log stream events, agent decisions, incidents (`mock.ts`).
- **Project documentation** — `README.md`, `docs/PIPELINE.md`, `docs/ROADMAP.md`, `docs/DEMO-RUNBOOK.md`, `docs/IMPLEMENTATION-BACKLOG.md`.
- **Project configuration** — `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.ts`, `eslint.config.js`.
- **License** — MIT (`LICENSE`).

---

## [0.0.0] — 2026-05-22

### Added

- **Repository initialization** — Vite + React + TypeScript scaffold with shadcn/ui, Tailwind CSS, and routing setup.
- **Project structure** — Empty backend scaffold, frontend with basic routing, deployment directory.
- **Git configuration** — `.gitignore` with standard Node + Python + OS ignores.

---

## Future

### [0.8.0] — Planned

- Canary agent integration (deploy intelligence, auto-rollback UI)

### [0.9.0] — Planned

- Workflow rerun agent (orchestrator integration)
- Incident commander improvements (cross-service RCA)
- Architecture guardian UI enhancements

### [1.0.0] — Planned

- Production hardening
- Multi-cluster K8s support
- Enterprise RBAC with SSO integration
- Full audit export / compliance reporting

---

## Version History

| Version | Date       | Key Deliverables                          |
| ------- | ---------- | ----------------------------------------- |
| 0.7.0   | 2026-05-29 | OTel, PostgreSQL, NATS, K8s operator, docs|
| 0.6.0   | 2026-05-28 | SQLite, PM agent, timeline, Docker        |
| 0.5.0   | 2026-05-27 | Policies, workflows, chaos engineering    |
| 0.4.0   | 2026-05-26 | Demo controller, replay, RBAC             |
| 0.3.0   | 2026-05-25 | Safety, risk scoring, canary              |
| 0.2.0   | 2026-05-24 | Webhooks, classifier, repair, CI/CD       |
| 0.1.0   | 2026-05-23 | FastAPI scaffold, frontend shell          |
| 0.0.0   | 2026-05-22 | Repository initialization                 |

---

<p align="center">
  <i>Forge Autonomy OS — AI-Native Production Operating System</i>
</p>
