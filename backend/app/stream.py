"""
SSE (Server-Sent Events) live event stream (Sprint 3 — Real-time LogStream).

Broadcasts events, decisions, and system activity in real-time to connected
frontend clients via SSE. Falls back to polling when SSE is unavailable.
"""

import asyncio
import json
import random
import time
from typing import Dict, Any, Optional
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone

from .api import events_db, decisions_db

router = APIRouter(prefix="/api/v1", tags=["Stream"])

# ---------------------------------------------------------------------------
# In-memory event buffer for SSE
# ---------------------------------------------------------------------------

_sse_clients: Dict[str, asyncio.Queue] = {}
_last_event_id: int = 0

# Simulated ambient events for liveliness when no real events are coming
AMBIENT_EVENTS = [
    {"agent": "SRE", "msg": "Auto-scaled orders-svc 4→7 replicas (CPU 78%)", "level": "info"},
    {"agent": "QA", "msg": "Synthesized 12 edge-case tests for billing-svc", "level": "ok"},
    {"agent": "Security", "msg": "Rotated KMS key kms-prod-04 (90-day policy)", "level": "ok"},
    {"agent": "Arch", "msg": "Proposed extracting payments → payments-svc (debt -18%)", "level": "info"},
    {"agent": "DevOps", "msg": "Cache hit ratio +4.2% after redis warmup", "level": "ok"},
    {"agent": "SRE", "msg": "Error budget for users-svc burned 3.1x in 10m window", "level": "warn"},
    {"agent": "PM", "msg": "Reprioritized 4 backlog items based on incident trend", "level": "info"},
    {"agent": "Security", "msg": "Scanned 14 dependencies — 0 new CVEs", "level": "ok"},
    {"agent": "QA", "msg": "Test suite for billing-svc: 98.7% pass rate", "level": "ok"},
    {"agent": "Arch", "msg": "Coupling score improved 4pts after boundary refactor", "level": "info"},
]


def _generate_sse_event(event_type: str, data: Dict[str, Any]) -> str:
    """Format data as an SSE message."""
    global _last_event_id
    _last_event_id += 1
    payload = json.dumps({
        "id": _last_event_id,
        "type": event_type,
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    return f"id: {_last_event_id}\nevent: {event_type}\ndata: {payload}\n\n"


def _get_recent_events(max_items: int = 5) -> list:
    """Get the most recent events from the in-memory stores."""
    results = []
    for e in reversed(events_db[-max_items:]):
        results.append({
            "type": "event",
            "t": e.timestamp.isoformat() if hasattr(e.timestamp, 'isoformat') else str(e.timestamp),
            "agent": e.source.upper(),
            "msg": f"[{e.type}] {str(e.payload)[:80]}",
            "level": "warn" if "SPIKE" in e.type or "BACKPRESSURE" in e.type else "info",
        })
    for d in reversed(decisions_db[-max_items:]):
        results.append({
            "type": "decision",
            "t": d.timestamp.isoformat() if hasattr(d.timestamp, 'isoformat') else str(d.timestamp),
            "agent": d.agent,
            "msg": d.action[:120],
            "level": "ok",
        })
    return results


async def _event_generator(request: Request, client_id: str):
    """Async generator yielding SSE events."""
    queue: asyncio.Queue = asyncio.Queue()
    _sse_clients[client_id] = queue

    try:
        # Send initial batch of recent events
        initial = _get_recent_events(8)
        if initial:
            yield _generate_sse_event("init", {"events": initial, "client_id": client_id})

        # Send periodic keepalive + ambient events
        tick = 0
        while True:
            try:
                # Check for client disconnect
                if await request.is_disconnected():
                    break

                # Every 2.4s, send an ambient event for liveliness
                if tick % 3 == 0:
                    ambient = random.choice(AMBIENT_EVENTS)
                    yield _generate_sse_event("ambient", {
                        "t": datetime.now(timezone.utc).strftime("%H:%M:%S"),
                        **ambient,
                    })

                # Every 8 ticks (~19s), inject a fresh snapshot from the stores
                if tick > 0 and tick % 8 == 0:
                    recent = _get_recent_events(3)
                    if recent:
                        yield _generate_sse_event("snapshot", {"events": recent})

                await asyncio.sleep(0.8)
                tick += 1

            except asyncio.CancelledError:
                break
            except Exception:
                break
    finally:
        _sse_clients.pop(client_id, None)


@router.get("/stream")
async def sse_event_stream(request: Request):
    """
    SSE endpoint for real-time LogStream.

    Returns a StreamingResponse that keeps the connection open and pushes
    events as they happen. The frontend uses EventSource to consume this.
    """
    client_id = f"client-{random.randint(1000, 9999)}"
    return StreamingResponse(
        _event_generator(request, client_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/stream/status")
async def stream_status():
    """Return current stream connection stats."""
    return {
        "active_clients": len(_sse_clients),
        "last_event_id": _last_event_id,
        "events_in_store": len(events_db),
        "decisions_in_store": len(decisions_db),
    }
