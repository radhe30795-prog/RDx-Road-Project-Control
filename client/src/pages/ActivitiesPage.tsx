import React, { useState } from "react";
import { trpc } from "../lib/trpc";
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

  const { data: activities, isLoading, refetch } = trpc.activities.list.useQuery({
    roadId: selectedRoadId !== "All Roads" ? parseInt(selectedRoadId) : undefined,
    phase: selectedPhase !== "All Phases" ? selectedPhase : undefined,
    status: selectedStatus !== "All Statuses" ? selectedStatus : undefined,
  });

  const { data: roads } = trpc.roads.list.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();
  const activeProjectId = projects?.[0]?.id || 1;

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

      {/* Activities Grid / Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100 text-slate-800 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
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
                    projectId: activeProjectId,
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
