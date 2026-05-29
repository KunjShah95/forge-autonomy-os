"""
Cross-Agent Collaboration Timeline (B-024, Sprint 4).

Aggregates decisions, events, and actions across all AI agents into a unified,
chronological timeline. Shows which agent acted when, why, and what the outcome was.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter
from datetime import datetime, timedelta, timezone

from .api import events_db, decisions_db, audit_db
from .context import _incidents

router = APIRouter(prefix="/api/v1/timeline", tags=["Timeline"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class TimelineEntry(BaseModel):
    """A single entry in the collaboration timeline."""
    id: str
    timestamp: str
    agent: str
    agent_role: str
    action: str
    description: str
    entry_type: str  # event | decision | incident | audit | system
    trace_id: str = ""
    service: str = ""
    confidence: Optional[float] = None
    risk: Optional[int] = None
    status: str = "info"  # info | success | warning | error
    outcome: str = ""


class CollaborationTimeline(BaseModel):
    """Full collaboration timeline response."""
    entries: List[TimelineEntry] = Field(default_factory=list)
    total_agents: int = 0
    agents_active: List[str] = Field(default_factory=list)
    time_range_hours: int = 24
    generated_at: str = ""


# Agent role map for display
AGENT_ROLES = {
    "SRE Agent": "Site Reliability",
    "DevOps Agent": "DevOps",
    "QA Agent": "Quality Assurance",
    "Security Agent": "Security",
    "Arch Agent": "Architecture Guardian",
    "PM Agent": "Project Management",
    "Incident Commander": "Incident Response",
    "GitHub": "Source Control",
    "CI": "CI/CD Pipeline",
    "Actions": "GitHub Actions",
    "prometheus": "Monitoring",
    "billing-svc": "Billing Service",
    "ml-inference-svc": "ML Inference",
    "search-svc": "Search Service",
}


def _get_agent_role(agent: str) -> str:
    return AGENT_ROLES.get(agent, agent)


def _entry_type_for_source(source: str) -> str:
    if source in ("GitHub", "CI", "Actions", "prometheus", "billing-svc", "ml-inference-svc", "search-svc"):
        return "event"
    if source in ("SRE Agent", "DevOps Agent", "QA Agent", "Security Agent", "Arch Agent", "PM Agent"):
        return "decision"
    return "system"


@router.get("", response_model=CollaborationTimeline)
def get_timeline(limit: int = 50, offset: int = 0, agent: Optional[str] = None):
    """
    Return a unified collaboration timeline across all agents.
    Aggregates from decisions, events, incidents, and audit records.
    """
    entries = []
    now = datetime.now(timezone.utc)
    entry_id = 0

    # 1. From decisions_db (all agent actions)
    for d in decisions_db:
        if agent and d.agent != agent:
            continue
        entry_id += 1
        entries.append(TimelineEntry(
            id=f"tl-{entry_id}",
            timestamp=d.timestamp.isoformat() if hasattr(d.timestamp, 'isoformat') else str(d.timestamp),
            agent=d.agent,
            agent_role=_get_agent_role(d.agent),
            action=d.action,
            description=d.reason,
            entry_type="decision",
            trace_id=d.trace_id,
            confidence=d.confidence,
            risk=d.risk,
            status="info" if d.risk and d.risk < 40 else "warning",
            outcome="",
        ))

    # 2. From events_db (system events)
    for e in events_db:
        if agent and e.source != agent:
            continue
        if (now - e.timestamp).total_seconds() > 86400:  # Skip events older than 24h
            continue
        entry_id += 1
        payload = e.payload or {}
        status = "info"
        if "SPIKE" in e.type or "BACKPRESSURE" in e.type or "ALERT" in e.type:
            status = "warning"
        if payload.get("conclusion") == "failure" or payload.get("conclusion") == "cancelled":
            status = "error"
        if payload.get("conclusion") == "success":
            status = "success"

        entries.append(TimelineEntry(
            id=f"tl-{entry_id}",
            timestamp=e.timestamp.isoformat() if hasattr(e.timestamp, 'isoformat') else str(e.timestamp),
            agent=e.source,
            agent_role=_get_agent_role(e.source),
            action=f"Event: {e.type}",
            description=str(payload)[:150],
            entry_type="event",
            trace_id=e.trace_id,
            status=status,
            outcome=payload.get("conclusion", ""),
        ))

    # 3. From incidents
    for inc in _incidents.values():
        if agent and inc.owner != agent:
            continue
        entry_id += 1
        status_map = {
            "investigating": "warning",
            "remediating": "warning",
            "resolved": "success",
            "auto-resolved": "success",
            "rolled-back": "error",
        }
        entries.append(TimelineEntry(
            id=f"tl-{entry_id}",
            timestamp=inc.created_at.isoformat() if hasattr(inc.created_at, 'isoformat') else str(inc.created_at),
            agent=inc.owner or "System",
            agent_role=_get_agent_role(inc.owner) if inc.owner else "System",
            action=f"Incident: {inc.title[:60]}",
            description=inc.description[:150],
            entry_type="incident",
            trace_id=inc.trace_id,
            service=inc.service,
            status=status_map.get(inc.status, "info"),
            outcome=inc.status,
        ))

    # 4. From audit trail
    for audit in audit_db.values():
        if agent:
            continue  # Audit entries are aggregate, skip per-agent filter
        entry_id += 1
        entries.append(TimelineEntry(
            id=f"tl-{entry_id}",
            timestamp=audit.timestamp.isoformat() if hasattr(audit.timestamp, 'isoformat') else str(audit.timestamp),
            agent="System",
            agent_role="Audit Trail",
            action=f"Audit: {audit.status}",
            description=audit.outcome or f"{len(audit.events)} events, {len(audit.decisions)} decisions",
            entry_type="audit",
            trace_id=audit.trace_id,
            status="success" if audit.status == "RESOLVED" else "warning",
            outcome=audit.status,
        ))

    # Sort: most recent first
    entries.sort(key=lambda e: e.timestamp, reverse=True)

    # Apply pagination
    total = len(entries)
    paginated = entries[offset:offset + limit]

    # Active agents (deduplicated)
    seen_agents = set()
    active_agents = []
    for e in entries:
        if e.agent not in seen_agents:
            seen_agents.add(e.agent)
            active_agents.append(e.agent)

    return CollaborationTimeline(
        entries=paginated,
        total_agents=len(active_agents),
        agents_active=active_agents[:20],
        time_range_hours=24,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/agents")
def get_active_agents():
    """Return a list of all agents that have entries in the timeline."""
    agents = set()
    for d in decisions_db:
        agents.add(d.agent)
    for inc in _incidents.values():
        if inc.owner:
            agents.add(inc.owner)
    return {
        "agents": sorted(
            {"name": a, "role": _get_agent_role(a)} for a in agents
        ),
        "total": len(agents),
    }


@router.get("/summary")
def get_timeline_summary():
    """Return a summary of timeline activity across all agents."""
    now = datetime.now(timezone.utc)

    # Count by agent
    agent_counts: Dict[str, int] = {}
    for d in decisions_db:
        agent_counts[d.agent] = agent_counts.get(d.agent, 0) + 1

    # Decisions in last 24h
    recent_decisions = sum(
        1 for d in decisions_db
        if (now - d.timestamp).total_seconds() < 86400
    )

    return {
        "total_decisions": len(decisions_db),
        "recent_decisions_24h": recent_decisions,
        "agent_decision_counts": dict(sorted(agent_counts.items(), key=lambda x: -x[1])),
        "total_events": len(events_db),
        "total_incidents": len(_incidents),
        "generated_at": now.isoformat(),
    }
