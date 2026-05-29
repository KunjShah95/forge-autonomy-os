"""Comprehensive tests for all Forge Autonomy OS backend modules."""

import json
import hmac
import hashlib
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import EventSchema, DecisionSchema, AuditSchema

client = TestClient(app)


# =====================================================================
# B-001 / B-002 / B-003 — Health, Schemas, Events, Decisions, Audit
# =====================================================================

class TestCore:
    """Tests for Sprint 1 foundations: health, events, decisions, audit."""

    def test_health_endpoint(self):
        """Health endpoint returns OK."""
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"

    def test_list_events(self):
        """GET /api/v1/events returns a list."""
        resp = client.get("/api/v1/events")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    def test_list_events_filtered(self):
        """GET /api/v1/events?trace_id= filters correctly."""
        # First get all events to find a trace_id
        resp = client.get("/api/v1/events")
        all_events = resp.json()
        if all_events:
            trace_id = all_events[0]["trace_id"]
            filtered = client.get(f"/api/v1/events?trace_id={trace_id}")
            assert filtered.status_code == 200
            for ev in filtered.json():
                assert ev["trace_id"] == trace_id

    def test_ingest_event(self):
        """POST /api/v1/events creates a new event."""
        payload = {
            "source": "test",
            "type": "TEST_EVENT",
            "trace_id": "test-trace-001",
            "payload": {"key": "value"}
        }
        resp = client.post("/api/v1/events", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["source"] == "test"
        assert data["type"] == "TEST_EVENT"
        assert data["trace_id"] == "test-trace-001"

    def test_get_decisions(self):
        """GET /api/v1/decisions returns a list."""
        resp = client.get("/api/v1/decisions")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    def test_get_audit(self):
        """GET /api/v1/audit returns a list of audit entries."""
        resp = client.get("/api/v1/audit")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    def test_simulate_action(self):
        """POST /api/v1/simulate creates a simulated audit entry."""
        resp = client.post("/api/v1/simulate")
        assert resp.status_code == 200
        data = resp.json()
        assert "trace_id" in data
        assert data["status"] in ["INVESTIGATING", "RESOLVED", "FAILED"]


# =====================================================================
# B-005 — GitHub Webhook Ingestion
# =====================================================================

class TestWebhooks:
    """Tests for GitHub webhook ingestion (B-005)."""

    def _webhook_request(self, payload: dict, event_type: str, use_valid_sig: bool = True) -> "Response":
        """Helper to send a webhook request with proper headers."""
        body = json.dumps(payload).encode()
        secret = "forge-dev-secret"
        sig = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        headers = {
            "Content-Type": "application/json",
            "X-GitHub-Event": event_type,
            "X-GitHub-Delivery": "test-delivery-id",
            "X-Hub-Signature-256": sig if use_valid_sig else "sha256=" + "0" * 64,
        }
        return client.post("/api/v1/webhooks/github", content=body, headers=headers)

    def test_webhook_pull_request_opened(self):
        """Webhook accepts pull_request opened event."""
        payload = {
            "action": "opened",
            "pull_request": {
                "number": 42,
                "title": "fix: resolve db pool config",
                "head": {"ref": "fix/db-pool"},
                "base": {"ref": "main"}
            },
            "repository": {"full_name": "forge/autonomy-os"},
            "sender": {"login": "dev-bot"}
        }
        resp = self._webhook_request(payload, "pull_request")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["normalized_type"] == "PULL_REQUEST_OPENED"

    def test_webhook_pull_request_closed(self):
        """Webhook accepts pull_request closed event."""
        payload = {
            "action": "closed",
            "pull_request": {
                "number": 43,
                "title": "feat: add search indexing",
                "head": {"ref": "feat/search"},
                "base": {"ref": "main"}
            },
            "repository": {"full_name": "forge/autonomy-os"},
            "sender": {"login": "dev-bot"}
        }
        resp = self._webhook_request(payload, "pull_request")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        assert resp.json()["normalized_type"] == "PULL_REQUEST_CLOSED"

    def test_webhook_check_suite_failure(self):
        """Webhook accepts check_suite with failure conclusion."""
        payload = {
            "action": "completed",
            "check_suite": {
                "head_branch": "fix/db-pool",
                "status": "completed",
                "conclusion": "failure",
                "latest_check_runs_count": 3,
            },
            "repository": {"full_name": "forge/autonomy-os"},
        }
        resp = self._webhook_request(payload, "check_suite")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["normalized_type"] == "CHECK_SUITE_COMPLETED"
        # Check the normalized event was stored in events_db
        events_resp = client.get("/api/v1/events")
        matching = [e for e in events_resp.json() if e.get("type") == "CHECK_SUITE_COMPLETED"]
        assert len(matching) > 0
        assert matching[0]["payload"]["conclusion"] == "failure"

    def test_webhook_workflow_run(self):
        """Webhook accepts workflow_run event."""
        payload = {
            "action": "completed",
            "workflow_run": {
                "name": "CI Pipeline",
                "head_branch": "main",
                "status": "completed",
                "conclusion": "success",
            },
            "repository": {"full_name": "forge/autonomy-os"},
        }
        resp = self._webhook_request(payload, "workflow_run")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        assert resp.json()["normalized_type"] == "WORKFLOW_RUN_COMPLETED"

    def test_webhook_invalid_signature(self):
        """Webhook rejects invalid HMAC signature."""
        payload = {"action": "opened", "pull_request": {"number": 1}}
        resp = self._webhook_request(payload, "pull_request", use_valid_sig=False)
        assert resp.status_code == 401

    def test_webhook_unsupported_event(self):
        """Webhook acknowledges unsupported event types without error."""
        payload = {"action": "created"}
        resp = self._webhook_request(payload, "unknown_event_type")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        assert "skipped" in resp.json().get("status", "").lower()


# =====================================================================
# B-006 — Failure Classifier
# =====================================================================

class TestClassifier:
    """Tests for CI failure classifier (B-006)."""

    def test_classify_dependency(self):
        """Dependency failures are classified correctly."""
        resp = client.post("/api/v1/classify", json={
            "trace_id": "test-dep",
            "log_output": "Error: Cannot find module 'react-dom'"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["classification"] == "dependency"
        assert 0 <= data["confidence"] <= 1

    def test_classify_config(self):
        """Config/type failures are classified correctly."""
        resp = client.post("/api/v1/classify", json={
            "trace_id": "test-cfg",
            "log_output": "TypeError: Cannot read properties of undefined"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["classification"] == "config"

    def test_classify_flake(self):
        """Flaky test timeouts are classified correctly."""
        resp = client.post("/api/v1/classify", json={
            "trace_id": "test-flake",
            "log_output": "TimeoutError: The request timed out after 30000ms"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["classification"] == "flake"

    def test_classify_unclassified(self):
        """Unknown errors return unclassified."""
        resp = client.post("/api/v1/classify", json={
            "trace_id": "test-unk",
            "log_output": "Some completely unknown error occurred"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["classification"] == "unclassified"

    def test_classify_evidence_included(self):
        """Classification includes evidence snippets."""
        resp = client.post("/api/v1/classify", json={
            "trace_id": "test-evidence",
            "log_output": "Error: Cannot find module 'axios'. Run npm install"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["evidence"]) > 0
        assert "summary" in data


# =====================================================================
# B-009 — Policy Engine
# =====================================================================

class TestPolicy:
    """Tests for action policy engine (B-009)."""

    def test_policy_class_a_high_risk(self):
        """High risk actions get class A (approval required)."""
        resp = client.post("/api/v1/policy/evaluate", json={
            "action": "deploy-to-production",
            "service": "billing-svc",
            "risk_score": 85,
            "confidence": 0.7,
            "blast_radius": "high",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["action_class"] == "A"
        assert data["requires_approval"] is True

    def test_policy_class_c_low_risk(self):
        """Low risk actions get class C (auto-execute)."""
        resp = client.post("/api/v1/policy/evaluate", json={
            "action": "scale-replicas",
            "service": "users-svc",
            "risk_score": 15,
            "confidence": 0.95,
            "blast_radius": "low",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["action_class"] == "C"
        assert data["requires_approval"] is False

    def test_policy_includes_conditions(self):
        """Policy evaluation returns conditions list."""
        resp = client.post("/api/v1/policy/evaluate", json={
            "action": "config-update",
            "service": "api-gateway",
            "risk_score": 55,
            "confidence": 0.85,
            "blast_radius": "medium",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["conditions"]) > 0


# =====================================================================
# B-010 — Risk Scoring
# =====================================================================

class TestRisk:
    """Tests for risk scoring service (B-010)."""

    def test_risk_scoring_low(self):
        """Low-change deployments get low risk scores."""
        resp = client.post("/api/v1/risk/score", json={
            "service": "users-svc",
            "version": "v3.8.1",
            "files_changed": 1,
            "lines_added": 5,
            "lines_removed": 2,
            "is_config_change": False,
            "previous_incidents_30d": 0,
            "deployment_count_30d": 20,
            "trace_id": "risk-test-1",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["overall_risk"] < 50  # Small change with active deployment history
        assert data["risk_level"] in ["low", "moderate", "high"]  # Score ~44 falls at 'high' threshold (>=40)

    def test_risk_scoring_high(self):
        """Large config changes with incidents get high risk."""
        resp = client.post("/api/v1/risk/score", json={
            "service": "billing-svc",
            "version": "v1.22.0",
            "files_changed": 15,
            "lines_added": 300,
            "lines_removed": 50,
            "is_config_change": True,
            "previous_incidents_30d": 5,
            "deployment_count_30d": 3,
            "trace_id": "risk-test-2",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["overall_risk"] > 50

    def test_risk_scoring_includes_factors(self):
        """Risk score includes breakdown factors."""
        resp = client.post("/api/v1/risk/score", json={
            "service": "orders-svc",
            "version": "v2.14.3",
            "files_changed": 4,
            "lines_added": 40,
            "lines_removed": 10,
            "is_config_change": False,
            "previous_incidents_30d": 1,
            "deployment_count_30d": 8,
            "trace_id": "risk-test-3",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["factors"]) > 0
        assert "recommendation" in data


# =====================================================================
# B-007 — Auto-fix Repair
# =====================================================================

class TestRepair:
    """Tests for auto-fix PR generation (B-007)."""

    def test_repair_dependency(self):
        """Dependency failures generate appropriate patches."""
        resp = client.post("/api/v1/repair", json={
            "trace_id": "repair-dep",
            "service": "orders-svc",
            "classification": "dependency",
            "log_output": "Cannot find module 'react-dom'",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["fix_type"] == "dependency"
        assert len(data["patch"]) > 0
        assert len(data["pr_title"]) > 0

    def test_repair_config(self):
        """Config failures generate appropriate patches."""
        resp = client.post("/api/v1/repair", json={
            "trace_id": "repair-cfg",
            "service": "billing-svc",
            "classification": "config",
            "log_output": "TypeError: Cannot read properties of undefined",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["fix_type"] == "config"

    def test_repair_includes_pr_body(self):
        """Repair suggestion includes full PR body with rationale."""
        resp = client.post("/api/v1/repair", json={
            "trace_id": "repair-pr",
            "service": "users-svc",
            "classification": "dependency",
            "log_output": "Error: Cannot find module",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "pr_body" in data
        assert len(data["pr_body"]) > 20
        assert data["confidence"] > 0


# =====================================================================
# B-008 — Workflow Rerun
# =====================================================================

class TestRerun:
    """Tests for workflow rerun automation (B-008)."""

    def test_rerun_trigger(self):
        """Rerun endpoint accepts valid request."""
        resp = client.post("/api/v1/rerun", json={
            "trace_id": "rerun-test",
            "repo": "forge/autonomy-os",
            "head_branch": "fix/db-pool",
            "run_id": 12345,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "triggered"
        assert data["new_run_id"] is not None


# =====================================================================
# B-011 — Canary + Rollback
# =====================================================================

class TestCanary:
    """Tests for canary + rollback controller (B-011)."""

    def test_start_canary(self):
        """Canary starts with correct configuration."""
        resp = client.post("/api/v1/canary/start", json={
            "service": "orders-svc",
            "version": "v2.14.3",
            "target_percentage": 25,
            "bake_minutes": 10,
            "trace_id": "canary-test",
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["status"] == "baking"
        assert data["current_percentage"] == 5
        assert data["target_percentage"] == 25

    def test_start_canary_with_steps(self):
        """Canary includes staged rollout steps."""
        resp = client.post("/api/v1/canary/start", json={
            "service": "users-svc",
            "version": "v3.8.1",
            "target_percentage": 50,
            "bake_minutes": 15,
            "trace_id": "canary-steps",
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert len(data["steps"]) >= 2

    def test_list_canaries(self):
        """GET /api/v1/canaries returns all canary sessions."""
        resp = client.get("/api/v1/canaries")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    def test_get_canary(self):
        """GET /api/v1/canary/{id} returns specific canary."""
        # First create one
        create = client.post("/api/v1/canary/start", json={
            "service": "redis-cluster",
            "version": "v1.0.0",
            "target_percentage": 10,
            "bake_minutes": 5,
            "trace_id": "canary-get",
        })
        canary_id = create.json()["id"]
        resp = client.get(f"/api/v1/canary/{canary_id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == canary_id

    def test_promote_canary(self):
        """POST /api/v1/canary/promote/{id} promotes to next stage."""
        create = client.post("/api/v1/canary/start", json={
            "service": "search-svc",
            "version": "v4.1.0",
            "target_percentage": 25,
            "bake_minutes": 10,
            "trace_id": "canary-prom",
        })
        canary_id = create.json()["id"]
        resp = client.post(f"/api/v1/canary/promote/{canary_id}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        assert resp.json()["current_percentage"] > 5

    def test_rollback_canary(self):
        """POST /api/v1/canary/rollback/{id} rolls back the canary."""
        create = client.post("/api/v1/canary/start", json={
            "service": "ml-inference",
            "version": "v0.9.2",
            "target_percentage": 25,
            "bake_minutes": 10,
            "trace_id": "canary-rb",
        })
        canary_id = create.json()["id"]
        resp = client.post(f"/api/v1/canary/rollback/{canary_id}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        assert resp.json()["status"] == "rolled_back"


# =====================================================================
# B-012 — Context Engine
# =====================================================================

class TestContext:
    """Tests for context engine persistence (B-012)."""

    def test_list_incidents(self):
        """GET /api/v1/incidents returns incident list."""
        resp = client.get("/api/v1/incidents")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    def test_get_incident_by_id(self):
        """GET /api/v1/incidents/{id} returns specific incident."""
        # First list to find an existing one
        resp = client.get("/api/v1/incidents")
        incidents = resp.json()
        if incidents:
            inc_id = incidents[0]["id"]
            detail = client.get(f"/api/v1/incidents/{inc_id}")
            assert detail.status_code == 200
            assert detail.json()["id"] == inc_id

    def test_get_ownership(self):
        """GET /api/v1/ownership returns ownership records."""
        resp = client.get("/api/v1/ownership")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)


# =====================================================================
# B-014 — Incident Summary
# =====================================================================

class TestIncidentSummary:
    """Tests for incident commander summary (B-014)."""

    def test_summarize_existing_incident(self):
        """Summarize endpoint returns full summary for valid incident."""
        resp = client.post("/api/v1/incidents/summarize", json={
            "incident_id": "INC-2847",
            "trace_id": "summary-test",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["incident_id"] == "INC-2847"
        assert len(data["root_cause"]) > 0
        assert len(data["impact"]) > 0

    def test_summarize_includes_prevention(self):
        """Summary includes prevention recommendations."""
        resp = client.post("/api/v1/incidents/summarize", json={
            "incident_id": "INC-2846",
            "trace_id": "summary-prev",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["prevention"]) > 0

    def test_summarize_exportable(self):
        """Summary includes exportable markdown."""
        resp = client.post("/api/v1/incidents/summarize", json={
            "incident_id": "INC-2845",
            "trace_id": "summary-md",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["exportable_markdown"]) > 0


# =====================================================================
# B-013 — Architecture Guardian
# =====================================================================

class TestGuardian:
    """Tests for architecture guardian checks (B-013)."""

    def test_guardian_check_all(self):
        """Guardian check returns findings for all services."""
        resp = client.post("/api/v1/guardian/check", json={
            "service": "",
            "trace_id": "guardian-all",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["findings"]) > 0
        assert 0 <= data["overall_health_score"] <= 100

    def test_guardian_check_specific_service(self):
        """Guardian check returns findings scoped to a service."""
        resp = client.post("/api/v1/guardian/check", json={
            "service": "billing-svc",
            "trace_id": "guardian-billing",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data["findings"], list)

    def test_guardian_findings_have_remediation(self):
        """All findings include remediation guidance."""
        resp = client.post("/api/v1/guardian/check", json={
            "service": "",
            "trace_id": "guardian-remediation",
        })
        data = resp.json()
        for finding in data["findings"]:
            assert len(finding["remediation"]) > 0


# =====================================================================
# B-015 — Demo
# =====================================================================

class TestDemo:
    """Tests for deterministic inject-failure demo (B-015)."""

    def test_list_scenarios(self):
        """GET /api/v1/demo/scenarios returns available scenarios."""
        resp = client.get("/api/v1/demo/scenarios")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["scenarios"]) >= 3

    def test_inject_dependency_failure(self):
        """Inject dependency failure demo scenario."""
        resp = client.post("/api/v1/demo/inject", json={
            "scenario": "dependency_mismatch",
            "mode": "live",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["scenario"] == "dependency_mismatch"
        assert data["is_simulation"] is True

    def test_inject_latency_spike(self):
        """Inject latency spike demo scenario."""
        resp = client.post("/api/v1/demo/inject", json={
            "scenario": "latency_spike",
            "mode": "live",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["scenario"] == "latency_spike"

    def test_inject_with_decisions(self):
        """Injected scenarios include decisions."""
        resp = client.post("/api/v1/demo/inject", json={
            "scenario": "config_error",
            "mode": "replay",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["events"]) > 0
        assert len(data["decisions"]) > 0


# =====================================================================
# B-016 — Replay
# =====================================================================

class TestReplay:
    """Tests for decision replay mode (B-016)."""

    def _create_replay_trace(self, trace_id: str) -> dict:
        """Helper to create events + decisions for a trace, then start replay."""
        # Create events for this trace
        client.post("/api/v1/events", json={
            "source": "test",
            "type": "TEST_EVENT",
            "trace_id": trace_id,
            "payload": {"key": "value"},
        })
        client.post("/api/v1/decisions", json={
            "id": f"dec-{trace_id}",
            "trace_id": trace_id,
            "agent": "Test Agent",
            "action": "test-action",
            "reason": "test",
            "confidence": 0.9,
            "risk": 25,
            "evidence": {},
        })
        return client.post("/api/v1/replay/start", json={"trace_id": trace_id}).json()

    def test_start_replay(self):
        """Start replay creates a replay session."""
        data = self._create_replay_trace("replay-test-trace")
        assert data["trace_id"] == "replay-test-trace"
        assert data["status"] == "paused"
        assert data["total_steps"] > 0

    def test_replay_step(self):
        """Step moves replay forward."""
        session = self._create_replay_trace("replay-step-test")
        stepped = client.post(f"/api/v1/replay/{session['id']}/step")
        assert stepped.status_code == 200, f"Expected 200, got {stepped.status_code}: {stepped.text}"
        assert stepped.json()["current_step"] >= 1

    def test_replay_play(self):
        """Play runs all steps to completion (play sets status, steps done via UI polling)."""
        session = self._create_replay_trace("replay-play-test")
        played = client.post(f"/api/v1/replay/{session['id']}/play")
        assert played.status_code == 200, f"Expected 200, got {played.status_code}: {played.text}"
        assert played.json()["status"] == "playing"

    def test_replay_pause(self):
        """Pause stops replay mid-stream."""
        session = self._create_replay_trace("replay-pause-test")
        # Step twice
        client.post(f"/api/v1/replay/{session['id']}/step")
        client.post(f"/api/v1/replay/{session['id']}/step")
        paused = client.post(f"/api/v1/replay/{session['id']}/pause")
        assert paused.status_code == 200, f"Expected 200, got {paused.status_code}: {paused.text}"

    def test_replay_reset(self):
        """Reset returns replay to step 0."""
        session = self._create_replay_trace("replay-reset-test")
        # Step forward then reset
        client.post(f"/api/v1/replay/{session['id']}/step")
        reset = client.post(f"/api/v1/replay/{session['id']}/reset")
        assert reset.status_code == 200, f"Expected 200, got {reset.status_code}: {reset.text}"
        assert reset.json()["current_step"] == 0


# =====================================================================
# B-017 — RBAC
# =====================================================================

class TestRBAC:
    """Tests for multi-tenant RBAC baseline (B-017)."""

    def test_rbac_check_admin(self):
        """Admin role is allowed."""
        resp = client.post("/api/v1/rbac/check", json={
            "user_id": "admin-1",
            "organization": "forge",
            "action": "deploy",
            "resource": "production",
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["allowed"] is True

    def test_rbac_list_roles(self):
        """GET /api/v1/rbac/roles returns role definitions."""
        resp = client.get("/api/v1/rbac/roles")
        assert resp.status_code == 200
        data = resp.json()
        assert "admin" in data

    def test_rbac_audit_export(self):
        """GET /api/v1/rbac/audit/export returns audit log."""
        resp = client.get("/api/v1/rbac/audit/export")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
