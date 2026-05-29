"""
Pilot Onboarding Dashboard — KPI metrics, service health, usage telemetry
(ROADMAP Milestone 6, B-025).

Tracks pilot tenant onboarding progress, surfaces key reliability/autonomy
KPIs, and provides a readiness checklist for production pilot launch.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta, timezone
import uuid
import random

router = APIRouter(prefix="/api/v1/onboarding", tags=["Onboarding"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class KpiMetric(BaseModel):
    """A single KPI metric with trend and threshold."""
    name: str
    display_name: str
    value: float
    unit: str = "score"
    target: float = 100.0
    trend: str = "stable"  # rising | falling | stable
    status: str = "healthy"  # healthy | warning | critical
    description: str = ""


class ServiceHealth(BaseModel):
    """Health status for a single service."""
    name: str
    status: str = "healthy"  # healthy | degraded | down
    uptime_pct: float = Field(default=99.9, ge=0.0, le=100.0)
    p99_latency_ms: float = 0.0
    error_rate_pct: float = 0.0
    last_incident: Optional[str] = None
    last_incident_at: Optional[datetime] = None


class AutonomyMetric(BaseModel):
    """Autonomy-specific KPI (autonomy rate, MTTR, CFR, etc.)"""
    name: str
    value: float
    unit: str = "%"
    baseline: float = 0.0
    improvement_pct: float = 0.0
    status: str = "healthy"


class TenantOnboarding(BaseModel):
    """A pilot tenant's onboarding progress."""
    id: str = Field(default_factory=lambda: f"TN-{uuid.uuid4().hex[:6].upper()}")
    name: str
    status: str = "pending"  # pending | active | onboarded | offboarding
    tier: str = "standard"  # standard | enterprise
    services_connected: int = 0
    total_services: int = 0
    policies_active: int = 0
    incidents_last_7d: int = 0
    autonomy_rate: float = 0.0
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_active: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    readiness_checks: Dict[str, bool] = Field(default_factory=lambda: {
        "webhook_configured": False,
        "policies_defined": False,
        "team_onboarded": False,
        "canary_enabled": False,
        "alert_integration": False,
    })


class DashboardResponse(BaseModel):
    """Aggregated dashboard payload."""
    kpis: List[KpiMetric] = Field(default_factory=list)
    services: List[ServiceHealth] = Field(default_factory=list)
    autonomy_metrics: List[AutonomyMetric] = Field(default_factory=list)
    tenants: List[TenantOnboarding] = Field(default_factory=list)
    overall_health_score: float = 0.0
    active_incidents: int = 0
    total_decisions_24h: int = 0
    autonomy_rate_24h: float = 0.0
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# In-memory stores with seed data
# ---------------------------------------------------------------------------

_tenants: Dict[str, TenantOnboarding] = {}

SEED_TENANTS = [
    TenantOnboarding(
        id="TN-ACME01", name="Acme Corp (Pilot)", status="onboarded",
        tier="enterprise", services_connected=12, total_services=14,
        policies_active=8, incidents_last_7d=3, autonomy_rate=76.5,
        readiness_checks={
            "webhook_configured": True, "policies_defined": True,
            "team_onboarded": True, "canary_enabled": True,
            "alert_integration": True,
        },
    ),
    TenantOnboarding(
        id="TN-BETA01", name="BetaTech Solutions", status="active",
        tier="standard", services_connected=5, total_services=8,
        policies_active=3, incidents_last_7d=5, autonomy_rate=62.0,
        readiness_checks={
            "webhook_configured": True, "policies_defined": True,
            "team_onboarded": False, "canary_enabled": False,
            "alert_integration": True,
        },
    ),
    TenantOnboarding(
        id="TN-GAMMA01", name="Gamma Robotics", status="pending",
        tier="standard", services_connected=2, total_services=6,
        policies_active=1, incidents_last_7d=0, autonomy_rate=45.0,
        readiness_checks={
            "webhook_configured": False, "policies_defined": False,
            "team_onboarded": False, "canary_enabled": False,
            "alert_integration": False,
        },
    ),
    TenantOnboarding(
        id="TN-DELTA01", name="DeltaFlow.io", status="onboarding",
        tier="enterprise", services_connected=8, total_services=14,
        policies_active=5, incidents_last_7d=2, autonomy_rate=58.0,
        readiness_checks={
            "webhook_configured": True, "policies_defined": True,
            "team_onboarded": True, "canary_enabled": False,
            "alert_integration": True,
        },
    ),
]

