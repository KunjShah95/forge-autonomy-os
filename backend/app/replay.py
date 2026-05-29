"""
Decision replay mode (B-016).

Replay event timelines for deterministic storytelling during demos.
Supports pause/resume/step controls.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException
from datetime import datetime

from .api import events_db, decisions_db, audit_db

router = APIRouter(prefix="/api/v1", tags=["Replay"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ReplayStartRequest(BaseModel):
    trace_id: str


class ReplaySession(BaseModel):
    id: str
    trace_id: str
    status: str  # paused | playing | completed
    current_step: int = 0
    total_steps: int = 0
    steps: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# In-memory replay sessions
_sessions: Dict[str, ReplaySession] = {}


def _build_steps(trace_id: str) -> List[Dict[str, Any]]:
    """Build a step-by-step timeline from events and decisions for a trace."""
    steps: List[Dict[str, Any]] = []

    # Find events for this trace
    trace_events = sorted(
        [e for e in events_db if e.trace_id == trace_id],
        key=lambda e: e.timestamp,
    )
    for event in trace_events:
        steps.append({
            "step": len(steps) + 1,
            "type": "event",
            "timestamp": event.timestamp.isoformat(),
            "source": event.source,
            "event_type": event.type,
            "summary": f"Event: {event.type} from {event.source}",
            "payload": event.payload,
        })

    # Find decisions for this trace
    trace_decisions = sorted(
        [d for d in decisions_db if d.trace_id == trace_id],
        key=lambda d: d.timestamp,
    )
    for decision in trace_decisions:
        steps.append({
            "step": len(steps) + 1,
            "type": "decision",
            "timestamp": decision.timestamp.isoformat(),
            "agent": decision.agent,
            "action": decision.action,
            "confidence": decision.confidence,
            "risk": decision.risk,
            "reason": decision.reason,
            "evidence": decision.evidence,
        })

    # Add audit outcome
    audit = audit_db.get(trace_id)
    if audit:
        steps.append({
            "step": len(steps) + 1,
            "type": "outcome",
            "timestamp": audit.timestamp.isoformat(),
            "status": audit.status,
            "outcome": audit.outcome,
        })

    return steps


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/replay/start", response_model=ReplaySession)
def start_replay(req: ReplayStartRequest):
    """Start a replay session for a given trace_id."""
    tid = req.trace_id
    steps = _build_steps(tid)
    if not steps:
        raise HTTPException(status_code=404, detail=f"No events or decisions found for trace_id: {tid}")

    session_id = f"replay-{tid}"
    session = ReplaySession(
        id=session_id,
        trace_id=tid,
        status="paused",
        current_step=0,
        total_steps=len(steps),
        steps=steps,
    )
    _sessions[session_id] = session
    return session


@router.get("/replay/{session_id}", response_model=Optional[ReplaySession])
def get_replay_session(session_id: str):
    """Get the current state of a replay session."""
    return _sessions.get(session_id)


@router.post("/replay/{session_id}/step", response_model=ReplaySession)
def step_replay(session_id: str):
    """Advance the replay by one step."""
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Replay session not found")

    if session.current_step >= session.total_steps:
        session.status = "completed"
        raise HTTPException(status_code=400, detail="Replay already completed")

    session.current_step += 1
    session.status = "paused"
    if session.current_step >= session.total_steps:
        session.status = "completed"

    _sessions[session_id] = session
    return session


@router.post("/replay/{session_id}/play", response_model=ReplaySession)
def play_replay(session_id: str):
    """Resume auto-play for a replay session."""
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Replay session not found")

    session.status = "playing"
    _sessions[session_id] = session
    return session


@router.post("/replay/{session_id}/pause", response_model=ReplaySession)
def pause_replay(session_id: str):
    """Pause a replay session."""
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Replay session not found")

    session.status = "paused"
    _sessions[session_id] = session
    return session


@router.post("/replay/{session_id}/reset", response_model=ReplaySession)
def reset_replay(session_id: str):
    """Reset a replay session to step 0."""
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Replay session not found")

    session.current_step = 0
    session.status = "paused"
    _sessions[session_id] = session
    return session
