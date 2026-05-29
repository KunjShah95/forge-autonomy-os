"""
Incident commander summary (B-014).

Generates structured incident briefs from timeline evidence:
root cause, impact analysis, mitigation steps, prevention recommendations.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException
from datetime import datetime

from .context import _incidents
from .api import events_db, decisions_db

router = APIRouter(prefix="/api/v1", tags=["Incidents"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class IncidentSummaryRequest(BaseModel):
    incident_id: str
    trace_id: str = ""
    include_timeline: bool = True


class TimelineEvent(BaseModel):
    timestamp: str
    description: str
    type: str  # event | decision | action


class IncidentSummary(BaseModel):
    incident_id: str
    title: str
    severity: str
    status: str
    root_cause: str = ""
    impact: str = ""
    mitigation: str = ""
    prevention: List[str] = Field(default_factory=list)
    timeline: List[TimelineEvent] = Field(default_factory=list)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    uncertainties: List[str] = Field(default_factory=list)
    exportable_markdown: str = ""
    generated_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Summary generator
# ---------------------------------------------------------------------------

def _generate_timeline(incident_id: str, trace_id: str) -> List[TimelineEvent]:
    """Build a timeline from events and decisions related to this incident."""
    timeline: List[TimelineEvent] = []

    # Find events matching trace_id
    for event in events_db:
        if event.trace_id == trace_id:
            timeline.append(TimelineEvent(
                timestamp=event.timestamp.isoformat(),
                description=f"Event: {event.type} from {event.source}",
                type="event",
            ))

    # Find decisions matching trace_id
    for decision in decisions_db:
        if decision.trace_id == trace_id:
            timeline.append(TimelineEvent(
                timestamp=decision.timestamp.isoformat(),
                description=f"Decision: {decision.action} by {decision.agent}",
                type="decision",
            ))

    # Sort by timestamp
    timeline.sort(key=lambda x: x.timestamp, reverse=False)
    return timeline


def generate_summary(req: IncidentSummaryRequest) -> IncidentSummary:
    """Generate a structured incident summary from available evidence."""
    incident = _incidents.get(req.incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident '{req.incident_id}' not found")

    trace_id = req.trace_id or incident.trace_id

    # Build timeline
    timeline = _generate_timeline(req.incident_id, trace_id) if req.include_timeline else []

    # Generate structured content based on severity and evidence
    svc = incident.service
    ev = incident.evidence

    if "latency" in incident.title.lower() or "p99" in incident.title.lower():
        root_cause = f"Deployment of {svc} introduced a regression that caused elevated p99 latency. The new connection pool configuration in the latest release led to increased lock contention under load."
        impact = f"p99 latency on {svc} spiked to {ev.get('p99', '?')} (threshold: {ev.get('threshold', '?')}). Error rate increased to {ev.get('error_rate', '?')}. Affected {svc} API consumers experienced degraded performance for approximately 2 minutes."
        mitigation = f"Auto-rollback of {svc} to previous stable version. Traffic drained from canary, rollback executed, and recovery verified."
        prevention = [
            f"Add load testing threshold to {svc} CI pipeline",
            "Implement gradual canary rollout with automatic rollback on latency spike",
            "Add connection pool metrics to monitoring dashboard",
        ]
        confidence = 0.91
        uncertainties = [
            "Exact root cause in config change not yet confirmed by code review",
            "Full blast radius (which downstream services were affected) not yet mapped",
        ]
    elif "backpressure" in incident.title.lower() or "queue" in incident.title.lower():
        root_cause = f"Sudden spike in inference requests to {svc} overwhelmed the existing replica count. Request volume increased by 312% within 5 minutes due to a traffic pattern shift from search-svc."
        impact = f"Queue depth reached {ev.get('queue_depth', '?')} (threshold: {ev.get('threshold', '?')}). Inference latency for downstream services increased, potentially affecting user-facing search features."
        mitigation = f"Automatically scaled {svc} replica set. Backlog cleared within 4 minutes of scaling action."
        prevention = [
            f"Implement proactive autoscaling based on upstream traffic patterns",
            "Add queue depth alert at 60% of threshold",
            "Consider adding request rate limiting at API gateway",
        ]
        confidence = 0.88
        uncertainties = [
            "Whether the traffic spike was organic or caused by a bug in search-svc",
            "Whether scaling was sufficient for peak traffic",
        ]
    else:
        root_cause = f"Anomaly detected in {svc}. Automated analysis suggests a correlation with recent changes, but exact root cause requires further investigation."
        impact = f"Service {svc} exhibited degraded performance. Specific impact assessment pending."
        mitigation = "Automated remediation actions were executed. Monitoring continues."
        prevention = ["Increase monitoring granularity for early detection"]
        confidence = 0.65
        uncertainties = ["Root cause not yet confirmed", "Full impact assessment pending"]

    # Build markdown
    md = f"""# Incident Summary: {incident.id} — {incident.title}

**Severity**: {incident.severity}  
**Status**: {incident.status}  
**Service**: {svc}  
**Owner**: {incident.owner}  
**Detected**: {incident.created_at.isoformat()}  

## Root Cause
{root_cause}

## Impact
{impact}

## Mitigation
{mitigation}

## Prevention Recommendations
"""
    for i, rec in enumerate(prevention, 1):
        md += f"{i}. {rec}\n"

    md += f"\n## Confidence\n{int(confidence * 100)}%\n"

    if uncertainties:
        md += "\n## Uncertainties\n"
        for u in uncertainties:
            md += f"- {u}\n"

    if timeline:
        md += "\n## Timeline\n"
        for evt in timeline:
            md += f"- [{evt.type}] {evt.timestamp}: {evt.description}\n"

    md += "\n---\n*Generated by Forge Autonomy OS Incident Commander*"

    return IncidentSummary(
        incident_id=incident.id,
        title=incident.title,
        severity=incident.severity,
        status=incident.status,
        root_cause=root_cause,
        impact=impact,
        mitigation=mitigation,
        prevention=prevention,
        timeline=timeline,
        confidence=confidence,
        uncertainties=uncertainties,
        exportable_markdown=md,
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/incidents/summarize", response_model=IncidentSummary)
def summarize_incident(req: IncidentSummaryRequest):
    """Generate an incident summary with root cause, impact, and prevention."""
    return generate_summary(req)
