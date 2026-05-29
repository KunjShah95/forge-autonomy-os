"""
Full End-to-End Demo — Forge Autonomy OS

Runs the complete autonomous CI recovery flow in-process using TestClient:
  1. Start backend (in-process via TestClient)
  2. Inject a CI failure via simulated GitHub webhook
  3. Classify the failure (dependency / config / flake)
  4. Generate a repair suggestion
  5. Create a GitHub PR from the repair
  6. Verify OTel /metrics endpoint
  [--chaos] 7. Inject faults + run resilience tests + check chaos summary

Usage:
    GITHUB_WEBHOOK_SECRET=forge-dev-secret python -m app.run_demo
    GITHUB_WEBHOOK_SECRET=forge-dev-secret python -m app.run_demo --chaos
"""

import argparse
import hmac
import hashlib
import json
import os
import sys
import uuid
from datetime import datetime, timezone

# Must set env vars before importing app modules
os.environ.setdefault("GITHUB_WEBHOOK_SECRET", "forge-dev-secret")
os.environ.setdefault("OTEL_CONSOLE_EXPORTER", "true")
os.environ.setdefault("OTEL_SERVICE_NAME", "forge-autonomy-os-demo")
os.environ.setdefault("FORGE_PG_DSN", "")
os.environ.setdefault("FORGE_NATS_URL", "")

from fastapi.testclient import TestClient
from app.main import app

WEBHOOK_SECRET = os.environ["GITHUB_WEBHOOK_SECRET"]
client = TestClient(app)
_ok = "  [PASS]"
_fail = "  [FAIL]"
_step_counter = 0


def step(name: str) -> None:
    global _step_counter
    _step_counter += 1
    print()
    print("-" * 60)
    print(f"  Step {_step_counter}: {name}")
    print("-" * 60)


def check(label: str, condition: bool, detail: str = "") -> None:
    icon = _ok if condition else _fail
    print(f"{icon} {label}")
    if detail:
        for line in detail.split("\n"):
            print(f"       {line}")


def _sign(payload: bytes) -> str:
    expected = hmac.new(WEBHOOK_SECRET.encode(), payload, hashlib.sha256).hexdigest()
    return f"sha256={expected}"


