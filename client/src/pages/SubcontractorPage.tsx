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

  // RA Bill modal state (per work order)
  const [billWo, setBillWo] = useState<any | null>(null); // row object {wo, road, subcontractor, items...}
  const [billView, setBillView] = useState<"list" | "new" | number>("list"); // number = selected bill id (detail)
  const [newBillNo, setNewBillNo] = useState("");
  const [newBillDate, setNewBillDate] = useState("");
  const [newPeriodFrom, setNewPeriodFrom] = useState("");
  const [newPeriodTo, setNewPeriodTo] = useState("");
  const [newRetentionPct, setNewRetentionPct] = useState("");
  const [newTdsPct, setNewTdsPct] = useState("");
  const [newOtherDed, setNewOtherDed] = useState("0.00");
  const [newOtherDedRemarks, setNewOtherDedRemarks] = useState("");
  const [newIsFinal, setNewIsFinal] = useState(false);
  const [newBillRemarks, setNewBillRemarks] = useState("");
  // Bill item form
  const [biDesc, setBiDesc] = useState("");
  const [biUnit, setBiUnit] = useState("Nos");
  const [biQty, setBiQty] = useState("");
  const [biRate, setBiRate] = useState("");
  // Bill header edit (retention/tds/other/final)
  const [editBillId, setEditBillId] = useState<number | null>(null);
  const [editRetentionPct, setEditRetentionPct] = useState("");
  const [editTdsPct, setEditTdsPct] = useState("");
  const [editOtherDed, setEditOtherDed] = useState("");
  const [editOtherDedRemarks, setEditOtherDedRemarks] = useState("");
  const [editIsFinal, setEditIsFinal] = useState(false);

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

  // ---- Subcontractor RA Bills ----
  const { data: billsList, refetch: refetchBills } = trpc.subcontractors.billsList.useQuery(
    { workOrderId: billWo?.wo?.id as number, projectId: activeProjectId },
    { enabled: !!billWo }
  );
  const createBillMut = trpc.subcontractors.createBill.useMutation();
  const updateBillMut = trpc.subcontractors.updateBill.useMutation();
  const deleteBillMut = trpc.subcontractors.deleteBill.useMutation();
  const markBillPaidMut = trpc.subcontractors.markBillPaid.useMutation();
  const addBillItemMut = trpc.subcontractors.addBillItem.useMutation();
  const deleteBillItemMut = trpc.subcontractors.deleteBillItem.useMutation();

  const selectedBill = billView !== "list" && billView !== "new"
    ? (billsList || []).find((b: any) => b.bill.id === billView) : null;

  function openBills(row: any) {
    setBillWo(row);
    setBillView("list");
    setEditBillId(null);
  }

  function openNewBill() {
    const n = (billsList || []).length + 1;
    setNewBillNo(`RA-${String(n).padStart(2, "0")}`);
    setNewBillDate(new Date().toISOString().slice(0, 10));
    setNewPeriodFrom("");
    setNewPeriodTo("");
    setNewRetentionPct("");
    setNewTdsPct("");
    setNewOtherDed("0.00");
    setNewOtherDedRemarks("");
    setNewIsFinal(false);
    setNewBillRemarks("");
    setBillView("new");
  }

  async function handleCreateBill(e: React.FormEvent) {
    e.preventDefault();
    if (!billWo) return;
    const res: any = await createBillMut.mutateAsync({
      projectId: activeProjectId as number,
      workOrderId: billWo.wo.id,
      subcontractorId: billWo.wo.subcontractorId,
      billNo: newBillNo.trim(),
      billDate: newBillDate,
      periodFrom: newPeriodFrom || undefined,
      periodTo: newPeriodTo || undefined,
      retentionPct: newIsFinal ? "0.00" : (newRetentionPct.trim() || "0.00"),
      tdsPct: (newTdsPct.trim() || "0.00"),
      otherDeductions: newOtherDed || "0.00",
      otherDeductionRemarks: newOtherDedRemarks || undefined,
      isFinalBill: newIsFinal,
      remarks: newBillRemarks || undefined,
    });
    const newId = ((res as any)?.[0]?.insertId ?? (res as any)?.insertId) as number | undefined;
    toast.success(`Bill ${newBillNo} created! Add items now.`);
    await refetchBills();
    // Copy WO BOQ items automatically if the WO has any
    const woItems: any[] = billWo.items || [];
    if (newId && woItems.length > 0) {
      let idx = 0;
      for (const it of woItems) {
        await addBillItemMut.mutateAsync({
          billId: newId,
          description: String(it.description || ""),
          unit: String(it.unit || "Nos"),
          qty: String(it.quantity ?? "1.000"),
          rate: String(it.rate ?? "0.00"),
          sortOrder: idx++,
        });
      }
      toast.success(`${woItems.length} WO item(s) copied to bill.`);
      await refetchBills();
    }
    if (newId) setBillView(newId);
    else setBillView("list");
  }

  async function handleAddBillItem(e: React.FormEvent) {
    e.preventDefault();
    if (billView === "list" || billView === "new" || !selectedBill) return;
    await addBillItemMut.mutateAsync({
      billId: selectedBill.bill.id,
      description: biDesc.trim(),
      unit: biUnit,
      qty: biQty || "0.000",
      rate: biRate || "0.00",
      sortOrder: (selectedBill.items || []).length,
    });
    setBiDesc(""); setBiUnit("Nos"); setBiQty(""); setBiRate("");
    toast.success("Item added.");
    refetchBills();
  }

  function openEditBillDeductions(bill: any) {
    setEditBillId(bill.id);
    setEditRetentionPct(String(bill.retentionPct ?? "0.00"));
    setEditTdsPct(String(bill.tdsPct ?? "0.00"));
    setEditOtherDed(String(bill.otherDeductions ?? "0.00"));
    setEditOtherDedRemarks(String(bill.otherDeductionRemarks || ""));
    setEditIsFinal(!!bill.isFinalBill);
  }

  async function handleSaveBillDeductions(e: React.FormEvent) {
    e.preventDefault();
    if (!editBillId) return;
    await updateBillMut.mutateAsync({
      id: editBillId,
      retentionPct: editIsFinal ? "0.00" : (editRetentionPct.trim() || "0.00"),
      tdsPct: (editTdsPct.trim() || "0.00"),
      otherDeductions: editOtherDed || "0.00",
      otherDeductionRemarks: editOtherDedRemarks || undefined,
      isFinalBill: editIsFinal,
    });
    setEditBillId(null);
    toast.success("Bill deductions updated.");
    refetchBills();
  }

  async function handleBillStatus(billId: number, status: "Submitted" | "Approved") {
    await updateBillMut.mutateAsync({ id: billId, status });
    toast.success(`Bill marked ${status}.`);
    refetchBills();
  }

  async function handleMarkBillPaid(bill: any) {
    if (!confirm(`Mark bill ${bill.billNo} as PAID? Net ₹${parseFloat(String(bill.netPayable || 0)).toLocaleString("en-IN")} will be added to WO paid amount${bill.isFinalBill ? " and held retention will be released (hold → 0)" : ""}.`)) return;
    const res: any = await markBillPaidMut.mutateAsync({ id: bill.id });
    toast.success(`Bill paid! ${res?.retentionReleased ? `Retention ₹${parseFloat(String(res.retentionReleased)).toLocaleString("en-IN")} released.` : ""}`);
    refetchBills(); refetchWo();
    if (ledgerSub) refetchLedger();
  }

  async function handleDeleteBill(bill: any) {
    if (!confirm(`Delete bill ${bill.billNo}? This cannot be undone.`)) return;
    try {
      await deleteBillMut.mutateAsync({ id: bill.id });
      toast.success("Bill deleted.");
      setBillView("list");
      refetchBills();
    } catch (err: any) {
      toast.error(err?.message || "Delete failed");
    }
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
                  .map(({ wo, road, subcontractor, items, itemsTotal, itemsCount }) => {
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
                              <button
                                onClick={() => openBills({ wo, road, subcontractor, items, itemsTotal, itemsCount })}
                                title="RA Bills with retention"
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded font-bold text-[10px]"
                              >
                                🧾 RA Bill
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

                  {/* RA Bills */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
                      🧾 RA Bills ({(ledgerData.bills || []).length})
                    </div>
                    <div className="overflow-auto boq-table-scroll" style={{ maxHeight: "24vh" }}>
                      <table className="w-full min-w-[720px] text-left text-xs">
                        <thead className="sticky top-0 z-10 bg-slate-800 text-white font-semibold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="p-2.5">Bill No.</th>
                            <th className="p-2.5">WO No.</th>
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5 text-right">Gross ₹</th>
                            <th className="p-2.5 text-right">Retention ₹</th>
                            <th className="p-2.5 text-right">Net ₹</th>
                            <th className="p-2.5 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(ledgerData.bills || []).length === 0 ? (
                            <tr><td colSpan={7} className="p-6 text-center text-slate-400">No RA bills yet.</td></tr>
                          ) : (
                            (ledgerData.bills || []).map((b: any) => (
                              <tr key={b.bill.id} className="hover:bg-slate-50">
                                <td className="p-2.5 font-mono font-bold text-slate-900">
                                  {b.bill.billNo}
                                  {b.bill.isFinalBill && (
                                    <span className="ml-1 px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 text-[9px] font-bold">FINAL</span>
                                  )}
                                </td>
                                <td className="p-2.5 font-mono text-slate-600">{b.wo?.workOrderNo || "—"}</td>
                                <td className="p-2.5 font-mono text-slate-600">{b.bill.billDate}</td>
                                <td className="p-2.5 text-right font-mono">₹{parseFloat(String(b.bill.grossAmount || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                <td className="p-2.5 text-right font-mono text-violet-700">₹{parseFloat(String(b.bill.retentionAmount || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                <td className="p-2.5 text-right font-mono font-bold text-emerald-700">₹{parseFloat(String(b.bill.netPayable || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                <td className="p-2.5 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    b.bill.status === "Paid" ? "bg-emerald-100 text-emerald-800" :
                                    b.bill.status === "Approved" ? "bg-blue-100 text-blue-800" :
                                    b.bill.status === "Submitted" ? "bg-amber-100 text-amber-800" :
                                    "bg-slate-100 text-slate-600"
                                  }`}>{b.bill.status}</span>
                                </td>
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
      {/* Modal: RA Bills per Work Order (with retention/security deduction) */}
      {billWo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-100 my-8 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-4 bg-indigo-900 text-white rounded-t-2xl shrink-0">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">🧾 RA Bills — {billWo.wo.workOrderNo}</h2>
                <p className="text-[11px] text-indigo-200">{billWo.subcontractor?.name} • {billWo.road?.roadId} {billWo.road?.roadName}</p>
              </div>
              <div className="flex items-center gap-2">
                {billView !== "list" && (
                  <button onClick={() => { setBillView("list"); setEditBillId(null); }} className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 rounded-lg text-xs font-bold">← Bills</button>
                )}
                <button onClick={() => { setBillWo(null); setBillView("list"); setEditBillId(null); }} className="text-indigo-200 hover:text-white text-sm font-bold px-2">✕</button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto">
              {/* ===== LIST ===== */}
              {billView === "list" && (
                <>
                  {canEdit && (
                    <button onClick={openNewBill} className="mb-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow">+ New RA Bill</button>
                  )}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="overflow-auto boq-table-scroll" style={{ maxHeight: "56vh" }}>
                      <table className="w-full min-w-[760px] text-left text-xs">
                        <thead className="sticky top-0 z-10 bg-slate-800 text-white font-semibold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="p-2.5">Bill No.</th>
                            <th className="p-2.5">Date / Period</th>
                            <th className="p-2.5 text-right">Gross ₹</th>
                            <th className="p-2.5 text-right">Retention ₹</th>
                            <th className="p-2.5 text-right">TDS ₹</th>
                            <th className="p-2.5 text-right">Net ₹</th>
                            <th className="p-2.5 text-center">Status</th>
                            <th className="p-2.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {!(billsList || []).length ? (
                            <tr><td colSpan={8} className="p-6 text-center text-slate-400">No bills yet — create the first RA bill.</td></tr>
                          ) : (billsList || []).map((b: any) => (
                            <tr key={b.bill.id} className="hover:bg-slate-50">
                              <td className="p-2.5 font-mono font-bold text-slate-900">
                                {b.bill.billNo}
                                {b.bill.isFinalBill && <span className="ml-1 px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 text-[9px] font-bold">FINAL</span>}
                              </td>
                              <td className="p-2.5 font-mono text-slate-600 text-[11px]">{b.bill.billDate}{b.bill.periodFrom ? <span className="block text-slate-400">{b.bill.periodFrom} → {b.bill.periodTo}</span> : null}</td>
                              <td className="p-2.5 text-right font-mono">₹{parseFloat(String(b.bill.grossAmount || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-right font-mono text-violet-700">₹{parseFloat(String(b.bill.retentionAmount || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-right font-mono text-slate-600">₹{parseFloat(String(b.bill.tdsAmount || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-right font-mono font-bold text-emerald-700">₹{parseFloat(String(b.bill.netPayable || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                              <td className="p-2.5 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  b.bill.status === "Paid" ? "bg-emerald-100 text-emerald-800" :
                                  b.bill.status === "Approved" ? "bg-blue-100 text-blue-800" :
                                  b.bill.status === "Submitted" ? "bg-amber-100 text-amber-800" :
                                  "bg-slate-100 text-slate-600"
                                }`}>{b.bill.status}</span>
                              </td>
                              <td className="p-2.5 text-right whitespace-nowrap">
                                <button onClick={() => { setBillView(b.bill.id); setEditBillId(null); }} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded font-bold text-[10px]">Open</button>
                                {role === "admin" && b.bill.status !== "Paid" && (
                                  <button onClick={() => handleDeleteBill(b.bill)} className="ml-1 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded font-bold text-[10px]">🗑️</button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* ===== NEW BILL ===== */}
              {billView === "new" && (
                <form onSubmit={handleCreateBill} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="font-bold text-slate-700">Bill No. *</label>
                      <input value={newBillNo} onChange={(e) => setNewBillNo(e.target.value)} required className="mt-1 w-full p-2 border border-slate-200 rounded-lg font-mono font-bold" />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700">Bill Date *</label>
                      <input type="date" value={newBillDate} onChange={(e) => setNewBillDate(e.target.value)} required className="mt-1 w-full p-2 border border-slate-200 rounded-lg" />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700">Period From</label>
                      <input type="date" value={newPeriodFrom} onChange={(e) => setNewPeriodFrom(e.target.value)} className="mt-1 w-full p-2 border border-slate-200 rounded-lg" />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700">Period To</label>
                      <input type="date" value={newPeriodTo} onChange={(e) => setNewPeriodTo(e.target.value)} className="mt-1 w-full p-2 border border-slate-200 rounded-lg" />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700">Retention % *</label>
                      <input type="number" step="0.01" value={newRetentionPct} onChange={(e) => setNewRetentionPct(e.target.value)} placeholder="e.g. 15" disabled={newIsFinal} className="mt-1 w-full p-2 border border-violet-200 rounded-lg bg-violet-50 font-mono font-bold text-violet-800 disabled:opacity-50" />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700">TDS %</label>
                      <input type="number" step="0.01" value={newTdsPct} onChange={(e) => setNewTdsPct(e.target.value)} placeholder="e.g. 2" className="mt-1 w-full p-2 border border-slate-200 rounded-lg font-mono" />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700">Other Deductions ₹</label>
                      <input type="number" step="0.01" value={newOtherDed} onChange={(e) => setNewOtherDed(e.target.value)} className="mt-1 w-full p-2 border border-slate-200 rounded-lg font-mono" />
                    </div>
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2 font-bold text-violet-800 cursor-pointer">
                        <input type="checkbox" checked={newIsFinal} onChange={(e) => setNewIsFinal(e.target.checked)} className="w-4 h-4 accent-violet-600" />
                        Final Bill (retention → 0)
                      </label>
                    </div>
                  </div>
                  {newIsFinal && (
                    <p className="text-[11px] bg-violet-50 border border-violet-200 text-violet-800 rounded-lg p-2 font-semibold">
                      Final bill: retention deduction will be 0 and previously held retention will be released (hold → 0) when marked Paid.
                    </p>
                  )}
                  <div>
                    <label className="font-bold text-slate-700">Other Deduction Remarks</label>
                    <input value={newOtherDedRemarks} onChange={(e) => setNewOtherDedRemarks(e.target.value)} placeholder="e.g. material issued recovery" className="mt-1 w-full p-2 border border-slate-200 rounded-lg" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700">Remarks</label>
                    <input value={newBillRemarks} onChange={(e) => setNewBillRemarks(e.target.value)} className="mt-1 w-full p-2 border border-slate-200 rounded-lg" />
                  </div>
                  {(billWo.items || []).length > 0 && (
                    <p className="text-[11px] text-slate-500">📋 {billWo.items.length} WO BOQ item(s) will be auto-copied into this bill. You can edit them after creation.</p>
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setBillView("list")} className="px-4 py-2 border border-slate-200 rounded-lg font-bold text-slate-600">Cancel</button>
                    <button type="submit" disabled={createBillMut.isPending} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow disabled:opacity-50">
                      {createBillMut.isPending ? "Creating..." : "Create Bill"}
                    </button>
                  </div>
                </form>
              )}

              {/* ===== BILL DETAIL ===== */}
              {selectedBill && (
                <BillDetail
                  billRow={selectedBill}
                  canEdit={canEdit}
                  isAdmin={role === "admin"}
                  biDesc={biDesc} setBiDesc={setBiDesc}
                  biUnit={biUnit} setBiUnit={setBiUnit}
                  biQty={biQty} setBiQty={setBiQty}
                  biRate={biRate} setBiRate={setBiRate}
                  onAddItem={handleAddBillItem}
                  addingItem={addBillItemMut.isPending}
                  onDeleteItem={async (id: number) => { await deleteBillItemMut.mutateAsync({ id }); toast.success("Item removed."); refetchBills(); }}
                  editBillId={editBillId}
                  onOpenEditDeductions={() => openEditBillDeductions(selectedBill.bill)}
                  onCloseEditDeductions={() => setEditBillId(null)}
                  editRetentionPct={editRetentionPct} setEditRetentionPct={setEditRetentionPct}
                  editTdsPct={editTdsPct} setEditTdsPct={setEditTdsPct}
                  editOtherDed={editOtherDed} setEditOtherDed={setEditOtherDed}
                  editOtherDedRemarks={editOtherDedRemarks} setEditOtherDedRemarks={setEditOtherDedRemarks}
                  editIsFinal={editIsFinal} setEditIsFinal={setEditIsFinal}
                  onSaveDeductions={handleSaveBillDeductions}
                  savingDeductions={updateBillMut.isPending}
                  onStatus={(s: "Submitted" | "Approved") => handleBillStatus(selectedBill.bill.id, s)}
                  onMarkPaid={() => handleMarkBillPaid(selectedBill.bill)}
                  markingPaid={markBillPaidMut.isPending}
                  onDelete={() => handleDeleteBill(selectedBill.bill)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Bill detail sub-component: items + deduction breakdown + status workflow */
function BillDetail(props: any) {
  const { billRow, canEdit, isAdmin } = props;
  const bill = billRow.bill;
  const items = billRow.items || [];
  const gross = parseFloat(String(bill.grossAmount || 0));
  const retention = parseFloat(String(bill.retentionAmount || 0));
  const tds = parseFloat(String(bill.tdsAmount || 0));
  const other = parseFloat(String(bill.otherDeductions || 0));
  const net = parseFloat(String(bill.netPayable || 0));
  const inr = (v: number) => `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  return (
    <div className="space-y-4 text-xs">
      <div className="flex flex-wrap items-center gap-2 justify-between bg-slate-50 border border-slate-200 rounded-xl p-3">
        <div>
          <span className="font-mono font-bold text-slate-900 text-sm">{bill.billNo}</span>
          {bill.isFinalBill && <span className="ml-2 px-2 py-0.5 rounded bg-violet-100 text-violet-800 text-[10px] font-bold">FINAL BILL</span>}
          <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
            bill.status === "Paid" ? "bg-emerald-100 text-emerald-800" :
            bill.status === "Approved" ? "bg-blue-100 text-blue-800" :
            bill.status === "Submitted" ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-700"
          }`}>{bill.status}</span>
          <p className="text-[11px] text-slate-500 mt-1 font-mono">{bill.billDate}{bill.periodFrom ? ` • ${bill.periodFrom} → ${bill.periodTo}` : ""}</p>
        </div>
        {canEdit && bill.status !== "Paid" && (
          <div className="flex flex-wrap gap-1.5">
            {bill.status === "Draft" && (
              <button onClick={() => props.onStatus("Submitted")} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold">Submit →</button>
            )}
            {bill.status === "Submitted" && (
              <button onClick={() => props.onStatus("Approved")} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold">Approve ✓</button>
            )}
            {(bill.status === "Approved" || bill.status === "Submitted" || bill.status === "Draft") && (
              <button onClick={props.onMarkPaid} disabled={props.markingPaid} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold disabled:opacity-50">
                {props.markingPaid ? "Paying..." : "💰 Mark Paid"}
              </button>
            )}
            {isAdmin && (
              <button onClick={props.onDelete} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg font-bold">🗑️</button>
            )}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">Bill Items ({items.length})</div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-600 uppercase text-[10px]">
            <tr>
              <th className="p-2 w-10">#</th>
              <th className="p-2">Description</th>
              <th className="p-2 w-20">Unit</th>
              <th className="p-2 w-24 text-right">Qty</th>
              <th className="p-2 w-28 text-right">Rate ₹</th>
              <th className="p-2 w-32 text-right">Amount ₹</th>
              {canEdit && bill.status !== "Paid" && <th className="p-2 w-14"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr><td colSpan={7} className="p-4 text-center text-slate-400">No items — add below.</td></tr>
            ) : items.map((it: any, i: number) => (
              <tr key={it.id} className="hover:bg-slate-50">
                <td className="p-2 font-bold text-slate-500">{i + 1}</td>
                <td className="p-2 font-medium text-slate-800">{it.description}</td>
                <td className="p-2 text-slate-500">{it.unit}</td>
                <td className="p-2 text-right font-mono">{parseFloat(String(it.qty || 0)).toLocaleString("en-IN")}</td>
                <td className="p-2 text-right font-mono">{inr(parseFloat(String(it.rate || 0)))}</td>
                <td className="p-2 text-right font-mono font-bold">{inr(parseFloat(String(it.amount || 0)))}</td>
                {canEdit && bill.status !== "Paid" && (
                  <td className="p-2 text-right">
                    <button onClick={() => props.onDeleteItem(it.id)} className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded font-bold">✕</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {canEdit && bill.status !== "Paid" && (
          <form onSubmit={props.onAddItem} className="grid grid-cols-12 gap-2 p-3 bg-amber-50/60 border-t border-slate-200">
            <input value={props.biDesc} onChange={(e) => props.setBiDesc(e.target.value)} placeholder="Description *" required className="col-span-5 p-2 border border-slate-200 rounded-lg" />
            <input value={props.biUnit} onChange={(e) => props.setBiUnit(e.target.value)} placeholder="Unit" className="col-span-2 p-2 border border-slate-200 rounded-lg" />
            <input value={props.biQty} onChange={(e) => props.setBiQty(e.target.value)} placeholder="Qty" type="number" step="0.001" className="col-span-2 p-2 border border-slate-200 rounded-lg font-mono" />
            <input value={props.biRate} onChange={(e) => props.setBiRate(e.target.value)} placeholder="Rate ₹" type="number" step="0.01" className="col-span-2 p-2 border border-slate-200 rounded-lg font-mono" />
            <button disabled={props.addingItem} className="col-span-1 px-2 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold disabled:opacity-50">+</button>
          </form>
        )}
      </div>

      {/* Deduction breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
          <span>Deduction Breakup</span>
          {canEdit && bill.status !== "Paid" && props.editBillId !== bill.id && (
            <button onClick={props.onOpenEditDeductions} className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded font-bold text-[10px]">✏️ Edit %</button>
          )}
        </div>
        {props.editBillId === bill.id ? (
          <form onSubmit={props.onSaveDeductions} className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700">Retention %</label>
              <input type="number" step="0.01" value={props.editRetentionPct} onChange={(e) => props.setEditRetentionPct(e.target.value)} placeholder="e.g. 15" disabled={props.editIsFinal} className="mt-1 w-full p-2 border border-violet-200 rounded-lg bg-violet-50 font-mono font-bold text-violet-800 disabled:opacity-50" />
            </div>
            <div>
              <label className="font-bold text-slate-700">TDS %</label>
              <input type="number" step="0.01" value={props.editTdsPct} onChange={(e) => props.setEditTdsPct(e.target.value)} placeholder="e.g. 2" className="mt-1 w-full p-2 border border-slate-200 rounded-lg font-mono" />
            </div>
            <div>
              <label className="font-bold text-slate-700">Other ₹</label>
              <input type="number" step="0.01" value={props.editOtherDed} onChange={(e) => props.setEditOtherDed(e.target.value)} className="mt-1 w-full p-2 border border-slate-200 rounded-lg font-mono" />
            </div>
            <div className="col-span-2">
              <label className="font-bold text-slate-700">Other Remarks</label>
              <input value={props.editOtherDedRemarks} onChange={(e) => props.setEditOtherDedRemarks(e.target.value)} className="mt-1 w-full p-2 border border-slate-200 rounded-lg" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 font-bold text-violet-800 cursor-pointer">
                <input type="checkbox" checked={props.editIsFinal} onChange={(e) => props.setEditIsFinal(e.target.checked)} className="w-4 h-4 accent-violet-600" />
                Final Bill (retention → 0)
              </label>
            </div>
            <div className="col-span-2 sm:col-span-3 flex justify-end gap-2">
              <button type="button" onClick={props.onCloseEditDeductions} className="px-4 py-2 border border-slate-200 rounded-lg font-bold text-slate-600">Cancel</button>
              <button type="submit" disabled={props.savingDeductions} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold disabled:opacity-50">Save</button>
            </div>
          </form>
        ) : (
          <div className="p-3 space-y-1.5 font-mono">
            <div className="flex justify-between"><span className="text-slate-600">Gross Amount</span><span className="font-bold">{inr(gross)}</span></div>
            <div className="flex justify-between"><span className="text-violet-700">(-) Retention {bill.isFinalBill ? "(FINAL → 0)" : `(${parseFloat(String(bill.retentionPct || 0))}%)`}</span><span className="font-bold text-violet-700">{inr(retention)}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">(-) TDS ({parseFloat(String(bill.tdsPct || 0))}%)</span><span>{inr(tds)}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">(-) Other {bill.otherDeductionRemarks ? <span className="text-[10px] text-slate-400">({bill.otherDeductionRemarks})</span> : null}</span><span>{inr(other)}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-sm"><span className="font-bold text-slate-800">= Net Payable</span><span className="font-bold text-emerald-700">{inr(net)}</span></div>
            {bill.isFinalBill && <p className="text-[11px] text-violet-700 font-sans font-semibold pt-1">Final bill — retention released, hold → 0 on payment.</p>}
          </div>
        )}
      </div>
      {bill.remarks && <p className="text-[11px] text-slate-500"><strong>Remarks:</strong> {bill.remarks}</p>}
    </div>
  );
}
