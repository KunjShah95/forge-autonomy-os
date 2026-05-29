"""
Action policy engine (B-009).

Enforces action classes (A = suggest, B = approval, C = auto-execute)
based on blast radius, risk score, and confidence thresholds.
"""

from typing import List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter
from datetime import datetime

router = APIRouter(prefix="/api/v1", tags=["Policy"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class PolicyEvaluationRequest(BaseModel):
    action: str
    service: str
    risk_score: int = Field(..., ge=0, le=100)
    confidence: float = Field(..., ge=0.0, le=1.0)
    blast_radius: str = "low"  # low | medium | high | critical
    trace_id: str = ""


class PolicyEvaluationResult(BaseModel):
    trace_id: str
    action_class: str  # A | B | C
    allowed: bool
    requires_approval: bool
    reason: str
    conditions: List[str] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Classification rules
# ---------------------------------------------------------------------------

def _get_blast_weight(blast_radius: str) -> int:
    mapping = {
        "low": 10,
        "medium": 30,
        "high": 60,
        "critical": 90,
    }
    return mapping.get(blast_radius, 10)


def evaluate_policy(req: PolicyEvaluationRequest) -> PolicyEvaluationResult:
    """
    Evaluate an action against the policy engine.

    Class A (Suggest Only): High risk, low confidence, or critical blast radius.
    Class B (Approval Required): Medium risk, moderate confidence, or high blast radius.
    Class C (Auto Execute): Low risk, high confidence, bounded impact.
    """
    blast_weight = _get_blast_weight(req.blast_radius)
    effective_risk = (req.risk_score + blast_weight) // 2
    conditions = []

    # Class A — Suggest Only
    if effective_risk >= 70 or req.confidence < 0.6 or req.blast_radius == "critical":
        conditions.append("effective_risk >= 70 or confidence < 0.6 or blast_radius == critical")
        return PolicyEvaluationResult(
            trace_id=req.trace_id,
            action_class="A",
            allowed=True,
            requires_approval=True,
            reason=f"Class A (Suggest Only): Action requires human review. Effective risk {effective_risk}, confidence {req.confidence}.",
            conditions=conditions,
        )

    # Class B — Approval Required
    if effective_risk >= 40 or req.confidence < 0.8 or req.blast_radius in ("high", "medium"):
        conditions.append("effective_risk >= 40 or confidence < 0.8 or blast_radius in [high, medium]")
        return PolicyEvaluationResult(
            trace_id=req.trace_id,
            action_class="B",
            allowed=True,
            requires_approval=True,
            reason=f"Class B (Approval Required): Non-trivial change. Effective risk {effective_risk}. Approval needed before execution.",
            conditions=conditions,
        )

    # Class C — Auto Execute
    conditions.append("effective_risk < 40 and confidence >= 0.8 and blast_radius == low")
    return PolicyEvaluationResult(
        trace_id=req.trace_id,
        action_class="C",
        allowed=True,
        requires_approval=False,
        reason=f"Class C (Auto Execute): Low-risk bounded action. Effective risk {effective_risk}. Executing autonomously.",
        conditions=conditions,
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/policy/evaluate", response_model=PolicyEvaluationResult)
def evaluate_action_policy(req: PolicyEvaluationRequest):
    """Evaluate an action against the A/B/C policy engine."""
    return evaluate_policy(req)