for t in SEED_TENANTS:
    _tenants[t.id] = t


# ---------------------------------------------------------------------------
# Routes — KPIs
# ---------------------------------------------------------------------------

@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard():
    """Return the full aggregated pilot dashboard with KPIs, services, and tenant data."""
    now = datetime.now(timezone.utc)

    # Simulated KPIs
    kpis = [
        KpiMetric(name="uptime", display_name="System Uptime", value=99.97, unit="%", target=99.9, trend="stable", status="healthy", description="Overall system uptime over last 30 days"),
        KpiMetric(name="mttr", display_name="Mean Time to Resolve", value=12.4, unit="min", target=15.0, trend="falling", status="healthy", description="Average time from detection to mitigation"),
        KpiMetric(name="mttd", display_name="Mean Time to Detect", value=3.2, unit="min", target=5.0, trend="falling", status="healthy", description="Average time from incident start to detection"),
        KpiMetric(name="cfr", display_name="Change Failure Rate", value=4.8, unit="%", target=10.0, trend="falling", status="healthy", description="Percentage of changes resulting in degraded service"),
        KpiMetric(name="deployment_frequency", display_name="Daily Deployments", value=24.0, unit="deploys/day", target=20.0, trend="rising", status="healthy", description="Average number of deployments per day"),
        KpiMetric(name="coverage", display_name="Service Coverage", value=78.0, unit="%", target=90.0, trend="rising", status="warning", description="Percentage of services under autonomous management"),
    ]

    # Simulated service health
    services = [
        ServiceHealth(name="api-gateway", status="healthy", uptime_pct=99.99, p99_latency_ms=45, error_rate_pct=0.02),
        ServiceHealth(name="billing-svc", status="healthy", uptime_pct=99.95, p99_latency_ms=120, error_rate_pct=0.15),
        ServiceHealth(name="ml-inference", status="degraded", uptime_pct=98.50, p99_latency_ms=890, error_rate_pct=2.3, last_incident="INC-2846", last_incident_at=now - timedelta(hours=4)),
        ServiceHealth(name="search-svc", status="healthy", uptime_pct=99.91, p99_latency_ms=210, error_rate_pct=0.08),
        ServiceHealth(name="ledger-svc", status="healthy", uptime_pct=99.97, p99_latency_ms=67, error_rate_pct=0.01),
        ServiceHealth(name="notification-svc", status="healthy", uptime_pct=99.99, p99_latency_ms=30, error_rate_pct=0.0),
        ServiceHealth(name="auth-svc", status="healthy", uptime_pct=99.99, p99_latency_ms=25, error_rate_pct=0.0),
    ]

    # Simulated autonomy metrics
    autonomy_metrics = [
        AutonomyMetric(name="autonomy_rate", value=72.4, unit="%", baseline=45.0, improvement_pct=60.9, status="healthy"),
        AutonomyMetric(name="auto_resolution_rate", value=64.8, unit="%", baseline=30.0, improvement_pct=116.0, status="healthy"),
        AutonomyMetric(name="human_override_rate", value=12.3, unit="%", baseline=25.0, improvement_pct=-50.8, status="healthy"),
        AutonomyMetric(name="decision_accuracy", value=91.2, unit="%", baseline=80.0, improvement_pct=14.0, status="healthy"),
        AutonomyMetric(name="rollback_success_rate", value=94.7, unit="%", baseline=85.0, improvement_pct=11.4, status="healthy"),
        AutonomyMetric(name="policy_violation_prevention", value=156, unit="count", baseline=0, improvement_pct=100.0, status="healthy"),
    ]

    # Aggregate
    healthy_count = sum(1 for s in services if s.status == "healthy")
    overall_health_score = round((healthy_count / len(services)) * 100, 1)

    return DashboardResponse(
        kpis=kpis,
        services=services,
        autonomy_metrics=autonomy_metrics,
        tenants=list(_tenants.values()),
        overall_health_score=overall_health_score,
        active_incidents=sum(1 for t in _tenants.values() for _ in [1] if t.incidents_last_7d > 0),
        total_decisions_24h=random.randint(80, 150),
        autonomy_rate_24h=round(random.uniform(65.0, 82.0), 1),
    )


