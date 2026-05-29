"""
Policy-as-code framework (ROADMAP Milestone 6).

Formal YAML/JSON-based policy definition framework with
file-based persistence and evaluation engine.

Policies define:
- Which action classes are allowed for which services
- Blast-radius thresholds per environment
- Approval requirements and auto-approval conditions
- Override rules and exceptions
"""

import json
import os
import re
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException
from datetime import datetime

router = APIRouter(prefix="/api/v1/policy", tags=["Policy-as-Code"])


# ---------------------------------------------------------------------------
# Policy Definition Schema
# ---------------------------------------------------------------------------

class PolicyCondition(BaseModel):
    """A single condition in a policy rule."""
    field: str  # e.g. "risk_score", "blast_radius", "service", "confidence"
    operator: str  # gt | gte | lt | lte | eq | neq | in | contains | matches
    value: Any


class PolicyRule(BaseModel):
    """A single policy rule with conditions and outcome."""
    name: str
    description: str = ""
    conditions: List[PolicyCondition] = Field(default_factory=list)
    action_class: str  # A | B | C
    allowed: bool = True
    requires_approval: bool = True
    priority: int = 50  # Higher priority rules are evaluated first
    auto_approve_conditions: List[PolicyCondition] = Field(default_factory=list)


class PolicyDefinition(BaseModel):
    """A complete policy definition."""
    name: str
    version: str = "1.0.0"
    description: str = ""
    enabled: bool = True
    applies_to: List[str] = Field(default_factory=list)  # services, "*" for all
    environments: List[str] = Field(default_factory=list)  # ["production", "staging"]
    rules: List[PolicyRule] = Field(default_factory=list)
    default_action_class: str = "B"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PolicyStore(BaseModel):
    """In-memory + file-backed policy store."""
    policies: Dict[str, PolicyDefinition] = Field(default_factory=dict)
    file_path: str = "./policies/"


# ---------------------------------------------------------------------------
# Policy evaluation engine
# ---------------------------------------------------------------------------

def _evaluate_condition(condition: PolicyCondition, context: Dict[str, Any]) -> bool:
    """Evaluate a single condition against the provided context."""
    field_value = context.get(condition.field)
    target = condition.value

    if condition.operator == "gt":
        return field_value is not None and float(field_value) > float(target)
    elif condition.operator == "gte":
        return field_value is not None and float(field_value) >= float(target)
    elif condition.operator == "lt":
        return field_value is not None and float(field_value) < float(target)
    elif condition.operator == "lte":
        return field_value is not None and float(field_value) <= float(target)
    elif condition.operator == "eq":
        return field_value == target
    elif condition.operator == "neq":
        return field_value != target
    elif condition.operator == "in":
        return field_value in target if isinstance(target, list) else field_value == target
    elif condition.operator == "contains":
        return target in str(field_value) if field_value else False
    elif condition.operator == "matches":
        return bool(re.search(str(target), str(field_value), re.IGNORECASE)) if field_value else False
    return False


