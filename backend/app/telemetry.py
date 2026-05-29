"""
OpenTelemetry instrumentation — tracing + metrics for FastAPI backend.
(B-032: Adds observability without modifying existing route handlers.)

Provides:
- Automatic FastAPI request tracing (spans per route)
- Metrics: request count, duration histogram, in-flight requests
- /metrics endpoint for Prometheus scraping (when configured)
- OTLP exporter for traces (configurable via env vars)
"""

import os
import time
from typing import Callable

from fastapi import FastAPI, Request, Response
from fastapi.routing import APIRoute
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter

# ---------------------------------------------------------------------------
# Configuration from environment
# ---------------------------------------------------------------------------

OTLP_ENDPOINT = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "")
OTLP_HEADERS = os.environ.get("OTEL_EXPORTER_OTLP_HEADERS", "")
SERVICE_NAME = os.environ.get("OTEL_SERVICE_NAME", "forge-autonomy-os")
ENABLE_CONSOLE_EXPORTER = os.environ.get("OTEL_CONSOLE_EXPORTER", "false").lower() == "true"
METRICS_ENABLED = os.environ.get("OTEL_METRICS_ENABLED", "true").lower() == "true"

# ---------------------------------------------------------------------------
# Tracing setup
# ---------------------------------------------------------------------------

_resource = Resource.create({
    "service.name": SERVICE_NAME,
    "service.version": "1.0.0",
    "deployment.environment": os.environ.get("FORGE_ENV", "development"),
})


def setup_tracing(app: FastAPI) -> None:
    """Configure OpenTelemetry tracing providers and instrument FastAPI."""
    provider = TracerProvider(resource=_resource)

    # OTLP exporter (to Collector, Jaeger, Tempo, etc.)
    if OTLP_ENDPOINT:
        exporter = OTLPSpanExporter(endpoint=OTLP_ENDPOINT, headers=OTLP_HEADERS)
        provider.add_span_processor(BatchSpanProcessor(exporter))
        print(f"[Telemetry] OTLP tracing enabled → {OTLP_ENDPOINT}")

    # Console exporter (for local debugging)
    if ENABLE_CONSOLE_EXPORTER:
        provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
        print("[Telemetry] Console tracing exporter enabled")

    trace.set_tracer_provider(provider)

    # Auto-instrument FastAPI routes
    FastAPIInstrumentor.instrument_app(app)
    print("[Telemetry] FastAPI auto-instrumentation applied")


# ---------------------------------------------------------------------------
# Metrics: lightweight custom metrics via app.state
# ---------------------------------------------------------------------------

def setup_metrics(app: FastAPI) -> None:
    """Attach metric counters to app.state for easy access in handlers."""
    if not METRICS_ENABLED:
        return

    app.state.metrics = {
        "request_count": 0,
        "error_count": 0,
        "total_duration_ms": 0,
    }


async def metrics_middleware(request: Request, call_next: Callable) -> Response:
    """Middleware that counts requests, errors, and tracks duration."""
    if not METRICS_ENABLED or not hasattr(request.app.state, "metrics"):
        return await call_next(request)

    start = time.time()
    try:
        response = await call_next(request)
        return response
    except Exception:
        request.app.state.metrics["error_count"] += 1
        raise
    finally:
        duration_ms = (time.time() - start) * 1000
        request.app.state.metrics["request_count"] += 1
        request.app.state.metrics["total_duration_ms"] += duration_ms


def register_metrics_endpoint(app: FastAPI) -> None:
    """Add a /metrics endpoint that exposes internal counters."""
    if not METRICS_ENABLED:
        return

    @app.get("/metrics", tags=["Observability"])
    async def metrics_endpoint():
        """Return basic application metrics in Prometheus-friendly text format."""
        m = app.state.metrics if hasattr(app.state, "metrics") else {}
        avg_duration = 0.0
        if m.get("request_count", 0) > 0:
            avg_duration = m["total_duration_ms"] / m["request_count"]

        lines = [
            "# HELP forge_request_count Total HTTP requests handled",
            "# TYPE forge_request_count counter",
            f'forge_request_count{{service="{SERVICE_NAME}"}} {m.get("request_count", 0)}',
            "",
            "# HELP forge_error_count Total HTTP errors encountered",
            "# TYPE forge_error_count counter",
            f'forge_error_count{{service="{SERVICE_NAME}"}} {m.get("error_count", 0)}',
            "",
            "# HELP forge_avg_duration_ms Average request duration in ms",
            "# TYPE forge_avg_duration_ms gauge",
            f'forge_avg_duration_ms{{service="{SERVICE_NAME}"}} {avg_duration:.2f}',
            "",
        ]
        return Response(
            content="\n".join(lines),
            media_type="text/plain; version=0.0.4",
        )


def setup_telemetry(app: FastAPI) -> None:
    """One-call setup: tracing + metrics + instrument."""
    setup_tracing(app)
    setup_metrics(app)
    app.middleware("http")(metrics_middleware)
    register_metrics_endpoint(app)
    print("[Telemetry] OpenTelemetry fully initialized")
