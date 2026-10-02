import React, { useMemo, useState } from "react";
import { trpc } from "../lib/trpc";
import {
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Layers,
  ArrowUpDown,
  Building2
} from "lucide-react";
import { toast } from "sonner";
import { useRole } from "../components/AppLayout";

export default function BoqPage() {
  const { role } = useRole();
  const [selectedRoadId, setSelectedRoadId] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChapter, setSelectedChapter] = useState<string>("All");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingBoq, setEditingBoq] = useState<any>(null);

  // Form states
  const [itemCode, setItemCode] = useState("");
  const [roadId, setRoadId] = useState<number | undefined>(undefined);
  const [chapter, setChapter] = useState("Chapter 4: Granular Sub-Base");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("Cum");
  const [contractQuantity, setContractQuantity] = useState("");
  const [rate, setRate] = useState("");
  const [remarks, setRemarks] = useState("");

  // Edit form states
  const [editChapter, setEditChapter] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editContractQty, setEditContractQty] = useState("");
  const [editExecutedQty, setEditExecutedQty] = useState("");
  const [editRate, setEditRate] = useState("");
  const [editStatus, setEditStatus] = useState("Active");
  const [editRemarks, setEditRemarks] = useState("");

  const { data: projects } = trpc.projects.list.useQuery();
  const activeProjectId = projects?.[0]?.id || 1;
  const { data: roads } = trpc.roads.list.useQuery();
  const { data: boqData, isLoading, refetch } = trpc.boq.list.useQuery({
    projectId: activeProjectId,
    roadId: selectedRoadId !== "All" ? parseInt(selectedRoadId) : undefined,
  });

  const createBoqMutation = trpc.boq.create.useMutation();
  const updateBoqMutation = trpc.adminEdit.updateBoq.useMutation({
    onSuccess: () => {
      toast.success("BOQ item updated!");
      setEditingBoq(null);
      refetch();
    },
    onError: (e) => toast.error(e.message || "Update failed"),
  });

  function openEdit(boq: any) {
    setEditingBoq(boq);
    setEditChapter(boq.chapter || "");
    setEditDescription(boq.description || "");
    setEditUnit(boq.unit || "");
    setEditContractQty(String(boq.contractQuantity || ""));
    setEditExecutedQty(String(boq.executedQuantity || ""));
    setEditRate(String(boq.rate || ""));
    setEditStatus(boq.status || "Active");
    setEditRemarks(boq.remarks || "");
  }

  function handleUpdateBoq(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingBoq) return;
    updateBoqMutation.mutate({
      id: editingBoq.id,
      chapter: editChapter,
      description: editDescription,
      unit: editUnit,
      contractQuantity: editContractQty,
      executedQuantity: editExecutedQty,
      rate: editRate,
      status: editStatus as "Active" | "Closed" | "Variation",
      remarks: editRemarks || null,
    });
  }

  const chapters = useMemo(() => {
    if (!boqData) return [];
    return Array.from(new Set(boqData.map((b) => b.boq.chapter))).filter(Boolean);
  }, [boqData]);

  const filteredBoq = useMemo(() => {
    if (!boqData) return [];
    return boqData.filter(({ boq, road }) => {
      const matchSearch =
        boq.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        boq.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (road?.roadName || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchChapter = selectedChapter === "All" || boq.chapter === selectedChapter;
      return matchSearch && matchChapter;
    });
  }, [boqData, searchTerm, selectedChapter]);

  // Overall statistics
  const stats = useMemo(() => {
    if (!boqData?.length) {
      return { totalAmount: 0, executedAmount: 0, totalItems: 0, completedItems: 0 };
    }
    let totalAmt = 0;
    let execAmt = 0;
    let completed = 0;

    boqData.forEach(({ boq }) => {
      const cAmt = parseFloat(String(boq.contractAmount || 0));
      const r = parseFloat(String(boq.rate || 0));
      const execQty = parseFloat(String(boq.executedQuantity || 0));
      const cQty = parseFloat(String(boq.contractQuantity || 0));

      totalAmt += cAmt;
      execAmt += execQty * r;
      if (cQty > 0 && execQty >= cQty) completed++;
    });

    return {
      totalAmount: totalAmt,
      executedAmount: execAmt,
      totalItems: boqData.length,
      completedItems: completed,
    };
  }, [boqData]);

  const handleCreateBoq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemCode.trim() || !description.trim() || !contractQuantity || !rate) {
      toast.error("Please fill required fields (Code, Description, Quantity, Rate)");
      return;
    }

    try {
      await createBoqMutation.mutateAsync({
        itemCode: itemCode.trim().toUpperCase(),
        projectId: activeProjectId,
        roadId: roadId || undefined,
        chapter,
        description: description.trim(),
        unit,
        contractQuantity,
        rate,
        remarks: remarks.trim() || undefined,
      });

      toast.success("BOQ Item created successfully");
      setIsAddOpen(false);
      setItemCode("");
      setDescription("");
      setContractQuantity("");
      setRate("");
      setRemarks("");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to create BOQ item");
    }
  };

  const isEngineerOrAdmin =
    role === "admin" ||
    role === "project_manager" ||
    role === "qs_billing_engineer" ||
    role === "site_engineer";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">BOQ Master & Quantity Control</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Contract Bill of Quantities, tender rates, executed cumulative quantities and remaining balances.
          </p>
        </div>
        {isEngineerOrAdmin && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Add BOQ Item</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total BOQ Contract Value</span>
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono mt-1 block">
            ₹{(stats.totalAmount / 10000000).toFixed(2)} Cr
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">{stats.totalItems} contract line items</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Executed Value (Cumulative)</span>
          <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 font-mono mt-1 block">
            ₹{(stats.executedAmount / 10000000).toFixed(2)} Cr
          </span>
          <span className="text-[10px] text-emerald-700 mt-0.5 block font-semibold">
            {stats.totalAmount > 0 ? ((stats.executedAmount / stats.totalAmount) * 100).toFixed(1) : 0}% Executed
          </span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Balance Value to Execute</span>
          <span className="text-xl sm:text-2xl font-extrabold text-amber-600 font-mono mt-1 block">
            ₹{((stats.totalAmount - stats.executedAmount) / 10000000).toFixed(2)} Cr
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Remaining contract liability</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Execution Status</span>
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono mt-1 block">
            {stats.completedItems} / {stats.totalItems}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Items 100% completed</span>
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
            placeholder="Search by BOQ Item code, description or road..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedRoadId}
            onChange={(e) => setSelectedRoadId(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 focus:outline-none"
          >
            <option value="All">All Roads</option>
            {roads?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.roadId} - {r.roadName}
              </option>
            ))}
          </select>
          <select
            value={selectedChapter}
            onChange={(e) => setSelectedChapter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 focus:outline-none"
          >
            <option value="All">All Chapters</option>
            {chapters.map((ch) => (
              <option key={ch} value={ch}>
                {ch}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* BOQ Table - with vertical & horizontal scrollbars */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div
          className="overflow-auto boq-table-scroll"
          style={{ maxHeight: "65vh" }}
        >
          <table className="w-full text-left text-xs min-w-[1200px]">
            <thead className="bg-slate-900 text-white font-semibold uppercase tracking-wider text-[10px] sticky top-0 z-10">
              <tr>
                <th className="p-3">Item Code & Chapter</th>
                <th className="p-3">Description</th>
                <th className="p-3">Road Stretch</th>
                <th className="p-3 text-right">Contract Qty</th>
                <th className="p-3 text-right">Executed Qty</th>
                <th className="p-3 text-right">Balance Qty</th>
                <th className="p-3 text-right">Rate (₹)</th>
                <th className="p-3 text-right">Total Amount (₹)</th>
                <th className="p-3 text-center">Progress %</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="p-6 text-center text-slate-400">Loading BOQ schedule...</td>
                </tr>
              ) : filteredBoq.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-6 text-center text-slate-400">No BOQ items match the criteria.</td>
                </tr>
              ) : (
                filteredBoq.map(({ boq, road }) => {
                  const contractQty = parseFloat(String(boq.contractQuantity || 0));
                  const executedQty = parseFloat(String(boq.executedQuantity || 0));
                  const balanceQty = parseFloat(String(boq.balanceQuantity || 0));
                  const pct = contractQty > 0 ? Math.min(100, (executedQty / contractQty) * 100) : 0;
                  const isOver = executedQty > contractQty;

                  return (
                    <tr key={boq.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono font-bold text-slate-900">
                        <span>{boq.itemCode}</span>
                        <span className="text-[10px] text-slate-400 block font-sans font-normal mt-0.5 truncate max-w-[180px]">
                          {boq.chapter}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700 max-w-[280px]">
                        <p className="line-clamp-2 leading-relaxed">{boq.description}</p>
                      </td>
                      <td className="p-3 text-slate-600 whitespace-nowrap">
                        {road ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 font-mono">{road.roadId}</span>
                            <span className="truncate max-w-[120px]">{road.roadName}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Project-Wide</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {parseFloat(String(boq.contractQuantity)).toLocaleString()} {boq.unit}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                        {parseFloat(String(boq.executedQuantity)).toLocaleString()} {boq.unit}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-amber-700 whitespace-nowrap">
                        {parseFloat(String(boq.balanceQuantity)).toLocaleString()} {boq.unit}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600 whitespace-nowrap">
                        ₹{parseFloat(String(boq.rate)).toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        ₹{parseFloat(String(boq.contractAmount)).toLocaleString()}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="w-20 mx-auto">
                          <div className="flex justify-between text-[10px] font-mono text-slate-600 mb-0.5">
                            <span>{pct.toFixed(1)}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${isOver ? "bg-red-500" : pct >= 100 ? "bg-emerald-500" : "bg-amber-500"}`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            boq.status === "Closed"
                              ? "bg-slate-100 text-slate-600"
                              : isOver
                              ? "bg-red-100 text-red-700"
                              : pct >= 100
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {isOver ? "Exceeded" : boq.status}
                        </span>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        {(role === "admin" || role === "project_manager" || role === "qs_billing_engineer") && (
                          <button
                            onClick={() => openEdit(boq)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[11px] font-bold transition"
                            title="Edit BOQ item"
                          >
                            ✏️ Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add BOQ Item Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-500" /> New BOQ Item
              </h2>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBoq} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Item Code *</label>
                  <input
                    type="text"
                    required
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value)}
                    placeholder="e.g. BOQ-WMM-07"
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Road Stretch</label>
                  <select
                    value={roadId || ""}
                    onChange={(e) => setRoadId(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                  >
                    <option value="">Project-Wide / All Roads</option>
                    {roads?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.roadId} - {r.roadName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">BOQ Chapter / Section *</label>
                <input
                  type="text"
                  required
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  placeholder="e.g. Chapter 4: Granular Sub-Base"
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Item Description *</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed specification as per contract agreement and MoRTH..."
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Contract Quantity *</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={contractQuantity}
                    onChange={(e) => setContractQuantity(e.target.value)}
                    placeholder="e.g. 5000"
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Unit *</label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="Cum / MT / Sqm"
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Tender Rate (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    placeholder="e.g. 1450.00"
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              </div>

              {contractQuantity && rate && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex justify-between items-center text-amber-900 font-mono text-xs">
                  <span>Computed Contract Amount:</span>
                  <span className="font-bold text-sm">
                    ₹{(parseFloat(contractQuantity || "0") * parseFloat(rate || "0")).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700">Remarks (Optional)</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Technical note or specification reference"
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
                  disabled={createBoqMutation.isPending}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold shadow disabled:opacity-50"
                >
                  {createBoqMutation.isPending ? "Saving..." : "Save BOQ Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit BOQ Item Modal */}
      {editingBoq && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                ✏️ Edit BOQ Item
              </h2>
              <button onClick={() => setEditingBoq(null)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                ✕
              </button>
            </div>
            <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800">
              <strong>Item Code:</strong> <span className="font-mono font-bold">{editingBoq.itemCode}</span>
              {editingBoq.roadId && <span className="ml-2">| Road ID: {editingBoq.roadId}</span>}
            </div>
            <form onSubmit={handleUpdateBoq} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700">BOQ Chapter / Section *</label>
                <input
                  type="text" required value={editChapter} onChange={(e) => setEditChapter(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Item Description *</label>
                <textarea
                  required rows={3} value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Contract Qty *</label>
                  <input
                    type="number" step="0.001" required value={editContractQty}
                    onChange={(e) => setEditContractQty(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Executed Qty *</label>
                  <input
                    type="number" step="0.001" required value={editExecutedQty}
                    onChange={(e) => setEditExecutedQty(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-emerald-200 rounded-lg bg-emerald-50 font-mono font-bold text-emerald-700"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Already completed work — yahi se add karo</p>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Unit *</label>
                  <input
                    type="text" required value={editUnit} onChange={(e) => setEditUnit(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Rate (₹) *</label>
                  <input
                    type="number" step="0.01" required value={editRate}
                    onChange={(e) => setEditRate(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Status</label>
                  <select
                    value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                  >
                    <option value="Active">Active</option>
                    <option value="Closed">Closed</option>
                    <option value="Variation">Variation</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700">Remarks</label>
                <textarea
                  rows={2} value={editRemarks} onChange={(e) => setEditRemarks(e.target.value)}
                  placeholder="Optional notes..."
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button" onClick={() => setEditingBoq(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={updateBoqMutation.isPending}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold shadow disabled:opacity-50"
                >
                  {updateBoqMutation.isPending ? "Updating..." : "Update BOQ Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