def evaluate_policy_rules(
    policy: PolicyDefinition,
    context: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Evaluate a policy against a given context.
    
    Returns the matched rule's outcome or the default action class.
    """
    # Sort rules by priority (highest first)
    sorted_rules = sorted(policy.rules, key=lambda r: r.priority, reverse=True)

    for rule in sorted_rules:
        # Check if all conditions match
        all_match = all(
            _evaluate_condition(c, context) for c in rule.conditions
        )
        if all_match:
            # Check auto-approve conditions
            auto_approve = all(
                _evaluate_condition(c, context) for c in rule.auto_approve_conditions
            ) if rule.auto_approve_conditions else False

            return {
                "matched_rule": rule.name,
                "action_class": rule.action_class,
                "allowed": rule.allowed,
                "requires_approval": rule.requires_approval and not auto_approve,
                "auto_approved": auto_approve,
                "description": rule.description,
            }

    # No rule matched — use default
    return {
        "matched_rule": "default",
        "action_class": policy.default_action_class,
        "allowed": True,
        "requires_approval": policy.default_action_class != "C",
        "auto_approved": False,
        "description": f"Default policy action class: {policy.default_action_class}",
    }


# ---------------------------------------------------------------------------
# In-memory policy store with seed data
# ---------------------------------------------------------------------------

_policy_store = PolicyStore()

# Seed default policies
SEED_POLICIES = {
    "production-safety": PolicyDefinition(
        name="production-safety",
        version="1.0.0",
        description="Production safety gates — high-risk actions require human approval",
        enabled=True,
        applies_to=["*"],
        environments=["production"],
        rules=[
            PolicyRule(
                name="high-risk-auto-approve",
                description="Low blast-radius, high-confidence actions can auto-execute",
                priority=90,
                conditions=[
                    PolicyCondition(field="blast_radius", operator="eq", value="low"),
                    PolicyCondition(field="confidence", operator="gte", value=0.85),
                    PolicyCondition(field="risk_score", operator="lt", value=30),
                ],
                action_class="C",
                allowed=True,
                requires_approval=False,
            ),
            PolicyRule(
                name="medium-risk-approval",
                description="Medium-risk changes require operator approval",
                priority=70,
                conditions=[
                    PolicyCondition(field="blast_radius", operator="in", value=["low", "medium"]),
                    PolicyCondition(field="risk_score", operator="lt", value=60),
                ],
                action_class="B",
                allowed=True,
                requires_approval=True,
            ),
            PolicyRule(
                name="high-risk-block",
                description="High-risk or critical changes are blocked without full review",
                priority=50,
                conditions=[
                    PolicyCondition(field="risk_score", operator="gte", value=60),
                ],
                action_class="A",
                allowed=False,
                requires_approval=True,
            ),
        ],
        default_action_class="B",
    ),
    "payment-services": PolicyDefinition(
        name="payment-services",
        version="1.0.0",
        description="Strict policy for payment-related services",
        enabled=True,
        applies_to=["billing-svc", "ledger-svc"],
        environments=["production", "staging"],
        rules=[
            PolicyRule(
                name="payment-auto-reject",
                description="Auto-deploy to payment services is never allowed",
                priority=100,
                conditions=[
                    PolicyCondition(field="action", operator="matches", value="deploy|auto-deploy"),
                ],
                action_class="A",
                allowed=False,
                requires_approval=True,
            ),
            PolicyRule(
                name="payment-canary-allowed",
                description="Canary deploys allowed with operator approval",
                priority=80,
                conditions=[
                    PolicyCondition(field="action", operator="contains", value="canary"),
                    PolicyCondition(field="blast_radius", operator="in", value=["low", "medium"]),
                ],
                action_class="B",
                allowed=True,
                requires_approval=True,
            ),
        ],
        default_action_class="A",
    ),
}

for name, policy in SEED_POLICIES.items():
    _policy_store.policies[name] = policy


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/policies", response_model=List[PolicyDefinition])
def list_policies(enabled_only: bool = False):
    """List all defined policies."""
    policies = list(_policy_store.policies.values())
    if enabled_only:
        policies = [p for p in policies if p.enabled]
    return policies


@router.get("/policies/{name}", response_model=Optional[PolicyDefinition])
def get_policy(name: str):
    """Get a specific policy definition by name."""
    return _policy_store.policies.get(name)


@router.post("/policies", response_model=PolicyDefinition)
def create_policy(policy: PolicyDefinition):
    """Create a new policy definition."""
    if policy.name in _policy_store.policies:
        raise HTTPException(status_code=409, detail=f"Policy '{policy.name}' already exists")
    policy.created_at = datetime.utcnow()
    policy.updated_at = datetime.utcnow()
    _policy_store.policies[policy.name] = policy
    return policy


@router.put("/policies/{name}", response_model=PolicyDefinition)
def update_policy(name: str, policy: PolicyDefinition):
    """Update an existing policy definition."""
    if name not in _policy_store.policies:
        raise HTTPException(status_code=404, detail=f"Policy '{name}' not found")
    policy.updated_at = datetime.utcnow()
    _policy_store.policies[name] = policy
    return policy


@router.delete("/policies/{name}")
def delete_policy(name: str):
    """Delete a policy definition."""
    if name not in _policy_store.policies:
        raise HTTPException(status_code=404, detail=f"Policy '{name}' not found")
    del _policy_store.policies[name]
    return {"status": "deleted", "name": name}


@router.post("/evaluate", response_model=Dict[str, Any])
def evaluate_action_policy(req: Dict[str, Any]):
    """
    Evaluate an action against all applicable policies.
    
    Request body should include:
    - action: the action being evaluated
    - service: the target service
    - environment: the deployment environment
    - risk_score: numerical risk score
    - confidence: confidence level (0-1)
    - blast_radius: low|medium|high|critical
    - trace_id: optional trace ID
    """
    context = {**req}
    service = req.get("service", "*")
    environment = req.get("environment", "production")

    # Find applicable policies
    applicable = []
    for policy in _policy_store.policies.values():
        if not policy.enabled:
            continue
        if environment not in policy.environments and "*" not in policy.environments:
            continue
        if "*" in policy.applies_to or service in policy.applies_to:
            applicable.append(policy)

    if not applicable:
        return {
            "matched_policy": "none",
            "action_class": "B",
            "allowed": True,
            "requires_approval": True,
            "auto_approved": False,
            "description": "No applicable policy found. Defaulting to Class B.",
        }

    # Evaluate each applicable policy and take the most restrictive result
    results = []
    for policy in applicable:
        result = evaluate_policy_rules(policy, context)
        result["policy_name"] = policy.name
        results.append(result)

    # Most restrictive wins: Class A > B > C, then not allowed > allowed
    def restrictiveness(r):
        class_order = {"A": 3, "B": 2, "C": 1}
        return (class_order.get(r.get("action_class", "B"), 2), 0 if r.get("allowed", True) else 1)

    results.sort(key=restrictiveness, reverse=True)
    final = results[0]

    return {
        "matched_policy": final.get("policy_name", "none"),
        "matched_rule": final.get("matched_rule", "default"),
        "action_class": final.get("action_class", "B"),
        "allowed": final.get("allowed", True),
        "requires_approval": final.get("requires_approval", True),
        "auto_approved": final.get("auto_approved", False),
        "policies_evaluated": len(applicable),
        "description": final.get("description", ""),
    }
