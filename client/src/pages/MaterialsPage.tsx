import React, { useState } from "react";
import { trpc } from "../lib/trpc";
import {
  Boxes,
  Plus,
  TrendingDown,
  TrendingUp,
  FileSpreadsheet,
  Building,
  Calendar,
  Layers,
  Search,
  Filter,
  PackageCheck,
  AlertCircle
} from "lucide-react";
import { useRole } from "../components/AppLayout";

const COMMON_MATERIALS = [
  "VG-30 Paving Bitumen",
  "CRMB-55 Modified Bitumen",
  "OPC 53 Grade Cement",
  "PPC Cement",
  "Fe-500D TMT Steel Rebars",
  "Crushed Aggregates 40mm",
  "Crushed Aggregates 20mm",
  "Crushed Aggregates 10mm",
  "Stone Dust / Quarry Fines",
  "Granular Sub-Base (GSB) Mix",
  "Wet Mix Macadam (WMM) Mix",
  "Bitumen Emulsion (RS-1 / SS-1)",
  "HDPE Drainage Pipes (300mm)",
  "Retro-Reflective Signage Sheeting"
];

const UNITS = ["MT", "Cum", "Sqm", "Rmt", "Bags", "Barrels", "Nos"];

export default function MaterialsPage() {
  const { role } = useRole();
  const [selectedRoadId, setSelectedRoadId] = useState<string>("All Roads");
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states
  const [entryId, setEntryId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [roadId, setRoadId] = useState<number>(1);
  const [material, setMaterial] = useState("VG-30 Paving Bitumen");
  const [receivedQuantity, setReceivedQuantity] = useState("100.00");
  const [usedQuantity, setUsedQuantity] = useState("45.00");
  const [unit, setUnit] = useState("MT");
  const [supplier, setSupplier] = useState("Indian Oil Corporation Ltd (IOCL)");
  const [challanReference, setChallanReference] = useState("IOCL/INV/9041");
  const [remarks, setRemarks] = useState("Batch test certificate verified.");

  const { data: materials, isLoading, refetch } = trpc.materials.list.useQuery({
    roadId: selectedRoadId !== "All Roads" ? parseInt(selectedRoadId) : undefined,
  });

  const { data: roads } = trpc.roads.list.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();
  const activeProjectId = projects?.[0]?.id || 1;

  const createMaterial = trpc.materials.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsAddOpen(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setEntryId("");
    setChallanReference("");
    setRemarks("");
  };

  const calculatedBalancePreview = (
    parseFloat(receivedQuantity || "0") - parseFloat(usedQuantity || "0")
  ).toFixed(2);

  const filtered = (materials || []).filter(({ material: m, road }) => {
    if (search && !m.material.toLowerCase().includes(search.toLowerCase()) && !m.entryId.toLowerCase().includes(search.toLowerCase()) && !m.supplier?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Materials Stock & Consumption Ledger
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded bg-purple-100 text-purple-900 border border-purple-300">
              Auto Balance Calculation Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track receipt, site consumption, physical balance and challan references for bitumen, aggregates, cement and steel.
          </p>
        </div>

        <button
          onClick={() => {
            setEntryId(`MAT-2026-${String((materials?.length || 0) + 1).padStart(3, "0")}`);
            setIsAddOpen(true);
          }}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
        >
          <Plus className="w-4 h-4" />
          <span>Record Material Challan</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search material or supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
            />
          </div>

          <select
            value={selectedRoadId}
            onChange={(e) => setSelectedRoadId(e.target.value)}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none"
          >
            <option value="All Roads">All 14 Roads</option>
            {roads?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.roadId} - {r.roadName}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-slate-500">
          Showing {filtered.length} of {materials?.length || 0} ledger items
        </span>
      </div>

      {/* Material Stock Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100 text-slate-800 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Entry ID</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Allocated Road</th>
                <th className="py-3 px-4">Material Description</th>
                <th className="py-3 px-4 text-right">Received Qty</th>
                <th className="py-3 px-4 text-right">Used Qty</th>
                <th className="py-3 px-4 text-right">Balance Qty (Auto)</th>
                <th className="py-3 px-4">Supplier & Challan</th>
                <th className="py-3 px-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(({ material: m, road }) => {
                const bal = parseFloat(String(m.balanceQuantity || 0));
                return (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800">
                        {m.entryId}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {m.date}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      <span className="font-bold text-slate-900">{road?.roadId}</span>
                      <span className="block text-[11px] text-slate-500 truncate max-w-[130px]">{road?.roadName}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {m.material}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">
                      {m.receivedQuantity} {m.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-amber-700">
                      {m.usedQuantity} {m.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-sm">
                      <span className={`px-2 py-0.5 rounded ${
                        bal <= 0
                          ? "bg-rose-100 text-rose-800"
                          : bal < 50
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {m.balanceQuantity} {m.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <span className="font-medium text-slate-800 block truncate">{m.supplier || "Direct Depot"}</span>
                      <span className="text-[10px] text-slate-400 font-mono block">Challan: {m.challanReference || "N/A"}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate text-[11px]">
                      {m.remarks || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Material Challan */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="border-b pb-2">
              <h3 className="text-base font-bold text-slate-900">Record Material Challan Receipt & Stock</h3>
              <p className="text-xs text-slate-500">
                Balance Quantity will be calculated automatically as (Received Qty - Used Qty).
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Entry ID</label>
                  <input
                    type="text"
                    value={entryId}
                    onChange={(e) => setEntryId(e.target.value)}
                    className="w-full p-2 border rounded font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Challan Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2 border rounded font-mono"
                  />
                </div>
              </div>

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
                  <label className="block font-medium text-slate-700 mb-1">Material Name</label>
                  <select
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    className="w-full p-2 border rounded font-bold"
                  >
                    {COMMON_MATERIALS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Received Qty</label>
                  <input
                    type="number"
                    step="0.01"
                    value={receivedQuantity}
                    onChange={(e) => setReceivedQuantity(e.target.value)}
                    className="w-full p-2 border rounded font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Used Qty</label>
                  <input
                    type="number"
                    step="0.01"
                    value={usedQuantity}
                    onChange={(e) => setUsedQuantity(e.target.value)}
                    className="w-full p-2 border rounded font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Unit</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full p-2 border rounded font-bold"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-purple-900 block">Calculated Physical Balance:</span>
                  <span className="text-[10px] text-purple-700">(Formula: Received - Used)</span>
                </div>
                <span className="text-lg font-black text-purple-950 font-mono">
                  {calculatedBalancePreview} {unit}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Supplier Name</label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="Refinery / Crusher / Plant Name"
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Challan / Invoice Ref</label>
                  <input
                    type="text"
                    value={challanReference}
                    onChange={(e) => setChallanReference(e.target.value)}
                    placeholder="INV/2026/09"
                    className="w-full p-2 border rounded font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Remarks & Storage Yard Location</label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Testing certificate no., silo storage number, test status..."
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
                disabled={!entryId || !material || !receivedQuantity}
                onClick={() => {
                  createMaterial.mutate({
                    entryId,
                    date,
                    projectId: activeProjectId,
                    roadId,
                    material,
                    receivedQuantity,
                    usedQuantity,
                    unit,
                    supplier,
                    challanReference,
                    remarks,
                  });
                }}
                className="px-4 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
              >
                Save Material Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
