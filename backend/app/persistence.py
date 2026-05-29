"""
SQLite Persistence Layer — replaces in-memory dictionaries with persistent storage.
(B-023 cross-cutting: enables production-grade data durability.)

Auto-creates tables and indexes on first import. Falls back to in-memory
if SQLite is unavailable (e.g., read-only filesystem).

Schema covers all major stores:
- events, decisions, audits
- incidents, ownership, incident_summaries
- policy_engine rules, workflow_definitions
- quarantine_rules, quarantine_tests, remediation_templates
- backlog_items, sprints, blockers
- tenants, canary_runs, chaos_faults, replay_sessions
"""

import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

DB_PATH = os.environ.get("FORGE_DB_PATH", os.path.join(os.path.dirname(__file__), "forge.db"))


# ---------------------------------------------------------------------------
# Schema DDL — auto-created tables
# ---------------------------------------------------------------------------

SCHEMA_DDL = """
CREATE TABLE IF NOT EXISTS _meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT OR IGNORE INTO _meta (key, value) VALUES ('schema_version', '1');

CREATE TABLE IF NOT EXISTS events (
    trace_id TEXT NOT NULL,
    source TEXT NOT NULL,
    type TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    payload TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS decisions (
    id TEXT PRIMARY KEY,
    trace_id TEXT NOT NULL,
    agent TEXT NOT NULL,
    action TEXT NOT NULL,
    reason TEXT NOT NULL,
    confidence REAL NOT NULL,
    risk INTEGER NOT NULL,
    evidence TEXT DEFAULT '{}',
    timestamp TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audits (
    trace_id TEXT PRIMARY KEY,
    status TEXT DEFAULT 'INVESTIGATING',
    outcome TEXT,
    events TEXT DEFAULT '[]',
    decisions TEXT DEFAULT '[]',
    timestamp TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    severity TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'investigating',
    owner TEXT DEFAULT '',
    service TEXT DEFAULT '',
    trace_id TEXT DEFAULT '',
    description TEXT DEFAULT '',
    evidence TEXT DEFAULT '{}',
    created_at TEXT NOT NULL,
    resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS ownership (
    service TEXT PRIMARY KEY,
    team TEXT NOT NULL,
    slack_channel TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS incident_summaries (
    trace_id TEXT PRIMARY KEY,
    summary TEXT NOT NULL,
    generated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS policy_rules (
    name TEXT PRIMARY KEY,
    definition TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workflow_definitions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    definition TEXT NOT NULL,  -- JSON: nodes, links, config
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quarantine_rules (
    name TEXT PRIMARY KEY,
    config TEXT NOT NULL,  -- JSON: backoff params, match patterns
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quarantine_tests (
    test_name TEXT PRIMARY KEY,
    rule_applied TEXT NOT NULL,
    status TEXT DEFAULT 'quarantined',
    quarantined_until TEXT,
    retry_count INTEGER DEFAULT 0,
    last_error TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS remediation_templates (
    name TEXT PRIMARY KEY,
    template TEXT NOT NULL,  -- YAML/JSON body
    version TEXT DEFAULT '1.0.0',
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS backlog_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    data TEXT NOT NULL,  -- JSON: all BacklogItem fields
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sprints (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    data TEXT NOT NULL,  -- JSON: all Sprint fields
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS blockers (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS canary_runs (
    id TEXT PRIMARY KEY,
    service TEXT NOT NULL,
    version TEXT,
    data TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chaos_faults (
    id TEXT PRIMARY KEY,
    service TEXT NOT NULL,
    fault_type TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS replay_sessions (
    id TEXT PRIMARY KEY,
    trace_id TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS demo_scenarios (
    id TEXT PRIMARY KEY,
    scenario TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_events_trace ON events(trace_id);
CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);
CREATE INDEX IF NOT EXISTS idx_decisions_trace ON decisions(trace_id);
CREATE INDEX IF NOT EXISTS idx_incidents_service ON incidents(service);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_backlog_status ON backlog_items(rowid);
CREATE INDEX IF NOT EXISTS idx_canary_service ON canary_runs(service);
CREATE INDEX IF NOT EXISTS idx_chaos_service ON chaos_faults(service);
"""


