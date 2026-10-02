import React, { useState } from "react";
import { Link } from "wouter";
import { trpc } from "../lib/trpc";
import {
  Compass,
  Plus,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  MapPin,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Layers,
  Edit2,
  Boxes
} from "lucide-react";

export default function RoadsPage() {
  const [search, setSearch] = useState("");
  const [selectedRoad, setSelectedRoad] = useState<any>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Form states
  const [roadId, setRoadId] = useState("");
  const [roadName, setRoadName] = useState("");
  const [roadLengthKm, setRoadLengthKm] = useState("");
  const [startRd, setStartRd] = useState("0+000");
  const [endRd, setEndRd] = useState("");
  const [remarks, setRemarks] = useState("");

  const { data: roads, isLoading, refetch } = trpc.roads.list.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();
  const activeProjectId = projects?.[0]?.id || 1;

  const createRoad = trpc.roads.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsAddOpen(false);
      resetForm();
    },
  });

  const updateRoad = trpc.roads.update.useMutation({
    onSuccess: () => {
      refetch();
      setIsEditOpen(false);
    },
  });

  const resetForm = () => {
    setRoadId("");
    setRoadName("");
    setRoadLengthKm("");
    setStartRd("0+000");
    setEndRd("");
    setRemarks("");
  };

  const filteredRoads = (roads || []).filter((r) =>
    r.roadName.toLowerCase().includes(search.toLowerCase()) ||
    r.roadId.toLowerCase().includes(search.toLowerCase())
  );

  const totalLength = (roads || []).reduce((acc, r) => acc + parseFloat(String(r.roadLengthKm || 0)), 0).toFixed(2);
  const avgProgress = roads && roads.length > 0
    ? (roads.reduce((acc, r) => acc + parseFloat(String(r.progress || 0)), 0) / roads.length).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              14 Project Roads Tracker
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-100 text-amber-900 border border-amber-300">
              14 Active Highway Stretches
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Complete inventory, chainage RD boundaries, length quantification and physical progress tracking.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
        >
          <Plus className="w-4 h-4" />
          <span>Add Road Stretch</span>
        </button>
        <Link
          href="/structures"
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
        >
          <Boxes className="w-4 h-4 text-slate-950" />
          <span>पुल-पुलिया & Drain Register</span>
        </Link>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 block">Total Monitored Roads</span>
          <span className="text-2xl font-black text-slate-900">{roads?.length || 14} Roads</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 block">Total Package Length</span>
          <span className="text-2xl font-black text-blue-600">{totalLength} Km</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 block">Average Physical Progress</span>
          <span className="text-2xl font-black text-amber-600">{avgProgress}%</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 block">Completed (&gt;80%)</span>
          <span className="text-2xl font-black text-emerald-600">
            {roads?.filter(r => parseFloat(String(r.progress)) >= 80).length || 0} Roads
          </span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Road ID or Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <span className="text-xs text-slate-500 self-end sm:self-auto">
          Showing {filteredRoads.length} of {roads?.length || 0} roads
        </span>
      </div>

      {/* Roads Table / Cards */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-auto boq-table-scroll" style={{ maxHeight: "60vh" }}>
          <table className="w-full min-w-[1100px] text-left text-xs text-slate-600">
            <thead className="bg-slate-100 text-slate-800 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="py-3 px-4">Road ID</th>
                <th className="py-3 px-4">Road Name & Stretch</th>
                <th className="py-3 px-4">Length</th>
                <th className="py-3 px-4">Chainage (RD)</th>
                <th className="py-3 px-4 w-44">Progress</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Remarks</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRoads.map((r) => {
                const prog = parseFloat(String(r.progress || 0));
                return (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                        {r.roadId}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 text-sm block">
                        {r.roadName}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {r.roadLengthKm} Km
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-mono">
                      {r.startRd} to {r.endRd}
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span>{r.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              prog >= 75 ? "bg-emerald-500" : prog >= 40 ? "bg-amber-500" : "bg-blue-500"
                            }`}
                            style={{ width: `${prog}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.status === "Completed"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-500">
                      {r.remarks || "—"}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setSelectedRoad(r);
                          setIsEditOpen(true);
                        }}
                        className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add New Road Stretch */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add Road Stretch to Project</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Road ID (e.g. RD-15)</label>
                <input
                  type="text"
                  value={roadId}
                  onChange={(e) => setRoadId(e.target.value)}
                  placeholder="RD-15"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Road Name</label>
                <input
                  type="text"
                  value={roadName}
                  onChange={(e) => setRoadName(e.target.value)}
                  placeholder="e.g. Greenfield Bypass Link"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Length (Km)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={roadLengthKm}
                    onChange={(e) => setRoadLengthKm(e.target.value)}
                    placeholder="12.50"
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Start RD</label>
                  <input
                    type="text"
                    value={startRd}
                    onChange={(e) => setStartRd(e.target.value)}
                    placeholder="0+000"
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">End RD</label>
                  <input
                    type="text"
                    value={endRd}
                    onChange={(e) => setEndRd(e.target.value)}
                    placeholder="12+500"
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Remarks</label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Pavement specification, terrain or alignment notes..."
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-amber-500"
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
                disabled={!roadId || !roadName || !roadLengthKm}
                onClick={() => {
                  createRoad.mutate({
                    roadId,
                    projectId: activeProjectId,
                    roadName,
                    roadLengthKm,
                    startRd,
                    endRd: endRd || `${roadLengthKm}+000`,
                    status: "In Progress",
                    progress: "0.00",
                    remarks,
                  });
                }}
                className="px-4 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
              >
                Save Road
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Road Progress / Details */}
      {isEditOpen && selectedRoad && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Update Road: {selectedRoad.roadId} - {selectedRoad.roadName}
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Physical Progress (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  defaultValue={selectedRoad.progress}
                  id="editProgressInput"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Status</label>
                <select
                  defaultValue={selectedRoad.status}
                  id="editStatusInput"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Remarks</label>
                <textarea
                  rows={3}
                  defaultValue={selectedRoad.remarks || ""}
                  id="editRemarksInput"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-amber-500"
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
                  const pVal = (document.getElementById("editProgressInput") as HTMLInputElement).value;
                  const sVal = (document.getElementById("editStatusInput") as HTMLSelectElement).value as any;
                  const rVal = (document.getElementById("editRemarksInput") as HTMLTextAreaElement).value;
                  updateRoad.mutate({
                    id: selectedRoad.id,
                    progress: pVal,
                    status: sVal,
                    remarks: rVal,
                  });
                }}
                className="px-4 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800"
              >
                Update Road
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
