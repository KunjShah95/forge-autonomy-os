"""
Context engine persistence layer (B-012).

In-memory persistence for events, decisions, incidents, and ownership context.
Designed as a drop-in that can be swapped for Postgres later.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
import uuid

from .schemas import EventSchema, DecisionSchema

router = APIRouter(prefix="/api/v1", tags=["Context"])


# ---------------------------------------------------------------------------
# Incident model
# ---------------------------------------------------------------------------

class IncidentSchema(BaseModel):
    id: str
    title: str
    severity: str  # low | medium | high | critical
    status: str  # investigating | remediating | resolved | auto-resolved | rolled-back
    owner: str = ""
    service: str = ""
    trace_id: str = ""
    description: str = ""
    evidence: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None
    mttr_minutes: Optional[int] = None


class OwnershipRecord(BaseModel):
    service: str
    team: str
    slack_channel: str = ""
    pagerduty_service: str = ""
    docs_url: str = ""


# ---------------------------------------------------------------------------
# In-memory stores
# ---------------------------------------------------------------------------

_incidents: Dict[str, IncidentSchema] = {}
_ownerships: Dict[str, OwnershipRecord] = {}

# Seed data
_incidents["INC-2847"] = IncidentSchema(
    id="INC-2847",
    title="Elevated p99 latency on billing-svc",
    severity="high",
    status="investigating",
    owner="SRE Agent",
    service="billing-svc",
    trace_id="trace-billing-101",
    description="p99 latency spiked to 950ms (threshold 250ms) after deploying billing-svc v1.22.0",
    evidence={"p99": "950ms", "error_rate": "12.4%", "threshold": "250ms"},
    created_at=datetime.utcnow() - timedelta(minutes=12),
)
_incidents["INC-2846"] = IncidentSchema(
    id="INC-2846",
    title="ML inference queue backpressure",
    severity="medium",
    status="remediating",
    owner="DevOps Agent",
    service="ml-inference",
    trace_id="trace-ml-102",
    description="ML inference queue depth exceeded safe operational threshold",
    evidence={"queue_depth": "1420", "threshold": "500", "max_capacity": "500"},
    created_at=datetime.utcnow() - timedelta(minutes=31),
)
_incidents["INC-2845"] = IncidentSchema(
    id="INC-2845",
    title="Auth token TTL drift detected",
    severity="low",
    status="auto-resolved",
    owner="Security Agent",
    service="auth-svc",
    trace_id="trace-auth-103",
    description="Auth token TTL drifted beyond acceptable bounds, auto-remediated",
    created_at=datetime.utcnow() - timedelta(hours=1),
    resolved_at=datetime.utcnow() - timedelta(minutes=45),
    mttr_minutes=15,
)

_ownerships = {
    "api-gateway": OwnershipRecord(service="api-gateway", team="Platform", slack_channel="#platform"),
    "auth-svc": OwnershipRecord(service="auth-svc", team="Identity", slack_channel="#identity"),
    "billing-svc": OwnershipRecord(service="billing-svc", team="Payments", slack_channel="#payments"),
    "ledger-svc": OwnershipRecord(service="ledger-svc", team="Payments", slack_channel="#payments"),
    "orders-svc": OwnershipRecord(service="orders-svc", team="Commerce", slack_channel="#commerce"),
    "users-svc": OwnershipRecord(service="users-svc", team="Identity", slack_channel="#identity"),
    "search-svc": OwnershipRecord(service="search-svc", team="Discovery", slack_channel="#discovery"),
    "ml-inference": OwnershipRecord(service="ml-inference", team="AI Platform", slack_channel="#ai-platform"),
}


# ---------------------------------------------------------------------------
# Routes — Incidents
# ---------------------------------------------------------------------------

@router.get("/incidents", response_model=List[IncidentSchema])
def list_incidents(service: Optional[str] = None, status: Optional[str] = None):
    """List incidents with optional filtering."""
    incidents = list(_incidents.values())
    if service:
        incidents = [i for i in incidents if i.service == service]
    if status:
        incidents = [i for i in incidents if i.status == status]
    return sorted(incidents, key=lambda x: x.created_at, reverse=True)


@router.get("/incidents/{incident_id}", response_model=Optional[IncidentSchema])
def get_incident(incident_id: str):
    """Get a specific incident by ID."""
    return _incidents.get(incident_id)


@router.post("/incidents", response_model=IncidentSchema)
def create_incident(incident: IncidentSchema):
    """Create a new incident record."""
    _incidents[incident.id] = incident
    return incident


# ---------------------------------------------------------------------------
# Routes — Ownership
# ---------------------------------------------------------------------------

@router.get("/ownership", response_model=List[OwnershipRecord])
def list_ownership():
    """List all service ownership records."""
    return list(_ownerships.values())


@router.get("/ownership/{service}", response_model=Optional[OwnershipRecord])
def get_ownership(service: str):
    """Get ownership record for a specific service."""
    return _ownerships.get(service)
