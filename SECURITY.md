# Security Policy

Forge Autonomy OS is an AI-native production orchestration platform. Because this system can autonomously execute remediations, create PRs, and manage deployments, security is a **first-class concern**.

---

## Supported Versions

The following versions are currently supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 0.x     | :white_check_mark: |

During the pre-1.0 phase, all releases receive security patches. After 1.0, a version support policy will be published.

---

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue in Forge Autonomy OS, please follow these steps:

### 📧 Contact

**Do not open a public GitHub issue.** Instead, send a detailed report to:

```
security@forge-autonomy-os.dev
```

If you do not receive a response within **48 hours**, please follow up via the same channel.

### 🔑 PGP Key (Optional)

If you prefer encrypted communication, our PGP key is available at:

```
https://forge-autonomy-os.dev/.well-known/pgp-key.asc
```

### 📝 What to Include

Provide as much of the following as possible:

- **Type of issue** — e.g., remote code execution, privilege escalation, secret exposure, supply chain risk
- **Affected component** — module, endpoint, or configuration (e.g., `webhooks.py`, `github_client.py`, NATS event bus, K8s operator RBAC)
- **Steps to reproduce** — minimal, reproducible proof of concept
- **Impact** — what an attacker could achieve (autonomous action injection, audit bypass, tenant cross-contamination, etc.)
- **Suggested fix** — if you have one, include a patch or description
- **Your contact** — for follow-up questions

### 🔄 What to Expect

| Timeframe      | Action                                                           |
| -------------- | ---------------------------------------------------------------- |
| **24-48 hrs**  | Acknowledgment of receipt                                        |
| **5 business days** | Initial triage and severity assessment                     |
| **14 calendar days** | Fix released (or mitigation plan communicated)          |
| **Public disclosure** | Coordinated between reporter and maintainers              |

We follow a **90-day responsible disclosure** window from the date of the fix release before public disclosure, unless otherwise agreed.

---

## Security-Relevant Components

Due to the autonomous nature of this project, the following areas require extra security scrutiny:

| Component               | Risk Level | Reason                                                                 |
| ----------------------- | ---------- | ---------------------------------------------------------------------- |
| **Webhook HMAC verification** | 🔴 High    | Weak or absent signature validation allows event forgery               |
| **GitHub API token**         | 🔴 High    | Compromised `GITHUB_TOKEN` grants repository write access              |
| **NATS event bus**           | 🟡 Medium  | Unsecured NATS allows forged events and decision injection             |
| **K8s operator RBAC**        | 🟡 Medium  | Over-permissive ClusterRole could allow cluster-level escalation       |
| **Policy engine**            | 🟡 Medium  | Bypassing policy-as-code gates allows unauthorized auto-execution      |
| **PostgreSQL credentials**   | 🟡 Medium  | Hardcoded DSN or weak password exposes all persisted data              |
| **SQLite file access**       | 🟢 Low     | Local file-based — risk is host-level access only                      |
| **OTel exporter**            | 🟢 Low     | Telemetry exposure risk (no secrets in spans by design)                |

---

## Security Hardening Checklist

For production deployments, ensure the following:

### Mandatory

- [ ] `GITHUB_WEBHOOK_SECRET` is a strong, unique secret (≥ 32 chars, high entropy)
- [ ] `GITHUB_TOKEN` has **minimal scopes** — only `contents:write` and `pull_requests:write` on the target repo
- [ ] NATS server is configured with **TLS + authentication** (not plaintext)
- [ ] PostgreSQL uses **passwordless Entra ID / IAM authentication** where possible
- [ ] K8s `ClusterRole` is scoped to specific API groups and resources (already configured in `operator-deployment.yaml`)
- [ ] Secrets are injected via **K8s Secrets or external vault** (not environment variables in manifests)

### Recommended

- [ ] Enable **audit logging** for all GitHub token actions (GitHub Organization audit log)
- [ ] Set `FORGE_INSTANCE_ID` to a unique, identifiable value per deployment
- [ ] Configure **OTEL_EXPORTER_OTLP_ENDPOINT** to an internal collector (not public endpoint)
- [ ] Set `FORGE_PG_DSN` to use **SSL/TLS** (`?sslmode=require`)
- [ ] Restrict `POST /api/v1/metrics/reset` endpoint to admin role in production
- [ ] Enable **rate limiting** on webhook endpoints

---

## Vulnerability Disclosure History

| Date       | ID            | Component        | Severity | Summary                        | Fixed In       |
| ---------- | ------------- | ---------------- | -------- | ------------------------------ | -------------- |
| —          | —             | —                | —        | No reported vulnerabilities yet | —              |

---

## Security-Related Configuration Reference

| Environment Variable       | Security Role                                      |
| -------------------------- | -------------------------------------------------- |
| `GITHUB_WEBHOOK_SECRET`    | HMAC key for webhook payload verification          |
| `GITHUB_TOKEN`             | Authentication for GitHub API (PR creation, etc.)  |
| `FORGE_NATS_URL`           | NATS connection string (use `nats://user:pass@...` |
| `FORGE_PG_DSN`             | PostgreSQL DSN (use `?sslmode=require` for TLS)    |
| `FORGE_DB_PATH`            | SQLite file path (ensure filesystem permissions)   |
| `FORGE_INSTANCE_ID`        | Instance identifier for audit trail                |

---

## Bug Bounty

We do not currently operate a bug bounty program. Security researchers who report valid vulnerabilities will be acknowledged in the release notes and (with permission) on our security hall of fame page.

---

## Questions

For security-related questions that are **not** vulnerability reports, please open a [GitHub Discussion](https://github.com/your-org/forge-autonomy-os/discussions) with the `security` label.

---

<p align="center">
  <i>Last updated: May 2026</i>
</p>
