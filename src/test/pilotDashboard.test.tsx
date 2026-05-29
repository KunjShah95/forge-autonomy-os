import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PilotDashboard from "../pages/PilotDashboard";

// Mock the apiClient
vi.mock("../lib/apiClient", () => ({
  apiClient: {
    getPilotDashboard: vi.fn().mockResolvedValue({
      kpis: [
        { name: "autonomy_rate", display_name: "Autonomy Rate", value: 72.5, unit: "%", target: 80, trend: "rising", status: "healthy" },
        { name: "decisions_24h", display_name: "Decisions (24h)", value: 120, unit: "", target: 200, trend: "stable", status: "warning" },
      ],
      services: [
        { name: "API Gateway", status: "healthy", uptime_pct: 99.9, p99_latency_ms: 42, error_rate_pct: 0.1 },
        { name: "Billing Service", status: "degraded", uptime_pct: 98.2, p99_latency_ms: 950, error_rate_pct: 3.5 },
      ],
      autonomy_metrics: [
        { name: "mttr", value: 4.2, unit: "min", baseline: 12.5, improvement_pct: 66.4, status: "healthy" },
      ],
      tenants: [
        { id: "tn-001", name: "Acme Corp", status: "onboarding", tier: "standard", services_connected: 3, total_services: 5, policies_active: 4, incidents_last_7d: 0, autonomy_rate: 45, readiness_checks: { infra: true, security: false } },
        { id: "tn-002", name: "Beta Inc", status: "active", tier: "premium", services_connected: 8, total_services: 8, policies_active: 12, incidents_last_7d: 1, autonomy_rate: 88, readiness_checks: { infra: true, security: true, monitoring: true } },
      ],
      overall_health_score: 85,
      active_incidents: 2,
      total_decisions_24h: 120,
      autonomy_rate_24h: 72.5,
    }),
  },
}));

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe("PilotDashboard Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the pilot dashboard header", async () => {
    renderWithProviders(<PilotDashboard />);
    await waitFor(() => {
      expect(screen.getByText("Pilot Dashboard")).toBeTruthy();
    });
  });

  it("renders the refresh button", async () => {
    renderWithProviders(<PilotDashboard />);
    await waitFor(() => {
      expect(screen.getByText("Refresh")).toBeTruthy();
    });
  });

  it("renders summary metric cards", async () => {
    renderWithProviders(<PilotDashboard />);
    await waitFor(() => {
      expect(screen.getByText("24h Autonomy Rate")).toBeTruthy();
      const decisionsLabels = screen.getAllByText("Decisions (24h)");
      expect(decisionsLabels.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("renders the service health panel header", async () => {
    renderWithProviders(<PilotDashboard />);
    await waitFor(() => {
      expect(screen.getByText("Service Health")).toBeTruthy();
    });
  });

  it("renders pilot tenants panel header", async () => {
    renderWithProviders(<PilotDashboard />);
    await waitFor(() => {
      const headings = screen.getAllByText("Pilot Tenants");
      expect(headings.length).toBeGreaterThanOrEqual(1);
    });
  });
});
