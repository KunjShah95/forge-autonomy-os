import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SprintPlanning from "../pages/SprintPlanning";

// Mock the apiClient
vi.mock("../lib/apiClient", () => ({
  apiClient: {
    listBacklogItems: vi.fn().mockResolvedValue([]),
    listSprints: vi.fn().mockResolvedValue([]),
    listBlockers: vi.fn().mockResolvedValue([]),
    decomposeBacklog: vi.fn().mockResolvedValue([]),
    createBacklogItem: vi.fn().mockResolvedValue(null),
    generateSprintPlan: vi.fn().mockResolvedValue(null),
    detectBlockers: vi.fn().mockResolvedValue([]),
    resolveBlocker: vi.fn().mockResolvedValue({}),
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

describe("SprintPlanning Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the sprint planning header", async () => {
    renderWithProviders(<SprintPlanning />);
    await waitFor(() => {
      expect(screen.getByText("Sprint Planning")).toBeTruthy();
    });
  });

  it("renders tab buttons", async () => {
    renderWithProviders(<SprintPlanning />);
    await waitFor(() => {
      expect(screen.getByText("Backlog")).toBeTruthy();
      expect(screen.getByText("Sprints")).toBeTruthy();
      expect(screen.getByText("Blockers")).toBeTruthy();
    });
  });

  it("renders the AI decomposition tool", async () => {
    renderWithProviders(<SprintPlanning />);
    await waitFor(() => {
      expect(screen.getByText("AI Backlog Decomposition")).toBeTruthy();
    });
  });

  it("renders the scan blockers button", async () => {
    renderWithProviders(<SprintPlanning />);
    await waitFor(() => {
      expect(screen.getByText("Scan Blockers")).toBeTruthy();
    });
  });
});
