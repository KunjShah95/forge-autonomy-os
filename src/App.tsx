import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AppLayout } from "@/components/layout/AppLayout";

// Page component imports
import Dashboard from "./pages/Dashboard";
import Agents from "./pages/Agents";
import CICD from "./pages/CICD";
import Incidents from "./pages/Incidents";
import Architecture from "./pages/Architecture";
import Workflows from "./pages/Workflows";
import Analytics from "./pages/Analytics";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import Landing from "./pages/Landing";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

const Shell = ({ children }: { children: React.ReactNode }) => <AppLayout>{children}</AppLayout>;

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/onboarding" element={<Onboarding />} />
              
              {/* Application Shell Routes */}
              <Route path="/app" element={<Shell><Dashboard /></Shell>} />
              <Route path="/agents" element={<Shell><Agents /></Shell>} />
              <Route path="/cicd" element={<Shell><CICD /></Shell>} />
              <Route path="/incidents" element={<Shell><Incidents /></Shell>} />
              <Route path="/architecture" element={<Shell><Architecture /></Shell>} />
              <Route path="/workflows" element={<Shell><Workflows /></Shell>} />
              <Route path="/analytics" element={<Shell><Analytics /></Shell>} />
              
              {/* 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
