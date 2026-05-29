"""
NATS Event Bus — async publisher/subscriber abstraction for Forge Autonomy OS.
(B-035: Real-time event bus for agent coordination and external integration.)

Provides:
- Async publisher: publish events to NATS subjects
- Async subscriber: subscribe to subjects with handler callbacks
- JSON-encoded event envelope
- Graceful connection lifecycle (connect / close)
- Optional fallback when NATS is unavailable
"""

import asyncio
import json
import os
from datetime import datetime, timezone
from typing import Any, Callable, Coroutine, Dict, List, Optional

NATS_URL = os.environ.get("FORGE_NATS_URL", "nats://localhost:4222")
NATS_ENABLED = bool(NATS_URL and NATS_URL != "nats://localhost:4222")

# ---------------------------------------------------------------------------
# Event envelope
# ---------------------------------------------------------------------------

ENVELOPE_VERSION = "1.0"

def make_envelope(
    subject: str,
    data: Dict[str, Any],
    source: str = "forge",
    trace_id: Optional[str] = None,
) -> str:
    """Wrap a payload in the canonical event envelope and return JSON."""
    envelope = {
        "version": ENVELOPE_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": source,
        "subject": subject,
        "trace_id": trace_id or "",
        "data": data,
    }
    return json.dumps(envelope, default=str)


# ---------------------------------------------------------------------------
# Internal NATS client wrapper
# ---------------------------------------------------------------------------

_nats_client = None
_subscription_tasks: List[asyncio.Task] = []


async def connect() -> bool:
    """Connect to the NATS server. Returns True if connected."""
    global _nats_client
    if _nats_client and _nats_client.is_connected:
        return True
    if not NATS_ENABLED:
        return False
    try:
        import nats
        _nats_client = await nats.connect(
            NATS_URL,
            max_reconnect_attempts=5,
            reconnect_time_wait=2,
        )
        print(f"[EventBus] Connected to NATS at {NATS_URL}")
        return True
    except Exception as e:
        print(f"[EventBus] NATS connection failed: {e}")
        return False


async def close():
    """Close the NATS connection and cancel subscriptions."""
    global _nats_client
    for task in _subscription_tasks:
        task.cancel()
    _subscription_tasks.clear()
    if _nats_client:
        try:
            await _nats_client.close()
        except Exception:
            pass
        _nats_client = None


def is_connected() -> bool:
    """Check if NATS client is connected."""
    return _nats_client is not None and getattr(_nats_client, "is_connected", False)


# ---------------------------------------------------------------------------
# Publish
# ---------------------------------------------------------------------------


async def publish(
    subject: str,
    data: Dict[str, Any],
    source: str = "forge",
    trace_id: Optional[str] = None,
) -> bool:
    """Publish an event to a NATS subject. Returns True on success."""
    if not is_connected():
        if not await connect():
            return False
    try:
        payload = make_envelope(subject, data, source, trace_id)
        await _nats_client.publish(subject, payload.encode())
        return True
    except Exception as e:
        print(f"[EventBus] Publish to '{subject}' failed: {e}")
        return False


# ---------------------------------------------------------------------------
# Subscribe
# ---------------------------------------------------------------------------


async def subscribe(
    subject: str,
    handler: Callable[[Dict[str, Any]], Coroutine[Any, Any, None]],
    queue: Optional[str] = None,
) -> bool:
    """Subscribe to a NATS subject with an async handler."""
    if not is_connected():
        if not await connect():
            return False
    try:
        async def callback(msg):
            try:
                data = json.loads(msg.data.decode())
                await handler(data)
            except Exception as e:
                print(f"[EventBus] Handler error for '{subject}': {e}")

        if queue:
            sub = await _nats_client.subscribe(subject, cb=callback, queue=queue)
        else:
            sub = await _nats_client.subscribe(subject, cb=callback)

        task = asyncio.create_task(_drain_worker(sub, subject))
        _subscription_tasks.append(task)
        print(f"[EventBus] Subscribed to '{subject}'" + (f" (queue={queue})" if queue else ""))
        return True
    except Exception as e:
        print(f"[EventBus] Subscribe to '{subject}' failed: {e}")
        return False


async def _drain_worker(sub, subject: str):
    """Keep subscription alive until cancelled."""
    try:
        await asyncio.Event().wait()  # run forever
    except asyncio.CancelledError:
        pass
    finally:
        try:
            await sub.drain()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Sync wrapper for use in existing sync endpoints
# ---------------------------------------------------------------------------

def publish_sync(
    subject: str,
    data: Dict[str, Any],
    source: str = "forge",
    trace_id: Optional[str] = None,
) -> bool:
    """Sync wrapper for publish()."""
    if not NATS_ENABLED:
        return False
    try:
        loop = asyncio.get_running_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                future = pool.submit(asyncio.run, publish(subject, data, source, trace_id))
                return future.result()
        else:
            return loop.run_until_complete(publish(subject, data, source, trace_id))
    except RuntimeError:
        return asyncio.run(publish(subject, data, source, trace_id))
    except Exception as e:
        print(f"[EventBus] publish_sync failed: {e}")
        return False


# ---------------------------------------------------------------------------
# Built-in subject conventions
# ---------------------------------------------------------------------------

SUBJECT_EVENTS = "forge.events"
SUBJECT_DECISIONS = "forge.decisions"
SUBJECT_INCIDENTS = "forge.incidents"
SUBJECT_ACTIONS = "forge.actions"
SUBJECT_WEBHOOKS = "forge.webhooks"


async def publish_event(trace_id: str, source: str, event_type: str, payload: dict) -> bool:
    """Publish a normalized event to the forge.events subject."""
    return await publish(
        SUBJECT_EVENTS,
        {"trace_id": trace_id, "source": source, "type": event_type, "payload": payload},
        source=source,
        trace_id=trace_id,
    )


async def publish_decision(trace_id: str, agent: str, action: str, reason: str, confidence: float) -> bool:
    """Publish a decision to the forge.decisions subject."""
    return await publish(
        SUBJECT_DECISIONS,
        {"trace_id": trace_id, "agent": agent, "action": action, "reason": reason, "confidence": confidence},
        source=agent,
        trace_id=trace_id,
    )


# ---------------------------------------------------------------------------
# Module-level startup helper
# ---------------------------------------------------------------------------

async def init_event_bus():
    """Initialize the NATS connection (call from FastAPI startup)."""
    if not NATS_ENABLED:
        print("[EventBus] NATS not configured. Set FORGE_NATS_URL to enable.")
        return False
    success = await connect()
    if success:
        print("[EventBus] Event bus initialized")
    return success
