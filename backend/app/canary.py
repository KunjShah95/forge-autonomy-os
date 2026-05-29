"""
Canary + rollback controller (B-011).

Progressive rollout control with automatic rollback on anomaly detection.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException
from datetime import datetime

router = APIRouter(prefix="/api/v1", tags=["Canary"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class CanaryStartRequest(BaseModel):
    service: str
    version: str
    target_percentage: int = Field(default=25, ge=5, le=100)
    bake_minutes: int = Field(default=10, ge=1)
    rollback_on_error_budget_burn: float = Field(default=2.0, ge=0.5)
    trace_id: str = ""


class CanaryStatus(BaseModel):
    id: str
    service: str
    version: str
    status: str  # baking | promoting | deployed | rolled_back | failed
    current_percentage: int = Field(..., ge=0, le=100)
    target_percentage: int = Field(..., ge=5, le=100)
    bake_minutes: int = 10
    bake_elapsed_minutes: int = 0
    errors_0: int = 0
    latency_p99_ms: int = 0
    error_budget_burn_rate: float = 0.0
    should_auto_rollback: bool = False
    steps: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# Simulated canary state
_canaries: Dict[str, CanaryStatus] = {}


def _generate_canary_steps(target_pct: int, bake: int) -> List[Dict[str, Any]]:
    """Generate rollout steps based on target percentage."""
    steps = []
    stages = sorted(set([5, 10, 25, 50, 100] + [target_pct]))
    stages = [s for s in stages if s <= target_pct]
    for i, pct in enumerate(stages):
        steps.append({
            "stage": i + 1,
            "percentage": pct,
            "bake_minutes": bake if pct < 100 else 5,
            "status": "pending",
        })
    return steps


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/canary/start", response_model=CanaryStatus)
def start_canary(req: CanaryStartRequest):
    """Start a canary deployment for the given service/version."""
    canary_id = f"canary-{req.service}-{req.version.replace('.', '-')}"
    if canary_id in _canaries:
        raise HTTPException(status_code=409, detail="Canary already exists for this service/version")

    steps = _generate_canary_steps(req.target_percentage, req.bake_minutes)
    if steps:
        steps[0]["status"] = "baking"

    canary = CanaryStatus(
        id=canary_id,
        service=req.service,
        version=req.version,
        status="baking",
        current_percentage=5,
        target_percentage=req.target_percentage,
        bake_minutes=req.bake_minutes,
        steps=steps,
    )
    _canaries[canary_id] = canary
    return canary


@router.post("/canary/promote/{canary_id}", response_model=CanaryStatus)
def promote_canary(canary_id: str):
    """Promote canary to the next stage."""
    canary = _canaries.get(canary_id)
    if not canary:
        raise HTTPException(status_code=404, detail="Canary not found")

    # Find current stage and promote to next
    current_idx = -1
    for i, step in enumerate(canary.steps):
        if step["status"] == "baking":
            step["status"] = "completed"
            current_idx = i
            break

    if current_idx >= 0 and current_idx + 1 < len(canary.steps):
        next_step = canary.steps[current_idx + 1]
        next_step["status"] = "baking"
        canary.current_percentage = next_step["percentage"]
        canary.status = "promoting" if next_step["percentage"] < 100 else "deployed"

    canary.updated_at = datetime.utcnow()
    _canaries[canary_id] = canary
    return canary


@router.post("/canary/rollback/{canary_id}", response_model=CanaryStatus)
def rollback_canary(canary_id: str):
    """Rollback a canary deployment."""
    canary = _canaries.get(canary_id)
    if not canary:
        raise HTTPException(status_code=404, detail="Canary not found")

    canary.status = "rolled_back"
    canary.current_percentage = 0
    canary.updated_at = datetime.utcnow()

    # Mark all steps as rolled back
    for step in canary.steps:
        step["status"] = "rolled_back"

    _canaries[canary_id] = canary
    return canary


@router.get("/canary/{canary_id}", response_model=Optional[CanaryStatus])
def get_canary_status(canary_id: str):
    """Get the current status of a canary deployment."""
    return _canaries.get(canary_id)


@router.get("/canaries", response_model=List[CanaryStatus])
def list_canaries():
    """List all canary deployments."""
    return list(_canaries.values())
