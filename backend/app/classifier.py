"""
Failure classifier (B-006).

Classifies CI failures into dependency, config, flake, or unclassified
based on log output and event payload signals.
"""

import re
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException
from datetime import datetime

router = APIRouter(prefix="/api/v1", tags=["Classifier"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ClassifyRequest(BaseModel):
    trace_id: str
    log_output: str
    event_payload: Optional[Dict[str, Any]] = None


class ClassificationResult(BaseModel):
    trace_id: str
    classification: str  # dependency | config | flake | unclassified
    confidence: float = Field(..., ge=0.0, le=1.0)
    evidence: List[str] = Field(default_factory=list)
    summary: str = ""
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Classification rules — regex-based signals
# ---------------------------------------------------------------------------

# Dependency failure signals (npm, pip, maven, go mod, etc.)
DEPENDENCY_PATTERNS = [
    r"ModuleNotFoundError: No module named",
    r"cannot find module",
    r"ERR_PACKAGE_PATH_NOT_EXPORTED",
    r"could not be resolved",
    r"package.json.*not found",
    r"npm ERR!.*404",
    r"pip.*could not find.*version",
    r"resolution failed",
    r"go:.*module.*not found",
    r"Could not resolve dependency",
    r"dependency.*not found",
    r"Package.*not found",
    r"ImportError:.*No module",
    r"Module not found",
]

# Configuration failure signals
CONFIG_PATTERNS = [
    r"TypeError:.*is not a function",
    r"TypeError:.*of undefined",
    r"TypeError:.*of null",
    r"undefined is not iterable",
    r"null.*pointer",
    r"Configuration.*invalid",
    r"invalid.*config",
    r"Env.*not set",
    r"Missing required.*env",
    r"SyntaxError:",
    r"unexpected token",
    r"Property.*does not exist",
    r"cannot read property",
]

# Flaky test signals
FLAKE_PATTERNS = [
    r"timeout.*exceeded",
    r"Timed out",
    r"Connection refused",
    r"ECONNREFUSED",
    r"ECONNRESET",
    r"ETIMEDOUT",
    r"retry.*exceeded",
    r"race condition",
    r"intermittent",
    r"test.*flaky",
    r"network.*error",
    r"failed:.*timeout",
    r"could not connect",
    r"Too many open files",
    r"port.*already in use",
]


def _score_patterns(text: str, patterns: List[str]) -> int:
    """Count how many patterns match in the text (case-insensitive)."""
    text_lower = text.lower()
    count = 0
    for pat in patterns:
        if re.search(pat, text_lower, re.IGNORECASE):
            count += 1
    return count


def _extract_evidence(text: str, patterns: List[str], max_evidence: int = 3) -> List[str]:
    """Extract the first matching line as evidence snippets."""
    text_lower = text.lower()
    evidence: List[str] = []
    for pat in patterns:
        match = re.search(pat, text, re.IGNORECASE)
        if match:
            # Get surrounding context (the line)
            start = max(0, match.start() - 40)
            end = min(len(text), match.end() + 80)
            snippet = text[start:end].strip()
            if snippet:
                evidence.append(f"...{snippet}...")
                if len(evidence) >= max_evidence:
                    break
    return evidence


def classify_failure(
    trace_id: str,
    log_output: str,
    event_payload: Optional[Dict[str, Any]] = None,
) -> ClassificationResult:
    """
    Classify a CI failure based on log output and optional event context.

    Returns a ClassificationResult with the most likely class, confidence,
    and supporting evidence snippets.
    """
    combined = log_output
    if event_payload:
        combined += "\n" + str(event_payload)

    dep_score = _score_patterns(combined, DEPENDENCY_PATTERNS)
    config_score = _score_patterns(combined, CONFIG_PATTERNS)
    flake_score = _score_patterns(combined, FLAKE_PATTERNS)

    # Determine classification
    scores = {
        "dependency": dep_score,
        "config": config_score,
        "flake": flake_score,
    }
    best_class = max(scores, key=scores.get)
    best_score = scores[best_class]

    if best_score == 0:
        return ClassificationResult(
            trace_id=trace_id,
            classification="unclassified",
            confidence=0.3,
            evidence=["No known failure pattern matched the log output."],
            summary="CI failure could not be automatically classified.",
        )

    # Calculate confidence based on signal density
    # More signals = higher confidence, capped at 0.95
    total_signals = sum(scores.values())
    confidence = min(0.5 + (best_score / max(total_signals, 1)) * 0.45, 0.95)

    if best_class == "dependency":
        extra = scores["config"] > scores["dependency"] * 0.5 and " (potential config overlap detected)"
        summary = f"CI failure classified as dependency issue{extra or ''}. Dependency resolution errors detected in build output."
    elif best_class == "config":
        summary = "CI failure classified as configuration issue. Type errors or invalid configuration detected."
    else:
        summary = "CI failure classified as flaky test. Network timeouts or transient errors detected."

    evidence = _extract_evidence(combined, {
        "dependency": DEPENDENCY_PATTERNS,
        "config": CONFIG_PATTERNS,
        "flake": FLAKE_PATTERNS,
    }[best_class])

    return ClassificationResult(
        trace_id=trace_id,
        classification=best_class,
        confidence=round(confidence, 2),
        evidence=evidence,
        summary=summary,
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/classify", response_model=ClassificationResult)
def classify_ci_failure(req: ClassifyRequest):
    """
    Classify a CI failure from log output.

    Returns classification (dependency|config|flake|unclassified),
    confidence score, and evidence snippets.
    """
    if not req.log_output.strip():
        raise HTTPException(status_code=400, detail="log_output cannot be empty")

    return classify_failure(req.trace_id, req.log_output, req.event_payload)
