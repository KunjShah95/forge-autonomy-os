"""
Deterministic inject-failure demo control (B-015).

One-click trigger for known failure scenarios during demonstrations.
Supports live mode and replay mode with clear simulation markers.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter
from datetime import datetime, timedelta
import uuid

from .schemas import EventSchema, DecisionSchema, AuditSchema
from .api import events_db, decisions_db, audit_db
from .classifier import classify_failure

router = APIRouter(prefix="/api/v1", tags=["Demo"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class InjectFailureRequest(BaseModel):
    scenario: str = "dependency_mismatch"  # dependency_mismatch | config_error | flaky_test | latency_spike
    mode: str = "live"  # live | replay

class InjectedScenario(BaseModel):
    id: str
    scenario: str
    mode: str
    trace_id: str
    description: str
    events: List[EventSchema] = Field(default_factory=list)
    decisions: List[DecisionSchema] = Field(default_factory=list)
    audit: Optional[AuditSchema] = None
    is_simulation: bool = True
    injected_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Scenario definitions
# ---------------------------------------------------------------------------

SCENARIOS = {
    "dependency_mismatch": {
        "description": "A PR introduces a new dependency that doesn't resolve in CI. The system detects the failure, classifies it as a dependency issue, generates a fix PR, and re-runs CI.",
        "event_type": "PULL_REQUEST_OPENED",
        "ci_conclusion": "failure",
        "failure_log": "npm ERR! 404 'some-new-package@^2.0.0' is not in the npm registry\nModuleNotFoundError: No module named 'some-new-package'",
    },
    "config_error": {
        "description": "A config change in a PR causes a type error during build. The system classifies it as a config issue and suggests a defensive fix.",
        "event_type": "PULL_REQUEST_OPENED",
        "ci_conclusion": "failure",
        "failure_log": "TypeError: Cannot read properties of undefined (reading 'pool')\n    at src/db/connection.ts:42",
    },
    "flaky_test": {
        "description": "A CI pipeline fails due to a timeout in integration tests. The system classifies it as a flaky test and suggests adding retry logic.",
        "event_type": "CHECK_SUITE_COMPLETED",
        "ci_conclusion": "failure",
        "failure_log": "TimeoutError: Test timed out after 30000ms\n    at test/integration/api.test.ts:87\nThis is a known flaky test that fails intermittently.",
    },
    "latency_spike": {
        "description": "A production latency spike is detected by monitoring. The SRE agent diagnoses the issue and triggers an auto-rollback.",
        "event_type": "METRIC_LATENCY_SPIKE",
        "ci_conclusion": "",
        "failure_log": "p99 latency: 940ms (threshold 250ms) on billing-svc",
    },
}


# ---------------------------------------------------------------------------
# Injector
# ---------------------------------------------------------------------------

def _inject_scenario(scenario_name: str, mode: str) -> InjectedScenario:
    """Inject a deterministic failure scenario into the system."""
    scenario = SCENARIOS.get(scenario_name, SCENARIOS["dependency_mismatch"])
    trace_id = f"demo-{scenario_name}-{uuid.uuid4().hex[:8]}"
    now = datetime.utcnow()

    # Create event
    if scenario_name == "dependency_mismatch":
        event = EventSchema(
            source="github",
            type="PULL_REQUEST_OPENED",
            timestamp=now - timedelta(seconds=30),
            trace_id=trace_id,
            payload={
                "pr_number": 9999,
                "title": "feat: integrate some-new-package for caching",
                "repo": "forge/autonomy-os",
                "user": "demo-bot",
                "head_branch": "demo/feature-cache",
                "base_branch": "main",
                "state": "open",
                "draft": False,
            }
        )
        ci_event = EventSchema(
            source="github",
            type="CHECK_SUITE_COMPLETED",
            timestamp=now,
            trace_id=trace_id,
            payload={
                "head_branch": "demo/feature-cache",
                "head_sha": "abc123demo",
                "status": "completed",
                "conclusion": "failure",
                "latest_check_runs_count": 1,
                "repo": "forge/autonomy-os",
            }
        )
        # Classify
        classification = classify_failure(trace_id, scenario["failure_log"])
        decision = DecisionSchema(
            id=f"dec-demo-{uuid.uuid4().hex[:8]}",
            trace_id=trace_id,
            agent="QA Agent",
            action="Auto-fix: Resolve missing dependency in PR #9999",
            reason=f"CI failure classified as {classification.classification} (conf {classification.confidence}). {classification.summary}",
            confidence=classification.confidence,
            risk=35,
            evidence={
                "classification": classification.classification,
                "evidence": classification.evidence,
                "log_snippet": scenario["failure_log"][:200],
            },
            timestamp=now + timedelta(seconds=2),
        )

    elif scenario_name == "config_error":
        event = EventSchema(
            source="github",
            type="PULL_REQUEST_OPENED",
            timestamp=now - timedelta(seconds=30),
            trace_id=trace_id,
            payload={
                "pr_number": 9998,
                "title": "refactor: update connection pool config",
                "repo": "forge/autonomy-os",
                "user": "demo-bot",
                "head_branch": "demo/refactor-pool",
                "base_branch": "main",
            }
        )
        ci_event = EventSchema(
            source="github",
            type="CHECK_SUITE_COMPLETED",
            timestamp=now,
            trace_id=trace_id,
            payload={
                "conclusion": "failure",
                "status": "completed",
                "head_branch": "demo/refactor-pool",
                "repo": "forge/autonomy-os",
            }
        )
        classification = classify_failure(trace_id, scenario["failure_log"])
        decision = DecisionSchema(
            id=f"dec-demo-{uuid.uuid4().hex[:8]}",
            trace_id=trace_id,
            agent="QA Agent",
            action="Fix: Add defensive config access in connection.ts",
            reason=f"Config error detected: {classification.summary}",
            confidence=classification.confidence,
            risk=42,
            evidence={"classification": classification.classification, "evidence": classification.evidence},
            timestamp=now + timedelta(seconds=2),
        )

    elif scenario_name == "latency_spike":
        event = EventSchema(
            source="prometheus",
            type="METRIC_LATENCY_SPIKE",
            timestamp=now,
            trace_id=trace_id,
            payload={
                "metric": "p99_latency",
                "value": "940ms",
                "threshold": "250ms",
                "service": "billing-svc",
                "environment": "production",
            }
        )
        ci_event = None
        classification = classify_failure(trace_id, scenario["failure_log"])
        decision = DecisionSchema(
            id=f"dec-demo-{uuid.uuid4().hex[:8]}",
            trace_id=trace_id,
            agent="SRE Agent",
            action="Auto-rollback of billing-svc to previous stable version",
            reason=f"p99 latency spike detected (940ms vs 250ms threshold). Auto-rollback triggered.",
            confidence=0.94,
            risk=78,
            evidence={"p99": "940ms", "threshold": "250ms", "classification": classification.classification},
            timestamp=now + timedelta(seconds=3),
        )

    else:  # flaky_test
        event = EventSchema(
            source="github",
            type="CHECK_SUITE_COMPLETED",
            timestamp=now,
            trace_id=trace_id,
            payload={
                "conclusion": "failure",
                "status": "completed",
                "head_branch": "main",
                "repo": "forge/autonomy-os",
                "head_sha": "abc123flk",
                "latest_check_runs_count": 3,
            }
        )
        ci_event = None
        classification = classify_failure(trace_id, scenario["failure_log"])
        decision = DecisionSchema(
            id=f"dec-demo-{uuid.uuid4().hex[:8]}",
            trace_id=trace_id,
            agent="QA Agent",
            action="Suggest: Stabilize flaky integration test with retry assertion",
            reason=f"Flaky test detected: {classification.summary}",
            confidence=classification.confidence,
            risk=15,
            evidence={"classification": classification.classification, "evidence": classification.evidence},
            timestamp=now + timedelta(seconds=2),
        )

    # Persist
    injected_events = [event]
    if ci_event:
        injected_events.append(ci_event)
    events_db.extend(injected_events)
    decisions_db.append(decision)

    audit = AuditSchema(
        trace_id=trace_id,
        events=injected_events,
        decisions=[decision],
        status="INVESTIGATING",
        outcome=f"Demo scenario '{scenario_name}' injected. {len(injected_events)} events, 1 decision recorded.",
        timestamp=now + timedelta(seconds=5),
    )
    audit_db[trace_id] = audit

    return InjectedScenario(
        id=f"scenario-{uuid.uuid4().hex[:8]}",
        scenario=scenario_name,
        mode=mode,
        trace_id=trace_id,
        description=scenario["description"],
        events=injected_events,
        decisions=[decision],
        audit=audit,
        is_simulation=True,
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/demo/scenarios", response_model=Dict[str, Any])
def list_demo_scenarios():
    """List available demo scenarios."""
    return {
        "scenarios": {
            name: {"description": info["description"]}
            for name, info in SCENARIOS.items()
        },
        "count": len(SCENARIOS),
    }


@router.post("/demo/inject", response_model=InjectedScenario)
def inject_demo_failure(req: InjectFailureRequest):
    """Inject a deterministic failure scenario for demos."""
    if req.scenario not in SCENARIOS:
        return InjectedScenario(
            id="error",
            scenario="unknown",
            mode=req.mode,
            trace_id="",
            description=f"Unknown scenario: {req.scenario}. Available: {', '.join(SCENARIOS.keys())}",
            is_simulation=True,
        )
    return _inject_scenario(req.scenario, req.mode)
