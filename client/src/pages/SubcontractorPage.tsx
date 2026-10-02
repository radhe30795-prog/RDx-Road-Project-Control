import React, { useMemo, useState } from "react";
import { trpc } from "../lib/trpc";
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck2,
  Building,
  DollarSign,
  UserCheck
} from "lucide-react";
import { toast } from "sonner";
import { useRole } from "../components/AppLayout";
import { useActiveProject } from "../components/ProjectContext";

export default function SubcontractorPage() {
  const { role } = useRole();
  const [selectedRoadId, setSelectedRoadId] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [isWoModalOpen, setIsWoModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  // New Subcontractor form
  const [subCode, setSubCode] = useState("");
  const [subName, setSubName] = useState("");
  const [workCategory, setWorkCategory] = useState("Earthwork & Embankment");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [gstin, setGstin] = useState("");

  // New Work Order form
  const [woNo, setWoNo] = useState("");
  const [woRoadId, setWoRoadId] = useState<number>(1);
  const [woSubId, setWoSubId] = useState<number>(1);
  const [scope, setScope] = useState("Excavation, spreading and compaction of subgrade earthwork");
  const [unit, setUnit] = useState("Cum");
  const [awardedQty, setAwardedQty] = useState("15000.000");
  const [rate, setRate] = useState("145.00");
  const [startDate, setStartDate] = useState("2026-09-01");
  const [targetDate, setTargetDate] = useState("2026-11-30");

  const { projectId: activeProjectId } = useActiveProject();
  const { data: roads } = trpc.roads.list.useQuery({ projectId: activeProjectId });
  const { data: subsList, refetch: refetchSubs } = trpc.subcontractors.list.useQuery({ projectId: activeProjectId });
  const { data: woList, isLoading, refetch: refetchWo } = trpc.subcontractors.workOrdersList.useQuery({
    projectId: activeProjectId,
    roadId: selectedRoadId !== "All" ? parseInt(selectedRoadId) : undefined,
  });

  const createSubMutation = trpc.subcontractors.create.useMutation();
  const createWoMutation = trpc.subcontractors.createWorkOrder.useMutation();
  const updateWoMutation = trpc.subcontractors.updateWorkOrder.useMutation();

  const handleCreateSub = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const code = subCode.trim() || `SUB-${Date.now().toString().slice(-4)}`;
      await createSubMutation.mutateAsync({
        subcontractorCode: code,
        projectId: activeProjectId as number,
        name: subName.trim(),
        workCategory,
        contactPerson: contactPerson.trim() || undefined,
        phone: phone.trim() || undefined,
        gstin: gstin.trim() || undefined,
      });
      toast.success(`Subcontractor ${subName} registered!`);
      setIsSubModalOpen(false);
      setSubName("");
      refetchSubs();
    } catch (err: any) {
      toast.error(err.message || "Failed to register subcontractor");
    }
  };

  const handleCreateWo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const orderNo = woNo.trim() || `WO-2026-${Date.now().toString().slice(-4)}`;
      await createWoMutation.mutateAsync({
        workOrderNo: orderNo,
        projectId: activeProjectId as number,
        roadId: woRoadId,
        subcontractorId: woSubId,
        scope: scope.trim(),
        unit,
        awardedQuantity: awardedQty,
        rate,
        startDate,
        targetDate,
        status: "Issued",
      });
      toast.success(`Work Order ${orderNo} awarded successfully!`);
      setIsWoModalOpen(false);
      refetchWo();
    } catch (err: any) {
      toast.error(err.message || "Failed to issue work order");
    }
  };

  // KPI summaries
  const stats = useMemo(() => {
    if (!woList?.length) return { totalWo: 0, totalAwarded: 0, totalPaid: 0, balancePayable: 0 };
    let awarded = 0;
    let paid = 0;
    woList.forEach(({ wo }) => {
      awarded += parseFloat(String(wo.awardedAmount || 0));
      paid += parseFloat(String(wo.paidAmount || 0));
    });
    return {
      totalWo: woList.length,
      totalAwarded: awarded,
      totalPaid: paid,
      balancePayable: Math.max(0, awarded - paid),
    };
  }, [woList]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Subcontractors & Work Orders Control
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-100 text-amber-900 border border-amber-300">
              Petty Contractor & Labour Billing
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage subcontractor agreements, awarded work orders, progress tracking and petty payment certificates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSubModalOpen(true)}
            className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-sm"
          >
            <UserCheck className="w-4 h-4 text-slate-600" />
            <span>+ Add Subcontractor</span>
          </button>
          <button
            onClick={() => {
              setWoNo(`WO-2026-${String((woList?.length || 0) + 1).padStart(2, "0")}`);
              setIsWoModalOpen(true);
            }}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Issue Work Order</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Work Orders</span>
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono mt-1 block">
            {stats.totalWo} Contracts
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">{subsList?.length || 0} Registered vendors</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Awarded Value</span>
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono mt-1 block">
            ₹{(stats.totalAwarded / 100000).toFixed(2)} Lakh
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Piece-rate contracts</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Paid to Date</span>
          <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 font-mono mt-1 block">
            ₹{(stats.totalPaid / 100000).toFixed(2)} Lakh
          </span>
          <span className="text-[10px] text-emerald-700 mt-0.5 block font-semibold">Verified against progress</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Balance Commitment</span>
          <span className="text-xl sm:text-2xl font-extrabold text-amber-600 font-mono mt-1 block">
            ₹{(stats.balancePayable / 100000).toFixed(2)} Lakh
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Pending execution/release</span>
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
            placeholder="Search work orders by number, subcontractor or scope..."
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

      {/* Work Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-auto boq-table-scroll" style={{ maxHeight: "60vh" }}>
          <table className="w-full min-w-[1100px] text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-900 text-white font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">WO No. & Road</th>
                <th className="p-3">Subcontractor</th>
                <th className="p-3">Scope of Work</th>
                <th className="p-3 text-right">Awarded Qty</th>
                <th className="p-3 text-right">Executed Qty</th>
                <th className="p-3 text-right">Rate (₹)</th>
                <th className="p-3 text-right">Awarded (₹)</th>
                <th className="p-3 text-right">Paid (₹)</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-slate-400">Loading work orders...</td>
                </tr>
              ) : woList?.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-slate-400">
                    No work orders issued yet. Click &quot;Issue Work Order&quot; to award tasks.
                  </td>
                </tr>
              ) : (
                woList
                  ?.filter(
                    ({ wo, road, subcontractor }) =>
                      wo.workOrderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      wo.scope.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (subcontractor?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (road?.roadName || "").toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map(({ wo, road, subcontractor }) => {
                    const awarded = parseFloat(String(wo.awardedAmount || 0));
                    const paid = parseFloat(String(wo.paidAmount || 0));
                    const execQty = parseFloat(String(wo.executedQuantity || 0));
                    const awardQty = parseFloat(String(wo.awardedQuantity || 1));
                    const pct = Math.min(100, Math.round((execQty / awardQty) * 100));

                    return (
                      <tr key={wo.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono">
                          <span className="font-bold text-slate-900 block">{wo.workOrderNo}</span>
                          <span className="text-[10px] text-slate-500 font-sans block">
                            {road?.roadId} • {road?.roadName}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-800">
                          {subcontractor?.name}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {subcontractor?.workCategory}
                          </span>
                        </td>
                        <td className="p-3 max-w-[200px]">
                          <span className="text-slate-800 font-medium block truncate">{wo.scope}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {wo.startDate} to {wo.targetDate}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-slate-700 whitespace-nowrap">
                          {parseFloat(String(wo.awardedQuantity)).toLocaleString()} {wo.unit}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                          {execQty.toLocaleString()} {wo.unit} ({pct}%)
                        </td>
                        <td className="p-3 text-right font-mono text-slate-600">₹{parseFloat(String(wo.rate)).toLocaleString()}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          ₹{awarded.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-700 whitespace-nowrap">
                          ₹{paid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              wo.status === "Completed"
                                ? "bg-emerald-100 text-emerald-800"
                                : wo.status === "In Progress"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {wo.status}
                          </span>
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          {role === "admin" || role === "qs_billing_engineer" || role === "project_manager" ? (
                            <button
                              onClick={async () => {
                                const addPay = prompt("Enter additional payment amount (₹):", "50000");
                                if (addPay && !isNaN(parseFloat(addPay))) {
                                  const newPaid = (paid + parseFloat(addPay)).toFixed(2);
                                  await updateWoMutation.mutateAsync({
                                    id: wo.id,
                                    paidAmount: newPaid,
                                    status: "In Progress",
                                  });
                                  toast.success(`Payment of ₹${addPay} recorded! Total paid: ₹${newPaid}`);
                                  refetchWo();
                                }
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold text-[10px]"
                            >
                              Post Payment
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400">View</span>
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

      {/* Modal: New Subcontractor */}
      {isSubModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-500" /> Register Subcontractor
              </h2>
              <button onClick={() => setIsSubModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSub} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Subcontractor / Agency Name *</label>
                <input
                  type="text"
                  required
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  placeholder="e.g. M/s Maa Bhavani Earthmovers"
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Work Specialty / Trade *</label>
                <select
                  value={workCategory}
                  onChange={(e) => setWorkCategory(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-semibold"
                >
                  <option value="Earthwork & Embankment">Earthwork & Embankment</option>
                  <option value="GSB & WMM Laying">GSB & WMM Laying</option>
                  <option value="Bituminous Laying (Paver Gang)">Bituminous Laying (Paver Gang)</option>
                  <option value="Culvert & Concrete Structures">Culvert & Concrete Structures</option>
                  <option value="Drain, Kerb & Retaining Wall">Drain, Kerb & Retaining Wall</option>
                  <option value="Road Furniture & Signage">Road Furniture & Signage</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Contact Person</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Partner / Foreman"
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Mobile Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98..."
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">GSTIN / PAN</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="08AAAAA0000A1Z5"
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubMutation.isPending}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold shadow"
                >
                  Register Subcontractor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Work Order */}
      {isWoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-amber-500" /> Issue Piece-Rate Work Order
              </h2>
              <button onClick={() => setIsWoModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateWo} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Work Order No. *</label>
                  <input
                    type="text"
                    required
                    value={woNo}
                    onChange={(e) => setWoNo(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Subcontractor *</label>
                  <select
                    value={woSubId}
                    onChange={(e) => setWoSubId(parseInt(e.target.value))}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-semibold"
                  >
                    {subsList?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.workCategory})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Road Stretch *</label>
                <select
                  value={woRoadId}
                  onChange={(e) => setWoRoadId(parseInt(e.target.value))}
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
                <label className="font-bold text-slate-700">Scope of Work *</label>
                <input
                  type="text"
                  required
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Awarded Qty *</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={awardedQty}
                    onChange={(e) => setAwardedQty(e.target.value)}
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
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Rate (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Target Date</label>
                  <input
                    type="date"
                    required
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center text-xs">
                <span className="text-slate-600">Calculated Contract Value:</span>
                <span className="font-black text-slate-900 text-sm font-mono">
                  ₹{(parseFloat(awardedQty || "0") * parseFloat(rate || "0")).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsWoModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createWoMutation.isPending}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold shadow"
                >
                  Issue Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