# ---------------------------------------------------------------------------
# Connection management
# ---------------------------------------------------------------------------

@contextmanager
def get_db():
    """Yield a sqlite3 connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """Create tables and indexes if they don't exist."""
    try:
        with get_db() as conn:
            conn.executescript(SCHEMA_DDL)
        return True
    except Exception as e:
        print(f"[Persistence] Failed to init SQLite: {e}. Falling back to in-memory.")
        return False


# Auto-init on module import
DB_AVAILABLE = False
try:
    DB_AVAILABLE = init_db()
except Exception:
    pass


# ---------------------------------------------------------------------------
# Generic CRUD helpers
# ---------------------------------------------------------------------------

def _serialize(obj: Any) -> str:
    """Serialize a dict/Pydantic model to JSON string."""
    if hasattr(obj, "model_dump"):
        return json.dumps(obj.model_dump(), default=str)
    if hasattr(obj, "dict"):
        return json.dumps(obj.dict(), default=str)
    return json.dumps(obj, default=str)


def _ensure_db():
    """Raise if SQLite is unavailable."""
    if not DB_AVAILABLE:
        raise RuntimeError("SQLite persistence is not available. Use in-memory stores instead.")


def upsert(table: str, key_col: str, key_val: str, data_col: str, data: Any):
    """Insert or replace a row in any table with key + JSON."""
    _ensure_db()
    with get_db() as conn:
        conn.execute(
            f"INSERT OR REPLACE INTO {table} ({key_col}, {data_col}, created_at) "
            f"VALUES (?, ?, datetime('now'))",
            (key_val, _serialize(data)),
        )


def upsert_with_name(table: str, key_col: str, key_val: str, name_col: str, name_val: str, data_col: str, data: Any):
    """Insert or replace a row that has a name column alongside the key."""
    _ensure_db()
    serialized = _serialize(data)
    with get_db() as conn:
        conn.execute(
            f"INSERT OR REPLACE INTO {table} ({key_col}, {name_col}, {data_col}, created_at) "
            f"VALUES (?, ?, ?, datetime('now'))",
            (key_val, name_val, serialized),
        )


def delete_row(table: str, key_col: str, key_val: str) -> bool:
    """Delete a row by key. Returns True if a row was deleted."""
    _ensure_db()
    with get_db() as conn:
        cur = conn.execute(f"DELETE FROM {table} WHERE {key_col} = ?", (key_val,))
        return cur.rowcount > 0


def get_row(table: str, key_col: str, key_val: str) -> Optional[Dict[str, Any]]:
    """Get a single row as dict, or None."""
    _ensure_db()
    with get_db() as conn:
        cur = conn.execute(f"SELECT * FROM {table} WHERE {key_col} = ?", (key_val,))
        row = cur.fetchone()
        if row is None:
            return None
        return dict(row)


def list_rows(table: str, order_by: str = "created_at DESC", limit: int = 200) -> List[Dict[str, Any]]:
    """List recent rows from a table."""
    _ensure_db()
    with get_db() as conn:
        cur = conn.execute(f"SELECT * FROM {table} ORDER BY {order_by} LIMIT ?", (limit,))
        return [dict(row) for row in cur.fetchall()]


def count_rows(table: str, where_clause: str = "1=1", params: tuple = ()) -> int:
    """Count rows matching a WHERE clause."""
    _ensure_db()
    with get_db() as conn:
        cur = conn.execute(f"SELECT COUNT(*) as cnt FROM {table} WHERE {where_clause}", params)
        row = cur.fetchone()
        return row["cnt"] if row else 0


