# Forge Autonomy OS — System Architecture

> **43 modules** across 7 layers, delivering end-to-end autonomous production orchestration.
> 121 backend tests · 15 frontend tests · 25 frontend pages · 100+ REST API endpoints

---

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 'fontSize': '14px' }}}%%
graph TB
    subgraph Layer0["🌐 Layer 0: Ingestion"]
        WH["GitHub Webhooks<br/>HMAC-SHA256 · pull_request · check_suite"]
        NATS["NATS Event Bus<br/>forge.events · forge.decisions · forge.actions"]
    end

    subgraph Layer1["🧠 Layer 1: Classification & Context"]
        CL["CI Failure Classifier<br/>4 classes · dep/config/flake/perf · 0.95 conf"]
        GIT["GitHub API Client<br/>branch → commit → PR · real GitHub"]
        GD["Architecture Guardian<br/>boundary violations · coupling · debt · drift"]
        RCA["Incident Commander RCA<br/>root cause · impact · cross-service chains"]
        CTX["Context Persistence<br/>incidents · ownership · service→team mapping"]
        SS["Security Scanner (SAST)<br/>secrets · vuln deps · insecure config · CVSS"]
    end

    subgraph Layer2["⚡ Layer 2: Remediation & Recovery"]
        RP["Auto-fix PR Generation<br/>repair patches · templates · PR bodies"]
        RN["Workflow Rerun Agent<br/>autonomous rerun · flake analysis · escalation"]
        QT["Flaky Test Quarantine<br/>exponential backoff · jitter · quarantine rules"]
        TM["Remediation Templates<br/>versioned YAML · variable substitution"]
        TS["Test Selection Agent<br/>impact-based · file mappings · dep chain"]
        CNG["Canary Agent<br/>health eval · promote/hold/rollback · deploy intel"]
    end

    subgraph Layer3["🛡️ Layer 3: Safety & Policy"]
        POL["A/B/C Action Policy<br/>Suggest / Approve / Auto-Execute"]
        POC["Policy-as-Code Engine<br/>YAML conditions · rule evaluation"]
        RSK["Deployment Risk Scoring<br/>5-factor weighted · low→critical"]
        CAN["Canary Controller<br/>5% → 10% → 25% · auto-rollback"]
        RBAC["Multi-tenant RBAC<br/>4 roles · SSO OIDC · tenant isolation"]
        CP["Compliance Reporting<br/>SOC2 · ISO27001 · audit export JSON/CSV/MD"]
    end

    subgraph Layer4["📊 Layer 4: Observability"]
        OTEL["OpenTelemetry<br/>OTLP export · Prometheus /metrics"]
        SSE["SSE Live Stream<br/>real-time event broadcasting"]
        TL["Cross-agent Timeline<br/>chronological agent activity feed"]
    end

    subgraph Layer5["🗄️ Layer 5: Persistence"]
        SQL["SQLite Engine<br/>18 auto-created tables · generic CRUD"]
        PG["PostgreSQL (asyncpg)<br/>connection pool · Alembic migrations"]
        SYNC["Persistence Sync<br/>in-memory ↔ SQLite adapter"]
    end

    subgraph Layer6["🤖 Layer 6: Automation & Orchestration"]
        OP["K8s Operator (kopf)<br/>ForgeRemedy CRD · multi-cluster deploy"]
        PM["PM Agent<br/>backlog decomposition · sprints · blocker detection"]
        CH["Chaos Engineering<br/>5 fault types · resilience tests · scoring"]
        WF["Workflow Editor<br/>visual pipeline builder · 7-step seeded pipeline"]
        DEMO["Demo Controller<br/>4 deterministic failure scenarios"]
        RPL["Decision Replay Engine<br/>step-by-step · play/pause/reset"]
        ORCH["Agent Orchestrator<br/>DAG workflows · parallel steps · retry"]
    end

    subgraph Layer7["🎨 Layer 7: Frontend — React 18 + TypeScript 5.8"]
        DASH["Dashboard<br/>events · decisions · incidents · audit"]
        CICD["CI/CD Intel<br/>pipeline · rerun agent · retry controls"]
        AGT["AI Agents<br/>agent status · actions · confidence"]
        SP["PM Sprint Planning<br/>backlog · sprints · blockers"]
        OD["Pilot Dashboard<br/>6 KPI cards · autonomy metrics · tenants"]
        TL2["Collaboration Timeline<br/>agent activity · filters · charts"]
        WF2["Workflow Editor<br/>drag-and-drop pipeline canvas"]
        LOG["LogStream<br/>SSE live event feed · polling fallback"]
        CDB["Canary Dashboard<br/>auto-rollback UI · deploy intelligence"]
        SEC["Security Scanner<br/>SAST results · severity · code input"]
        COMP["Compliance Portal<br/>SOC2/ISO controls · export reports"]
        ORC["Orchestrator<br/>DAG pipeline · step execution · logs"]
    end

    %% Data flow
    WH -->|"normalize & persist"| Layer1
    WH -->|"publish"| NATS
    NATS -->|"distribute"| OP
    NATS -->|"forge.events"| Layer4

    Layer1 -->|"classify"| Layer2
    Layer2 -->|"repair"| GIT
    GIT -->|"create PR"| Layer0

    Layer2 -->|"evaluate"| Layer3
    Layer3 -->|"approve / auto"| Layer2

    Layer4 -->|"stream"| Layer7

    Layer1 -->|"persist"| Layer5
    Layer2 -->|"persist"| Layer5
    Layer3 -->|"persist"| Layer5

    Layer5 -->|"load on startup"| Layer1
    Layer5 -->|"auto-sync"| Layer6

    Layer6 -->|"trigger"| Layer2
    Layer6 -->|"remediate"| OP

    Layer7 -.->|"apiClient.ts / REST"| Layer1
    Layer7 -.->|"SSE"| SSE

    %% Styling
    classDef layer fill:#1a1a2e,stroke:#16213e,color:#e6e6e6
    classDef ingestion fill:#0f3460,stroke:#16213e,color:#e6e6e6
    classDef ai fill:#16213e,stroke:#0f3460,color:#e6e6e6
    classDef safety fill:#1a1a2e,stroke:#533483,color:#e6e6e6
    classDef obs fill:#0f3460,stroke:#533483,color:#e6e6e6
    classDef db fill:#16213e,stroke:#533483,color:#e6e6e6
    classDef k8s fill:#1a1a2e,stroke:#e94560,color:#e6e6e6
    classDef ui fill:#16213e,stroke:#e94560,color:#e6e6e6

    class Layer0,Layer1,Layer2,Layer3,Layer4,Layer5,Layer6,Layer7 layer
    class WH,NATS ingestion
    class CL,GIT,GD,RCA,CTX,SS ai
    class RP,RN,QT,TM,TS,CNG ai
    class POL,POC,RSK,CAN,RBAC,CP safety
    class OTEL,SSE,TL obs
    class SQL,PG,SYNC db
    class OP,PM,CH,WF,DEMO,RPL,ORCH k8s
    class DASH,CICD,AGT,SP,OD,TL2,WF2,LOG,CDB,SEC,COMP,ORC ui
