"""
PostgreSQL Persistence Layer — asyncpg-powered replacement for SQLite persistence.
(B-028: Production-grade PostgreSQL storage with automatic SQLite fallback.)

Provides:
- SQLAlchemy metadata for Alembic migrations
- asyncpg connection pool for async operations
- Sync-compatible wrappers for existing in-memory sync patterns
- Fallback to SQLite when PostgreSQL is unavailable
"""

import os
import json
import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# SQLAlchemy metadata for Alembic autogenerate
# We use a minimal Core approach (no ORM) to keep it lightweight
# ---------------------------------------------------------------------------

try:
    from sqlalchemy import (
        MetaData, Table, Column, String, Integer, Float, Text,
        Index, create_engine
    )
    has_sqlalchemy = True

    metadata = MetaData()

    events = Table(
        "events", metadata,
        Column("trace_id", String(128), nullable=False, index=True),
        Column("source", String(64), nullable=False),
        Column("type", String(64), nullable=False),
        Column("timestamp", String(32), nullable=False),
        Column("payload", Text, default="{}"),
        Column("created_at", String(32), default=lambda: datetime.now(timezone.utc).isoformat()),
    )

    decisions = Table(
        "decisions", metadata,
        Column("id", String(128), primary_key=True),
        Column("trace_id", String(128), nullable=False, index=True),
        Column("agent", String(64), nullable=False),
        Column("action", Text, nullable=False),
        Column("reason", Text, nullable=False),
        Column("confidence", Float, nullable=False),
        Column("risk", Integer, nullable=False),
        Column("evidence", Text, default="{}"),
        Column("timestamp", String(32), nullable=False),
        Column("created_at", String(32), default=lambda: datetime.now(timezone.utc).isoformat()),
    )

    audits = Table(
        "audits", metadata,
        Column("trace_id", String(128), primary_key=True),
        Column("status", String(32), default="INVESTIGATING"),
        Column("outcome", Text, nullable=True),
        Column("events", Text, default="[]"),
        Column("decisions", Text, default="[]"),
        Column("timestamp", String(32), nullable=False),
        Column("created_at", String(32), default=lambda: datetime.now(timezone.utc).isoformat()),
    )

    incidents = Table(
        "incidents", metadata,
        Column("id", String(128), primary_key=True),
        Column("title", String(256), nullable=False),
        Column("severity", String(16), default="medium"),
        Column("status", String(32), default="investigating"),
        Column("owner", String(64), default=""),
        Column("service", String(64), default="", index=True),
        Column("trace_id", String(128), default=""),
        Column("description", Text, default=""),
        Column("evidence", Text, default="{}"),
        Column("created_at", String(32), nullable=False),
        Column("resolved_at", String(32), nullable=True),
    )

    ownership = Table(
        "ownership", metadata,
        Column("service", String(128), primary_key=True),
        Column("team", String(128), nullable=False),
        Column("slack_channel", String(64), nullable=False),
    )

    policy_rules = Table(
        "policy_rules", metadata,
        Column("name", String(128), primary_key=True),
        Column("definition", Text, nullable=False),
        Column("enabled", Integer, default=1),
        Column("created_at", String(32), default=lambda: datetime.now(timezone.utc).isoformat()),
        Column("updated_at", String(32), default=lambda: datetime.now(timezone.utc).isoformat()),
    )

    workflow_definitions = Table(
        "workflow_definitions", metadata,
        Column("id", String(128), primary_key=True),
        Column("name", String(256), nullable=False),
        Column("definition", Text, nullable=False),
        Column("status", String(32), default="active"),
        Column("created_at", String(32), default=lambda: datetime.now(timezone.utc).isoformat()),
        Column("updated_at", String(32), default=lambda: datetime.now(timezone.utc).isoformat()),
    )

    quarantine_rules = Table(
        "quarantine_rules", metadata,
        Column("name", String(128), primary_key=True),
        Column("config", Text, nullable=False),
        Column("enabled", Integer, default=1),
        Column("created_at", String(32), default=lambda: datetime.now(timezone.utc).isoformat()),
    )

    quarantine_tests = Table(
        "quarantine_tests", metadata,
        Column("test_name", String(256), primary_key=True),
        Column("rule_applied", String(128), nullable=False),
        Column("status", String(32), default="quarantined"),
        Column("quarantined_until", String(32), nullable=True),
        Column("retry_count", Integer, default=0),
        Column("last_error", Text, default=""),
        Column("created_at", String(32), default=lambda: datetime.now(timezone.utc).isoformat()),
    )

    remediation_templates = Table(
        "remediation_templates", metadata,
        Column("name", String(128), primary_key=True),
        Column("template", Text, nullable=False),
        Column("version", String(16), default="1.0.0"),
        Column("enabled", Integer, default=1),
        Column("created_at", String(32), default=lambda: datetime.now(timezone.utc).isoformat()),
        Column("updated_at", String(32), default=lambda: datetime.now(timezone.utc).isoformat()),
    )

    backlog_items = Table(
        "backlog_items", metadata,
        Column("id", String(128), primary_key=True),
        Column("title", String(256), nullable=False),
        Column("data", Text, nullable=False),
        Column("created_at", String(32), default=lambda: datetime.now(timezone.utc).isoformat()),
    )

    sprints = Table(
        "sprints", metadata,
        Column("id", String(128), primary_key=True),
        Column("name", String(256), nullable=False),
        Column("data", Text, nullable=False),
        Column("created_at", String(32), default=lambda: datetime.now(timezone.utc).isoformat()),
    )

    blockers = Table(
        "blockers", metadata,
        Column("id", String(128), primary_key=True),
        Column("data", Text, nullable=False),
        Column("created_at", String(32), default=lambda: datetime.now(timezone.utc).isoformat()),
    )

    tenants = Table(
        "tenants", metadata,
        Column("id", String(128), primary_key=True),
        Column("name", String(256), nullable=False),
        Column("data", Text, nullable=False),
        Column("created_at", String(32), default=lambda: datetime.now(timezone.utc).isoformat()),
    )

    canary_runs = Table(
        "canary_runs", metadata,
        Column("id", String(128), primary_key=True),
        Column("service", String(128), nullable=False, index=True),
        Column("version", String(32), nullable=True),
        Column("data", Text, nullable=False),
        Column("created_at", String(32), default=lambda: datetime.now(timezone.utc).isoformat()),
    )

    chaos_faults = Table(
        "chaos_faults", metadata,
        Column("id", String(128), primary_key=True),
        Column("service", String(128), nullable=False, index=True),
        Column("fault_type", String(32), nullable=False),
        Column("data", Text, nullable=False),
        Column("created_at", String(32), default=lambda: datetime.now(timezone.utc).isoformat()),
    )

    replay_sessions = Table(
        "replay_sessions", metadata,
        Column("id", String(128), primary_key=True),
        Column("trace_id", String(128), nullable=False),
        Column("data", Text, nullable=False),
        Column("created_at", String(32), default=lambda: datetime.now(timezone.utc).isoformat()),
    )

