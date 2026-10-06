import React, { useState } from "react";
import { trpc } from "../lib/trpc";
import { useActiveProject } from "../components/ProjectContext";
import {
  ListTodo,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Layers,
  User,
  ArrowRight
} from "lucide-react";

const PHASES = [
  "All Phases",
  "Pre-Construction",
  "Earthwork",
  "GSB",
  "WMM",
  "Bituminous Work",
  "CC Pavement",
  "Structures / CD Works",
  "Drain & Protection",
  "Shoulder",
  "Road Furniture",
  "QA/QC",
  "Billing & QS",
  "Hindrance",
  "Completion"
];

const STATUSES = ["All Statuses", "Not Started", "In Progress", "Complete", "On Hold", "Overdue"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];

export default function ActivitiesPage() {
  const [selectedPhase, setSelectedPhase] = useState("All Phases");
  const [selectedStatus, setSelectedStatus] = useState("All Statuses");
  const [selectedRoadId, setSelectedRoadId] = useState<string>("All Roads");
  const [search, setSearch] = useState("");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"table" | "gantt">("table");

  // Form states
  const [taskId, setTaskId] = useState("");
  const [roadId, setRoadId] = useState<number>(1);
  const [phase, setPhase] = useState<any>("Earthwork");
  const [activityName, setActivityName] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [percentageComplete, setPercentageComplete] = useState("0");
  const [priority, setPriority] = useState<any>("Medium");
  const [assignedTo, setAssignedTo] = useState("");
  const [predecessorActivity, setPredecessorActivity] = useState("");
  const [remarks, setRemarks] = useState("");

  const { projectId: activeProjectId } = useActiveProject();
  const { data: activities, isLoading, error, refetch } = trpc.activities.list.useQuery({
    projectId: activeProjectId,
    roadId: selectedRoadId !== "All Roads" ? parseInt(selectedRoadId) : undefined,
    phase: selectedPhase !== "All Phases" ? selectedPhase : undefined,
    status: selectedStatus !== "All Statuses" ? selectedStatus : undefined,
  }, {
    refetchOnMount: true,
    staleTime: 0,
  });

  const { data: roads } = trpc.roads.list.useQuery({ projectId: activeProjectId });

  const createActivity = trpc.activities.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsAddOpen(false);
      resetForm();
    },
  });

  const updateActivity = trpc.activities.update.useMutation({
    onSuccess: () => {
      refetch();
      setIsEditOpen(false);
    },
  });

  const unlockManual = trpc.activities.unlockManual.useMutation({
    onSuccess: () => {
      refetch();
      setIsEditOpen(false);
    },
  });

  const resetForm = () => {
    setTaskId("");
    setActivityName("");
    setPercentageComplete("0");
    setAssignedTo("");
    setPredecessorActivity("");
    setRemarks("");
  };

  const filtered = (activities || []).filter(({ activity }) =>
    activity.activityName.toLowerCase().includes(search.toLowerCase()) ||
    activity.taskId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Error banner - shows if data fetch fails */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-medium">Data load nahi hua: {(error as any)?.message || "Unknown error"}</p>
          <button onClick={() => refetch()} className="mt-2 text-sm text-red-600 underline">Dobara try karo</button>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <ListTodo className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Road Construction Activities & Work Breakdown
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track phase milestones, dependency types, assigned site engineers, auto-completion and overdue timelines.
          </p>
        </div>

        <button
          onClick={() => {
            setTaskId(`TSK-${String((activities?.length || 0) + 1).padStart(3, "0")}`);
            setIsAddOpen(true);
          }}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Activity</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search activity name or task ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Road Filter */}
          <select
            value={selectedRoadId}
            onChange={(e) => setSelectedRoadId(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none"
          >
            <option value="All Roads">All 14 Roads</option>
            {roads?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.roadId} - {r.roadName}
              </option>
            ))}
          </select>

          {/* Phase Filter */}
          <select
            value={selectedPhase}
            onChange={(e) => setSelectedPhase(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none"
          >
            {PHASES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Phase Pills Fast Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 text-[11px] pb-1">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] shrink-0 mr-1">Phases:</span>
          {PHASES.slice(1, 9).map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPhase(selectedPhase === p ? "All Phases" : p)}
              className={`px-2.5 py-1 rounded-md shrink-0 font-medium transition ${
                selectedPhase === p
                  ? "bg-slate-900 text-white font-bold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* View Toggle: Table / Work Programme */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode("table")}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition ${viewMode === "table" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          📋 Table View
        </button>
        <button
          onClick={() => setViewMode("gantt")}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition ${viewMode === "gantt" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          📊 Work Programme Chart
        </button>
      </div>

      {viewMode === "gantt" ? (
        <WorkProgrammeChart activities={filtered} />
      ) : (
      <>
      {/* Activities Grid / Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-auto boq-table-scroll" style={{ maxHeight: "60vh" }}>
          <table className="w-full min-w-[1100px] text-left text-xs text-slate-600">
            <thead className="bg-slate-100 sticky top-0 z-10 text-slate-800 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Task ID</th>
                <th className="py-3 px-4">Road Stretch</th>
                <th className="py-3 px-4">Phase</th>
                <th className="py-3 px-4">Activity Name</th>
                <th className="py-3 px-4">Timeline</th>
                <th className="py-3 px-4 w-36">Progress</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned To</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(({ activity: a, road }) => {
                const pct = parseFloat(String(a.percentageComplete || 0));
                return (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800">
                        {a.taskId}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      <span className="font-bold text-slate-900">{road?.roadId || "RD"}</span>
                      <span className="block text-[11px] text-slate-500 truncate max-w-[140px]">{road?.roadName}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                        {a.phase}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 max-w-xs">
                      {a.activityName}
                      {a.isManual && (
                        <span className="ml-1 inline-block" title="Manually locked — sync will not overwrite">
                          🔒
                        </span>
                      )}
                      {a.remarks && <span className="block text-[10px] text-slate-400 truncate">{a.remarks}</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      <div>{a.startDate}</div>
                      <div className="text-slate-400">to {a.endDate}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex justify-between font-bold text-[11px]">
                          <span>{a.percentageComplete}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pct >= 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-blue-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        a.status === "Complete"
                          ? "bg-emerald-100 text-emerald-800"
                          : a.status === "Overdue"
                          ? "bg-rose-100 text-rose-800 animate-pulse"
                          : a.status === "In Progress"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-[11px]">
                      {a.assignedTo || "Unassigned"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedActivity(a);
                          setIsEditOpen(true);
                        }}
                        className="px-2.5 py-1 text-slate-700 hover:bg-slate-200 rounded font-semibold text-xs"
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Modal: Add New Activity */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900">Add Construction Activity</h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Task ID</label>
                  <input
                    type="text"
                    value={taskId}
                    onChange={(e) => setTaskId(e.target.value)}
                    className="w-full p-2 border rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Target Road</label>
                  <select
                    value={roadId}
                    onChange={(e) => setRoadId(parseInt(e.target.value))}
                    className="w-full p-2 border rounded"
                  >
                    {roads?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.roadId} - {r.roadName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Construction Phase</label>
                  <select
                    value={phase}
                    onChange={(e) => setPhase(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    {PHASES.slice(1).map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    {PRIORITIES.map((pr) => (
                      <option key={pr} value={pr}>
                        {pr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Activity Name & Description</label>
                <input
                  type="text"
                  placeholder="e.g. Laying and Compaction of Wet Mix Macadam (WMM) 150mm"
                  value={activityName}
                  onChange={(e) => setActivityName(e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2 border rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">End Date (Overdue if passed)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2 border rounded font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Assigned Engineer</label>
                  <input
                    type="text"
                    placeholder="e.g. Er. Ramesh Verma (Site Engg)"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Initial % Complete</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={percentageComplete}
                    onChange={(e) => setPercentageComplete(e.target.value)}
                    className="w-full p-2 border rounded font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Remarks & Technical Specifications</label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Thickness, testing references or equipment deployment..."
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-1.5 border rounded text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                disabled={!taskId || !activityName || !endDate}
                onClick={() => {
                  createActivity.mutate({
                    taskId,
                    projectId: activeProjectId as number,
                    roadId,
                    phase,
                    activityName,
                    startDate,
                    endDate,
                    percentageComplete,
                    status: parseFloat(percentageComplete) >= 100 ? "Complete" : "Not Started",
                    priority,
                    assignedTo,
                    predecessorActivity,
                    remarks,
                  });
                }}
                className="px-4 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
              >
                Save Activity
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Update Activity Progress */}
      {isEditOpen && selectedActivity && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Update Activity: {selectedActivity.taskId}
            </h3>
            <p className="text-xs text-slate-500 font-medium">{selectedActivity.activityName}</p>

            {selectedActivity.isManual ? (
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <span className="text-xs font-medium text-amber-800">
                  🔒 Manual entry — sync will not overwrite this.
                </span>
                <button
                  onClick={() => {
                    unlockManual.mutate({ id: selectedActivity.id });
                  }}
                  disabled={unlockManual.isPending}
                  className="text-xs font-semibold text-amber-700 underline hover:text-amber-900 disabled:opacity-50"
                >
                  {unlockManual.isPending ? "Unlocking..." : "Unlock for sync"}
                </button>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <span className="text-[11px] text-slate-500">
                  Saving here will lock this activity — future syncs will not overwrite it.
                </span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Percentage Complete (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  defaultValue={selectedActivity.percentageComplete}
                  id="editActPctInput"
                  className="w-full p-2 border rounded font-mono focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Setting to 100% will automatically mark status as "Complete".
                </span>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Status Override</label>
                <select
                  defaultValue={selectedActivity.status}
                  id="editActStatusInput"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Complete">Complete</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Assigned Site Personnel</label>
                <input
                  type="text"
                  defaultValue={selectedActivity.assignedTo || ""}
                  id="editActAssignedInput"
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Remarks</label>
                <textarea
                  rows={2}
                  defaultValue={selectedActivity.remarks || ""}
                  id="editActRemarksInput"
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-1.5 border rounded text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const pctVal = (document.getElementById("editActPctInput") as HTMLInputElement).value;
                  const stVal = (document.getElementById("editActStatusInput") as HTMLSelectElement).value as any;
                  const asVal = (document.getElementById("editActAssignedInput") as HTMLInputElement).value;
                  const rmVal = (document.getElementById("editActRemarksInput") as HTMLTextAreaElement).value;

                  updateActivity.mutate({
                    id: selectedActivity.id,
                    percentageComplete: pctVal,
                    status: parseFloat(pctVal) >= 100 ? "Complete" : stVal,
                    assignedTo: asVal,
                    remarks: rmVal,
                  });
                }}
                className="px-4 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Work Programme Chart (Gantt-style): bars by start/end dates, fill by % complete */
function WorkProgrammeChart({ activities }: { activities: Array<{ activity: any; road: any }> }) {
  const rows = (activities || [])
    .map(({ activity: a, road }) => ({ a, road }))
    .filter(({ a }) => a.startDate && a.endDate)
    .sort((x, y) => String(x.a.startDate).localeCompare(String(y.a.startDate)));

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
        Koi activity me start/end date nahi hai — Work Programme ke liye dates chahiye.
      </div>
    );
  }

  const parse = (d: string) => new Date(d + "T00:00:00").getTime();
  const minT = Math.min(...rows.map(({ a }) => parse(a.startDate)));
  const maxT = Math.max(...rows.map(({ a }) => parse(a.endDate)));
  const span = Math.max(1, maxT - minT);
  const today = new Date().setHours(0, 0, 0, 0);
  const todayPct = span > 0 ? Math.min(100, Math.max(0, ((today - minT) / span) * 100)) : 0;

  // Month labels
  const months: Array<{ label: string; left: number }> = [];
  {
    const d = new Date(minT);
    d.setDate(1);
    while (d.getTime() <= maxT) {
      const label = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      months.push({ label, left: ((d.getTime() - minT) / span) * 100 });
      d.setMonth(d.getMonth() + 1);
    }
  }

  const barColor = (status: string, pct: number) => {
    if (status === "Complete" || pct >= 100) return "bg-emerald-500";
    if (status === "Overdue") return "bg-rose-500";
    if (status === "In Progress") return "bg-blue-500";
    if (status === "On Hold") return "bg-amber-500";
    return "bg-slate-400";
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800">📊 Work Programme Chart</h3>
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> Complete</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block" /> In Progress</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-400 inline-block" /> Not Started</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block" /> Overdue</span>
        </div>
      </div>
      <div className="overflow-auto" style={{ maxHeight: "60vh" }}>
        <div className="min-w-[900px]">
          {/* Month header */}
          <div className="flex border-b border-slate-200 sticky top-0 bg-white z-10">
            <div className="w-64 shrink-0 px-4 py-2 text-[10px] font-bold uppercase text-slate-500">Activity</div>
            <div className="flex-1 relative h-8">
              {months.map((m, i) => (
                <div key={i} className="absolute top-0 bottom-0 border-l border-slate-200 pl-1 text-[10px] text-slate-500 pt-2" style={{ left: `${m.left}%` }}>
                  {m.label}
                </div>
              ))}
              {/* Today line */}
              {todayPct >= 0 && todayPct <= 100 && (
                <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" style={{ left: `${todayPct}%` }} title="Today" />
              )}
            </div>
          </div>
          {/* Rows */}
          {rows.map(({ a, road }, idx) => {
            const s = parse(a.startDate);
            const e = parse(a.endDate);
            const left = ((s - minT) / span) * 100;
            const width = Math.max(1, ((e - s) / span) * 100);
            const pct = Math.min(100, Math.max(0, parseFloat(String(a.percentageComplete || 0))));
            return (
              <div key={a.id || idx} className={`flex items-center border-b border-slate-100 hover:bg-slate-50 ${idx % 2 ? "bg-slate-50/50" : ""}`}>
                <div className="w-64 shrink-0 px-4 py-2">
                  <div className="text-xs font-semibold text-slate-800 truncate" title={a.activityName}>
                    {a.taskId} — {a.activityName}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {road?.roadId || ""} • {a.phase}
                  </div>
                </div>
                <div className="flex-1 relative h-10 px-1">
                  {/* Month gridlines */}
                  {months.map((m, i) => (
                    <div key={i} className="absolute top-0 bottom-0 border-l border-slate-100" style={{ left: `${m.left}%` }} />
                  ))}
                  {/* Today line */}
                  {todayPct >= 0 && todayPct <= 100 && (
                    <div className="absolute top-0 bottom-0 w-0.5 bg-red-500/60" style={{ left: `${todayPct}%` }} />
                  )}
                  {/* Bar */}
                  <div
                    className="absolute top-2 h-6 rounded-md bg-slate-200 overflow-hidden"
                    style={{ left: `${left}%`, width: `${width}%` }}
                    title={`${a.activityName}: ${a.startDate} to ${a.endDate} (${pct}%)`}
                  >
                    <div className={`h-full ${barColor(a.status, pct)}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="absolute top-2 h-6 flex items-center px-1 pointer-events-none" style={{ left: `${left}%` }}>
                    <span className="text-[9px] font-bold text-slate-700 bg-white/80 rounded px-1">{pct}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="px-4 py-2 border-t border-slate-200 text-[10px] text-slate-500 flex items-center gap-2">
        <span className="w-0.5 h-4 bg-red-500 inline-block" /> Today
        <span className="ml-2">• Bar length = planned duration, fill = % complete</span>
      </div>
    </div>
  );
}
