"""
Chaos / Reliability test suite (ROADMAP Milestone 6).

Fault injection endpoints for:
- Service latency injection
- Service error injection
- Dependency failure simulation
- Resource exhaustion simulation
- Network partition simulation
- Resilience test orchestration
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException
from datetime import datetime
import uuid
import random

router = APIRouter(prefix="/api/v1/chaos", tags=["Chaos Engineering"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class FaultInjectionRequest(BaseModel):
    """Request to inject a fault into a service."""
    service: str
    fault_type: str  # latency | error | dependency_failure | resource_exhaustion | network_partition
    duration_seconds: int = Field(default=30, ge=1, le=300)
    intensity: float = Field(default=0.5, ge=0.1, le=1.0)  # How severe (0.1–1.0)
    target_percentage: float = Field(default=100, ge=1, le=100)  # % of requests affected
    trace_id: str = ""


class ActiveFault(BaseModel):
    """A currently active fault injection."""
    id: str
    service: str
    fault_type: str
    duration_seconds: int
    intensity: float
    target_percentage: float
    status: str  # active | completed | failed | stopped
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    trace_id: str = ""


class ResilienceTest(BaseModel):
    """A resilience test scenario with expected outcomes."""
    id: str = Field(default_factory=lambda: f"rt-{uuid.uuid4().hex[:8]}")
    name: str
    description: str = ""
    faults: List[FaultInjectionRequest] = Field(default_factory=list)
    expected_outcome: str = ""  # "service_resilient" | "service_degraded" | "service_failed"
    actual_outcome: str = ""
    status: str = "pending"  # pending | running | passed | failed
    services_affected: List[str] = Field(default_factory=list)
    metrics: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None


class ChaosSummary(BaseModel):
    """Summary of chaos engineering state."""
    active_faults: int
    completed_tests: int
    services_affected: List[str]
    overall_resilience_score: float
    last_test_at: Optional[str] = None


# ---------------------------------------------------------------------------
# Simulation helpers
# ---------------------------------------------------------------------------

def _simulate_fault_impact(fault: FaultInjectionRequest) -> Dict[str, Any]:
    """Simulate the impact of a fault injection. Returns realistic metrics."""
    base_latency = random.uniform(50, 200)
    error_rate = random.uniform(0.1, 0.5) * fault.intensity

    impacts = {
        "latency": {
            "error": f"Error simulation: {fault.service} returns {int(fault.intensity * 100)}% error rate",
            "latency": f"Latency simulation: {fault.service} latency increased to {int(base_latency * (1 + fault.intensity))}ms",
            "p99_latency_ms": int(base_latency * (1 + fault.intensity * 3)),
            "p50_latency_ms": int(base_latency * (1 + fault.intensity * 1.5)),
            "error_rate_pct": round(error_rate * 100, 1),
        },
        "error": {
            "error": f"Error injection: {int(fault.target_percentage)}% of requests to {fault.service} return 500",
            "latency": f"Error rate spiking on {fault.service}",
            "p99_latency_ms": int(base_latency * 1.2),
            "p50_latency_ms": int(base_latency),
            "error_rate_pct": round(fault.target_percentage * fault.intensity, 1),
        },
        "dependency_failure": {
            "error": f"Dependency failure: {fault.service} cannot reach upstream dependencies",
            "latency": f"Cascading timeouts from {fault.service}",
            "p99_latency_ms": int(base_latency * (1 + fault.intensity * 5)),
            "p50_latency_ms": int(base_latency * (1 + fault.intensity * 2)),
            "error_rate_pct": round(min(fault.target_percentage * 0.8, 100), 1),
        },
        "resource_exhaustion": {
            "error": f"Resource exhaustion: {fault.service} CPU at {int(80 + fault.intensity * 19)}%",
            "latency": f"Resource contention on {fault.service}",
            "p99_latency_ms": int(base_latency * (1 + fault.intensity * 4)),
            "p50_latency_ms": int(base_latency * (1 + fault.intensity * 2)),
            "error_rate_pct": round(random.uniform(5, 30) * fault.intensity, 1),
        },
        "network_partition": {
            "error": f"Network partition: {fault.service} isolated from cluster",
            "latency": f"Connection timeouts to {fault.service}",
            "p99_latency_ms": 30000,  # 30s timeout
            "p50_latency_ms": 15000,  # 15s timeout
            "error_rate_pct": round(fault.target_percentage * 0.9, 1),
        },
    }

    return impacts.get(fault.fault_type, impacts["latency"])


# ---------------------------------------------------------------------------
# In-memory stores
# ---------------------------------------------------------------------------

_active_faults: Dict[str, ActiveFault] = {}
_resilience_tests: Dict[str, ResilienceTest] = {}

# Seed default resilience test scenarios
SEED_TESTS = [
    ResilienceTest(
        id="rt-cicd-resilience",
        name="CI/CD Pipeline Resilience",
        description="Verify CI/CD pipeline recovers gracefully from transient dependency failures",
        faults=[
            FaultInjectionRequest(service="github-actions", fault_type="dependency_failure", duration_seconds=30, intensity=0.3),
            FaultInjectionRequest(service="docker-registry", fault_type="latency", duration_seconds=60, intensity=0.5),
        ],
        expected_outcome="service_resilient",
        status="passed",
        services_affected=["github-actions", "docker-registry"],
        metrics={"recovery_time_seconds": 28, "retry_success_rate": 97},
    ),
    ResilienceTest(
        id="rt-billing-fault",
        name="Billing Service Fault Tolerance",
        description="Ensure billing service fails gracefully when downstream ledger is unavailable",
        faults=[
            FaultInjectionRequest(service="ledger-svc", fault_type="dependency_failure", duration_seconds=45, intensity=0.8),
        ],
        expected_outcome="service_degraded",
        status="passed",
        services_affected=["ledger-svc", "billing-svc"],
        metrics={"recovery_time_seconds": 42, "degradation_percentage": 65},
    ),
    ResilienceTest(
        id="rt-search-load",
        name="Search Service Load Test",
        description="Validate search service maintains p99 under 2s during resource exhaustion",
        faults=[
            FaultInjectionRequest(service="search-svc", fault_type="resource_exhaustion", duration_seconds=120, intensity=0.6),
        ],
        expected_outcome="service_resilient",
        status="failed",
        services_affected=["search-svc"],
        metrics={"max_p99_latency_ms": 3400, "error_rate_peak": 23},
    ),
]

for test in SEED_TESTS:
    _resilience_tests[test.id] = test


# ---------------------------------------------------------------------------
# Routes — Fault Injection
# ---------------------------------------------------------------------------

@router.post("/faults", response_model=ActiveFault)
def inject_fault(req: FaultInjectionRequest):
    """Inject a fault into a service."""
    fault = ActiveFault(
        id=f"fault-{uuid.uuid4().hex[:8]}",
        service=req.service,
        fault_type=req.fault_type,
        duration_seconds=req.duration_seconds,
        intensity=req.intensity,
        target_percentage=req.target_percentage,
        status="active",
        trace_id=req.trace_id or f"chaos-{uuid.uuid4().hex[:8]}",
    )
    _active_faults[fault.id] = fault
    return fault


@router.get("/faults", response_model=List[ActiveFault])
def list_active_faults(status: Optional[str] = None):
    """List all active faults, optionally filtered by status."""
    faults = list(_active_faults.values())
    if status:
        faults = [f for f in faults if f.status == status]
    return faults


@router.post("/faults/{fault_id}/stop", response_model=ActiveFault)
def stop_fault(fault_id: str):
    """Stop an active fault injection."""
    fault = _active_faults.get(fault_id)
    if not fault:
        raise HTTPException(status_code=404, detail="Fault not found")
    fault.status = "stopped"
    fault.completed_at = datetime.utcnow()
    _active_faults[fault_id] = fault
    return fault


@router.post("/faults/{fault_id}/simulate", response_model=Dict[str, Any])
def simulate_fault_impact(fault_id: str):
    """Simulate and return impact metrics for an active fault."""
    fault = _active_faults.get(fault_id)
    if not fault:
        raise HTTPException(status_code=404, detail="Fault not found")
    # Convert ActiveFault back to FaultInjectionRequest for simulation
    req = FaultInjectionRequest(
        service=fault.service,
        fault_type=fault.fault_type,
        duration_seconds=fault.duration_seconds,
        intensity=fault.intensity,
        target_percentage=fault.target_percentage,
        trace_id=fault.trace_id,
    )
    return _simulate_fault_impact(req)


# ---------------------------------------------------------------------------
# Routes — Resilience Tests
# ---------------------------------------------------------------------------

@router.post("/tests", response_model=ResilienceTest)
def create_resilience_test(test: ResilienceTest):
    """Create a new resilience test scenario."""
    _resilience_tests[test.id] = test
    return test


@router.get("/tests", response_model=List[ResilienceTest])
def list_resilience_tests(status: Optional[str] = None):
    """List all resilience tests."""
    tests = list(_resilience_tests.values())
    if status:
        tests = [t for t in tests if t.status == status]
    return sorted(tests, key=lambda t: t.created_at, reverse=True)


@router.get("/tests/{test_id}", response_model=Optional[ResilienceTest])
def get_resilience_test(test_id: str):
    """Get a specific resilience test."""
    return _resilience_tests.get(test_id)


@router.post("/tests/{test_id}/run", response_model=ResilienceTest)
def run_resilience_test(test_id: str):
    """Execute a resilience test (simulated)."""
    test = _resilience_tests.get(test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Resilience test not found")

    test.status = "running"
    _resilience_tests[test_id] = test

    # Simulate test execution with random outcome
    success = random.random() > 0.3
    test.status = "passed" if success else "failed"
    test.actual_outcome = test.expected_outcome if success else "service_failed"
    test.completed_at = datetime.utcnow()
    test.metrics = {
        "recovery_time_seconds": random.randint(15, 120),
        "retry_success_rate": round(random.uniform(80, 99), 1),
        "max_p99_latency_ms": random.randint(500, 5000),
        "error_rate_peak": round(random.uniform(5, 40), 1),
    }
    _resilience_tests[test_id] = test
    return test


# ---------------------------------------------------------------------------
# Routes — Summary
# ---------------------------------------------------------------------------

@router.get("/summary", response_model=ChaosSummary)
def get_chaos_summary():
    """Get a summary of the chaos engineering state."""
    active = [f for f in _active_faults.values() if f.status == "active"]
    tests = list(_resilience_tests.values())
    services = set()
    for test in tests:
        for s in test.services_affected:
            services.add(s)
    for fault in _active_faults.values():
        services.add(fault.service)

    passed_tests = [t for t in tests if t.status == "passed"]
    resilience_score = round(
        (len(passed_tests) / max(len(tests), 1)) * 100, 1
    )

    last_test = max(tests, key=lambda t: t.created_at) if tests else None

    return ChaosSummary(
        active_faults=len(active),
        completed_tests=len(tests),
        services_affected=sorted(services),
        overall_resilience_score=resilience_score,
        last_test_at=last_test.completed_at.isoformat() if last_test and last_test.completed_at else None,
    )
