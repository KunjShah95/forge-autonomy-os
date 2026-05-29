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

app = FastAPI(
    title="Forge Autonomy OS Backend",
    description="Milestone 0 Foundation - Event Ingestion, Decisions Feed & Audit Trail",
    version="1.0.0"
)

# Configure CORS so the Vite React frontend can communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the exact origins (e.g. http://localhost:5173)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Sprint 1 health-check endpoint (B-001)
@app.get("/health", tags=["System"])
@app.get("/api/v1/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "milestone": 0,
        "sprint": 1,
        "version": "1.0.0",
        "services": {
            "event_ingestion": "active",
            "decision_feed": "active",
            "audit_trail": "active"
        }
    }

# Mount v1 api router
app.include_router(api_router)

# Mount all routers
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
