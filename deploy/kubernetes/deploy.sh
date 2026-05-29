#!/usr/bin/env bash
# ============================================================================
# Forge Autonomy OS — Kubernetes Deployment Script
# ============================================================================
# Applies all manifests in dependency order:
#   1. Namespace + CRD (foundational)
#   2. ConfigMaps + Secrets (configuration)
#   3. NATS StatefulSet (messaging infra)
#   4. OTEL Collector (observability)
#   5. Backend Deployment (API)
#   6. Frontend Deployment (UI)
#   7. Operator Deployment (auto-remediation)
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAMESPACE="forge-autonomy-os"
KUBECTL="kubectl"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------

preflight_checks() {
    log_info "Running pre-flight checks..."

    if ! command -v "$KUBECTL" &>/dev/null; then
        log_error "kubectl not found. Please install it first."
        exit 1
    fi

    if ! "$KUBECTL" cluster-info &>/dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Check your kubeconfig."
        exit 1
    fi

    log_info "Using context: $($KUBECTL config current-context 2>/dev/null)"
    log_ok "Pre-flight checks passed"
}

# ---------------------------------------------------------------------------
# Step 1: Namespace + CRD
# ---------------------------------------------------------------------------

step_namespace_and_crd() {
    log_info "Step 1/7: Creating namespace and CRD..."

    # Create namespace (ignore if already exists)
    "$KUBECTL" create namespace "$NAMESPACE" --dry-run=client -o yaml | "$KUBECTL" apply -f - >/dev/null
    log_ok "Namespace '$NAMESPACE' ready"

    # Apply CRD
    "$KUBECTL" apply -f "$SCRIPT_DIR/crd.yaml"
    log_ok "CRD 'forgeremedies.forge.ai' applied"

    # Wait for CRD to be established
    log_info "Waiting for CRD to be established..."
    "$KUBECTL" wait --for=condition=Established \
        --timeout=60s \
        crd/forgeremedies.forge.ai >/dev/null 2>&1 || log_warn "CRD establishment timeout — continuing anyway"
    log_ok "CRD established"
}

# ---------------------------------------------------------------------------
# Step 2: NATS StatefulSet (messaging infra)
# ---------------------------------------------------------------------------

step_nats() {
    log_info "Step 2/7: Deploying NATS messaging infrastructure..."

    "$KUBECTL" apply -f "$SCRIPT_DIR/nats-deployment.yaml"
    log_ok "NATS ConfigMap + StatefulSet + Service applied"

    log_info "Waiting for NATS pod to be ready..."
    "$KUBECTL" wait --for=condition=Ready pod -l app=forge-nats \
        --namespace="$NAMESPACE" --timeout=120s >/dev/null 2>&1 || log_warn "NATS readiness timeout — continuing"
    log_ok "NATS ready"
}

# ---------------------------------------------------------------------------
# Step 3: OTEL Collector
# ---------------------------------------------------------------------------

step_otel_collector() {
    log_info "Step 3/7: Deploying OpenTelemetry Collector..."

    "$KUBECTL" apply -f "$SCRIPT_DIR/otel-collector.yaml"
    log_ok "OTEL Collector ConfigMap + Deployment + Service applied"

    log_info "Waiting for OTEL Collector pod to be ready..."
    "$KUBECTL" wait --for=condition=Ready pod -l app=forge-otel-collector \
        --namespace="$NAMESPACE" --timeout=60s >/dev/null 2>&1 || log_warn "OTEL readiness timeout — continuing"
    log_ok "OTEL Collector ready"
}

# ---------------------------------------------------------------------------
# Step 4: Backend Deployment
# ---------------------------------------------------------------------------

