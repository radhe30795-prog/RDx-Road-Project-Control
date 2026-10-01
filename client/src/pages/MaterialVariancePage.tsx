import React, { useMemo, useState } from "react";
import { trpc } from "../lib/trpc";
import {
  Scale,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Boxes,
  RotateCcw,
  Plus,
  FileCheck2
} from "lucide-react";
import { toast } from "sonner";
import { useRole } from "../components/AppLayout";

export default function MaterialVariancePage() {
  const { role } = useRole();
  const [selectedRoadId, setSelectedRoadId] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [isComputeOpen, setIsComputeOpen] = useState(false);

  // Compute form
  const [compRoadId, setCompRoadId] = useState<number>(1);
  const [compBoqId, setCompBoqId] = useState<number>(1);
  const [compMaterialId, setCompMaterialId] = useState<number>(1);
  const [periodFrom, setPeriodFrom] = useState("2026-09-01");
  const [periodTo, setPeriodTo] = useState(new Date().toISOString().split("T")[0]);

  const { data: projects } = trpc.projects.list.useQuery();
  const activeProjectId = projects?.[0]?.id || 1;
  const { data: roads } = trpc.roads.list.useQuery();
  const { data: boqData } = trpc.boq.list.useQuery({
    roadId: compRoadId,
  });
  const { data: inventoryData } = trpc.inventory.list.useQuery();

  const { data: variances, isLoading, refetch } = trpc.materialVariances.list.useQuery({
    roadId: selectedRoadId !== "All" ? parseInt(selectedRoadId) : undefined,
  });

  const computeMutation = trpc.materialVariances.compute.useMutation();

  const handleCompute = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await computeMutation.mutateAsync({
        projectId: activeProjectId,
        roadId: compRoadId,
        boqItemId: compBoqId,
        materialId: compMaterialId,
        periodFrom,
        periodTo,
      });

      toast.success(`Variance audit complete! Status: ${res.status} (${res.variancePct}%)`);
      setIsComputeOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to compute variance");
    }
  };

  // Overall Statistics
  const stats = useMemo(() => {
    if (!variances?.length) return { totalAudits: 0, excessCount: 0, watchCount: 0, withinCount: 0 };
    let excess = 0;
    let watch = 0;
    let within = 0;
    variances.forEach(({ variance }) => {
      if (variance.status === "Excess") excess++;
      else if (variance.status === "Watch") watch++;
      else within++;
    });
    return {
      totalAudits: variances.length,
      excessCount: excess,
      watchCount: watch,
      withinCount: within,
    };
  }, [variances]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Material Wastage & Variance Audit
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded bg-blue-100 text-blue-900 border border-blue-300">
              Theoretical vs Actual MoRTH Audit
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Compare theoretical material consumption based on executed e-MB measurements against actual site issues from inventory.
          </p>
        </div>

        <button
          onClick={() => setIsComputeOpen(true)}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
        >
          <RotateCcw className="w-4 h-4 text-amber-400" />
          <span>Run Variance Audit</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Audited Items</span>
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono mt-1 block">
            {stats.totalAudits} Reconciled
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">MoRTH standard comparisons</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Within MoRTH Tolerance</span>
          <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 font-mono mt-1 block">
            {stats.withinCount} Items
          </span>
          <span className="text-[10px] text-emerald-700 mt-0.5 block font-semibold">Under ±2.5% variation</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Watchlist (2.5% to 5%)</span>
          <span className="text-xl sm:text-2xl font-extrabold text-amber-600 font-mono mt-1 block">
            {stats.watchCount} Items
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Requires field checking</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Excess Consumption (&gt;5%)</span>
          <span
            className={`text-xl sm:text-2xl font-extrabold font-mono mt-1 block ${
              stats.excessCount > 0 ? "text-rose-600" : "text-emerald-600"
            }`}
          >
            {stats.excessCount} Items
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Material wastage alert</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex-1 relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search material audit by code, road, or reason..."
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
        </div>
      </div>

      {/* Variance Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Audit No. & Period</th>
                <th className="p-3">Road Stretch</th>
                <th className="p-3">Executed Item (e-MB)</th>
                <th className="p-3">Material Analyzed</th>
                <th className="p-3 text-right">Theoretical Qty</th>
                <th className="p-3 text-right">Actual Issued</th>
                <th className="p-3 text-right">Variance Qty</th>
                <th className="p-3 text-center">Variance %</th>
                <th className="p-3 text-center">Audit Status</th>
                <th className="p-3">Site Reason / Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-slate-400">Loading variance reports...</td>
                </tr>
              ) : variances?.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-slate-400">
                    No material variance audits computed yet. Click &quot;Run Variance Audit&quot; above to reconcile.
                  </td>
                </tr>
              ) : (
                variances
                  ?.filter(
                    ({ variance, road, boq, material }) =>
                      variance.varianceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (variance.reason || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (road?.roadName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (material?.materialName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (boq?.itemCode || "").toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map(({ variance, road, boq, material }) => {
                    const pct = parseFloat(String(variance.variancePercent || 0));
                    const isExcess = variance.status === "Excess";
                    const isWatch = variance.status === "Watch";

                    return (
                      <tr key={variance.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono">
                          <span className="font-bold text-slate-900 block">{variance.varianceNo}</span>
                          <span className="text-[10px] text-slate-400 block">
                            {variance.periodFrom} → {variance.periodTo}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-800">
                          {road?.roadId} • {road?.roadName}
                        </td>
                        <td className="p-3">
                          <span className="font-mono font-bold text-slate-800 block">{boq?.itemCode}</span>
                          <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">{boq?.chapter}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-slate-800 block">{material?.materialName}</span>
                          <span className="font-mono text-[10px] text-slate-400">{material?.materialCode}</span>
                        </td>
                        <td className="p-3 text-right font-mono text-slate-700 whitespace-nowrap">
                          {parseFloat(String(variance.theoreticalQuantity)).toLocaleString()} {material?.unit}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {parseFloat(String(variance.actualQuantity)).toLocaleString()} {material?.unit}
                        </td>
                        <td
                          className={`p-3 text-right font-mono font-bold whitespace-nowrap ${
                            isExcess ? "text-rose-600" : isWatch ? "text-amber-600" : "text-emerald-600"
                          }`}
                        >
                          {parseFloat(String(variance.varianceQuantity)) > 0 ? "+" : ""}
                          {parseFloat(String(variance.varianceQuantity)).toLocaleString()} {material?.unit}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap font-mono font-bold">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] ${
                              isExcess
                                ? "bg-rose-100 text-rose-800"
                                : isWatch
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {pct > 0 ? `+${pct}%` : `${pct}%`}
                          </span>
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isExcess
                                ? "bg-rose-100 text-rose-800"
                                : isWatch
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {variance.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 text-[11px] max-w-[200px]">
                          <span className="font-medium text-slate-800 block">{variance.reason}</span>
                          <span className="text-[10px] text-slate-400 block truncate">{variance.remarks}</span>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compute Modal */}
      {isComputeOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-500" /> Run Material Variance Reconciliation
              </h2>
              <button onClick={() => setIsComputeOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCompute} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Road Stretch *</label>
                <select
                  value={compRoadId}
                  onChange={(e) => setCompRoadId(parseInt(e.target.value))}
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
                <label className="font-bold text-slate-700">Executed BOQ Line Item *</label>
                <select
                  value={compBoqId}
                  onChange={(e) => setCompBoqId(parseInt(e.target.value))}
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-semibold"
                >
                  {boqData?.map(({ boq }) => (
                    <option key={boq.id} value={boq.id}>
                      {boq.itemCode} - {boq.chapter}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Material to Reconcile *</label>
                <select
                  value={compMaterialId}
                  onChange={(e) => setCompMaterialId(parseInt(e.target.value))}
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-semibold"
                >
                  {inventoryData?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.materialCode} - {m.materialName} ({m.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Audit Period From *</label>
                  <input
                    type="date"
                    required
                    value={periodFrom}
                    onChange={(e) => setPeriodFrom(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Audit Period To *</label>
                  <input
                    type="date"
                    required
                    value={periodTo}
                    onChange={(e) => setPeriodTo(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                <strong>How it works:</strong> The system sums all verified e-MB quantities for the selected BOQ item, applies standard MoRTH consumption factors, and compares with actual issues from your site inventory ledger.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsComputeOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={computeMutation.isPending}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold shadow disabled:opacity-50"
                >
                  {computeMutation.isPending ? "Reconciling..." : "Run Reconcile & Audit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
