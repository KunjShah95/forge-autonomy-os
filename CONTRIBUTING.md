# Contributing to Forge Autonomy OS

Thank you for your interest in contributing! Forge Autonomy OS is an AI-native production orchestration platform. Whether you're fixing a bug, adding a feature, improving documentation, or writing tests — every contribution counts.

> **Before you start:** Please read our [Code of Conduct](./CODE_OF_CONDUCT.md) (if present) and this guide in full.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Development Setup](#development-setup)
  - [Prerequisites](#prerequisites)
  - [Backend](#backend)
  - [Frontend](#frontend)
  - [Running the Full Stack](#running-the-full-stack)
- [Project Architecture](#project-architecture)
- [Coding Standards](#coding-standards)
  - [Python (Backend)](#python-backend)
  - [TypeScript / React (Frontend)](#typescript--react-frontend)
  - [Git & Commits](#git--commits)
- [Testing](#testing)
  - [Backend Tests](#backend-tests)
  - [Frontend Tests](#frontend-tests)
  - [TypeScript Compilation](#typescript-compilation)
  - [Vite Build](#vite-build)
- [Pull Request Process](#pull-request-process)
- [Issue Tracking](#issue-tracking)
- [Adding Backlog Items](#adding-backlog-items)
- [Documentation](#documentation)

---

## Quick Start

```bash
# Clone the repo
git clone https://github.com/your-org/forge-autonomy-os.git
cd forge-autonomy-os

# Backend setup
cd backend
pip install -r requirements.txt
set GITHUB_WEBHOOK_SECRET=forge-dev-secret  # Windows
# export GITHUB_WEBHOOK_SECRET=forge-dev-secret  # macOS/Linux

# Frontend setup (from project root)
cd ..
npm install

# Run the full demo
cd backend
python -m app.run_demo
```

---

## Development Setup

### Prerequisites

| Tool         | Version   | Notes                                    |
| ------------ | --------- | ---------------------------------------- |
| Python       | ≥ 3.13    | Required for backend                     |
| Node.js      | ≥ 18      | Required for frontend                    |
| npm / pnpm   | any       | npm ships with Node.js                   |
| Docker       | ≥ 24      | Optional — needed for PostgreSQL & K8s   |
| kubectl      | ≥ 1.28    | Optional — needed for K8s deployment     |

### Backend

```bash
cd backend

# Create a virtual environment (recommended)
python -m venv .venv
source .venv/bin/activate  # macOS/Linux
# .venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Set required environment variables
set GITHUB_WEBHOOK_SECRET=forge-dev-secret

# Start the API server in development mode
uvicorn app.main:app --port 8000 --reload

# Verify
curl http://localhost:8000/health
# → {"status":"healthy","version":"1.0.0","service":"forge-autonomy-os"}
```

**Environment variables reference:**

| Variable                   | Required | Default                        | Description                                |
| -------------------------- | -------- | ------------------------------ | ------------------------------------------ |
| `GITHUB_WEBHOOK_SECRET`    | ✅       | —                              | HMAC-SHA256 secret for webhook verification|
| `GITHUB_TOKEN`             | ❌       | —                              | GitHub PAT for real PR creation            |
| `FORGE_NATS_URL`           | ❌       | `nats://localhost:4222`        | NATS server URL (empty = disabled)         |
| `FORGE_PG_DSN`             | ❌       | —                              | PostgreSQL DSN (empty = SQLite fallback)   |
| `FORGE_DB_PATH`            | ❌       | `forge.db`                    | SQLite database file path                  |
| `FORGE_INSTANCE_ID`        | ❌       | auto-generated                 | OTel instance ID for metrics               |
| `OTEL_CONSOLE_EXPORTER`    | ❌       | —                              | Set to `true` to log traces to console     |
| `OTEL_SERVICE_NAME`        | ❌       | `forge-autonomy-os`           | OpenTelemetry service name                 |

### Frontend

```bash
# From project root
npm install

# Start development server
npx vite --port 5173

# Open in browser
open http://localhost:5173
```

### Running the Full Stack

```bash
# 1. Start the backend (Terminal 1)
cd backend
set GITHUB_WEBHOOK_SECRET=forge-dev-secret
uvicorn app.main:app --port 8000 --reload

# 2. Start the frontend (Terminal 2)
npx vite --port 5173

# 3. (Optional) Start PostgreSQL with Docker
docker compose up -d db

# 4. Run the end-to-end demo (Terminal 3)
cd backend
python -m app.run_demo --chaos
```

---

## Project Architecture

Forge Autonomy OS follows a **7-layer architecture**:

```
┌─────────────────────────────────────────────────┐
│  Layer 7: Frontend (React 18 + TypeScript 5.8)  │
├─────────────────────────────────────────────────┤
│  Layer 6: Automation & Orchestration             │
│  (K8s operator, PM agent, chaos, workflows)      │
├─────────────────────────────────────────────────┤
│  Layer 5: Persistence (SQLite, PostgreSQL)       │
├─────────────────────────────────────────────────┤
│  Layer 4: Observability (OTel, SSE, timeline)    │
├─────────────────────────────────────────────────┤
│  Layer 3: Safety & Policy (A/B/C, risk, canary)  │
├─────────────────────────────────────────────────┤
│  Layer 2: Remediation (auto-fix, quarantine)     │
├─────────────────────────────────────────────────┤
│  Layer 1: Classification & Context (classifier,   │
│           GitHub client, guardian, RCA)           │
├─────────────────────────────────────────────────┤
│  Layer 0: Ingestion (webhooks, NATS event bus)   │
└─────────────────────────────────────────────────┘
```

For the full system diagram with all 27 components and data flows, see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

### Key directories

| Directory                    | Purpose                                       |
| ---------------------------- | --------------------------------------------- |
| `backend/app/`               | 37 Python modules — all backend logic         |
| `backend/app/main.py`        | App bootstrap, router registration, startup   |
| `backend/app/api.py`         | Core REST endpoints (events, decisions, audit)|
| `backend/app/schemas.py`     | Pydantic models shared across modules         |
| `src/pages/`                 | 11 app pages + 8 public pages                 |
| `src/components/`            | 38 shadcn/ui React components                 |
| `src/lib/apiClient.ts`       | API client with 30+ methods + mock fallback   |
| `deploy/kubernetes/`         | 7 K8s manifests + deploy.sh                   |
| `docs/`                      | Architecture, pipeline, roadmap, runbook      |

---

## Coding Standards

### Python (Backend)

- **Style:** Follow [PEP 8](https://peps.python.org/pep-0008/). We use **Black**-compatible formatting (single quotes preferred for consistency with the existing codebase).
- **Typing:** Use type hints everywhere. Enable strict mypy checking if possible.
- **Imports:** Group as standard library → third-party → local. Use absolute imports.
- **Async:** Use `async/await` for I/O-bound operations. Prefer `asyncio.create_task()` over `ensure_future()`.
- **Error handling:** Raise specific exceptions (not bare `except:`). Log errors with context.
- **Docstrings:** Use Google-style docstrings for public functions and classes.
- **Testing:** Every new module should have a corresponding `test_<module>.py` file. Use `pytest` with `unittest.TestCase` (matching the existing pattern).
- **Environment variables:** Access via `os.environ.get()` with sensible defaults. Document all vars in the module docstring or a dedicated config section.

**Before submitting:**

```bash
cd backend
python -m pytest app/test_all.py app/test_chaos.py app/test_event_bus.py -v
# All 88 tests must pass
```

### TypeScript / React (Frontend)

- **Style:** We use **Prettier** with `prettier-plugin-tailwindcss`. Run `npx prettier --write .` before committing.
- **Typing:** Enable `strict` mode in `tsconfig.json`. Avoid `any` — use `unknown` + type guards if needed.
- **Components:** Functional components only. Use shadcn/ui primitives from `src/components/ui/` when possible.
- **State management:** React Query (`@tanstack/react-query`) for server state. React Hook Form + Zod for forms.
- **Styling:** Tailwind CSS utility classes. Use `cn()` helper from `src/lib/utils.ts` for conditional classes.
- **API calls:** Route all backend requests through `src/lib/apiClient.ts`. New endpoints get a method there.
- **Imports:** Sort: React → third-party libraries → local modules → CSS/styles.
- **File naming:** PascalCase for components, camelCase for utilities, kebab-case for CSS.

**Before submitting:**

```bash
npx tsc --noEmit          # 0 errors
npx vitest run             # All 15 tests pass
npx vite build             # Clean production build
npx prettier --check .     # No formatting issues
```

### Git & Commits

We follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages:

```
<type>(<scope>): <short description>

[optional body]
```

**Types:**

| Type       | Usage                                        |
| ---------- | -------------------------------------------- |
| `feat`     | New feature or significant enhancement       |
| `fix`      | Bug fix                                      |
| `test`     | Adding or improving tests                    |
| `docs`     | Documentation only                           |
| `refactor` | Code change that neither fixes nor adds      |
| `chore`    | Build, CI, dependency updates                |
| `style`    | Formatting, linting (no logic change)        |
| `perf`     | Performance improvement                      |

**Examples:**

```
feat(classifier): add 4th failure class for resource exhaustion
fix(webhooks): handle missing HMAC signature gracefully
test(event-bus): add integration tests for publish/subscribe cycle
docs(readme): add chaos engineering demo section
```

**Branch naming:** Use `feat/`, `fix/`, `docs/`, `test/` prefixes:

```
feat/resource-exhaustion-classifier
fix/hmac-null-check
docs/contributing-guide
```

---

## Testing

All tests must pass before a PR is merged.

### Backend Tests (88 tests)

```bash
cd backend
python -m pytest app/test_all.py app/test_chaos.py app/test_event_bus.py -v --tb=short
```

| Test file              | Tests | Covers                                         |
| ---------------------- | ----- | ---------------------------------------------- |
| `test_all.py`          | 56    | Core API, classifier, repair, webhooks, policy |
| `test_chaos.py`        | 17    | Fault injection, resilience tests, scenarios   |
| `test_event_bus.py`    | 15    | NATS pub/sub, envelopes, connection lifecycle  |

### Frontend Tests (15 tests)

```bash
npx vitest run
```

| Test file                          | Tests | Covers                                |
| ---------------------------------- | ----- | ------------------------------------- |
| `dashboard.test.tsx`               | 5     | Dashboard rendering, API integration  |
| `sprintPlanning.test.tsx`          | 5     | Sprint planner tabs and actions       |
| `pilotDashboard.test.tsx`          | 5     | KPI cards, autonomy metrics           |

### TypeScript Compilation

```bash
npx tsc --noEmit
# Expected: 0 errors, no output
```

### Vite Production Build

```bash
npx vite build
# Expected: clean exit, ~2,900+ modules bundled
```

---

## Pull Request Process

1. **Fork and branch** — Create a feature branch from `main`.
2. **One change per PR** — Keep PRs focused on a single concern. Large PRs should be split into logical commits.
3. **Write tests first** — Add tests for new functionality before implementing it (TDD preferred).
4. **Run all checks** — Before opening a PR, run:

   ```bash
   cd backend && python -m pytest app/ -v
   cd .. && npx tsc --noEmit && npx vitest run && npx vite build
   ```

5. **Update documentation** — If your change affects the architecture, API, or setup, update the relevant docs in `./docs/`.
6. **Open the PR** — Provide a clear description of the change, why it's needed, and how it was tested. Link any related issues.
7. **Review** — Maintainers will review your PR. Expect feedback and be responsive.
8. **Merge** — Once approved, a maintainer will squash-merge into `main`.

### PR Checklist

- [ ] Code follows the project's coding standards
- [ ] Tests added/updated and all pass
- [ ] TypeScript compiles with 0 errors
- [ ] Vite production build succeeds
- [ ] Documentation updated (if applicable)
- [ ] Commit messages follow Conventional Commits
- [ ] Branch is up to date with `main`

---

## Issue Tracking

We use GitHub Issues for tracking bugs, feature requests, and tasks.

### Bug Reports

Include:

- **Summary** — Clear one-line description
- **Steps to reproduce** — Minimal, reproducible example
- **Expected behavior** — What should happen
- **Actual behavior** — What actually happens
- **Environment** — OS, Python version, Node version, commit hash
- **Logs/screenshots** — If applicable

### Feature Requests

Include:

- **Problem statement** — What problem are you solving?
- **Proposed solution** — How would you solve it?
- **Alternatives considered** — What else did you think about?
- **Acceptance criteria** — How will we know it's done?

### Labels

| Label          | Purpose                        |
| -------------- | ------------------------------ |
| `bug`          | Something isn't working        |
| `enhancement`  | New feature or improvement     |
| `good first issue` | Beginner-friendly task     |
| `help wanted`  | Needs contributor assistance   |
| `backlog`      | Tracked in implementation plan |
| `docs`         | Documentation-related          |
| `testing`      | Test coverage or improvements  |

---

## Adding Backlog Items

If your feature aligns with Forge Autonomy OS's vision, you may propose adding it to the implementation backlog:

1. Open an issue with the `backlog` label
2. Include the format: `B-XXX: Short title`
3. Describe: priority, effort estimate, acceptance criteria, and dependencies
4. A maintainer will review and assign a tracking number

See [docs/IMPLEMENTATION-BACKLOG.md](./docs/IMPLEMENTATION-BACKLOG.md) for existing items.

---

## Documentation

When contributing, keep documentation in sync with code:

| File                                                    | When to update                                    |
| ------------------------------------------------------- | ------------------------------------------------- |
| [`README.md`](./README.md)                              | New feature, changed setup, updated metrics       |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)        | New modules, changed layer structure               |
| [`docs/PIPELINE.md`](./docs/PIPELINE.md)                | Changed control loop or quality gates              |
| [`docs/ROADMAP.md`](./docs/ROADMAP.md)                  | Added or completed milestones                      |
| [`docs/IMPLEMENTATION-BACKLOG.md`](./docs/IMPLEMENTATION-BACKLOG.md) | Completed or added backlog items  |
| [`docs/DEMO-RUNBOOK.md`](./docs/DEMO-RUNBOOK.md)        | Changed demo flow or failure scenarios             |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md)                  | Changed development workflow or standards          |

---

## Questions?

If you're unsure about anything, open a [Discussion](https://github.com/your-org/forge-autonomy-os/discussions) or ask in the relevant issue thread. We're glad you're here.

---

<p align="center">
  <i>Built with FastAPI · React · TypeScript · PostgreSQL · NATS · kopf · OpenTelemetry</i>
</p>
