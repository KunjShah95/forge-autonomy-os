"""
Risk scoring service (B-010).

Calculates deployment risk from change surface, service criticality,
incident history, and deployment patterns.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter
from datetime import datetime, timezone

router = APIRouter(prefix="/api/v1", tags=["Risk"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class RiskScoreRequest(BaseModel):
    service: str
    version: str
    files_changed: int = 0
    lines_added: int = 0
    lines_removed: int = 0
    dependencies_changed: List[str] = Field(default_factory=list)
    is_config_change: bool = False
    is_dependency_change: bool = False
    is_database_migration: bool = False
    previous_incidents_30d: int = 0
    deployment_count_30d: int = 0
    trace_id: str = ""


class RiskFactor(BaseModel):
    name: str
    score: int = Field(..., ge=0, le=100)
    description: str = ""


class RiskScoreResult(BaseModel):
    trace_id: str
    service: str
    version: str
    overall_risk: int = Field(..., ge=0, le=100)
    risk_level: str  # low | moderate | high | critical
    factors: List[RiskFactor] = Field(default_factory=list)
    recommendation: str = ""
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# Risk calculation
# ---------------------------------------------------------------------------

# Service criticality map
SERVICE_CRITICALITY = {
    "api-gateway": 90,
    "auth-svc": 85,
    "billing-svc": 95,
    "ledger-svc": 90,
    "orders-svc": 80,
    "users-svc": 70,
    "search-svc": 60,
    "ml-inference": 50,
    "payment-svc": 95,
    "redis-cluster": 85,
}


def score_risk(req: RiskScoreRequest) -> RiskScoreResult:
    """Calculate deployment risk score from change surface and context."""
    factors: List[RiskFactor] = []
    base_criticality = SERVICE_CRITICALITY.get(req.service, 50)

    # Factor 1: Service criticality
    factors.append(RiskFactor(
        name="service_criticality",
        score=base_criticality,
        description=f"Service {req.service} has criticality {base_criticality}/100",
    ))

    # Factor 2: Change volume
    change_volume = min(
        (req.files_changed * 5) + (req.lines_added * 0.5) + (req.lines_removed * 0.3),
        100,
    )
    factors.append(RiskFactor(
        name="change_volume",
        score=int(change_volume),
        description=f"Changed {req.files_changed} files (+{req.lines_added}/-{req.lines_removed} lines)",
    ))

    # Factor 3: Dependency changes
    dep_risk = 0
    if req.is_dependency_change or req.dependencies_changed:
        dep_risk = min(len(req.dependencies_changed) * 15, 100)
        factors.append(RiskFactor(
            name="dependency_changes",
            score=dep_risk,
            description=f"{len(req.dependencies_changed)} dependencies modified",
        ))

    # Factor 4: Config changes
    config_risk = 60 if req.is_config_change else 0
    if config_risk > 0:
        factors.append(RiskFactor(
            name="config_change",
            score=config_risk,
            description="Configuration file changes detected — high blast radius",
        ))

    # Factor 5: Database migration
    migration_risk = 80 if req.is_database_migration else 0
    if migration_risk > 0:
        factors.append(RiskFactor(
            name="database_migration",
            score=migration_risk,
            description="Database schema migration detected — requires careful rollout",
        ))

    # Factor 6: Incident history
    incident_ratio = req.previous_incidents_30d / max(req.deployment_count_30d, 1)
    history_risk = min(int(incident_ratio * 200), 100)
    if history_risk > 0:
        factors.append(RiskFactor(
            name="incident_history",
            score=history_risk,
            description=f"{req.previous_incidents_30d} incidents in last 30d ({req.deployment_count_30d} deploys)",
        ))

    # Factor 7: Deployment frequency (low freq = higher risk)
    if req.deployment_count_30d > 0:
        freq_score = max(0, 100 - min(req.deployment_count_30d * 3, 100))
        factors.append(RiskFactor(
            name="deployment_frequency",
            score=freq_score,
            description=f"{req.deployment_count_30d} deploys in 30d",
        ))

    # Weighted average
    weights = [0.25, 0.15, 0.15, 0.15, 0.15, 0.10, 0.05]
    total_weight = sum(w for f, w in zip(factors, weights[:len(factors)]))
    if total_weight > 0:
        weighted = sum(f.score * w for f, w in zip(factors, weights[:len(factors)]))
        overall_risk = int(weighted / total_weight)
    else:
        overall_risk = base_criticality

    overall_risk = max(0, min(overall_risk, 100))

    # Risk level
    if overall_risk >= 70:
        risk_level = "critical"
        recommendation = "Requires full approval. Canary recommended at 5% with automatic rollback."
    elif overall_risk >= 40:
        risk_level = "high"
        recommendation = "Canary recommended at 10-25%. Monitor SLOs during rollout."
    elif overall_risk >= 20:
        risk_level = "moderate"
        recommendation = "Standard canary deployment at 25% recommended."
    else:
        risk_level = "low"
        recommendation = "Safe to fast-forward deploy. Standard monitors active."

    return RiskScoreResult(
        trace_id=req.trace_id,
        service=req.service,
        version=req.version,
        overall_risk=overall_risk,
        risk_level=risk_level,
        factors=factors,
        recommendation=recommendation,
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/risk/score", response_model=RiskScoreResult)
def calculate_risk_score(req: RiskScoreRequest):
    """Calculate deployment risk score from change context."""
    return score_risk(req)
