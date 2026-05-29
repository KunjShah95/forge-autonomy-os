from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime, timedelta, timezone

from .schemas import EventSchema, DecisionSchema, AuditSchema
from .persistence_sync import sync_event, sync_decision

router = APIRouter(prefix="/api/v1")

# In-memory database
events_db: List[EventSchema] = []
decisions_db: List[DecisionSchema] = []
audit_db: Dict[str, AuditSchema] = {}  # Keyed by trace_id

# Seed initial mock data for seamless demo
def seed_mock_data():
    # Helper to create timestamps
    now = datetime.now(timezone.utc)
    
    # 1. Incident 1: Elevated latency on billing-svc
    t1 = "trace-billing-101"
    e1 = EventSchema(
        source="billing-svc",
        type="METRIC_LATENCY_SPIKE",
        timestamp=now - timedelta(minutes=12),
        trace_id=t1,
        payload={"metric": "p99_latency", "value": "950ms", "threshold": "250ms"}
    )
    d1 = DecisionSchema(
        id="dec-101",
        trace_id=t1,
        agent="SRE Agent",
        action="Auto-rollback of billing-svc v1.22.0",
        reason="Elevated p99 latency on billing-svc (950ms vs threshold 250ms).",
        confidence=0.94,
        risk=78,
        evidence={"p99": "950ms", "error_rate": "12.4%"},
        timestamp=now - timedelta(minutes=11)
    )
    a1 = AuditSchema(
        trace_id=t1,
        events=[e1],
        decisions=[d1],
        status="RESOLVED",
        outcome="Billing-svc rolled back to version v1.21.9. Latency recovered to 140ms.",
        timestamp=now - timedelta(minutes=10)
    )
    
    # 2. Incident 2: ML inference backpressure
    t2 = "trace-ml-102"
    e2 = EventSchema(
        source="ml-inference-svc",
        type="QUEUE_BACKPRESSURE",
        timestamp=now - timedelta(minutes=31),
        trace_id=t2,
        payload={"queue_depth": "1420", "threshold": "500"}
    )
    d2 = DecisionSchema(
        id="dec-102",
        trace_id=t2,
        agent="DevOps Agent",
        action="Scale ML inference replica set to 8",
        reason="ML inference queue depth exceeded safe operational threshold.",
        confidence=0.91,
        risk=14,
        evidence={"queue_depth": "1420", "max_capacity": "500"},
        timestamp=now - timedelta(minutes=30)
    )
    a2 = AuditSchema(
        trace_id=t2,
        events=[e2],
        decisions=[d2],
        status="RESOLVED",
        outcome="Successfully scaled ML inference services. Backlog cleared in 4 minutes.",
        timestamp=now - timedelta(minutes=26)
    )

    # Ingest seed data
    events_db.extend([e1, e2])
    decisions_db.extend([d1, d2])
    audit_db[t1] = a1
    audit_db[t2] = a2

# Run seed
seed_mock_data()

@router.post("/events", response_model=EventSchema)
def ingest_event(event: EventSchema):
    events_db.append(event)
    
    # Persist to SQLite
    sync_event(event.trace_id, event.source, event.type, event.payload or {})
    
    # Update or insert into the audit trail
    if event.trace_id not in audit_db:
        audit_db[event.trace_id] = AuditSchema(
            trace_id=event.trace_id,
            events=[event],
            timestamp=datetime.now(timezone.utc)
        )
    else:
        audit_db[event.trace_id].events.append(event)
        
    return event

@router.post("/decisions", response_model=DecisionSchema)
def create_decision(decision: DecisionSchema):
    decisions_db.append(decision)
    
    # Persist to SQLite
    sync_decision(decision)
    
    # Update audit trail
    if decision.trace_id not in audit_db:
        audit_db[decision.trace_id] = AuditSchema(
            trace_id=decision.trace_id,
            decisions=[decision],
            timestamp=datetime.now(timezone.utc)
        )
    else:
        audit_db[decision.trace_id].decisions.append(decision)
        
    return decision

@router.get("/events", response_model=List[EventSchema])
def get_events(trace_id: Optional[str] = None, limit: int = 50, offset: int = 0):
    """Retrieve events, optionally filtered by trace_id."""
    if trace_id:
        result = [e for e in events_db if e.trace_id == trace_id]
    else:
        result = sorted(events_db, key=lambda e: e.timestamp, reverse=True)
    return result[offset:offset + limit]


@router.get("/decisions", response_model=List[DecisionSchema])
def get_decisions(limit: int = 50, offset: int = 0):
    return decisions_db[offset:offset + limit]

@router.get("/audit", response_model=List[AuditSchema])
def get_audit(trace_id: Optional[str] = None, limit: int = 50, offset: int = 0):
    if trace_id:
        if trace_id in audit_db:
            return [audit_db[trace_id]]
        return []
    # Return all audit entries sorted by timestamp descending
    result = sorted(audit_db.values(), key=lambda x: x.timestamp, reverse=True)
    return result[offset:offset + limit]

@router.post("/simulate", response_model=AuditSchema)
def simulate_event():
    # Simulate a brand new synthetic agent action workflow
    trace_id = f"sim-{str(uuid.uuid4())[:8]}"
    now = datetime.now(timezone.utc)

    # 1. Event: CPU spikes on search service
    sim_event = EventSchema(
        source="search-svc",
        type="CPU_USAGE_ALERT",
        timestamp=now,
        trace_id=trace_id,
        payload={
            "metric": "cpu_utilization",
            "value": "98.2%",
            "threshold": "85.0%",
            "service": "search-svc",
            "environment": "production"
        }
    )
    events_db.append(sim_event)

    # 2. Decision: Scale replicas or throttle non-critical request paths
    decision_id = f"dec-{str(uuid.uuid4())[:8]}"
    sim_decision = DecisionSchema(
        id=decision_id,
        trace_id=trace_id,
        agent="SRE Agent",
        action="Dynamically scale search-svc auto-scaler replicas from 3 to 6",
        reason="CPU utilization at 98.2% on search-svc, causing p99 latency drift.",
        confidence=0.97,
        risk=24,
        evidence={
            "cpu_utilization": "98.2%",
            "request_rate": "4210 RPS",
            "active_pods": 3
        },
        timestamp=now
    )
    decisions_db.append(sim_decision)

    # 3. Create integrated Audit record
    audit_record = AuditSchema(
        trace_id=trace_id,
        events=[sim_event],
        decisions=[sim_decision],
        status="RESOLVED",
        outcome="Dynamically provisioned 3 additional search instances. CPU utilization throttled back to stable 42%.",
        timestamp=now
    )
    audit_db[trace_id] = audit_record

    return audit_record
