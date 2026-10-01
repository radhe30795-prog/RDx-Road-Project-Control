import React, { useState } from "react";
import { trpc } from "../lib/trpc";
import {
  AlertTriangle,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Layers,
  Search,
  Filter,
  Check
} from "lucide-react";
import { useRole } from "../components/AppLayout";

const CATEGORIES = [
  "All Categories",
  "Electric Pole",
  "Land Issue",
  "Utility",
  "Forest/Tree",
  "Local Obstruction",
  "Department Decision",
  "Drawing Issue",
  "Material",
  "Other"
] as const;

export default function HindrancePage() {
  const { role } = useRole();
  const [selectedRoadId, setSelectedRoadId] = useState<string>("All Roads");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedStatus, setSelectedStatus] = useState("All Statuses");
  const [search, setSearch] = useState("");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [selectedHindrance, setSelectedHindrance] = useState<any>(null);

  // Form states
  const [roadId, setRoadId] = useState<number>(1);
  const [rdLocation, setRdLocation] = useState("RD 5+200 to 5+450");
  const [category, setCategory] = useState<any>("Electric Pole");
  const [description, setDescription] = useState("");
  const [dateRaised, setDateRaised] = useState(new Date().toISOString().split("T")[0]);
  const [affectedActivity, setAffectedActivity] = useState("GSB & Subgrade Laying");
  const [affectedLength, setAffectedLength] = useState("250 meters");
  const [responsiblePersonDepartment, setResponsiblePersonDepartment] = useState("State Electricity Board (DISCOM)");
  const [letterNumber, setLetterNumber] = useState("RDX/PWD/HND/2026/01");
  const [dueDate, setDueDate] = useState("");
  const [remarks, setRemarks] = useState("");

  const { data: hindrances, isLoading, refetch } = trpc.hindrances.list.useQuery({
    roadId: selectedRoadId !== "All Roads" ? parseInt(selectedRoadId) : undefined,
  });

  const { data: roads } = trpc.roads.list.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();
  const activeProjectId = projects?.[0]?.id || 1;

  const createHindrance = trpc.hindrances.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsAddOpen(false);
      resetForm();
    },
  });

  const updateHindrance = trpc.hindrances.update.useMutation({
    onSuccess: () => {
      refetch();
      setIsResolveOpen(false);
    },
  });

  const resetForm = () => {
    setDescription("");
    setRemarks("");
    setDueDate("");
  };

  const todayStr = new Date().toISOString().split("T")[0];

  const filtered = (hindrances || []).filter(({ hindrance: h, road }) => {
    if (selectedCategory !== "All Categories" && h.category !== selectedCategory) return false;
    if (selectedStatus === "Overdue") {
      return h.status !== "Resolved" && h.dueDate && h.dueDate < todayStr;
    }
    if (selectedStatus !== "All Statuses" && h.status !== selectedStatus) return false;
    if (search && !h.description.toLowerCase().includes(search.toLowerCase()) && !h.hindranceId.toLowerCase().includes(search.toLowerCase()) && !h.rdLocation.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const overdueCount = (hindrances || []).filter(
    ({ hindrance: h }) => h.status !== "Resolved" && h.dueDate && h.dueDate < todayStr
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-rose-500" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Hindrance Register & Bottleneck Resolver
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-100 text-amber-900 border border-amber-300">
              Auto ID & Days Counter Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Systematic logging of utility shifting, land issues, forest clearances, local obstructions and departmental delays.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
        >
          <Plus className="w-4 h-4" />
          <span>Log New Hindrance</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 block">Total Logged Hindrances</span>
          <span className="text-2xl font-black text-slate-900">{hindrances?.length || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 block">Open / Active</span>
          <span className="text-2xl font-black text-amber-600">
            {hindrances?.filter(({ hindrance: h }) => h.status !== "Resolved").length || 0}
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-rose-300 bg-rose-50/40 shadow-sm">
          <span className="text-xs text-rose-700 font-semibold block">Critical Overdue Hindrances</span>
          <span className="text-2xl font-black text-rose-600 animate-pulse">{overdueCount} Overdue</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 block">Resolved Issues</span>
          <span className="text-2xl font-black text-emerald-600">
            {hindrances?.filter(({ hindrance: h }) => h.status === "Resolved").length || 0}
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search ID, RD, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
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

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none"
          >
            <option value="All Statuses">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Under Review">Under Review</option>
            <option value="Resolved">Resolved</option>
            <option value="Overdue">⚠️ Overdue Only ({overdueCount})</option>
          </select>
        </div>
      </div>

      {/* Hindrances List */}
      <div className="space-y-3">
        {filtered.map(({ hindrance: h, road }) => {
          const isOverdue = h.status !== "Resolved" && h.dueDate && h.dueDate < todayStr;
          return (
            <div
              key={h.id}
              className={`p-4 rounded-xl border bg-white shadow-sm transition hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                isOverdue ? "border-rose-300 bg-rose-50/30" : "border-slate-200"
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
                    {h.hindranceId}
                  </span>
                  <span className="font-bold text-xs text-slate-800">
                    {road?.roadId} • {h.rdLocation}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                    {h.category}
                  </span>
                  {isOverdue && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                      OVERDUE
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    h.status === "Resolved"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-blue-100 text-blue-800"
                  }`}>
                    {h.status}
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-medium text-slate-800">
                  {h.description}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-500 pt-1">
                  <div>
                    <span>Affected Activity: </span>
                    <strong className="text-slate-700">{h.affectedActivity} ({h.affectedLength || "N/A"})</strong>
                  </div>
                  <div>
                    <span>Responsible Authority: </span>
                    <strong className="text-slate-700">{h.responsiblePersonDepartment}</strong>
                  </div>
                  <div>
                    <span>Official Letter: </span>
                    <strong className="text-slate-700 font-mono">{h.letterNumber || "N/A"}</strong>
                  </div>
                </div>

                {h.remarks && (
                  <p className="text-[11px] text-slate-500 italic bg-slate-50 p-1.5 rounded">
                    Remarks: {h.remarks}
                  </p>
                )}
              </div>

              {/* Right Side: Days Pending Counter & Actions */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                <div className="text-left sm:text-right">
                  <div className="flex items-center gap-1 font-black text-rose-600 text-sm sm:text-base">
                    <Clock className="w-4 h-4" />
                    <span>{h.daysPending} Days Pending</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Raised: {h.dateRaised} • Due: {h.dueDate || "N/A"}
                  </span>
                </div>

                {h.status !== "Resolved" ? (
                  <button
                    onClick={() => {
                      setSelectedHindrance(h);
                      setIsResolveOpen(true);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1 shadow"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Mark Resolved</span>
                  </button>
                ) : (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                    Resolved on {h.resolutionDate}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Log New Hindrance */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="border-b pb-2">
              <h3 className="text-base font-bold text-slate-900">Log Project Hindrance</h3>
              <p className="text-xs text-slate-500">
                Unique Hindrance ID and Days Pending counter are automatically generated.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
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
                <div>
                  <label className="block font-medium text-slate-700 mb-1">RD / Chainage Location</label>
                  <input
                    type="text"
                    value={rdLocation}
                    onChange={(e) => setRdLocation(e.target.value)}
                    placeholder="e.g. RD 4+200 to 4+500 RHS"
                    className="w-full p-2 border rounded font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Hindrance Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2 border rounded font-semibold"
                  >
                    {CATEGORIES.slice(1).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Affected Length</label>
                  <input
                    type="text"
                    value={affectedLength}
                    onChange={(e) => setAffectedLength(e.target.value)}
                    placeholder="e.g. 300 meters"
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description of Bottleneck</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail exact obstruction, numbers of poles, structure size or dispute..."
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Affected Construction Activity</label>
                  <input
                    type="text"
                    value={affectedActivity}
                    onChange={(e) => setAffectedActivity(e.target.value)}
                    placeholder="e.g. Earthwork Subgrade / Box Culvert"
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Responsible Dept / Person</label>
                  <input
                    type="text"
                    value={responsiblePersonDepartment}
                    onChange={(e) => setResponsiblePersonDepartment(e.target.value)}
                    placeholder="e.g. DISCOM / CALA / Forest Dept"
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Date Raised</label>
                  <input
                    type="date"
                    value={dateRaised}
                    onChange={(e) => setDateRaised(e.target.value)}
                    className="w-full p-2 border rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Due / Target Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-2 border rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Official Letter Ref</label>
                  <input
                    type="text"
                    value={letterNumber}
                    onChange={(e) => setLetterNumber(e.target.value)}
                    placeholder="PWD/CORR/89"
                    className="w-full p-2 border rounded font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Action Notes / Remarks</label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Joint inspection held, demand note paid, permission letter awaited..."
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
                disabled={!description || !rdLocation}
                onClick={() => {
                  createHindrance.mutate({
                    projectId: activeProjectId,
                    roadId,
                    rdLocation,
                    category,
                    description,
                    dateRaised,
                    affectedActivity,
                    affectedLength,
                    responsiblePersonDepartment,
                    letterNumber,
                    dueDate: dueDate || undefined,
                    remarks,
                    status: "Open",
                  });
                }}
                className="px-4 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
              >
                Log Hindrance & Calculate Days
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Mark Hindrance Resolved */}
      {isResolveOpen && selectedHindrance && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Resolve Hindrance: {selectedHindrance.hindranceId}
            </h3>
            <p className="text-xs text-slate-600">{selectedHindrance.description}</p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Resolution Date</label>
                <input
                  type="date"
                  defaultValue={todayStr}
                  id="resolveDateInput"
                  className="w-full p-2 border rounded font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Resolution Action Remarks</label>
                <textarea
                  rows={3}
                  placeholder="Electric poles shifted by DISCOM / Boundary pillar fixed / Clearance letter received..."
                  id="resolveRemarksInput"
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setIsResolveOpen(false)}
                className="px-4 py-1.5 border rounded text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const rDate = (document.getElementById("resolveDateInput") as HTMLInputElement).value;
                  const rRem = (document.getElementById("resolveRemarksInput") as HTMLTextAreaElement).value;

                  updateHindrance.mutate({
                    id: selectedHindrance.id,
                    status: "Resolved",
                    resolutionDate: rDate,
                    remarks: rRem || selectedHindrance.remarks,
                  });
                }}
                className="px-4 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
