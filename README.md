# 🔩 Forge Autonomy OS

> **AI-Native Production Operating System** — Autonomous CI/CD recovery, incident command, architecture governance, and policy-bounded release orchestration.

<p align="center">
  <img src="https://img.shields.io/badge/backend_tests-121_passing-brightgreen?style=for-the-badge" alt="Backend Tests">
  <img src="https://img.shields.io/badge/frontend_tests-15_passing-brightgreen?style=for-the-badge" alt="Frontend Tests">
  <img src="https://img.shields.io/badge/typescript-5.8_clean-blue?style=for-the-badge" alt="TypeScript">
  <img src="https://img.shields.io/badge/react-18-61dafb?style=for-the-badge" alt="React 18">
  <img src="https://img.shields.io/badge/python-3.13-3776AB?style=for-the-badge" alt="Python 3.13">
  <img src="https://img.shields.io/badge/fastapi-1.0-009688?style=for-the-badge" alt="FastAPI">
  <img src="https://img.shields.io/badge/postgresql-17-4169E1?style=for-the-badge" alt="PostgreSQL 17">
  <img src="https://img.shields.io/badge/k8s_operator-kopf-326CE5?style=for-the-badge" alt="K8s Operator">
  <img src="https://img.shields.io/badge/v1.0.0-production-7B2FBE?style=for-the-badge" alt="v1.0.0">
</p>

---

## 🚀 Elevator Pitch

**Forge Autonomy OS** is an AI-native orchestration platform that autonomously manages the full software production lifecycle. When a CI pipeline fails, Forge detects it, classifies the root cause, generates an auto-fix PR, evaluates safety policies, executes a guarded canary deployment, and logs the full audit trail — all without human intervention, with safety controls at every step.

> **43 backend modules · 25 app pages · 100+ REST API endpoints · 121 passing tests · 43 backlog items delivered across 8 milestones**

---

## 📋 Table of Contents

