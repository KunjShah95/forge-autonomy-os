"""initial_schema

Revision ID: 001
Revises:
Create Date: 2026-05-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Events ---
    op.create_table(
        "events",
        sa.Column("trace_id", sa.String(128), nullable=False, index=True),
        sa.Column("source", sa.String(64), nullable=False),
        sa.Column("type", sa.String(64), nullable=False),
        sa.Column("timestamp", sa.String(32), nullable=False),
        sa.Column("payload", sa.Text, server_default="{}"),
        sa.Column("created_at", sa.String(32), server_default=sa.func.now()),
    )
    op.create_index("idx_events_trace", "events", ["trace_id"])
    op.create_index("idx_events_source", "events", ["source"])

    # --- Decisions ---
    op.create_table(
        "decisions",
        sa.Column("id", sa.String(128), primary_key=True),
        sa.Column("trace_id", sa.String(128), nullable=False, index=True),
        sa.Column("agent", sa.String(64), nullable=False),
        sa.Column("action", sa.Text, nullable=False),
        sa.Column("reason", sa.Text, nullable=False),
        sa.Column("confidence", sa.Float, nullable=False),
        sa.Column("risk", sa.Integer, nullable=False),
        sa.Column("evidence", sa.Text, server_default="{}"),
        sa.Column("timestamp", sa.String(32), nullable=False),
        sa.Column("created_at", sa.String(32), server_default=sa.func.now()),
    )
    op.create_index("idx_decisions_trace", "decisions", ["trace_id"])

    # --- Audits ---
    op.create_table(
        "audits",
        sa.Column("trace_id", sa.String(128), primary_key=True),
        sa.Column("status", sa.String(32), server_default="INVESTIGATING"),
        sa.Column("outcome", sa.Text, nullable=True),
        sa.Column("events", sa.Text, server_default="[]"),
        sa.Column("decisions", sa.Text, server_default="[]"),
        sa.Column("timestamp", sa.String(32), nullable=False),
        sa.Column("created_at", sa.String(32), server_default=sa.func.now()),
    )

    # --- Incidents ---
    op.create_table(
        "incidents",
        sa.Column("id", sa.String(128), primary_key=True),
        sa.Column("title", sa.String(256), nullable=False),
        sa.Column("severity", sa.String(16), server_default="medium"),
        sa.Column("status", sa.String(32), server_default="investigating"),
        sa.Column("owner", sa.String(64), server_default=""),
        sa.Column("service", sa.String(64), server_default="", index=True),
        sa.Column("trace_id", sa.String(128), server_default=""),
        sa.Column("description", sa.Text, server_default=""),
        sa.Column("evidence", sa.Text, server_default="{}"),
        sa.Column("created_at", sa.String(32), nullable=False),
        sa.Column("resolved_at", sa.String(32), nullable=True),
    )
    op.create_index("idx_incidents_service", "incidents", ["service"])
    op.create_index("idx_incidents_status", "incidents", ["status"])

    # --- Ownership ---
    op.create_table(
        "ownership",
        sa.Column("service", sa.String(128), primary_key=True),
        sa.Column("team", sa.String(128), nullable=False),
        sa.Column("slack_channel", sa.String(64), nullable=False),
    )

    # --- Policy Rules ---
    op.create_table(
        "policy_rules",
        sa.Column("name", sa.String(128), primary_key=True),
        sa.Column("definition", sa.Text, nullable=False),
        sa.Column("enabled", sa.Integer, server_default="1"),
        sa.Column("created_at", sa.String(32), server_default=sa.func.now()),
        sa.Column("updated_at", sa.String(32), server_default=sa.func.now()),
    )

    # --- Workflow Definitions ---
    op.create_table(
        "workflow_definitions",
        sa.Column("id", sa.String(128), primary_key=True),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("definition", sa.Text, nullable=False),
        sa.Column("status", sa.String(32), server_default="active"),
        sa.Column("created_at", sa.String(32), server_default=sa.func.now()),
        sa.Column("updated_at", sa.String(32), server_default=sa.func.now()),
    )

    # --- Quarantine Rules ---
    op.create_table(
        "quarantine_rules",
        sa.Column("name", sa.String(128), primary_key=True),
        sa.Column("config", sa.Text, nullable=False),
        sa.Column("enabled", sa.Integer, server_default="1"),
        sa.Column("created_at", sa.String(32), server_default=sa.func.now()),
    )

    # --- Quarantine Tests ---
    op.create_table(
        "quarantine_tests",
        sa.Column("test_name", sa.String(256), primary_key=True),
        sa.Column("rule_applied", sa.String(128), nullable=False),
        sa.Column("status", sa.String(32), server_default="quarantined"),
        sa.Column("quarantined_until", sa.String(32), nullable=True),
        sa.Column("retry_count", sa.Integer, server_default="0"),
        sa.Column("last_error", sa.Text, server_default=""),
        sa.Column("created_at", sa.String(32), server_default=sa.func.now()),
    )

    # --- Remediation Templates ---
    op.create_table(
        "remediation_templates",
        sa.Column("name", sa.String(128), primary_key=True),
        sa.Column("template", sa.Text, nullable=False),
        sa.Column("version", sa.String(16), server_default="1.0.0"),
        sa.Column("enabled", sa.Integer, server_default="1"),
        sa.Column("created_at", sa.String(32), server_default=sa.func.now()),
        sa.Column("updated_at", sa.String(32), server_default=sa.func.now()),
    )

    # --- Backlog Items ---
    op.create_table(
        "backlog_items",
        sa.Column("id", sa.String(128), primary_key=True),
        sa.Column("title", sa.String(256), nullable=False),
        sa.Column("data", sa.Text, nullable=False),
        sa.Column("created_at", sa.String(32), server_default=sa.func.now()),
    )

    # --- Sprints ---
    op.create_table(
        "sprints",
        sa.Column("id", sa.String(128), primary_key=True),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("data", sa.Text, nullable=False),
        sa.Column("created_at", sa.String(32), server_default=sa.func.now()),
    )

    # --- Blockers ---
    op.create_table(
        "blockers",
        sa.Column("id", sa.String(128), primary_key=True),
        sa.Column("data", sa.Text, nullable=False),
        sa.Column("created_at", sa.String(32), server_default=sa.func.now()),
    )

    # --- Tenants ---
    op.create_table(
        "tenants",
        sa.Column("id", sa.String(128), primary_key=True),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("data", sa.Text, nullable=False),
        sa.Column("created_at", sa.String(32), server_default=sa.func.now()),
    )

    # --- Canary Runs ---
    op.create_table(
        "canary_runs",
        sa.Column("id", sa.String(128), primary_key=True),
        sa.Column("service", sa.String(128), nullable=False, index=True),
        sa.Column("version", sa.String(32), nullable=True),
        sa.Column("data", sa.Text, nullable=False),
        sa.Column("created_at", sa.String(32), server_default=sa.func.now()),
    )
    op.create_index("idx_canary_service", "canary_runs", ["service"])

    # --- Chaos Faults ---
    op.create_table(
        "chaos_faults",
        sa.Column("id", sa.String(128), primary_key=True),
        sa.Column("service", sa.String(128), nullable=False, index=True),
        sa.Column("fault_type", sa.String(32), nullable=False),
        sa.Column("data", sa.Text, nullable=False),
        sa.Column("created_at", sa.String(32), server_default=sa.func.now()),
    )
    op.create_index("idx_chaos_service", "chaos_faults", ["service"])

    # --- Replay Sessions ---
    op.create_table(
        "replay_sessions",
        sa.Column("id", sa.String(128), primary_key=True),
        sa.Column("trace_id", sa.String(128), nullable=False),
        sa.Column("data", sa.Text, nullable=False),
        sa.Column("created_at", sa.String(32), server_default=sa.func.now()),
    )


def downgrade() -> None:
    """Drop all tables."""
    tables = [
        "replay_sessions", "chaos_faults", "canary_runs", "tenants",
        "blockers", "sprints", "backlog_items", "remediation_templates",
        "quarantine_tests", "quarantine_rules", "workflow_definitions",
        "policy_rules", "ownership", "incidents", "audits", "decisions", "events",
    ]
    for table in tables:
        op.drop_table(table, if_exists=True)
