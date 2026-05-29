import { useState, useEffect } from "react";
import { apiClient } from "../lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import {
  Activity, TrendingUp, Shield, Clock, Zap, CheckCircle, AlertTriangle,
  Server, Users, BarChart3, Target, BrainCircuit, Gauge, Loader2,
  ArrowUp, ArrowDown, Minus,
} from "lucide-react";

type KpiMetric = { name: string; display_name: string; value: number; unit: string; target: number; trend: string; status: string; description?: string };
type ServiceHealth = { name: string; status: string; uptime_pct: number; p99_latency_ms: number; error_rate_pct: number; last_incident?: string };
type AutonomyMetric = { name: string; value: number; unit: string; baseline: number; improvement_pct: number; status: string };
type Tenant = { id: string; name: string; status: string; tier: string; services_connected: number; total_services: number; policies_active: number; incidents_last_7d: number; autonomy_rate: number; readiness_checks: Record<string, boolean> };

export default function PilotDashboard() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KpiMetric[]>([]);
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [autonomyMetrics, setAutonomyMetrics] = useState<AutonomyMetric[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [overallHealth, setOverallHealth] = useState(0);
  const [activeIncidents, setActiveIncidents] = useState(0);
  const [totalDecisions, setTotalDecisions] = useState(0);
  const [autonomyRate, setAutonomyRate] = useState(0);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const data = await apiClient.getPilotDashboard();
      if (data) {
        setKpis(Array.isArray(data.kpis) ? data.kpis : []);
        setServices(Array.isArray(data.services) ? data.services : []);
        setAutonomyMetrics(Array.isArray(data.autonomy_metrics) ? data.autonomy_metrics : []);
        setTenants(Array.isArray(data.tenants) ? data.tenants : []);
        setOverallHealth(data.overall_health_score ?? 0);
        setActiveIncidents(data.active_incidents ?? 0);
        setTotalDecisions(data.total_decisions_24h ?? 0);
        setAutonomyRate(data.autonomy_rate_24h ?? 0);
      }
    } catch (err) {
      console.error("Failed to load pilot dashboard:", err);
    }
    setLoading(false);
  }

  const trendIcon = (trend: string) =>
    trend === "rising" ? <ArrowUp className="h-3 w-3 text-green-500" /> :
    trend === "falling" ? <ArrowDown className="h-3 w-3 text-blue-500" /> :
    <Minus className="h-3 w-3 text-muted-foreground" />;

  const statusColor = (s: string) =>
    s === "healthy" ? "text-green-500" :
    s === "warning" ? "text-orange-500" :
    s === "critical" || s === "degraded" ? "text-destructive" :
    "text-muted-foreground";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pilot Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Production readiness KPIs, service health, and autonomy metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Gauge className={`h-5 w-5 ${overallHealth >= 80 ? "text-green-500" : overallHealth >= 60 ? "text-orange-500" : "text-destructive"}`} />
            <span className="font-medium">{overallHealth.toFixed(0)}%</span>
            <span className="text-muted-foreground">health</span>
          </div>
          <Button variant="outline" size="sm" onClick={loadDashboard}>
            <Activity className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.name} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <p className="text-xs text-muted-foreground">{kpi.display_name}</p>
                {trendIcon(kpi.trend)}
              </div>
              <p className={`text-2xl font-bold mt-1 ${statusColor(kpi.status)}`}>
                {kpi.value}{kpi.unit === "%" ? "%" : ""}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] text-muted-foreground">
                  target {kpi.target}{kpi.unit === "%" ? "%" : ` ${kpi.unit}`}
                </span>
                <Badge
                  variant={kpi.status === "healthy" ? "default" : "secondary"}
                  className="text-[8px] h-4 ml-auto"
                >
                  {kpi.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <BrainCircuit className="h-8 w-8 text-primary opacity-80" />
            <div>
              <p className="text-2xl font-bold">{autonomyRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">24h Autonomy Rate</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-blue-500 opacity-80" />
            <div>
              <p className="text-2xl font-bold">{totalDecisions}</p>
              <p className="text-xs text-muted-foreground">Decisions (24h)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className={`h-8 w-8 ${activeIncidents > 0 ? "text-destructive" : "text-green-500"} opacity-80`} />
            <div>
              <p className="text-2xl font-bold">{activeIncidents}</p>
              <p className="text-xs text-muted-foreground">Active Incidents</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-violet-500 opacity-80" />
            <div>
              <p className="text-2xl font-bold">{tenants.length}</p>
              <p className="text-xs text-muted-foreground">Pilot Tenants</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Health */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Server className="h-4 w-4" /> Service Health
            </CardTitle>
            <CardDescription>Live status of all managed services</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {services.map((svc) => (
              <div key={svc.name} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${svc.status === "healthy" ? "bg-green-500" : svc.status === "degraded" ? "bg-orange-500" : "bg-destructive"}`} />
                  <span className="text-sm font-medium">{svc.name}</span>
                  <Badge
                    variant={svc.status === "healthy" ? "default" : "destructive"}
                    className="text-[9px] h-4 capitalize"
                  >
                    {svc.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{svc.uptime_pct.toFixed(2)}%</span>
                  <span>{svc.p99_latency_ms}ms</span>
                  <span className={svc.error_rate_pct > 1 ? "text-destructive" : ""}>
                    {svc.error_rate_pct.toFixed(2)}% err
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Autonomy Metrics */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" /> Autonomy KPIs
            </CardTitle>
            <CardDescription>Autonomous operations performance vs baseline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {autonomyMetrics.map((metric) => (
              <div key={metric.name} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                <div>
                  <p className="text-sm font-medium capitalize">
                    {metric.name.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Baseline: {metric.baseline}{metric.unit}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${statusColor(metric.status)}`}>
                    {metric.value}{metric.unit}
                  </p>
                  <p className={`text-xs ${metric.improvement_pct >= 0 ? "text-green-500" : "text-destructive"}`}>
                    {metric.improvement_pct >= 0 ? "+" : ""}{metric.improvement_pct.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Pilot Tenants */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" /> Pilot Tenants
          </CardTitle>
          <CardDescription>Onboarding progress and readiness status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tenants.map((tenant) => {
              const checks = Object.values(tenant.readiness_checks);
              const passedChecks = checks.filter(Boolean).length;
              const totalChecks = checks.length;
              const progressPct = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

              return (
                <div key={tenant.id} className="p-3 rounded-md border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{tenant.name}</span>
                      <Badge
                        variant={
                          tenant.status === "onboarded" ? "default" :
                          tenant.status === "active" ? "secondary" :
                          tenant.status === "pending" ? "outline" : "destructive"
                        }
                        className="text-[9px] h-4 capitalize"
                      >
                        {tenant.status}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] h-4 capitalize">{tenant.tier}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{tenant.services_connected}/{tenant.total_services} svc</span>
                      <span>{tenant.policies_active} policies</span>
                      <span>{tenant.incidents_last_7d} incidents (7d)</span>
                      <span className="font-medium text-primary">{tenant.autonomy_rate.toFixed(0)}% auto</span>
                    </div>
                  </div>
                  {/* Readiness progress bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          progressPct === 100 ? "bg-green-500" :
                          progressPct >= 60 ? "bg-primary" :
                          "bg-orange-500"
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground min-w-[3rem] text-right">
                      {passedChecks}/{totalChecks} checks
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.entries(tenant.readiness_checks).map(([key, val]) => (
                      <Badge
                        key={key}
                        variant={val ? "default" : "outline"}
                        className="text-[8px] h-4 capitalize"
                      >
                        {val ? <CheckCircle className="h-2.5 w-2.5 mr-1" /> : <AlertTriangle className="h-2.5 w-2.5 mr-1" />}
                        {key.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