- [What Makes This Different?](#-what-makes-this-different)
- [System Architecture (7 Layers)](#-system-architecture-7-layers)
- [End-to-End Autonomous Flow](#-end-to-end-autonomous-flow)
- [Component Catalog](#-component-catalog)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Run the Full Demo](#-run-the-full-demo)
- [Testing & Verification](#-testing--verification)
- [Safety Architecture](#-safety-architecture)
- [Kubernetes Deployment](#-kubernetes-deployment)

---

## 💡 What Makes This Different?

| This                                                                                      | vs  | Copilot / AI Coding Assistants            |
| ----------------------------------------------------------------------------------------- | --- | ----------------------------------------- |
| **Coordinates** the full production lifecycle (CI → classify → fix → deploy → audit)      | vs  | Generate code in an editor                |
| **Autonomous decisions** with policy-bounded safety gates                                 | vs  | Suggest completions for manual acceptance |
| **End-to-end remediations** — creates branches, commits patches, opens PRs, runs canaries | vs  | Inline code changes only                  |
| **Full accountability** — every action logged with trace_id, confidence, risk, evidence   | vs  | No audit trail                            |
| **Multi-agent coordination** — SRE Agent, DevOps Agent, Architecture Guardian, PM Agent   | vs  | Single-agent chat                         |
| **Chaos engineering** — injects faults, runs resilience tests, measures recovery          | vs  | No operational testing                    |
| **K8s-native** — CRD-driven operator for auto-remediation at cluster level                | vs  | Not infrastructure-aware                  |

---

## 🏗️ System Architecture (7 Layers)

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

## 🔄 End-to-End Autonomous Flow

```mermaid
flowchart LR
    A["1. Webhook<br/>CI Failure"] -->|"check_suite: failure"| B["2. Classify<br/>dependency/config/flake"]
    B -->|"confidence ≥ 0.70"| C["3. Risk Score<br/>5-factor weighted"]
    C -->|"risk = 35 (moderate)"| D["4. Policy Gate<br/>A/B/C evaluation"]
    D -->|"Class C: auto-execute"| E["5. Generate Fix<br/>patch + PR"]
    E -->|"PR #42 opened"| F["6. Canary Deploy<br/>5% → 10% → 25%"]
    F -->|"burn rate < 2.0"| G["7. Audit & Learn<br/>full traceability"]
    G -->|"trace stored"| H["8. Close Loop<br/>RCA + metrics"]

    style A fill:#0f3460,stroke:#16213e,color:#fff
    style B fill:#16213e,stroke:#0f3460,color:#fff
    style C fill:#1a1a2e,stroke:#533483,color:#fff
    style D fill:#1a1a2e,stroke:#e94560,color:#fff
    style E fill:#16213e,stroke:#0f3460,color:#fff
    style F fill:#0f3460,stroke:#16213e,color:#fff
    style G fill:#16213e,stroke:#533483,color:#fff
    style H fill:#1a1a2e,stroke:#e94560,color:#fff
```

**The complete loop runs in under 30 seconds** — from webhook reception through classification, risk scoring, policy evaluation, repair generation, and audit trail creation. A real GitHub PR can be opened in seconds when `GITHUB_TOKEN` is configured.

---

## 📦 Component Catalog

### 🌐 Layer 0: Ingestion (2 modules)

| Component           | File           | Description                                                                                | Tests       |
| ------------------- | -------------- | ------------------------------------------------------------------------------------------ | ----------- |
| **GitHub Webhooks** | `webhooks.py`  | HMAC-SHA256 verified ingestion for `pull_request`, `check_suite`, `workflow_run` events    | ✅          |
| **NATS Event Bus**  | `event_bus.py` | Async pub/sub with JSON envelope; 5 built-in subjects; connect/publish/subscribe lifecycle | ✅ 15 tests |

### 🧠 Layer 1: Classification & Context (6 modules)

| Component                  | File                  | Description                                                                                                    | Tests |
| -------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------- | ----- |
| **CI Failure Classifier**  | `classifier.py`       | 4-class: `dependency`, `config`, `flake`, `performance_regression` with regex pattern matching & confidence     | ✅    |
| **GitHub API Client**      | `github_client.py`    | Real branch creation, file commit, PR creation via GitHub REST API (Contents + Pulls endpoints)                | ✅    |
| **Architecture Guardian**  | `guardian.py`         | Boundary violations, coupling, tech debt, **config drift detection**; service dependency graph; health scores  | ✅    |
| **Incident Commander RCA** | `incident_summary.py` | Root cause analysis + **cross-service cascading failure chains**; blast radius; dependency maps                | ✅    |
| **Context Persistence**    | `context.py`          | Incidents CRUD + ownership mapping (service→team→slack_channel)                                                | ✅    |
| **Security Scanner**       | `security_scanner.py` | SAST: 12 secret patterns, 11 insecure configs, 3 vulnerable deps; CVSS scoring; 3 API endpoints               | ✅    |

### ⚡ Layer 2: Remediation & Recovery (6 modules)

| Component                     | File                | Description                                                                                                                    | Tests       |
| ----------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| **Auto-fix PR Generation**    | `repair.py`         | Template-based fix patches for dependency/config/flake failures; full PR body generation                                       | ✅          |
| **Workflow Rerun Agent**      | `rerun_agent.py`    | Autonomous CI rerun decisions; flaky test analysis; exponential backoff with auto-escalation; 8 API endpoints                  | ✅          |
| **Flaky Test Quarantine**     | `quarantine.py`     | Exponential backoff with jitter; quarantine rules CRUD; test status tracking                                                   | ✅          |
| **Remediation Templates**     | `templates.py`      | 6 versioned YAML templates (npm, pip, config, flake, yaml, dockerfile); variable substitution; YAML validation                 | ✅          |
| **Test Selection Agent**      | `test_selection.py` | Impact-based test selection; 21 file-to-test mappings; module dep chain impact; commit message analysis                        | ✅          |
| **Canary Agent**              | `canary_agent.py`   | Autonomous canary monitoring; health eval (error rate, p99, burn rate, traffic); promote/hold/rollback decisions; deploy intel | ✅          |

### 🛡️ Layer 3: Safety & Policy (6 modules)

| Component                   | File               | Description                                                                                                                       | Tests |
| --------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ----- |
| **A/B/C Action Policy**     | `policy.py`        | 3-tier: Class A (suggest, risk≥70), Class B (approve, risk≥40), Class C (auto, risk<20)                                          | ✅    |
| **Policy-as-Code Engine**   | `policy_engine.py` | YAML-defined policies; condition-based rule evaluation; 2 seeded policies (production-safety, payment-services)                   | ✅    |
| **Deployment Risk Scoring** | `risk.py`          | 5-factor weighted model: files (30%), criticality (25%), config (20%), DB migration (15%), frequency (10%)                       | ✅    |
| **Canary Controller**       | `canary.py`        | 3-stage progression (5%→10%→25%); configurable bake times; auto-rollback on burn rate > 2.0                                      | ✅    |
| **Multi-tenant RBAC + SSO** | `rbac.py` `sso.py` | 4 roles (admin, operator, engineer, viewer); OIDC/OAuth2 SSO (Google, GitHub, Azure AD, custom); SAML config; session management | ✅    |
| **Compliance Reporting**    | `compliance.py`    | 14 SOC2 + 7 ISO27001 controls; report generation; multi-format export (JSON, CSV, markdown); audit stats                         | ✅    |

### 📊 Layer 4: Observability (3 modules)

| Component                | File           | Description                                                                                                                | Tests |
| ------------------------ | -------------- | -------------------------------------------------------------------------------------------------------------------------- | ----- |
| **OpenTelemetry**        | `telemetry.py` | OTLP gRPC exporter; console fallback; FastAPI middleware; Prometheus `/metrics` (request count, error count, avg duration) | ✅    |
| **SSE Live Stream**      | `stream.py`    | Real-time EventSource broadcasting; ambient events for UI liveliness; client tracking with graceful disconnect             | ✅    |
| **Cross-agent Timeline** | `timeline.py`  | Unified chronological feed across all agents; agent filter; decision stats                                                 | ✅    |

### 🗄️ Layer 5: Persistence (3 modules)

| Component                | File                  | Description                                                                                                                | Tests |
| ------------------------ | --------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----- |
| **SQLite Engine**        | `persistence.py`      | 18 auto-created tables; generic CRUD helper; store-specific helpers; API router with stats/reset                           | ✅    |
| **PostgreSQL (asyncpg)** | `pg_persistence.py`   | asyncpg connection pool (min=2, max=10); SQLAlchemy metadata for all 18 entities; Alembic migrations; auto-schema creation | ✅    |
| **Persistence Sync**     | `persistence_sync.py` | 14 sync functions bridging in-memory ↔ SQLite; startup load; silent fallback                                               | ✅    |

### 🤖 Layer 6: Automation & Orchestration (7 modules)

| Component                   | File                  | Description                                                                                                                              | Tests       |
| --------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **K8s Operator**            | `operator.py`         | kopf-based with ForgeRemedy CRD; NATS-driven remediation dispatcher; **multi-cluster deployment** (staging-us, prod-us, prod-eu)         | ✅          |
| **PM Agent**                | `pm_agent.py`         | Backlog decomposition from NL descriptions; sprint plan generation with velocity factor; blocker detection from CI/CD telemetry          | ✅          |
| **Chaos Engineering**       | `chaos.py`            | 5 fault types (latency, error, dependency_failure, resource_exhaustion, network_partition); resilience test CRUD + execution              | ✅ 17 tests |
| **Workflow Editor**         | `workflows.py`        | Backend CRUD + 7-step seeded CI/CD pipeline with execute endpoint                                                                        | ✅          |
| **Agent Orchestrator**      | `orchestrator_agent.py` | DAG-based workflow orchestration; 3 predefined workflows; dep graph resolution; parallel step execution; exponential retry                | ✅          |
| **Demo Controller**         | `demo.py`             | 4 deterministic failure scenarios (dependency, config, flake, latency); live + replay modes                                               | ✅          |
| **Decision Replay Engine**  | `replay.py`           | Step-by-step replay sessions with play/pause/reset; timeline evidence per step                                                            | ✅          |

### 🎨 Layer 7: Frontend (25 pages — including app shell + public routes)

| Page                       | File                        | Description                                                                                         |
| -------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------- |
| **Dashboard**              | `Dashboard.tsx`             | Events feed, decisions log, incident display, audit trail, canary status, policy stats              |
| **CI/CD Intel**            | `CICD.tsx`                  | Pipeline visualization, classifier integration, rerun agent panel, failure patterns, workflow history|
| **AI Agents**              | `Agents.tsx`                | Agent cards (SRE, DevOps, Guardian), confidence scores, action history, replay engine               |
| **Architecture**           | `Architecture.tsx`          | Guardian service graph, service comparison grid, layered findings, check timeline, discovery wizard |
| **Incidents**              | `Incidents.tsx`             | Incident list, RCA summary, cross-service cascading failure chains, dependency maps                 |
| **Analytics**              | `Analytics.tsx`             | Classifier analysis, policy evaluation statistics, decision distribution charts                     |
| **Workflows**              | `Workflows.tsx`             | Drag-and-drop visual pipeline canvas, node properties, execute controls                             |
| **PM Sprint Planning**     | `SprintPlanning.tsx`        | 3-tab layout: Backlog / Sprints / Blockers; AI decomposition; sprint plan generator                 |
| **Pilot Dashboard**        | `PilotDashboard.tsx`        | 6 KPI cards (uptime, MTTR, MTTD, CFR, deploys/day, coverage), service health, autonomy metrics      |
| **Collaboration Timeline** | `CollaborationTimeline.tsx` | Chronological agent activity feed, agent filter chips, decision distribution bar chart              |
| **Policy Management**      | `PolicyManagement.tsx`      | Policy CRUD, rule editor, evaluate panel with risk context input                                    |
| **Onboarding**             | `Onboarding.tsx`            | Tenant readiness checklist, setup progress tracking                                                 |
| **Canary Dashboard**       | `CanaryDashboard.tsx`       | Auto-rollback UI, live canary monitoring, deploy intelligence, scenario simulator                   |
| **Security Scanner**       | `Security.tsx`              | SAST scan input, result severity display, rule browser                                              |
| **Compliance Portal**      | `Compliance.tsx`            | SOC2/ISO27001 control mapping, report generation, JSON/CSV/markdown export buttons                  |
| **Agent Orchestrator**     | `Orchestrator.tsx`          | DAG workflow selection, step execution visualization, execution logs                                |

---

## 🔧 Tech Stack

### Backend — Python 3.13 (43 modules)

| Category          | Technologies                                            |
| ----------------- | ------------------------------------------------------- |
| **Framework**     | FastAPI 1.0, Uvicorn 0.34, Pydantic v2                  |
| **Databases**     | asyncpg (PostgreSQL 17), SQLite 3, Alembic 1.14         |
| **Observability** | OpenTelemetry SDK, OTLP gRPC, Prometheus metrics        |
| **Messaging**     | NATS (nats-py 2.6), SSE streaming                       |
| **Kubernetes**    | kopf 1.37 (K8s operator framework), multi-cluster       |
| **Security**      | SAST scanning, CVSS scoring, OIDC/OAuth2 SSO            |
| **Testing**       | pytest 8.3, httpx 0.28 (TestClient)                     |
| **API**           | 100+ REST endpoints · 30+ domains · 60+ API client methods |

### Frontend — React 18 + TypeScript 5.8 (25 pages + 38 UI components)

| Category      | Technologies                                                        |
| ------------- | ------------------------------------------------------------------- |
| **Framework** | React 18, TypeScript 5.8, Vite 5                                    |
| **Routing**   | React Router 6 (19 routes + 404 catch-all)                          |
| **State**     | TanStack Query 5, React Hook Form 7 + Zod                           |
| **Styling**   | Tailwind CSS 3.4, shadcn/ui (38 Radix primitives), Framer Motion 12 |
| **Charts**    | Recharts 2.15, D3 visualization                                     |
| **Testing**   | Vitest 3, React Testing Library, jsdom                              |
| **Build**     | Vite 5 production bundle (2943 modules, 1.9 MB JS)                  |

### Infrastructure

| Component            | Technology                                                                          |
| -------------------- | ----------------------------------------------------------------------------------- |
| **Containerization** | Docker + docker-compose (3 services)                                                |
| **K8s Deployment**   | 9 manifests (CRD, operator, backend, frontend, NATS, OTEL collector, cluster config)|
| **Multi-cluster**    | 3 clusters (staging-us, production-us, production-eu) with env-specific sizing      |
| **Database**         | PostgreSQL 17 (Alpine), persistent volume, health checks                            |
| **CI/CD**            | GitHub Actions (backend + frontend pipeline)                                        |

---

## 📂 Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py                 # App bootstrap + 17 routers
│   │   ├── api.py                  # Events/Decisions/Audit CRUD (5 endpoints)
│   │   ├── schemas.py             # Pydantic models (Event, Decision, Audit, Risk, etc.)
│   │   ├── classifier.py          # 4-class CI failure classifier (+ perf regression)
│   │   ├── repair.py              # Auto-fix PR patch generation
│   │   ├── webhooks.py            # GitHub webhook ingestion (HMAC-SHA256)
│   │   ├── orchestrator.py        # Workflow rerun orchestration
│   │   ├── canary.py              # Canary controller (3-stage, auto-rollback)
│   │   ├── canary_agent.py        # Canary agent (autonomous monitoring, decisions)
│   │   ├── rerun_agent.py         # Workflow rerun agent (flake analysis, escalation)
│   │   ├── test_selection.py      # Impact-based test selection agent
│   │   ├── security_scanner.py    # SAST security scanning (secrets, deps, configs)
│   │   ├── sso.py                 # Enterprise SSO/OIDC authentication
│   │   ├── compliance.py          # SOC2/ISO27001 compliance reporting
│   │   ├── orchestrator_agent.py  # DAG-based agent orchestrator
│   │   ├── risk.py                # 5-factor deployment risk scoring
│   │   ├── policy.py              # A/B/C action class policy
│   │   ├── policy_engine.py       # YAML policy-as-code engine
│   │   ├── guardian.py            # Architecture guardian (+ config drift detection)
│   │   ├── incident_summary.py    # Incident commander RCA (+ cross-service chains)
│   │   ├── context.py             # Incidents + ownership persistence
│   │   ├── pm_agent.py            # PM agent (backlog, sprints, blockers)
│   │   ├── timeline.py            # Cross-agent collaboration timeline
│   │   ├── onboarding.py          # Pilot dashboard KPIs + tenant onboarding
│   │   ├── chaos.py               # Chaos engineering (5 fault types)
│   │   ├── quarantine.py          # Flaky test quarantine + retry backoff
│   │   ├── templates.py           # YAML remediation templates
│   │   ├── workflows.py           # Visual workflow editor backend
│   │   ├── rbac.py                # Multi-tenant RBAC (4 roles)
│   │   ├── demo.py                # Demo failure injection (4 scenarios)
│   │   ├── replay.py              # Decision replay engine
│   │   ├── stream.py              # SSE live event stream
│   │   ├── telemetry.py           # OpenTelemetry instrumentation
│   │   ├── event_bus.py           # NATS pub/sub abstraction
│   │   ├── operator.py            # K8s operator (kopf)
│   │   ├── github_client.py       # GitHub API client (real PRs)
│   │   ├── persistence.py         # SQLite engine (18 tables)
│   │   ├── persistence_sync.py    # In-memory ↔ SQLite sync adapter
│   │   ├── pg_persistence.py      # PostgreSQL (asyncpg, async CRUD)
│   │   ├── run_demo.py            # End-to-end demo script (--chaos flag)
│   │   ├── test_all.py            # 56 core integration tests
│   │   ├── test_chaos.py          # 17 chaos engineering tests
│   │   ├── test_event_bus.py      # 15 NATS event bus tests
│   │   └── test_v100.py           # 33 v1.0.0 module tests
│   ├── alembic/                   # Database migrations (PostgreSQL)
│   ├── Dockerfile                 # Multi-stage Python 3.13-slim
│   └── requirements.txt           # Python dependencies
├── src/
│   ├── App.tsx                    # Routes + providers (25 pages)
│   ├── main.tsx                   # Entry point
│   ├── pages/                     # 17 app pages + 8 public pages
│   │   ├── Dashboard.tsx          # Events, decisions, incidents, audit
│   │   ├── CICD.tsx               # CI/CD pipeline + rerun agent panel
│   │   ├── Agents.tsx             # AI agents + replay engine
│   │   ├── Architecture.tsx       # Guardian service graph + comparison grid
│   │   ├── Incidents.tsx          # Incident list + cross-service RCA chains
│   │   ├── SprintPlanning.tsx     # PM agent (3-tab)
│   │   ├── PilotDashboard.tsx     # KPIs + onboarding
│   │   ├── CollaborationTimeline.tsx  # Agent activity feed
│   │   ├── PolicyManagement.tsx   # Policy CRUD + evaluation
│   │   ├── Workflows.tsx          # Pipeline canvas
│   │   ├── CanaryDashboard.tsx    # Auto-rollback UI + deploy intel
│   │   ├── Security.tsx           # SAST security scanner
│   │   ├── Compliance.tsx         # SOC2/ISO compliance portal
│   │   └── Orchestrator.tsx       # DAG workflow orchestrator
│   ├── components/               # 38 shadcn/ui components
│   │   ├── ui/                   # Button, card, dialog, etc.
│   │   ├── layout/               # AppShell, Sidebar, Topbar
│   │   └── LogStream.tsx         # SSE-powered live feed
│   ├── lib/
│   │   ├── apiClient.ts          # 60+ API methods with mock fallback
│   │   ├── mock.ts               # Mock seed data
│   │   └── utils.ts              # Utilities
│   └── test/                     # 15 frontend tests
├── deploy/
│   └── kubernetes/               # 9 K8s manifests
│       ├── crd.yaml              # ForgeRemedy CRD
│       ├── operator-deployment.yaml  # kopf operator
│       ├── backend-deployment.yaml
│       ├── frontend-deployment.yaml
│       ├── nats-deployment.yaml
│       ├── otel-collector.yaml
│       ├── kustomization.yaml
│       ├── cluster-config.yaml   # Multi-cluster profiles
│       ├── deploy.sh             # 7-step deployment script
│       └── deploy-multi-cluster.sh  # Multi-cluster deployment
├── docs/
│   ├── ARCHITECTURE.md           # Full Mermaid architecture
│   ├── IMPLEMENTATION-BACKLOG.md # 43 backlog items
│   ├── PIPELINE.md               # Production pipeline
│   ├── ROADMAP.md                # 8-milestone roadmap
│   └── DEMO-RUNBOOK.md           # Demo runbook
├── docker-compose.yml            # PostgreSQL + backend + frontend
└── package.json
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.13+
- Node.js 18+
- npm or pnpm

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
set GITHUB_WEBHOOK_SECRET=forge-dev-secret   # Windows
# export GITHUB_WEBHOOK_SECRET=forge-dev-secret  # macOS/Linux

# Start the API server
uvicorn app.main:app --port 8000 --reload
```

### 2. Frontend

```bash
npm install
npx vite --port 5173
```

### 3. Verify

```bash
# Backend health check
curl http://localhost:8000/health
# → {"status":"healthy","version":"1.0.0","service":"forge-autonomy-os"}

# Open frontend
open http://localhost:5173
```

---

## 🎬 Run the Full Demo

The demo script exercises the complete autonomous CI recovery flow:

```bash
cd backend
GITHUB_WEBHOOK_SECRET=forge-dev-secret python -m app.run_demo
```

This walks through all 7 steps:

1. ✅ **Health check** — Backend responds
2. ✅ **Webhook injection** — Simulated `check_suite` failure with HMAC-SHA256 signature
3. ✅ **CI failure classification** — Classified as `dependency` with 0.95 confidence
4. ✅ **Auto-fix generation** — 7-line patch with full PR body
5. ✅ **PR creation** — Endpoint responds (blocked gracefully when no `GITHUB_TOKEN`)
6. ✅ **OTel metrics** — Prometheus `/metrics` exposes request/error/duration counters
7. ✅ **Audit persistence** — Events, decisions, and audit trails stored

### Chaos Engineering Demo

```bash
cd backend
GITHUB_WEBHOOK_SECRET=forge-dev-secret python -m app.run_demo --chaos
```

Adds 11 additional chaos checks:

- Inject 3 fault types (latency, error, dependency_failure)
- List active faults, simulate impact, stop a fault
- List, get, run, and create resilience tests
- Get chaos engineering summary with resilience score

---

## 🧪 Testing & Verification

### Backend (121 tests — all passing)

```bash
cd backend
python -m pytest app/test_all.py app/test_chaos.py app/test_event_bus.py app/test_v100.py -v
# 121 passed in 4.2s
```

### Frontend (15 tests — all passing)

```bash
npx vitest run
# 15 passed
```

### TypeScript Compilation (0 errors)

```bash
npx tsc --noEmit
# No output = clean compile
```

### Vite Production Build

```bash
npx vite build
# 2943 modules bundled in 14.2s
# Output: dist/ (1.9 MB JS, 0 errors)
```

---

## 🛡️ Safety Architecture

Forge Autonomy OS has a **three-layer safety model** designed for enterprise production use:

### Layer 1: Action Classification

| Class                     | Policy                                 | Examples                              | Blast Radius |
| ------------------------- | -------------------------------------- | ------------------------------------- | ------------ |
| **A — Suggest Only**      | Risk ≥ 70 or org-wide impact           | Schema changes, service decomposition | High         |
| **B — Approval Required** | Risk ≥ 40 or moderate + low confidence | Config changes, canary promote        | Medium       |
| **C — Auto Execute**      | Risk < 20 + high confidence            | Logging changes, simple retries       | Low          |

### Layer 2: Risk Scoring

5 weighted factors combine into a single risk score (0-100):

- **30%** — Files changed count
- **25%** — Service criticality (critical/high/medium/low)
- **20%** — Configuration change indicator
- **15%** — Database migration indicator
- **10%** — Deployment frequency (inverse)

### Layer 3: Multi-tenant RBAC

| Role         | Permissions                       | Use Case         |
| ------------ | --------------------------------- | ---------------- |
| **Admin**    | Full CRUD on all resources        | Platform team    |
| **Operator** | Execute actions, manage incidents | SRE / DevOps     |
| **Engineer** | Create incidents, view all        | Development team |
| **Viewer**   | Read-only access                  | Stakeholders     |

**Every autonomous action is:**

1. ✅ Scored for risk and blast radius
2. ✅ Evaluated against active policies
3. ✅ Checked against role permissions
4. ✅ Logged with full audit trail (trace_id, agent, confidence, risk, evidence)
5. ✅ Replayable step-by-step

---

## ☸️ Kubernetes Deployment

Forge includes a complete K8s deployment stack with 7 manifests:

```bash
# Deploy the full stack
cd deploy/kubernetes
chmod +x deploy.sh
./deploy.sh
```

The `deploy.sh` script orchestrates:

1. **Namespace** — `forge-autonomy-os`
2. **CRD** — `ForgeRemedy` custom resource definition
3. **NATS** — StatefulSet with JetStream, headless service
4. **OTEL Collector** — OpenTelemetry collector with Prometheus exporter
5. **Backend** — FastAPI deployment with secret references
6. **Frontend** — Nginx-served React SPA
7. **Operator** — kopf-based operator with ClusterRole RBAC

### ForgeRemedy CRD Example

```yaml
apiVersion: forge.os/v1
kind: ForgeRemedy
metadata:
  name: dependency-fix-db-pool
spec:
  service: db-pool-service
  fixType: dependency
  patch: |
    {
      "dependencies": {
        "some-package": "^1.2.0"
      }
    }
  version: 1.0.0
  replicas: 3
  traceId: "trace-abc123"
  priority: high
```

---

## 📖 Documentation

| Document                                                          | Description                                                   |
| ----------------------------------------------------------------- | ------------------------------------------------------------- |
| **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)**                     | Full 7-layer Mermaid diagram — 43 modules across Ingestion, Context, Recovery, Safety, Observability, Persistence, Automation, Frontend |
| **[PIPELINE.md](./docs/PIPELINE.md)**                             | AI-native production pipeline — 7-stage autonomous control loop with all quality gates operational |
| **[ROADMAP.md](./docs/ROADMAP.md)**                               | Complete delivery roadmap — 11 versions across 8 milestones, from scaffold to v1.0.0 production |
| **[IMPLEMENTATION-BACKLOG.md](./docs/IMPLEMENTATION-BACKLOG.md)** | All 43 backlog items (B-001 through B-046) with detailed acceptance criteria and delivery notes |
| **[DEMO-RUNBOOK.md](./docs/DEMO-RUNBOOK.md)**                     | Complete 12-15 minute demo flow covering all 25 pages and v1.0.0 enterprise features |

---

## 📊 Key Metrics

| Metric               | Value                                                                                |
| -------------------- | ------------------------------------------------------------------------------------ |
| Backend modules      | 43 Python modules                                                                    |
| Frontend pages       | 17 app pages + 8 public pages + NotFound                                             |
| REST API endpoints   | 100+ across 30+ domains                                                              |
| Backend tests        | 121 (all passing)                                                                    |
| Frontend tests       | 15 (all passing)                                                                     |
| shadcn/ui components | 38 Radix primitives                                                                  |
| NPM dependencies     | ~50 packages                                                                         |
| Python dependencies  | ~15 packages                                                                         |
| Vite build           | 2,943 modules, 1.9 MB                                                                |
| TypeScript errors    | 0                                                                                    |
| Backlog items        | 43 delivered across 8 milestones                                                     |
| Architecture layers  | 7 layers                                                                             |
| K8s manifests        | 9 files                                                                              |
| Multi-cluster        | 3 clusters (staging-us, production-us, production-eu)                                |
| DB tables (SQLite)   | 18 auto-created                                                                      |
| DB migration (PG)    | Alembic with 1 migration                                                             |
| CI failure classes   | 4 (dependency, config, flake, performance_regression)                                |
| Fault types (chaos)  | 5 (latency, error, dependency_failure, resource_exhaustion, network_partition)       |
| RBAC roles           | 4 (admin, operator, engineer, viewer) + SSO OIDC providers                           |
| Canary stages        | 3 (5% → 10% → 25%) + autonomous agent promote/hold/rollback                          |
| Demo scenarios       | 4 deterministic failures                                                             |
| Security patterns    | 26 SAST patterns (secrets 12, configs 11, deps 3)                                    |
| Compliance controls  | 21 (14 SOC2 + 7 ISO27001), multi-format export                                       |
| Export formats       | JSON, CSV, Markdown                                                                  |

---

## 📄 License

MIT

---

<p align="center">
  <i>Built with FastAPI · React · TypeScript · PostgreSQL · NATS · kopf · OpenTelemetry</i>
</p>
