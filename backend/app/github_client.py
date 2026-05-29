"""
GitHub API client for auto-creating PRs (B-036).

Provides functions to:
  - Create a branch from an existing repo ref
  - Get or create a file via the Contents API
  - Create a pull request
  - Parse the repair patch format and apply it to file content

Environment:
  GITHUB_TOKEN  – required for authenticated GitHub API calls
"""
import os
import re
import base64
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from datetime import datetime, timezone

import httpx


GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
GITHUB_API_BASE = "https://api.github.com"


# ---------------------------------------------------------------------------
# Patch parser (repair.py diff format → line-level operations)
# ---------------------------------------------------------------------------


@dataclass
class PatchOperation:
    """A single parsed patch operation."""
    type: str  # "context" | "add" | "remove"
    content: str


@dataclass
class ParsedPatch:
    """Result of parsing a repair patch string."""
    operations: List[PatchOperation]
    summary: str = ""


def parse_repair_patch(patch_text: str) -> ParsedPatch:
    """
    Parse a repair-style patch into structured operations.

    Format:
        Lines starting with `+ ` → addition
        Lines starting with `- ` → removal
        Lines without a prefix  → context (kept as-is)
    """
    operations: List[PatchOperation] = []
    for line in patch_text.splitlines():
        if line.startswith("+ "):
            operations.append(PatchOperation(type="add", content=line[2:]))
        elif line.startswith("- "):
            operations.append(PatchOperation(type="remove", content=line[2:]))
        else:
            operations.append(PatchOperation(type="context", content=line))
    return ParsedPatch(
        operations=operations,
        summary=f"{sum(1 for o in operations if o.type == 'add')} additions, "
                f"{sum(1 for o in operations if o.type == 'remove')} removals",
    )


def apply_patch_to_content(original: str, patch_text: str) -> str:
    """
    Apply a repair-style patch to the original file content.

    The algorithm:
      1. Walk through the original lines sequentially.
      2. For each patch operation:
         - "context": look for matching line in original; emit as-is.
         - "remove": skip the matching line in original.
         - "add": insert the line without consuming an original line.
    """
    parsed = parse_repair_patch(patch_text)
    original_lines = original.splitlines(keepends=True)
    result_lines: List[str] = []
    orig_idx = 0

    # Track which original lines have been consumed
    consumed = [False] * len(original_lines)

    for op in parsed.operations:
        if op.type == "context":
            # Consume matching original lines until we find it
            found = False
            while orig_idx < len(original_lines):
                stripped = original_lines[orig_idx].rstrip("\n").rstrip("\r")
                if stripped == op.content:
                    result_lines.append(original_lines[orig_idx])
                    consumed[orig_idx] = True
                    orig_idx += 1
                    found = True
                    break
                orig_idx += 1
            if not found:
                # Context line not matched; keep it anyway as a comment
                result_lines.append(f"# {op.content}\n")
        elif op.type == "remove":
            # Skip the matching original line
            while orig_idx < len(original_lines):
                stripped = original_lines[orig_idx].rstrip("\n").rstrip("\r")
                if stripped == op.content:
                    consumed[orig_idx] = True
                    orig_idx += 1
                    break
                orig_idx += 1
        elif op.type == "add":
            result_lines.append(f"{op.content}\n")

    # Append any remaining unconsumed lines
    for idx, line in enumerate(original_lines):
        if not consumed[idx]:
            result_lines.append(line)

    return "".join(result_lines)


# ---------------------------------------------------------------------------
# GitHub API helpers
# ---------------------------------------------------------------------------


def _headers() -> Dict[str, str]:
    """Return common headers for GitHub API requests."""
    if not GITHUB_TOKEN:
        raise ValueError("GITHUB_TOKEN environment variable is not set")
    return {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Forge-Autonomy-OS/1.0",
    }


async def get_branch_sha(owner: str, repo: str, branch: str = "main") -> str:
    """Get the SHA of the latest commit on a branch."""
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/git/refs/heads/{branch}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=_headers())
        resp.raise_for_status()
        return resp.json()["object"]["sha"]