step_backend() {
    log_info "Step 4/7: Deploying Backend API..."

    # Check for required secrets
    if ! "$KUBECTL" get secret forge-webhook-secret --namespace="$NAMESPACE" &>/dev/null; then
        log_warn "Secret 'forge-webhook-secret' not found. Creating with placeholder..."
        "$KUBECTL" create secret generic forge-webhook-secret \
            --namespace="$NAMESPACE" \
            --from-literal=secret="change-me-in-production" \
            --dry-run=client -o yaml | "$KUBECTL" apply -f - >/dev/null
    fi

    if ! "$KUBECTL" get secret forge-db-secret --namespace="$NAMESPACE" &>/dev/null; then
        log_warn "Secret 'forge-db-secret' not found. Creating with placeholder..."
        "$KUBECTL" create secret generic forge-db-secret \
            --namespace="$NAMESPACE" \
            --from-literal=dsn="postgresql+asyncpg://forge:forge-dev-secret@forge-postgres:5432/forge_autonomy_os" \
            --dry-run=client -o yaml | "$KUBECTL" apply -f - >/dev/null
    fi

    "$KUBECTL" apply -f "$SCRIPT_DIR/backend-deployment.yaml"
    log_ok "Backend Deployment + Service applied"

    log_info "Waiting for backend pod to be ready..."
    "$KUBECTL" wait --for=condition=Ready pod -l app=forge-backend \
        --namespace="$NAMESPACE" --timeout=120s >/dev/null 2>&1 || log_warn "Backend readiness timeout — continuing"
    log_ok "Backend ready"
}

# ---------------------------------------------------------------------------
# Step 5: Frontend Deployment
# ---------------------------------------------------------------------------

step_frontend() {
    log_info "Step 5/7: Deploying Frontend UI..."

    "$KUBECTL" apply -f "$SCRIPT_DIR/frontend-deployment.yaml"
    log_ok "Frontend Deployment + Service applied"

    log_info "Waiting for frontend pod to be ready..."
    "$KUBECTL" wait --for=condition=Ready pod -l app=forge-frontend \
        --namespace="$NAMESPACE" --timeout=120s >/dev/null 2>&1 || log_warn "Frontend readiness timeout — continuing"
    log_ok "Frontend ready"
}

# ---------------------------------------------------------------------------
# Step 6: Operator Deployment
# ---------------------------------------------------------------------------

step_operator() {
    log_info "Step 6/7: Deploying Forge Operator..."

    "$KUBECTL" apply -f "$SCRIPT_DIR/operator-deployment.yaml"
    log_ok "Operator ServiceAccount + RBAC + Deployment + Service applied"

    log_info "Waiting for operator pod to be ready..."
    "$KUBECTL" wait --for=condition=Ready pod -l app=forge-operator \
        --namespace="$NAMESPACE" --timeout=120s >/dev/null 2>&1 || log_warn "Operator readiness timeout — continuing"
    log_ok "Operator ready"
}

# ---------------------------------------------------------------------------
# Step 7: Verify deployment
# ---------------------------------------------------------------------------

step_verify() {
    log_info "Step 7/7: Verifying deployment..."

    echo ""
    echo "============================================"
    echo "  Forge Autonomy OS — Deployment Summary"
    echo "============================================"
    echo ""

    # Pods
    echo "--- Pods ---"
    "$KUBECTL" get pods --namespace="$NAMESPACE" -o wide
    echo ""

    # Services
    echo "--- Services ---"
    "$KUBECTL" get services --namespace="$NAMESPACE" -o wide
    echo ""

    # CRDs
    echo "--- Custom Resources ---"
    "$KUBECTL" get crd | grep forge.ai || true
    echo ""

    # Health check
    echo "--- Backend Health ---"
    BACKEND_POD=$("$KUBECTL" get pod -l app=forge-backend --namespace="$NAMESPACE" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    if [ -n "$BACKEND_POD" ]; then
        "$KUBECTL" exec "$BACKEND_POD" --namespace="$NAMESPACE" -- \
            python -c "
import httpx
r = httpx.get('http://localhost:8000/health')
print(f'Health: {r.json()}')
" 2>/dev/null || log_warn "Health check failed — backend may still be starting"
    fi

    echo ""
    log_ok "Deployment verification complete"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

main() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║        Forge Autonomy OS — K8s Deployment                  ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""

    preflight_checks
    echo ""

    step_namespace_and_crd
    echo ""

    step_nats
    echo ""

    step_otel_collector
    echo ""

    step_backend
    echo ""

    step_frontend
    echo ""

    step_operator
    echo ""

    step_verify

    echo ""
    log_ok "Deployment complete! Frontend should be available shortly."
    echo ""
    echo "  kubectl get pods -n $NAMESPACE -w"
    echo ""
}

main "$@"
