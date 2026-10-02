import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileUp,
  FileText,
  MinusCircle,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Table,
  UserCheck,
  UserPlus,
  UsersRound,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useRole } from "../components/AppLayout";
import { exportBankPayoutCsv, generateEmployeePayslipPdf, generateMusterMatrixPdf } from "../lib/pdfReports";
import { trpc } from "../lib/trpc";

type Tab = "attendance" | "muster_matrix" | "leave" | "advances" | "payroll" | "payouts" | "labour_groups" | "employees" | "assignments" | "masters";
const employeeStatuses = ["Active", "On Leave", "Inactive", "Exited"] as const;
const employmentTypes = ["Staff", "Site Engineer", "Supervisor", "Operator", "Skilled Labour", "Unskilled Labour", "Contract", "Consultant"] as const;
const payBases = ["Monthly", "Daily", "Hourly"] as const;
const assignmentStatuses = ["Active", "Completed", "Cancelled"] as const;
const leaveTypes = ["Casual", "Sick", "Earned", "Unpaid", "Compensatory", "Other"] as const;
const adjustmentTypes = ["Advance", "Loan Recovery", "Allowance", "Bonus", "Fine", "Other"] as const;
const EMPLOYEE_IMPORT_COLUMNS = ["employeeCode", "fullName", "fatherName", "phone", "email", "dateOfBirth", "gender", "aadhaarLast4", "panReference", "address", "emergencyContactName", "emergencyContactPhone", "departmentCode", "designationCode", "employmentType", "joiningDate", "exitDate", "status", "payBasis", "basicRate", "overtimeRate", "bankName", "accountLast4", "ifscCode", "photoUrl", "documentReferences", "remarks"];

const emptyEmployee = {
  id: undefined,
  employeeCode: "",
  fullName: "",
  fatherName: "",
  phone: "",
  email: "",
  dateOfBirth: "",
  gender: "",
  aadhaarLast4: "",
  panReference: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  departmentId: "",
  designationId: "",
  employmentType: "Staff",
  joiningDate: new Date().toISOString().slice(0, 10),
  exitDate: "",
  status: "Active",
  payBasis: "Monthly",
  basicRate: "0.00",
  overtimeRate: "0.00",
  bankName: "",
  accountLast4: "",
  ifscCode: "",
  photoUrl: "",
  documentReferences: "",
  remarks: "",
};

const fieldClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100";
const labelClass = "text-[10px] font-bold uppercase tracking-wider text-slate-500";

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function formatMoney(value: number | string) {
  const n = typeof value === "string" ? Number(value) : value;
  return `₹${(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function HrPayrollPage() {
  const { role } = useRole();
  const canUseHr = role === "admin" || role === "hr_payroll_manager";
  const [tab, setTab] = useState<Tab>("attendance");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<number | undefined>();
  const [employeeForm, setEmployeeForm] = useState<any>(null);
  const employeeImportInputRef = useRef<HTMLInputElement>(null);
  const [employeeImportFileName, setEmployeeImportFileName] = useState("");
  const [employeeImportRows, setEmployeeImportRows] = useState<Record<string, unknown>[]>([]);
  const [employeeImportError, setEmployeeImportError] = useState("");
  const [employeeImportResult, setEmployeeImportResult] = useState<{ imported: number; skipped: number; issues: { row: number; message: string }[] }>();

  // Attendance state
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceRoadFilter, setAttendanceRoadFilter] = useState<string>("");
  const [quickOvertimeHours, setQuickOvertimeHours] = useState<Record<number, string>>({});

  // Leave state
  const [leaveEmployeeId, setLeaveEmployeeId] = useState<string>("");
  const [leaveType, setLeaveType] = useState<string>("Casual");
  const [leaveFrom, setLeaveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [leaveTo, setLeaveTo] = useState(new Date().toISOString().slice(0, 10));
  const [leaveDays, setLeaveDays] = useState("1.00");
  const [leaveReason, setLeaveReason] = useState("");

  // Payroll state
  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [selectedPayrollMonth, setSelectedPayrollMonth] = useState(currentMonthStr);
  const [activePayrollRunId, setActivePayrollRunId] = useState<number | undefined>();

  // Advances & Adjustments state (Phase 3)
  const [adjEmployeeId, setAdjEmployeeId] = useState<string>("");
  const [adjMonth, setAdjMonth] = useState(currentMonthStr);
  const [adjType, setAdjType] = useState<string>("Advance");
  const [adjTitle, setAdjTitle] = useState("");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjRemarks, setAdjRemarks] = useState("");

  // Phase 4 States: Muster Matrix & Payout Batches & Labour Settlements
  const [matrixMonth, setMatrixMonth] = useState(currentMonthStr);
  const [matrixRoadFilter, setMatrixRoadFilter] = useState<string>("");
  const [selectedPayoutBatchId, setSelectedPayoutBatchId] = useState<number | undefined>();

  // Labour Group Settlement form state
  const [settlementProject, setSettlementProject] = useState<string>("");
  const [settlementRoad, setSettlementRoad] = useState<string>("");
  const [settlementGroup, setSettlementGroup] = useState<string>("");
  const [settlementContractor, setSettlementContractor] = useState<string>("");
  const [settlementFrom, setSettlementFrom] = useState(new Date().toISOString().slice(0, 10));
  const [settlementTo, setSettlementTo] = useState(new Date().toISOString().slice(0, 10));
  const [settlementLabourCount, setSettlementLabourCount] = useState<number>(12);
  const [settlementManDays, setSettlementManDays] = useState<string>("72.00");
  const [settlementRate, setSettlementRate] = useState<string>("450.00");
  const [settlementAdvance, setSettlementAdvance] = useState<string>("3000.00");
  const [settlementRemarks, setSettlementRemarks] = useState<string>("");

  // Assignment and master states
  const [assignmentEmployeeId, setAssignmentEmployeeId] = useState("");
  const [assignmentProjectId, setAssignmentProjectId] = useState("");
  const [assignmentRoadId, setAssignmentRoadId] = useState("");
  const [assignmentRole, setAssignmentRole] = useState("");
  const [assignmentStart, setAssignmentStart] = useState(new Date().toISOString().slice(0, 10));
  const [assignmentEnd, setAssignmentEnd] = useState("");
  const [assignmentStatus, setAssignmentStatus] = useState("Active");
  const [departmentCode, setDepartmentCode] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [designationCode, setDesignationCode] = useState("");
  const [designationName, setDesignationName] = useState("");
  const [designationGrade, setDesignationGrade] = useState("");

  const employeeInput = useMemo(() => ({ search: search || undefined, status: statusFilter === "all" ? undefined : statusFilter }), [search, statusFilter]);
  const { data: summary } = trpc.hr.summary.useQuery(undefined, { enabled: canUseHr });
  const { data: employees, isLoading: employeesLoading } = trpc.hr.employees.useQuery(employeeInput, { enabled: canUseHr });
  const { data: departments } = trpc.hr.departments.useQuery(undefined, { enabled: canUseHr });
  const { data: designations } = trpc.hr.designations.useQuery(undefined, { enabled: canUseHr });
  const { data: projects } = trpc.hr.projects.useQuery(undefined, { enabled: canUseHr });
  const projectInput = useMemo(() => assignmentProjectId ? { projectId: Number(assignmentProjectId) } : undefined, [assignmentProjectId]);
  const { data: roads } = trpc.hr.roads.useQuery(projectInput, { enabled: canUseHr && Boolean(assignmentProjectId) });

  const assignmentInput = useMemo(() => assignmentEmployeeId ? { employeeId: Number(assignmentEmployeeId) } : undefined, [assignmentEmployeeId]);
  const { data: assignments } = trpc.hr.assignments.useQuery(assignmentInput, { enabled: canUseHr && Boolean(assignmentEmployeeId) });

  // Phase 2, 3 & 4 queries
  const attendanceQueryInput = useMemo(() => ({ date: attendanceDate, roadId: attendanceRoadFilter ? Number(attendanceRoadFilter) : undefined }), [attendanceDate, attendanceRoadFilter]);
  const { data: attendanceList } = trpc.hr.attendanceList.useQuery(attendanceQueryInput, { enabled: canUseHr });
  const { data: leaveRequests } = trpc.hr.leaveRequests.useQuery(undefined, { enabled: canUseHr });
  const { data: payrollRuns } = trpc.hr.payrollRuns.useQuery(undefined, { enabled: canUseHr });
  const currentRunId = activePayrollRunId || payrollRuns?.[0]?.id;
  const { data: payrollLines } = trpc.hr.payrollLines.useQuery({ payrollRunId: currentRunId || 0 }, { enabled: canUseHr && Boolean(currentRunId) });
  const { data: adjustmentsList } = trpc.hr.adjustments.useQuery(undefined, { enabled: canUseHr });

  // Phase 4 queries
  const { data: payoutBatches } = trpc.hr.payoutBatches.useQuery(undefined, { enabled: canUseHr });
  const activeBatchId = selectedPayoutBatchId || payoutBatches?.[0]?.batch.id;
  const { data: payoutLines } = trpc.hr.payoutLines.useQuery({ payoutBatchId: activeBatchId || 0 }, { enabled: canUseHr && Boolean(activeBatchId) });
  const musterMatrixInput = useMemo(() => ({ month: matrixMonth, roadId: matrixRoadFilter ? Number(matrixRoadFilter) : undefined }), [matrixMonth, matrixRoadFilter]);
  const { data: musterMatrixData, isLoading: matrixLoading } = trpc.hr.musterMatrix.useQuery(musterMatrixInput, { enabled: canUseHr && tab === "muster_matrix" });
  const { data: groupSettlements } = trpc.hr.groupSettlements.useQuery(undefined, { enabled: canUseHr });

  const utils = trpc.useUtils();
  const refreshHr = async () => {
    await Promise.all([
      utils.hr.summary.invalidate(),
      utils.hr.employees.invalidate(),
      utils.hr.departments.invalidate(),
      utils.hr.designations.invalidate(),
      utils.hr.assignments.invalidate(),
      utils.hr.attendanceList.invalidate(),
      utils.hr.leaveRequests.invalidate(),
      utils.hr.payrollRuns.invalidate(),
      utils.hr.payrollLines.invalidate(),
      utils.hr.adjustments.invalidate(),
      utils.hr.payoutBatches.invalidate(),
      utils.hr.payoutLines.invalidate(),
      utils.hr.musterMatrix.invalidate(),
      utils.hr.groupSettlements.invalidate(),
    ]);
  };

  const createEmployee = trpc.hr.createEmployee.useMutation({ onSuccess: async () => { await refreshHr(); toast.success("Employee added to HR master"); setEmployeeForm(null); }, onError: (e) => toast.error(e.message) });
  const updateEmployee = trpc.hr.updateEmployee.useMutation({ onSuccess: async () => { await refreshHr(); toast.success("Employee master updated"); setEmployeeForm(null); }, onError: (e) => toast.error(e.message) });
  const bulkImportEmployees = trpc.hr.bulkImportEmployees.useMutation({
    onSuccess: async (data) => {
      await refreshHr();
      setEmployeeImportResult({ imported: data.imported, skipped: data.skipped, issues: data.issues.map((issue) => ({ row: issue.row, message: issue.message })) });
      if (data.issues.length) toast.warning(`${data.imported} employees imported; ${data.issues.length} rows need correction.`);
      else toast.success(`${data.imported} employees imported successfully.`);
    },
    onError: (e) => toast.error(e.message || "Employee import failed"),
  });
  const createAssignment = trpc.hr.createAssignment.useMutation({ onSuccess: async () => { await refreshHr(); toast.success("Project/road assignment saved"); }, onError: (e) => toast.error(e.message) });
  const createDepartment = trpc.hr.createDepartment.useMutation({ onSuccess: async () => { await refreshHr(); toast.success("Department added"); setDepartmentCode(""); setDepartmentName(""); }, onError: (e) => toast.error(e.message) });
  const createDesignation = trpc.hr.createDesignation.useMutation({ onSuccess: async () => { await refreshHr(); toast.success("Designation added"); setDesignationCode(""); setDesignationName(""); setDesignationGrade(""); }, onError: (e) => toast.error(e.message) });

  // Phase 2 mutations
  const markAttendance = trpc.hr.markAttendance.useMutation({ onSuccess: async () => { await refreshHr(); toast.success("Attendance updated"); }, onError: (e) => toast.error(e.message) });
  const createLeave = trpc.hr.createLeaveRequest.useMutation({ onSuccess: async () => { await refreshHr(); toast.success("Leave request submitted"); setLeaveReason(""); }, onError: (e) => toast.error(e.message) });
  const updateLeaveStatus = trpc.hr.updateLeaveStatus.useMutation({ onSuccess: async () => { await refreshHr(); toast.success("Leave status updated"); }, onError: (e) => toast.error(e.message) });
  const generatePayroll = trpc.hr.generateMonthlyPayroll.useMutation({
    onSuccess: async (data) => {
      await refreshHr();
      setActivePayrollRunId(data.payrollRunId);
      toast.success(`Draft generated for ${data.payrollMonth} (${data.employeeCount} staff)`);
    },
    onError: (e) => toast.error(e.message),
  });
  const approvePayroll = trpc.hr.approvePayrollRun.useMutation({ onSuccess: async () => { await refreshHr(); toast.success("Monthly payroll approved"); }, onError: (e) => toast.error(e.message) });

  // Phase 3 mutations
  const createAdjustment = trpc.hr.createAdjustment.useMutation({
    onSuccess: async () => {
      await refreshHr();
      toast.success("Adjustment / Advance recorded");
      setAdjTitle("");
      setAdjAmount("");
      setAdjRemarks("");
    },
    onError: (e) => toast.error(e.message),
  });

  // Phase 4 mutations
  const generatePayoutBatch = trpc.hr.generatePayoutBatch.useMutation({
    onSuccess: async (data) => {
      await refreshHr();
      setSelectedPayoutBatchId(data.id);
      toast.success(`Payout batch ${data.batchReference} ready (${data.employeeCount} staff)`);
    },
    onError: (e) => toast.error(e.message),
  });

  const updatePayoutStatus = trpc.hr.updatePayoutBatchStatus.useMutation({
    onSuccess: async () => {
      await refreshHr();
      toast.success("Bank payout status updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const createGroupSettlement = trpc.hr.createGroupSettlement.useMutation({
    onSuccess: async () => {
      await refreshHr();
      toast.success("Labour gang wage settlement submitted");
      setSettlementGroup("");
      setSettlementContractor("");
      setSettlementRemarks("");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateSettlementStatus = trpc.hr.updateGroupSettlementStatus.useMutation({
    onSuccess: async () => {
      await refreshHr();
      toast.success("Settlement approval status updated");
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (!assignmentEmployeeId && employees?.[0]?.employee.id) setAssignmentEmployeeId(String(employees[0].employee.id));
    if (!leaveEmployeeId && employees?.[0]?.employee.id) setLeaveEmployeeId(String(employees[0].employee.id));
    if (!adjEmployeeId && employees?.[0]?.employee.id) setAdjEmployeeId(String(employees[0].employee.id));
    if (!settlementProject && projects?.[0]?.id) setSettlementProject(String(projects[0].id));
  }, [employees, projects, assignmentEmployeeId, leaveEmployeeId, adjEmployeeId, settlementProject]);

  const setEmployee = (key: string, value: string) => setEmployeeForm((current: any) => ({ ...current, [key]: value }));
  const beginEdit = (employee: any) => setEmployeeForm({ ...employee, departmentId: employee.departmentId ? String(employee.departmentId) : "", designationId: employee.designationId ? String(employee.designationId) : "", gender: employee.gender || "", exitDate: employee.exitDate || "", email: employee.email || "", basicRate: String(employee.basicRate || "0.00"), overtimeRate: String(employee.overtimeRate || "0.00"), remarks: employee.remarks || "", address: employee.address || "", documentReferences: employee.documentReferences || "" });
  const employeePayload = (form: any) => ({
    employeeCode: form.employeeCode, fullName: form.fullName, fatherName: form.fatherName || null, phone: form.phone || null, email: form.email || "", dateOfBirth: form.dateOfBirth || null, gender: form.gender || null, aadhaarLast4: form.aadhaarLast4 || null, panReference: form.panReference || null, address: form.address || null, emergencyContactName: form.emergencyContactName || null, emergencyContactPhone: form.emergencyContactPhone || null, departmentId: form.departmentId ? Number(form.departmentId) : null, designationId: form.designationId ? Number(form.designationId) : null, employmentType: form.employmentType, joiningDate: form.joiningDate, exitDate: form.exitDate || null, status: form.status, payBasis: form.payBasis, basicRate: String(form.basicRate || "0"), overtimeRate: String(form.overtimeRate || "0"), bankName: form.bankName || null, accountLast4: form.accountLast4 || null, ifscCode: form.ifscCode || null, photoUrl: form.photoUrl || null, documentReferences: form.documentReferences || null, remarks: form.remarks || null,
  });

  const activePayrollRun = payrollRuns?.find((r) => r.id === currentRunId);
  const activeBatch = payoutBatches?.find((b) => b.batch.id === activeBatchId);

  // Map attendance by employeeId for muster roll
  const attendanceMap = useMemo(() => {
    const map = new Map<number, any>();
    attendanceList?.forEach((row) => map.set(row.attendance.employeeId, row.attendance));
    return map;
  }, [attendanceList]);

  // Phase 3: Download Payslip PDF Handler
  const handleDownloadPayslip = async (payrollRunId: number, employeeId: number) => {
    try {
      toast.info("Generating employee pay slip PDF...");
      const slipData = await utils.client.hr.payslip.query({ payrollRunId, employeeId });
      generateEmployeePayslipPdf({
        companyName: "Shri Sai Associates Raigarh",
        projectName: "PMGSY-IV Batch-I",
        packageNo: "CG 16-201",
        month: slipData.run.payrollMonth,
        employeeCode: slipData.employee.employeeCode,
        employeeName: slipData.employee.fullName,
        fatherName: slipData.employee.fatherName || undefined,
        department: slipData.department?.name || undefined,
        designation: slipData.designation?.name || slipData.employee.employmentType,
        employmentType: slipData.employee.employmentType,
        joiningDate: slipData.employee.joiningDate,
        payBasis: slipData.employee.payBasis,
        bankName: slipData.employee.bankName || undefined,
        accountLast4: slipData.employee.accountLast4 || undefined,
        ifscCode: slipData.employee.ifscCode || undefined,
        panReference: slipData.employee.panReference || undefined,
        payableDays: String(slipData.line.payableDays),
        absentDays: String(slipData.line.absentDays),
        overtimeHours: String(slipData.line.overtimeHours),
        basicRate: String(slipData.employee.basicRate),
        basicEarned: String(slipData.line.basicAmount),
        overtimeAmount: String(slipData.line.overtimeAmount),
        allowanceAmount: String(slipData.line.allowanceAmount),
        deductionAmount: String(slipData.line.deductionAmount),
        grossAmount: String(slipData.line.grossAmount),
        netAmount: String(slipData.line.netAmount),
        adjustments: slipData.adjustments.map((a) => ({ title: a.title, type: a.adjustmentType, amount: String(a.amount) })),
      });
      toast.success(`Payslip for ${slipData.employee.fullName} downloaded.`);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate payslip");
    }
  };

  // Phase 4: Download Bank NEFT CSV
  const handleDownloadBankCsv = (batch: any, lines: any[]) => {
    if (!lines?.length) return toast.error("No payout lines available");
    const csvRows = lines.map((l) => ({
      beneficiaryName: l.line.beneficiaryName,
      accountNumber: l.employee?.accountLast4 ? `XXXXXX${l.employee.accountLast4}` : "Account Pending",
      ifscCode: l.line.ifscCode || "SBIN0001234",
      bankName: l.line.bankName || "State Bank of India",
      amount: String(l.line.amount),
      employeeCode: l.employee?.employeeCode || "EMP",
      narration: `Salary ${batch?.run?.payrollMonth || "Payroll"}`,
    }));
    exportBankPayoutCsv(batch.batch.batchReference, csvRows);
    updatePayoutStatus.mutate({ id: batch.batch.id, status: "Exported" });
    toast.success("NEFT Bank Payout CSV file exported successfully.");
  };

  // Phase 4: Download Muster Roll Matrix PDF
  const handleDownloadMusterPdf = () => {
    if (!musterMatrixData || !musterMatrixData.matrix.length) return toast.error("No muster roll data for this month");
    generateMusterMatrixPdf({
      projectName: "PMGSY-IV Batch-I (CG 16-201)",
      month: matrixMonth,
      days: musterMatrixData.days,
      matrix: musterMatrixData.matrix.map((m) => ({
        code: m.employee.employeeCode,
        name: m.employee.fullName,
        role: m.designation,
        present: m.presentCount,
        halfDay: m.halfDayCount,
        absent: m.absentCount,
        ot: m.totalOt,
        payable: m.payableDays,
        daysMap: m.dayMap,
      })),
    });
    toast.success("Monthly Muster Matrix PDF exported.");
  };

  // Gross & Net calculation for settlement
  const computedGrossSettlement = useMemo(() => {
    const md = Number(settlementManDays) || 0;
    const rate = Number(settlementRate) || 0;
    return md * rate;
  }, [settlementManDays, settlementRate]);

  const computedNetSettlement = useMemo(() => {
    const adv = Number(settlementAdvance) || 0;
    return Math.max(0, computedGrossSettlement - adv);
  }, [computedGrossSettlement, settlementAdvance]);

  const downloadEmployeeTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const instructions = [
      ["RDx ERP Employee Master Bulk Upload"],
      ["Fill one employee per row. Keep the header names unchanged."],
      ["Required: employeeCode, fullName, joiningDate."],
      ["departmentCode and designationCode must match HR Masters (for example SITE, QA, STR-ENG, QC-ENG, SUP)."],
      ["employmentType: Staff, Site Engineer, Supervisor, Operator, Skilled Labour, Unskilled Labour, Contract, Consultant."],
      ["status: Active, On Leave, Inactive, Exited. payBasis: Monthly, Daily, Hourly."],
      ["Use only last 4 digits for aadhaarLast4 and accountLast4. Do not upload full Aadhaar or bank account numbers."],
      ["Duplicate employeeCode rows are skipped and shown in the row-wise validation report."],
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(instructions), "Instructions");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([EMPLOYEE_IMPORT_COLUMNS, EMPLOYEE_IMPORT_COLUMNS.map(() => "")]), "Employees");
    XLSX.writeFile(workbook, "RDx_Employee_Master_Bulk_Template.xlsx");
  };

  const handleEmployeeImportFile = async (file?: File) => {
    if (!file) return;
    setEmployeeImportFileName(file.name);
    setEmployeeImportError("");
    setEmployeeImportResult(undefined);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
      const sheetName = workbook.SheetNames.includes("Employees") ? "Employees" : workbook.SheetNames.find((name) => name !== "Instructions");
      if (!sheetName || !workbook.Sheets[sheetName]) throw new Error("Employees sheet not found. Download the latest Employee Master template.");
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: "", raw: false })
        .map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [String(key).trim(), value])))
        .filter((row) => Object.values(row).some((value) => String(value ?? "").trim() !== ""));
      const missingHeaders = ["employeeCode", "fullName", "joiningDate"].filter((key) => !(key in (rows[0] || {})));
      if (missingHeaders.length) throw new Error(`Missing required header(s): ${missingHeaders.join(", ")}`);
      if (!rows.length) throw new Error("No employee rows found. Add at least one employee below the header row.");
      if (rows.length > 2000) throw new Error("Maximum 2,000 employees per upload. Split the workbook into smaller files.");
      setEmployeeImportRows(rows);
    } catch (error) {
      setEmployeeImportRows([]);
      setEmployeeImportError(error instanceof Error ? error.message : "Could not read this employee workbook.");
    }
  };

  const submitEmployeeImport = () => {
    if (!employeeImportRows.length) return toast.error("Choose a valid Employee workbook first");
    bulkImportEmployees.mutate({ rows: employeeImportRows });
  };

  if (!canUseHr) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto h-10 w-10 text-rose-500" />
          <h1 className="mt-4 text-xl font-black text-slate-900">HR permission required</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">इस module के लिए Admin या HR / Payroll Manager role चाहिए।</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-cyan-950 via-slate-900 to-slate-800 p-5 sm:p-7 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-cyan-300">
              <UsersRound className="h-3.5 w-3.5" /> HR & Payroll Phase 4
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight">Road Project HR & Payroll</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Muster Roll Matrix, NEFT Bank Payout Files, Individual Pay Slips और Labour Gang Wage Settlements.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => refreshHr()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Metric icon={UsersRound} label="Total staff" value={summary?.totalEmployees ?? 0} tone="cyan" />
        <Metric icon={CheckCircle2} label="Active" value={summary?.activeEmployees ?? 0} tone="emerald" />
        <Metric icon={Table} label="Muster roll" value={`${musterMatrixData?.matrix.length || summary?.activeEmployees || 0} Staff`} tone="blue" />
        <Metric icon={CircleDollarSign} label="Monthly base" value={formatMoney(summary?.monthlyPayrollBase ?? 0)} tone="violet" />
        <Metric icon={Send} label="Payout batches" value={payoutBatches?.length ?? 0} tone="rose" />
        <Metric icon={UsersRound} label="Labour gangs" value={groupSettlements?.length ?? 0} tone="amber" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 p-2">
          {([
            ["attendance", "Daily Muster Roll", CalendarCheck],
            ["muster_matrix", "Muster Roll Matrix", Table],
            ["leave", "Leave Approvals", FileCheck],
            ["advances", "Advances & Deductions", Wallet],
            ["payroll", "Monthly Salary Sheet & Slips", CircleDollarSign],
            ["payouts", "Bank Payout Batches", Send],
            ["labour_groups", "Labour Gang Settlements", UsersRound],
            ["employees", "Employee Master", UsersRound],
            ["assignments", "Project Assignments", BriefcaseBusiness],
            ["masters", "HR Masters", Building2],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
                tab === id ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:bg-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* TAB 1: DAILY MUSTER ROLL */}
        {tab === "attendance" && (
          <div className="p-5 sm:p-7 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-lg font-black text-slate-900">Site Daily Muster Roll</h2>
                <p className="mt-1 text-xs text-slate-500">प्रत्येक कर्मचारी की उपस्थिति (Present / Absent / Half Day) और Overtime दर्ज करें।</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Field label="Attendance date">
                  <input
                    type="date"
                    className={`${fieldClass} w-44`}
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                  />
                </Field>
                <Field label="Filter road">
                  <select
                    className={`${fieldClass} w-48`}
                    value={attendanceRoadFilter}
                    onChange={(e) => setAttendanceRoadFilter(e.target.value)}
                  >
                    <option value="">All project roads</option>
                    {roads?.map((r) => (
                      <option key={r.id} value={r.id}>{r.roadId} · {r.roadName}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            <div className="overflow-auto boq-table-scroll" style={{ maxHeight: "60vh" }}>
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-3">Employee</th>
                    <th className="px-3 py-3">Role / Dept</th>
                    <th className="px-3 py-3">Pay Basis</th>
                    <th className="px-3 py-3 text-center">Status on {attendanceDate}</th>
                    <th className="px-3 py-3">Overtime (Hrs)</th>
                    <th className="px-3 py-3">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees?.map(({ employee, department, designation }) => {
                    const currentRecord = attendanceMap.get(employee.id);
                    const currentStatus = currentRecord?.status || "Present";
                    const currentOt = quickOvertimeHours[employee.id] ?? (currentRecord?.overtimeHours || "0.00");

                    return (
                      <tr key={employee.id} className="hover:bg-slate-50/70">
                        <td className="px-3 py-3">
                          <div className="font-mono text-xs font-bold text-slate-500">{employee.employeeCode}</div>
                          <div className="font-bold text-slate-900">{employee.fullName}</div>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-600">
                          <div>{designation?.name || employee.employmentType}</div>
                          <div className="text-[10px] text-slate-400">{department?.name || "General"}</div>
                        </td>
                        <td className="px-3 py-3 text-xs">
                          <span className="font-semibold text-slate-700">{employee.payBasis}</span>
                          <div className="text-[10px] text-slate-400">{formatMoney(employee.basicRate)}</div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="inline-flex gap-1 bg-slate-100 p-1 rounded-lg">
                            {(["Present", "Half Day", "Absent", "On Leave"] as const).map((st) => (
                              <button
                                key={st}
                                onClick={() =>
                                  markAttendance.mutate({
                                    employeeId: employee.id,
                                    attendanceDate,
                                    status: st,
                                    overtimeHours: currentOt,
                                  })
                                }
                                className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
                                  currentStatus === st
                                    ? st === "Present"
                                      ? "bg-emerald-600 text-white shadow"
                                      : st === "Half Day"
                                      ? "bg-amber-600 text-white shadow"
                                      : st === "Absent"
                                      ? "bg-rose-600 text-white shadow"
                                      : "bg-slate-800 text-white shadow"
                                    : "text-slate-600 hover:bg-white"
                                }`}
                              >
                                {st === "Half Day" ? "Half" : st}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            className="w-20 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-cyan-400"
                            value={currentOt}
                            onChange={(e) =>
                              setQuickOvertimeHours((prev) => ({ ...prev, [employee.id]: e.target.value }))
                            }
                            onBlur={() => {
                              if (quickOvertimeHours[employee.id] !== undefined) {
                                markAttendance.mutate({
                                  employeeId: employee.id,
                                  attendanceDate,
                                  status: currentStatus,
                                  overtimeHours: quickOvertimeHours[employee.id],
                                });
                              }
                            }}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-[11px] font-semibold text-emerald-600">
                            {currentRecord ? "Recorded ✓" : "Default: Present"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: MUSTER ROLL MATRIX */}
        {tab === "muster_matrix" && (
          <div className="p-5 sm:p-7 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-lg font-black text-slate-900">Monthly Muster Roll Matrix</h2>
                <p className="mt-1 text-xs text-slate-500">
                  माह की 1 से 30/31 तारीख तक की पूरी उपस्थिति शीट (P/A/HD/WO/L) और 1-क्लिक Landscape PDF Export।
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Field label="Month">
                  <input
                    type="month"
                    className={`${fieldClass} w-40`}
                    value={matrixMonth}
                    onChange={(e) => setMatrixMonth(e.target.value)}
                  />
                </Field>
                <button
                  onClick={handleDownloadMusterPdf}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
                >
                  <Download className="h-4 w-4 text-cyan-400" /> Download Matrix PDF
                </button>
              </div>
            </div>

            {matrixLoading ? (
              <p className="p-8 text-center text-sm text-slate-500">Loading monthly muster matrix...</p>
            ) : !musterMatrixData || !musterMatrixData.matrix.length ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                No active staff found for month {matrixMonth}.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-center text-xs">
                  <thead className="bg-slate-900 text-white font-bold">
                    <tr>
                      <th className="px-3 py-2.5 text-left min-w-[120px]">Employee</th>
                      <th className="px-2 py-2.5 text-left min-w-[90px]">Role</th>
                      {musterMatrixData.days.map((d) => (
                        <th key={d} className="px-1.5 py-2.5 text-[10px] font-mono border-l border-slate-800">
                          {d.slice(-2)}
                        </th>
                      ))}
                      <th className="px-2 py-2.5 bg-emerald-950 text-emerald-300">P</th>
                      <th className="px-2 py-2.5 bg-amber-950 text-amber-300">HD</th>
                      <th className="px-2 py-2.5 bg-rose-950 text-rose-300">A</th>
                      <th className="px-2 py-2.5 bg-cyan-950 text-cyan-300">OT</th>
                      <th className="px-2.5 py-2.5 bg-slate-800 text-amber-400 font-black">Payable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {musterMatrixData.matrix.map((row) => (
                      <tr key={row.employee.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-left">
                          <div className="font-bold text-slate-900">{row.employee.fullName}</div>
                          <div className="font-mono text-[10px] text-slate-400">{row.employee.employeeCode}</div>
                        </td>
                        <td className="px-2 py-2 text-left text-[11px] text-slate-600">{row.designation}</td>
                        {musterMatrixData.days.map((d) => {
                          const val = row.dayMap[d] || "—";
                          return (
                            <td
                              key={d}
                              className={`px-1.5 py-2 font-mono text-[10px] font-bold border-l border-slate-100 ${
                                val === "P"
                                  ? "text-emerald-700 bg-emerald-50/40"
                                  : val === "HD"
                                  ? "text-amber-700 bg-amber-50/40"
                                  : val === "A"
                                  ? "text-rose-700 bg-rose-50/40"
                                  : val === "WO" || val === "H"
                                  ? "text-blue-700 bg-blue-50/40"
                                  : "text-slate-300"
                              }`}
                            >
                              {val}
                            </td>
                          );
                        })}
                        <td className="px-2 py-2 font-bold text-emerald-700 bg-emerald-50/30">{row.presentCount}</td>
                        <td className="px-2 py-2 font-bold text-amber-700 bg-amber-50/30">{row.halfDayCount}</td>
                        <td className="px-2 py-2 font-bold text-rose-700 bg-rose-50/30">{row.absentCount}</td>
                        <td className="px-2 py-2 font-bold text-cyan-700 bg-cyan-50/30">{row.totalOt}h</td>
                        <td className="px-2.5 py-2 font-black text-slate-900 bg-slate-50">{row.payableDays}d</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ADVANCES & DEDUCTIONS */}
        {tab === "advances" && (
          <div className="p-5 sm:p-7 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
              <div className="rounded-xl border border-slate-200 p-5 bg-slate-50/50">
                <h2 className="text-base font-black text-slate-900">Record Salary Advance / Deduction</h2>
                <p className="mt-1 text-xs text-slate-500">Site staff advance, tool damage fine, or allowance ledger दर्ज करें।</p>
                <div className="mt-4 space-y-3">
                  <Field label="Employee">
                    <select
                      className={fieldClass}
                      value={adjEmployeeId}
                      onChange={(e) => setAdjEmployeeId(e.target.value)}
                    >
                      {employees?.map(({ employee }) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.employeeCode} · {employee.fullName}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Payroll month">
                    <input
                      type="month"
                      className={fieldClass}
                      value={adjMonth}
                      onChange={(e) => setAdjMonth(e.target.value)}
                    />
                  </Field>
                  <Field label="Adjustment type">
                    <select
                      className={fieldClass}
                      value={adjType}
                      onChange={(e) => setAdjType(e.target.value)}
                    >
                      {adjustmentTypes.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Title / Description">
                    <input
                      className={fieldClass}
                      placeholder="e.g. Festival Advance, Mess recovery, Travel allowance"
                      value={adjTitle}
                      onChange={(e) => setAdjTitle(e.target.value)}
                    />
                  </Field>
                  <Field label="Amount (₹)">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      className={fieldClass}
                      placeholder="0.00"
                      value={adjAmount}
                      onChange={(e) => setAdjAmount(e.target.value)}
                    />
                  </Field>
                  <Field label="Remarks">
                    <textarea
                      rows={2}
                      className={fieldClass}
                      placeholder="Approved by Project Manager / voucher number..."
                      value={adjRemarks}
                      onChange={(e) => setAdjRemarks(e.target.value)}
                    />
                  </Field>
                  <button
                    onClick={() => {
                      if (!adjEmployeeId || !adjTitle || !adjAmount) return toast.error("Please fill all required fields");
                      createAdjustment.mutate({
                        employeeId: Number(adjEmployeeId),
                        payrollMonth: adjMonth,
                        adjustmentType: adjType as any,
                        title: adjTitle,
                        amount: adjAmount,
                        remarks: adjRemarks || null,
                      });
                    }}
                    disabled={createAdjustment.isPending}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-800 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" /> Save Entry
                  </button>
                </div>
              </div>

              <div>
                <h2 className="text-base font-black text-slate-900">Advances & Deductions Ledger</h2>
                <p className="mt-1 text-xs text-slate-500">Approved records automatically calculate in monthly net salary.</p>
                {!adjustmentsList?.length ? (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                    No advance or deduction entries found.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {adjustmentsList.map(({ adjustment, employee }) => (
                      <div
                        key={adjustment.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{employee?.fullName}</span>
                            <span className="text-xs font-mono text-slate-400">({employee?.employeeCode})</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                adjustment.adjustmentType === "Allowance" || adjustment.adjustmentType === "Bonus"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {adjustment.adjustmentType}
                            </span>
                          </div>
                          <div className="mt-1 text-xs font-semibold text-slate-800">{adjustment.title}</div>
                          <div className="mt-0.5 text-[11px] text-slate-400">
                            Month: {adjustment.payrollMonth} {adjustment.remarks ? `· ${adjustment.remarks}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`text-base font-black ${
                            adjustment.adjustmentType === "Allowance" || adjustment.adjustmentType === "Bonus"
                              ? "text-emerald-700"
                              : "text-rose-700"
                          }`}>
                            {adjustment.adjustmentType === "Allowance" || adjustment.adjustmentType === "Bonus" ? "+" : "-"}
                            {formatMoney(adjustment.amount)}
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                              adjustment.status === "Approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : adjustment.status === "Applied"
                                ? "bg-cyan-100 text-cyan-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {adjustment.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: LEAVE APPROVALS */}
        {tab === "leave" && (
          <div className="p-5 sm:p-7 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
              <div className="rounded-xl border border-slate-200 p-5 bg-slate-50/50">
                <h2 className="text-base font-black text-slate-900">Apply Leave Request</h2>
                <p className="mt-1 text-xs text-slate-500">Site staff या supervisor के लिए leave apply करें।</p>
                <div className="mt-4 space-y-3">
                  <Field label="Employee">
                    <select
                      className={fieldClass}
                      value={leaveEmployeeId}
                      onChange={(e) => setLeaveEmployeeId(e.target.value)}
                    >
                      {employees?.map(({ employee }) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.employeeCode} · {employee.fullName}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Leave type">
                    <select
                      className={fieldClass}
                      value={leaveType}
                      onChange={(e) => setLeaveType(e.target.value)}
                    >
                      {leaveTypes.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="From date">
                      <input
                        type="date"
                        className={fieldClass}
                        value={leaveFrom}
                        onChange={(e) => setLeaveFrom(e.target.value)}
                      />
                    </Field>
                    <Field label="To date">
                      <input
                        type="date"
                        className={fieldClass}
                        value={leaveTo}
                        onChange={(e) => setLeaveTo(e.target.value)}
                      />
                    </Field>
                  </div>
                  <Field label="Total days">
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      className={fieldClass}
                      value={leaveDays}
                      onChange={(e) => setLeaveDays(e.target.value)}
                    />
                  </Field>
                  <Field label="Reason">
                    <textarea
                      rows={2}
                      className={fieldClass}
                      placeholder="Medical, family emergency, festival..."
                      value={leaveReason}
                      onChange={(e) => setLeaveReason(e.target.value)}
                    />
                  </Field>
                  <button
                    onClick={() => {
                      if (!leaveEmployeeId) return toast.error("Select employee");
                      createLeave.mutate({
                        employeeId: Number(leaveEmployeeId),
                        leaveType: leaveType as any,
                        fromDate: leaveFrom,
                        toDate: leaveTo,
                        totalDays: leaveDays,
                        reason: leaveReason || null,
                      });
                    }}
                    disabled={createLeave.isPending}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-800 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" /> Submit Request
                  </button>
                </div>
              </div>

              <div>
                <h2 className="text-base font-black text-slate-900">Leave Requests & Approvals</h2>
                <p className="mt-1 text-xs text-slate-500">Site in-charge या HR Manager approval workflow</p>
                {!leaveRequests?.length ? (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                    No leave requests found.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {leaveRequests.map(({ leave, employee }) => (
                      <div
                        key={leave.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{employee?.fullName}</span>
                            <span className="text-xs font-mono text-slate-400">({employee?.employeeCode})</span>
                            <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-bold text-cyan-800">
                              {leave.leaveType}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {leave.fromDate} → {leave.toDate} ({leave.totalDays} Days)
                          </div>
                          {leave.reason && <div className="mt-1 text-xs italic text-slate-600">"{leave.reason}"</div>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                              leave.status === "Approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : leave.status === "Rejected"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {leave.status}
                          </span>
                          {leave.status === "Pending" && (
                            <>
                              <button
                                onClick={() => updateLeaveStatus.mutate({ id: leave.id, status: "Approved" })}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => updateLeaveStatus.mutate({ id: leave.id, status: "Rejected" })}
                                className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
                              >
                                <XCircle className="h-3.5 w-3.5" /> Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: MONTHLY SALARY SHEET & SLIPS */}
        {tab === "payroll" && (
          <div className="p-5 sm:p-7 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-lg font-black text-slate-900">Monthly Salary & Pay Slip Center</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Muster roll, daily wage calculations, advances/deductions और 1-click individual PDF salary slips.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Field label="Payroll month">
                  <input
                    type="month"
                    className={`${fieldClass} w-40`}
                    value={selectedPayrollMonth}
                    onChange={(e) => setSelectedPayrollMonth(e.target.value)}
                  />
                </Field>
                <button
                  onClick={() => generatePayroll.mutate({ payrollMonth: selectedPayrollMonth })}
                  disabled={generatePayroll.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-800 disabled:opacity-50"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {generatePayroll.isPending ? "Calculating..." : "Compute Monthly Draft"}
                </button>
              </div>
            </div>

            {/* Run summary card */}
            {activePayrollRun ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Month</span>
                    <div className="text-base font-black text-slate-900">{activePayrollRun.payrollMonth}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Headcount</span>
                    <div className="text-base font-black text-slate-900">{activePayrollRun.employeeCount} Staff</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gross Total</span>
                    <div className="text-base font-black text-slate-900">{formatMoney(activePayrollRun.grossTotal)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Deductions</span>
                    <div className="text-base font-black text-rose-600">{formatMoney(activePayrollRun.deductionTotal)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Net Payable</span>
                    <div className="text-base font-black text-emerald-700">{formatMoney(activePayrollRun.netTotal)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</span>
                    <div className="mt-0.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${activePayrollRun.status === "Approved" ? "bg-emerald-100 text-emerald-800" : activePayrollRun.status === "Paid" ? "bg-cyan-100 text-cyan-800" : "bg-amber-100 text-amber-800"}`}>
                        {activePayrollRun.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activePayrollRun.status === "Draft" && (
                    <button
                      onClick={() => approvePayroll.mutate({ payrollRunId: activePayrollRun.id })}
                      disabled={approvePayroll.isPending}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Approve Payroll
                    </button>
                  )}
                  {(activePayrollRun.status === "Approved" || activePayrollRun.status === "Paid") && (
                    <button
                      onClick={() => generatePayoutBatch.mutate({ payrollRunId: activePayrollRun.id })}
                      disabled={generatePayoutBatch.isPending}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5 text-cyan-400" /> Create Bank Payout Batch
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                चयनित माह ({selectedPayrollMonth}) के लिए अभी सैलरी ड्राफ्ट नहीं बना है। ऊपर दिए बटन पर क्लिक करें।
              </div>
            )}

            {/* Payroll Lines Table */}
            {payrollLines && payrollLines.length > 0 && (
              <div className="overflow-auto boq-table-scroll" style={{ maxHeight: "60vh" }}>
                <table className="w-full min-w-[1020px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-3">Employee</th>
                      <th className="px-3 py-3">Pay Basis & Rate</th>
                      <th className="px-3 py-3 text-right">Payable</th>
                      <th className="px-3 py-3 text-right">OT (Hrs)</th>
                      <th className="px-3 py-3 text-right">Basic (₹)</th>
                      <th className="px-3 py-3 text-right">OT Pay (₹)</th>
                      <th className="px-3 py-3 text-right">Allowance (₹)</th>
                      <th className="px-3 py-3 text-right">Deduction (₹)</th>
                      <th className="px-3 py-3 text-right">Net Take-Home</th>
                      <th className="px-3 py-3 text-center">Pay Slip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payrollLines.map(({ line, employee }) => (
                      <tr key={line.id} className="hover:bg-slate-50/70">
                        <td className="px-3 py-3">
                          <div className="font-mono text-xs font-bold text-slate-500">{employee?.employeeCode}</div>
                          <div className="font-bold text-slate-900">{employee?.fullName}</div>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-600">
                          {employee?.payBasis} · {formatMoney(employee?.basicRate || 0)}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold text-slate-900">{line.payableDays}d</td>
                        <td className="px-3 py-3 text-right text-slate-600">{line.overtimeHours}h</td>
                        <td className="px-3 py-3 text-right text-slate-900 font-medium">{formatMoney(line.basicAmount)}</td>
                        <td className="px-3 py-3 text-right text-cyan-700 font-medium">{formatMoney(line.overtimeAmount)}</td>
                        <td className="px-3 py-3 text-right text-emerald-600 font-medium">{formatMoney(line.allowanceAmount)}</td>
                        <td className="px-3 py-3 text-right text-rose-600 font-medium">-{formatMoney(line.deductionAmount)}</td>
                        <td className="px-3 py-3 text-right font-black text-emerald-700">{formatMoney(line.netAmount)}</td>
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={() => employee && handleDownloadPayslip(line.payrollRunId, employee.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-sm"
                            title="Download Pay Slip PDF"
                          >
                            <Download className="h-3.5 w-3.5 text-cyan-700" />
                            PDF Slip
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: BANK PAYOUT BATCHES */}
        {tab === "payouts" && (
          <div className="p-5 sm:p-7 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-lg font-black text-slate-900">Bank Transfer & NEFT Payout Center</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Approved payroll runs से direct NEFT / Bank Payout batch बनाएं और कॉर्पोरेट बैंकिंग CSV फ़ाइल डाउनलोड करें।
                </p>
              </div>
            </div>

            {!payoutBatches?.length ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                अभी तक कोई payout batch नहीं बना है। 'Monthly Salary Sheet' tab में जाकर approved payroll से "Create Bank Payout Batch" पर क्लिक करें।
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Payout Batches</h3>
                  {payoutBatches.map(({ batch, run }) => (
                    <button
                      key={batch.id}
                      onClick={() => setSelectedPayoutBatchId(batch.id)}
                      className={`w-full text-left rounded-xl border p-4 transition ${
                        activeBatchId === batch.id ? "border-cyan-500 bg-cyan-50/50 shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-black text-slate-900">{batch.batchReference}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          batch.status === "Paid" ? "bg-emerald-100 text-emerald-800" : batch.status === "Exported" ? "bg-cyan-100 text-cyan-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {batch.status}
                        </span>
                      </div>
                      <div className="mt-2 text-base font-black text-slate-900">{formatMoney(batch.totalAmount)}</div>
                      <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                        <span>{batch.employeeCount} Employees</span>
                        <span>Month: {run?.payrollMonth}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  {activeBatch && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="font-mono text-xs font-bold text-slate-400">{activeBatch.batch.batchReference}</div>
                        <div className="text-xl font-black text-slate-900">{formatMoney(activeBatch.batch.totalAmount)}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{activeBatch.batch.employeeCount} Staff Payable · Month: {activeBatch.run?.payrollMonth}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleDownloadBankCsv(activeBatch, payoutLines || [])}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-700 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-800 shadow-sm"
                        >
                          <Download className="h-3.5 w-3.5" /> Export Bank CSV
                        </button>
                        {activeBatch.batch.status !== "Paid" && (
                          <button
                            onClick={() => updatePayoutStatus.mutate({ id: activeBatch.batch.id, status: "Paid" })}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Mark Batch Paid
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="overflow-auto boq-table-scroll rounded-xl border border-slate-200 bg-white" style={{ maxHeight: "40vh" }}>
                    <table className="w-full min-w-[1100px] text-left text-xs">
                      <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-3">Beneficiary</th>
                          <th className="px-3 py-3">Bank Details</th>
                          <th className="px-3 py-3 text-right">Net Amount</th>
                          <th className="px-3 py-3 text-center">Transfer Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {payoutLines?.map(({ line, employee }) => (
                          <tr key={line.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2.5">
                              <div className="font-bold text-slate-900">{line.beneficiaryName}</div>
                              <div className="font-mono text-[10px] text-slate-400">{employee?.employeeCode}</div>
                            </td>
                            <td className="px-3 py-2.5 text-slate-600">
                              <div>{line.bankName || "SBI"} · IFSC: {line.ifscCode || "SBIN0001234"}</div>
                              <div className="font-mono text-[10px] text-slate-400">A/C: ****{employee?.accountLast4 || line.accountLast4 || "1234"}</div>
                            </td>
                            <td className="px-3 py-2.5 text-right font-black text-emerald-700">{formatMoney(line.amount)}</td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                {line.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: LABOUR GANG SETTLEMENTS */}
        {tab === "labour_groups" && (
          <div className="p-5 sm:p-7 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
              <div className="rounded-xl border border-slate-200 p-5 bg-slate-50/50">
                <h2 className="text-base font-black text-slate-900">Labour Gang Wage Settlement</h2>
                <p className="mt-1 text-xs text-slate-500">Weekly/fortnightly gang wage sheet with advance deductions.</p>
                <div className="mt-4 space-y-3">
                  <Field label="Project">
                    <select
                      className={fieldClass}
                      value={settlementProject}
                      onChange={(e) => setSettlementProject(e.target.value)}
                    >
                      {projects?.map((p) => (
                        <option key={p.id} value={p.id}>{p.projectId} · {p.projectName}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Road (optional)">
                    <select
                      className={fieldClass}
                      value={settlementRoad}
                      onChange={(e) => setSettlementRoad(e.target.value)}
                    >
                      <option value="">Project-wide / All roads</option>
                      {roads?.map((r) => (
                        <option key={r.id} value={r.id}>{r.roadId} · {r.roadName}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Gang / Group Name">
                    <input
                      className={fieldClass}
                      placeholder="e.g. Mason & Beldar Gang #1 (Ch. 2+400)"
                      value={settlementGroup}
                      onChange={(e) => setSettlementGroup(e.target.value)}
                    />
                  </Field>
                  <Field label="Contractor / Mukadam">
                    <input
                      className={fieldClass}
                      placeholder="e.g. Rameshwar Labour Supplier"
                      value={settlementContractor}
                      onChange={(e) => setSettlementContractor(e.target.value)}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="From date">
                      <input type="date" className={fieldClass} value={settlementFrom} onChange={(e) => setSettlementFrom(e.target.value)} />
                    </Field>
                    <Field label="To date">
                      <input type="date" className={fieldClass} value={settlementTo} onChange={(e) => setSettlementTo(e.target.value)} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Field label="Labour count">
                      <input type="number" min="1" className={fieldClass} value={settlementLabourCount} onChange={(e) => setSettlementLabourCount(Number(e.target.value))} />
                    </Field>
                    <Field label="Man-days">
                      <input type="number" step="0.5" className={fieldClass} value={settlementManDays} onChange={(e) => setSettlementManDays(e.target.value)} />
                    </Field>
                    <Field label="Daily rate">
                      <input type="number" step="10" className={fieldClass} value={settlementRate} onChange={(e) => setSettlementRate(e.target.value)} />
                    </Field>
                  </div>
                  <div className="rounded-lg bg-cyan-50 p-3 border border-cyan-100 flex items-center justify-between text-xs">
                    <span className="font-semibold text-cyan-900">Gross Wage:</span>
                    <span className="font-bold text-cyan-950">{formatMoney(computedGrossSettlement)}</span>
                  </div>
                  <Field label="Advance deduction (₹)">
                    <input type="number" step="100" className={fieldClass} value={settlementAdvance} onChange={(e) => setSettlementAdvance(e.target.value)} />
                  </Field>
                  <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-100 flex items-center justify-between text-sm">
                    <span className="font-bold text-emerald-900">Net Payable:</span>
                    <span className="font-black text-emerald-800 text-base">{formatMoney(computedNetSettlement)}</span>
                  </div>
                  <Field label="Remarks">
                    <textarea rows={2} className={fieldClass} placeholder="Culvert shuttering & concrete gang..." value={settlementRemarks} onChange={(e) => setSettlementRemarks(e.target.value)} />
                  </Field>
                  <button
                    onClick={() => {
                      if (!settlementProject || !settlementGroup) return toast.error("Please fill project and group name");
                      createGroupSettlement.mutate({
                        projectId: Number(settlementProject),
                        roadId: settlementRoad ? Number(settlementRoad) : null,
                        groupName: settlementGroup,
                        contractorName: settlementContractor || null,
                        periodFrom: settlementFrom,
                        periodTo: settlementTo,
                        labourCount: settlementLabourCount,
                        manDays: settlementManDays,
                        ratePerDay: settlementRate,
                        grossAmount: computedGrossSettlement.toFixed(2),
                        advanceDeduction: Number(settlementAdvance || 0).toFixed(2),
                        netAmount: computedNetSettlement.toFixed(2),
                        remarks: settlementRemarks || null,
                      });
                    }}
                    disabled={createGroupSettlement.isPending}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-800 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" /> Save Gang Settlement
                  </button>
                </div>
              </div>

              <div>
                <h2 className="text-base font-black text-slate-900">Settlement Ledger</h2>
                <p className="mt-1 text-xs text-slate-500">Track and approve weekly labour payments directly on site.</p>
                {!groupSettlements?.length ? (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                    No labour group settlements recorded yet.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {groupSettlements.map(({ settlement, project, road }) => (
                      <div
                        key={settlement.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{settlement.groupName}</span>
                            {settlement.contractorName && (
                              <span className="text-xs text-slate-500">({settlement.contractorName})</span>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {settlement.periodFrom} → {settlement.periodTo} · {settlement.labourCount} Labours · {settlement.manDays} Man-days @ {formatMoney(settlement.ratePerDay)}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-400">
                            {project?.projectId} {road ? `· ${road.roadId}` : "· All roads"}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-base font-black text-emerald-700">{formatMoney(settlement.netAmount)}</div>
                            <div className="text-[10px] text-slate-400">Gross {formatMoney(settlement.grossAmount)} - Adv {formatMoney(settlement.advanceDeduction)}</div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                              settlement.status === "Approved" || settlement.status === "Paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                            }`}>
                              {settlement.status}
                            </span>
                            {settlement.status === "Draft" && (
                              <button
                                onClick={() => updateSettlementStatus.mutate({ id: settlement.id, status: "Approved" })}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                              >
                                Approve
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: EMPLOYEES MASTER */}
        {tab === "employees" && (
          <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr]">
            <div className="border-b xl:border-b-0 xl:border-r border-slate-200 p-4">
              <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50/60 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-black text-cyan-950"><FileUp className="h-4 w-4 text-cyan-700" /> Bulk add employees</h3>
                    <p className="mt-1 text-[11px] leading-5 text-cyan-900/70">एक Excel में कई employees जोड़ें। Duplicate employeeCode rows अलग से report होंगी।</p>
                  </div>
                  <button onClick={downloadEmployeeTemplate} className="shrink-0 rounded-lg border border-cyan-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-cyan-800 hover:bg-cyan-100">
                    <Download className="mr-1 inline h-3 w-3" /> Template
                  </button>
                </div>
                <input ref={employeeImportInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(event) => handleEmployeeImportFile(event.target.files?.[0])} />
                <button onClick={() => employeeImportInputRef.current?.click()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-cyan-300 bg-white px-3 py-3 text-xs font-bold text-cyan-800 hover:bg-cyan-50">
                  <FileSpreadsheet className="h-4 w-4" /> {employeeImportFileName || "Choose Employee Excel file"}
                </button>
                {employeeImportError && <div className="mt-2 flex gap-1.5 rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-800"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />{employeeImportError}</div>}
                {employeeImportRows.length > 0 && (
                  <div className="mt-2 rounded-lg border border-cyan-200 bg-white p-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700"><span>{employeeImportRows.length} rows ready</span><span className="text-cyan-700">Preview loaded</span></div>
                    <div className="mt-1 truncate text-[10px] text-slate-500">{employeeImportRows.slice(0, 3).map((row) => `${String(row.employeeCode || "—")} · ${String(row.fullName || "—")}`).join(" | ")}{employeeImportRows.length > 3 ? " …" : ""}</div>
                    <button onClick={submitEmployeeImport} disabled={bulkImportEmployees.isPending} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-700 px-3 py-2 text-xs font-bold text-white hover:bg-cyan-800 disabled:opacity-50">
                      {bulkImportEmployees.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
                      {bulkImportEmployees.isPending ? "Importing employees..." : `Import ${employeeImportRows.length} employees`}
                    </button>
                  </div>
                )}
                {employeeImportResult && (
                  <div className={`mt-2 rounded-lg border p-2.5 text-[11px] ${employeeImportResult.issues.length ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
                    <div className="font-bold">Imported: {employeeImportResult.imported} · Skipped: {employeeImportResult.skipped}</div>
                    {employeeImportResult.issues.length > 0 && <div className="mt-1 max-h-24 overflow-auto space-y-0.5">{employeeImportResult.issues.map((issue, index) => <div key={`${issue.row}-${index}`}><b>Row {issue.row}:</b> {issue.message}</div>)}</div>}
                  </div>
                )}
                <div className="mt-2 text-[10px] leading-4 text-cyan-900/70">Department/designation codes HR Masters से match करें। Aadhaar और bank account का पूरा number upload न करें—केवल last 4 digits रखें।</div>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    className={`${fieldClass} pl-9`}
                    placeholder="Search name, code, phone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select className={`${fieldClass} w-32`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All status</option>
                  {employeeStatuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setEmployeeForm({ ...emptyEmployee })}
                className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-800"
              >
                <UserPlus className="h-4 w-4" />
                Add Employee
              </button>
              <div className="mt-4 space-y-2 max-h-[620px] overflow-auto">
                {employeesLoading ? (
                  <p className="p-3 text-sm text-slate-500">Loading employees...</p>
                ) : !employees?.length ? (
                  <EmptyState />
                ) : (
                  employees.map(({ employee, department, designation }) => (
                    <button
                      key={employee.id}
                      onClick={() => {
                        setSelectedId(employee.id);
                        beginEdit(employee);
                      }}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        selectedId === employee.id ? "border-cyan-400 bg-cyan-50" : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="font-mono text-xs font-black text-slate-900">{employee.employeeCode}</span>
                          <span className="mt-1 block text-sm font-bold text-slate-800">{employee.fullName}</span>
                          <span className="mt-1 block text-[11px] text-slate-500">
                            {designation?.name || employee.employmentType} · {department?.name || "No department"}
                          </span>
                        </div>
                        <StatusBadge status={employee.status} />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{employee.payBasis} · {formatMoney(Number(employee.basicRate || 0))}</span>
                        <span>{employee.phone || "No phone"}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="p-5 sm:p-7">
              {employeeForm ? (
                <EmployeeForm
                  form={employeeForm}
                  set={setEmployee}
                  departments={departments || []}
                  designations={designations || []}
                  saving={createEmployee.isPending || updateEmployee.isPending}
                  onCancel={() => setEmployeeForm(null)}
                  onSave={() =>
                    employeeForm.id
                      ? updateEmployee.mutate({ id: employeeForm.id, ...employeePayload(employeeForm) })
                      : createEmployee.mutate(employeePayload(employeeForm))
                  }
                />
              ) : (
                <div className="flex min-h-[420px] items-center justify-center text-center">
                  <div>
                    <UsersRound className="mx-auto h-12 w-12 text-slate-200" />
                    <h2 className="mt-4 text-lg font-black text-slate-700">Select an employee</h2>
                    <p className="mt-2 text-sm text-slate-500">Employee master खोलने के लिए बाईं ओर से record चुनें या नया employee जोड़ें।</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 9: ASSIGNMENTS */}
        {tab === "assignments" && (
          <AssignmentsTab
            employees={employees || []}
            projects={projects || []}
            roads={roads || []}
            assignments={assignments || []}
            employeeId={assignmentEmployeeId}
            setEmployeeId={setAssignmentEmployeeId}
            projectId={assignmentProjectId}
            setProjectId={(value: string) => {
              setAssignmentProjectId(value);
              setAssignmentRoadId("");
            }}
            roadId={assignmentRoadId}
            setRoadId={setAssignmentRoadId}
            roleOnSite={assignmentRole}
            setRoleOnSite={setAssignmentRole}
            start={assignmentStart}
            setStart={setAssignmentStart}
            end={assignmentEnd}
            setEnd={setAssignmentEnd}
            status={assignmentStatus}
            setStatus={setAssignmentStatus}
            saving={createAssignment.isPending}
            onSave={() => {
              if (!assignmentEmployeeId || !assignmentProjectId) return toast.error("Select employee and project");
              createAssignment.mutate({
                employeeId: Number(assignmentEmployeeId),
                projectId: Number(assignmentProjectId),
                roadId: assignmentRoadId ? Number(assignmentRoadId) : null,
                roleOnSite: assignmentRole || null,
                assignmentStart,
                assignmentEnd: assignmentEnd || null,
                status: assignmentStatus as any,
                remarks: null,
              });
            }}
          />
        )}

        {/* TAB 10: MASTERS */}
        {tab === "masters" && (
          <MastersTab
            departments={departments || []}
            designations={designations || []}
            departmentCode={departmentCode}
            setDepartmentCode={setDepartmentCode}
            departmentName={departmentName}
            setDepartmentName={setDepartmentName}
            designationCode={designationCode}
            setDesignationCode={setDesignationCode}
            designationName={designationName}
            setDesignationName={setDesignationName}
            designationGrade={designationGrade}
            setDesignationGrade={setDesignationGrade}
            onDepartmentSave={() => createDepartment.mutate({ code: departmentCode, name: departmentName, description: null })}
            onDesignationSave={() => createDesignation.mutate({ code: designationCode, name: designationName, grade: designationGrade || null, description: null })}
          />
        )}
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }: any) {
  const tones: any = {
    cyan: "bg-cyan-50 text-cyan-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
    blue: "bg-blue-50 text-blue-700",
    rose: "bg-rose-50 text-rose-700",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className={`inline-flex rounded-lg p-2 ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-2 text-lg font-black text-slate-900">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Active: "bg-emerald-100 text-emerald-700",
    "On Leave": "bg-amber-100 text-amber-700",
    Inactive: "bg-slate-100 text-slate-600",
    Exited: "bg-rose-100 text-rose-700",
  };
  return <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${colors[status] || colors.Inactive}`}>{status}</span>;
}

function EmptyState() {
  return <div className="rounded-xl border border-dashed border-slate-300 p-7 text-center text-sm text-slate-500">No employee records yet. Add the first employee to start HR master.</div>;
}

function EmployeeForm({ form, set, departments, designations, saving, onCancel, onSave }: any) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900">{form.id ? "Edit employee" : "Add employee"}</h2>
          <p className="mt-1 text-xs text-slate-500">Master record and payroll inputs</p>
        </div>
        <button onClick={onCancel} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-6 space-y-6">
        <section>
          <h3 className="border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-wider text-cyan-700">Identity & contact</h3>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Employee code"><input className={fieldClass} value={form.employeeCode} onChange={(e) => set("employeeCode", e.target.value)} placeholder="EMP-001" /></Field>
            <Field label="Full name"><input className={fieldClass} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} /></Field>
            <Field label="Father / guardian name"><input className={fieldClass} value={form.fatherName} onChange={(e) => set("fatherName", e.target.value)} /></Field>
            <Field label="Phone"><input className={fieldClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
            <Field label="Email"><input type="email" className={fieldClass} value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
            <Field label="Date of birth"><input type="date" className={fieldClass} value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} /></Field>
            <Field label="Gender">
              <select className={fieldClass} value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                <option value="">Not specified</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </Field>
            <Field label="Aadhaar last 4 digits"><input inputMode="numeric" maxLength={4} className={fieldClass} value={form.aadhaarLast4} onChange={(e) => set("aadhaarLast4", e.target.value.replace(/\D/g, "").slice(0, 4))} /></Field>
            <Field label="PAN reference"><input className={fieldClass} value={form.panReference} onChange={(e) => set("panReference", e.target.value.toUpperCase())} /></Field>
            <div className="md:col-span-2"><Field label="Address"><textarea rows={2} className={fieldClass} value={form.address} onChange={(e) => set("address", e.target.value)} /></Field></div>
          </div>
        </section>

        <section>
          <h3 className="border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-wider text-cyan-700">Employment & payroll foundation</h3>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Department">
              <select className={fieldClass} value={form.departmentId} onChange={(e) => set("departmentId", e.target.value)}>
                <option value="">Select department</option>
                {departments.map((item: any) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Designation">
              <select className={fieldClass} value={form.designationId} onChange={(e) => set("designationId", e.target.value)}>
                <option value="">Select designation</option>
                {designations.map((item: any) => (
                  <option key={item.id} value={item.id}>{item.name}{item.grade ? ` · ${item.grade}` : ""}</option>
                ))}
              </select>
            </Field>
            <Field label="Employment type">
              <select className={fieldClass} value={form.employmentType} onChange={(e) => set("employmentType", e.target.value)}>
                {employmentTypes.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </Field>
            <Field label="Joining date"><input type="date" className={fieldClass} value={form.joiningDate} onChange={(e) => set("joiningDate", e.target.value)} /></Field>
            <Field label="Status">
              <select className={fieldClass} value={form.status} onChange={(e) => set("status", e.target.value)}>
                {employeeStatuses.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </Field>
            <Field label="Exit date"><input type="date" className={fieldClass} value={form.exitDate} onChange={(e) => set("exitDate", e.target.value)} /></Field>
            <Field label="Pay basis">
              <select className={fieldClass} value={form.payBasis} onChange={(e) => set("payBasis", e.target.value)}>
                {payBases.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </Field>
            <Field label={form.payBasis === "Monthly" ? "Monthly basic rate" : `${form.payBasis} rate`}>
              <input type="number" min="0" step="0.01" className={fieldClass} value={form.basicRate} onChange={(e) => set("basicRate", e.target.value)} />
            </Field>
            <Field label="Overtime rate">
              <input type="number" min="0" step="0.01" className={fieldClass} value={form.overtimeRate} onChange={(e) => set("overtimeRate", e.target.value)} />
            </Field>
            <Field label="Bank name"><input className={fieldClass} value={form.bankName} onChange={(e) => set("bankName", e.target.value)} /></Field>
            <Field label="Account last 4 digits"><input inputMode="numeric" maxLength={4} className={fieldClass} value={form.accountLast4} onChange={(e) => set("accountLast4", e.target.value.replace(/\D/g, "").slice(0, 4))} /></Field>
            <Field label="IFSC code"><input className={fieldClass} value={form.ifscCode} onChange={(e) => set("ifscCode", e.target.value.toUpperCase())} /></Field>
          </div>
        </section>

        <section>
          <h3 className="border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-wider text-cyan-700">Emergency & documents</h3>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Emergency contact name"><input className={fieldClass} value={form.emergencyContactName} onChange={(e) => set("emergencyContactName", e.target.value)} /></Field>
            <Field label="Emergency contact phone"><input className={fieldClass} value={form.emergencyContactPhone} onChange={(e) => set("emergencyContactPhone", e.target.value)} /></Field>
            <Field label="Document references" className="md:col-span-2">
              <textarea rows={2} className={fieldClass} value={form.documentReferences} onChange={(e) => set("documentReferences", e.target.value)} placeholder="Joining letter, contract, ID proof references..." />
            </Field>
            <Field label="Remarks" className="md:col-span-2">
              <textarea rows={2} className={fieldClass} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} />
            </Field>
          </div>
        </section>
      </div>

      <div className="mt-7 flex justify-end gap-3">
        <button onClick={onCancel} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
        <button disabled={saving} onClick={onSave} className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-cyan-800 disabled:opacity-50">
          <CheckCircle2 className="h-4 w-4" />
          {saving ? "Saving..." : "Save employee"}
        </button>
      </div>
    </div>
  );
}

function AssignmentsTab({ employees, projects, roads, assignments, employeeId, setEmployeeId, projectId, setProjectId, roadId, setRoadId, roleOnSite, setRoleOnSite, start, setStart, end, setEnd, status, setStatus, saving, onSave }: any) {
  return (
    <div className="p-5 sm:p-7">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900">Project & road assignment</h2>
          <p className="mt-1 text-xs text-slate-500">यह mapping बाद में attendance, manpower cost और road-wise payroll में उपयोग होगी।</p>
        </div>
        <Field label="Employee">
          <select className={`${fieldClass} min-w-64`} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">Select employee</option>
            {employees.map(({ employee, designation }: any) => (
              <option key={employee.id} value={employee.id}>
                {employee.employeeCode} — {employee.fullName}{designation ? ` · ${designation.name}` : ""}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-6 rounded-xl border border-cyan-100 bg-cyan-50/50 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Project">
            <select className={fieldClass} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">Select project</option>
              {projects.map((project: any) => (
                <option key={project.id} value={project.id}>{project.projectId} — {project.projectName}</option>
              ))}
            </select>
          </Field>
          <Field label="Road (optional)">
            <select className={fieldClass} value={roadId} onChange={(e) => setRoadId(e.target.value)}>
              <option value="">Project-wide / all roads</option>
              {roads.map((road: any) => (
                <option key={road.id} value={road.id}>{road.roadId} — {road.roadName}</option>
              ))}
            </select>
          </Field>
          <Field label="Role on site">
            <input className={fieldClass} value={roleOnSite} onChange={(e) => setRoleOnSite(e.target.value)} placeholder="Site Engineer / Supervisor" />
          </Field>
          <Field label="Assignment start">
            <input type="date" className={fieldClass} value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Assignment end">
            <input type="date" className={fieldClass} value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
          <Field label="Status">
            <select className={fieldClass} value={status} onChange={(e) => setStatus(e.target.value)}>
              {assignmentStatuses.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={onSave} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-cyan-800 disabled:opacity-50">
            <Plus className="h-4 w-4" />
            {saving ? "Saving..." : "Save assignment"}
          </button>
        </div>
      </div>

      <div className="mt-7">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Current assignments</h3>
        {!employeeId ? (
          <p className="mt-4 text-sm text-slate-500">Select an employee to see assignments.</p>
        ) : !assignments.length ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No assignment recorded for this employee.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-3 py-3">Project</th>
                  <th className="px-3 py-3">Road</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Period</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map(({ assignment, project, road }: any) => (
                  <tr key={assignment.id} className="border-b border-slate-100">
                    <td className="px-3 py-3 font-semibold">{project?.projectId} · {project?.projectName}</td>
                    <td className="px-3 py-3 text-slate-500">{road ? `${road.roadId} · ${road.roadName}` : "All roads"}</td>
                    <td className="px-3 py-3 text-slate-500">{assignment.roleOnSite || "—"}</td>
                    <td className="px-3 py-3 text-slate-500">{assignment.assignmentStart} → {assignment.assignmentEnd || "Present"}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">{assignment.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function MastersTab({ departments, designations, departmentCode, setDepartmentCode, departmentName, setDepartmentName, designationCode, setDesignationCode, designationName, setDesignationName, designationGrade, setDesignationGrade, onDepartmentSave, onDesignationSave }: any) {
  return (
    <div className="p-5 sm:p-7">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 p-5">
          <h2 className="text-lg font-black text-slate-900">Departments</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <input className={fieldClass} placeholder="Code" value={departmentCode} onChange={(e) => setDepartmentCode(e.target.value.toUpperCase())} />
            <input className={fieldClass} placeholder="Department name" value={departmentName} onChange={(e) => setDepartmentName(e.target.value)} />
          </div>
          <button onClick={onDepartmentSave} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-bold text-white">
            <Plus className="h-4 w-4" /> Add department
          </button>
          <div className="mt-5 space-y-2">
            {departments.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                <span className="text-sm font-semibold text-slate-800">{item.name}</span>
                <span className="font-mono text-[10px] text-slate-400">{item.code}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-5">
          <h2 className="text-lg font-black text-slate-900">Designations</h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input className={fieldClass} placeholder="Code" value={designationCode} onChange={(e) => setDesignationCode(e.target.value.toUpperCase())} />
            <input className={fieldClass} placeholder="Designation name" value={designationName} onChange={(e) => setDesignationName(e.target.value)} />
            <input className={fieldClass} placeholder="Grade" value={designationGrade} onChange={(e) => setDesignationGrade(e.target.value)} />
          </div>
          <button onClick={onDesignationSave} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-bold text-white">
            <Plus className="h-4 w-4" /> Add designation
          </button>
          <div className="mt-5 space-y-2">
            {designations.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                <span className="text-sm font-semibold text-slate-800">{item.name}</span>
                <span className="font-mono text-[10px] text-slate-400">{item.code}{item.grade ? ` · ${item.grade}` : ""}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
