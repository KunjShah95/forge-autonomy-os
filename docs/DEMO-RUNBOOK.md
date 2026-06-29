# Forge Autonomy OS — Demo Runbook

> **Status:** ✅ **v1.0.0** — 43 backend modules · 25 frontend pages · 100+ REST API endpoints · 121 passing tests · All 8 milestones delivered

---

## Demo Narrative

"AI copilots assist coding. Forge Autonomy OS autonomously coordinates production with safety controls."

---

## Prerequisites

- ✅ Frontend running on port 5173 (`npx vite --port 5173`)
- ✅ Backend API running on port 8000 (`uvicorn app.main:app --port 8000`)
- ✅ `GITHUB_WEBHOOK_SECRET=forge-dev-secret` set in environment
- ✅ All 121 backend tests passing
- ✅ 4 injectable failure scenarios pre-configured
- ✅ Demo script available: `cd backend && python -m app.run_demo`

---

## Golden Demo Flow (12-15 minutes)

### 1. Setup Context (1 min)

Show the **Architecture** page (`/architecture`):

- Guardian service graph with connected services and health scores
- **Service comparison grid** — metrics across the stack (boundary violations, coupling scores, C4 compliance)
- **Discovery wizard** — layered findings with severity colors (boundary → coupling → C4 → tech_debt)
- **Check timeline** — historical guardian check results
- Navigate to **Dashboard** (`/dashboard`) → connection indicator (green = live); decision feed showing recent autonomous actions; canary status; policy stats; workflow timeline

### 2. Inject Failure (1 min)

Navigate to **CI/CD Intel** (`/cicd`):

- Show **classify** panel ready for input
- Inject failure via demo controls or direct API: `/api/v1/demo/inject` with `dependency_mismatch` scenario
- Observe raw event appear in the event feed

### 3. Observe Intelligence (2 min)

On **CI/CD** page:

- **Classify** the failure from log output → returns `"dependency"` with confidence score + evidence
- **Risk Score** panel: 5 weighted factors, overall score (e.g. 35 moderate), risk level
- **Test Selection**: the test selection agent shows which tests would be impacted by the change
- **Rerun Agent panel**: shows flaky test analysis and retry decision history
- Click **"Generate Repair"** → auto-fix PR patch appears with diff summary and commit message

### 4. Navigate Safety Gates (1.5 min)

On **Policy Management** (`/policies`):

- Policy list showing `production-safety` and `payment-services` policies with their rules
- **Evaluate** panel: input risk context → see matched policy + action class (A/B/C) + allow/deny
- Toggle enable/disable policies inline

On **CI/CD** page:

- **Policy Evaluation**: action class "C" (auto-execute), risk score within threshold
- **Canary Controls**: Start canary rollout (service, version, percentages)
- Canary status shows: Stage 1 (5%) → Stage 2 (10%) → Stage 3 (25%)
- Auto-rollback triggers on error budget burn rate exceedance

### 5. Security Scan (1 min)

Navigate to **Security Scanner** (`/security`):

- Paste code into scan input → **Scan** button triggers SAST analysis
- Results display: secrets found (API keys, tokens), insecure configs (eval, CORS wildcard), vulnerable dependencies (lodash, axios) with CVSS severity scores
- Expand each finding to see line-level detail and fix recommendation

### 6. Incident Management (1.5 min)

Navigate to **Incidents** (`/incidents`):

- Incident list shows active incidents with severity colors (critical/medium/low)
- Click any incident → RCA summary panel:
  - Root cause, impact, mitigation, prevention items
  - **Cross-service cascading failure chain** — blast radius diagram showing affected services
  - Service dependency map with propagation paths
  - Timeline evidence with decisions and confidence scores

### 7. Canary Agent (1 min)

Navigate to **Canary Dashboard** (`/canary`):

- Live canary monitoring — deploy status, health metrics (error rate, p99 latency, burn rate), stage progression
- Agent decision log — autonomous promote/hold/rollback decisions with confidence scoring
- **Scenario simulator** — switch between healthy / degraded / critical / rollback modes to demonstrate agent responses

### 8. Decision Replay (1 min)

Navigate to **AI Agents** (`/agents`):

- Agent cards showing SRE Agent, DevOps Agent, Architecture Guardian with confidence scores and action history
- **Replay Engine**: Start replay on a trace → step through event → decision → outcome with play/pause/reset
- Each step shows type, timestamp, summary, and payload

### 9. Orchestrator & Workflows (1 min)

Navigate to **Workflows** (`/workflows`):

- Drag-and-drop workflow editor with seeded 7-step CI/CD pipeline
- Step properties panel — edit config per node
- Execute pipeline and observe step-by-step progression

