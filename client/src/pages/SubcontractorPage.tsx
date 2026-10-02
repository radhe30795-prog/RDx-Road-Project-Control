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
  UserCheck,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { useRole } from "../components/AppLayout";
import { useActiveProject } from "../components/ProjectContext";
import WorkOrderDocument from "../components/WorkOrderDocument";

export default function SubcontractorPage() {
  const { role } = useRole();
  const [selectedRoadId, setSelectedRoadId] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [isWoModalOpen, setIsWoModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [expandedWoId, setExpandedWoId] = useState<number | null>(null);

  // Edit / Payment / Progress modal state
  const [editingWo, setEditingWo] = useState<any | null>(null);
  const [payingWo, setPayingWo] = useState<any | null>(null);
  const [progressWo, setProgressWo] = useState<any | null>(null);
  const [editingSub, setEditingSub] = useState<any | null>(null);
  const [docWoId, setDocWoId] = useState<number | null>(null);
  const [ledgerSub, setLedgerSub] = useState<any | null>(null);
  const [ledgerRoadId, setLedgerRoadId] = useState<string>("All");

  // Work Order Edit form fields
  const [editScope, setEditScope] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editAwardedQty, setEditAwardedQty] = useState("");
  const [editRate, setEditRate] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editTargetDate, setEditTargetDate] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editRemarks, setEditRemarks] = useState("");

  // Payment form fields
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState("");
  const [payRemarks, setPayRemarks] = useState("");

  // Progress form field
  const [progExecQty, setProgExecQty] = useState("");

  // Subcontractor Edit form fields
  const [editSubName, setEditSubName] = useState("");
  const [editSubCategory, setEditSubCategory] = useState("");
  const [editSubContact, setEditSubContact] = useState("");
  const [editSubPhone, setEditSubPhone] = useState("");
  const [editSubGstin, setEditSubGstin] = useState("");
  const [editSubAddress, setEditSubAddress] = useState("");
  const [editSubStatus, setEditSubStatus] = useState("");

  const canEdit = ["admin", "project_manager", "qs_billing_engineer"].includes(role as string);

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

  // Subcontractor ledger (consolidated account per sub per site)
  const { data: ledgerData, isLoading: ledgerLoading, refetch: refetchLedger } = trpc.subcontractors.ledger.useQuery(
    {
      subcontractorId: ledgerSub?.id as number,
      projectId: activeProjectId,
      roadId: ledgerRoadId !== "All" ? parseInt(ledgerRoadId) : undefined,
    },
    { enabled: !!ledgerSub }
  );

  function openLedger(s: any) {
    setLedgerRoadId(selectedRoadId);
    setLedgerSub(s);
  }

  const createSubMutation = trpc.subcontractors.create.useMutation();
  const createWoMutation = trpc.subcontractors.createWorkOrder.useMutation();
  const updateWoMutation = trpc.subcontractors.updateWorkOrder.useMutation();
  const updateSubMutation = trpc.subcontractors.update.useMutation();
  const deleteWoMutation = trpc.subcontractors.deleteWorkOrder.useMutation();

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

  // --- Work Order Edit ---
  function openEditWo(wo: any) {
    setEditingWo(wo);
    setEditScope(wo.scope || "");
    setEditUnit(wo.unit || "");
    setEditAwardedQty(String(wo.awardedQuantity || "0"));
    setEditRate(String(wo.rate || "0"));
    setEditStartDate(wo.startDate || "");
    setEditTargetDate(wo.targetDate || "");
    setEditStatus(wo.status || "Issued");
    setEditRemarks(wo.remarks || "");
  }

  async function handleUpdateWo(e: React.FormEvent) {
    e.preventDefault();
    if (!editingWo) return;
    try {
      await updateWoMutation.mutateAsync({
        id: editingWo.id,
        scope: editScope.trim(),
        unit: editUnit.trim(),
        awardedQuantity: editAwardedQty,
        rate: editRate,
        startDate: editStartDate,
        targetDate: editTargetDate,
        status: editStatus as any,
        remarks: editRemarks.trim() || undefined,
      });
      toast.success(`Work Order ${editingWo.workOrderNo} updated!`);
      setEditingWo(null);
      refetchWo();
    } catch (err: any) {
      toast.error(err.message || "Failed to update work order");
    }
  }

  // --- Payment (adds to existing paidAmount) ---
  function openPayment(wo: any) {
    setPayingWo(wo);
    setPayAmount("");
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayRemarks("");
  }

  async function handlePostPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payingWo) return;
    const amt = parseFloat(payAmount || "0");
    if (amt <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }
    try {
      const currentPaid = parseFloat(String(payingWo.paidAmount || 0));
      const newPaid = (currentPaid + amt).toFixed(2);
      const note = `Payment ₹${amt.toLocaleString("en-IN")} on ${payDate}${payRemarks ? ": " + payRemarks : ""}`;
      const prevRemarks = payingWo.remarks ? payingWo.remarks + "\n" : "";
      await updateWoMutation.mutateAsync({
        id: payingWo.id,
        paidAmount: newPaid,
        status: "In Progress",
        remarks: prevRemarks + note,
      });
      toast.success(`₹${amt.toLocaleString("en-IN")} paid. Total paid: ₹${parseFloat(newPaid).toLocaleString("en-IN")}`);
      setPayingWo(null);
      refetchWo();
    } catch (err: any) {
      toast.error(err.message || "Failed to post payment");
    }
  }

  // --- Progress update ---
  function openProgress(wo: any) {
    setProgressWo(wo);
    setProgExecQty(String(wo.executedQuantity || "0"));
  }

  async function handleUpdateProgress(e: React.FormEvent) {
    e.preventDefault();
    if (!progressWo) return;
    try {
      const qty = parseFloat(progExecQty || "0");
      const awardQty = parseFloat(String(progressWo.awardedQuantity || 0));
      let status = progressWo.status;
      if (awardQty > 0 && qty >= awardQty) status = "Completed";
      else if (qty > 0) status = "In Progress";
      await updateWoMutation.mutateAsync({
        id: progressWo.id,
        executedQuantity: progExecQty,
        status,
      });
      toast.success(`Progress updated: ${qty.toLocaleString()} ${progressWo.unit}`);
      setProgressWo(null);
      refetchWo();
    } catch (err: any) {
      toast.error(err.message || "Failed to update progress");
    }
  }

  async function handleDeleteWo(wo: any) {
    if (!confirm(`Delete Work Order ${wo.workOrderNo}? This cannot be undone.`)) return;
    try {
      await deleteWoMutation.mutateAsync({ id: wo.id });
      toast.success("Work order deleted");
      refetchWo();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete work order");
    }
  }

  // --- Subcontractor Edit ---
  function openEditSub(s: any) {
    setEditingSub(s);
    setEditSubName(s.name || "");
    setEditSubCategory(s.workCategory || "");
    setEditSubContact(s.contactPerson || "");
    setEditSubPhone(s.phone || "");
    setEditSubGstin(s.gstin || "");
    setEditSubAddress(s.address || "");
    setEditSubStatus(s.status || "Active");
  }

  async function handleUpdateSub(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSub) return;
    try {
      await updateSubMutation.mutateAsync({
        id: editingSub.id,
        name: editSubName.trim(),
        workCategory: editSubCategory,
        contactPerson: editSubContact.trim() || undefined,
        phone: editSubPhone.trim() || undefined,
        gstin: editSubGstin.trim() || undefined,
        address: editSubAddress.trim() || undefined,
        status: editSubStatus as any,
      });
      toast.success(`Subcontractor ${editSubName} updated!`);
      setEditingSub(null);
      refetchSubs();
    } catch (err: any) {
      toast.error(err.message || "Failed to update subcontractor");
    }
  }

  // KPI summaries
  const stats = useMemo(() => {
    if (!woList?.length) return { totalWo: 0, totalAwarded: 0, totalPaid: 0, balancePayable: 0 };
    let awarded = 0;
    let paid = 0;
    woList.forEach((r: any) => {
      const wo = r.wo;
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

      {/* Registered Subcontractors */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-700">
            Registered Subcontractors ({subsList?.length || 0})
          </span>
          <span className="text-[11px] text-slate-500">Click Edit to update agency details</span>
        </div>
        <div className="overflow-auto boq-table-scroll" style={{ maxHeight: "30vh" }}>
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-800 text-white font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Code</th>
                <th className="p-3">Agency Name</th>
                <th className="p-3">Work Category</th>
                <th className="p-3">Contact Person</th>
                <th className="p-3">Phone</th>
                <th className="p-3">GSTIN</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!subsList?.length ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400">
                    No subcontractors registered yet.
                  </td>
                </tr>
              ) : (
                subsList.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono font-bold text-slate-900">{s.subcontractorCode}</td>
                    <td className="p-3 font-semibold text-slate-800">{s.name}</td>
                    <td className="p-3 text-slate-600">{s.workCategory}</td>
                    <td className="p-3 text-slate-600">{s.contactPerson || "—"}</td>
                    <td className="p-3 font-mono text-slate-600">{s.phone || "—"}</td>
                    <td className="p-3 font-mono text-slate-600">{s.gstin || "—"}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.status === "Active"
                            ? "bg-emerald-100 text-emerald-800"
                            : s.status === "On Hold"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {canEdit ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openLedger(s)}
                            title="Consolidated account (hisab) for this subcontractor"
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded font-bold text-[10px]"
                          >
                            📒 Ledger
                          </button>
                          <button
                            onClick={() => openEditSub(s)}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded font-bold text-[10px]"
                          >
                            ✏️ Edit
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">View</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
                          {canEdit ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEditWo(wo)}
                                title="Edit work order"
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded font-bold text-[10px]"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={() => openProgress(wo)}
                                title="Update executed quantity"
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded font-bold text-[10px]"
                              >
                                📊 Progress
                              </button>
                              <button
                                onClick={() => openPayment(wo)}
                                title="Post payment"
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-bold text-[10px]"
                              >
                                💰 Payment
                              </button>
                              <button
                                onClick={() => setDocWoId(wo.id)}
                                title="Hindi Work Order document"
                                className="px-2 py-1 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 rounded font-bold text-[10px]"
                              >
                                📄 WO
                              </button>
                              {role === "admin" && (
                                <button
                                  onClick={() => handleDeleteWo(wo)}
                                  title="Delete work order"
                                  className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded font-bold text-[10px]"
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
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

      {/* Modal: Edit Work Order */}
      {editingWo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">✏️ Edit Work Order</h2>
              <button onClick={() => setEditingWo(null)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>
            <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono font-bold text-slate-800">
              {editingWo.workOrderNo}
            </div>
            <form onSubmit={handleUpdateWo} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Scope of Work *</label>
                <input type="text" required value={editScope} onChange={(e) => setEditScope(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Awarded Qty *</label>
                  <input type="number" step="0.001" required value={editAwardedQty} onChange={(e) => setEditAwardedQty(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono" />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Unit *</label>
                  <input type="text" required value={editUnit} onChange={(e) => setEditUnit(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono" />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Rate (₹) *</label>
                  <input type="number" step="0.01" required value={editRate} onChange={(e) => setEditRate(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Start Date</label>
                  <input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono" />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Target Date</label>
                  <input type="date" value={editTargetDate} onChange={(e) => setEditTargetDate(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono" />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700">Status</label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-semibold">
                  {["Draft", "Issued", "In Progress", "Completed", "Closed", "On Hold"].map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700">Remarks</label>
                <textarea rows={2} value={editRemarks} onChange={(e) => setEditRemarks(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50" />
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center">
                <span className="text-slate-600">Revised Contract Value:</span>
                <span className="font-black text-slate-900 text-sm font-mono">
                  ₹{(parseFloat(editAwardedQty || "0") * parseFloat(editRate || "0")).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setEditingWo(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-semibold">Cancel</button>
                <button type="submit" disabled={updateWoMutation.isPending}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold shadow">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Post Payment */}
      {payingWo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">💰 Post Payment</h2>
              <button onClick={() => setPayingWo(null)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>
            <div className="text-xs bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-800">
              <strong className="font-mono">{payingWo.workOrderNo}</strong>
              <br />
              Already paid: <strong className="font-mono">₹{parseFloat(String(payingWo.paidAmount || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
            </div>
            <form onSubmit={handlePostPayment} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Payment Amount (₹) *</label>
                <input type="number" step="0.01" required value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  className="mt-1 w-full p-2.5 border border-emerald-200 rounded-lg bg-emerald-50 font-mono font-bold text-emerald-700" />
              </div>
              <div>
                <label className="font-bold text-slate-700">Payment Date *</label>
                <input type="date" required value={payDate} onChange={(e) => setPayDate(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono" />
              </div>
              <div>
                <label className="font-bold text-slate-700">Remarks</label>
                <textarea rows={2} value={payRemarks} onChange={(e) => setPayRemarks(e.target.value)}
                  placeholder="Cheque/UTR no., deductions..."
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50" />
              </div>
              {parseFloat(payAmount || "0") > 0 && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                  <span className="text-slate-600">New total paid:</span>
                  <span className="font-black text-emerald-700 font-mono">
                    ₹{(parseFloat(String(payingWo.paidAmount || 0)) + parseFloat(payAmount)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setPayingWo(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-semibold">Cancel</button>
                <button type="submit" disabled={updateWoMutation.isPending}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow">Post Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Update Progress */}
      {progressWo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">📊 Update Progress</h2>
              <button onClick={() => setProgressWo(null)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>
            <div className="text-xs bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-800">
              <strong className="font-mono">{progressWo.workOrderNo}</strong>
              <br />
              Awarded: <strong className="font-mono">{parseFloat(String(progressWo.awardedQuantity || 0)).toLocaleString()} {progressWo.unit}</strong>
            </div>
            <form onSubmit={handleUpdateProgress} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Executed Quantity ({progressWo.unit}) *</label>
                <input type="number" step="0.001" required value={progExecQty} onChange={(e) => setProgExecQty(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-blue-200 rounded-lg bg-blue-50 font-mono font-bold text-blue-700" />
                {parseFloat(String(progressWo.awardedQuantity || 0)) > 0 && (
                  <p className="mt-1 text-[11px] font-bold text-blue-700">
                    {Math.min(100, Math.round((parseFloat(progExecQty || "0") / parseFloat(String(progressWo.awardedQuantity))) * 100))}% complete
                    {parseFloat(progExecQty || "0") >= parseFloat(String(progressWo.awardedQuantity)) && " — auto-marked Completed"}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setProgressWo(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-semibold">Cancel</button>
                <button type="submit" disabled={updateWoMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow">Update Progress</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Subcontractor */}
      {editingSub && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">✏️ Edit Subcontractor</h2>
              <button onClick={() => setEditingSub(null)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>
            <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono font-bold text-slate-800">
              {editingSub.subcontractorCode}
            </div>
            <form onSubmit={handleUpdateSub} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Agency Name *</label>
                <input type="text" required value={editSubName} onChange={(e) => setEditSubName(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-semibold" />
              </div>
              <div>
                <label className="font-bold text-slate-700">Work Category *</label>
                <select value={editSubCategory} onChange={(e) => setEditSubCategory(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-semibold">
                  {["Earthwork & Embankment", "GSB & WMM Laying", "Bituminous Laying (Paver Gang)", "Culvert & Concrete Structures", "Drain, Kerb & Retaining Wall", "Road Furniture & Signage"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Contact Person</label>
                  <input type="text" value={editSubContact} onChange={(e) => setEditSubContact(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50" />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Mobile Phone</label>
                  <input type="text" value={editSubPhone} onChange={(e) => setEditSubPhone(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono" />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700">GSTIN / PAN</label>
                <input type="text" value={editSubGstin} onChange={(e) => setEditSubGstin(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono" />
              </div>
              <div>
                <label className="font-bold text-slate-700">Address</label>
                <textarea rows={2} value={editSubAddress} onChange={(e) => setEditSubAddress(e.target.value)}
                  placeholder="Office/site address..."
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50" />
              </div>
              <div>
                <label className="font-bold text-slate-700">Status</label>
                <select value={editSubStatus} onChange={(e) => setEditSubStatus(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-semibold">
                  {["Active", "On Hold", "Closed"].map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setEditingSub(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-semibold">Cancel</button>
                <button type="submit" disabled={updateSubMutation.isPending}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold shadow">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Hindi Work Order Document */}
      {docWoId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <WorkOrderDocument workOrderId={docWoId} onClose={() => { setDocWoId(null); refetchWo(); }} />
          </div>
        </div>
      )}

      {/* Modal: Subcontractor Ledger (consolidated hisab per site) */}
      {ledgerSub && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 bg-indigo-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">📒 Subcontractor Ledger</h2>
                <p className="text-[11px] text-indigo-200">
                  {ledgerSub.name} • {ledgerSub.subcontractorCode} • {ledgerSub.workCategory}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={ledgerRoadId}
                  onChange={(e) => setLedgerRoadId(e.target.value)}
                  className="px-2 py-1.5 rounded-lg text-xs font-semibold bg-indigo-800 text-white border border-indigo-700"
                >
                  <option value="All">All Roads (sites)</option>
                  {roads?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.roadId} - {r.roadName}
                    </option>
                  ))}
                </select>
                <button onClick={() => setLedgerSub(null)} className="text-indigo-200 hover:text-white text-sm font-bold px-2">
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {ledgerLoading ? (
                <p className="text-center text-slate-400 text-sm py-10">Loading ledger...</p>
              ) : !ledgerData ? (
                <p className="text-center text-slate-400 text-sm py-10">No data found.</p>
              ) : (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { label: "Total Awarded", value: ledgerData.totals.totalAwarded, bg: "bg-slate-50 border-slate-200", tx: "text-slate-800" },
                      { label: "Executed Value", value: ledgerData.totals.totalExecValue, bg: "bg-blue-50 border-blue-200", tx: "text-blue-800" },
                      { label: "Total Paid", value: ledgerData.totals.totalPaid, bg: "bg-emerald-50 border-emerald-200", tx: "text-emerald-800" },
                      { label: "Balance Payable", value: ledgerData.totals.balancePayable, bg: "bg-amber-50 border-amber-200", tx: "text-amber-800" },
                      { label: "Retention Held", value: ledgerData.totals.totalRetention, bg: "bg-violet-50 border-violet-200", tx: "text-violet-800" },
                    ].map((c) => (
                      <div key={c.label} className={`${c.bg} border rounded-xl p-3`}>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{c.label}</p>
                        <p className={`text-sm font-bold font-mono ${c.tx}`}>
                          ₹{c.value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {ledgerData.totals.woCount} work order(s)
                    {ledgerRoadId !== "All" ? " on selected site" : " across all sites"} • Executed value = executed qty × rate
                  </p>

                  {/* Work orders table */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
                      Work Orders ({ledgerData.workOrders.length})
                    </div>
                    <div className="overflow-auto boq-table-scroll" style={{ maxHeight: "30vh" }}>
                      <table className="w-full min-w-[760px] text-left text-xs">
                        <thead className="sticky top-0 z-10 bg-slate-800 text-white font-semibold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="p-2.5">WO No.</th>
                            <th className="p-2.5">Road / Site</th>
                            <th className="p-2.5">Scope</th>
                            <th className="p-2.5 text-right">Awarded ₹</th>
                            <th className="p-2.5 text-right">Executed ₹</th>
                            <th className="p-2.5 text-right">Paid ₹</th>
                            <th className="p-2.5 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {ledgerData.workOrders.length === 0 ? (
                            <tr><td colSpan={7} className="p-6 text-center text-slate-400">No work orders for this selection.</td></tr>
                          ) : (
                            ledgerData.workOrders.map((r: any) => {
                              const wo = r.wo;
                              const execVal = parseFloat(String(wo.executedQuantity || 0)) * parseFloat(String(wo.rate || 0));
                              return (
                                <tr key={wo.id} className="hover:bg-slate-50">
                                  <td className="p-2.5 font-mono font-bold text-slate-900">{wo.workOrderNo}</td>
                                  <td className="p-2.5 text-slate-600">{r.road ? `${r.road.roadId}` : "—"}</td>
                                  <td className="p-2.5 text-slate-700 max-w-[220px] truncate" title={wo.scope}>{wo.scope}</td>
                                  <td className="p-2.5 text-right font-mono">₹{parseFloat(String(wo.awardedAmount || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                  <td className="p-2.5 text-right font-mono text-blue-700">₹{execVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                  <td className="p-2.5 text-right font-mono text-emerald-700">₹{parseFloat(String(wo.paidAmount || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                  <td className="p-2.5 text-center">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{wo.status}</span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Payment history */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
                      Payment History ({ledgerData.payments.length})
                    </div>
                    <div className="overflow-auto boq-table-scroll" style={{ maxHeight: "24vh" }}>
                      <table className="w-full min-w-[600px] text-left text-xs">
                        <thead className="sticky top-0 z-10 bg-slate-800 text-white font-semibold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5">WO No.</th>
                            <th className="p-2.5 text-right">Amount ₹</th>
                            <th className="p-2.5">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {ledgerData.payments.length === 0 ? (
                            <tr><td colSpan={4} className="p-6 text-center text-slate-400">No payments recorded yet.</td></tr>
                          ) : (
                            ledgerData.payments.map((p: any, i: number) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="p-2.5 font-mono text-slate-700">{p.date}</td>
                                <td className="p-2.5 font-mono font-semibold text-slate-800">{p.woNo}</td>
                                <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                                  ₹{p.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-2.5 text-slate-600">{p.remarks || "—"}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
