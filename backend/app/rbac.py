"""
Multi-tenant RBAC baseline (B-017).

Role-based access control with tenant isolation,
role checks on action execution, and admin audit export.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Header, Depends
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/api/v1", tags=["RBAC"])


# ---------------------------------------------------------------------------
# RBAC models
# ---------------------------------------------------------------------------

class User(BaseModel):
    id: str
    username: str
    organization: str = ""
    roles: List[str] = Field(default_factory=list)  # admin | engineer | viewer | operator


class RoleCheckRequest(BaseModel):
    user_id: str
    action: str
    resource: str
    organization: str = ""
    trace_id: str = ""


class RoleCheckResult(BaseModel):
    allowed: bool
    user_id: str
    organization: str
    role: str = ""
    reason: str = ""
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Permission(BaseModel):
    role: str
    permissions: List[str] = Field(default_factory=list)


class TenantInfo(BaseModel):
    organization: str
    users: List[User] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# Permission matrix
# ---------------------------------------------------------------------------

ROLE_PERMISSIONS: Dict[str, List[str]] = {
    "admin": [
        "action:*",
        "deploy:*",
        "policy:manage",
        "incidents:manage",
        "audit:export",
        "settings:manage",
        "rbac:manage",
    ],
    "operator": [
        "action:class_b",
        "action:class_c",
        "deploy:canary",
        "deploy:rollback",
        "incidents:view",
        "incidents:resolve",
    ],
    "engineer": [
        "action:class_c",
        "incidents:view",
        "deploy:view",
        "analytics:view",
    ],
    "viewer": [
        "dashboard:view",
        "incidents:view",
        "analytics:view",
        "deploy:view",
    ],
}

# Seed tenant
_tenants: Dict[str, TenantInfo] = {
    "forge": TenantInfo(
        organization="forge",
        users=[
            User(id="admin-1", username="alice", organization="forge", roles=["admin"]),
            User(id="op-1", username="bob", organization="forge", roles=["operator"]),
            User(id="eng-1", username="charlie", organization="forge", roles=["engineer"]),
            User(id="view-1", username="dave", organization="forge", roles=["viewer"]),
        ],
    ),
}


def _check_permission(user_roles: List[str], action: str, resource: str) -> tuple:
    """Check if any of the user's roles grant the requested action/resource."""
    for role in user_roles:
        permissions = ROLE_PERMISSIONS.get(role, [])
        for perm in permissions:
            # Support wildcard matching
            perm_parts = perm.split(":")
            req_parts = f"{action}:{resource}".split(":")
            if len(perm_parts) == len(req_parts):
                if all(p == "*" or p == r for p, r in zip(perm_parts, req_parts)):
                    return True, role
    return False, ""


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/rbac/check", response_model=RoleCheckResult)
def check_role_access(req: RoleCheckRequest):
    """Check if a user has permission to perform an action on a resource."""
    tenant = _tenants.get(req.organization)
    if not tenant:
        return RoleCheckResult(
            allowed=False,
            user_id=req.user_id,
            organization=req.organization,
            role="",
            reason=f"Organization '{req.organization}' not found",
        )

    user = next((u for u in tenant.users if u.id == req.user_id), None)
    if not user:
        return RoleCheckResult(
            allowed=False,
            user_id=req.user_id,
            organization=req.organization,
            role="",
            reason=f"User '{req.user_id}' not found in organization",
        )

    allowed, role = _check_permission(user.roles, req.action, req.resource)
    if allowed:
        return RoleCheckResult(
            allowed=True,
            user_id=req.user_id,
            organization=req.organization,
            role=role,
            reason=f"User has role '{role}' with required permission",
        )
    else:
        return RoleCheckResult(
            allowed=False,
            user_id=req.user_id,
            organization=req.organization,
            role=user.roles[0] if user.roles else "",
            reason=f"User role(s) {user.roles} do not grant permission for '{req.action}:{req.resource}'",
        )


@router.get("/rbac/roles", response_model=Dict[str, List[str]])
def list_roles():
    """List all RBAC roles and their permissions."""
    return ROLE_PERMISSIONS


@router.get("/rbac/tenants", response_model=List[TenantInfo])
def list_tenants():
    """List all tenants (admin only in production)."""
    return list(_tenants.values())


@router.get("/rbac/audit/export", response_model=List[Dict[str, Any]])
def export_audit_log():
    """Export full audit log (admin only in production)."""
    from .api import audit_db
    return [
        {
            "trace_id": a.trace_id,
            "status": a.status,
            "event_count": len(a.events),
            "decision_count": len(a.decisions),
            "outcome": a.outcome,
            "timestamp": a.timestamp.isoformat(),
        }
        for a in audit_db.values()
    ]