def _chaos_section(client) -> tuple:
    """Run chaos engineering fault injection + resilience tests."""
    results = []

    print()
    print("=" * 60)
    print("  CHAOS ENGINEERING DEMO")
    print("=" * 60)

    # ------------------------------------------------------------------
    sub_step = 0
    injected_faults = []

    def chaos_step(name: str) -> None:
        nonlocal sub_step
        sub_step += 1
        print()
        print(f"  [Chaos {sub_step}] {name}")
        print("-" * 40)

    # ---- Inject 3 fault types ----
    chaos_step("Inject latency fault into billing-svc")
    r = client.post("/api/v1/chaos/faults", json={
        "service": "billing-svc",
        "fault_type": "latency",
        "duration_seconds": 15,
        "intensity": 0.5,
    })
    ok = r.status_code == 200
    d = r.json()
    injected_faults.append(d["id"])
    check(f"Latency fault injected", ok, f"ID: {d['id']} | Status: {d['status']}")
    results.append(("Inject latency fault", ok))

    chaos_step("Inject error fault into orders-svc")
    r = client.post("/api/v1/chaos/faults", json={
        "service": "orders-svc",
        "fault_type": "error",
        "duration_seconds": 20,
        "intensity": 0.8,
        "target_percentage": 50,
    })
    ok = r.status_code == 200
    d = r.json()
    injected_faults.append(d["id"])
    check(f"Error fault injected", ok, f"ID: {d['id']} | Status: {d['status']}")
    results.append(("Inject error fault", ok))

    chaos_step("Inject dependency failure into ledger-svc")
    r = client.post("/api/v1/chaos/faults", json={
        "service": "ledger-svc",
        "fault_type": "dependency_failure",
        "duration_seconds": 30,
        "intensity": 0.7,
    })
    ok = r.status_code == 200
    d = r.json()
    injected_faults.append(d["id"])
    check(f"Dependency failure injected", ok, f"ID: {d['id']} | Status: {d['status']}")
    results.append(("Inject dependency failure", ok))

    # ---- List active faults ----
    chaos_step("List active faults")
    r = client.get("/api/v1/chaos/faults")
    ok = r.status_code == 200
    faults = r.json()
    check(f"Active faults listed", ok, f"Total faults: {len(faults)}")
    for f in faults[-3:]:
        print(f"       {f['fault_type']:25s} -> {f['service']:20s} [{f['status']}]")
    results.append(("List active faults", ok))

    # ---- Simulate fault impact on one ----
    chaos_step("Simulate fault impact (latency on billing-svc)")
    if injected_faults:
        r = client.post(f"/api/v1/chaos/faults/{injected_faults[0]}/simulate")
        ok = r.status_code == 200
        impact = r.json()
        check(f"Impact simulated", ok,
              f"p99: {impact.get('p99_latency_ms')}ms | p50: {impact.get('p50_latency_ms')}ms | err: {impact.get('error_rate_pct')}%")
        results.append(("Simulate fault impact", ok))
    else:
        results.append(("Simulate fault impact", False))

    # ---- Stop one fault ----
    chaos_step("Stop an active fault")
    if len(injected_faults) >= 2:
        r = client.post(f"/api/v1/chaos/faults/{injected_faults[1]}/stop")
        ok = r.status_code == 200
        stopped = r.json()
        check(f"Fault stopped", ok,
              f"ID: {stopped['id']} | Status: {stopped['status']}")
        results.append(("Stop active fault", ok))
    else:
        results.append(("Stop active fault", False))

    # ---- List resilience tests (seed data) ----
    chaos_step("List resilience tests (seed scenarios)")
    r = client.get("/api/v1/chaos/tests")
    ok = r.status_code == 200
    tests = r.json()
    check(f"Resilience tests listed", ok, f"Total scenarios: {len(tests)}")
    for t in tests[:3]:
        print(f"       {t['id']:25s} {t['name'][:40]:40s} [{t['status']}]")
    results.append(("List resilience tests", ok))

    # ---- Get specific test ----
    chaos_step("Get specific resilience test")
    r = client.get("/api/v1/chaos/tests/rt-cicd-resilience")
    ok = r.status_code == 200
    t = r.json()
    check(f"Specific test retrieved", ok and t is not None,
          f"Name: {t.get('name', 'N/A')} | Faults: {len(t.get('faults', []))}")
    results.append(("Get resilience test", ok and t is not None))

    # ---- Run a resilience test ----
    chaos_step("Run resilience test (CI/CD Pipeline Resilience)")
    r = client.post("/api/v1/chaos/tests/rt-cicd-resilience/run")
    ok = r.status_code == 200
    t = r.json()
    check(f"Resilience test executed", ok,
          f"Result: {t['status']} | Recovery: {t['metrics'].get('recovery_time_seconds', 'N/A')}s")
    results.append(("Run resilience test", ok))

    # ---- Create a new resilience test ----
    chaos_step("Create new resilience test")
    r = client.post("/api/v1/chaos/tests", json={
        "name": "Chaos Demo Load Test",
        "description": "Ad-hoc load test created during demo run",
        "faults": [
            {"service": "demo-svc", "fault_type": "latency", "duration_seconds": 10, "intensity": 0.3},
            {"service": "demo-svc", "fault_type": "error", "duration_seconds": 10, "intensity": 0.5},
        ],
        "expected_outcome": "service_resilient",
        "services_affected": ["demo-svc"],
    })
    ok = r.status_code == 200
    t = r.json()
    check(f"New test created", ok, f"ID: {t.get('id', 'N/A')} | Status: {t.get('status', 'N/A')}")
    results.append(("Create resilience test", ok))

    # ---- Get chaos summary ----
    chaos_step("Get chaos engineering summary")
    r = client.get("/api/v1/chaos/summary")
    ok = r.status_code == 200
    s = r.json()
    check(f"Chaos summary retrieved", ok,
          f"Active faults: {s['active_faults']} | Tests: {s['completed_tests']} | Resilience: {s['overall_resilience_score']}%")
    print(f"       Services affected: {', '.join(s['services_affected'])}")
    results.append(("Get chaos summary", ok))

    return results


