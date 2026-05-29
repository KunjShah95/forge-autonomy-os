import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Dashboard from "../pages/Dashboard";

// Mock recharts to avoid rendering issues in test
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  AreaChart: ({ children }: any) => <div>{children}</div>,
  Area: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
}));

// Mock lucide icons
vi.mock("lucide-react", () => ({
  Rocket: () => <div data-testid="icon-rocket" />,
  ShieldCheck: () => <div data-testid="icon-shield" />,
  Activity: () => <div data-testid="icon-activity" />,
  Bot: () => <div data-testid="icon-bot" />,
  TrendingUp: () => <div data-testid="icon-trending" />,
  AlertTriangle: () => <div data-testid="icon-alert" />,
  Zap: () => <div data-testid="icon-zap" />,
}));

// Mock apiClient to prevent async state updates after unmount
vi.mock("../lib/apiClient", () => ({
  apiClient: {
    getEvents: vi.fn().mockResolvedValue([]),
    getHealth: vi.fn().mockResolvedValue({ status: "healthy", isLive: true }),
    getDecisions: vi.fn().mockResolvedValue([]),
    simulateAction: vi.fn().mockResolvedValue({}),
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

describe("Dashboard Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the command dashboard header", async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText("Command Dashboard")).toBeTruthy();
    });
  });

  it("renders metric cards with labels", async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText("Deployments today")).toBeTruthy();
      expect(screen.getByText("AI-resolved incidents")).toBeTruthy();
      expect(screen.getByText("System health score")).toBeTruthy();
      expect(screen.getByText("Active AI agents")).toBeTruthy();
    });
  });

  it("renders the quick navigation links", async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText("The Loop")).toBeTruthy();
      expect(screen.getByText("Agents")).toBeTruthy();
    });
  });

  it("renders the Live Event Stream panel", async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText("Live Event Stream")).toBeTruthy();
    });
  });

  it("has a trigger simulation button", async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText("Trigger simulation")).toBeTruthy();
    });
  });
});
