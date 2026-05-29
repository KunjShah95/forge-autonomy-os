"""
Architecture guardian checks (B-013).

Detects service boundary violations, risky coupling patterns,
and dependency cycles in the service graph.
"""

from typing import Dict, Any, List, Optional, Tuple
from pydantic import BaseModel, Field
from fastapi import APIRouter
from datetime import datetime, timezone

router = APIRouter(prefix="/api/v1", tags=["Guardian"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class GuardianCheckRequest(BaseModel):
    service: str = ""
    trace_id: str = ""


class Finding(BaseModel):
    severity: str  # blocking | warning | info
    category: str  # boundary | coupling | cycle | tech_debt
    title: str
    description: str
    remediation: str = ""
    score: int = Field(default=50, ge=0, le=100)


class GuardianCheckResult(BaseModel):
    trace_id: str
    findings: List[Finding] = Field(default_factory=list)
    overall_health_score: int = Field(default=100, ge=0, le=100)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# Knowledge base — service boundaries, coupling rules
# ---------------------------------------------------------------------------

# Service teams/domains for boundary checks
SERVICE_DOMAINS = {
    "api-gateway": "platform",
    "auth-svc": "identity",
    "users-svc": "identity",
    "billing-svc": "payments",
    "ledger-svc": "payments",
    "orders-svc": "commerce",
    "search-svc": "discovery",
    "ml-inference": "ai-platform",
    "redis-cluster": "platform",
}

# Known dependency edges (source -> [targets])
KNOWN_DEPENDENCIES: Dict[str, List[str]] = {
    "api-gateway": ["auth-svc", "users-svc", "billing-svc", "orders-svc"],
    "auth-svc": ["users-svc", "redis-cluster"],
    "users-svc": ["orders-svc", "search-svc", "redis-cluster"],
    "billing-svc": ["ledger-svc", "redis-cluster"],
    "orders-svc": ["ledger-svc", "search-svc"],
    "search-svc": ["ml-inference"],
    "ml-inference": [],
    "ledger-svc": [],
    "redis-cluster": [],
}

# Cross-domain allowed edges
CROSS_DOMAIN_ALLOWLIST = {
    ("platform", "identity"): True,
    ("platform", "payments"): True,
    ("platform", "commerce"): True,
    ("platform", "discovery"): True,
    ("identity", "commerce"): True,
    ("identity", "discovery"): True,
    ("payments", "payments"): True,
    ("commerce", "payments"): False,  # commerce -> payments = violation
    ("commerce", "discovery"): True,
    ("discovery", "ai-platform"): True,
}


def _detect_boundary_violations() -> List[Finding]:
    """Check for cross-domain dependencies that aren't allowed."""
    findings = []
    for src, targets in KNOWN_DEPENDENCIES.items():
        src_domain = SERVICE_DOMAINS.get(src, "unknown")
        for tgt in targets:
            tgt_domain = SERVICE_DOMAINS.get(tgt, "unknown")
            if src_domain != tgt_domain:
                allowed = CROSS_DOMAIN_ALLOWLIST.get((src_domain, tgt_domain), False)
                if not allowed:
                    findings.append(Finding(
                        severity="warning",
                        category="boundary",
                        title=f"Cross-domain dependency: {src} → {tgt}",
                        description=f"Service '{src}' ({src_domain}) depends on '{tgt}' ({tgt_domain}) which crosses domain boundaries without explicit approval.",
                        remediation=f"Consider extracting shared logic into a platform library or marking {src_domain}→{tgt_domain} as explicitly allowed.",
                        score=65,
                    ))
    return findings


def _detect_coupling_risks() -> List[Finding]:
    """Detect high-fan-in/fan-out services and tight coupling."""
    findings = []
    fan_in: Dict[str, int] = {}
    for src, targets in KNOWN_DEPENDENCIES.items():
        for tgt in targets:
            fan_in[tgt] = fan_in.get(tgt, 0) + 1

    # High fan-in = bottleneck risk
    for svc, count in fan_in.items():
        if count >= 3:
            findings.append(Finding(
                severity="warning",
                category="coupling",
                title=f"High fan-in: {svc} ({count} dependents)",
                description=f"Service '{svc}' is depended on by {count} upstream services. This creates a single point of failure and tight coupling.",
                remediation=f"Consider adding a facade layer or event-driven decoupling for {svc} to reduce direct coupling.",
                score=min(50 + count * 15, 90),
            ))

    return findings


def _detect_cycles() -> List[Finding]:
    """Detect circular dependencies in the service graph."""
    findings = []
    visited: set = set()
    path: set = set()

    def dfs(node: str, path: set) -> Optional[List[str]]:
        if node in path:
            return list(path)
        if node in visited:
            return None
        visited.add(node)
        path.add(node)
        for neighbor in KNOWN_DEPENDENCIES.get(node, []):
            result = dfs(neighbor, path)
            if result:
                return result
        path.remove(node)
        return None

    for svc in KNOWN_DEPENDENCIES:
        cycle = dfs(svc, set())
        if cycle:
            cycle_str = " → ".join(cycle)
            findings.append(Finding(
                severity="blocking" if svc in ("billing-svc", "orders-svc") else "warning",
                category="cycle",
                title=f"Circular dependency detected: {svc}",
                description=f"Cycle found: {cycle_str}. Circular dependencies prevent independent deployment and can cause cascading failures.",
                remediation="Break the cycle by extracting shared logic into a new service or using event-driven communication.",
                score=85,
            ))
            break  # Report one cycle at a time

    return findings


def _detect_tech_debt() -> List[Finding]:
    """Detect tech debt signals from service health and dependency patterns."""
    findings = []
    # Services with high fan-out
    for svc, targets in KNOWN_DEPENDENCIES.items():
        if len(targets) >= 3:
            findings.append(Finding(
                severity="info",
                category="tech_debt",
                title=f"High fan-out: {svc} depends on {len(targets)} services",
                description=f"Service '{svc}' directly depends on {len(targets)} downstream services, increasing failure blast radius.",
                remediation="Consider using an API gateway aggregation pattern or client-side load balancing.",
                score=45,
            ))
    return findings


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/guardian/check", response_model=GuardianCheckResult)
def run_guardian_checks(req: GuardianCheckRequest):
    """Run architecture guardian checks on the service graph."""
    findings: List[Finding] = []
    findings.extend(_detect_boundary_violations())
    findings.extend(_detect_coupling_risks())
    findings.extend(_detect_cycles())
    findings.extend(_detect_tech_debt())

    # Filter by service if specified
    if req.service:
        findings = [f for f in findings if req.service in f.title]

    # Calculate overall health score
    if not findings:
        health_score = 100
    else:
        avg_score = sum(f.score for f in findings) / len(findings)
        health_score = max(0, 100 - int(avg_score * 0.5))

    return GuardianCheckResult(
        trace_id=req.trace_id,
        findings=findings,
        overall_health_score=health_score,
    )