```

---

## Layer Descriptions

### 🌐 Layer 0: Ingestion (2 modules)

| Component | File | Description |
|-----------|------|-------------|
| GitHub Webhooks | `webhooks.py` | HMAC-SHA256 verified ingestion for `pull_request`, `check_suite`, `workflow_run` events |
| NATS Event Bus | `event_bus.py` | Async pub/sub with JSON envelope; 5 built-in subjects (forge.events, forge.decisions, forge.incidents, forge.actions, forge.webhooks) |

### 🧠 Layer 1: Classification & Context (6 modules)

| Component | File | Description |
|-----------|------|-------------|
| CI Failure Classifier | `classifier.py` | 4-class: dependency, config, flake, performance_regression with regex pattern matching & confidence scoring |
| GitHub API Client | `github_client.py` | Real branch creation, file commit, PR creation via GitHub REST API (Contents + Pulls endpoints) |
| Architecture Guardian | `guardian.py` | Boundary violations, coupling, tech debt, **config drift detection**; service dependency graph; health scores |
| Incident Commander RCA | `incident_summary.py` | Root cause analysis + **cross-service cascading failure chains**; blast radius; dependency maps |
| Context Persistence | `context.py` | Incidents CRUD + ownership mapping (service→team→slack_channel) |
| Security Scanner | `security_scanner.py` | SAST: 12 secret patterns, 11 insecure configs, 3 vulnerable deps; CVSS scoring; 3 API endpoints |

### ⚡ Layer 2: Remediation & Recovery (6 modules)

| Component | File | Description |
|-----------|------|-------------|
| Auto-fix PR Generation | `repair.py` | Template-based fix patches for dependency/config/flake failures; full PR body generation |
| Workflow Rerun Agent | `rerun_agent.py` | Autonomous CI rerun decisions; flaky test analysis; exponential backoff with auto-escalation; 8 API endpoints |
| Flaky Test Quarantine | `quarantine.py` | Exponential backoff with jitter (`0.5 * 2^n + random(0, jitter)`); quarantine rules CRUD; test status tracking |
| Remediation Templates | `templates.py` | 6 versioned YAML templates (npm, pip, config, flake, yaml, dockerfile); variable substitution; YAML validation |
| Test Selection Agent | `test_selection.py` | Impact-based test selection; 21 file-to-test mappings; module dep chain impact; commit message analysis |
| Canary Agent | `canary_agent.py` | Autonomous canary monitoring; health eval (error rate, p99, burn rate, traffic); promote/hold/rollback decisions; deploy intel |

### 🛡️ Layer 3: Safety & Policy (6 modules)

| Component | File | Description |
|-----------|------|-------------|
| A/B/C Action Policy | `policy.py` | 3-tier: Class A (suggest, risk≥70), Class B (approve, risk≥40), Class C (auto, risk<20) |
| Policy-as-Code Engine | `policy_engine.py` | YAML-defined policies; condition-based rule evaluation; 2 seeded policies (production-safety, payment-services) |
| Deployment Risk Scoring | `risk.py` | 5-factor weighted model: files (30%), criticality (25%), config (20%), DB migration (15%), frequency (10%) |
| Canary Controller | `canary.py` | 3-stage progression (5%→10%→25%); configurable bake times; auto-rollback on burn rate > 2.0 |
| Multi-tenant RBAC + SSO | `rbac.py` + `sso.py` | 4 roles (admin, operator, engineer, viewer); OIDC/OAuth2 SSO (Google, GitHub, Azure AD, custom); SAML config; session management |
| Compliance Reporting | `compliance.py` | 14 SOC2 + 7 ISO27001 controls; report generation; multi-format export (JSON, CSV, markdown); audit stats |

### 📊 Layer 4: Observability (3 modules)

| Component | File | Description |
|-----------|------|-------------|
| OpenTelemetry | `telemetry.py` | OTLP gRPC exporter; console fallback; FastAPI middleware; Prometheus `/metrics` (request count, error count, avg duration) |
| SSE Live Stream | `stream.py` | Real-time EventSource broadcasting; ambient events for UI liveliness; client tracking with graceful disconnect |
| Cross-agent Timeline | `timeline.py` | Unified chronological feed across all agents; agent filter; decision stats |

### 🗄️ Layer 5: Persistence (3 modules)

| Component | File | Description |
|-----------|------|-------------|
| SQLite Engine | `persistence.py` | 18 auto-created tables; generic CRUD helper; store-specific helpers; API router with stats/reset |
| PostgreSQL (asyncpg) | `pg_persistence.py` | asyncpg connection pool (min=2, max=10); SQLAlchemy metadata for all 18 entities; Alembic migrations; auto-schema creation |
| Persistence Sync | `persistence_sync.py` | 14 sync functions bridging in-memory ↔ SQLite; startup load; silent fallback |

### 🤖 Layer 6: Automation & Orchestration (7 modules)

| Component | File | Description |
|-----------|------|-------------|
| K8s Operator | `operator.py` | kopf-based with ForgeRemedy CRD; NATS-driven remediation dispatcher; multi-cluster deployment (staging-us, prod-us, prod-eu) |
| PM Agent | `pm_agent.py` | Backlog decomposition from NL descriptions; sprint plan generation with velocity factor; blocker detection from CI/CD telemetry |
| Chaos Engineering | `chaos.py` | 5 fault types (latency, error, dependency_failure, resource_exhaustion, network_partition); resilience test CRUD + execution |
| Workflow Editor | `workflows.py` | Backend CRUD + 7-step seeded CI/CD pipeline with execute endpoint |
| Agent Orchestrator | `orchestrator_agent.py` | DAG-based workflow orchestration; 3 predefined workflows; dep graph resolution; parallel step execution; exponential retry |
| Demo Controller | `demo.py` | 4 deterministic failure scenarios (dependency, config, flake, latency); live + replay modes |
| Decision Replay Engine | `replay.py` | Step-by-step replay sessions with play/pause/reset; timeline evidence per step |

### 🎨 Layer 7: Frontend (25 pages — including app shell + public routes)

| Page | File | Description |
|------|------|-------------|
| Dashboard | `Dashboard.tsx` | Events feed, decisions log, incident display, audit trail, canary status, policy stats |
| CI/CD Intel | `CICD.tsx` | Pipeline visualization, classifier integration, rerun agent panel, failure patterns, workflow history |
| AI Agents | `Agents.tsx` | Agent cards (SRE, DevOps, Guardian), confidence scores, action history, replay engine |
| Architecture | `Architecture.tsx` | Guardian service graph, service comparison grid, layered findings, check timeline, discovery wizard |
| Incidents | `Incidents.tsx` | Incident list, RCA summary, cross-service cascading failure chains, dependency maps |
| Analytics | `Analytics.tsx` | Classifier analysis, policy evaluation statistics, decision distribution charts |
| Workflows | `Workflows.tsx` | Drag-and-drop visual pipeline canvas, node properties, execute controls |
| PM Sprint Planning | `SprintPlanning.tsx` | 3-tab layout: Backlog / Sprints / Blockers; AI decomposition; sprint plan generator |
| Pilot Dashboard | `PilotDashboard.tsx` | 6 KPI cards (uptime, MTTR, MTTD, CFR, deploys/day, coverage), service health, autonomy metrics |
| Collaboration Timeline | `CollaborationTimeline.tsx` | Chronological agent activity feed, agent filter chips, decision distribution bar chart |
| Policy Management | `PolicyManagement.tsx` | Policy CRUD, rule editor, evaluate panel with risk context input |
| Canary Dashboard | `CanaryDashboard.tsx` | Auto-rollback UI, live canary monitoring, deploy intelligence, scenario simulator |
| Security Scanner | `Security.tsx` | SAST scan input, result severity display, rule browser |
| Compliance Portal | `Compliance.tsx` | SOC2/ISO27001 control mapping, report generation, JSON/CSV/markdown export buttons |
| Agent Orchestrator | `Orchestrator.tsx` | DAG workflow selection, step execution visualization, execution logs |
| *Public pages* | `Index.tsx`, `About.tsx`, `Features.tsx`, `Pricing.tsx`, `Contact.tsx`, `Login.tsx`, `Register.tsx`, `Onboarding.tsx` | Marketing + auth pages |
| *App shell* | `AppLayout.tsx`, `AppSidebar.tsx`, `Topbar.tsx`, `AuthShell.tsx` | Layout components |

---

## Data Flow

1. **Ingestion** — GitHub Webhooks receive CI failure events, normalize to EventSchema, publish to NATS
2. **Classification** — Classifier identifies failure type (dependency/config/flake/performance), Guardian checks architecture, Security Scanner validates code
3. **Remediation** — Repair generator creates fix patches, Test Selector picks relevant tests, Canary Agent evaluates deployment health
4. **Safety Gate** — Risk scorer weights 5 factors, Policy Engine evaluates against YAML rules, RBAC checks permissions
5. **Execution** — Auto-fix PR created, canary rollout proceeds (5%→10%→25%), workflow rerun triggered
6. **Observability** — Every action traced via OpenTelemetry, streamed via SSE, recorded in timeline
7. **Persistence** — Events, decisions, audits stored in SQLite/PostgreSQL, synced on startup
8. **Orchestration** — Agent Orchestrator coordinates DAG workflows, K8s operator handles cluster-level remediation

---

<p align="center">
  <i>Forge Autonomy OS — AI-Native Production Operating System</i>
</p>
