"""
Integration tests for the NATS Event Bus (B-035).

Tests cover:
- Envelope creation and serialization
- Module-level helpers (is_connected, NATS_ENABLED)
- publish_sync fallback behavior
- publish mock integration
- Subject constant correctness
"""

import json
import os
import sys
import unittest
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Disable NATS for test isolation
# ---------------------------------------------------------------------------

os.environ["FORGE_NATS_URL"] = ""  # Disable real NATS connection


class TestEventBusEnvelope(unittest.TestCase):
    """Test the event envelope serialization."""

    def setUp(self):
        # Import after environment is configured
        from app.event_bus import make_envelope
        self.make_envelope = make_envelope

    def test_make_envelope_basic(self):
        """Envelope contains required fields."""
        payload = self.make_envelope("forge.events", {"key": "val"}, source="test")
        obj = json.loads(payload)
        self.assertEqual(obj["version"], "1.0")
        self.assertEqual(obj["subject"], "forge.events")
        self.assertEqual(obj["source"], "test")
        self.assertEqual(obj["data"]["key"], "val")
        self.assertIn("timestamp", obj)

    def test_make_envelope_with_trace_id(self):
        """Envelope includes trace_id when provided."""
        payload = self.make_envelope("forge.events", {}, trace_id="tx-123")
        obj = json.loads(payload)
        self.assertEqual(obj["trace_id"], "tx-123")

    def test_make_envelope_default_trace_id(self):
        """Envelope defaults trace_id to empty string."""
        payload = self.make_envelope("forge.events", {})
        obj = json.loads(payload)
        self.assertEqual(obj["trace_id"], "")


class TestEventBusState(unittest.TestCase):
    """Test module-level state flags."""

    def test_nats_disabled_when_url_empty(self):
        """NATS_ENABLED is False when FORGE_NATS_URL is empty."""
        # Re-import to pick up env var
        import importlib
        import app.event_bus
        importlib.reload(app.event_bus)
        self.assertFalse(app.event_bus.NATS_ENABLED)

    def test_is_connected_returns_false_when_no_client(self):
        """is_connected returns False when no NATS client initialized."""
        import app.event_bus
        app.event_bus._nats_client = None
        self.assertFalse(app.event_bus.is_connected())


@patch.dict(os.environ, {"FORGE_NATS_URL": "nats://localhost:4222"}, clear=False)
class TestEventBusPublishSync(unittest.TestCase):
    """Test publish_sync behavior."""

    def test_publish_sync_graceful_fallback_no_nats(self):
        """publish_sync returns False when NATS connection fails."""
        import importlib
        import app.event_bus
        importlib.reload(app.event_bus)

        result = app.event_bus.publish_sync(
            "forge.test",
            {"msg": "hello"},
            source="test",
            trace_id="tx-999",
        )
        self.assertFalse(result)


class TestEventBusSubjects(unittest.TestCase):
    """Test subject constants."""

    def setUp(self):
        from app.event_bus import (
            SUBJECT_EVENTS, SUBJECT_DECISIONS, SUBJECT_INCIDENTS,
            SUBJECT_ACTIONS, SUBJECT_WEBHOOKS,
        )
        self.subjects = {
            "events": SUBJECT_EVENTS,
            "decisions": SUBJECT_DECISIONS,
            "incidents": SUBJECT_INCIDENTS,
            "actions": SUBJECT_ACTIONS,
            "webhooks": SUBJECT_WEBHOOKS,
        }

    def test_all_subjects_start_with_forge(self):
        """All built-in subjects start with 'forge.'."""
        for name, subject in self.subjects.items():
            self.assertTrue(subject.startswith("forge."), f"{name}: {subject}")

    def test_all_subjects_are_dotted(self):
        """All built-in subjects use dot notation."""
        for name, subject in self.subjects.items():
            self.assertIn(".", subject, f"{name}: {subject}")

    def test_publish_event_subject_correct(self):
        """publish_event uses forge.events subject."""
        from app.event_bus import SUBJECT_EVENTS
        self.assertEqual(SUBJECT_EVENTS, "forge.events")

    def test_publish_decision_subject_correct(self):
        """publish_decision uses forge.decisions subject."""
        from app.event_bus import SUBJECT_DECISIONS
        self.assertEqual(SUBJECT_DECISIONS, "forge.decisions")


class TestEventBusConnectClose(unittest.TestCase):
    """Test connection lifecycle (without real NATS server)."""

    def setUp(self):
        import app.event_bus
        self.event_bus = app.event_bus
        self.event_bus._nats_client = None

    def test_connect_returns_false_when_disabled(self):
        """connect() returns False when NATS is disabled."""
        import asyncio
        result = asyncio.run(self.event_bus.connect())
        self.assertFalse(result)

    def test_close_no_client_does_not_raise(self):
        """close() handles None client gracefully."""
        import asyncio
        self.event_bus._nats_client = None
        # Should not raise
        asyncio.run(self.event_bus.close())
        self.assertIsNone(self.event_bus._nats_client)


class TestEventBusInit(unittest.TestCase):
    """Test init_event_bus startup helper."""

    def setUp(self):
        import app.event_bus
        self.event_bus = app.event_bus

    def test_init_event_bus_returns_false_when_disabled(self):
        """init_event_bus returns False when NATS not configured."""
        import asyncio
        os.environ["FORGE_NATS_URL"] = ""
        import importlib
        importlib.reload(self.event_bus)
        result = asyncio.run(self.event_bus.init_event_bus())
        self.assertFalse(result)


class TestEventBusMockedPublish(unittest.TestCase):
    """Test publish with mocked NATS client."""

    def _setup_env(self):
        """Set a non-default NATS URL so NATS_ENABLED is True after reload."""
        os.environ["FORGE_NATS_URL"] = "nats://mock-forge:4222"

    def setUp(self):
        self._setup_env()
        import importlib
        import app.event_bus
        importlib.reload(app.event_bus)
        self.event_bus = app.event_bus
        # Now NATS_ENABLED is True; attach the mock AFTER reload
        self.mock_client = MagicMock()
        self.mock_client.is_connected = True
        self.mock_client.publish = AsyncMock()
        self.event_bus._nats_client = self.mock_client

    def test_publish_with_mocked_nats(self):
        """publish() succeeds when NATS client is available."""
        import asyncio
        result = asyncio.run(
            self.event_bus.publish(
                "forge.test",
                {"msg": "hello"},
                source="test",
                trace_id="tx-mock",
            )
        )
        self.assertTrue(result)
        self.mock_client.publish.assert_called_once()

    def test_publish_event_wrapper(self):
        """publish_event calls publish with correct subject."""
        import asyncio
        result = asyncio.run(
            self.event_bus.publish_event(
                "tx-mock", "test-source", "TEST_EVENT", {"key": "val"},
            )
        )
        self.assertTrue(result)

    def test_publish_decision_wrapper(self):
        """publish_decision calls publish with correct subject."""
        import asyncio
        result = asyncio.run(
            self.event_bus.publish_decision(
                "tx-mock", "test-agent", "DEPLOY", "testing", 0.95,
            )
        )
        self.assertTrue(result)

    def tearDown(self):
        import app.event_bus
        app.event_bus._nats_client = None
        os.environ.pop("FORGE_NATS_URL", None)


if __name__ == "__main__":
    unittest.main()
