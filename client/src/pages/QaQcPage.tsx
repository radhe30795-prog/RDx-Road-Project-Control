import React, { useState } from "react";
import { trpc } from "../lib/trpc";
import { useActiveProject } from "../components/ProjectContext";
import {
  Microscope,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileText,
  Filter,
  Search,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Check,
  X
} from "lucide-react";
import { useRole } from "../components/AppLayout";

const TEST_TYPES = [
  "All Types",
  "FDT",
  "Proctor",
  "CBR",
  "Gradation",
  "Atterberg Limits",
  "Aggregate Crushing Value",
  "Flakiness & Elongation",
  "Bitumen Test",
  "Core Test",
  "Marshall",
  "Other"
] as const;

export default function QaQcPage() {
  const { role } = useRole();
  const [selectedRoadId, setSelectedRoadId] = useState<string>("All Roads");
  const [selectedType, setSelectedType] = useState("All Types");
  const [selectedResult, setSelectedResult] = useState("All Results");
  const [search, setSearch] = useState("");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isActionOpen, setIsActionOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<any>(null);

  // Form states
  const [testId, setTestId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [roadId, setRoadId] = useState<number>(1);
  const [activity, setActivity] = useState("GSB Layer 1 Compaction");
  const [testType, setTestType] = useState<any>("FDT");
  const [locationRd, setLocationRd] = useState("Ch 3+500 RHS");
  const [requiredValue, setRequiredValue] = useState(">= 97.0% MDD");
  const [actualValue, setActualValue] = useState("98.1% MDD");
  const [unit, setUnit] = useState("% MDD");
  const [result, setResult] = useState<any>("Passed");
  const [testReportReference, setTestReportReference] = useState("LAB/FDT/2026/108");
  const [remarks, setRemarks] = useState("Sand replacement method performed at site.");

  const { projectId: activeProjectId } = useActiveProject();

  const { data: tests, isLoading, refetch } = trpc.qaQc.list.useQuery({
    projectId: activeProjectId,
    roadId: selectedRoadId !== "All Roads" ? parseInt(selectedRoadId) : undefined,
  });

  const { data: roads } = trpc.roads.list.useQuery({ projectId: activeProjectId });

  const createTest = trpc.qaQc.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsAddOpen(false);
      resetForm();
    },
  });

  const updateTest = trpc.qaQc.update.useMutation({
    onSuccess: () => {
      refetch();
      setIsActionOpen(false);
    },
  });

  const resetForm = () => {
    setTestId("");
    setLocationRd("");
    setRemarks("");
  };

  const filtered = (tests || []).filter(({ test: t }) => {
    if (selectedType !== "All Types" && t.testType !== selectedType) return false;
    if (selectedResult !== "All Results" && t.result !== selectedResult) return false;
    if (search && !t.testId.toLowerCase().includes(search.toLowerCase()) && !t.locationRd.toLowerCase().includes(search.toLowerCase()) && !t.activity.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const failedCount = (tests || []).filter(({ test: t }) => t.result === "Failed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Microscope className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              QA/QC Lab & Field Quality Compliance
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded bg-rose-100 text-rose-800 border border-rose-300">
              Auto Non-Conformance & Corrective Action
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Standard MoRTH quality testing: FDT, Proctor, CBR, Gradation, Bitumen Marshall, Crushing & Core extraction.
          </p>
        </div>

        <button
          onClick={() => {
            setTestId(`QA-2026-${String((tests?.length || 0) + 1).padStart(3, "0")}`);
            setIsAddOpen(true);
          }}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
        >
          <Plus className="w-4 h-4" />
          <span>Record Test Report</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 block">Total Tests Logged</span>
          <span className="text-2xl font-black text-slate-900">{tests?.length || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 block">Passed Quality Checks</span>
          <span className="text-2xl font-black text-emerald-600">
            {tests?.filter(({ test: t }) => t.result === "Passed").length || 0}
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-rose-300 bg-rose-50/40 shadow-sm">
          <span className="text-xs text-rose-700 font-semibold block">Failed / Non-Conformance</span>
          <span className="text-2xl font-black text-rose-600 animate-pulse">{failedCount} Failed</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 block">Pass Rate</span>
          <span className="text-2xl font-black text-blue-600">
            {tests && tests.length > 0
              ? `${(((tests.filter(({ test: t }) => t.result === "Passed").length) / tests.length) * 100).toFixed(1)}%`
              : "100%"}
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Test ID, location, activity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
            />
          </div>

          {/* Road Filter */}
          <select
            value={selectedRoadId}
            onChange={(e) => setSelectedRoadId(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none"
          >
            <option value="All Roads">All 14 Roads</option>
            {roads?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.roadId} - {r.roadName}
              </option>
            ))}
          </select>

          {/* Test Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none"
          >
            {TEST_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Result Filter */}
          <select
            value={selectedResult}
            onChange={(e) => setSelectedResult(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none"
          >
            <option value="All Results">All Results</option>
            <option value="Passed">Passed Only</option>
            <option value="Failed">Failed (Requires Action)</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Test Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-auto boq-table-scroll" style={{ maxHeight: "60vh" }}>
          <table className="w-full min-w-[1100px] text-left text-xs text-slate-600">
            <thead className="bg-slate-100 sticky top-0 z-10 text-slate-800 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Test ID</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Road & Location</th>
                <th className="py-3 px-4">Test Type</th>
                <th className="py-3 px-4">Required Spec</th>
                <th className="py-3 px-4">Actual Result</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Report Ref</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(({ test: t, road }) => {
                const isFail = t.result === "Failed";
                return (
                  <tr key={t.id} className={`hover:bg-slate-50/80 transition ${isFail ? "bg-rose-50/30" : ""}`}>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800">
                        {t.testId}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {t.date}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      <span className="font-bold text-slate-900">{road?.roadId} • {t.locationRd}</span>
                      <span className="block text-[11px] text-slate-500 truncate max-w-[140px]">{t.activity}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white">
                        {t.testType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                      {t.requiredValue}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {t.actualValue}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.result === "Passed"
                          ? "bg-emerald-100 text-emerald-800"
                          : t.result === "Failed"
                          ? "bg-rose-500 text-white"
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        {t.result === "Passed" ? <Check className="w-3 h-3" /> : t.result === "Failed" ? <X className="w-3 h-3" /> : null}
                        <span>{t.result}</span>
                      </span>

                      {isFail && t.correctiveActionStatus && (
                        <span className="block text-[10px] text-rose-600 font-semibold mt-0.5">
                          Action: {t.correctiveActionStatus}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {t.testReportReference || "—"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isFail ? (
                        <button
                          onClick={() => {
                            setSelectedTest(t);
                            setIsActionOpen(true);
                          }}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-xs shadow-sm"
                        >
                          Corrective Action
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedTest(t);
                            setIsActionOpen(true);
                          }}
                          className="px-2 py-1 text-slate-600 hover:bg-slate-100 rounded text-xs font-medium"
                        >
                          View/Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add QA Test Report */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="border-b pb-2">
              <h3 className="text-base font-bold text-slate-900">Record QA/QC Inspection Test</h3>
              <p className="text-xs text-slate-500">
                If the test fails, a corrective action notice and notification will be generated automatically.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Test ID</label>
                  <input
                    type="text"
                    value={testId}
                    onChange={(e) => setTestId(e.target.value)}
                    className="w-full p-2 border rounded font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Testing Date</label>
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
                  <label className="block font-medium text-slate-700 mb-1">Road Stretch</label>
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
                  <label className="block font-medium text-slate-700 mb-1">Test Type</label>
                  <select
                    value={testType}
                    onChange={(e) => setTestType(e.target.value)}
                    className="w-full p-2 border rounded font-bold"
                  >
                    {TEST_TYPES.slice(1).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Location / RD Chainage</label>
                  <input
                    type="text"
                    value={locationRd}
                    onChange={(e) => setLocationRd(e.target.value)}
                    placeholder="e.g. Ch 5+400 LHS"
                    className="w-full p-2 border rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Activity</label>
                  <input
                    type="text"
                    value={activity}
                    onChange={(e) => setActivity(e.target.value)}
                    placeholder="e.g. DBM 60mm Laying"
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Required Spec</label>
                  <input
                    type="text"
                    value={requiredValue}
                    onChange={(e) => setRequiredValue(e.target.value)}
                    placeholder=">= 97% MDD"
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Actual Observed</label>
                  <input
                    type="text"
                    value={actualValue}
                    onChange={(e) => setActualValue(e.target.value)}
                    placeholder="98.2% MDD"
                    className="w-full p-2 border rounded font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="% MDD"
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Test Result</label>
                  <select
                    value={result}
                    onChange={(e) => setResult(e.target.value)}
                    className={`w-full p-2 border rounded font-bold ${
                      result === "Failed" ? "bg-rose-50 text-rose-800 border-rose-300" : "bg-emerald-50 text-emerald-800"
                    }`}
                  >
                    <option value="Passed">Passed</option>
                    <option value="Failed">Failed (Triggers Non-Conformance)</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Lab Report Ref No.</label>
                  <input
                    type="text"
                    value={testReportReference}
                    onChange={(e) => setTestReportReference(e.target.value)}
                    placeholder="LAB/2026/842"
                    className="w-full p-2 border rounded font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Technician / QC Remarks</label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Testing methodology, equipment calibration status, sampling notes..."
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
                disabled={!testId || !requiredValue || !actualValue}
                onClick={() => {
                  createTest.mutate({
                    testId,
                    date,
                    projectId: activeProjectId as number,
                    roadId,
                    activity,
                    testType,
                    locationRd,
                    requiredValue,
                    actualValue,
                    unit,
                    result,
                    testReportReference,
                    remarks,
                  });
                }}
                className="px-4 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
              >
                Record Test Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Corrective Action / Update Test */}
      {isActionOpen && selectedTest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              QA Non-Conformance Action: {selectedTest.testId}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {selectedTest.testType} at {selectedTest.locationRd} (Result: {selectedTest.result})
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Corrective Action Status</label>
                <select
                  defaultValue={selectedTest.correctiveActionStatus || "Required"}
                  id="correctiveStatusInput"
                  className="w-full p-2 border rounded font-semibold text-slate-800"
                >
                  <option value="Required">Required</option>
                  <option value="In Progress">In Progress (Rework Ongoing)</option>
                  <option value="Rectified">Rectified (Re-Tested & Approved)</option>
                  <option value="None">None</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Corrective Action Notes / Rectification Method</label>
                <textarea
                  rows={3}
                  defaultValue={selectedTest.correctiveActionNotes || ""}
                  id="correctiveNotesInput"
                  placeholder="Material rejected / Re-rolled / Extra binder added / Re-tested on date..."
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Test Result</label>
                <select
                  defaultValue={selectedTest.result}
                  id="resultOverrideInput"
                  className="w-full p-2 border rounded"
                >
                  <option value="Passed">Passed</option>
                  <option value="Failed">Failed (Non-Conformance)</option>
                  <option value="Pending">Pending (Awaiting Result)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">QC Remarks</label>
                <textarea
                  rows={3}
                  defaultValue={selectedTest.remarks || ""}
                  id="remarksEditInput"
                  placeholder="Testing methodology, equipment calibration status, sampling notes..."
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setIsActionOpen(false)}
                className="px-4 py-1.5 border rounded text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const cStatus = (document.getElementById("correctiveStatusInput") as HTMLSelectElement).value as any;
                  const cNotes = (document.getElementById("correctiveNotesInput") as HTMLTextAreaElement).value;
                  const resOverride = (document.getElementById("resultOverrideInput") as HTMLSelectElement).value as any;
                  const remarksEdit = (document.getElementById("remarksEditInput") as HTMLTextAreaElement).value;

                  updateTest.mutate({
                    id: selectedTest.id,
                    correctiveActionStatus: cStatus,
                    correctiveActionNotes: cNotes,
                    result: resOverride,
                    remarks: remarksEdit,
                  });
                }}
                className="px-4 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800"
              >
                Save Rectification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
