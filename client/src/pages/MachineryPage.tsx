import React, { useEffect, useMemo, useState } from "react";
import { trpc } from "../lib/trpc";
import {
  Truck,
  Fuel,
  Gauge,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Zap,
  ShieldCheck,
  CalendarClock,
  Wrench
} from "lucide-react";
import { toast } from "sonner";
import { useRole } from "../components/AppLayout";

export default function MachineryPage() {
  const { role } = useRole();
  const [selectedRoadId, setSelectedRoadId] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isComplianceModalOpen, setIsComplianceModalOpen] = useState(false);

  // Compliance form
  const [compAssetId, setCompAssetId] = useState<string>("");
  const [compDocType, setCompDocType] = useState("PUC");
  const [compDocNo, setCompDocNo] = useState("");
  const [compIssueDate, setCompIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [compExpiryDate, setCompExpiryDate] = useState("");
  const [compAmount, setCompAmount] = useState("");
  const [compVendor, setCompVendor] = useState("");
  const [compMeter, setCompMeter] = useState("");
  const [compRemarks, setCompRemarks] = useState("");

  const COMPLIANCE_DOC_TYPES = ["Registration", "PUC", "Road Tax", "Insurance", "Fitness", "Permit", "Service", "Other"];

  // New Asset Form
  const [assetNo, setAssetNo] = useState("");
  const [assetType, setAssetType] = useState("Vibratory Soil Roller");
  const [makeModel, setMakeModel] = useState("CASE 1107EX");
  const [regNo, setRegNo] = useState("RJ-14-EA-1234");
  const [openingHour, setOpeningHour] = useState("1250.00");
  const [expectedFuel, setExpectedFuel] = useState("11.50");
  const [operator, setOperator] = useState("Ramesh Kumar");

  // New Log Form
  const [logNo, setLogNo] = useState("");
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);
  const [logRoadId, setLogRoadId] = useState<number>(1);
  const [logAssetId, setLogAssetId] = useState<number>(1);
  const [logOpenH, setLogOpenH] = useState("1250.00");
  const [logCloseH, setLogCloseH] = useState("1258.50");
  const [fuelIssued, setFuelIssued] = useState("95.00");
  const [fuelRate, setFuelRate] = useState("92.00");
  const [logOperator, setLogOperator] = useState("Ramesh Kumar");
  const [workDesc, setWorkDesc] = useState("Subgrade compaction at RD 0+000 to 0+500");

  const { data: projects } = trpc.projects.list.useQuery();
  const activeProjectId = projects?.[0]?.id || 1;
  const { data: roads } = trpc.roads.list.useQuery();
  const { data: assets, refetch: refetchAssets } = trpc.machinery.assetsList.useQuery();
  const { data: logs, isLoading, refetch: refetchLogs } = trpc.machinery.logsList.useQuery({
    roadId: selectedRoadId !== "All" ? parseInt(selectedRoadId) : undefined,
  });

  const createAssetMutation = trpc.machinery.createAsset.useMutation();
  const createLogMutation = trpc.machinery.createLog.useMutation();
  const createComplianceMutation = trpc.machinery.createCompliance.useMutation();
  const deleteComplianceMutation = trpc.machinery.deleteCompliance.useMutation();
  const alertsMutation = trpc.machinery.generateComplianceAlerts.useMutation();

  const { data: complianceRows, refetch: refetchCompliance } = trpc.machinery.complianceList.useQuery();

  // Generate due-date alerts once when the page loads (server dedupes, no spam)
  useEffect(() => {
    alertsMutation.mutate({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compliance rows with computed due status, most urgent first
  const complianceWithStatus = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (complianceRows || [])
      .map(({ compliance, asset }) => {
        const expiry = new Date(`${compliance.expiryDate || ""}T00:00:00`);
        const daysLeft = isNaN(expiry.getTime())
          ? null
          : Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
        const status = daysLeft === null ? "Unknown" : daysLeft < 0 ? "Overdue" : daysLeft <= 30 ? "Due Soon" : "Valid";
        return { compliance, asset, daysLeft, status };
      })
      .sort((a, b) => (a.daysLeft ?? 99999) - (b.daysLeft ?? 99999));
  }, [complianceRows]);

  const overdueCount = complianceWithStatus.filter((c) => c.status === "Overdue").length;
  const dueSoonCount = complianceWithStatus.filter((c) => c.status === "Due Soon").length;

  const handleCreateCompliance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compAssetId || !compExpiryDate) {
      toast.error("Machine aur Expiry / Next-due date zaroori hai");
      return;
    }
    try {
      await createComplianceMutation.mutateAsync({
        assetId: parseInt(compAssetId),
        projectId: activeProjectId,
        docType: compDocType as "Registration" | "PUC" | "Road Tax" | "Insurance" | "Fitness" | "Permit" | "Service" | "Other",
        docNumber: compDocNo.trim() || undefined,
        issueDate: compIssueDate || undefined,
        expiryDate: compExpiryDate,
        amount: compAmount.trim() || undefined,
        vendor: compVendor.trim() || undefined,
        meterReading: compDocType === "Service" && compMeter.trim() ? compMeter.trim() : undefined,
        remarks: compRemarks.trim() || undefined,
      });
      toast.success(`${compDocType} record saved — due alerts ON`);
      setIsComplianceModalOpen(false);
      setCompDocNo(""); setCompExpiryDate(""); setCompAmount("");
      setCompVendor(""); setCompMeter(""); setCompRemarks("");
      refetchCompliance();
      alertsMutation.mutate({});
    } catch (err: any) {
      toast.error(err.message || "Failed to save compliance record");
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const code = assetNo.trim() || `EQ-${Date.now().toString().slice(-4)}`;
      await createAssetMutation.mutateAsync({
        assetNo: code,
        projectId: activeProjectId,
        assetType,
        makeModel: makeModel.trim() || undefined,
        registrationNo: regNo.trim() || undefined,
        openingHourMeter: openingHour,
        expectedFuelPerHour: expectedFuel,
        status: "Available",
        operator: operator.trim() || undefined,
      });
      toast.success(`Plant asset ${code} registered!`);
      setIsAssetModalOpen(false);
      refetchAssets();
    } catch (err: any) {
      toast.error(err.message || "Failed to register machinery asset");
    }
  };

  const handleCreateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const lNo = logNo.trim() || `LOG-${Date.now().toString().slice(-5)}`;
      await createLogMutation.mutateAsync({
        logNo: lNo,
        logDate,
        projectId: activeProjectId,
        roadId: logRoadId,
        assetId: logAssetId,
        openingHourMeter: logOpenH,
        closingHourMeter: logCloseH,
        fuelIssued,
        fuelRate,
        operator: logOperator.trim() || undefined,
        workDescription: workDesc.trim() || undefined,
      });
      toast.success(`Fuel logbook entry ${lNo} posted! Hour meter updated.`);
      setIsLogModalOpen(false);
      refetchLogs();
      refetchAssets();
    } catch (err: any) {
      toast.error(err.message || "Failed to post log entry");
    }
  };

  // KPI calculations
  const stats = useMemo(() => {
    if (!logs?.length) return { totalHours: 0, totalFuel: 0, totalFuelCost: 0, avgEfficiency: 0 };
    let hours = 0;
    let fuel = 0;
    let cost = 0;
    logs.forEach(({ log }) => {
      hours += parseFloat(String(log.workHours || 0));
      fuel += parseFloat(String(log.fuelIssued || 0));
      cost += parseFloat(String(log.fuelAmount || 0));
    });
    return {
      totalHours: hours,
      totalFuel: fuel,
      totalFuelCost: cost,
      avgEfficiency: hours > 0 ? parseFloat((fuel / hours).toFixed(2)) : 0,
    };
  }, [logs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Plant, Machinery & Fuel Logbook
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded bg-blue-100 text-blue-900 border border-blue-300">
              Hour Meter & Diesel Efficiency Audit
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track heavy earthmoving equipment, roller/paver utilization, daily fuel issuance and L/hr consumption metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAssetModalOpen(true)}
            className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-sm"
          >
            <Truck className="w-4 h-4 text-slate-600" />
            <span>+ Add Machine Asset</span>
          </button>
          <button
            onClick={() => {
              setLogNo(`LOG-2026-${String((logs?.length || 0) + 1).padStart(3, "0")}`);
              setIsLogModalOpen(true);
            }}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
          >
            <Fuel className="w-4 h-4 text-amber-400" />
            <span>Record Daily Log / Fuel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Fleet Deployed</span>
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono mt-1 block">
            {assets?.length || 0} Heavy Units
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Rollers, pavers, graders, dumpers</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Engine Hours</span>
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono mt-1 block">
            {stats.totalHours.toFixed(1)} Hrs
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Recorded work utilization</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Diesel Issued</span>
          <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 font-mono mt-1 block">
            {stats.totalFuel.toLocaleString()} Ltrs
          </span>
          <span className="text-[10px] text-emerald-700 mt-0.5 block font-semibold">
            ₹{(stats.totalFuelCost / 100000).toFixed(2)} Lakh diesel cost
          </span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Fleet Fuel Avg</span>
          <span className="text-xl sm:text-2xl font-extrabold text-amber-600 font-mono mt-1 block">
            {stats.avgEfficiency} L/hr
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Efficiency benchmark</span>
        </div>
      </div>

      {/* Machine Compliance & Service Tracker */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-500" />
              <h2 className="font-bold text-slate-900 text-sm sm:text-base">Machine Compliance & Service Tracker</h2>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Registration, PUC, Tax, Insurance, Fitness, Permit aur servicing — expiry par auto alert (top bell me bhi aayega).
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {overdueCount > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {overdueCount} Overdue
              </span>
            )}
            {dueSoonCount > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold flex items-center gap-1">
                <CalendarClock className="w-3.5 h-3.5" /> {dueSoonCount} Due in 30 days
              </span>
            )}
            {overdueCount === 0 && dueSoonCount === 0 && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> All Valid
              </span>
            )}
            <button
              onClick={() => setIsComplianceModalOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Document
            </button>
          </div>
        </div>
        <div className="overflow-auto boq-table-scroll" style={{ maxHeight: "50vh" }}>
          <table className="w-full min-w-[1100px] text-left text-xs">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="text-slate-500 uppercase text-[10px]">
                <th className="p-3">Machine</th>
                <th className="p-3">Document</th>
                <th className="p-3">Doc No.</th>
                <th className="p-3">Issue Date</th>
                <th className="p-3">Expiry / Next Due</th>
                <th className="p-3 text-center">Days Left</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Vendor / Amount</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {complianceWithStatus.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-400 text-xs">
                    No compliance records yet — har machine ke liye PUC, Insurance, Tax, Servicing add karo.
                  </td>
                </tr>
              ) : (
                complianceWithStatus.map(({ compliance: c, asset, daysLeft, status }) => (
                  <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="p-3">
                      <span className="font-bold text-slate-900 block">{asset?.assetNo || `Machine #${c.assetId}`}</span>
                      <span className="text-[10px] text-slate-500">{asset?.assetType || ""}</span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.docType === "Service" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-700"}`}>
                        {c.docType}
                      </span>
                      {c.docType === "Service" && c.meterReading ? (
                        <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">@ {c.meterReading} hrs</span>
                      ) : null}
                    </td>
                    <td className="p-3 font-mono text-[11px]">{c.docNumber || "—"}</td>
                    <td className="p-3 font-mono text-[11px]">{c.issueDate || "—"}</td>
                    <td className="p-3 font-mono text-[11px] font-bold">{c.expiryDate}</td>
                    <td className="p-3 text-center font-mono font-bold text-[11px]">
                      {daysLeft === null ? "—" : daysLeft < 0 ? `${Math.abs(daysLeft)} overdue` : daysLeft}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        status === "Overdue" ? "bg-rose-100 text-rose-800"
                        : status === "Due Soon" ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {status}
                      </span>
                    </td>
                    <td className="p-3 text-[11px] text-slate-600">
                      {c.vendor || "—"}
                      {parseFloat(String(c.amount || 0)) > 0 ? (
                        <span className="block font-mono font-bold">₹{c.amount}</span>
                      ) : null}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={async () => {
                          if (confirm("Delete this compliance record?")) {
                            await deleteComplianceMutation.mutateAsync({ id: c.id });
                            refetchCompliance();
                          }
                        }}
                        className="text-rose-500 hover:text-rose-700 text-[11px] font-bold"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
            placeholder="Search machinery logs by asset no, operator or work description..."
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

      {/* Machinery Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-auto boq-table-scroll" style={{ maxHeight: "60vh" }}>
          <table className="w-full min-w-[1100px] text-left text-xs">
            <thead className="bg-slate-900 text-white font-semibold uppercase tracking-wider text-[10px] sticky top-0 z-10">
              <tr>
                <th className="p-3">Log No. & Date</th>
                <th className="p-3">Equipment Asset</th>
                <th className="p-3">Road Location</th>
                <th className="p-3 text-right">Start (Hr)</th>
                <th className="p-3 text-right">End (Hr)</th>
                <th className="p-3 text-right">Work (Hrs)</th>
                <th className="p-3 text-right">Fuel Issued (L)</th>
                <th className="p-3 text-right">Efficiency (L/hr)</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Operator & Work Done</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-slate-400">Loading machinery logs...</td>
                </tr>
              ) : logs?.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-slate-400">
                    No machinery logs posted yet. Click &quot;Record Daily Log / Fuel&quot; to begin.
                  </td>
                </tr>
              ) : (
                logs
                  ?.filter(
                    ({ log, asset, road }) =>
                      log.logNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (log.operator || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (log.workDescription || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (asset?.assetNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (road?.roadName || "").toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map(({ log, asset, road }) => {
                    const isHigh = log.utilizationStatus === "High Consumption";
                    const isWatch = log.utilizationStatus === "Watch";

                    return (
                      <tr key={log.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono">
                          <span className="font-bold text-slate-900 block">{log.logNo}</span>
                          <span className="text-[10px] text-slate-400 block">{log.logDate}</span>
                        </td>
                        <td className="p-3 font-semibold text-slate-800">
                          <span className="font-mono text-amber-700 block">{asset?.assetNo}</span>
                          <span className="text-[11px] text-slate-600 block">{asset?.assetType}</span>
                          <span className="text-[10px] text-slate-400 block">{asset?.makeModel}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-slate-800 block">{road?.roadId}</span>
                          <span className="text-[10px] text-slate-400 block truncate max-w-[130px]">{road?.roadName}</span>
                        </td>
                        <td className="p-3 text-right font-mono text-slate-700">{parseFloat(String(log.openingHourMeter)).toFixed(1)}</td>
                        <td className="p-3 text-right font-mono text-slate-700">{parseFloat(String(log.closingHourMeter)).toFixed(1)}</td>
                        <td className="p-3 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                          {parseFloat(String(log.workHours)).toFixed(1)} hrs
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                          {parseFloat(String(log.fuelIssued)).toFixed(1)} L
                        </td>
                        <td
                          className={`p-3 text-right font-mono font-black whitespace-nowrap ${
                            isHigh ? "text-rose-600" : isWatch ? "text-amber-600" : "text-emerald-600"
                          }`}
                        >
                          {parseFloat(String(log.fuelEfficiency)).toFixed(2)} L/hr
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isHigh
                                ? "bg-rose-100 text-rose-800"
                                : isWatch
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {log.utilizationStatus}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 text-[11px] max-w-[200px]">
                          <span className="font-bold text-slate-800 block">{log.operator || "Operator"}</span>
                          <span className="text-[10px] text-slate-500 block truncate">{log.workDescription}</span>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Machinery Asset */}
      {isAssetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-500" /> Register Heavy Equipment
              </h2>
              <button onClick={() => setIsAssetModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Equipment Asset No. *</label>
                <input
                  type="text"
                  required
                  value={assetNo}
                  onChange={(e) => setAssetNo(e.target.value)}
                  placeholder="e.g. EQ-ROLL-01"
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Asset Category *</label>
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-semibold"
                >
                  <option value="Vibratory Soil Roller">Vibratory Soil Roller (10-12 T)</option>
                  <option value="Tandem Asphalt Roller">Tandem Asphalt Roller</option>
                  <option value="Motor Grader">Motor Grader (CAT 120 / Liugong)</option>
                  <option value="Hydrostatic Sensor Paver">Hydrostatic Sensor Paver</option>
                  <option value="Hydraulic Excavator (JCB/Hitachi)">Hydraulic Excavator (JCB/Hitachi)</option>
                  <option value="Backhoe Loader (JCB 3DX)">Backhoe Loader (JCB 3DX)</option>
                  <option value="Tipper / Dumper (16-25 T)">Tipper / Dumper (16-25 T)</option>
                  <option value="Water Bowser (10 KL)">Water Bowser (10 KL)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Make & Model</label>
                  <input
                    type="text"
                    value={makeModel}
                    onChange={(e) => setMakeModel(e.target.value)}
                    placeholder="e.g. CASE 1107EX"
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Registration / Serial No.</label>
                  <input
                    type="text"
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value)}
                    placeholder="RJ-14-EA-1234"
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Current Hour Meter</label>
                  <input
                    type="number"
                    step="0.01"
                    value={openingHour}
                    onChange={(e) => setOpeningHour(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Expected Fuel (L/hr)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={expectedFuel}
                    onChange={(e) => setExpectedFuel(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Designated Operator</label>
                <input
                  type="text"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssetModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAssetMutation.isPending}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold shadow"
                >
                  Register Plant Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Machinery Log & Fuel Issue */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Fuel className="w-5 h-5 text-amber-500" /> Daily Machine Log & Fuel Entry
              </h2>
              <button onClick={() => setIsLogModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLog} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Logbook Sheet No. *</label>
                  <input
                    type="text"
                    required
                    value={logNo}
                    onChange={(e) => setLogNo(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Work Date *</label>
                  <input
                    type="date"
                    required
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Target Equipment *</label>
                  <select
                    value={logAssetId}
                    onChange={(e) => {
                      const id = parseInt(e.target.value);
                      setLogAssetId(id);
                      const target = assets?.find((a) => a.asset.id === id);
                      if (target) {
                        setLogOpenH(String(target.asset.currentHourMeter || target.asset.openingHourMeter));
                        setLogCloseH(String(parseFloat(String(target.asset.currentHourMeter || target.asset.openingHourMeter)) + 8));
                        if (target.asset.operator) setLogOperator(target.asset.operator);
                      }
                    }}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-semibold"
                  >
                    {assets?.map(({ asset }) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.assetNo} - {asset.assetType}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Road Stretch *</label>
                  <select
                    value={logRoadId}
                    onChange={(e) => setLogRoadId(parseInt(e.target.value))}
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

              {/* Hour Meter Start/Close */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="font-bold text-slate-700 block">Start Meter (Hr)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={logOpenH}
                    onChange={(e) => setLogOpenH(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-200 rounded-lg bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block">Close Meter (Hr)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={logCloseH}
                    onChange={(e) => setLogCloseH(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-200 rounded-lg bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block">Net Work (Hrs)</label>
                  <div className="mt-1 p-2 bg-slate-200 rounded-lg font-mono font-black text-slate-900 text-center">
                    {Math.max(0, parseFloat(logCloseH || "0") - parseFloat(logOpenH || "0")).toFixed(1)} hrs
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Diesel Issued (Litres) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={fuelIssued}
                    onChange={(e) => setFuelIssued(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Fuel Rate (₹/Litre)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={fuelRate}
                    onChange={(e) => setFuelRate(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Operator In-Charge</label>
                <input
                  type="text"
                  value={logOperator}
                  onChange={(e) => setLogOperator(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Work Description / Road Chainage</label>
                <input
                  type="text"
                  value={workDesc}
                  onChange={(e) => setWorkDesc(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLogMutation.isPending}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold shadow"
                >
                  Record Log & Audit Fuel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Compliance Document / Service */}
      {isComplianceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl my-8">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-extrabold text-slate-900">Add Compliance Document / Service</h3>
            </div>
            <p className="text-[11px] text-slate-500 mb-4">Expiry / next-due date par auto alert milega (30 din pehle se, bell me bhi).</p>
            <form onSubmit={handleCreateCompliance} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Machine *</label>
                <select
                  value={compAssetId}
                  onChange={(e) => setCompAssetId(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                  required
                >
                  <option value="">— Select machine —</option>
                  {(assets || []).map(({ asset: a }) => (
                    <option key={a.id} value={a.id}>
                      {a.assetNo} — {a.assetType}{a.registrationNo ? ` (${a.registrationNo})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Document Type *</label>
                  <select
                    value={compDocType}
                    onChange={(e) => setCompDocType(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                  >
                    {COMPLIANCE_DOC_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Doc / Policy / Cert No.</label>
                  <input
                    type="text"
                    value={compDocNo}
                    onChange={(e) => setCompDocNo(e.target.value)}
                    placeholder="e.g. PUC-2026-8891"
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">
                    {compDocType === "Service" ? "Service Date" : "Issue Date"}
                  </label>
                  <input
                    type="date"
                    value={compIssueDate}
                    onChange={(e) => setCompIssueDate(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 text-rose-700">
                    {compDocType === "Service" ? "Next Service Due Date *" : "Expiry Date *"}
                  </label>
                  <input
                    type="date"
                    value={compExpiryDate}
                    onChange={(e) => setCompExpiryDate(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-rose-200 rounded-lg bg-rose-50/50 font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">
                    {compDocType === "Service" ? "Workshop / Service Center" : "Vendor / Insurer / RTO Agent"}
                  </label>
                  <input
                    type="text"
                    value={compVendor}
                    onChange={(e) => setCompVendor(e.target.value)}
                    placeholder="e.g. Sharma Motors, Ambikapur"
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={compAmount}
                    onChange={(e) => setCompAmount(e.target.value)}
                    placeholder="0.00"
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              </div>

              {compDocType === "Service" && (
                <div>
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5" /> Hour-Meter at Service
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={compMeter}
                    onChange={(e) => setCompMeter(e.target.value)}
                    placeholder="e.g. 2450.50"
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700">Remarks</label>
                <input
                  type="text"
                  value={compRemarks}
                  onChange={(e) => setCompRemarks(e.target.value)}
                  placeholder="Anything to remember at renewal..."
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsComplianceModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createComplianceMutation.isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow"
                >
                  Save & Enable Alerts
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
