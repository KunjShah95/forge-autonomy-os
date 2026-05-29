"""
PM Agent — Backlog decomposition, sprint planning, blocker detection
(ROADMAP Milestone 5, B-023).

Transforms engineering telemetry into structured backlog items,
detects blockers from CI/CD trends, and generates sprint plans
with effort estimates.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta, timezone
import uuid
import random

router = APIRouter(prefix="/api/v1/pm", tags=["PM Agent"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class BacklogItem(BaseModel):
    """A single backlog item with priority and effort estimation."""
    id: str = Field(default_factory=lambda: f"BL-{uuid.uuid4().hex[:6].upper()}")
    title: str
    description: str = ""
    service: str = ""
    priority: str = "medium"  # critical | high | medium | low
    effort_days: float = Field(default=1.0, ge=0.5, le=40)
    status: str = "backlog"  # backlog | triaged | sprint_planned | in_progress | done
    source: str = "manual"  # manual | incident | ci_failure | alert
    tags: List[str] = Field(default_factory=list)
    blocker: str = ""
    blocked: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    assigned_sprint: str = ""


class Sprint(BaseModel):
    """A sprint plan containing selected backlog items."""
    id: str = Field(default_factory=lambda: f"SP-{uuid.uuid4().hex[:6].upper()}")
    name: str
    goal: str = ""
    start_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    end_date: Optional[datetime] = None
    items: List[str] = Field(default_factory=list)  # BacklogItem IDs
    total_effort_days: float = 0.0
    velocity_estimate: float = 0.0
    status: str = "planning"  # planning | active | completed | cancelled
    blockers: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None


class BlockerDetection(BaseModel):
    """A detected blocker from CI/CD telemetry."""
    id: str = Field(default_factory=lambda: f"BK-{uuid.uuid4().hex[:6].upper()}")
    title: str
    description: str = ""
    severity: str = "medium"  # critical | high | medium | low
    source: str = ""  # ci_failure | incident_trend | dependency | resource
    affected_items: List[str] = Field(default_factory=list)
    evidence: str = ""
    suggested_action: str = ""
    auto_resolved: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DecompositionRequest(BaseModel):
    """Request to decompose a description into backlog items."""
    description: str
    service: str = ""
    source: str = "manual"
    tags: List[str] = Field(default_factory=list)


class SprintPlanRequest(BaseModel):
    """Request to generate a sprint plan from backlog items."""
    sprint_name: str = ""
    goal: str = ""
    max_effort_days: float = 40.0
    prioritize_blockers: bool = True
    include_item_ids: List[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# In-memory stores
# ---------------------------------------------------------------------------

_backlog_items: Dict[str, BacklogItem] = {}
_sprints: Dict[str, Sprint] = {}
_blockers: Dict[str, BlockerDetection] = {}

# Seed some example backlog items
SEED_ITEMS = [
    BacklogItem(
        id="BL-SEED01", title="Add load testing to CI pipeline",
        description="Implement k6-based load tests in the CI pipeline to catch performance regressions before deploy.",
        service="platform", priority="high", effort_days=5.0, status="backlog",
        source="incident", tags=["ci", "testing", "performance"],
    ),
    BacklogItem(
        id="BL-SEED02", title="Implement gradual canary rollout dashboard",
        description="Build a real-time dashboard showing canary rollout progress, error rates, and auto-rollback status.",
        service="cicd", priority="medium", effort_days=8.0, status="backlog",
        source="manual", tags=["ui", "canary", "monitoring"],
    ),
    BacklogItem(
        id="BL-SEED03", title="Fix billing-svc null pointer on config load",
        description="Address persistent null pointer exception when billing-svc loads config without db.pool setting.",
        service="billing-svc", priority="critical", effort_days=2.0, status="backlog",
        source="ci_failure", tags=["bug", "critical", "billing"],
        blocked=True, blocker="Awaiting config schema review from security team",
    ),
    BacklogItem(
        id="BL-SEED04", title="Migrate search indexing to elasticsearch v8",
        description="Upgrade from Elasticsearch v7 to v8. Requires index mapping migration and reindexing.",
        service="search-svc", priority="medium", effort_days=12.0, status="backlog",
        source="manual", tags=["infrastructure", "search", "upgrade"],
    ),
    BacklogItem(
        id="BL-SEED05", title="Add circuit breaker to ML inference client",
        description="Prevent cascading failures when ML inference service is degraded by adding circuit breaker pattern.",
        service="ml-inference", priority="high", effort_days=3.0, status="backlog",
        source="incident", tags=["resilience", "ml", "circuit-breaker"],
    ),
    BacklogItem(
        id="BL-SEED06", title="Dockerize all microservices for consistent dev env",
        description="Add Dockerfiles and docker-compose for all 14 services to ensure consistent local development.",
        service="platform", priority="low", effort_days=6.0, status="backlog",
        source="manual", tags=["devx", "docker", "infrastructure"],
    ),
    BacklogItem(
        id="BL-SEED07", title="Alert fatigue reduction — deduplicate pagerduty",
        description="Implement alert deduplication and grouping to reduce pagerduty noise by 60%.",
        service="observability", priority="high", effort_days=4.0, status="backlog",
        source="manual", tags=["alerts", "pagerduty", "reliability"],
    ),
]

for item in SEED_ITEMS:
    _backlog_items[item.id] = item

# Seed a detected blocker
SEED_BLOCKERS = [
    BlockerDetection(
        id="BK-SEED01", title="CI pipeline flaky rate > 15% on search-svc e2e tests",
        description="Search service e2e tests have been flaky for 7 days. 3 PRs blocked by unrelated failures.",
        severity="high", source="ci_failure",
        affected_items=["BL-SEED04"],
        evidence="search-svc e2e tests fail 18% of runs. Last 7 days: 14 failures out of 78 runs.",
        suggested_action="Quarantine flaky tests and add retry mechanism. Investigate test data isolation.",
    ),
]

for blocker in SEED_BLOCKERS:
    _blockers[blocker.id] = blocker


# ---------------------------------------------------------------------------
# Routes — Backlog Items
# ---------------------------------------------------------------------------

@router.get("/backlog", response_model=List[BacklogItem])
def list_backlog_items(status: Optional[str] = None, priority: Optional[str] = None, service: Optional[str] = None, limit: int = 50, offset: int = 0):
    """List all backlog items with optional filters."""
    items = list(_backlog_items.values())
    if status:
        items = [i for i in items if i.status == status]
    if priority:
        items = [i for i in items if i.priority == priority]
    if service:
        items = [i for i in items if i.service == service]
    result = sorted(items, key=lambda i: {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(i.priority, 99))
    return result[offset:offset + limit]


@router.get("/backlog/{item_id}", response_model=Optional[BacklogItem])
def get_backlog_item(item_id: str):
    """Get a specific backlog item."""
    return _backlog_items.get(item_id)


@router.post("/backlog", response_model=BacklogItem)
def create_backlog_item(item: BacklogItem):
    """Create a new backlog item."""
    if item.id in _backlog_items:
        raise HTTPException(status_code=409, detail=f"Backlog item '{item.id}' already exists")
    item.created_at = datetime.now(timezone.utc)
    item.updated_at = datetime.now(timezone.utc)
    _backlog_items[item.id] = item
    return item


@router.put("/backlog/{item_id}", response_model=BacklogItem)
def update_backlog_item(item_id: str, item: BacklogItem):
    """Update an existing backlog item."""
    if item_id not in _backlog_items:
        raise HTTPException(status_code=404, detail=f"Backlog item '{item_id}' not found")
    item.updated_at = datetime.now(timezone.utc)
    _backlog_items[item_id] = item
    return item


@router.delete("/backlog/{item_id}")
def delete_backlog_item(item_id: str):
    """Delete a backlog item."""
    if item_id not in _backlog_items:
        raise HTTPException(status_code=404, detail=f"Backlog item '{item_id}' not found")
    del _backlog_items[item_id]
    return {"status": "deleted", "item_id": item_id}


@router.post("/backlog/decompose", response_model=List[BacklogItem])
def decompose_backlog(req: DecompositionRequest):
    """
    Decompose a description into structured backlog items with effort estimates.
    (Simulated AI decomposition — splits description into logical units of work.)
    """
    words = req.description.split()
    estimated_items = max(2, min(8, len(words) // 15))

    generated_items = []
    for i in range(estimated_items):
        item = BacklogItem(
            title=f"Phase {i + 1}: {req.description[:50]} — Subtask {i + 1}",
            description=f"Auto-decomposed from: '{req.description}'\nComponent {i + 1} of {estimated_items}",
            service=req.service or "general",
            priority="medium",
            effort_days=round(random.uniform(1.0, 8.0), 1),
            status="backlog",
            source=req.source,
            tags=req.tags + [f"phase-{i + 1}"],
        )
        _backlog_items[item.id] = item
        generated_items.append(item)

    return generated_items


# ---------------------------------------------------------------------------
# Routes — Blockers
# ---------------------------------------------------------------------------

@router.get("/blockers", response_model=List[BlockerDetection])
def list_blockers(active_only: bool = False, limit: int = 50, offset: int = 0):
    """List all detected blockers."""
    blockers = list(_blockers.values())
    if active_only:
        blockers = [b for b in blockers if not b.auto_resolved]
    result = sorted(blockers, key=lambda b: {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(b.severity, 99))
    return result[offset:offset + limit]


@router.post("/blockers/detect", response_model=List[BlockerDetection])
def detect_blockers():
    """
    Scan CI/CD telemetry and incident data to detect new blockers.
    (Simulated — uses in-memory data patterns.)
    """
    # Simulate scanning CI trends
    new_blockers = []
    if random.random() > 0.4:  # 60% chance of finding a new blocker
        blocker = BlockerDetection(
            title=f"Flaky test detection on {random.choice(['billing-svc', 'search-svc', 'ml-inference'])}",
            description="Automated scan detected elevated flaky test rate from CI telemetry.",
            severity=random.choice(["high", "medium"]),
            source="ci_failure",
            evidence=f"Pattern: timeout errors in 3+ consecutive runs. Alert threshold exceeded.",
            suggested_action="Review recent test changes and add retry configuration.",
        )
        _blockers[blocker.id] = blocker
        new_blockers.append(blocker)

    return new_blockers


@router.post("/blockers/{blocker_id}/resolve")
def resolve_blocker(blocker_id: str):
    """Mark a blocker as auto-resolved."""
    if blocker_id not in _blockers:
        raise HTTPException(status_code=404, detail=f"Blocker '{blocker_id}' not found")
    _blockers[blocker_id].auto_resolved = True
    return {"status": "resolved", "blocker_id": blocker_id}


# ---------------------------------------------------------------------------
# Routes — Sprint Planning
# ---------------------------------------------------------------------------

@router.get("/sprints", response_model=List[Sprint])
def list_sprints(status: Optional[str] = None, limit: int = 50, offset: int = 0):
    """List all sprints."""
    sprints = list(_sprints.values())
    if status:
        sprints = [s for s in sprints if s.status == status]
    result = sorted(sprints, key=lambda s: s.start_date, reverse=True)
    return result[offset:offset + limit]


@router.get("/sprints/{sprint_id}", response_model=Optional[Sprint])
def get_sprint(sprint_id: str):
    """Get a specific sprint."""
    return _sprints.get(sprint_id)


@router.post("/sprints/plan", response_model=Sprint)
def generate_sprint_plan(req: SprintPlanRequest):
    """
    Generate a sprint plan from backlog items using intelligent selection.
    - Prioritizes blockers and critical items
    - Estimates total effort
    - Detects cross-item dependencies
    """
    # Gather candidate items
    if req.include_item_ids:
        candidates = [i for i in _backlog_items.values() if i.id in req.include_item_ids]
    else:
        # Auto-select: prioritize blockers, then critical/high, then medium
        candidates = sorted(
            [i for i in _backlog_items.values() if i.status in ("backlog", "triaged")],
            key=lambda i: (
                0 if i.blocked else 1,
                {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(i.priority, 99),
            ),
        )

    # Select items up to max effort
    selected_items = []
    total_effort = 0.0
    for item in candidates:
        if total_effort + item.effort_days <= req.max_effort_days:
            selected_items.append(item)
            total_effort += item.effort_days

    # Detect blockers affecting selected items
    active_blockers = [b for b in _blockers.values() if not b.auto_resolved]
    sprint_blockers = []
    for blocker in active_blockers:
        for item_id in blocker.affected_items:
            if item_id in [s.id for s in selected_items]:
                sprint_blockers.append(blocker.id)
                break

    # Create the sprint
    sprint_name = req.sprint_name or f"Sprint {datetime.now(timezone.utc).strftime('%Y-%m-%d')}"
    sprint = Sprint(
        name=sprint_name,
        goal=req.goal or f"Complete {len(selected_items)} backlog items",
        start_date=datetime.now(timezone.utc),
        end_date=datetime.now(timezone.utc) + timedelta(days=14),
        items=[s.id for s in selected_items],
        total_effort_days=total_effort,
        velocity_estimate=round(total_effort * 0.85, 1),  # 85% velocity factor
        status="planning",
        blockers=sprint_blockers,
    )

    # Update item statuses
    for item in selected_items:
        item.status = "sprint_planned"
        item.assigned_sprint = sprint.id
        item.updated_at = datetime.now(timezone.utc)

    _sprints[sprint.id] = sprint
    return sprint


@router.post("/sprints/{sprint_id}/start", response_model=Sprint)
def start_sprint(sprint_id: str):
    """Activate a planned sprint."""
    sprint = _sprints.get(sprint_id)
    if not sprint:
        raise HTTPException(status_code=404, detail=f"Sprint '{sprint_id}' not found")
    sprint.status = "active"
    return sprint


@router.post("/sprints/{sprint_id}/complete", response_model=Sprint)
def complete_sprint(sprint_id: str):
    """Mark a sprint as completed."""
    sprint = _sprints.get(sprint_id)
    if not sprint:
        raise HTTPException(status_code=404, detail=f"Sprint '{sprint_id}' not found")
    sprint.status = "completed"
    sprint.completed_at = datetime.now(timezone.utc)
    # Mark items as done
    for item_id in sprint.items:
        if item_id in _backlog_items:
            _backlog_items[item_id].status = "done"
            _backlog_items[item_id].updated_at = datetime.now(timezone.utc)
    return sprint