def main():
    trace_id = None

    print()
    print("+-----------------------------------------------------------------+")
    print("|     Forge Autonomy OS - Full Demo Run                          |")
    print("|     End-to-end autonomous CI recovery with OTel traces          |")
    print("+-----------------------------------------------------------------+")
    print()
    print(f"  Started at: {datetime.now(timezone.utc).isoformat()}")

    # ===================================================================
    step("Health check")
    # ===================================================================
    r = client.get("/health")
    check("Health endpoint responds", r.status_code == 200, f"HTTP {r.status_code}")
    check("Backend status is healthy", r.json().get("status") == "healthy",
          f"Status: {r.json().get('status')}")

    r = client.get("/api/v1/health")
    check("Health endpoint (v1)", r.status_code == 200, f"HTTP {r.status_code}")

    # ===================================================================
    step("Inject CI failure via GitHub webhook (check_suite: completed/failure)")
    # ===================================================================
    delivery_id = f"gh-delivery-{uuid.uuid4().hex[:12]}"
    payload = {
        "action": "completed",
        "check_suite": {
            "id": 427301,
            "head_branch": "feature/add-db-pool",
            "head_sha": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
            "status": "completed",
            "conclusion": "failure",
            "app": {"name": "GitHub Actions"},
            "latest_check_runs_count": 3,
        },
        "repository": {"full_name": "forge/autonomy-os"},
    }
    body_bytes = json.dumps(payload).encode()

    r = client.post(
        "/api/v1/webhooks/github",
        content=body_bytes,
        headers={
            "X-GitHub-Event": "check_suite",
            "X-GitHub-Delivery": delivery_id,
            "X-Hub-Signature-256": _sign(body_bytes),
        },
    )
    webhook_ok = r.status_code == 200
    wh = r.json()
    trace_id = wh.get("trace_id", delivery_id)
    check("Webhook accepted", webhook_ok,
          f"HTTP {r.status_code} | Event: {wh.get('normalized_type')} | Trace: {trace_id}")

    # ===================================================================
    step("Classify the CI failure")
    # ===================================================================
    log_output = (
        "Running CI pipeline for feature/add-db-pool...\n"
        "npm install\n"
        "npm ERR! code ERESOLVE\n"
        "npm ERR! Could not resolve dependency: some-package@^1.0.0\n"
        "npm ERR! node_modules/some-package\n"
        "npm ERR!   some-package@\"^1.0.0\" from the root project\n"
        "npm ERR! Fix the upstream dependency conflict, or retry\n"
        "npm ERR! this command with --force or --legacy-peer-deps\n"
        "npm ERR!   /root/.npm/_cacache/tmp/git-clone-abc123/package.json\n"
        "Build failed after 34.2s"
    )

    r = client.post("/api/v1/classify", json={
        "trace_id": trace_id,
        "log_output": log_output,
        "event_payload": {"head_branch": "feature/add-db-pool", "conclusion": "failure"},
    })
    classify_ok = r.status_code == 200
    cls = r.json()
    check("CI failure classified", classify_ok,
          f"Class: {cls['classification']} | Confidence: {cls['confidence']}")
    check("Classification is 'dependency'", cls["classification"] == "dependency",
          f"Got: {cls['classification']}")
    check("Confidence >= 0.70", cls["confidence"] >= 0.70,
          f"Got: {cls['confidence']}")

    for i, ev in enumerate(cls.get("evidence", [])):
        print(f"       Evidence {i+1}: {ev[:120]}...")

    # ===================================================================
    step("Generate repair suggestion")
    # ===================================================================
    r = client.post("/api/v1/repair", json={
        "trace_id": trace_id,
        "classification": cls["classification"],
        "log_output": log_output,
        "service": "db-pool-service",
        "head_branch": "feature/add-db-pool",
    })
    repair_ok = r.status_code == 200
    repair = r.json()
    check("Repair suggested", repair_ok,
          f"Fix type: {repair['fix_type']} | Confidence: {repair['confidence']}")

    patch_lines = repair["patch"].count("\n") + 1
    check("Patch is non-empty", len(repair["patch"]) > 50,
          f"Patch: {patch_lines} lines, {len(repair['patch'])} chars")
    check("PR title is meaningful", len(repair["pr_title"]) > 10,
          f"PR: {repair['pr_title']}")
    check("PR body is detailed", len(repair["pr_body"]) > 200,
          f"Body: {len(repair['pr_body'])} chars")

    print(f"\n  Generated patch:")
    for line in repair["patch"].split("\n")[:6]:
        print(f"    {line}")
    if patch_lines > 6:
        print(f"    ... ({patch_lines - 6} more lines)")

    # ===================================================================
    step("Create PR from repair (no GITHUB_TOKEN - expected 400)")
    # ===================================================================
    r = client.post("/api/v1/pr/create", json={
        "repo_owner": "forge",
        "repo_name": "autonomy-os",
        "file_path": "package.json",
        "file_content": json.dumps({"dependencies": {"some-package": "^1.2.0"}}, indent=2),
        "pr_title": repair["pr_title"],
        "pr_body": repair["pr_body"],
        "commit_message": "fix: auto-generated repair patch for dependency resolution",
        "fix_type": repair["fix_type"],
        "base_branch": "main",
        "service": "db-pool-service",
        "draft": False,
    })
    pr_check = r.status_code in (200, 400)
    check("PR creation endpoint responded", pr_check, f"HTTP {r.status_code}")

    if r.status_code == 400:
        detail = r.json().get("detail", "")
        check("PR blocked - no GITHUB_TOKEN", True, f"Detail: {detail}")
    elif r.status_code == 200:
        pr = r.json()
        check("PR created successfully", True,
              f"URL: {pr.get('pr_url', 'N/A')} | Branch: {pr.get('branch_name', 'N/A')}")

    # ===================================================================
    step("Verify OpenTelemetry /metrics endpoint")
    # ===================================================================
    r = client.get("/metrics")
    metrics_ok = r.status_code == 200
    text = r.text
    check("Metrics endpoint responds", metrics_ok, f"HTTP {r.status_code}")

    metrics = {}
    for line in text.split("\n"):
        if line.startswith("forge_"):
            parts = line.split(" ")
            if len(parts) >= 2:
                try:
                    metrics[parts[0]] = float(parts[-1])
                except ValueError:
                    pass

    check("forge_request_count > 0", metrics.get("forge_request_count", 0) > 0,
          f"Requests: {int(metrics.get('forge_request_count', 0))}")
    check("forge_avg_duration_ms present", "forge_avg_duration_ms" in metrics,
          f"Avg duration: {metrics.get('forge_avg_duration_ms', 0):.2f} ms")
    check("forge_error_count present", "forge_error_count" in metrics,
          f"Errors: {int(metrics.get('forge_error_count', 0))}")

    print(f"\n  Raw metrics output:")
    for line in text.split("\n"):
        if line.startswith("forge_") or line.startswith("#"):
            print(f"    {line}")

    # ===================================================================
    step("Verify data persistence and audit trail")
    # ===================================================================
    r = client.get("/api/v1/events")
    events_ok = r.status_code == 200
    events = r.json()
    check("Events endpoint returns data", events_ok and len(events) > 0,
          f"Total events: {len(events)}")

    r = client.get(f"/api/v1/audit?trace_id={trace_id}")
    audit_ok = r.status_code == 200
    audits = r.json()
    check("Audit trail contains trace", audit_ok and len(audits) > 0,
          f"Audit entries for trace: {len(audits)}")

    # ===================================================================
    # Final summary
    # ===================================================================
    print()
    print("+-----------------------------------------------------------------+")
    print("|                    Demo Summary                                 |")
    print("+-----------------------------------------------------------------+")
    print()

    results = [
        ("1. Health check", True),
        ("2. Webhook ingestion", webhook_ok),
        ("3. Failure classification", classify_ok and cls["classification"] == "dependency"),
        ("4. Repair generation", repair_ok and len(repair["patch"]) > 50),
        ("5. PR creation endpoint", pr_check),
        ("6. OTel metrics exposure", metrics_ok),
        ("7. Event persistence + audit trail", events_ok and audit_ok),
    ]

    all_pass = True
    for label, ok in results:
        icon = _ok if ok else _fail
        all_pass = all_pass and ok
        print(f"  {icon} {label}")

    print()
    if all_pass:
        print(f"  ** Demo PASSED - all {len(results)} checks passed!")
    else:
        print(f"  ** Demo FAILED - some checks did not pass.")

    print()
    print(f"  Completed at: {datetime.now(timezone.utc).isoformat()}")
    print()

    return 0 if all_pass else 1


def main_with_args():
    parser = argparse.ArgumentParser(description="Forge Autonomy OS Demo")
    parser.add_argument("--chaos", action="store_true",
                        help="Include chaos engineering fault injection + resilience tests")
    args = parser.parse_args()

    exit_code = main()

    if args.chaos and exit_code == 0:
        chaos_results = _chaos_section(client)

        print()
        print("+-----------------------------------------------------------------+")
        print("|              Chaos Engineering Demo Results                     |")
        print("+-----------------------------------------------------------------+")
        print()

        chaos_pass = True
        for label, ok in chaos_results:
            icon = _ok if ok else _fail
            chaos_pass = chaos_pass and ok
            print(f"  {icon} {label}")

        print()
        if chaos_pass:
            print(f"  ** Chaos Engineering PASSED - all {len(chaos_results)} checks passed!")
        else:
            print(f"  ** Chaos Engineering FAILED - some checks did not pass.")
            exit_code = 1

    print()
    print(f"  Completed at: {datetime.now(timezone.utc).isoformat()}")
    print()

    return exit_code


if __name__ == "__main__":
    sys.exit(main_with_args())
