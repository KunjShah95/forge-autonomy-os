"""
Impact-based test selection agent (B-038).

Analyzes code changes to determine which tests should run.
Reduces CI time by selecting only relevant tests based on:
  - Files changed → test mapping
  - Dependency graph impact
  - Historical failure correlation
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
import re

router = APIRouter(prefix="/api/v1", tags=["Test Selection"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class FileChange(BaseModel):
    path: str
    change_type: str  # added | modified | deleted
    diff: str = ""


class TestSelectionRequest(BaseModel):
    trace_id: str = ""
    branch: str = "main"
    files_changed: List[FileChange] = Field(default_factory=list)
    commit_message: str = ""
    repo: str = "forge/autonomy-os"


class SelectedTest(BaseModel):
    test_path: str
    relevance_score: float = Field(..., ge=0.0, le=1.0)
    reason: str = ""
    priority: str = "normal"  # critical | high | normal | low


class TestSelectionResult(BaseModel):
    trace_id: str
    total_files_changed: int
    total_tests_selected: int
    total_tests_skipped: int
    estimated_time_saved_minutes: int
    tests: List[SelectedTest] = Field(default_factory=list)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# Knowledge base — file-to-test mappings
# ---------------------------------------------------------------------------

# Map source file patterns to test files
FILE_TEST_MAP: Dict[str, List[str]] = {
    "backend/app/api.py": ["backend/app/test_all.py::TestCore"],
    "backend/app/schemas.py": ["backend/app/test_all.py::TestCore"],
    "backend/app/classifier.py": ["backend/app/test_all.py::TestClassifier"],
    "backend/app/policy.py": ["backend/app/test_all.py::TestPolicy"],
    "backend/app/risk.py": ["backend/app/test_all.py::TestRisk"],
    "backend/app/repair.py": ["backend/app/test_all.py::TestRepair"],
    "backend/app/orchestrator.py": ["backend/app/test_all.py::TestRerun"],
    "backend/app/canary.py": ["backend/app/test_all.py::TestCanary"],
    "backend/app/context.py": ["backend/app/test_all.py::TestContext"],
    "backend/app/incident_summary.py": ["backend/app/test_all.py::TestIncidentSummary"],
    "backend/app/guardian.py": ["backend/app/test_all.py::TestGuardian"],
    "backend/app/demo.py": ["backend/app/test_all.py::TestDemo"],
    "backend/app/replay.py": ["backend/app/test_all.py::TestReplay"],
    "backend/app/rbac.py": ["backend/app/test_all.py::TestRBAC"],
    "backend/app/webhooks.py": ["backend/app/test_all.py::TestWebhooks"],
    "backend/app/chaos.py": ["backend/app/test_chaos.py"],
    "backend/app/event_bus.py": ["backend/app/test_event_bus.py"],
    "src/lib/apiClient.ts": ["src/test/dashboard.test.tsx"],
    "src/pages/Dashboard.tsx": ["src/test/dashboard.test.tsx"],
    "src/pages/SprintPlanning.tsx": ["src/test/sprintPlanning.test.tsx"],
    "src/pages/PilotDashboard.tsx": ["src/test/pilotDashboard.test.tsx"],
}

# Module dependency chains (if module A changes, these related modules may also need testing)
MODULE_DEPENDENCIES: Dict[str, List[str]] = {
    "backend/app/schemas.py": ["backend/app/api.py", "backend/app/webhooks.py"],
    "backend/app/classifier.py": ["backend/app/repair.py", "backend/app/quarantine.py"],
    "backend/app/policy.py": ["backend/app/orchestrator.py"],
    "backend/app/risk.py": ["backend/app/orchestrator.py", "backend/app/canary.py"],
    "backend/app/event_bus.py": ["backend/app/webhooks.py", "backend/app/operator.py"],
}

# Directory-level test mappings (for when entire directories change)
DIRECTORY_TEST_MAP: Dict[str, List[str]] = {
    "backend/app/": ["backend/app/test_all.py", "backend/app/test_chaos.py", "backend/app/test_event_bus.py"],
    "src/pages/": ["src/test/dashboard.test.tsx"],
    "src/components/": ["src/test/dashboard.test.tsx", "src/test/pilotDashboard.test.tsx"],
}


def select_tests(req: TestSelectionRequest) -> TestSelectionResult:
    """Select relevant tests based on files changed and commit context."""
    selected: Dict[str, SelectedTest] = {}
    backend_changes = 0
    frontend_changes = 0

    for fc in req.files_changed:
        if fc.path.startswith("backend/"):
            backend_changes += 1
        elif fc.path.startswith("src/"):
            frontend_changes += 1

        # 1. Direct file-to-test mapping
        direct_tests = FILE_TEST_MAP.get(fc.path, [])
        for test in direct_tests:
            if test not in selected:
                selected[test] = SelectedTest(
                    test_path=test,
                    relevance_score=1.0,
                    reason=f"Directly affected by {fc.change_type} file: {fc.path}",
                    priority="critical",
                )

        # 2. Directory-level mapping
        for dir_path, tests in DIRECTORY_TEST_MAP.items():
            if fc.path.startswith(dir_path):
                for test in tests:
                    if test not in selected:
                        selected[test] = SelectedTest(
                            test_path=test,
                            relevance_score=0.9,
                            reason=f"Changed file in directory {dir_path}: {fc.path}",
                            priority="high",
                        )

        # 3. Dependency chain mapping
        for module, dependents in MODULE_DEPENDENCIES.items():
            if fc.path == module:
                for dep in dependents:
                    dep_tests = FILE_TEST_MAP.get(dep, [])
                    for test in dep_tests:
                        if test not in selected:
                            selected[test] = SelectedTest(
                                test_path=test,
                                relevance_score=0.7,
                                reason=f"Dependency chain: {module} affects {dep}",
                                priority="high",
                            )

    # 4. Commit message analysis
    commit_lower = req.commit_message.lower()
    if "db" in commit_lower or "database" in commit_lower or "migration" in commit_lower:
        for test in ["backend/app/test_all.py::TestContext", "backend/app/test_all.py::TestCore"]:
            if test not in selected:
                selected[test] = SelectedTest(
                    test_path=test,
                    relevance_score=0.8,
                    reason="Commit message suggests database changes",
                    priority="high",
                )

    if "config" in commit_lower or "env" in commit_lower:
        for test in ["backend/app/test_all.py::TestClassifier", "backend/app/test_all.py::TestPolicy"]:
            if test not in selected:
                selected[test] = SelectedTest(
                    test_path=test,
                    relevance_score=0.75,
                    reason="Commit message suggests configuration changes",
                    priority="normal",
                )

    if "ui" in commit_lower or "frontend" in commit_lower or "page" in commit_lower:
        for test in ["src/test/dashboard.test.tsx", "src/test/pilotDashboard.test.tsx"]:
            if test not in selected:
                selected[test] = SelectedTest(
                    test_path=test,
                    relevance_score=0.85,
                    reason="Commit message suggests frontend changes",
                    priority="high",
                )

    # Estimate total test count (full suite ≈ 88 backend + 15 frontend)
    TOTAL_TESTS_ESTIMATE = 103
    selected_count = len(selected) * 3  # rough: each test file has ~3 tests
    skipped_count = TOTAL_TESTS_ESTIMATE - selected_count

    # Estimate time saved: full suite ~5min, selected suite ~1min per test file
    time_saved = max(0, int((TOTAL_TESTS_ESTIMATE - selected_count) * 2.5))

    tests_list = list(selected.values())
    tests_list.sort(key=lambda t: {"critical": 0, "high": 1, "normal": 2, "low": 3}[t.priority])

    confidence = min(0.5 + (len(req.files_changed) / 20) * 0.4, 0.95)

    return TestSelectionResult(
        trace_id=req.trace_id or f"tsel-{datetime.now(timezone.utc).timestamp()}",
        total_files_changed=len(req.files_changed),
        total_tests_selected=selected_count,
        total_tests_skipped=max(0, skipped_count),
        estimated_time_saved_minutes=time_saved,
        tests=tests_list,
        confidence=round(confidence, 2),
    )


def get_selected_tests(req: TestSelectionRequest) -> TestSelectionResult:
    """Alias for select_tests — gets selected tests from a request."""
    return select_tests(req)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/test-selection/select", response_model=TestSelectionResult)
def select_tests_endpoint(req: TestSelectionRequest):
    """Select relevant tests based on code changes (B-038)."""
    return select_tests(req)


@router.get("/test-selection/mappings", response_model=Dict[str, List[str]])
def list_test_mappings():
    """List all file-to-test mappings used by the test selection agent."""
    return FILE_TEST_MAP


@router.get("/test-selection/impact/{file_path:path}", response_model=Dict[str, Any])
def analyze_file_impact(file_path: str):
    """Analyze the impact of changing a specific file on the test suite."""
    direct = FILE_TEST_MAP.get(file_path, [])
    indirect = []
    for module, dependents in MODULE_DEPENDENCIES.items():
        if file_path == module:
            for dep in dependents:
                dep_tests = FILE_TEST_MAP.get(dep, [])
                indirect.extend(dep_tests)

    return {
        "file_path": file_path,
        "direct_tests_affected": direct,
        "indirect_tests_affected": indirect,
        "total_tests": len(direct) + len(indirect),
    }