# ---------------------------------------------------------------------------
# Store-specific helpers (replace individual module stores)
# ---------------------------------------------------------------------------

# --- Events ---

def persist_event(trace_id: str, source: str, event_type: str, payload: dict):
    """Store a single event."""
    _ensure_db()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO events (trace_id, source, type, timestamp, payload) VALUES (?, ?, ?, ?, ?)",
            (trace_id, source, event_type, datetime.now(timezone.utc).isoformat(), json.dumps(payload)),
        )


def get_events(trace_id: Optional[str] = None, limit: int = 50) -> List[Dict]:
    """Retrieve events, optionally filtered by trace_id."""
    _ensure_db()
    with get_db() as conn:
        if trace_id:
            cur = conn.execute(
                "SELECT * FROM events WHERE trace_id = ? ORDER BY timestamp DESC LIMIT ?",
                (trace_id, limit),
            )
        else:
            cur = conn.execute("SELECT * FROM events ORDER BY timestamp DESC LIMIT ?", (limit,))
        return [dict(row) for row in cur.fetchall()]


# --- Decisions ---

def persist_decision(decision: dict):
    """Store a decision."""
    _ensure_db()
    with get_db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO decisions (id, trace_id, agent, action, reason, confidence, risk, evidence, timestamp) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                decision.get("id", ""),
                decision.get("trace_id", ""),
                decision.get("agent", ""),
                decision.get("action", ""),
                decision.get("reason", ""),
                decision.get("confidence", 0.0),
                decision.get("risk", 0),
                json.dumps(decision.get("evidence", {})),
                decision.get("timestamp", datetime.now(timezone.utc).isoformat()),
            ),
        )


def get_decisions(trace_id: Optional[str] = None, limit: int = 50) -> List[Dict]:
    """Retrieve decisions."""
    _ensure_db()
    with get_db() as conn:
        if trace_id:
            cur = conn.execute(
                "SELECT * FROM decisions WHERE trace_id = ? ORDER BY timestamp DESC LIMIT ?",
                (trace_id, limit),
            )
        else:
            cur = conn.execute("SELECT * FROM decisions ORDER BY timestamp DESC LIMIT ?", (limit,))
        return [dict(row) for row in cur.fetchall()]


# --- Incidents ---

def persist_incident(incident: dict):
    """Insert or update an incident."""
    _ensure_db()
    with get_db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO incidents (id, title, severity, status, owner, service, trace_id, description, evidence, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                incident.get("id", ""),
                incident.get("title", ""),
                incident.get("severity", "medium"),
                incident.get("status", "investigating"),
                incident.get("owner", ""),
                incident.get("service", ""),
                incident.get("trace_id", ""),
                incident.get("description", ""),
                json.dumps(incident.get("evidence", {})),
                incident.get("created_at", datetime.now(timezone.utc).isoformat()),
            ),
        )


def get_incidents(service: Optional[str] = None, status: Optional[str] = None, limit: int = 50) -> List[Dict]:
    """List incidents with optional filters."""
    _ensure_db()
    with get_db() as conn:
        query = "SELECT * FROM incidents WHERE 1=1"
        params = []
        if service:
            query += " AND service = ?"
            params.append(service)
        if status:
            query += " AND status = ?"
            params.append(status)
        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)
        cur = conn.execute(query, params)
        return [dict(row) for row in cur.fetchall()]


# --- Policies ---

def persist_policy_rule(name: str, definition: dict, enabled: bool = True):
    """Store a policy rule as JSON."""
    _ensure_db()
    with get_db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO policy_rules (name, definition, enabled, updated_at) VALUES (?, ?, ?, datetime('now'))",
            (name, json.dumps(definition), 1 if enabled else 0),
        )


def get_policy_rules(enabled_only: bool = True) -> List[Dict]:
    """List policy rules."""
    _ensure_db()
    with get_db() as conn:
        if enabled_only:
            cur = conn.execute("SELECT * FROM policy_rules WHERE enabled = 1 ORDER BY name")
        else:
            cur = conn.execute("SELECT * FROM policy_rules ORDER BY name")
        return [dict(row) for row in cur.fetchall()]


