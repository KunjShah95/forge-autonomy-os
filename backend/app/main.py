from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import router as api_router
from .webhooks import router as webhooks_router
from .classifier import router as classifier_router
from .policy import router as policy_router
from .risk import router as risk_router
from .repair import router as repair_router
from .orchestrator import router as orchestrator_router
from .canary import router as canary_router
from .context import router as context_router
from .guardian import router as guardian_router
from .incident_summary import router as incident_summary_router
from .demo import router as demo_router
from .replay import router as replay_router
from .rbac import router as rbac_router
from .policy_engine import router as policy_engine_router
from .workflows import router as workflows_router
from .chaos import router as chaos_router
from .quarantine import router as quarantine_router
from .templates import router as templates_router
from .pm_agent import router as pm_agent_router
from .onboarding import router as onboarding_router
from .persistence import router as persistence_router
from .stream import router as stream_router
from .timeline import router as timeline_router
from .persistence_sync import load_events_from_db, load_decisions_from_db
from .telemetry import setup_telemetry, register_metrics_middleware
from .pg_persistence import init_postgres
from .event_bus import init_event_bus
from .operator import start_remediation_listener
from .canary_agent import router as canary_agent_router
from .rerun_agent import router as rerun_agent_router

# v1.0.0 modules
from .test_selection import router as test_selection_router
from .security_scanner import router as security_scanner_router
from .sso import router as sso_router
from .compliance import router as compliance_router
from .orchestrator_agent import router as orchestrator_agent_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup initialization, shutdown cleanup."""
    # ── Startup ──
    # Load persisted data from SQLite
    try:
        events = load_events_from_db()
        decisions = load_decisions_from_db()
        if events or decisions:
            from .api import events_db, decisions_db
            from .schemas import EventSchema, DecisionSchema
            from datetime import datetime, timezone
            for e in events:
                try:
                    ts = datetime.fromisoformat(e["timestamp"]) if isinstance(e.get("timestamp"), str) else datetime.now(timezone.utc)
                    events_db.append(EventSchema(
                        source=e.get("source", "system"),
                        type=e.get("type", "RESTORED"),
                        timestamp=ts,
                        trace_id=e.get("trace_id", ""),
                        payload=e.get("payload", {}),
                    ))
                except Exception:
                    pass
            for d in decisions:
                try:
                    ts = datetime.fromisoformat(d["timestamp"]) if isinstance(d.get("timestamp"), str) else datetime.now(timezone.utc)
                    decisions_db.append(DecisionSchema(
                        id=d.get("id", ""),
                        trace_id=d.get("trace_id", ""),
                        agent=d.get("agent", "system"),
                        action=d.get("action", ""),
                        reason=d.get("reason", ""),
                        confidence=d.get("confidence", 0.0),
                        risk=d.get("risk", 0),
                        evidence=d.get("evidence", {}),
                        timestamp=ts,
                    ))
                except Exception:
                    pass
            print(f"[Startup] Loaded {len(events)} events, {len(decisions)} decisions from SQLite")
    except Exception as e:
        print(f"[Startup] SQLite load skipped: {e}")

    # Initialize PostgreSQL if configured
    init_postgres()

    # Initialize Telemetry
    setup_telemetry(app)

    # Initialize NATS event bus + remediation listener
    try:
        await init_event_bus()
        await start_remediation_listener()
    except Exception as e:
        print(f"[Startup] NATS/operator init skipped: {e}")

    yield

    # ── Shutdown ──
    try:
        from .event_bus import close as close_event_bus
        await close_event_bus()
    except Exception:
        pass


app = FastAPI(
    title="Forge Autonomy OS Backend",
    description="AI-Native Production Operating System — v1.0.0",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register metrics middleware at module level (not inside lifespan)
# Adding middleware during lifespan startup raises:
#   "Cannot add middleware after an application has started"
register_metrics_middleware(app)


@app.get("/health", tags=["System"])
@app.get("/api/v1/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "milestone": 7,
        "version": "1.0.0",
        "services": {
            "event_ingestion": "active",
            "decision_feed": "active",
            "audit_trail": "active",
        },
    }


# Core v0.x routers
app.include_router(api_router)
app.include_router(webhooks_router)
app.include_router(classifier_router)
app.include_router(policy_router)
app.include_router(risk_router)
app.include_router(repair_router)
app.include_router(orchestrator_router)
app.include_router(canary_router)
app.include_router(context_router)
app.include_router(guardian_router)
app.include_router(incident_summary_router)
app.include_router(demo_router)
app.include_router(replay_router)
app.include_router(rbac_router)
app.include_router(policy_engine_router)
app.include_router(workflows_router)
app.include_router(chaos_router)
app.include_router(quarantine_router)
app.include_router(templates_router)
app.include_router(pm_agent_router)
app.include_router(onboarding_router)
app.include_router(persistence_router)
app.include_router(stream_router)
app.include_router(timeline_router)
app.include_router(canary_agent_router)
app.include_router(rerun_agent_router)

# v1.0.0 routers
app.include_router(test_selection_router)
app.include_router(security_scanner_router)
app.include_router(sso_router)
app.include_router(compliance_router)
app.include_router(orchestrator_agent_router)
