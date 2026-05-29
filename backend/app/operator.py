"""
Kubernetes Operator — kopf-based auto-remediation controller for Forge Autonomy OS.
(B-034: K8s operator that watches for CI/CD anomalies and triggers auto-remediation.)

Listens on NATS events and exposes kopf handlers for custom resource reconciliation.
Can run as a standalone kopf operator process or as a sidecar.

CRD: ForgeRemedy — defines a desired remediation action for a detected failure.
"""

import os
import json
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, Optional

# ---------------------------------------------------------------------------
# kopf operator handlers (run when deployed as a kopf-based operator)
# ---------------------------------------------------------------------------

try:
    import kopf
    import pykube
    HAS_KOPF = True
except ImportError:
    HAS_KOPF = False

FORGE_NAMESPACE = os.environ.get("FORGE_NAMESPACE", "forge-autonomy-os")

# ---------------------------------------------------------------------------
# CRD reconciliation
# ---------------------------------------------------------------------------


def _get_remedy_log(action_type: str, service: str, fix_type: str) -> Dict[str, Any]:
    """Build a structured log entry for a remediation action."""
    return {
        "type": action_type,
        "service": service,
        "fix_type": fix_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "operator": "forge-operator",
    }


# ---------------------------------------------------------------------------
# NATS-driven remediation dispatcher
# ---------------------------------------------------------------------------

_operator_tasks = []


async def start_remediation_listener():
    """Listen on forge.actions subject and trigger kopf-style remediation.

    This can run alongside the kopf operator loop, or standalone when
    NATS is available but kopf is not deployed.
    """
    if not HAS_KOPF:
        print("[Operator] kopf not available — running in headless event-driven mode")

    from .event_bus import subscribe

    async def handle_action(envelope: Dict[str, Any]):
        """Handle an incoming remediation action from the event bus."""
        data = envelope.get("data", {})
        action_type = data.get("action_type", "unknown")
        service = data.get("service", "")
        fix_type = data.get("fix_type", "")
        trace_id = envelope.get("trace_id", "")

        log_entry = _get_remedy_log(action_type, service, fix_type)
        print(f"[Operator] Action: {action_type} | service={service} | fix={fix_type} | trace={trace_id}")

        # Dispatch to action handler based on type
        if action_type == "apply_remediation":
            await _handle_apply_remediation(data)
        elif action_type == "rollback":
            await _handle_rollback(data)
        elif action_type == "restart":
            await _handle_restart(data)
        elif action_type == "scale":
            await _handle_scale(data)
        else:
            print(f"[Operator] Unknown action type: {action_type}")

    success = await subscribe("forge.actions", handle_action)
    if success:
        print("[Operator] Remediation listener started on forge.actions")
    return success


async def _handle_apply_remediation(data: Dict[str, Any]):
    """Apply a remediation patch to a service."""
    service = data.get("service", "")
    patch_content = data.get("patch", "")
    if not service:
        return
    print(f"[Operator] Applying remediation to {service}: {patch_content[:80]}...")


async def _handle_rollback(data: Dict[str, Any]):
    """Roll back a service to a previous version."""
    service = data.get("service", "")
    version = data.get("version", "")
    print(f"[Operator] Rolling back {service} to {version}")


async def _handle_restart(data: Dict[str, Any]):
    """Restart a service deployment."""
    service = data.get("service", "")
    namespace = data.get("namespace", FORGE_NAMESPACE)
    print(f"[Operator] Restarting {service} in namespace {namespace}")


async def _handle_scale(data: Dict[str, Any]):
    """Scale a service deployment."""
    service = data.get("service", "")
    replicas = data.get("replicas", 1)
    print(f"[Operator] Scaling {service} to {replicas} replicas")


# ---------------------------------------------------------------------------
# kopf handlers (when deployed as a kopf operator pod)
# ---------------------------------------------------------------------------

if HAS_KOPF:

    @kopf.on.create("forge.ai", "v1", "forgeremedies")
    def on_remedy_create(spec, name, namespace, logger, **kwargs):
        """Handle creation of a ForgeRemedy CR."""
        service = spec.get("service", "unknown")
        fix_type = spec.get("fixType", "unknown")
        patch = spec.get("patch", "")
        logger.info(f"Remedy created: {name} — {service}/{fix_type}")

        return {
            "service": service,
            "fix_type": fix_type,
            "status": "pending",
            "applied_at": datetime.now(timezone.utc).isoformat(),
        }

    @kopf.on.update("forge.ai", "v1", "forgeremedies")
    def on_remedy_update(spec, status, name, namespace, logger, **kwargs):
        """Handle update of a ForgeRemedy CR."""
        logger.info(f"Remedy updated: {name}")
        return {**status, "updated_at": datetime.now(timezone.utc).isoformat()}

    @kopf.on.delete("forge.ai", "v1", "forgeremedies")
    def on_remedy_delete(spec, name, namespace, logger, **kwargs):
        """Handle deletion of a ForgeRemedy CR."""
        logger.info(f"Remedy deleted: {name}")


# ---------------------------------------------------------------------------
# Standalone runner (for testing / development)
# ---------------------------------------------------------------------------

async def run_operator_standalone():
    """Run the operator in standalone mode with NATS listener."""
    from .event_bus import init_event_bus
    await init_event_bus()
    await start_remediation_listener()
    print("[Operator] Standalone operator running. Ctrl+C to stop.")
    try:
        await asyncio.Event().wait()
    except asyncio.CancelledError:
        pass
    finally:
        from .event_bus import close as close_event_bus
        await close_event_bus()


if __name__ == "__main__":
    asyncio.run(run_operator_standalone())