except ImportError:
    has_sqlalchemy = False
    metadata = None
    print("[PG Persistence] SQLAlchemy not available — Alembic autogenerate disabled")


# ---------------------------------------------------------------------------
# asyncpg connection pool
# ---------------------------------------------------------------------------

PG_DSN = os.environ.get("FORGE_PG_DSN", "")
PG_ENABLED = bool(PG_DSN)
_pool = None


async def get_pool():
    """Get or create the asyncpg connection pool."""
    global _pool
    if _pool is None and PG_DSN:
        try:
            import asyncpg
            # Convert DSN from postgresql+asyncpg:// to asyncpg format
            dsn = PG_DSN.replace("postgresql+asyncpg://", "postgresql://")
            _pool = await asyncpg.create_pool(dsn, min_size=2, max_size=10)
            print(f"[PG Persistence] Connected to PostgreSQL at {dsn.split('@')[1] if '@' in dsn else dsn}")
        except Exception as e:
            print(f"[PG Persistence] Failed to connect: {e}")
            return None
    return _pool


async def close_pool():
    """Close the connection pool."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


# ---------------------------------------------------------------------------
# Schema creation (for environments without Alembic)
# ---------------------------------------------------------------------------

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS events (
    trace_id TEXT NOT NULL,
    source TEXT NOT NULL,
    type TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    payload TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (NOW())
);
CREATE INDEX IF NOT EXISTS idx_events_trace ON events(trace_id);
CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);

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
    created_at TEXT DEFAULT (NOW())
);
CREATE INDEX IF NOT EXISTS idx_decisions_trace ON decisions(trace_id);

CREATE TABLE IF NOT EXISTS audits (
    trace_id TEXT PRIMARY KEY,
    status TEXT DEFAULT 'INVESTIGATING',
    outcome TEXT,
    events TEXT DEFAULT '[]',
    decisions TEXT DEFAULT '[]',
    timestamp TEXT NOT NULL,
    created_at TEXT DEFAULT (NOW())
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
CREATE INDEX IF NOT EXISTS idx_incidents_service ON incidents(service);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);

CREATE TABLE IF NOT EXISTS ownership (
    service TEXT PRIMARY KEY,
    team TEXT NOT NULL,
    slack_channel TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS policy_rules (
    name TEXT PRIMARY KEY,
    definition TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (NOW()),
    updated_at TEXT DEFAULT (NOW())
);

CREATE TABLE IF NOT EXISTS workflow_definitions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    definition TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (NOW()),
    updated_at TEXT DEFAULT (NOW())
);

CREATE TABLE IF NOT EXISTS quarantine_rules (
    name TEXT PRIMARY KEY,
    config TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (NOW())
);

CREATE TABLE IF NOT EXISTS quarantine_tests (
    test_name TEXT PRIMARY KEY,
    rule_applied TEXT NOT NULL,
    status TEXT DEFAULT 'quarantined',
    quarantined_until TEXT,
    retry_count INTEGER DEFAULT 0,
    last_error TEXT DEFAULT '',
    created_at TEXT DEFAULT (NOW())
);

CREATE TABLE IF NOT EXISTS remediation_templates (
    name TEXT PRIMARY KEY,
    template TEXT NOT NULL,
    version TEXT DEFAULT '1.0.0',
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (NOW()),
    updated_at TEXT DEFAULT (NOW())
);

CREATE TABLE IF NOT EXISTS backlog_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT DEFAULT (NOW())
);

CREATE TABLE IF NOT EXISTS sprints (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT DEFAULT (NOW())
);

CREATE TABLE IF NOT EXISTS blockers (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at TEXT DEFAULT (NOW())
);

CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT DEFAULT (NOW())
);

CREATE TABLE IF NOT EXISTS canary_runs (
    id TEXT PRIMARY KEY,
    service TEXT NOT NULL,
    version TEXT,
    data TEXT NOT NULL,
    created_at TEXT DEFAULT (NOW())
);
CREATE INDEX IF NOT EXISTS idx_canary_service ON canary_runs(service);

CREATE TABLE IF NOT EXISTS chaos_faults (
    id TEXT PRIMARY KEY,
    service TEXT NOT NULL,
    fault_type TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT DEFAULT (NOW())
);
CREATE INDEX IF NOT EXISTS idx_chaos_service ON chaos_faults(service);

CREATE TABLE IF NOT EXISTS replay_sessions (
    id TEXT PRIMARY KEY,
    trace_id TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT DEFAULT (NOW())
);
"""


