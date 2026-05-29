"""
Config/YAML remediation templates (B-022).

Provides a template system for generating config fix patches,
with YAML validation, versioned templates, and auto-correction.
"""

import re
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone

router = APIRouter(prefix="/api/v1", tags=["Templates"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class TemplateVariable(BaseModel):
    """A variable that can be substituted in a template."""
    name: str
    description: str = ""
    default: str = ""
    required: bool = True
    pattern: str = ""  # Optional regex validation


class RemediationTemplate(BaseModel):
    """A remediation template for auto-fixing config/dependency issues."""
    name: str
    version: str = "1.0.0"
    description: str = ""
    category: str = "config"  # config | dependency | flake | general
    enabled: bool = True
    template_content: str = ""
    variables: List[TemplateVariable] = Field(default_factory=list)
    match_pattern: str = ""  # regex to identify when this template applies
    validation_rules: List[str] = Field(default_factory=list)
    rollback_content: str = ""  # optional rollback template
    tags: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TemplateApplyRequest(BaseModel):
    template_name: str
    variables: Dict[str, str] = Field(default_factory=dict)
    service: str = ""
    trace_id: str = ""


class TemplateApplyResult(BaseModel):
    template_name: str
    version: str
    applied: bool
    patch: str = ""
    rollback_patch: str = ""
    validation_errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    message: str = ""
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# In-memory store
# ---------------------------------------------------------------------------

templates_db: Dict[str, List[RemediationTemplate]] = {}  # name -> versions

# Seed default templates
_default_templates = [
    RemediationTemplate(
        name="npm-dependency-fix",
        version="1.0.0",
        description="Fix missing or outdated npm dependencies",
        category="dependency",
        enabled=True,
        template_content='''// Auto-fix: Add missing dependency {package_name}
- // {package_name} is missing
+ "{package_name}": "{package_version}",
// Add defensive import check
- const mod = require("{package_name}")
+ const mod = require("{package_name}") ?? fallback''',
        variables=[
            TemplateVariable(name="package_name", description="Name of the missing package", default="", required=True),
            TemplateVariable(name="package_version", description="Version specifier", default="^1.0.0", required=False, pattern=r"^[\^~><=]?\d+\.\d+\.\d+"),
        ],
        match_pattern=r"(cannot find|not found|Module not found).*npm",
        tags=["npm", "node", "dependency"],
    ),
    RemediationTemplate(
        name="pip-dependency-fix",
        version="1.0.0",
        description="Fix missing Python pip dependencies",
        category="dependency",
        enabled=True,
        template_content='''# Auto-fix: Add missing Python dependency
- # {package_name} is missing
+ {package_name}>={package_version}''',
        variables=[
            TemplateVariable(name="package_name", description="Name of the missing package", default="", required=True),
            TemplateVariable(name="package_version", description="Minimum version", default="1.0.0", required=False),
        ],
        match_pattern=r"(cannot find|not found|No module).*(pip|python)",
        tags=["pip", "python", "dependency"],
    ),
    RemediationTemplate(
        name="config-null-check",
        version="1.0.0",
        description="Add defensive null/undefined checks for config access",
        category="config",
        enabled=True,
        template_content='''// Auto-fix: Defensive config access pattern
- const {key} = config.{path}
+ const {key} = config?.{path} ?? {default_value}
+ if (!config?.{path}) logger.warn("config.{path} is undefined, using default")''',
        variables=[
            TemplateVariable(name="key", description="Variable name", default="value", required=True),
            TemplateVariable(name="path", description="Config path (dot notation)", default="some.setting", required=True),
            TemplateVariable(name="default_value", description="Fallback default", default="null", required=False),
        ],
        match_pattern=r"(TypeError|undefined|cannot read property)",
        tags=["config", "null-safety", "typescript"],
    ),
    RemediationTemplate(
        name="flake-retry-assertion",
        version="1.0.0",
        description="Wrap flaky assertions with retry/poll logic",
        category="flake",
        enabled=True,
        template_content='''// Auto-fix: Stabilize flaky assertion with retry
- expect({actual}).{matcher}({expected})
+ await expect.poll(async () => {actual}, { 
+   timeout: {timeout_ms}, 
+   interval: {interval_ms} 
+ }).{matcher}({expected})''',
        variables=[
            TemplateVariable(name="actual", description="Expression being tested", default="result", required=True),
            TemplateVariable(name="matcher", description="Jest matcher", default="toBe", required=False),
            TemplateVariable(name="expected", description="Expected value", default="true", required=False),
            TemplateVariable(name="timeout_ms", description="Retry timeout in ms", default="10000", required=False, pattern=r"^\d+$"),
            TemplateVariable(name="interval_ms", description="Poll interval in ms", default="500", required=False, pattern=r"^\d+$"),
        ],
        match_pattern=r"(timeout|flaky|intermittent|retry)",
        tags=["test", "flake", "jest"],
    ),
    RemediationTemplate(
        name="yaml-validation-fix",
        version="1.0.0",
        description="Fix common YAML syntax errors (indentation, quotes, trailing spaces)",
        category="config",
        enabled=True,
        template_content='''# Auto-fix: YAML syntax correction
# Original (indented incorrectly):
{original_line}
# Corrected:
{corrected_line}''',
        variables=[
            TemplateVariable(name="original_line", description="The malformed YAML line", default="", required=True),
            TemplateVariable(name="corrected_line", description="The corrected YAML line", default="", required=True),
        ],
        match_pattern=r"(yaml|yml).*(syntax|indent|parse|invalid)",
        tags=["yaml", "config", "syntax"],
    ),
    RemediationTemplate(
        name="dockerfile-pin-version",
        version="1.0.0",
        description="Pin Docker base image to specific version for reproducibility",
        category="dependency",
        enabled=True,
        template_content='''# Auto-fix: Pin base image version
- FROM {image}:{current_tag}
+ FROM {image}:{pinned_version}''',
        variables=[
            TemplateVariable(name="image", description="Docker image name", default="node", required=True),
            TemplateVariable(name="current_tag", description="Current tag (e.g., latest)", default="latest", required=True),
            TemplateVariable(name="pinned_version", description="Specific version to pin to", default="20-slim", required=True),
        ],
        match_pattern=r"FROM.*:latest",
        tags=["docker", "reproducibility", "dependency"],
    ),
]

for tmpl in _default_templates:
    if tmpl.name not in templates_db:
        templates_db[tmpl.name] = []
    templates_db[tmpl.name].append(tmpl)


class ValidateRequest(BaseModel):
    content: str


# ---------------------------------------------------------------------------
# Core logic
# ---------------------------------------------------------------------------

def _validate_yaml_syntax(content: str) -> List[str]:
    """Basic YAML syntax validation."""
    errors = []
    lines = content.split("\n")
    for i, line in enumerate(lines, 1):
        # Check for mixed tabs/spaces
        if "\t" in line:
            errors.append(f"Line {i}: Tab character detected — use spaces for indentation")
        # Check for trailing whitespace
        if line.rstrip() != line and line.strip():
            errors.append(f"Line {i}: Trailing whitespace detected")
        # Check for unquoted colons in values
        if ":" in line and not line.strip().startswith("#"):
            parts = line.split(":", 1)
            if len(parts) == 2 and parts[1].strip() and not parts[1].strip().startswith((" ", "#", '"', "'", "|", ">", "-")):
                errors.append(f"Line {i}: Unquoted value containing colon — wrap in quotes")
    return errors


def _apply_template_variables(template: str, variables: Dict[str, str]) -> str:
    """Substitute {variable} placeholders in template content."""
    result = template
    for key, value in variables.items():
        result = result.replace(f"{{{key}}}", value)
    return result


def apply_remediation_template(req: TemplateApplyRequest) -> TemplateApplyResult:
    """Apply a remediation template with variable substitution and validation."""
    # Find the template (latest version)
    if req.template_name not in templates_db:
        return TemplateApplyResult(
            template_name=req.template_name,
            version="",
            applied=False,
            validation_errors=[f"Template '{req.template_name}' not found"],
            message="Template not found",
        )
    
    versions = templates_db[req.template_name]
    template = versions[-1]  # latest version
    
    if not template.enabled:
        return TemplateApplyResult(
            template_name=req.template_name,
            version=template.version,
            applied=False,
            validation_errors=[f"Template '{req.template_name}' is disabled"],
            message="Template is disabled",
        )
    
    # Validate required variables
    validation_errors = []
    warnings = []
    for var in template.variables:
        if var.required and var.name not in req.variables:
            validation_errors.append(f"Required variable '{var.name}' is missing")
        elif var.name in req.variables and var.pattern:
            if not re.match(var.pattern, req.variables[var.name]):
                validation_errors.append(f"Variable '{var.name}'='{req.variables[var.name]}' does not match pattern '{var.pattern}'")
    
    if validation_errors:
        return TemplateApplyResult(
            template_name=req.template_name,
            version=template.version,
            applied=False,
            validation_errors=validation_errors,
            message="Variable validation failed",
        )
    
    # Apply variable substitution
    patch = _apply_template_variables(template.template_content, req.variables)
    
    # YAML validation if applicable
    if template.name == "yaml-validation-fix" or any("yaml" in t.lower() for t in template.tags):
        yaml_errors = _validate_yaml_syntax(patch)
        if yaml_errors:
            warnings.extend(yaml_errors)
    
    # Generate rollback patch
    rollback_patch = ""
    if template.rollback_content:
        rollback_patch = _apply_template_variables(template.rollback_content, req.variables)
    else:
        rollback_patch = f"# Rollback: Revert changes applied by template '{template.name}'\n# Original values: {req.variables}"
    
    return TemplateApplyResult(
        template_name=req.template_name,
        version=template.version,
        applied=True,
        patch=patch,
        rollback_patch=rollback_patch,
        validation_errors=[],
        warnings=warnings,
        message=f"Template '{template.name}' v{template.version} applied successfully",
    )


# ---------------------------------------------------------------------------
# Routes — Templates
# ---------------------------------------------------------------------------

@router.get("/templates", response_model=List[RemediationTemplate])
def list_templates(category: Optional[str] = None, enabled_only: bool = False, limit: int = 50, offset: int = 0):
    """List all remediation templates (latest version each)."""
    latest = []
    for versions in templates_db.values():
        if versions:
            tmpl = versions[-1]
            if category and tmpl.category != category:
                continue
            if enabled_only and not tmpl.enabled:
                continue
            latest.append(tmpl)
    result = sorted(latest, key=lambda t: t.name)
    return result[offset:offset + limit]


@router.get("/templates/{name}", response_model=RemediationTemplate)
def get_template(name: str):
    """Get the latest version of a template."""
    if name not in templates_db or not templates_db[name]:
        raise HTTPException(status_code=404, detail=f"Template '{name}' not found")
    return templates_db[name][-1]


@router.post("/templates", response_model=RemediationTemplate)
def create_template(template: RemediationTemplate):
    """Create a new remediation template."""
    if template.name in templates_db:
        raise HTTPException(status_code=409, detail=f"Template '{template.name}' already exists")
    templates_db[template.name] = [template]
    return template


@router.put("/templates/{name}", response_model=RemediationTemplate)
def update_template(name: str, template: RemediationTemplate):
    """Update a template (creates a new version)."""
    if name not in templates_db:
        raise HTTPException(status_code=404, detail=f"Template '{name}' not found")
    template.name = name
    template.updated_at = datetime.now(timezone.utc)
    templates_db[name].append(template)
    return template


@router.delete("/templates/{name}")
def delete_template(name: str):
    """Delete a template and all its versions."""
    if name not in templates_db:
        raise HTTPException(status_code=404, detail=f"Template '{name}' not found")
    del templates_db[name]
    return {"status": "deleted", "name": name}


@router.post("/templates/apply", response_model=TemplateApplyResult)
def apply_template(req: TemplateApplyRequest):
    """Apply a remediation template with variable substitution."""
    return apply_remediation_template(req)


@router.post("/templates/{name}/validate", response_model=List[str])
def validate_yaml_content(name: str, req: ValidateRequest):
    """Validate YAML content using rules from a template."""
    return _validate_yaml_syntax(req.content)
