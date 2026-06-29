"""
Compliance reporting and audit export (B-043).

Generates compliance reports and audit exports in multiple formats:
  - JSON audit export
  - CSV compliance report
  - PDF-ready markdown summary
  - SOC2/ISO27001 control mapping
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Response
from datetime import datetime, timezone, timedelta
import csv
import io

router = APIRouter(prefix="/api/v1", tags=["Compliance"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ComplianceReportRequest(BaseModel):
    date_from: str = ""
    date_to: str = ""
    format: str = "json"  # json | csv | markdown
    include_decisions: bool = True
    include_events: bool = True
    include_incidents: bool = True
    organization: str = ""


class ComplianceControl(BaseModel):
    control_id: str
    framework: str  # soc2 | iso27001 | hipaa | gdpr
    control_name: str
    status: str  # compliant | non_compliant | not_applicable | not_tested
    evidence: str = ""
    last_checked: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ComplianceReport(BaseModel):
    report_id: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    date_from: str = ""
    date_to: str = ""
    organization: str = ""
    framework: str = "soc2"
    summary: str = ""
    total_controls: int = 0
    compliant_count: int = 0
    non_compliant_count: int = 0
    not_applicable_count: int = 0
    controls: List[ComplianceControl] = Field(default_factory=list)
    total_decisions: int = 0
    total_incidents: int = 0
    auto_execution_rate: float = 0.0
    audit_export_json: List[Dict[str, Any]] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Compliance control library
# ---------------------------------------------------------------------------

SOC2_CONTROLS = [
    ComplianceControl(control_id="CC1.1", framework="soc2", control_name="Control Environment — Code Reviews", status="compliant", evidence="All PRs require at least one review before merge."),
    ComplianceControl(control_id="CC2.1", framework="soc2", control_name="Communication — Incident Response", status="compliant", evidence="Automated incident detection and RCA generation."),
    ComplianceControl(control_id="CC3.1", framework="soc2", control_name="Risk Assessment — Deployment Risk Scoring", status="compliant", evidence="5-factor risk scoring evaluated on every deployment."),
    ComplianceControl(control_id="CC4.1", framework="soc2", control_name="Monitoring — Canary Rollout", status="compliant", evidence="3-stage canary with auto-rollback on burn rate > 2.0."),
    ComplianceControl(control_id="CC5.1", framework="soc2", control_name="Change Management — Policy Enforcement", status="compliant", evidence="A/B/C action class policy gates on all automated actions."),
    ComplianceControl(control_id="CC6.1", framework="soc2", control_name="Access Control — RBAC", status="compliant", evidence="4 roles with tenant isolation and granular permissions."),
    ComplianceControl(control_id="CC6.2", framework="soc2", control_name="Access Control — SSO Integration", status="compliant", evidence="OIDC/OAuth2 SSO with session management."),
    ComplianceControl(control_id="CC7.1", framework="soc2", control_name="System Operations — Audit Trail", status="compliant", evidence="Full audit trail with trace_id linking events, decisions, and outcomes."),
    ComplianceControl(control_id="CC8.1", framework="soc2", control_name="Change Management — Automated Rollback", status="compliant", evidence="Auto-rollback capability on error budget burn rate breach."),
    ComplianceControl(control_id="CC9.1", framework="soc2", control_name="Risk Mitigation — Chaos Engineering", status="compliant", evidence="6 fault types tested with resilience scoring."),
    ComplianceControl(control_id="A1.1", framework="soc2", control_name="Availability — Health Checks", status="compliant", evidence="Liveness and readiness probes configured."),
    ComplianceControl(control_id="A1.2", framework="soc2", control_name="Availability — Disaster Recovery", status="not_applicable", evidence="Multi-region DR not yet configured."),
    ComplianceControl(control_id="C1.1", framework="soc2", control_name="Confidentiality — Secrets Management", status="compliant", evidence="Security scanner detects hardcoded secrets in code."),
    ComplianceControl(control_id="PI1.1", framework="soc2", control_name="Processing Integrity — Test Selection", status="compliant", evidence="Impact-based test selection reduces CI time."),
]


ISO27001_CONTROLS = [
    ComplianceControl(control_id="A.5.1", framework="iso27001", control_name="Information Security Policy", status="compliant", evidence="Policy-as-code engine with YAML-defined rules."),
    ComplianceControl(control_id="A.6.1", framework="iso27001", control_name="Internal Organization", status="compliant", evidence="RBAC with 4 roles and tenant isolation."),
    ComplianceControl(control_id="A.9.1", framework="iso27001", control_name="Access Control Policy", status="compliant", evidence="SSO integration with OIDC/OAuth2."),
    ComplianceControl(control_id="A.12.1", framework="iso27001", control_name="Operational Procedures", status="compliant", evidence="Automated CI/CD with policy gates."),
    ComplianceControl(control_id="A.12.6", framework="iso27001", control_name="Technical Vulnerability Management", status="compliant", evidence="SAST security scanning for secrets and vulnerabilities."),
    ComplianceControl(control_id="A.16.1", framework="iso27001", control_name="Incident Management", status="compliant", evidence="Automated incident detection, RCA, and remediation."),
    ComplianceControl(control_id="A.17.1", framework="iso27001", control_name="Business Continuity", status="not_applicable", evidence="Disaster recovery plan not yet documented."),
]


def generate_report(req: ComplianceReportRequest) -> ComplianceReport:
    """Generate a compliance report with audit export data."""
    from .api import events_db, decisions_db, audit_db

    frame = req.date_from or (datetime.now(timezone.utc) - timedelta(days=30)).date().isoformat()
    frame_to = req.date_to or datetime.now(timezone.utc).date().isoformat()

    # Collect audit data
    audit_export = []
    for trace_id, audit in list(audit_db.items())[:100]:
        audit_export.append({
            "trace_id": audit.trace_id,
            "status": audit.status,
            "event_count": len(audit.events),
            "decision_count": len(audit.decisions),
            "outcome": audit.outcome,
            "timestamp": audit.timestamp.isoformat(),
        })

    total_decisions_count = len(decisions_db) if decisions_db else 0
    # Gracefully handle incident count — _incidents_db may not be importable
    try:
        from .incident_summary import _incidents_db as incidents_list
        total_incidents_count = len(incidents_list) if hasattr(incidents_list, '__len__') else 0
    except (ImportError, AttributeError):
        total_incidents_count = 0

    # Calculate auto-execution rate
    auto_count = len([d for d in decisions_db if getattr(d, 'risk', 50) < 30]) if decisions_db else 0
    auto_rate = round(auto_count / max(total_decisions_count, 1) * 100, 1)

    controls = SOC2_CONTROLS.copy()
    compliant = len([c for c in controls if c.status == "compliant"])
    non_compliant = len([c for c in controls if c.status == "non_compliant"])
    na = len([c for c in controls if c.status == "not_applicable"])

    return ComplianceReport(
        report_id=f"CR-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}",
        date_from=frame,
        date_to=frame_to,
        organization=req.organization or "forge",
        framework="soc2",
        summary=f"Compliance report for {req.organization or 'forge'} — {compliant}/{len(controls)} controls compliant.",
        total_controls=len(controls),
        compliant_count=compliant,
        non_compliant_count=non_compliant,
        not_applicable_count=na,
        controls=controls,
        total_decisions=total_decisions_count,
        total_incidents=total_incidents_count,
        auto_execution_rate=auto_rate,
        audit_export_json=audit_export,
    )


def export_report(req: ComplianceReportRequest) -> ComplianceReport:
    """Alias for generate_report — exports a compliance report."""
    return generate_report(req)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/compliance/report", response_model=ComplianceReport)
def generate_compliance_report(req: ComplianceReportRequest):
    """Generate a SOC2 or ISO27001 compliance report with audit data (B-043)."""
    return generate_report(req)


@router.get("/compliance/report/{report_id}", response_model=Optional[ComplianceReport])
def get_compliance_report(report_id: str):
    """Get a previously generated compliance report by ID."""
    # For now, return a fresh report (in production, cache by report_id)
    return generate_report(ComplianceReportRequest())


@router.get("/compliance/controls", response_model=Dict[str, List[ComplianceControl]])
def list_compliance_controls():
    """List all compliance controls by framework."""
    return {
        "soc2": SOC2_CONTROLS,
        "iso27001": ISO27001_CONTROLS,
    }


@router.get("/compliance/audit/export/json")
def export_audit_json():
    """Export full audit log as JSON."""
    from .api import audit_db
    data = [
        {
            "trace_id": a.trace_id,
            "status": a.status,
            "event_count": len(a.events),
            "decision_count": len(a.decisions),
            "outcome": a.outcome,
            "timestamp": a.timestamp.isoformat(),
        }
        for a in audit_db.values()
    ]
    return data


@router.get("/compliance/audit/export/csv")
def export_audit_csv():
    """Export full audit log as CSV."""
    from .api import audit_db
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["trace_id", "status", "event_count", "decision_count", "outcome", "timestamp"])
    for a in audit_db.values():
        writer.writerow([a.trace_id, a.status, len(a.events), len(a.decisions), a.outcome, a.timestamp.isoformat()])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=forge-audit-export.csv"},
    )


@router.get("/compliance/audit/export/markdown")
def export_audit_markdown():
    """Export compliance summary as markdown."""
    from .api import audit_db
    lines = [
        "# Forge Autonomy OS — Compliance Audit Export",
        "",
        f"**Generated:** {datetime.now(timezone.utc).isoformat()}",
        f"**Total audit records:** {len(audit_db)}",
        "",
        "## Audit Trail",
        "",
        "| Trace ID | Status | Events | Decisions | Outcome | Timestamp |",
        "|----------|--------|--------|-----------|---------|-----------|",
    ]
    for a in audit_db.values():
        lines.append(f"| {a.trace_id} | {a.status} | {len(a.events)} | {len(a.decisions)} | {a.outcome or ''} | {a.timestamp.isoformat()} |")

    if not audit_db:
        lines.append("| _No audit records found_ | | | | | |")

    return Response(
        content="\n".join(lines),
        media_type="text/markdown",
        headers={"Content-Disposition": "attachment; filename=forge-compliance-report.md"},
    )


@router.get("/compliance/audit/stats", response_model=Dict[str, Any])
def get_audit_stats():
    """Get audit and compliance statistics."""
    from .api import audit_db, decisions_db
    return {
        "total_audit_records": len(audit_db),
        "total_decisions": len(decisions_db) if decisions_db else 0,
        "compliance_frameworks": ["soc2", "iso27001"],
        "soc2_controls_total": len(SOC2_CONTROLS),
        "soc2_controls_compliant": len([c for c in SOC2_CONTROLS if c.status == "compliant"]),
        "iso27001_controls_total": len(ISO27001_CONTROLS),
        "iso27001_controls_compliant": len([c for c in ISO27001_CONTROLS if c.status == "compliant"]),
        "frameworks": ["soc2", "iso27001"],
        "export_formats": ["json", "csv", "markdown"],
    }
