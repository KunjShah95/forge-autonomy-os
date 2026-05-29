import { useState, useEffect } from "react";
import { apiClient } from "../lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  ClipboardList, Plus, AlertTriangle, Zap, CheckCircle, Clock,
  CalendarDays, Layers, Trash2, Play, BrainCircuit, Loader2, X,
  ArrowRight, RotateCcw, Sparkles, Target, AlertOctagon,
} from "lucide-react";

export default function SprintPlanning() {
  // Backlog items
  const [backlogItems, setBacklogItems] = useState<any[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);
  const [blockers, setBlockers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"backlog" | "sprints" | "blockers">("backlog");

  // Decomposition form
  const [decomposeDesc, setDecomposeDesc] = useState("");
  const [decomposeService, setDecomposeService] = useState("");
  const [decomposing, setDecomposing] = useState(false);

  // Sprint plan form
  const [sprintName, setSprintName] = useState("");
  const [sprintGoal, setSprintGoal] = useState("");
  const [maxEffort, setMaxEffort] = useState("40");
  const [planning, setPlanning] = useState(false);

  // New item form
  const [showNewItem, setShowNewItem] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newEffort, setNewEffort] = useState("3");
  const [newService, setNewService] = useState("");

  // Blockers
  const [scanningBlockers, setScanningBlockers] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [items, sprintList, blockerList] = await Promise.all([
        apiClient.listBacklogItems(""),
        apiClient.listSprints(""),
        apiClient.listBlockers(false),
      ]);
      setBacklogItems(Array.isArray(items) ? items : []);
      setSprints(Array.isArray(sprintList) ? sprintList : []);
      setBlockers(Array.isArray(blockerList) ? blockerList : []);
    } catch (err) {
      console.error("Failed to load sprint data:", err);
    }
    setLoading(false);
  }

  async function handleDecompose() {
    if (!decomposeDesc.trim()) return;
    setDecomposing(true);
    try {
      const newItems = await apiClient.decomposeBacklog(decomposeDesc, decomposeService);
      if (Array.isArray(newItems)) {
        setBacklogItems((prev) => [...newItems, ...prev]);
      }
      setDecomposeDesc("");
      setDecomposeService("");
    } catch (err) {
      console.error("Decompose failed:", err);
    }
    setDecomposing(false);
  }

  async function handleCreateItem() {
    if (!newTitle.trim()) return;
    try {
      const item = {
        title: newTitle,
        priority: newPriority,
        effort_days: parseFloat(newEffort) || 3,
        service: newService || "general",
        status: "backlog",
        source: "manual",
        tags: [],
        description: "",
        blocked: false,
        blocker: "",
      };
      const created = await apiClient.createBacklogItem(item);
      if (created) {
        setBacklogItems((prev) => [created, ...prev]);
        setShowNewItem(false);
        setNewTitle("");
        setNewPriority("medium");
        setNewEffort("3");
        setNewService("");
      }
    } catch (err) {
      console.error("Create item failed:", err);
    }
  }

  async function handleGenerateSprint() {
    setPlanning(true);
    try {
      const sprint = await apiClient.generateSprintPlan({
        sprint_name: sprintName || `Sprint ${new Date().toISOString().slice(0, 10)}`,
        goal: sprintGoal || "Complete prioritized backlog items",
        max_effort_days: parseFloat(maxEffort) || 40,
        prioritize_blockers: true,
      });
      if (sprint) {
        setSprints((prev) => [sprint, ...prev]);
        await loadData(); // Refresh to see updated item statuses
        setSprintName("");
        setSprintGoal("");
      }
    } catch (err) {
      console.error("Generate sprint failed:", err);
    }
    setPlanning(false);
  }

  async function handleStartSprint(sprintId: string) {
    const updated = await apiClient.startSprint(sprintId);
    if (updated) {
      setSprints((prev) => prev.map((s) => (s.id === sprintId ? updated : s)));
    }
  }

  async function handleCompleteSprint(sprintId: string) {
    const updated = await apiClient.completeSprint(sprintId);
    if (updated) {
      setSprints((prev) => prev.map((s) => (s.id === sprintId ? updated : s)));
      await loadData();
    }
  }

  async function handleDeleteItem(itemId: string) {
    const result = await apiClient.deleteBacklogItem(itemId);
    if (result) {
      setBacklogItems((prev) => prev.filter((i) => i.id !== itemId));
    }
  }

  async function handleScanBlockers() {
    setScanningBlockers(true);
    try {
      const newBlockers = await apiClient.detectBlockers();
      if (Array.isArray(newBlockers)) {
        setBlockers((prev) => [...newBlockers, ...prev]);
      }
    } catch (err) {
      console.error("Blocker scan failed:", err);
    }
    setScanningBlockers(false);
  }

  async function handleResolveBlocker(blockerId: string) {
    await apiClient.resolveBlocker(blockerId);
    setBlockers((prev) =>
      prev.map((b) => (b.id === blockerId ? { ...b, auto_resolved: true } : b))
    );
  }

  const priorityColor = (p: string) =>
    p === "critical"
      ? "destructive"
      : p === "high"
        ? "default"
        : p === "medium"
          ? "secondary"
          : "outline";

  const statusColor = (s: string) =>
    s === "done" || s === "completed"
      ? "default"
      : s === "in_progress" || s === "active"
        ? "secondary"
        : "outline";

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
          <h1 className="text-2xl font-bold tracking-tight">Sprint Planning</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Backlog decomposition, blocker detection, and sprint plan generation
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleScanBlockers} disabled={scanningBlockers}>
            <AlertTriangle className="h-4 w-4 mr-1" />
            {scanningBlockers ? "Scanning..." : "Scan Blockers"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowNewItem(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Item
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b pb-2">
        {(["backlog", "sprints", "blockers"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              activeTab === tab
                ? "bg-primary/10 text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "backlog" && <ClipboardList className="h-4 w-4 inline mr-1" />}
            {tab === "sprints" && <CalendarDays className="h-4 w-4 inline mr-1" />}
            {tab === "blockers" && <AlertOctagon className="h-4 w-4 inline mr-1" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === "backlog" && (
              <Badge variant="outline" className="ml-2 text-xs">{backlogItems.length}</Badge>
            )}
            {tab === "blockers" && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {blockers.filter((b) => !b.auto_resolved).length}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Backlog */}
      {activeTab === "backlog" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Backlog list */}
          <div className="lg:col-span-2 space-y-3">
            {/* Decomposition tool */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4" /> AI Backlog Decomposition
                </CardTitle>
                <CardDescription>Describe a feature or goal and the AI will decompose it into backlog items</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <div className="flex-1 space-y-2">
                    <Textarea
                      placeholder="e.g., Implement multi-region failover for all critical services with automated health checks and DNS propagation..."
                      value={decomposeDesc}
                      onChange={(e) => setDecomposeDesc(e.target.value)}
                      rows={2}
                    />
                    <Input
                      placeholder="Service (optional)"
                      value={decomposeService}
                      onChange={(e) => setDecomposeService(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleDecompose} disabled={decomposing || !decomposeDesc.trim()}>
                    {decomposing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Decompose
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Items list */}
            {backlogItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No backlog items yet. Create one or use AI decomposition.</p>
              </div>
            ) : (
              backlogItems.map((item) => (
                <Card key={item.id} className={item.blocked ? "border-destructive/30" : ""}>
                  <CardContent className="flex items-start gap-3 p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{item.title}</span>
                        <Badge variant={priorityColor(item.priority)} className="text-[10px]">
                          {item.priority}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{item.service}</Badge>
                        {item.blocked && (
                          <Badge variant="destructive" className="text-[10px]">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Blocked
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span><Zap className="h-3 w-3 inline mr-1" />{item.effort_days}d</span>
                        <span><Clock className="h-3 w-3 inline mr-1" />{item.status}</span>
                        {item.blocker && <span className="text-destructive"><AlertTriangle className="h-3 w-3 inline mr-1" />{item.blocker}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteItem(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Sprint generator sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Generate Sprint Plan
                </CardTitle>
                <CardDescription>Auto-select backlog items into a sprint</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Sprint name"
                  value={sprintName}
                  onChange={(e) => setSprintName(e.target.value)}
                />
                <Input
                  placeholder="Sprint goal (optional)"
                  value={sprintGoal}
                  onChange={(e) => setSprintGoal(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Max effort:</span>
                  <Input
                    type="number"
                    value={maxEffort}
                    onChange={(e) => setMaxEffort(e.target.value)}
                    className="w-20 h-8 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">days</span>
                </div>
                <Button
                  className="w-full"
                  onClick={handleGenerateSprint}
                  disabled={planning || backlogItems.length === 0}
                >
                  {planning ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Target className="h-4 w-4 mr-2" />
                  )}
                  Generate Sprint Plan
                </Button>
              </CardContent>
            </Card>

            {/* Quick stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Backlog Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total items</span>
                  <span className="font-medium">{backlogItems.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Critical</span>
                  <span className="font-medium text-destructive">
                    {backlogItems.filter((i) => i.priority === "critical").length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">High</span>
                  <span className="font-medium text-orange-500">
                    {backlogItems.filter((i) => i.priority === "high").length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Blocked</span>
                  <span className="font-medium text-destructive">
                    {backlogItems.filter((i) => i.blocked).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total effort</span>
                  <span className="font-medium">
                    {backlogItems.reduce((s, i) => s + (i.effort_days || 0), 0).toFixed(1)}d
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Sprints */}
      {activeTab === "sprints" && (
        <div className="space-y-4">
          {sprints.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No sprints yet. Go to the Backlog tab and generate a sprint plan.</p>
            </div>
          ) : (
            sprints.map((sprint) => (
              <Card key={sprint.id} className={sprint.status === "active" ? "border-primary/50" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{sprint.name}</CardTitle>
                      <CardDescription>{sprint.goal}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusColor(sprint.status)}>{sprint.status}</Badge>
                      {sprint.status === "planning" && (
                        <Button size="sm" onClick={() => handleStartSprint(sprint.id)}>
                          <Play className="h-3.5 w-3.5 mr-1" /> Start
                        </Button>
                      )}
                      {sprint.status === "active" && (
                        <Button size="sm" onClick={() => handleCompleteSprint(sprint.id)}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-muted-foreground text-xs">Items</span>
                      <p className="font-medium">{sprint.items?.length || 0}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Total effort</span>
                      <p className="font-medium">{sprint.total_effort_days?.toFixed(1) || "—"}d</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Velocity</span>
                      <p className="font-medium">{sprint.velocity_estimate?.toFixed(1) || "—"}d</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Blockers</span>
                      <p className="font-medium text-destructive">{sprint.blockers?.length || 0}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">End date</span>
                      <p className="font-medium text-xs">
                        {sprint.end_date ? new Date(sprint.end_date).toLocaleDateString() : "—"}
                      </p>
                    </div>
                  </div>
                  {sprint.items && sprint.items.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {sprint.items.slice(0, 10).map((itemId: string) => (
                        <Badge key={itemId} variant="outline" className="text-[10px]">{itemId}</Badge>
                      ))}
                      {sprint.items.length > 10 && (
                        <Badge variant="outline" className="text-[10px]">+{sprint.items.length - 10} more</Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab: Blockers */}
      {activeTab === "blockers" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Automatically detected blockers from CI/CD telemetry and incident trends
            </p>
            <Button variant="outline" size="sm" onClick={handleScanBlockers} disabled={scanningBlockers}>
              {scanningBlockers ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-1" />
              )}
              Re-scan
            </Button>
          </div>
          {blockers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertOctagon className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No blockers detected. Run a scan to check CI/CD telemetry.</p>
            </div>
          ) : (
            blockers.map((blocker) => (
              <Card
                key={blocker.id}
                className={
                  blocker.auto_resolved
                    ? "opacity-50"
                    : blocker.severity === "critical"
                      ? "border-destructive"
                      : blocker.severity === "high"
                        ? "border-orange-400"
                        : ""
                }
              >
                <CardContent className="flex items-start gap-3 p-4">
                  <AlertTriangle
                    className={`h-5 w-5 mt-0.5 shrink-0 ${
                      blocker.auto_resolved
                        ? "text-muted-foreground"
                        : blocker.severity === "critical"
                          ? "text-destructive"
                          : blocker.severity === "high"
                            ? "text-orange-500"
                            : "text-yellow-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{blocker.title}</span>
                      <Badge
                        variant={
                          blocker.severity === "critical"
                            ? "destructive"
                            : blocker.severity === "high"
                              ? "default"
                              : "secondary"
                        }
                        className="text-[10px]"
                      >
                        {blocker.severity}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{blocker.source}</Badge>
                      {blocker.auto_resolved && (
                        <Badge variant="secondary" className="text-[10px]">Resolved</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{blocker.description}</p>
                    {blocker.evidence && (
                      <p className="text-xs text-muted-foreground/70 mt-1 italic">{blocker.evidence}</p>
                    )}
                    {blocker.suggested_action && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                        <ArrowRight className="h-3 w-3" /> {blocker.suggested_action}
                      </div>
                    )}
                    {blocker.affected_items && blocker.affected_items.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Layers className="h-3 w-3 text-muted-foreground" />
                        {blocker.affected_items.map((aid: string) => (
                          <Badge key={aid} variant="outline" className="text-[9px]">{aid}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {!blocker.auto_resolved && (
                    <Button variant="ghost" size="sm" className="shrink-0" onClick={() => handleResolveBlocker(blocker.id)}>
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Resolve
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* New Item Modal */}
      {showNewItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewItem(false)}>
          <div className="bg-background rounded-lg shadow-xl w-full max-w-md p-6 mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Plus className="h-4 w-4" /> New Backlog Item
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setShowNewItem(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <Input placeholder="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Effort (days)</label>
                  <Input type="number" value={newEffort} onChange={(e) => setNewEffort(e.target.value)} />
                </div>
              </div>
              <Input placeholder="Service (e.g., billing-svc)" value={newService} onChange={(e) => setNewService(e.target.value)} />
              <Button className="w-full" onClick={handleCreateItem} disabled={!newTitle.trim()}>
                <Plus className="h-4 w-4 mr-2" /> Create Item
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