async def create_branch(
    owner: str,
    repo: str,
    new_branch: str,
    base_branch: str = "main",
) -> Dict[str, Any]:
    """Create a new branch from an existing one."""
    base_sha = await get_branch_sha(owner, repo, base_branch)
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/git/refs"
    payload = {"ref": f"refs/heads/{new_branch}", "sha": base_sha}
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=payload, headers=_headers())
        resp.raise_for_status()
        return resp.json()


async def get_file_content(
    owner: str,
    repo: str,
    path: str,
    branch: str = "main",
) -> Optional[Dict[str, Any]]:
    """Get the current content and SHA of a file in the repo."""
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/contents/{path}"
    params = {"ref": branch}
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params, headers=_headers())
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        data = resp.json()
        # Decode base64 content
        content = base64.b64decode(data["content"]).decode("utf-8")
        return {"sha": data["sha"], "content": content, "encoding": data.get("encoding", "base64")}


async def create_or_update_file(
    owner: str,
    repo: str,
    path: str,
    content: str,
    commit_message: str,
    branch: str,
    sha: Optional[str] = None,
) -> Dict[str, Any]:
    """Create or update a file via the GitHub Contents API."""
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/contents/{path}"
    payload: Dict[str, Any] = {
        "message": commit_message,
        "content": base64.b64encode(content.encode("utf-8")).decode("utf-8"),
        "branch": branch,
    }
    if sha:
        payload["sha"] = sha
    async with httpx.AsyncClient() as client:
        resp = await client.put(url, json=payload, headers=_headers())
        resp.raise_for_status()
        return resp.json()


async def create_pull_request(
    owner: str,
    repo: str,
    title: str,
    body: str,
    head: str,
    base: str = "main",
    draft: bool = False,
) -> Dict[str, Any]:
    """Create a pull request on GitHub."""
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/pulls"
    payload = {
        "title": title,
        "body": body,
        "head": head,
        "base": base,
        "draft": draft,
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=payload, headers=_headers())
        resp.raise_for_status()
        return resp.json()


# ---------------------------------------------------------------------------
# High-level: create a PR from a repair suggestion
# ---------------------------------------------------------------------------


def _sanitize_branch_name(fix_type: str, service: str) -> str:
    """Generate a safe branch name from fix type and service."""
    ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    slug = re.sub(r"[^a-z0-9-]", "", f"{fix_type}-{service}".lower())[:50].strip("-")
    return f"forge-auto/{slug}-{ts}"


async def create_pr_from_repair(
    owner: str,
    repo: str,
    file_path: str,
    file_content: str,
    pr_title: str,
    pr_body: str,
    commit_message: str,
    fix_type: str = "fix",
    base_branch: str = "main",
    service: str = "",
    draft: bool = False,
) -> Dict[str, Any]:
    """
    High-level function: create a branch, write the fix, and open a PR.

    Returns a dict with:
        pr_url, pr_number, branch_name, file_sha, status
    """
    branch_name = _sanitize_branch_name(fix_type, service)

    # 1. Check if file exists and get its SHA
    existing = await get_file_content(owner, repo, file_path, base_branch)
    file_sha = existing["sha"] if existing else None

    # 2. Create branch
    await create_branch(owner, repo, branch_name, base_branch)

    # 3. Write/update the file on the new branch
    await create_or_update_file(
        owner=owner,
        repo=repo,
        path=file_path,
        content=file_content,
        commit_message=commit_message,
        branch=branch_name,
        sha=file_sha,
    )

    # 4. Create the PR
    pr_data = await create_pull_request(
        owner=owner,
        repo=repo,
        title=pr_title,
        body=pr_body,
        head=branch_name,
        base=base_branch,
        draft=draft,
    )

    return {
        "pr_url": pr_data.get("html_url", ""),
        "pr_number": pr_data.get("number", 0),
        "branch_name": branch_name,
        "file_sha": file_sha,
        "status": pr_data.get("state", "open"),
    }