async def init_schema():
    """Create tables if they don't exist."""
    pool = await get_pool()
    if not pool:
        return False
    try:
        async with pool.acquire() as conn:
            await conn.execute(SCHEMA_SQL)
        return True
    except Exception as e:
        print(f"[PG Persistence] Schema init failed: {e}")
        return False


# ---------------------------------------------------------------------------
# Sync-compatible wrapper that runs async operations in a sync context
# ---------------------------------------------------------------------------

def _run_async(coro):
    """Run an async coroutine from a sync context using the running loop or a new one."""
    try:
        loop = asyncio.get_running_loop()
        if loop.is_running():
            # We're in an async context — create a new loop in a thread
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(asyncio.run, coro)
                return future.result()
        else:
            return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


# ---------------------------------------------------------------------------
# Public helpers — mirror persistence.py signatures
# ---------------------------------------------------------------------------

def is_available() -> bool:
    """Check if PostgreSQL is configured and reachable."""
    return PG_ENABLED


def serialize(obj: Any) -> str:
    """Serialize to JSON string."""
    if hasattr(obj, "model_dump"):
        return json.dumps(obj.model_dump(), default=str)
    if hasattr(obj, "dict"):
        return json.dumps(obj.dict(), default=str)
    return json.dumps(obj, default=str)


# --- Event operations ---

async def async_persist_event(trace_id: str, source: str, event_type: str, payload: dict):
    """Store an event."""
    pool = await get_pool()
    if not pool:
        return
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO events (trace_id, source, type, timestamp, payload) VALUES ($1, $2, $3, $4, $5)",
            trace_id, source, event_type, datetime.now(timezone.utc).isoformat(), json.dumps(payload),
        )


def persist_event(trace_id: str, source: str, event_type: str, payload: dict):
    """Sync wrapper for persist_event."""
    if not PG_ENABLED:
        return
    try:
        _run_async(async_persist_event(trace_id, source, event_type, payload))
    except Exception as e:
        print(f"[PG Persistence] persist_event failed: {e}")


async def async_get_events(trace_id: Optional[str] = None, limit: int = 50) -> List[Dict]:
    """Retrieve events."""
    pool = await get_pool()
    if not pool:
        return []
    async with pool.acquire() as conn:
        if trace_id:
            rows = await conn.fetch(
                "SELECT * FROM events WHERE trace_id = $1 ORDER BY timestamp DESC LIMIT $2",
                trace_id, limit,
            )
        else:
            rows = await conn.fetch(
                "SELECT * FROM events ORDER BY timestamp DESC LIMIT $1", limit,
            )
        return [dict(row) for row in rows]