Navigate to **Agent Orchestrator** (`/orchestrator`):

- Select from 3 predefined DAG workflows (CI Auto-Recovery, Incident Response, Test & Deploy)
- View dependency graph resolution with parallel step execution
- Observe execution logs with retry status

### 10. Compliance & Audit (1 min)

Navigate to **Compliance Portal** (`/compliance`):

- 14 SOC2 + 7 ISO27001 controls with status indicators and evidence links
- Generate compliance report → shows control pass/fail counts, auto-execution rate
- **Export** buttons: JSON, CSV, Markdown download

Navigate to **Dashboard** → **Audit Trail** section:

- Every decision has: trace_id, agent, action, confidence, risk, evidence
- Full accountability for every autonomous action

### 11. Analyze Outcomes (30s)

Navigate to **Analytics** (`/analytics`):

- Classifier analysis panel — historical classification distribution
- Policy evaluation statistics — action class breakdown
- Decision distribution charts

### 12. Chaos Engineering (30s)

Navigate to **CI/CD** or **Dashboard**:

- Chaos summary showing active faults, resilience score, completed tests
- Inject faults (latency, errors, dependency failures) to test system resilience
- View resilience test results

---

## Operator Talking Points

- ✅ Every decision includes confidence + risk + evidence
- ✅ Auto-actions are policy-bounded and fully auditable
- ✅ Human override is always available (Class B approval required)
- ✅ System improves over time with outcome feedback (RCA + replay)
- ✅ 121 backend tests ensure regression safety
- ✅ SSO integrates with Google, GitHub, Azure AD

---

## New v1.0.0 Features to Highlight

| Feature | Demo Hook | Page |
|---------|-----------|------|
| Security scanning | "Passing credentials? Let's check for secrets" | `/security` |
| Compliance reporting | "SOC2 audit in one click" | `/compliance` |
| SSO login | "Enterprise-grade OIDC authentication" | `/login` |
| Agent orchestrator | "3 agents collaborating on a DAG" | `/orchestrator` |
| Multi-cluster K8s | "Deploy to staging-us, prod-us, and prod-eu" | deploy scripts |
| Cross-service RCA | "See how auth failure cascades to billing" | `/incidents` |
| Test selection | "Only run what the change touches" | `/cicd` |

---

## Backup Plan (if live integration fails)

- ✅ Frontend falls back to mock data automatically (2s timeout)
- ✅ All 25 pages work with mock data offline
- ✅ Demo controller injects deterministic failure scenarios
- ✅ Replay engine replays pre-recorded decision traces

---

## Judge/Investor Q&A Prep

### "Why is this different from existing copilots?"

Copilots generate code; Forge coordinates the full production lifecycle — from CI failure detection to auto-fix to guarded deployment to compliance audit — all with safety controls and full traceability.

### "How do you prevent unsafe autonomous actions?"

Three-layer safety: Action classes (A/B/C), risk-based policy gates, RBAC role permissions. Every decision requires evidence + confidence threshold. Plus SAST scanning, vulnerability detection, and compliance reporting.

### "What is the wedge product?"

Self-healing CI/CD with measurable MTTR reduction. The demo shows: dependency mismatch detected → classified → auto-fix generated → tests selected → canary deployed → audit trail logged — fully autonomous, with security scanning and compliance exports built in.

### "What is the moat?"

Complete context engine (code + infra + incidents + ownership graph) + policy-driven orchestration + 43-module backend + 25-page frontend + 121-test regression suite + multi-cluster K8s + enterprise SSO + SOC2/ISO compliance.

### "How mature is this?"

**v1.0.0 Production-ready.** 43 backend modules, 25 frontend pages, 100+ REST API endpoints, 121 backend tests, 15 frontend tests, 0 TypeScript errors. All 43 backlog items delivered across 8 milestones (11 versions).

---

## Success Metrics to Show Live

| Metric | Value |
|--------|-------|
| Time to detect | < 2s (webhook → classify) |
| Time to decision | < 5s (classify → policy gate) |
| Time to mitigation | < 30s (full E2E flow) |
| Autonomy rate | Configurable per action class |
| Test coverage | 121 backend tests + 15 frontend tests |
| Backend modules | 43 Python files |
| Frontend pages | 25 TypeScript pages |
| SAST patterns | 26 (12 secrets, 11 configs, 3 deps) |
| Compliance controls | 21 (14 SOC2 + 7 ISO27001) |

---

<p align="center">
  <i>Forge Autonomy OS — AI-Native Production Operating System</i>
</p>
