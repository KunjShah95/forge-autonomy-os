"""
Workflow rerun automation (B-008).

Triggers CI reruns after repair PR creation via GitHub API simulation.
"""

from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter
from datetime import datetime, timezone

router = APIRouter(prefix="/api/v1", tags=["Orchestrator"])


class RerunRequest(BaseModel):
    trace_id: str
    repo: str = "forge/autonomy-os"
    workflow_name: str = "ci.yml"
    head_branch: str = ""
    run_id: Optional[int] = None


class RerunResult(BaseModel):
    trace_id: str
    status: str  # triggered | pending | failed
    new_run_id: Optional[int] = None
    workflow_url: str = ""
    message: str = ""
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Simulated rerun state
_reruns: Dict[str, RerunResult] = {}


@router.post("/rerun", response_model=RerunResult)
def trigger_rerun(req: RerunRequest):
    """Trigger a workflow rerun for the given branch/trace."""
    new_id = hash(f"{req.trace_id}:{datetime.now(timezone.utc).isoformat()}") % 100000
    result = RerunResult(
        trace_id=req.trace_id,
        status="triggered",
        new_run_id=abs(new_id),
        workflow_url=f"https://github.com/{req.repo}/actions/runs/{abs(new_id)}",
        message=f"Workflow '{req.workflow_name}' rerun triggered on branch '{req.head_branch}'",
    )
    _reruns[req.trace_id] = result
    return result


@router.get("/rerun/{trace_id}", response_model=Optional[RerunResult])
def get_rerun_status(trace_id: str):
    """Get the status of a previously triggered rerun."""
    return _reruns.get(trace_id)
