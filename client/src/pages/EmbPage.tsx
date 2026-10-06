import React, { useEffect, useMemo, useState } from "react";
import { trpc } from "../lib/trpc";
import { useActiveProject } from "../components/ProjectContext";
import {
  Ruler,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Building2,
  ShieldCheck,
  CheckSquare
} from "lucide-react";
import { toast } from "sonner";
import { useRole } from "../components/AppLayout";

export default function EmbPage() {
  const { role } = useRole();
  const [selectedRoadId, setSelectedRoadId] = useState<string>("All");
  const [selectedBoqId, setSelectedBoqId] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Edit e-MB entry states
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [editLength, setEditLength] = useState("");
  const [editWidth, setEditWidth] = useState("");
  const [editDepth, setEditDepth] = useState("");
  const [editCalcQty, setEditCalcQty] = useState("");
  const [editRate, setEditRate] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editRemarks, setEditRemarks] = useState("");

  // Form states
  const [mbNo, setMbNo] = useState("");
  const [mbDate, setMbDate] = useState(new Date().toISOString().split("T")[0]);
  const [roadId, setRoadId] = useState<number>(1);
  const [boqItemId, setBoqItemId] = useState<number>(1);
  const [activityId, setActivityId] = useState<number | undefined>(undefined);
  const [locationFrom, setLocationFrom] = useState("RD 0+000");
  const [locationTo, setLocationTo] = useState("RD 0+500");
  const [length, setLength] = useState("500.000");
  const [width, setWidth] = useState("7.000");
  const [depth, setDepth] = useState("0.150");
  const [remarks, setRemarks] = useState("Joint measurement taken with client junior engineer.");

  const { projectId: activeProjectId } = useActiveProject();
  const { data: roads } = trpc.roads.list.useQuery({ projectId: activeProjectId });

  // Default the entry-form road to the first available road (instead of hardcoded 1)
  useEffect(() => {
    if (roads && roads.length > 0 && !roads.some((r: any) => r.id === roadId)) {
      setRoadId((roads[0] as any).id);
    }
  }, [roads]);
  const { data: boqData } = trpc.boq.list.useQuery({
    projectId: activeProjectId,
    roadId: selectedRoadId !== "All" ? parseInt(selectedRoadId) : undefined,
  });
  const { data: activities } = trpc.activities.list.useQuery({ roadId, projectId: activeProjectId });

  const { data: measurements, isLoading, error: measurementsError, refetch } = trpc.measurements.list.useQuery({
    projectId: activeProjectId,
    roadId: selectedRoadId !== "All" ? parseInt(selectedRoadId) : undefined,
    boqItemId: selectedBoqId !== "All" ? parseInt(selectedBoqId) : undefined,
  }, {
    refetchOnMount: true,
    staleTime: 0,
  });

  const createMbMutation = trpc.measurements.create.useMutation();
  const updateMbMutation = trpc.measurements.update.useMutation();

  // Selected BOQ item for unit and rate
  const selectedBoq = useMemo(() => {
    return boqData?.find((b) => b.boq.id === boqItemId)?.boq;
  }, [boqData, boqItemId]);

  const computedQuantity = useMemo(() => {
    const l = parseFloat(length || "0");
    const w = parseFloat(width || "0");
    const d = parseFloat(depth || "0");
    if (l > 0 && w > 0 && d > 0) return (l * w * d).toFixed(3);
    if (l > 0 && w > 0 && d === 0) return (l * w).toFixed(3);
    return l.toFixed(3);
  }, [length, width, depth]);

  const computedAmount = useMemo(() => {
    const rate = parseFloat(String(selectedBoq?.rate || 0));
    return (parseFloat(computedQuantity) * rate).toFixed(2);
  }, [computedQuantity, selectedBoq]);

  // Statistics
  const stats = useMemo(() => {
    if (!measurements?.length) return { totalEntries: 0, approvedQty: 0, totalValue: 0, pendingCount: 0 };
    let val = 0;
    let pending = 0;
    measurements.forEach(({ mb }) => {
      val += parseFloat(String(mb.amount || 0));
      if (mb.status === "Draft" || mb.status === "Submitted") pending++;
    });
    return {
      totalEntries: measurements.length,
      approvedQty: measurements.filter((m) => m.mb.status === "Approved").length,
      totalValue: val,
      pendingCount: pending,
    };
  }, [measurements]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId) {
      toast.error("No active project selected — please select a project first, then retry.");
      return;
    }
    const autoNo = mbNo.trim() || `MB-2026-${Date.now().toString().slice(-6)}`;
    try {
      await createMbMutation.mutateAsync({
        mbNo: autoNo,
        mbDate,
        projectId: activeProjectId,
        roadId,
        boqItemId,
        activityId: activityId || undefined,
        locationFrom: locationFrom.trim(),
        locationTo: locationTo.trim(),
        length,
        width,
        depth,
        calculatedQuantity: computedQuantity,
        unit: selectedBoq?.unit || "Cum",
        rate: selectedBoq?.rate ? String(selectedBoq.rate) : "0.00",
        status: "Submitted",
        submittedBy: role,
        remarks: remarks.trim() || undefined,
      });

      toast.success(`e-MB record ${autoNo} submitted for checking!`);
      setIsAddOpen(false);
      setMbNo("");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to save e-MB entry");
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await updateMbMutation.mutateAsync({
        id,
        status: "Approved",
        checkedBy: role,
      });
      toast.success("e-MB measurement checked & approved! BOQ executed quantity updated.");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Approval failed");
    }
  };

  const isBillingOrAdmin =
    role === "admin" ||
    role === "qs_billing_engineer" ||
    role === "project_manager" ||
    role === "site_engineer";

  function openEditEntry(mb: any) {
    setEditingEntry(mb);
    setEditLength(String(mb.length || "0"));
    setEditWidth(String(mb.width || "0"));
    setEditDepth(String(mb.depth || "0"));
    setEditCalcQty(String(mb.calculatedQuantity || "0"));
    setEditRate(String(mb.rate || "0"));
    setEditStatus(mb.status || "Draft");
    setEditRemarks(mb.remarks || "");
  }

  // Live recompute of quantity from edited L x B x D
  const editComputedQty = useMemo(() => {
    const l = parseFloat(editLength || "0");
    const w = parseFloat(editWidth || "0");
    const d = parseFloat(editDepth || "0");
    if (l > 0 && w > 0 && d > 0) return (l * w * d).toFixed(3);
    if (l > 0 && w > 0 && d === 0) return (l * w).toFixed(3);
    return l.toFixed(3);
  }, [editLength, editWidth, editDepth]);

  const handleUpdateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    try {
      await updateMbMutation.mutateAsync({
        id: editingEntry.id,
        length: editLength,
        width: editWidth,
        depth: editDepth,
        calculatedQuantity: editCalcQty,
        rate: editRate,
        status: editStatus as any,
        remarks: editRemarks || undefined,
      });
      toast.success(`e-MB ${editingEntry.mbNo} updated!`);
      setEditingEntry(null);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Error banner - shows if data fetch fails */}
      {measurementsError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-medium">Data load nahi hua: {(measurementsError as any)?.message || "Unknown error"}</p>
          <button onClick={() => refetch()} className="mt-2 text-sm text-red-600 underline">Dobara try karo</button>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Ruler className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Electronic Measurement Book (e-MB)
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-100 text-amber-900 border border-amber-300">
              Chainage L × B × D Calculation
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Standard government e-MB record linking chainage measurements directly to BOQ line items and RA billing abstracts.
          </p>
        </div>
        {isBillingOrAdmin && (
          <button
            onClick={() => {
              if (!activeProjectId) {
                toast.error("No active project selected — please select a project first.");
                return;
              }
              setMbNo(`MB-2026-${String((measurements?.length || 0) + 1).padStart(3, "0")}`);
              setIsAddOpen(true);
            }}
            disabled={!activeProjectId}
            title={!activeProjectId ? "Select an active project first" : "Record a new e-MB measurement entry"}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Record e-MB Entry</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total e-MB Records</span>
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono mt-1 block">
            {stats.totalEntries} Entries
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Chainage dimension sheets</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Measurement Value</span>
          <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 font-mono mt-1 block">
            ₹{(stats.totalValue / 10000000).toFixed(2)} Cr
          </span>
          <span className="text-[10px] text-emerald-700 mt-0.5 block font-semibold">Tender rate evaluated</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Approved Records</span>
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono mt-1 block">
            {stats.approvedQty} / {stats.totalEntries}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Passed by QS / AE</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Pending Verification</span>
          <span
            className={`text-xl sm:text-2xl font-extrabold font-mono mt-1 block ${
              stats.pendingCount > 0 ? "text-amber-600" : "text-emerald-600"
            }`}
          >
            {stats.pendingCount}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Awaiting field cross-check</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by MB No, chainage (e.g. RD 0+500), BOQ item or road..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedRoadId}
            onChange={(e) => setSelectedRoadId(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700"
          >
            <option value="All">All Roads</option>
            {roads?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.roadId} - {r.roadName}
              </option>
            ))}
          </select>
          <select
            value={selectedBoqId}
            onChange={(e) => setSelectedBoqId(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 max-w-[200px]"
          >
            <option value="All">All BOQ Items</option>
            {boqData?.map(({ boq }) => (
              <option key={boq.id} value={boq.id}>
                {boq.itemCode}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* e-MB Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-auto boq-table-scroll" style={{ maxHeight: "60vh" }}>
          <table className="w-full text-left text-xs min-w-[1100px]">
            <thead className="bg-slate-900 text-white font-semibold uppercase tracking-wider text-[10px] sticky top-0 z-10">
              <tr>
                <th className="p-3">MB No. & Date</th>
                <th className="p-3">Road & Chainage Stretch</th>
                <th className="p-3">Linked BOQ Item</th>
                <th className="p-3 text-right">Length (m)</th>
                <th className="p-3 text-right">Width (m)</th>
                <th className="p-3 text-right">Depth (m)</th>
                <th className="p-3 text-right">Quantity (L×B×D)</th>
                <th className="p-3 text-right">Rate (₹)</th>
                <th className="p-3 text-right">Amount (₹)</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="p-6 text-center text-slate-400">Loading e-MB sheets...</td>
                </tr>
              ) : measurements?.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-6 text-center text-slate-400">No measurement sheets recorded yet.</td>
                </tr>
              ) : (
                measurements
                  ?.filter(
                    ({ mb, road, boq }) =>
                      mb.mbNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      mb.locationFrom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      mb.locationTo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (road?.roadName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (boq?.itemCode || "").toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map(({ mb, road, boq }) => (
                    <tr key={mb.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono">
                        <span className="font-bold text-slate-900 block">{mb.mbNo}</span>
                        <span className="text-[10px] text-slate-400 block">{mb.mbDate}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-800 block">
                          {road?.roadId} • {road?.roadName}
                        </span>
                        <span className="text-[11px] font-mono text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded inline-block mt-0.5">
                          {mb.locationFrom} → {mb.locationTo}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-mono font-bold text-slate-800 block">{boq?.itemCode}</span>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[160px]">{boq?.chapter}</span>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-700">{parseFloat(String(mb.length)).toFixed(2)}</td>
                      <td className="p-3 text-right font-mono text-slate-700">{parseFloat(String(mb.width)).toFixed(2)}</td>
                      <td className="p-3 text-right font-mono text-slate-700">{parseFloat(String(mb.depth)).toFixed(3)}</td>
                      <td className="p-3 text-right font-mono font-black text-emerald-700 whitespace-nowrap">
                        {parseFloat(String(mb.calculatedQuantity)).toLocaleString()} {mb.unit}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600">₹{parseFloat(String(mb.rate)).toLocaleString()}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        ₹{parseFloat(String(mb.amount)).toLocaleString()}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            mb.status === "Approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : mb.status === "Submitted"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {mb.status}
                        </span>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditEntry(mb)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-bold transition"
                            title="Edit measurement"
                          >
                            ✏️ Edit
                          </button>
                          {mb.status !== "Approved" && (role === "admin" || role === "qs_billing_engineer" || role === "project_manager") ? (
                            <button
                              onClick={() => handleApprove(mb.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] inline-flex items-center gap-1 shadow"
                            >
                              <CheckSquare className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Checked</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Measurement Sheet */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Ruler className="w-5 h-5 text-amber-500" /> New e-MB Measurement Sheet
              </h2>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">MB Sheet Number *</label>
                  <input
                    type="text"
                    required
                    value={mbNo}
                    onChange={(e) => setMbNo(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Measurement Date *</label>
                  <input
                    type="date"
                    required
                    value={mbDate}
                    onChange={(e) => setMbDate(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Road Stretch *</label>
                  <select
                    value={roadId}
                    onChange={(e) => setRoadId(parseInt(e.target.value))}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-semibold"
                  >
                    {roads?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.roadId} - {r.roadName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Linked Contract BOQ Item *</label>
                  <select
                    value={boqItemId}
                    onChange={(e) => setBoqItemId(parseInt(e.target.value))}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-semibold"
                  >
                    {boqData?.map(({ boq }) => (
                      <option key={boq.id} value={boq.id}>
                        {boq.itemCode} - {boq.chapter} (Rate: ₹{boq.rate})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Start Chainage *</label>
                  <input
                    type="text"
                    required
                    value={locationFrom}
                    onChange={(e) => setLocationFrom(e.target.value)}
                    placeholder="e.g. RD 0+000"
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">End Chainage *</label>
                  <input
                    type="text"
                    required
                    value={locationTo}
                    onChange={(e) => setLocationTo(e.target.value)}
                    placeholder="e.g. RD 0+500"
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              </div>

              {/* L x B x D Dimensions */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="font-bold text-slate-700 block">Length (m)</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-200 rounded-lg bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block">Width (m)</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-200 rounded-lg bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block">Depth / Height (m)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={depth}
                    onChange={(e) => setDepth(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-200 rounded-lg bg-white font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-500 block">Calculated Quantity:</span>
                  <span className="font-black text-emerald-800 text-sm font-mono">
                    {computedQuantity} {selectedBoq?.unit || "Cum"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">Evaluated Amount:</span>
                  <span className="font-black text-slate-900 text-sm font-mono">
                    ₹{parseFloat(computedAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Remarks / Joint Inspection Note</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMbMutation.isPending}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold shadow disabled:opacity-50"
                >
                  Record & Submit e-MB
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Edit e-MB Entry */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                ✏️ Edit e-MB Measurement
              </h2>
              <button onClick={() => setEditingEntry(null)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                ✕
              </button>
            </div>
            <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800">
              <strong className="font-mono">{editingEntry.mbNo}</strong>
              <br />
              <span className="text-slate-600">MB Date: <strong className="font-mono">{editingEntry.mbDate}</strong></span>
            </div>
            <form onSubmit={handleUpdateEntry} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Length (m)</label>
                  <input
                    type="number" step="0.001"
                    value={editLength}
                    onChange={(e) => setEditLength(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Width (m)</label>
                  <input
                    type="number" step="0.001"
                    value={editWidth}
                    onChange={(e) => setEditWidth(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Depth (m)</label>
                  <input
                    type="number" step="0.001"
                    value={editDepth}
                    onChange={(e) => setEditDepth(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700">Calculated Quantity *</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number" step="0.001" required
                    value={editCalcQty}
                    onChange={(e) => setEditCalcQty(e.target.value)}
                    className="flex-1 p-2.5 border border-emerald-200 rounded-lg bg-emerald-50 font-mono font-bold text-emerald-700"
                  />
                  <button
                    type="button"
                    onClick={() => setEditCalcQty(editComputedQty)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg font-bold text-slate-600"
                    title="Recalculate from L × B × D"
                  >
                    ↺ {editComputedQty}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Rate (₹)</label>
                  <input
                    type="number" step="0.01"
                    value={editRate}
                    onChange={(e) => setEditRate(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-semibold"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Checked">Checked</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700">Remarks</label>
                <textarea
                  rows={2} value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  placeholder="Optional notes..."
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button" onClick={() => setEditingEntry(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMbMutation.isPending}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold shadow disabled:opacity-50"
                >
                  {updateMbMutation.isPending ? "Updating..." : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
