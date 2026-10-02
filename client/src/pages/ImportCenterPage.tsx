import React, { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { AlertTriangle, CheckCircle2, DatabaseZap, Download, FileSpreadsheet, FileUp, Info, Loader2, ShieldAlert, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "../lib/trpc";

const SHEET_COLUMNS: Record<string, string[]> = {
  Projects: ["projectId", "projectName", "package", "clientDepartment", "contractor", "agreementStartDate", "agreementEndDate", "status", "overallProgress", "remarks"],
  Roads: ["roadId", "projectId", "roadName", "roadLengthKm", "startRd", "endRd", "status", "progress", "remarks"],
  Employees: ["employeeCode", "fullName", "fatherName", "phone", "email", "dateOfBirth", "gender", "aadhaarLast4", "panReference", "address", "emergencyContactName", "emergencyContactPhone", "departmentCode", "designationCode", "employmentType", "joiningDate", "exitDate", "status", "payBasis", "basicRate", "overtimeRate", "bankName", "accountLast4", "ifscCode", "photoUrl", "documentReferences", "remarks"],
  Structures: ["structureNo", "projectId", "roadId", "structureType", "chainageFrom", "chainageTo", "locationDescription", "count", "length", "width", "height", "quantity", "unit", "status", "billableQuantity", "remarks"],
  Activities: ["taskId", "projectId", "roadId", "phase", "activityName", "startDate", "endDate", "percentageComplete", "status", "priority", "assignedTo", "predecessorActivity", "dependencyType", "remarks"],
  BOQ: ["itemCode", "projectId", "roadId", "chapter", "description", "unit", "contractQuantity", "revisedQuantity", "executedQuantity", "balanceQuantity", "rate", "contractAmount", "status", "remarks"],
  Inventory: ["materialCode", "projectId", "materialName", "unit", "minStock", "maxStock", "openingStock", "receivedQuantity", "issuedQuantity", "returnedQuantity", "wastageQuantity", "balanceQuantity", "averageRate", "supplier", "storageLocation", "approvalStatus", "remarks"],
  GRN: ["grnNo", "grnDate", "projectId", "materialCode", "supplier", "challanNo", "receivedQuantity", "acceptedQuantity", "rejectedQuantity", "unit", "rate", "totalAmount", "inspectionStatus", "invoiceReference", "remarks"],
  "Material Issues": ["issueNo", "issueDate", "projectId", "roadId", "materialCode", "itemCode", "dailyProgressId", "quantity", "unit", "purpose", "remarks"],
  "Material Variance": ["varianceNo", "projectId", "roadId", "itemCode", "materialCode", "periodFrom", "periodTo", "theoreticalQuantity", "actualQuantity", "varianceQuantity", "variancePercent", "status", "reason", "remarks"],
  DPR: ["date", "projectId", "roadId", "taskId", "itemCode", "materialCode", "clientDraftId", "plannedQuantity", "actualQuantity", "unit", "percentageComplete", "materialConsumedQuantity", "manpower", "machinery", "weather", "hindrance", "remarks", "sitePhotos"],
  "e-MB": ["mbNo", "mbDate", "projectId", "roadId", "itemCode", "taskId", "locationFrom", "locationTo", "length", "width", "depth", "calculatedQuantity", "unit", "rate", "amount", "status", "submittedBy", "checkedBy", "remarks"],
  Billing: ["billId", "projectId", "roadId", "billType", "measurementStatus", "quantityCalculationStatus", "abstractStatus", "billPrepared", "submissionDate", "verificationStatus", "passedAmount", "paymentStatus", "paymentDate", "periodFrom", "periodTo", "grossAmount", "gstAmount", "retentionAmount", "netPayable", "remarks"],
  Hindrances: ["hindranceId", "projectId", "roadId", "rdLocation", "category", "description", "dateRaised", "affectedActivity", "affectedLength", "responsiblePersonDepartment", "letterNumber", "status", "dueDate", "resolutionDate", "daysPending", "remarks", "supportingPhotosDocuments"],
  "QA-QC": ["testId", "date", "projectId", "roadId", "activity", "testType", "locationRd", "requiredValue", "actualValue", "unit", "result", "testReportReference", "remarks", "correctiveActionStatus", "correctiveActionNotes"],
  Materials: ["entryId", "date", "projectId", "roadId", "material", "receivedQuantity", "usedQuantity", "balanceQuantity", "unit", "supplier", "challanReference", "remarks"],
  Documents: ["projectId", "roadId", "category", "title", "documentNumber", "fileUrl", "fileSize", "uploadedBy", "date", "remarks"],
  Subcontractors: ["subcontractorCode", "projectId", "name", "workCategory", "contactPerson", "phone", "gstin", "status", "remarks"],
  "Work Orders": ["workOrderNo", "projectId", "roadId", "subcontractorCode", "scope", "unit", "awardedQuantity", "executedQuantity", "rate", "awardedAmount", "paidAmount", "retentionAmount", "startDate", "targetDate", "status", "remarks"],
  "Machinery Assets": ["assetNo", "projectId", "assetType", "makeModel", "registrationNo", "roadId", "openingHourMeter", "currentHourMeter", "expectedFuelPerHour", "status", "operator", "remarks"],
  "Machinery Logs": ["logNo", "logDate", "projectId", "roadId", "assetNo", "openingHourMeter", "closingHourMeter", "workHours", "fuelIssued", "fuelRate", "fuelAmount", "fuelEfficiency", "operator", "workDescription", "utilizationStatus", "remarks"],
  "Sign-offs": ["entityType", "entityId", "stage", "requestedBy", "assignedRole", "signedBy", "status", "comments", "signedAt"],
};

const moduleGroups = [
  { label: "Project Setup", sheets: ["Projects", "Roads", "Structures", "Activities"] },
  { label: "HR & Payroll", sheets: ["Employees"] },
  { label: "QS & Material Control", sheets: ["BOQ", "Inventory", "GRN", "Material Issues", "Material Variance", "DPR", "e-MB", "Billing"] },
  { label: "Field & Compliance", sheets: ["Hindrances", "QA-QC", "Materials", "Documents"] },
  { label: "Resources & Approvals", sheets: ["Subcontractors", "Work Orders", "Machinery Assets", "Machinery Logs", "Sign-offs"] },
];

function makeTemplate() {
  const workbook = XLSX.utils.book_new();
  const guide = [
    ["RDx ERP Excel Import Template"],
    ["Instructions"],
    ["1. Fill only the module sheets you need; keep the header names unchanged."],
    ["2. Import order is Projects → Roads → Activities → BOQ → Inventory → GRN → DPR → e-MB → other sheets."],
    ["3. Use projectId / roadId / itemCode / materialCode / taskId exactly as entered in the related sheet."],
    ["4. Dates should use YYYY-MM-DD. Numeric values should not include currency symbols."],
    ["5. Duplicate unique codes are skipped and reported; correct the row and import again."],
    ["6. Employees: departmentCode and designationCode must match HR Masters. employmentType/status/payBasis must use the dropdown values shown in the HR module."],
    ["7. The Import button is admin-only. HR / Payroll Managers can bulk-upload employees from the HR Employee Master tab. Demo cleanup only targets project PRJ-NH-2026-01."],
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(guide), "Instructions");
  Object.entries(SHEET_COLUMNS).forEach(([sheet, columns]) => {
    const worksheet = XLSX.utils.aoa_to_sheet([columns, columns.map(() => "")]);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet);
  });
  XLSX.writeFile(workbook, "RDx_ERP_Import_Template.xlsx");
}

export default function ImportCenterPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [sheets, setSheets] = useState<Record<string, Record<string, unknown>[]>>({});
  const [parseError, setParseError] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof trpc.imports.execute.useMutation>>["data"]>();
  const importMutation = trpc.imports.execute.useMutation({
    onSuccess: (data) => {
      setResult(data);
      if (data.issues.length) toast.warning(`${data.imported} rows imported; ${data.issues.length} rows need correction.`);
      else toast.success(`${data.imported} rows imported successfully.`);
    },
    onError: (error) => toast.error(error.message || "Import failed"),
  });
  const clearDemoMutation = trpc.imports.clearDemo.useMutation({
    onSuccess: (data) => toast.success(data.message),
    onError: (error) => toast.error(error.message || "Demo cleanup failed"),
  });
  const cleanupRa01Mutation = trpc.measurements.cleanupWrongRa01.useMutation({
    onSuccess: (data) => toast.success(data.message || `Deleted ${data.deletedCount} wrong entries`),
    onError: (error) => toast.error(error.message || "Cleanup failed"),
  });

  const sheetCounts = useMemo(() => Object.entries(sheets).filter(([, rows]) => rows.length > 0), [sheets]);
  const totalRows = sheetCounts.reduce((sum, [, rows]) => sum + rows.length, 0);

  async function handleFile(file?: File) {
    if (!file) return;
    setFileName(file.name);
    setParseError("");
    setResult(undefined);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
      const parsed: Record<string, Record<string, unknown>[]> = {};
      workbook.SheetNames.forEach((name) => {
        if (!SHEET_COLUMNS[name]) return;
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[name], { defval: "", raw: false });
        parsed[name] = rows.filter((row) => Object.values(row).some((value) => String(value ?? "").trim() !== ""));
      });
      setSheets(parsed);
      if (!Object.values(parsed).some((rows) => rows.length)) setParseError("No filled module rows found. Download the template and enter at least one data row.");
    } catch (error) {
      setSheets({});
      setParseError(error instanceof Error ? error.message : "Could not read this Excel file.");
    }
  }

  function confirmClearDemo() {
    const confirmed = window.confirm("This will permanently remove the known demo project PRJ-NH-2026-01 and its linked demo records. Imported projects with other projectId values will not be changed. Continue?");
    if (confirmed) clearDemoMutation.mutate();
  }

  function confirmCleanupRa01() {
    const confirmed = window.confirm("This will permanently delete ALL e-MB entries with mbNo starting with 'RA-01-' (the wrong 10x import). RA-02-* entries will NOT be touched. BOQ executed quantities will be reversed. Continue?");
    if (confirmed) cleanupRa01Mutation.mutate();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 p-5 sm:p-7 text-white shadow-lg border border-slate-700">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300"><DatabaseZap className="w-3.5 h-3.5" /> Data onboarding center</div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight">Import your actual ERP data from Excel</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Prepare one workbook, upload it once, review the row summary, and the system will place each sheet in its correct module. Existing demo data stays untouched until you explicitly clear it.</p>
          </div>
          <button onClick={makeTemplate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 transition active:scale-[0.98]"><Download className="w-4 h-4" /> Download Excel Template</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div><h2 className="font-bold text-slate-900 flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Step 1 · Upload workbook</h2><p className="text-xs text-slate-500 mt-1">Supported: .xlsx, .xls, .csv · Maximum recommended size: 5 MB</p></div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">Admin import</span>
          </div>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
          <button onClick={() => inputRef.current?.click()} className="w-full rounded-xl border-2 border-dashed border-slate-300 hover:border-amber-400 hover:bg-amber-50/30 p-8 sm:p-12 transition text-center group">
            <UploadCloud className="w-10 h-10 mx-auto text-slate-400 group-hover:text-amber-500 transition" />
            <span className="mt-3 block text-sm font-bold text-slate-700">{fileName || "Choose your completed Excel workbook"}</span>
            <span className="mt-1 block text-xs text-slate-500">Click to browse from phone or computer</span>
          </button>
          {parseError && <div className="mt-3 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{parseError}</div>}
          {sheetCounts.length > 0 && <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-4"><div className="flex items-center justify-between mb-3"><span className="text-sm font-bold text-slate-800">Workbook preview</span><span className="text-xs font-semibold text-slate-500">{sheetCounts.length} sheets · {totalRows} rows</span></div><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{sheetCounts.map(([sheet, rows]) => <div key={sheet} className="rounded-lg bg-white border border-slate-200 px-3 py-2"><span className="text-[11px] font-bold text-slate-700 block truncate">{sheet}</span><span className="text-[10px] text-emerald-600">{rows.length} rows ready</span></div>)}</div></div>}
          <button disabled={!totalRows || importMutation.isPending} onClick={() => importMutation.mutate({ sheets })} className="mt-4 w-full rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 font-bold text-sm flex items-center justify-center gap-2 transition">{importMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing and validating...</> : <><FileUp className="w-4 h-4" /> Step 2 · Validate & import {totalRows ? `${totalRows} rows` : "workbook"}</>}</button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <h2 className="font-bold text-slate-900 flex items-center gap-2"><Info className="w-5 h-5 text-blue-600" /> How the mapping works</h2>
          <div className="mt-4 space-y-3 text-xs text-slate-600">
            <div className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /><span><strong>Projects → Roads:</strong> Roads use the exact `projectId` from Projects.</span></div>
            <div className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /><span><strong>DPR / e-MB:</strong> Use `taskId`, `itemCode` and `materialCode` instead of database numbers.</span></div>
            <div className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /><span><strong>Inventory / GRN:</strong> GRN materialCode links receipts to the Inventory sheet.</span></div>
            <div className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /><span><strong>Duplicates:</strong> Unique codes are reported row-by-row; successful rows remain imported.</span></div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-amber-900 flex gap-2"><ShieldAlert className="w-4 h-4 shrink-0" /><span>Import is restricted to admin accounts so ordinary users cannot overwrite project data by mistake.</span></div>
          </div>
          <div className="mt-5 border-t border-slate-100 pt-4"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Included modules</span><div className="mt-3 space-y-3">{moduleGroups.map((group) => <div key={group.label}><span className="text-[11px] font-bold text-slate-700">{group.label}</span><div className="mt-1 flex flex-wrap gap-1.5">{group.sheets.map((sheet) => <span key={sheet} className="rounded bg-slate-100 px-2 py-1 text-[10px] text-slate-600">{sheet}</span>)}</div></div>)}</div></div>
        </section>
      </div>

      {result && <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm"><h2 className="font-bold text-slate-900">Import result</h2><div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3"><div className="rounded-lg bg-emerald-50 p-3"><span className="text-[10px] text-emerald-700 block">Imported</span><strong className="text-xl text-emerald-900">{result.imported}</strong></div><div className="rounded-lg bg-amber-50 p-3"><span className="text-[10px] text-amber-700 block">Skipped</span><strong className="text-xl text-amber-900">{result.skipped}</strong></div><div className="rounded-lg bg-rose-50 p-3"><span className="text-[10px] text-rose-700 block">Issues</span><strong className="text-xl text-rose-900">{result.issues.length}</strong></div><div className="rounded-lg bg-slate-50 p-3"><span className="text-[10px] text-slate-600 block">Status</span><strong className="text-sm text-slate-900">{result.issues.length ? "Needs correction" : "Complete"}</strong></div></div>{result.issues.length > 0 && <div className="mt-4 max-h-64 overflow-auto rounded-lg border border-rose-100">{result.issues.map((issue, index) => <div key={`${issue.sheet}-${issue.row}-${index}`} className="border-b border-rose-100 last:border-0 px-3 py-2 text-xs text-rose-800"><strong>{issue.sheet}, row {issue.row}:</strong> {issue.message}</div>)}</div>}</section>}

      <section className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 sm:p-5"><div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div><h2 className="font-bold text-rose-900 flex items-center gap-2"><Trash2 className="w-5 h-5" /> Remove the known demo project</h2><p className="mt-1 text-xs leading-5 text-rose-800">This permanently removes only <code className="font-bold">PRJ-NH-2026-01</code> and its linked demo records. It will not touch imported projects with other project IDs. This action is admin-only.</p></div><button onClick={confirmClearDemo} disabled={clearDemoMutation.isPending} className="shrink-0 rounded-lg border border-rose-300 bg-white hover:bg-rose-100 text-rose-800 px-4 py-2.5 text-xs font-bold flex items-center gap-2">{clearDemoMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Clear demo data</button></div></section>

      <section className="rounded-xl border border-orange-200 bg-orange-50/60 p-4 sm:p-5"><div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div><h2 className="font-bold text-orange-900 flex items-center gap-2"><Trash2 className="w-5 h-5" /> Cleanup wrong RA-01 e-MB entries</h2><p className="mt-1 text-xs leading-5 text-orange-800">This permanently deletes all e-MB entries with mbNo starting <code className="font-bold">RA-01-</code> (the bad 10x import). <code className="font-bold">RA-02-*</code> entries are NOT touched. BOQ executed quantities are reversed. Admin-only.</p></div><button onClick={confirmCleanupRa01} disabled={cleanupRa01Mutation.isPending} className="shrink-0 rounded-lg border border-orange-300 bg-white hover:bg-orange-100 text-orange-800 px-4 py-2.5 text-xs font-bold flex items-center gap-2">{cleanupRa01Mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete RA-01 entries</button></div></section>
    </div>
  );
}
