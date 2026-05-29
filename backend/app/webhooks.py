"""
GitHub webhook ingestion (B-005).

Handles pull_request and check_suite events from GitHub,
normalizes them into the canonical EventSchema, and stores
them for timeline rendering.
"""

import hmac
import hashlib
import json
import os
from typing import Optional, Dict, Any
from datetime import datetime

from fastapi import APIRouter, Request, HTTPException, Header
from .schemas import EventSchema
from .api import events_db, audit_db, AuditSchema

router = APIRouter(prefix="/api/v1/webhooks", tags=["Webhooks"])

WEBHOOK_SECRET = os.environ["GITHUB_WEBHOOK_SECRET"]

# ---------------------------------------------------------------------------
# Signature verification
# ---------------------------------------------------------------------------


def verify_signature(payload_body: bytes, signature_header: Optional[str]) -> bool:
    """Verify X-Hub-Signature-256 against the webhook secret."""
    if not signature_header:
        return False
    if not signature_header.startswith("sha256="):
        return False

    expected = hmac.new(
        WEBHOOK_SECRET.encode("utf-8"),
        payload_body,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(f"sha256={expected}", signature_header)


# ---------------------------------------------------------------------------
# Event normalizers
# ---------------------------------------------------------------------------

PULL_REQUEST_ACTIONS = {
    "opened": "PULL_REQUEST_OPENED",
    "closed": "PULL_REQUEST_CLOSED",
    "synchronize": "PULL_REQUEST_SYNC",
    "reopened": "PULL_REQUEST_REOPENED",
    "ready_for_review": "PULL_REQUEST_READY",
    "labeled": "PULL_REQUEST_LABELED",
    "unlabeled": "PULL_REQUEST_UNLABELED",
}

CHECK_SUITE_ACTIONS = {
    "completed": "CHECK_SUITE_COMPLETED",
    "requested": "CHECK_SUITE_REQUESTED",
    "rerequested": "CHECK_SUITE_REREQUESTED",
}

WORKFLOW_RUN_ACTIONS = {
    "completed": "WORKFLOW_RUN_COMPLETED",
    "requested": "WORKFLOW_RUN_REQUESTED",
    "in_progress": "WORKFLOW_RUN_IN_PROGRESS",
}


def normalize_pull_request(
    payload: Dict[str, Any], delivery_id: str
) -> Optional[EventSchema]:
    """Normalize a GitHub pull_request event into an EventSchema."""
    action = payload.get("action", "")
    event_type = PULL_REQUEST_ACTIONS.get(action)
    if not event_type:
        return None  # skip unhandled actions

    pr = payload.get("pull_request", {})
    repo = payload.get("repository", {})

    return EventSchema(
        source="github",
        type=event_type,
        timestamp=datetime.utcnow(),
        trace_id=delivery_id,
        payload={
            "pr_number": pr.get("number"),
            "title": pr.get("title"),
            "state": pr.get("state"),
            "head_branch": pr.get("head", {}).get("ref"),
            "base_branch": pr.get("base", {}).get("ref"),
            "repo": repo.get("full_name"),
            "url": pr.get("html_url"),
            "user": pr.get("user", {}).get("login"),
            "action": action,
            "merged": pr.get("merged", False),
            "draft": pr.get("draft", False),
        },
    )


def normalize_check_suite(
    payload: Dict[str, Any], delivery_id: str
) -> Optional[EventSchema]:
    """Normalize a GitHub check_suite event into an EventSchema."""
    action = payload.get("action", "")
    event_type = CHECK_SUITE_ACTIONS.get(action)
    if not event_type:
        return None

    suite = payload.get("check_suite", {})
    repo = payload.get("repository", {})

    return EventSchema(
        source="github",
        type=event_type,
        timestamp=datetime.utcnow(),
        trace_id=delivery_id,
        payload={
            "head_branch": suite.get("head_branch"),
            "head_sha": suite.get("head_sha"),
            "status": suite.get("status"),
            "conclusion": suite.get("conclusion"),
            "app": suite.get("app", {}).get("name"),
            "latest_check_runs_count": suite.get("latest_check_runs_count"),
            "repo": repo.get("full_name"),
            "url": suite.get("html_url"),
            "action": action,
        },
    )


def normalize_workflow_run(
    payload: Dict[str, Any], delivery_id: str
) -> Optional[EventSchema]:
    """Normalize a GitHub workflow_run event into an EventSchema."""
    action = payload.get("action", "")
    event_type = WORKFLOW_RUN_ACTIONS.get(action)
    if not event_type:
        return None

    run = payload.get("workflow_run", {})
    repo = payload.get("repository", {})

    return EventSchema(
        source="github",
        type=event_type,
        timestamp=datetime.utcnow(),
        trace_id=delivery_id,
        payload={
            "workflow_name": run.get("name"),
            "head_branch": run.get("head_branch"),
            "head_sha": run.get("head_sha"),
            "status": run.get("status"),
            "conclusion": run.get("conclusion"),
            "run_number": run.get("run_number"),
            "event": run.get("event"),
            "repo": repo.get("full_name"),
            "url": run.get("html_url"),
            "action": action,
        },
    )


# ---------------------------------------------------------------------------
# Normalizer dispatch
# ---------------------------------------------------------------------------

NORMALIZERS = {
    "pull_request": normalize_pull_request,
    "check_suite": normalize_check_suite,
    "workflow_run": normalize_workflow_run,
}


def normalize_event(
    github_event: str,
    payload: Dict[str, Any],
    delivery_id: str,
) -> Optional[EventSchema]:
    """Dispatch to the correct normalizer based on the GitHub event type."""
    normalizer = NORMALIZERS.get(github_event)
    if normalizer is None:
        return None
    return normalizer(payload, delivery_id)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("/github")
async def github_webhook(
    request: Request,
    x_hub_signature_256: Optional[str] = Header(None, alias="X-Hub-Signature-256"),
    x_github_event: Optional[str] = Header(None, alias="X-GitHub-Event"),
    x_github_delivery: Optional[str] = Header(None, alias="X-GitHub-Delivery"),
):
    """
    Receive GitHub webhook events.

    Validates the HMAC-SHA256 signature, normalizes the event into the
    canonical EventSchema, and persists it for timeline rendering.
    """
    # Read raw body (one read — used for both signature verification and JSON parsing)
    body = await request.body()

    # Verify signature
    if not verify_signature(body, x_hub_signature_256):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    if not x_github_event or not x_github_delivery:
        raise HTTPException(
            status_code=400, detail="Missing X-GitHub-Event or X-GitHub-Delivery header"
        )

    # Parse JSON payload from the same raw bytes
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # Normalize event
    event = normalize_event(x_github_event, payload, x_github_delivery)
    if event is None:
        # Acknowledge but don't persist unsupported event types
        return {
            "status": "skipped",
            "event": x_github_event,
            "reason": "Unsupported event type or action",
        }

    # Persist to in-memory stores
    events_db.append(event)

    # Create or update audit trail entry for this delivery
    if event.trace_id not in audit_db:
        audit_db[event.trace_id] = AuditSchema(
            trace_id=event.trace_id,
            events=[event],
            timestamp=datetime.utcnow(),
        )
    else:
        audit_db[event.trace_id].events.append(event)

    return {
        "status": "accepted",
        "event": x_github_event,
        "trace_id": event.trace_id,
        "normalized_type": event.type,
    }