# --- Workflows ---

def persist_workflow(wf_id: str, name: str, definition: dict):
    """Store a workflow definition."""
    _ensure_db()
    with get_db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO workflow_definitions (id, name, definition, updated_at) VALUES (?, ?, ?, datetime('now'))",
            (wf_id, name, json.dumps(definition)),
        )


def get_workflows() -> List[Dict]:
    """List all workflow definitions."""
    _ensure_db()
    with get_db() as conn:
        cur = conn.execute("SELECT * FROM workflow_definitions ORDER BY updated_at DESC")
        return [dict(row) for row in cur.fetchall()]


# --- Blockers ---

def persist_blocker(blocker: dict):
    """Store a blocker detection result."""
    _ensure_db()
    upsert("blockers", "id", blocker.get("id", ""), "data", blocker)


def get_blockers(active_only: bool = True) -> List[Dict]:
    """List blockers."""
    rows = list_rows("blockers", limit=100)
    result = []
    for row in rows:
        try:
            data = json.loads(row["data"])
            result.append(data)
        except (json.JSONDecodeError, KeyError):
            pass
    if active_only:
        result = [b for b in result if not b.get("auto_resolved", False)]
    return result


# --- Tenants ---

def persist_tenant(tenant: dict):
    """Store a tenant record."""
    _ensure_db()
    upsert_with_name("tenants", "id", tenant.get("id", ""), "name", tenant.get("name", ""), "data", tenant)


def get_tenants() -> List[Dict]:
    """List tenants."""
    rows = list_rows("tenants", limit=50)
    result = []
    for row in rows:
        try:
            result.append(json.loads(row["data"]))
        except (json.JSONDecodeError, KeyError):
            pass
    return result


# ---------------------------------------------------------------------------
# Management
# ---------------------------------------------------------------------------

def get_stats() -> Dict[str, int]:
    """Return row counts for all tables."""
    if not DB_AVAILABLE:
        return {"available": False, "mode": "in-memory"}
    stats = {"available": True, "mode": "sqlite", "db_path": DB_PATH}
    tables = [
        "events", "decisions", "audits", "incidents", "ownership",
        "policy_rules", "workflow_definitions", "quarantine_rules",
        "quarantine_tests", "remediation_templates", "backlog_items",
        "sprints", "blockers", "tenants", "canary_runs", "chaos_faults",
        "replay_sessions", "demo_scenarios",
    ]
    for table in tables:
        try:
            stats[table] = count_rows(table)
        except Exception:
            stats[table] = -1
    return stats


# ---------------------------------------------------------------------------
# API Router for persistence management
# ---------------------------------------------------------------------------

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/persistence", tags=["Persistence"])


@router.get("/stats")
def get_persistence_stats():
    """Return storage engine stats (SQLite vs in-memory)."""
    return get_stats()


@router.post("/reset")
def reset_persistence():
    """Drop and recreate all tables (destructive)."""
    try:
        reset_db()
        return {"status": "reset", "message": "All tables dropped and recreated."}
    except RuntimeError as e:
        return {"status": "error", "message": str(e)}


def reset_db():
    """Drop all tables and reinitialize (destructive!)."""
    _ensure_db()
    with get_db() as conn:
        tables = [
            "events", "decisions", "audits", "incidents", "ownership",
            "incident_summaries", "policy_rules", "workflow_definitions",
            "quarantine_rules", "quarantine_tests", "remediation_templates",
            "backlog_items", "sprints", "blockers", "tenants",
            "canary_runs", "chaos_faults", "replay_sessions", "demo_scenarios",
            "_meta",
        ]
        for table in tables:
            conn.execute(f"DROP TABLE IF EXISTS {table}")
    init_db()
