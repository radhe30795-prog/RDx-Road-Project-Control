import React, { useState } from "react";
import { trpc } from "../lib/trpc";
import {
  Receipt,
  Plus,
  CheckCircle2,
  Clock,
  ArrowRight,
  DollarSign,
  FileCheck,
  Building,
  Filter,
  Search,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  Sparkles
  ,Calendar
} from "lucide-react";
import { toast } from "sonner";
import { useRole } from "../components/AppLayout";
import DateDprDetailModal from "../components/DateDprDetailModal";
import { downloadRaBillExcel } from "../lib/raBillExcel";

const WORKFLOW_STAGES = [
  "Measurement",
  "Quantity Calculation",
  "Abstract",
  "Bill Prepared",
  "Submitted",
  "Under Verification",
  "Passed",
  "Payment Received"
] as const;

export default function BillingPage() {
  const { role } = useRole();
  const [selectedRoadId, setSelectedRoadId] = useState<string>("All Roads");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAutoGenerateOpen, setIsAutoGenerateOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportBillNo, setExportBillNo] = useState("3rd. RA Bill");
  const [exportPeriodFrom, setExportPeriodFrom] = useState("2026-09-01");
  const [exportPeriodTo, setExportPeriodTo] = useState(new Date().toISOString().split("T")[0]);
  const [exportRoadIds, setExportRoadIds] = useState<number[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [isDprAuditOpen, setIsDprAuditOpen] = useState(false);
  const [auditDate, setAuditDate] = useState(new Date().toISOString().split("T")[0]);

  // Form states
  const [billId, setBillId] = useState("");
  const [roadId, setRoadId] = useState<number>(1);
  const [billType, setBillType] = useState("RA Bill 05");
  const [measurementStatus, setMeasurementStatus] = useState<any>("Completed");
  const [quantityCalculationStatus, setQuantityCalculationStatus] = useState<any>("Completed");
  const [abstractStatus, setAbstractStatus] = useState<any>("Completed");
  const [billPrepared, setBillPrepared] = useState<any>("Yes");
  const [submissionDate, setSubmissionDate] = useState(new Date().toISOString().split("T")[0]);
  const [verificationStatus, setVerificationStatus] = useState<any>("Submitted");
  const [passedAmount, setPassedAmount] = useState("15000000.00");
  const [paymentStatus, setPaymentStatus] = useState<any>("Unpaid");
  const [remarks, setRemarks] = useState("Joint inspection with Executive Engineer scheduled.");

  // Auto Generate RA Bill states
  const [autoRoadId, setAutoRoadId] = useState<number>(1);
  const [autoBillNo, setAutoBillNo] = useState("");
  const [autoPeriodFrom, setAutoPeriodFrom] = useState("2026-09-01");
  const [autoPeriodTo, setAutoPeriodTo] = useState(new Date().toISOString().split("T")[0]);
  const [autoGst, setAutoGst] = useState("18");
  const [autoRetention, setAutoRetention] = useState("5");

  const { data: bills, isLoading, refetch } = trpc.billing.list.useQuery({
    roadId: selectedRoadId !== "All Roads" ? parseInt(selectedRoadId) : undefined,
  });

  const { data: roads } = trpc.roads.list.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();
  const activeProjectId = projects?.[0]?.id || 1;

  // Lazy query for RA Bill Excel export data (fetched only when user clicks export)
  const exportQuery = trpc.billing.getBillExportData.useQuery(
    {
      projectId: activeProjectId,
      roadIds: exportRoadIds.length > 0 ? exportRoadIds : undefined,
      periodFrom: exportPeriodFrom,
      periodTo: exportPeriodTo,
    },
    { enabled: false }
  );

  const createBill = trpc.billing.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsAddOpen(false);
      toast.success("Bill record created");
    },
  });

  const generateRaBillMutation = trpc.billing.generateFromBoq.useMutation({
    onSuccess: (res) => {
      refetch();
      setIsAutoGenerateOpen(false);
      toast.success(`RA Bill generated! Net Payable: ₹${res.netPayable.toLocaleString()} across ${res.lineCount} executed BOQ lines.`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to generate RA Bill");
    }
  });

  const updateBill = trpc.billing.update.useMutation({
    onSuccess: () => {
      refetch();
      setIsEditOpen(false);
      toast.success("Bill workflow status updated");
    },
  });

  const totalPassed = (bills || []).reduce(
    (acc, b) => acc + parseFloat(String(b.bill.passedAmount || 0)),
    0
  );

  const totalNet = (bills || []).reduce(
    (acc, b) => acc + parseFloat(String(b.bill.netPayable || b.bill.passedAmount || 0)),
    0
  );

  const handleAutoGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const autoId = autoBillNo.trim() || `RA-${String((bills?.length || 0) + 1).padStart(2, "0")}`;
    await generateRaBillMutation.mutateAsync({
      billId: autoId,
      projectId: activeProjectId,
      roadId: autoRoadId,
      billType: `Running Account Bill ${autoId}`,
      periodFrom: autoPeriodFrom,
      periodTo: autoPeriodTo,
      gstPercent: parseFloat(autoGst || "18"),
      retentionPercent: parseFloat(autoRetention || "5"),
    });
  };

  const handleExportExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsExporting(true);
    try {
      const result = await exportQuery.refetch();
      const billData = result.data;
      if (!billData || billData.length === 0) {
        toast.error("No approved measurements found for the selected period/roads");
        setIsExporting(false);
        return;
      }
      const project = projects?.[0];
      downloadRaBillExcel(billData as any, {
        billNo: exportBillNo.trim() || "RA Bill",
        periodFrom: exportPeriodFrom,
        periodTo: exportPeriodTo,
        projectName: project?.projectName || "PMGSY-IV Batch-I (CG 16-201)",
        clientName: (project as any)?.clientName || "PMGSY Ambikapur",
        contractorName: (project as any)?.contractorName || "Shri Sai Associates, Raigarh",
      });
      setIsExportOpen(false);
      toast.success(`Excel downloaded: ${billData.length} road sheets + Abstract`);
    } catch (err: any) {
      toast.error(err.message || "Export failed");
    }
    setIsExporting(false);
  };

  const toggleExportRoad = (id: number) => {
    setExportRoadIds(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Billing & Quantity Surveying (QS) Control
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded bg-blue-100 text-blue-900 border border-blue-300">
              8-Stage Verification Pipeline
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Running Account (RA) bills generated directly from executed BOQ quantities with GST and retention deductions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDprAuditOpen(true)}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
          >
            <Calendar className="w-4 h-4 text-slate-950" />
            <span>Inspect DPR & Bill Qty by Date</span>
          </button>
          <button
            onClick={() => setIsExportOpen(true)}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-200" />
            <span>Export RA Bill Excel</span>
          </button>
          <button
            onClick={() => {
              setAutoBillNo(`RA-${String((bills?.length || 0) + 1).padStart(2, "0")}`);
              setIsAutoGenerateOpen(true);
            }}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Generate RA Bill from BOQ</span>
          </button>
          <button
            onClick={() => {
              setBillId(`BILL-2026-RA-${String((bills?.length || 0) + 1).padStart(2, "0")}`);
              setIsAddOpen(true);
            }}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Manual Bill</span>
          </button>
        </div>
      </div>

      {/* Bill Pipeline Status Banner */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-xl shadow-md border border-slate-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">
          Road Construction Bill Lifecycle Stages
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-center text-[11px]">
          {WORKFLOW_STAGES.map((stage, idx) => (
            <div
              key={stage}
              className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700 flex flex-col justify-between"
            >
              <span className="text-[10px] text-slate-400 font-mono">Stage {idx + 1}</span>
              <span className="font-bold text-slate-200 mt-1">{stage}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 block">Total RA Bills Tracked</span>
          <span className="text-2xl font-black text-slate-900">{bills?.length || 0} Bills</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Interim & final certificates</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 block">Cumulative Net Bill Payable</span>
          <span className="text-2xl font-black text-emerald-600">
            ₹{(totalNet / 10000000).toFixed(2)} Crores
          </span>
          <span className="text-[10px] text-emerald-700 mt-0.5 block font-semibold">Includes GST & Retentions</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 block">Pending Verification</span>
          <span className="text-2xl font-black text-amber-600">
            {bills?.filter(b => b.bill.verificationStatus === "Submitted" || b.bill.verificationStatus === "Under Verification" || b.bill.verificationStatus === "Bill Prepared").length || 0} Bills
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Under scrutiny</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">Filter Road:</span>
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
          Showing {bills?.length || 0} billing records
        </span>
      </div>

      {/* Bills Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-auto boq-table-scroll" style={{ maxHeight: "60vh" }}>
          <table className="w-full min-w-[1100px] text-left text-xs text-slate-600">
            <thead className="bg-slate-900 sticky top-0 z-10 text-white font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Bill ID & Road</th>
                <th className="py-3 px-4">Bill Type & Period</th>
                <th className="py-3 px-4">Gross Value (₹)</th>
                <th className="py-3 px-4">GST / Retention</th>
                <th className="py-3 px-4">Net Payable (₹)</th>
                <th className="py-3 px-4">Workflow Status</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bills?.map(({ bill: b, road }) => {
                const stageIndex = WORKFLOW_STAGES.indexOf(b.verificationStatus as any);
                const gross = parseFloat(String(b.grossAmount || b.passedAmount || 0));
                const net = parseFloat(String(b.netPayable || b.passedAmount || 0));
                const gst = parseFloat(String(b.gstAmount || 0));
                const ret = parseFloat(String(b.retentionAmount || 0));

                return (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 block mb-1">
                        {b.billId}
                      </span>
                      <span className="font-sans font-semibold text-slate-800 block text-xs">
                        {road?.roadId} • {road?.roadName}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <span className="font-semibold text-slate-900 block">{b.billType}</span>
                      {b.periodFrom && b.periodTo && (
                        <span className="text-[10px] text-slate-500 font-mono block">
                          Period: {b.periodFrom} to {b.periodTo}
                        </span>
                      )}
                      {b.remarks && <span className="text-[10px] text-slate-400 block truncate">{b.remarks}</span>}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      ₹{gross.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      <span className="text-emerald-700 block">+ GST: ₹{gst.toLocaleString("en-IN")}</span>
                      <span className="text-amber-700 block">- Ret: ₹{ret.toLocaleString("en-IN")}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-black text-slate-900 text-sm whitespace-nowrap">
                      ₹{net.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          b.verificationStatus === "Payment Received"
                            ? "bg-emerald-100 text-emerald-800"
                            : b.verificationStatus === "Passed"
                            ? "bg-blue-100 text-blue-800"
                            : b.verificationStatus === "Under Verification" || b.verificationStatus === "Submitted"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                        }`}>
                          {b.verificationStatus}
                        </span>
                        <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${((stageIndex + 1) / WORKFLOW_STAGES.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.paymentStatus === "Received"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}>
                        {b.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedBill(b);
                          setIsEditOpen(true);
                        }}
                        className="px-2.5 py-1 text-slate-700 hover:bg-slate-200 rounded font-semibold text-xs"
                      >
                        Advance Workflow
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Export RA Bill Excel (measurement-sheet format) */}
      {isExportOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" /> Export RA Bill Excel
              </h2>
              <button onClick={() => setIsExportOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Approved e-MB measurements se road-wise sheets (aapke 2nd RA wale format me) + Abstract sheet banegi.
              Previous = period se pehle ka kaam, Current = is period ka kaam.
            </p>

            <form onSubmit={handleExportExcel} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Bill Number *</label>
                <input
                  type="text"
                  required
                  value={exportBillNo}
                  onChange={(e) => setExportBillNo(e.target.value)}
                  placeholder="e.g. 3rd. RA Bill"
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Period From *</label>
                  <input
                    type="date"
                    required
                    value={exportPeriodFrom}
                    onChange={(e) => setExportPeriodFrom(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Period To *</label>
                  <input
                    type="date"
                    required
                    value={exportPeriodTo}
                    onChange={(e) => setExportPeriodTo(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">
                  Roads <span className="font-normal text-slate-400">(khali = saari 14 roads)</span>
                </label>
                <div className="mt-1 max-h-40 overflow-y-auto border border-slate-200 rounded-lg bg-slate-50 p-2 space-y-1">
                  {roads?.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700 hover:bg-white px-2 py-1 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exportRoadIds.includes(r.id)}
                        onChange={() => toggleExportRoad(r.id)}
                        className="w-3.5 h-3.5 accent-blue-700"
                      />
                      {r.roadId} - {r.roadName}
                    </label>
                  ))}
                </div>
                {exportRoadIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setExportRoadIds([])}
                    className="mt-1 text-[11px] text-blue-700 font-bold hover:underline"
                  >
                    Clear selection (all roads)
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isExporting || exportQuery.isFetching}
                className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                {isExporting || exportQuery.isFetching ? "Generating Excel..." : "Download RA Bill Excel"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: 1-Click Auto Generate RA Bill from BOQ */}
      {isAutoGenerateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" /> Auto-Generate RA Bill from BOQ
              </h2>
              <button onClick={() => setIsAutoGenerateOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleAutoGenerate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Bill Number *</label>
                  <input
                    type="text"
                    required
                    value={autoBillNo}
                    onChange={(e) => setAutoBillNo(e.target.value)}
                    placeholder="e.g. RA-05"
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Target Road Stretch *</label>
                  <select
                    value={autoRoadId}
                    onChange={(e) => setAutoRoadId(parseInt(e.target.value))}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-semibold"
                  >
                    {roads?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.roadId} - {r.roadName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Billing Period From *</label>
                  <input
                    type="date"
                    required
                    value={autoPeriodFrom}
                    onChange={(e) => setAutoPeriodFrom(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Billing Period To *</label>
                  <input
                    type="date"
                    required
                    value={autoPeriodTo}
                    onChange={(e) => setAutoPeriodTo(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">GST Percentage (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={autoGst}
                    onChange={(e) => setAutoGst(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Retention Deposit (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={autoRetention}
                    onChange={(e) => setAutoRetention(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 text-[11px] leading-relaxed">
                <strong>Automation Action:</strong> The system automatically extracts all executed quantities for this road stretch from the contract BOQ, calculates item amounts at tender rates, appends {autoGst}% GST, deducts {autoRetention}% retention, and creates a formal RA Bill.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAutoGenerateOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generateRaBillMutation.isPending}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow disabled:opacity-50"
                >
                  {generateRaBillMutation.isPending ? "Generating..." : "Generate & Post RA Bill"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Manual Bill */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900">Prepare New RA Bill</h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Bill Reference ID</label>
                  <input
                    type="text"
                    value={billId}
                    onChange={(e) => setBillId(e.target.value)}
                    className="w-full p-2 border rounded font-mono font-bold"
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

              <div>
                <label className="block font-medium text-slate-700 mb-1">Bill Title & Scope</label>
                <input
                  type="text"
                  value={billType}
                  onChange={(e) => setBillType(e.target.value)}
                  placeholder="e.g. RA Bill 03 (Subgrade & Culverts)"
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Passed Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={passedAmount}
                    onChange={(e) => setPassedAmount(e.target.value)}
                    className="w-full p-2 border rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Submission Date</label>
                  <input
                    type="date"
                    value={submissionDate}
                    onChange={(e) => setSubmissionDate(e.target.value)}
                    className="w-full p-2 border rounded font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border rounded font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    createBill.mutate({
                      billId,
                      projectId: activeProjectId,
                      roadId,
                      billType,
                      measurementStatus,
                      quantityCalculationStatus,
                      abstractStatus,
                      billPrepared,
                      submissionDate,
                      verificationStatus,
                      passedAmount,
                      paymentStatus,
                      remarks,
                    });
                  }}
                  className="px-4 py-2 bg-slate-900 text-white rounded font-bold"
                >
                  Save Bill
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Advance Workflow */}
      {isEditOpen && selectedBill && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Advance Bill Workflow: {selectedBill.billId}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Verification Stage</label>
                <select
                  defaultValue={selectedBill.verificationStatus}
                  id="advance-verification-status"
                  className="w-full p-2 border rounded font-bold text-slate-900"
                >
                  {WORKFLOW_STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Payment Status</label>
                <select
                  defaultValue={selectedBill.paymentStatus}
                  id="advance-payment-status"
                  className="w-full p-2 border rounded font-bold text-slate-900"
                >
                  <option value="Unpaid">Unpaid</option>
                  <option value="Partial">Partial</option>
                  <option value="Received">Payment Received</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Amount Passed / Released (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  defaultValue={selectedBill.passedAmount || selectedBill.netPayable}
                  id="advance-passed-amount"
                  className="w-full p-2 border rounded font-mono font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 border rounded font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const vStatus = (document.getElementById("advance-verification-status") as HTMLSelectElement).value;
                    const pStatus = (document.getElementById("advance-payment-status") as HTMLSelectElement).value;
                    const pAmt = (document.getElementById("advance-passed-amount") as HTMLInputElement).value;
                    updateBill.mutate({
                      id: selectedBill.id,
                      verificationStatus: vStatus as any,
                      paymentStatus: pStatus as any,
                      passedAmount: pAmt,
                    });
                  }}
                  className="px-4 py-2 bg-slate-900 text-white rounded font-bold"
                >
                  Update Stage
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Date-wise DPR & Bill Audit */}
      <DateDprDetailModal
        isOpen={isDprAuditOpen}
        onClose={() => setIsDprAuditOpen(false)}
        date={auditDate}
        roadId={selectedRoadId !== "All Roads" ? parseInt(selectedRoadId) : undefined}
      />
    </div>
  );
}