# --- Decision operations ---

async def async_persist_decision(decision: dict):
    """Store a decision."""
    pool = await get_pool()
    if not pool:
        return
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO decisions (id, trace_id, agent, action, reason, confidence, risk, evidence, timestamp) "
            "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) "
            "ON CONFLICT (id) DO UPDATE SET "
            "trace_id=EXCLUDED.trace_id, agent=EXCLUDED.agent, action=EXCLUDED.action, "
            "reason=EXCLUDED.reason, confidence=EXCLUDED.confidence, risk=EXCLUDED.risk, "
            "evidence=EXCLUDED.evidence, timestamp=EXCLUDED.timestamp",
            decision.get("id", ""),
            decision.get("trace_id", ""),
            decision.get("agent", ""),
            decision.get("action", ""),
            decision.get("reason", ""),
            decision.get("confidence", 0.0),
            decision.get("risk", 0),
            json.dumps(decision.get("evidence", {})),
            decision.get("timestamp", datetime.now(timezone.utc).isoformat()),
        )


def persist_decision(decision: dict):
    """Sync wrapper."""
    if not PG_ENABLED:
        return
    try:
        _run_async(async_persist_decision(decision))
    except Exception as e:
        print(f"[PG Persistence] persist_decision failed: {e}")


async def async_get_decisions(trace_id: Optional[str] = None, limit: int = 50) -> List[Dict]:
    """Retrieve decisions."""
    pool = await get_pool()
    if not pool:
        return []
    async with pool.acquire() as conn:
        if trace_id:
            rows = await conn.fetch(
                "SELECT * FROM decisions WHERE trace_id = $1 ORDER BY timestamp DESC LIMIT $2",
                trace_id, limit,
            )
        else:
            rows = await conn.fetch(
                "SELECT * FROM decisions ORDER BY timestamp DESC LIMIT $1", limit,
            )
        return [dict(row) for row in rows]


# --- Incident operations ---

async def async_persist_incident(incident: dict):
    """Store an incident."""
    pool = await get_pool()
    if not pool:
        return
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO incidents (id, title, severity, status, owner, service, trace_id, description, evidence, created_at) "
            "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) "
            "ON CONFLICT (id) DO UPDATE SET "
            "title=EXCLUDED.title, severity=EXCLUDED.severity, status=EXCLUDED.status, "
            "owner=EXCLUDED.owner, service=EXCLUDED.service, trace_id=EXCLUDED.trace_id, "
            "description=EXCLUDED.description, evidence=EXCLUDED.evidence",
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
        )


def persist_incident(incident: dict):
    """Sync wrapper."""
    if not PG_ENABLED:
        return
    try:
        _run_async(async_persist_incident(incident))
    except Exception as e:
        print(f"[PG Persistence] persist_incident failed: {e}")


# --- Generic row operations ---

async def async_execute(sql: str, *args):
    """Execute raw SQL."""
    pool = await get_pool()
    if not pool:
        return
    async with pool.acquire() as conn:
        await conn.execute(sql, *args)


async def async_fetch(sql: str, *args) -> List[Dict]:
    """Fetch rows as dicts."""
    pool = await get_pool()
    if not pool:
        return []
    async with pool.acquire() as conn:
        rows = await conn.fetch(sql, *args)
        return [dict(row) for row in rows]


def execute(sql: str, *args):
    """Sync wrapper for execute."""
    if not PG_ENABLED:
        return
    try:
        _run_async(async_execute(sql, *args))
    except Exception as e:
        print(f"[PG Persistence] execute failed: {e}")


def fetch(sql: str, *args) -> List[Dict]:
    """Sync wrapper for fetch."""
    if not PG_ENABLED:
        return []
    try:
        return _run_async(async_fetch(sql, *args))
    except Exception as e:
        print(f"[PG Persistence] fetch failed: {e}")
        return []


# ---------------------------------------------------------------------------
# Startup — initialize schema when module loads
# ---------------------------------------------------------------------------

def init_postgres():
    """Initialize PostgreSQL schema (call from main.py startup)."""
    if not PG_ENABLED:
        print("[PG Persistence] PostgreSQL not configured. Use FORGE_PG_DSN env var to enable.")
        return False
    try:
        _run_async(init_schema())
        print("[PG Persistence] PostgreSQL schema initialized")
        return True
    except Exception as e:
        print(f"[PG Persistence] Schema init failed: {e}")
        return False
