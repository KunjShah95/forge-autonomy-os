"""
Flaky test quarantine + retry backoff (B-021).

Detects flaky tests, auto-quarantines them with configurable duration,
and implements exponential backoff with jitter for intelligent retries.
"""

import re
import random
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta, timezone

from .classifier import FLAKE_PATTERNS

router = APIRouter(prefix="/api/v1", tags=["Quarantine"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class QuarantineRule(BaseModel):
    """A rule defining how to handle flaky tests."""
    name: str
    description: str = ""
    enabled: bool = True
    max_retries: int = 3
    backoff_base_seconds: float = 10.0
    backoff_max_seconds: float = 300.0
    jitter_factor: float = 0.2  # +/- 20% jitter
    quarantine_duration_minutes: int = 30
    match_pattern: str = ""  # regex pattern to identify flaky tests
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class QuarantinedTest(BaseModel):
    """A test that has been quarantined due to flakiness."""
    test_name: str
    test_file: str = ""
    service: str = ""
    trace_id: str = ""
    classification: str = "flake"
    confidence: float = 0.0
    quarantined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    quarantine_until: datetime = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(minutes=30))
    current_retry_count: int = 0
    max_retries: int = 3
    last_retry_at: Optional[datetime] = None
    next_retry_at: Optional[datetime] = None
    status: str = "quarantined"  # quarantined | retrying | passed | failed
    log_snippet: str = ""
    muted: bool = False


class RetryBackoffRequest(BaseModel):
    trace_id: str
    test_name: str = ""
    test_file: str = ""
    service: str = ""
    log_output: str = ""
    classification: str = "flake"
    confidence: float = 0.0


class RetryBackoffResult(BaseModel):
    trace_id: str
    test_name: str
    status: str  # quarantined | retrying | passed | failed
    current_retry: int = 0
    max_retries: int = 3
    backoff_seconds: float = 0.0
    quarantine_until: Optional[datetime] = None
    next_retry_at: Optional[datetime] = None
    message: str = ""
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# In-memory stores
# ---------------------------------------------------------------------------

quarantine_rules_db: Dict[str, QuarantineRule] = {}
quarantined_tests_db: Dict[str, QuarantinedTest] = {}

# Default rules seeded on module load
_default_rules = [
    QuarantineRule(
        name="default-flaky",
        description="Default rule for flaky test detection and retry",
        enabled=True,
        max_retries=3,
        backoff_base_seconds=10.0,
        backoff_max_seconds=300.0,
        jitter_factor=0.2,
        quarantine_duration_minutes=30,
        match_pattern=r"(timeout|timed out|intermittent|flaky)",
    ),
    QuarantineRule(
        name="aggressive-retry",
        description="Aggressive retry for critical path flaky tests",
        enabled=False,
        max_retries=5,
        backoff_base_seconds=5.0,
        backoff_max_seconds=120.0,
        jitter_factor=0.1,
        quarantine_duration_minutes=60,
        match_pattern=r"(connection refused|ECONNREFUSED|ETIMEDOUT)",
    ),
]

for rule in _default_rules:
    quarantine_rules_db[rule.name] = rule


# ---------------------------------------------------------------------------
# Core logic
# ---------------------------------------------------------------------------

def _is_flaky_test(log_output: str) -> bool:
    """Check if log output suggests a flaky test.
    Uses the FLAKE_PATTERNS from classifier.py to avoid duplication.
    """
    text_lower = log_output.lower()
    for pat in FLAKE_PATTERNS:
        if re.search(pat, text_lower, re.IGNORECASE):
            return True
    return False


def _calculate_backoff(
    retry_count: int,
    base_seconds: float = 10.0,
    max_seconds: float = 300.0,
    jitter_factor: float = 0.2,
) -> float:
    """Calculate exponential backoff with jitter."""
    if retry_count <= 0:
        return 0.0
    delay = base_seconds * (2 ** (retry_count - 1))
    delay = min(delay, max_seconds)
    jitter = delay * jitter_factor * (random.random() * 2 - 1)
    return round(delay + jitter, 1)


def _find_applicable_rule(log_output: str) -> QuarantineRule:
    """Find the first enabled rule matching the log output."""
    for rule in quarantine_rules_db.values():
        if not rule.enabled:
            continue
        if rule.match_pattern and re.search(rule.match_pattern, log_output, re.IGNORECASE):
            return rule
    # Default to first enabled rule or the default-flaky rule
    for rule in quarantine_rules_db.values():
        if rule.enabled:
            return rule
    return quarantine_rules_db.get("default-flaky", QuarantineRule(name="fallback"))


def _extract_test_name(log_output: str) -> str:
    """Extract test name from log output."""
    patterns = [
        r"(?:FAIL|FAILED|failed)\s+([\w./_-]+)",
        r"(?:test|spec)\s+([\w./_-]+)",
        r"Running\s+([\w./_-]+)",
    ]
    for pat in patterns:
        match = re.search(pat, log_output, re.IGNORECASE)
        if match:
            return match.group(1)
    return f"test-{abs(hash(log_output)) % 10000:04d}"


def handle_retry_backoff(req: RetryBackoffRequest) -> RetryBackoffResult:
    """Handle retry/backoff logic for a flaky test."""
    test_name = req.test_name or _extract_test_name(req.log_output)
    
    # Check if test is already quarantined
    existing = quarantined_tests_db.get(test_name)
    
    if existing:
        # Already quarantined — increment retry or check if past quarantine
        now = datetime.now(timezone.utc)
        
        if existing.quarantine_until and now < existing.quarantine_until:
            # Still under quarantine
            return RetryBackoffResult(
                trace_id=req.trace_id,
                test_name=test_name,
                status="quarantined",
                current_retry=existing.current_retry_count,
                max_retries=existing.max_retries,
                backoff_seconds=0.0,
                quarantine_until=existing.quarantine_until,
                message=f"Test '{test_name}' is quarantined until {existing.quarantine_until.isoformat()}",
            )
        
        # Quarantine period over — check retry count
        if existing.current_retry_count >= existing.max_retries:
            return RetryBackoffResult(
                trace_id=req.trace_id,
                test_name=test_name,
                status="failed",
                current_retry=existing.current_retry_count,
                max_retries=existing.max_retries,
                backoff_seconds=0.0,
                message=f"Test '{test_name}' exceeded max retries ({existing.max_retries}). Manual investigation required.",
            )
        
        # Calculate next backoff
        rule = _find_applicable_rule(req.log_output)
        backoff_secs = _calculate_backoff(
            existing.current_retry_count + 1,
            rule.backoff_base_seconds,
            rule.backoff_max_seconds,
            rule.jitter_factor,
        )
        next_retry = now + timedelta(seconds=backoff_secs)
        
        # Update the quarantined test record
        existing.current_retry_count += 1
        existing.last_retry_at = now
        existing.next_retry_at = next_retry
        existing.status = "retrying"
        
        return RetryBackoffResult(
            trace_id=req.trace_id,
            test_name=test_name,
            status="retrying",
            current_retry=existing.current_retry_count,
            max_retries=existing.max_retries,
            backoff_seconds=backoff_secs,
            next_retry_at=next_retry,
            message=f"Retry {existing.current_retry_count}/{existing.max_retries} for test '{test_name}'. Next retry in {backoff_secs}s.",
        )
    
    # New flaky test — quarantine it
    rule = _find_applicable_rule(req.log_output)
    quarantine_mins = rule.quarantine_duration_minutes
    quarantine_until = datetime.now(timezone.utc) + timedelta(minutes=quarantine_mins)
    
    quarantined = QuarantinedTest(
        test_name=test_name,
        test_file=req.test_file,
        service=req.service,
        trace_id=req.trace_id,
        classification=req.classification,
        confidence=req.confidence,
        quarantined_at=datetime.now(timezone.utc),
        quarantine_until=quarantine_until,
        current_retry_count=0,
        max_retries=rule.max_retries,
        status="quarantined",
        log_snippet=req.log_output[:300],
    )
    quarantined_tests_db[test_name] = quarantined
    
    return RetryBackoffResult(
        trace_id=req.trace_id,
        test_name=test_name,
        status="quarantined",
        current_retry=0,
        max_retries=rule.max_retries,
        backoff_seconds=0.0,
        quarantine_until=quarantine_until,
        message=f"Test '{test_name}' quarantined for {quarantine_mins}min. Backoff base: {rule.backoff_base_seconds}s, max retries: {rule.max_retries}.",
    )


def mark_test_passed(test_name: str) -> Optional[QuarantinedTest]:
    """Mark a quarantined test as passed (retry succeeded)."""
    if test_name in quarantined_tests_db:
        quarantined_tests_db[test_name].status = "passed"
        quarantined_tests_db[test_name].next_retry_at = None
        return quarantined_tests_db[test_name]
    return None


# ---------------------------------------------------------------------------
# Routes — Retry/Backoff
# ---------------------------------------------------------------------------

@router.post("/quarantine/retry", response_model=RetryBackoffResult)
def handle_retry(req: RetryBackoffRequest):
    """Handle retry/backoff for a flaky test."""
    return handle_retry_backoff(req)


@router.post("/quarantine/pass/{test_name}", response_model=QuarantinedTest)
def mark_passed(test_name: str):
    """Mark a quarantined test as passed."""
    result = mark_test_passed(test_name)
    if not result:
        raise HTTPException(status_code=404, detail=f"Test '{test_name}' not found in quarantine")
    return result


# ---------------------------------------------------------------------------
# Routes — Quarantine Rules CRUD
# ---------------------------------------------------------------------------

@router.get("/quarantine/rules", response_model=List[QuarantineRule])
def list_quarantine_rules(limit: int = 50, offset: int = 0):
    """List all quarantine rules."""
    result = list(quarantine_rules_db.values())
    return result[offset:offset + limit]


@router.get("/quarantine/rules/{name}", response_model=QuarantineRule)
def get_quarantine_rule(name: str):
    """Get a quarantine rule by name."""
    if name not in quarantine_rules_db:
        raise HTTPException(status_code=404, detail=f"Rule '{name}' not found")
    return quarantine_rules_db[name]


@router.post("/quarantine/rules", response_model=QuarantineRule)
def create_quarantine_rule(rule: QuarantineRule):
    """Create a new quarantine rule."""
    if rule.name in quarantine_rules_db:
        raise HTTPException(status_code=409, detail=f"Rule '{rule.name}' already exists")
    quarantine_rules_db[rule.name] = rule
    return rule


@router.put("/quarantine/rules/{name}", response_model=QuarantineRule)
def update_quarantine_rule(name: str, rule: QuarantineRule):
    """Update an existing quarantine rule."""
    if name not in quarantine_rules_db:
        raise HTTPException(status_code=404, detail=f"Rule '{name}' not found")
    rule.name = name
    rule.updated_at = datetime.now(timezone.utc)
    quarantine_rules_db[name] = rule
    return rule


@router.delete("/quarantine/rules/{name}")
def delete_quarantine_rule(name: str):
    """Delete a quarantine rule."""
    if name not in quarantine_rules_db:
        raise HTTPException(status_code=404, detail=f"Rule '{name}' not found")
    del quarantine_rules_db[name]
    return {"status": "deleted", "name": name}


# ---------------------------------------------------------------------------
# Routes — Quarantined Tests
# ---------------------------------------------------------------------------

@router.get("/quarantine/tests", response_model=List[QuarantinedTest])
def list_quarantined_tests(status: Optional[str] = None, limit: int = 50, offset: int = 0):
    """List all quarantined tests, optionally filtered by status."""
    tests = list(quarantined_tests_db.values())
    if status:
        tests = [t for t in tests if t.status == status]
    return tests[offset:offset + limit]


@router.get("/quarantine/tests/{test_name}", response_model=QuarantinedTest)
def get_quarantined_test(test_name: str):
    """Get a quarantined test by name."""
    if test_name not in quarantined_tests_db:
        raise HTTPException(status_code=404, detail=f"Test '{test_name}' not found in quarantine")
    return quarantined_tests_db[test_name]
