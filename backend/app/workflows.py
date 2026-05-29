"""
Visual workflow editor backend (ROADMAP Milestone 5).

Workflow CRUD with step definitions, node types, and runbook configuration.
Supports save/load, node property editing, and workflow execution.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/api/v1/workflows", tags=["Workflows"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class NodeProperty(BaseModel):
    """A single property on a workflow node."""
    key: str
    label: str
    type: str = "text"  # text | number | select | boolean | code
    value: Any = None
    options: List[str] = Field(default_factory=list)
    required: bool = False


class WorkflowNode(BaseModel):
    """A node in the workflow graph."""
    id: str
    type: str  # trigger | agent | action | condition
    label: str
    x: float
    y: float
    properties: List[NodeProperty] = Field(default_factory=list)
    icon: str = "Bot"
    description: str = ""


class WorkflowLink(BaseModel):
    """A directed edge between two workflow nodes."""
    source: str
    target: str
    label: str = ""
    condition: str = ""


class WorkflowDefinition(BaseModel):
    """A complete workflow / runbook definition."""
    id: str = Field(default_factory=lambda: f"wf-{str(uuid.uuid4())[:8]}")
    name: str
    description: str = ""
    version: str = "1.0.0"
    enabled: bool = True
    nodes: List[WorkflowNode] = Field(default_factory=list)
    links: List[WorkflowLink] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# In-memory store with seed data
# ---------------------------------------------------------------------------

_workflows: Dict[str, WorkflowDefinition] = {}

# Seed a default CI/CD workflow
_workflows["wf-cicd-default"] = WorkflowDefinition(
    id="wf-cicd-default",
    name="CI/CD Autonomous Pipeline",
    description="Default CI/CD workflow with AI agents for test generation, security scanning, canary deploy, and rollback.",
    version="1.0.0",
    enabled=True,
    tags=["cicd", "production", "autonomous"],
    nodes=[
        WorkflowNode(id="n1", type="trigger", x=60, y=80, label="On commit to main",
                     icon="GitBranch", description="Triggers on push to main branch",
                     properties=[
                         NodeProperty(key="branch", label="Branch", type="text", value="main", required=True),
                         NodeProperty(key="event", label="Event", type="select", value="push", options=["push", "pull_request", "merge"]),
                     ]),
        WorkflowNode(id="n2", type="agent", x=280, y=80, label="QA Agent · generate tests",
                     icon="Bot", description="AI agent generates unit and integration tests",
                     properties=[
                         NodeProperty(key="model", label="Model", type="select", value="gpt-4", options=["gpt-4", "claude-3", "llama-3"]),
                         NodeProperty(key="coverage_target", label="Coverage target", type="number", value=80),
                     ]),
        WorkflowNode(id="n3", type="agent", x=500, y=80, label="Security Agent · scan",
                     icon="ShieldAlert", description="Scans for vulnerabilities, secrets, and dependencies",
                     properties=[
                         NodeProperty(key="severity_threshold", label="Severity threshold", type="select", value="high", options=["low", "medium", "high", "critical"]),
                     ]),
        WorkflowNode(id="n4", type="action", x=280, y=240, label="Canary deploy 10%",
                     icon="Rocket", description="Gradual canary deployment to 10% of traffic",
                     properties=[
                         NodeProperty(key="percentage", label="Traffic %", type="number", value=10),
                         NodeProperty(key="bake_minutes", label="Bake time (min)", type="number", value=10),
                         NodeProperty(key="rollback_on_error", label="Auto-rollback on error", type="boolean", value=True),
                     ]),
        WorkflowNode(id="n5", type="condition", x=500, y=240, label="If error budget < 1x",
                     icon="AlertCircle", description="Checks if error budget burn rate exceeds threshold",
                     properties=[
                         NodeProperty(key="threshold", label="Burn rate threshold", type="number", value=1.0),
                         NodeProperty(key="metric", label="Metric", type="select", value="error_budget_burn", options=["error_budget_burn", "p99_latency", "error_rate"]),
                     ]),
        WorkflowNode(id="n6", type="action", x=720, y=240, label="Webhook · notify on-call",
                     icon="Webhook", description="Sends notification to on-call engineer",
                     properties=[
                         NodeProperty(key="channel", label="Channel", type="select", value="pagerduty", options=["slack", "pagerduty", "email", "teams"]),
                         NodeProperty(key="message_template", label="Message template", type="code", value="Incident detected in {{service}}: {{description}}"),
                     ]),
    ],
    links=[
        WorkflowLink(source="n1", target="n2", label="on commit"),
        WorkflowLink(source="n2", target="n3", label="tests pass"),
        WorkflowLink(source="n3", target="n4", label="scan ok"),
        WorkflowLink(source="n4", target="n5", label="deployed"),
        WorkflowLink(source="n5", target="n6", label="budget exceeded"),
    ],
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("", response_model=List[WorkflowDefinition])
def list_workflows(enabled_only: bool = False, limit: int = 50, offset: int = 0):
    """List all workflow definitions."""
    workflows = list(_workflows.values())
    if enabled_only:
        workflows = [w for w in workflows if w.enabled]
    result = sorted(workflows, key=lambda w: w.updated_at, reverse=True)
    return result[offset:offset + limit]


@router.get("/{workflow_id}", response_model=Optional[WorkflowDefinition])
def get_workflow(workflow_id: str):
    """Get a specific workflow definition."""
    return _workflows.get(workflow_id)


@router.post("", response_model=WorkflowDefinition)
def create_workflow(workflow: WorkflowDefinition):
    """Create a new workflow definition."""
    if workflow.id in _workflows:
        raise HTTPException(status_code=409, detail=f"Workflow '{workflow.id}' already exists")
    workflow.created_at = datetime.now(timezone.utc)
    workflow.updated_at = datetime.now(timezone.utc)
    _workflows[workflow.id] = workflow
    return workflow


@router.put("/{workflow_id}", response_model=WorkflowDefinition)
def update_workflow(workflow_id: str, workflow: WorkflowDefinition):
    """Update an existing workflow definition."""
    if workflow_id not in _workflows:
        raise HTTPException(status_code=404, detail=f"Workflow '{workflow_id}' not found")
    workflow.updated_at = datetime.now(timezone.utc)
    _workflows[workflow_id] = workflow
    return workflow


@router.delete("/{workflow_id}")
def delete_workflow(workflow_id: str):
    """Delete a workflow definition."""
    if workflow_id not in _workflows:
        raise HTTPException(status_code=404, detail=f"Workflow '{workflow_id}' not found")
    del _workflows[workflow_id]
    return {"status": "deleted", "workflow_id": workflow_id}


@router.post("/{workflow_id}/execute", response_model=Dict[str, Any])
def execute_workflow(workflow_id: str):
    """Simulate executing a workflow (returns execution trace)."""
    workflow = _workflows.get(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail=f"Workflow '{workflow_id}' not found")

    execution_id = f"exec-{uuid.uuid4().hex[:8]}"
    steps = []
    for i, node in enumerate(workflow.nodes):
        steps.append({
            "step": i + 1,
            "node_id": node.id,
            "node_label": node.label,
            "node_type": node.type,
            "status": "completed" if i < len(workflow.nodes) else "pending",
            "duration_ms": (i + 1) * 100,
        })

    return {
        "execution_id": execution_id,
        "workflow_id": workflow_id,
        "workflow_name": workflow.name,
        "status": "completed",
        "total_steps": len(steps),
        "completed_steps": len(steps),
        "steps": steps,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }
