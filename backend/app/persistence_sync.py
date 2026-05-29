"""
Persistence Sync Adapter — wires in-memory stores to SQLite persistence.

Each module's in-memory store calls the corresponding sync function after
mutations. On startup, stores are populated from SQLite if available.

This minimizes risk by keeping existing in-memory logic intact while adding
data durability. Falls back gracefully if SQLite is unavailable.
"""

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from .persistence import DB_AVAILABLE, persist_event, persist_decision, persist_incident
from .persistence import persist_policy_rule, persist_workflow, persist_blocker, persist_tenant
from .persistence import get_events as db_get_events
from .persistence import get_decisions as db_get_decisions
from .persistence import get_incidents as db_get_incidents
from .persistence import get_policy_rules, get_workflows, get_blockers, get_tenants
from .persistence import get_row, delete_row, upsert, count_rows, list_rows


# ---------------------------------------------------------------------------
# Sync wrappers — called after in-memory mutations
# ---------------------------------------------------------------------------


def sync_event(trace_id: str, source: str, event_type: str, payload: dict) -> bool:
    """Persist an event to SQLite. Returns True if persisted."""
    if not DB_AVAILABLE:
        return False
    try:
        persist_event(trace_id, source, event_type, payload)
        return True
    except Exception:
        return False


def sync_decision(decision: Any) -> bool:
    """Persist a decision to SQLite."""
    if not DB_AVAILABLE:
        return False
    try:
        if hasattr(decision, "model_dump"):
            d = decision.model_dump()
        elif hasattr(decision, "dict"):
            d = decision.dict()
        else:
            d = decision
        persist_decision(d)
        return True
    except Exception:
        return False


def sync_incident(incident: Any) -> bool:
    """Persist an incident to SQLite."""
    if not DB_AVAILABLE:
        return False
    try:
        if hasattr(incident, "model_dump"):
            d = incident.model_dump()
        elif hasattr(incident, "dict"):
            d = incident.dict()
        else:
            d = incident
        # Add timestamp defaults
        if "created_at" not in d or not d["created_at"]:
            d["created_at"] = datetime.now(timezone.utc).isoformat()
        persist_incident(d)
        return True
    except Exception:
        return False


def sync_policy(name: str, definition: Any, enabled: bool = True) -> bool:
    """Persist a policy rule to SQLite."""
    if not DB_AVAILABLE:
        return False
    try:
        if hasattr(definition, "model_dump"):
            d = definition.model_dump()
        elif hasattr(definition, "dict"):
            d = definition.dict()
        else:
            d = definition
        persist_policy_rule(name, d, enabled)
        return True
    except Exception:
        return False


def sync_workflow(wf_id: str, name: str, definition: Any) -> bool:
    """Persist a workflow definition to SQLite."""
    if not DB_AVAILABLE:
        return False
    try:
        if hasattr(definition, "model_dump"):
            d = definition.model_dump()
        elif hasattr(definition, "dict"):
            d = definition.dict()
        else:
            d = definition
        persist_workflow(wf_id, name, d)
        return True
    except Exception:
        return False


def sync_blocker(blocker: Any) -> bool:
    """Persist a blocker to SQLite."""
    if not DB_AVAILABLE:
        return False
    try:
        if hasattr(blocker, "model_dump"):
            d = blocker.model_dump()
        elif hasattr(blocker, "dict"):
            d = blocker.dict()
        else:
            d = blocker
        persist_blocker(d)
        return True
    except Exception:
        return False


def sync_tenant(tenant: Any) -> bool:
    """Persist a tenant to SQLite."""
    if not DB_AVAILABLE:
        return False
    try:
        if hasattr(tenant, "model_dump"):
            d = tenant.model_dump()
        elif hasattr(tenant, "dict"):
            d = tenant.dict()
        else:
            d = tenant
        persist_tenant(d)
        return True
    except Exception:
        return False


def sync_canary_status(canary_id: str, service: str, data: Any) -> bool:
    """Persist a canary status to SQLite."""
    if not DB_AVAILABLE:
        return False
    try:
        if hasattr(data, "model_dump"):
            serialized = data.model_dump()
        elif hasattr(data, "dict"):
            serialized = data.dict()
        else:
            serialized = data
        upsert("canary_runs", "id", canary_id, "data", serialized)
        return True
    except Exception:
        return False