@router.get("/kpis", response_model=List[KpiMetric])
def get_kpis():
    """Return current KPI metrics."""
    now = datetime.now(timezone.utc)
    return [
        KpiMetric(name="uptime", display_name="System Uptime", value=99.97, unit="%", target=99.9, trend="stable", status="healthy"),
        KpiMetric(name="mttr", display_name="Mean Time to Resolve", value=12.4, unit="min", target=15.0, trend="falling", status="healthy"),
        KpiMetric(name="mttd", display_name="Mean Time to Detect", value=3.2, unit="min", target=5.0, trend="falling", status="healthy"),
        KpiMetric(name="cfr", display_name="Change Failure Rate", value=4.8, unit="%", target=10.0, trend="falling", status="healthy"),
    ]


@router.get("/services", response_model=List[ServiceHealth])
def get_service_health():
    """Return service health statuses."""
    return [
        ServiceHealth(name="api-gateway", status="healthy", uptime_pct=99.99, p99_latency_ms=45, error_rate_pct=0.02),
        ServiceHealth(name="billing-svc", status="healthy", uptime_pct=99.95, p99_latency_ms=120, error_rate_pct=0.15),
        ServiceHealth(name="ml-inference", status="degraded", uptime_pct=98.50, p99_latency_ms=890, error_rate_pct=2.3),
        ServiceHealth(name="search-svc", status="healthy", uptime_pct=99.91, p99_latency_ms=210, error_rate_pct=0.08),
        ServiceHealth(name="ledger-svc", status="healthy", uptime_pct=99.97, p99_latency_ms=67, error_rate_pct=0.01),
        ServiceHealth(name="notification-svc", status="healthy", uptime_pct=99.99, p99_latency_ms=30, error_rate_pct=0.0),
        ServiceHealth(name="auth-svc", status="healthy", uptime_pct=99.99, p99_latency_ms=25, error_rate_pct=0.0),
    ]


# ---------------------------------------------------------------------------
# Routes — Autonomy Metrics
# ---------------------------------------------------------------------------

@router.get("/metrics/autonomy", response_model=List[AutonomyMetric])
def get_autonomy_metrics():
    """Return autonomy KPIs."""
    return [
        AutonomyMetric(name="autonomy_rate", value=72.4, unit="%", baseline=45.0, improvement_pct=60.9, status="healthy"),
        AutonomyMetric(name="auto_resolution_rate", value=64.8, unit="%", baseline=30.0, improvement_pct=116.0, status="healthy"),
        AutonomyMetric(name="human_override_rate", value=12.3, unit="%", baseline=25.0, improvement_pct=-50.8, status="healthy"),
        AutonomyMetric(name="decision_accuracy", value=91.2, unit="%", baseline=80.0, improvement_pct=14.0, status="healthy"),
    ]


# ---------------------------------------------------------------------------
# Routes — Tenants
# ---------------------------------------------------------------------------

@router.get("/tenants", response_model=List[TenantOnboarding])
def list_tenants(status: Optional[str] = None, limit: int = 50, offset: int = 0):
    """List all pilot tenants with optional status filter."""
    tenants = list(_tenants.values())
    if status:
        tenants = [t for t in tenants if t.status == status]
    return tenants[offset:offset + limit]


@router.get("/tenants/{tenant_id}", response_model=Optional[TenantOnboarding])
def get_tenant(tenant_id: str):
    """Get a specific tenant's onboarding details."""
    return _tenants.get(tenant_id)


@router.post("/tenants", response_model=TenantOnboarding)
def create_tenant(tenant: TenantOnboarding):
    """Register a new pilot tenant."""
    if tenant.id in _tenants:
        raise HTTPException(status_code=409, detail=f"Tenant '{tenant.id}' already exists")
    _tenants[tenant.id] = tenant
    return tenant


@router.put("/tenants/{tenant_id}/readiness", response_model=TenantOnboarding)
def update_readiness_check(tenant_id: str, checks: Dict[str, bool]):
    """Update readiness checklist for a tenant."""
    if tenant_id not in _tenants:
        raise HTTPException(status_code=404, detail=f"Tenant '{tenant_id}' not found")
    tenant = _tenants[tenant_id]
    for key, value in checks.items():
        if key in tenant.readiness_checks:
            tenant.readiness_checks[key] = value
    # Auto-upgrade status if all checks pass
    if all(tenant.readiness_checks.values()):
        tenant.status = "onboarded"
    return tenant
