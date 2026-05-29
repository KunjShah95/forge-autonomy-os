"""
Chaos Engineering + Reliability Test Suite (ROADMAP Milestone 6).

Tests for:
- Fault injection (latency, error, dependency failure, resource exhaustion, network partition)
- Resilience test CRUD and execution
- Chaos summary endpoint
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


# =====================================================================
# Fault Injection Tests
# =====================================================================

class TestFaultInjection:
    """Tests for fault injection endpoints in backend/app/chaos.py."""

    def test_inject_latency_fault(self):
        """Inject a latency fault into a service."""
        resp = client.post("/api/v1/chaos/faults", json={
            "service": "billing-svc",
            "fault_type": "latency",
            "duration_seconds": 30,
            "intensity": 0.5,
            "target_percentage": 100,
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["service"] == "billing-svc"
        assert data["fault_type"] == "latency"
        assert data["status"] == "active"
        assert "id" in data

    def test_inject_error_fault(self):
        """Inject an error fault into a service."""
        resp = client.post("/api/v1/chaos/faults", json={
            "service": "orders-svc",
            "fault_type": "error",
            "duration_seconds": 60,
            "intensity": 0.8,
            "target_percentage": 50,
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["service"] == "orders-svc"
        assert data["fault_type"] == "error"

    def test_inject_dependency_failure(self):
        """Inject a dependency failure fault."""
        resp = client.post("/api/v1/chaos/faults", json={
            "service": "ledger-svc",
            "fault_type": "dependency_failure",
            "duration_seconds": 45,
            "intensity": 0.6,
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["fault_type"] == "dependency_failure"

    def test_inject_resource_exhaustion(self):
        """Inject a resource exhaustion fault."""
        resp = client.post("/api/v1/chaos/faults", json={
            "service": "search-svc",
            "fault_type": "resource_exhaustion",
            "duration_seconds": 120,
            "intensity": 0.9,
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["fault_type"] == "resource_exhaustion"
        assert data["intensity"] == 0.9

    def test_inject_network_partition(self):
        """Inject a network partition fault."""
        resp = client.post("/api/v1/chaos/faults", json={
            "service": "api-gateway",
            "fault_type": "network_partition",
            "duration_seconds": 30,
            "intensity": 1.0,
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["fault_type"] == "network_partition"

    def test_list_active_faults(self):
        """List active faults returns all injected faults."""
        resp = client.get("/api/v1/chaos/faults")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 5  # We injected 5 faults above

    def test_list_faults_filtered_by_status(self):
        """List faults filtered by status."""
        resp = client.get("/api/v1/chaos/faults?status=active")
        assert resp.status_code == 200
        data = resp.json()
        for f in data:
            assert f["status"] == "active"

    def test_stop_fault(self):
        """Stop an active fault."""
        # First create a fault to stop
        create = client.post("/api/v1/chaos/faults", json={
            "service": "auth-svc",
            "fault_type": "latency",
            "duration_seconds": 10,
            "intensity": 0.3,
        })
        fault_id = create.json()["id"]

        resp = client.post(f"/api/v1/chaos/faults/{fault_id}/stop")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["status"] == "stopped"
        assert data["completed_at"] is not None

    def test_simulate_fault_impact(self):
        """Simulate fault impact returns metrics."""
        # Create a fault first
        create = client.post("/api/v1/chaos/faults", json={
            "service": "billing-svc",
            "fault_type": "latency",
            "duration_seconds": 30,
            "intensity": 0.7,
        })
        fault_id = create.json()["id"]

        resp = client.post(f"/api/v1/chaos/faults/{fault_id}/simulate")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "p99_latency_ms" in data
        assert "error_rate_pct" in data

    def test_simulate_nonexistent_fault(self):
        """Simulate returns 404 for nonexistent fault."""
        resp = client.post("/api/v1/chaos/faults/nonexistent-fault/simulate")
        assert resp.status_code == 404


# =====================================================================
# Resilience Test CRUD Tests
# =====================================================================

class TestResilienceTests:
    """Tests for resilience test endpoints."""

    def test_list_resilience_tests(self):
        """List all resilience tests."""
        resp = client.get("/api/v1/chaos/tests")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 3  # 3 seed tests

    def test_get_specific_test(self):
        """Get a specific resilience test by ID."""
        resp = client.get("/api/v1/chaos/tests/rt-cicd-resilience")
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "CI/CD Pipeline Resilience"
        assert len(data["faults"]) == 2

    def test_get_nonexistent_test(self):
        """Get nonexistent test returns None."""
        resp = client.get("/api/v1/chaos/tests/rt-nonexistent")
        assert resp.status_code == 200
        assert resp.json() is None

    def test_create_resilience_test(self):
        """Create a new resilience test."""
        resp = client.post("/api/v1/chaos/tests", json={
            "name": "Custom Load Test",
            "description": "Custom load test for search service",
            "faults": [
                {"service": "search-svc", "fault_type": "latency", "duration_seconds": 30, "intensity": 0.5}
            ],
            "expected_outcome": "service_resilient",
            "services_affected": ["search-svc"],
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["name"] == "Custom Load Test"
        assert data["status"] == "pending"
        assert data["id"].startswith("rt-")

    def test_run_resilience_test(self):
        """Run an existing resilience test."""
        resp = client.post("/api/v1/chaos/tests/rt-cicd-resilience/run")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["status"] in ["passed", "failed"]
        assert data["completed_at"] is not None
        assert "metrics" in data

    def test_run_nonexistent_test(self):
        """Run returns 404 for nonexistent test."""
        resp = client.post("/api/v1/chaos/tests/rt-nonexistent/run")
        assert resp.status_code == 404


# =====================================================================
# Chaos Summary Tests
# =====================================================================

class TestChaosSummary:
    """Tests for the chaos engineering summary endpoint."""

    def test_chaos_summary(self):
        """Summary returns chaos engineering state overview."""
        resp = client.get("/api/v1/chaos/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert "active_faults" in data
        assert "completed_tests" in data
        assert "services_affected" in data
        assert "overall_resilience_score" in data
        assert isinstance(data["active_faults"], int)
        assert isinstance(data["completed_tests"], int)
        assert 0 <= data["overall_resilience_score"] <= 100