def sync_chaos_fault(fault_id: str, service: str, data: Any) -> bool:
    """Persist a chaos fault to SQLite."""
    if not DB_AVAILABLE:
        return False
    try:
        if hasattr(data, "model_dump"):
            serialized = data.model_dump()
        elif hasattr(data, "dict"):
            serialized = data.dict()
        else:
            serialized = data
        upsert("chaos_faults", "id", fault_id, "data", serialized)
        return True
    except Exception:
        return False


def sync_remediation_template(name: str, template_content: str, version: str = "1.0.0") -> bool:
    """Persist a remediation template to SQLite."""
    if not DB_AVAILABLE:
        return False
    try:
        from .persistence import get_db
        with get_db() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO remediation_templates (name, template, version, updated_at) VALUES (?, ?, ?, datetime('now'))",
                (name, template_content, version),
            )
        return True
    except Exception:
        return False


def sync_quarantine_rule(name: str, config: dict) -> bool:
    """Persist a quarantine rule to SQLite."""
    if not DB_AVAILABLE:
        return False
    try:
        from .persistence import get_db
        with get_db() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO quarantine_rules (name, config) VALUES (?, ?)",
                (name, json.dumps(config)),
            )
        return True
    except Exception:
        return False


def sync_quarantine_test(test_name: str, rule_applied: str, status: str = "quarantined") -> bool:
    """Persist a quarantined test to SQLite."""
    if not DB_AVAILABLE:
        return False
    try:
        from .persistence import get_db
        with get_db() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO quarantine_tests (test_name, rule_applied, status) VALUES (?, ?, ?)",
                (test_name, rule_applied, status),
            )
        return True
    except Exception:
        return False


def sync_replay_session(session_id: str, trace_id: str, data: Any) -> bool:
    """Persist a replay session to SQLite."""
    if not DB_AVAILABLE:
        return False
    try:
        if hasattr(data, "model_dump"):
            serialized = data.model_dump()
        elif hasattr(data, "dict"):
            serialized = data.dict()
        else:
            serialized = data
        upsert("replay_sessions", "id", session_id, "data", serialized)
        return True
    except Exception:
        return False


def sync_backlog_item(item_id: str, data: Any) -> bool:
    """Persist a backlog item to SQLite."""
    if not DB_AVAILABLE:
        return False
    try:
        if hasattr(data, "model_dump"):
            serialized = data.model_dump()
        elif hasattr(data, "dict"):
            serialized = data.dict()
        else:
            serialized = data
        upsert("backlog_items", "id", item_id, "data", serialized)
        return True
    except Exception:
        return False


def sync_sprint(sprint_id: str, data: Any) -> bool:
    """Persist a sprint to SQLite."""
    if not DB_AVAILABLE:
        return False
    try:
        if hasattr(data, "model_dump"):
            serialized = data.model_dump()
        elif hasattr(data, "dict"):
            serialized = data.dict()
        else:
            serialized = data
        upsert("sprints", "id", sprint_id, "data", serialized)
        return True
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Load helpers — populate in-memory stores from SQLite on startup
# ---------------------------------------------------------------------------


def load_events_from_db() -> List[dict]:
    """Load events from SQLite."""
    if not DB_AVAILABLE:
        return []
    try:
        return db_get_events(limit=500)
    except Exception:
        return []


def load_decisions_from_db() -> List[dict]:
    """Load decisions from SQLite."""
    if not DB_AVAILABLE:
        return []
    try:
        return db_get_decisions(limit=500)
    except Exception:
        return []


def load_incidents_from_db() -> List[dict]:
    """Load incidents from SQLite."""
    if not DB_AVAILABLE:
        return []
    try:
        return db_get_incidents(limit=500)
    except Exception:
        return []


def load_policies_from_db(enabled_only: bool = True) -> List[dict]:
    """Load policy rules from SQLite."""
    if not DB_AVAILABLE:
        return []
    try:
        return get_policy_rules(enabled_only)
    except Exception:
        return []


def load_workflows_from_db() -> List[dict]:
    """Load workflow definitions from SQLite."""
    if not DB_AVAILABLE:
        return []
    try:
        return get_workflows()
    except Exception:
        return []
