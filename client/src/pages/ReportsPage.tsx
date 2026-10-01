import React, { useMemo, useState } from "react";
import { FileDown, FileText, CalendarDays, CheckCircle2, Loader2, RefreshCw, Images } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "../lib/trpc";
import { createPdfReport, createPhotoCompendiumPdf, type PdfReportSection, type PhotoCompendiumEntry } from "../lib/pdfReports";
import { loadDprArchive } from "../lib/offlineDpr";

const REPORT_OPTIONS = [
  { id: "dpr", label: "DPR / Daily Progress", description: "Site quantities, manpower, weather, hindrances and road-wise totals" },
  { id: "photo-compendium", label: "Monthly Site Photo Compendium", description: "Date-wise site photos with road, work section, chainage, quantity and billable details" },
  { id: "boq", label: "BOQ Master & Progress", description: "Contract BOQ items, tender rates, executed quantities and balances" },
  { id: "emb", label: "e-MB Measurement Book", description: "Chainage measurements L × B × D, calculated quantities and values" },
  { id: "structures", label: "पुल-पुलिया & Protection Register", description: "Slab Culverts, HPC, Box Culverts, Retaining Walls, Toe Walls & Drains" },
  { id: "variance", label: "Material Variance & Wastage", description: "Theoretical vs actual MoRTH material consumption and variance %" },
  { id: "subcontractors", label: "Subcontractor Work Orders", description: "Petty contractors, awarded scopes, executed quantities and payments" },
  { id: "machinery", label: "Plant & Machinery Logbook", description: "Equipment hour meter, fuel issued, efficiency L/hr and work description" },
  { id: "signoffs", label: "Digital Sign-off Register", description: "Audit trail of entity certifications, approvers and digital sign-off status" },
  { id: "inventory", label: "Material Stock & GRN", description: "Warehouse balances, min/max thresholds and GRN receipts" },
  { id: "roads", label: "Road Progress", description: "All road stretches, chainages, status and progress" },
  { id: "activities", label: "Activities & Phases", description: "Task register, dates, priority and completion" },
  { id: "billing", label: "Billing & QS", description: "Bills, measurements, verification and payments" },
  { id: "hindrances", label: "Hindrance Register", description: "Open/resolved obstructions, departments and due dates" },
  { id: "qa", label: "QA / QC Testing", description: "Tests, required vs actual values and corrective actions" },
  { id: "materials", label: "Materials & Balance", description: "Received, used and balance quantities by road" },
  { id: "documents", label: "Document Register", description: "Document titles, categories, references and dates" },
  { id: "all", label: "Complete ERP Report", description: "Project overview with every available module" },
] as const;

type ReportType = (typeof REPORT_OPTIONS)[number]["id"];

type ReportRoadSubtotal = {
  roadId: number;
  roadName: string;
  entries: number;
  actualByUnit: Record<string, number>;
  avgProgress: number;
  hindrances: number;
};

function getRoadSubtotals(entries: Array<{ roadId: number; roadName: string; actualQuantity: string; unit: string; percentageComplete: string; hindrance?: string }>): ReportRoadSubtotal[] {
  const grouped = entries.reduce<Record<string, ReportRoadSubtotal & { progressTotal: number }>>((acc, entry) => {
    const key = String(entry.roadId);
    const group = acc[key] || {
      roadId: entry.roadId,
      roadName: entry.roadName,
      entries: 0,
      actualByUnit: {},
      avgProgress: 0,
      hindrances: 0,
      progressTotal: 0,
    };
    group.entries += 1;
    group.progressTotal += Number(entry.percentageComplete || 0);
    group.hindrances += entry.hindrance?.trim() ? 1 : 0;
    group.actualByUnit[entry.unit || "Unit"] = (group.actualByUnit[entry.unit || "Unit"] || 0) + Number(entry.actualQuantity || 0);
    acc[key] = group;
    return acc;
  }, {});

  return Object.values(grouped).map(({ progressTotal, ...group }) => ({
    ...group,
    avgProgress: group.entries ? progressTotal / group.entries : 0,
  })).sort((a, b) => a.roadId - b.roadId);
}

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateRangePreset(preset: "week" | "month"): { from: string; to: string } {
  const today = new Date();
  const to = localDateString(today);
  if (preset === "month") {
    return { from: localDateString(new Date(today.getFullYear(), today.getMonth(), 1)), to };
  }

  const day = today.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysFromMonday);
  return { from: localDateString(monday), to };
}

function parseReportPhotos(value?: string | null): Array<{ url: string; caption?: string; sectionType?: string; chainage?: string }> {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Legacy single-photo URL support.
  }
  return [{ url: value }];
}

export default function ReportsPage() {
  const queryType = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("type") : null;
  const initialType = REPORT_OPTIONS.some((option) => option.id === queryType) ? queryType as ReportType : "dpr";
  const [reportType, setReportType] = useState<ReportType>(initialType);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [photoRoadFilter, setPhotoRoadFilter] = useState("All Roads");
  const [photoSectionFilter, setPhotoSectionFilter] = useState("All Sections");
  const [localArchive, setLocalArchive] = useState(() => loadDprArchive());
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: projects } = trpc.projects.list.useQuery();
  const { data: roads } = trpc.roads.list.useQuery();
  const { data: activities } = trpc.activities.list.useQuery();
  const { data: dprList, refetch: refetchDpr } = trpc.dailyProgress.list.useQuery();
  const { data: bills } = trpc.billing.list.useQuery();
  const { data: hindrances } = trpc.hindrances.list.useQuery();
  const { data: qaQcTests } = trpc.qaQc.list.useQuery();
  const { data: materials } = trpc.materials.list.useQuery();
  const { data: boqData } = trpc.boq.list.useQuery();
  const { data: inventoryData } = trpc.inventory.list.useQuery();
  const { data: grnData } = trpc.grn.list.useQuery();
  const { data: embData } = trpc.measurements.list.useQuery();
  const { data: varianceData } = trpc.materialVariances.list.useQuery();
  const { data: woData } = trpc.subcontractors.workOrdersList.useQuery();
  const { data: machineryLogData } = trpc.machinery.logsList.useQuery();
  const { data: signoffData } = trpc.signoffs.list.useQuery();
  const { data: structuresData } = trpc.structures.list.useQuery();
  const { data: structuresSummary } = trpc.structures.summary.useQuery();
  const { data: documents } = trpc.documents.list.useQuery();

  const selectedOption = REPORT_OPTIONS.find((option) => option.id === reportType) || REPORT_OPTIONS[0];

  const selectReportType = (type: ReportType) => {
    setReportType(type);
    if (type === "photo-compendium" && !dateFrom && !dateTo) {
      const range = getDateRangePreset("month");
      setDateFrom(range.from);
      setDateTo(range.to);
    }
  };

  const reportDprRows = useMemo(() => {
    const serverDraftIds = new Set((dprList || []).map(({ dp }) => dp.clientDraftId).filter(Boolean));
    const serverRows = (dprList || []).map(({ dp, road, activity }) => ({
      date: dp.date,
      roadId: dp.roadId,
      roadName: road?.roadName || `Road #${dp.roadId}`,
      activityName: activity?.activityName || `Activity #${dp.activityId}`,
      sectionType: dp.sectionType || "Highway Works",
      chainage: dp.chainageFrom ? `${dp.chainageFrom}-${dp.chainageTo || "End"}` : "—",
      plannedQuantity: dp.plannedQuantity,
      actualQuantity: dp.actualQuantity,
      billableQuantity: dp.billableQuantity || dp.actualQuantity,
      billingStatus: dp.billingStatus || "Pending",
      unit: dp.unit,
      percentageComplete: String(dp.percentageComplete || 0),
      manpower: dp.manpower || "—",
      machinery: dp.machinery || "—",
      weather: dp.weather || "—",
      hindrance: dp.hindrance || "",
      remarks: dp.remarks || "",
      syncStatus: "Synced",
    }));
    const pendingLocalRows = localArchive
      .filter((item) => item.syncStatus !== "synced" && !serverDraftIds.has(item.payload.clientDraftId))
      .map((item) => ({
        date: item.payload.date,
        roadId: item.payload.roadId,
        roadName: item.roadName || `Road #${item.payload.roadId}`,
        activityName: item.activityName || `Activity #${item.payload.activityId}`,
        sectionType: (item.payload as any).sectionType || "Highway Works",
        chainage: (item.payload as any).chainageFrom ? `${(item.payload as any).chainageFrom}-${(item.payload as any).chainageTo || "End"}` : "—",
        plannedQuantity: item.payload.plannedQuantity,
        actualQuantity: item.payload.actualQuantity,
        billableQuantity: (item.payload as any).billableQuantity || item.payload.actualQuantity,
        billingStatus: (item.payload as any).billingStatus || "Pending",
        unit: item.payload.unit,
        percentageComplete: item.payload.percentageComplete,
        manpower: item.payload.manpower || "—",
        machinery: item.payload.machinery || "—",
        weather: item.payload.weather || "—",
        hindrance: item.payload.hindrance || "",
        remarks: item.payload.remarks || "",
        syncStatus: item.syncStatus === "failed" ? "Retry required" : "Offline draft",
      }));
    const rows = [...serverRows, ...pendingLocalRows];
    return rows
      .filter((row) => !dateFrom || row.date >= dateFrom)
      .filter((row) => !dateTo || row.date <= dateTo)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [dprList, dateFrom, dateTo, localArchive]);

  const photoCompendiumEntries = useMemo<PhotoCompendiumEntry[]>(() => {
    return (dprList || [])
      .filter(({ dp }) => !dateFrom || dp.date >= dateFrom)
      .filter(({ dp }) => !dateTo || dp.date <= dateTo)
      .filter(({ dp }) => photoRoadFilter === "All Roads" || String(dp.roadId) === photoRoadFilter)
      .filter(({ dp }) => photoSectionFilter === "All Sections" || (dp.sectionType || "Highway Works") === photoSectionFilter)
      .flatMap(({ dp, road, activity }) => parseReportPhotos(dp.sitePhotos).map((photo) => ({
        date: dp.date,
        roadName: road?.roadName || `Road #${dp.roadId}`,
        roadCode: road?.roadId,
        sectionType: photo.sectionType || dp.sectionType || "Highway Works",
        activityName: activity?.activityName || `Activity #${dp.activityId}`,
        chainage: photo.chainage || (dp.chainageFrom ? `${dp.chainageFrom}-${dp.chainageTo || "End"}` : "—"),
        caption: photo.caption || `${dp.sectionType || "DPR"} site photo`,
        photoUrl: photo.url,
        actualQuantity: dp.actualQuantity,
        billableQuantity: dp.billableQuantity || dp.actualQuantity,
        unit: dp.unit,
        billingStatus: dp.billingStatus || "Pending",
        remarks: dp.remarks || "",
      })))
      .sort((a, b) => a.date.localeCompare(b.date) || a.roadName.localeCompare(b.roadName));
  }, [dprList, dateFrom, dateTo, photoRoadFilter, photoSectionFilter]);

  const buildSections = (): PdfReportSection[] => {
    const sections: PdfReportSection[] = [];
    const wants = (type: ReportType) => reportType === type || reportType === "all";

    if (reportType === "all" && projects?.length) {
      sections.push({
        title: "Project Overview",
        columns: ["Project ID", "Project Name", "Package", "Client Department", "Contractor", "Start", "End", "Status", "Overall Progress"],
        rows: projects.map((project) => [project.projectId, project.projectName, project.package || "—", project.clientDepartment, project.contractor, project.agreementStartDate, project.agreementEndDate, project.status, `${project.overallProgress}%`]),
      });
    }

    if (wants("dpr")) {
      const dprEntries = reportDprRows.map((row) => ({
        roadId: row.roadId,
        roadName: row.roadName,
        actualQuantity: row.actualQuantity,
        unit: row.unit,
        percentageComplete: row.percentageComplete,
        hindrance: row.hindrance,
      }));
      const roadTotals = getRoadSubtotals(dprEntries);
      sections.push({
        title: "DPR Detail — Daily Site Progress",
        columns: ["Date", "Road", "Section", "Chainage", "Activity", "Planned", "Actual", "Billable", "Bill Status", "Unit", "% Done", "Weather"],
        rows: reportDprRows.map((row) => [
          row.date,
          row.roadName,
          row.sectionType,
          row.chainage,
          row.activityName,
          row.plannedQuantity,
          row.actualQuantity,
          row.billableQuantity,
          row.billingStatus,
          row.unit,
          `${row.percentageComplete}%`,
          row.weather,
        ]),
      });
      sections.push({
        title: "Road-wise DPR Subtotals",
        columns: ["Road", "DPR Entries", "Actual Quantity by Unit", "Average Progress", "Hindrances"],
        rows: roadTotals.map((road) => [
          road.roadName,
          road.entries,
          Object.entries(road.actualByUnit).map(([unit, qty]) => `${qty.toFixed(2)} ${unit}`).join(" | "),
          `${road.avgProgress.toFixed(1)}%`,
          road.hindrances,
        ]),
      });
    }

    if (wants("boq")) {
      sections.push({
        title: "BOQ Master & Progress Register",
        columns: ["Item Code", "Chapter", "Road", "Contract Qty", "Executed Qty", "Balance Qty", "Unit", "Rate (₹)", "Contract Amount (₹)", "Status"],
        rows: (boqData || []).map(({ boq, road }) => [
          boq.itemCode,
          boq.chapter,
          road?.roadName || "Project-Wide",
          parseFloat(String(boq.contractQuantity)).toLocaleString(),
          parseFloat(String(boq.executedQuantity)).toLocaleString(),
          parseFloat(String(boq.balanceQuantity)).toLocaleString(),
          boq.unit,
          `₹${parseFloat(String(boq.rate)).toLocaleString()}`,
          `₹${parseFloat(String(boq.contractAmount)).toLocaleString()}`,
          boq.status,
        ]),
      });
    }

    if (wants("inventory")) {
      sections.push({
        title: "Material Stock Ledger & Balances",
        columns: ["Material Code", "Material Name", "Opening", "Received", "Issued", "Balance Stock", "Unit", "Min Reorder", "Yard Location"],
        rows: (inventoryData || []).map((m) => [
          m.materialCode,
          m.materialName,
          parseFloat(String(m.openingStock)).toLocaleString(),
          parseFloat(String(m.receivedQuantity)).toLocaleString(),
          parseFloat(String(m.issuedQuantity)).toLocaleString(),
          parseFloat(String(m.balanceQuantity)).toLocaleString(),
          m.unit,
          parseFloat(String(m.minStock)).toLocaleString(),
          m.storageLocation || "Central Yard",
        ]),
      });
      sections.push({
        title: "Goods Receipt Notes (GRN)",
        columns: ["GRN No.", "Date", "Material", "Supplier", "Challan", "Accepted Qty", "Unit", "Rate", "Amount (₹)", "Status"],
        rows: (grnData || []).map(({ grn, material }) => [
          grn.grnNo,
          grn.grnDate,
          material?.materialName || `Material #${grn.materialId}`,
          grn.supplier,
          grn.challanNo || "—",
          parseFloat(String(grn.acceptedQuantity)).toLocaleString(),
          grn.unit,
          `₹${parseFloat(String(grn.rate)).toLocaleString()}`,
          `₹${parseFloat(String(grn.totalAmount)).toLocaleString()}`,
          grn.inspectionStatus,
        ]),
      });
    }

        if (wants("structures")) {
      sections.push({
        title: "Road-wise Pul-Puliya, Protection Walls & Drains Summary",
        columns: ["Road Code", "Road Name", "Slab Culverts", "HPC Pipes", "Box/Minor Br", "Retaining Wall (Rmt)", "Toe Wall (Rmt)", "Pucca Drain (Rmt)", "Status"],
        rows: (structuresSummary?.roadWise || []).map((rw) => [
          rw.roadCode,
          rw.roadName,
          `${rw.counts.slabCulvert} Nos`,
          `${rw.counts.hpc} Nos`,
          `${rw.counts.boxCulvert + rw.counts.minorBridge} Nos`,
          `${rw.counts.retainingWall} Rmt`,
          `${rw.counts.toeWall} Rmt`,
          `${rw.counts.drain} Rmt`,
          `${rw.counts.completed}/${rw.counts.totalItems} Complete`,
        ]),
      });
      sections.push({
        title: "Detailed Road Structures Register",
        columns: ["Structure ID", "Road", "Type", "Chainage RD", "Dimensions (L×W×H)", "Quantity", "Unit", "Billable Qty", "Status"],
        rows: (structuresData || []).map(({ structure: s, road }) => [
          s.structureNo,
          road?.roadName || `Road #${s.roadId}`,
          s.structureType,
          `${s.chainageFrom} to ${s.chainageTo || "End"}`,
          s.length && s.width && s.height ? `${s.length}×${s.width}×${s.height}m` : s.length ? `L:${s.length}m` : "Standard",
          parseFloat(String(s.quantity)).toLocaleString(),
          s.unit,
          parseFloat(String(s.billableQuantity)).toLocaleString(),
          s.status,
        ]),
      });
    }

if (wants("emb")) {
      sections.push({
        title: "Electronic Measurement Book (e-MB) Register",
        columns: ["MB No.", "Date", "Road", "Chainage From", "Chainage To", "L (m)", "B (m)", "D (m)", "Quantity", "Rate", "Amount (₹)", "Status"],
        rows: (embData || []).map(({ mb, road, boq }) => [
          mb.mbNo,
          mb.mbDate,
          road?.roadName || `Road #${mb.roadId}`,
          mb.locationFrom,
          mb.locationTo,
          parseFloat(String(mb.length)).toFixed(2),
          parseFloat(String(mb.width)).toFixed(2),
          parseFloat(String(mb.depth)).toFixed(3),
          `${parseFloat(String(mb.calculatedQuantity)).toLocaleString()} ${mb.unit}`,
          `₹${parseFloat(String(mb.rate)).toLocaleString()}`,
          `₹${parseFloat(String(mb.amount)).toLocaleString()}`,
          mb.status,
        ]),
      });
    }

    if (wants("variance")) {
      sections.push({
        title: "Material Consumption Variance & Wastage Audit",
        columns: ["Audit No.", "Period", "Road", "BOQ Item", "Material", "Theoretical", "Actual", "Variance Qty", "Variance %", "Status"],
        rows: (varianceData || []).map(({ variance, road, boq, material }) => [
          variance.varianceNo,
          `${variance.periodFrom} to ${variance.periodTo}`,
          road?.roadName || `Road #${variance.roadId}`,
          boq?.itemCode || "—",
          material?.materialName || `Mat #${variance.materialId}`,
          parseFloat(String(variance.theoreticalQuantity)).toLocaleString(),
          parseFloat(String(variance.actualQuantity)).toLocaleString(),
          parseFloat(String(variance.varianceQuantity)).toLocaleString(),
          `${variance.variancePercent}%`,
          variance.status,
        ]),
      });
    }

    if (wants("subcontractors")) {
      sections.push({
        title: "Subcontractors & Piece-Rate Work Orders Register",
        columns: ["WO No.", "Road", "Subcontractor", "Scope", "Awarded Qty", "Executed Qty", "Rate", "Awarded (₹)", "Paid (₹)", "Status"],
        rows: (woData || []).map(({ wo, road, subcontractor }) => [
          wo.workOrderNo,
          road?.roadName || `Road #${wo.roadId}`,
          subcontractor?.name || `Sub #${wo.subcontractorId}`,
          wo.scope,
          `${parseFloat(String(wo.awardedQuantity)).toLocaleString()} ${wo.unit}`,
          `${parseFloat(String(wo.executedQuantity)).toLocaleString()} ${wo.unit}`,
          `₹${parseFloat(String(wo.rate)).toLocaleString()}`,
          `₹${parseFloat(String(wo.awardedAmount)).toLocaleString()}`,
          `₹${parseFloat(String(wo.paidAmount)).toLocaleString()}`,
          wo.status,
        ]),
      });
    }

    if (wants("machinery")) {
      sections.push({
        title: "Plant, Machinery & Fuel Logbook Report",
        columns: ["Log No.", "Date", "Asset", "Road", "Start Hr", "End Hr", "Work Hrs", "Diesel (L)", "Efficiency", "Operator"],
        rows: (machineryLogData || []).map(({ log, asset, road }) => [
          log.logNo,
          log.logDate,
          asset?.assetNo || "Machine",
          road?.roadName || `Road #${log.roadId}`,
          parseFloat(String(log.openingHourMeter)).toFixed(1),
          parseFloat(String(log.closingHourMeter)).toFixed(1),
          `${parseFloat(String(log.workHours)).toFixed(1)} hrs`,
          `${parseFloat(String(log.fuelIssued)).toFixed(1)} L`,
          `${parseFloat(String(log.fuelEfficiency)).toFixed(2)} L/hr`,
          log.operator || "—",
        ]),
      });
    }

    if (wants("signoffs")) {
      sections.push({
        title: "Digital Sign-off & Audit Certification Register",
        columns: ["Entity Type", "Entity ID", "Stage", "Requested By", "Assigned Approver", "Status", "Signed By", "Signed Date"],
        rows: (signoffData || []).map((s) => [
          s.entityType,
          s.entityId,
          s.stage,
          s.requestedBy,
          s.assignedRole,
          s.status,
          s.signedBy || "—",
          s.signedAt ? new Date(s.signedAt).toLocaleDateString() : "Pending",
        ]),
      });
    }

    if (wants("roads")) {
      sections.push({
        title: "Road Progress Register",
        columns: ["Road ID", "Road Name", "Length (Km)", "Chainage", "Status", "Progress", "Remarks"],
        rows: (roads || []).map((road) => [road.roadId, road.roadName, road.roadLengthKm, `${road.startRd} to ${road.endRd}`, road.status, `${road.progress}%`, road.remarks || "—"]),
      });
    }

    if (wants("activities")) {
      sections.push({
        title: "Activities & Phases Register",
        columns: ["Task ID", "Road", "Phase", "Activity", "Start", "End", "Progress", "Status", "Priority", "Assigned To"],
        rows: (activities || []).map(({ activity, road }) => [activity.taskId, road?.roadName || `Road #${activity.roadId}`, activity.phase, activity.activityName, activity.startDate, activity.endDate, `${activity.percentageComplete}%`, activity.status, activity.priority, activity.assignedTo || "—"]),
      });
    }

    if (wants("billing")) {
      sections.push({
        title: "Billing & QS Register",
        columns: ["Bill ID", "Road", "Type", "Measurement", "Quantity Calc", "Abstract", "Verification", "Passed Amount", "Payment"],
        rows: (bills || []).map(({ bill, road }) => [bill.billId, road?.roadName || `Road #${bill.roadId}`, bill.billType, bill.measurementStatus, bill.quantityCalculationStatus, bill.abstractStatus, bill.verificationStatus, `₹${bill.passedAmount}`, bill.paymentStatus]),
      });
    }

    if (wants("hindrances")) {
      sections.push({
        title: "Hindrance Register",
        columns: ["Hindrance ID", "Road", "Location", "Category", "Description", "Raised", "Department", "Status", "Days Pending", "Due Date"],
        rows: (hindrances || []).map(({ hindrance, road }) => [hindrance.hindranceId, road?.roadName || `Road #${hindrance.roadId}`, hindrance.rdLocation, hindrance.category, hindrance.description, hindrance.dateRaised, hindrance.responsiblePersonDepartment, hindrance.status, hindrance.daysPending, hindrance.dueDate || "—"]),
      });
    }

    if (wants("qa")) {
      sections.push({
        title: "QA / QC Test Register",
        columns: ["Test ID", "Date", "Road", "Activity", "Test Type", "Location", "Required", "Actual", "Unit", "Result", "Corrective Action"],
        rows: (qaQcTests || []).map(({ test, road }) => [test.testId, test.date, road?.roadName || `Road #${test.roadId}`, test.activity, test.testType, test.locationRd, test.requiredValue, test.actualValue, test.unit, test.result, test.correctiveActionStatus || "None"]),
      });
    }

    if (wants("materials")) {
      sections.push({
        title: "Materials Receipt & Balance Register",
        columns: ["Entry ID", "Date", "Road", "Material", "Received", "Used", "Balance", "Unit", "Supplier", "Challan"],
        rows: (materials || []).map(({ material, road }) => [material.entryId, material.date, road?.roadName || `Road #${material.roadId}`, material.material, material.receivedQuantity, material.usedQuantity, material.balanceQuantity, material.unit, material.supplier || "—", material.challanReference || "—"]),
      });
    }

    if (wants("documents")) {
      sections.push({
        title: "Project Document Register",
        columns: ["Category", "Title", "Document No.", "Road", "Date", "Uploaded By", "File Size", "Remarks"],
        rows: (documents || []).map(({ doc, road }) => [doc.category, doc.title, doc.documentNumber || "—", road?.roadName || "Project-wide", doc.date, doc.uploadedBy || "—", doc.fileSize || "—", doc.remarks || "—"]),
      });
    }

    return sections;
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      if (reportType === "photo-compendium") {
        if (!photoCompendiumEntries.length) {
          toast.error("No site photos available", { description: "Choose another date, road or work section, then try again." });
          return;
        }
        const uniqueRoads = new Set(photoCompendiumEntries.map((entry) => entry.roadName));
        const uniqueSections = new Set(photoCompendiumEntries.map((entry) => entry.sectionType));
        const result = await createPhotoCompendiumPdf({
          title: "Monthly Site Photo Compendium",
          subtitle: "Date-wise field evidence with road, work section, chainage, actual quantity and billable quantity.",
          reportDate: dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : dateFrom || dateTo || "All available dates",
          summary: [
            { label: "Photos", value: String(photoCompendiumEntries.length) },
            { label: "Roads", value: String(uniqueRoads.size) },
            { label: "Work Sections", value: String(uniqueSections.size) },
            { label: "Date Range", value: dateFrom && dateTo ? `${dateFrom} → ${dateTo}` : "All dates" },
            { label: "Source", value: "ERP DPR photo evidence" },
          ],
          entries: photoCompendiumEntries,
          filename: "rdx-monthly-site-photo-compendium",
        });
        toast.success("Photo compendium PDF generated", {
          description: `${result.includedPhotos} photos included${result.unavailablePhotos ? `, ${result.unavailablePhotos} unavailable` : ""}.`,
        });
        return;
      }

      const sections = buildSections();
      const recordCount = sections.reduce((total, section) => total + section.rows.length, 0);
      if (!sections.length || recordCount === 0) {
        toast.error("No report data available", { description: "Sync the module data first, then try again." });
        return;
      }
      createPdfReport({
        title: selectedOption.label,
        subtitle: `${selectedOption.description}. Project: ${projects?.[0]?.projectName || "RDx Road Project"}`,
        reportDate: dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : dateFrom || dateTo || "All available dates",
        summary: [
          { label: "Report type", value: selectedOption.label },
          { label: "Project", value: projects?.[0]?.projectId || "—" },
          { label: "Sections", value: String(sections.length) },
          { label: "Records", value: String(recordCount) },
          { label: "Source", value: "ERP + local drafts" },
        ],
        sections,
        filename: `rdx-${reportType}-report`,
      });
      toast.success("PDF report generated", { description: "Your report download has started." });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Reports & PDF Export</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Generate only the report you need, or download one complete ERP report covering all available modules.</p>
        </div>
        <button
          onClick={() => { setLocalArchive(loadDprArchive()); void refetchDpr(); toast.success("DPR data refreshed"); }}
          className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh DPR
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Choose report</label>
            <select
              value={reportType}
              onChange={(event) => selectReportType(event.target.value as ReportType)}
              className="mt-2 w-full p-3 border border-slate-200 rounded-lg bg-slate-50 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {REPORT_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
            <p className="text-xs text-slate-500 mt-2">{selectedOption.description}</p>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> DPR date range (optional)</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <span className="text-[10px] text-slate-400">From</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm font-mono"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400">To</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm font-mono"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <button
                onClick={() => { const range = getDateRangePreset("week"); setDateFrom(range.from); setDateTo(range.to); }}
                className="px-2.5 py-1.5 rounded-md bg-amber-100 text-amber-900 hover:bg-amber-200 text-[11px] font-bold"
              >
                This Week
              </button>
              <button
                onClick={() => { const range = getDateRangePreset("month"); setDateFrom(range.from); setDateTo(range.to); }}
                className="px-2.5 py-1.5 rounded-md bg-blue-100 text-blue-900 hover:bg-blue-200 text-[11px] font-bold"
              >
                This Month
              </button>
              <button
                onClick={() => { setDateFrom(""); setDateTo(""); }}
                className="px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-semibold"
              >
                All Dates
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Applies to DPR records, including local offline drafts. Select a range for weekly or monthly cumulative reports.</p>
          </div>

          {reportType === "photo-compendium" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
                <Images className="w-4 h-4 text-amber-600" /> Photo compendium filters
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-amber-900/70">Road</span>
                  <select
                    value={photoRoadFilter}
                    onChange={(event) => setPhotoRoadFilter(event.target.value)}
                    className="mt-1 w-full p-2.5 border border-amber-200 rounded-lg bg-white text-xs font-semibold text-slate-800"
                  >
                    <option value="All Roads">All Roads</option>
                    {(roads || []).map((road) => <option key={road.id} value={String(road.id)}>{road.roadId} — {road.roadName}</option>)}
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-amber-900/70">Work section</span>
                  <select
                    value={photoSectionFilter}
                    onChange={(event) => setPhotoSectionFilter(event.target.value)}
                    className="mt-1 w-full p-2.5 border border-amber-200 rounded-lg bg-white text-xs font-semibold text-slate-800"
                  >
                    <option value="All Sections">All Sections</option>
                    <option value="Highway Works">Highway Works</option>
                    <option value="Concrete Works">Concrete Works</option>
                    <option value="Material">Material</option>
                    <option value="Machine">Machine</option>
                  </select>
                </div>
              </div>
              <p className="text-[10px] text-amber-900/70">Each PDF card includes the site photo, caption, date, road, work section, chainage/RD, actual quantity, billable quantity and billing status.</p>
              <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
                <span>Matching photos</span>
                <span>{photoCompendiumEntries.length}</span>
              </div>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow disabled:opacity-60"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4 text-amber-400" />}
            {isGenerating ? "Generating PDF..." : "Generate & Download PDF"}
          </button>

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-600" />
            <span>PDF generation happens in the browser. It includes live ERP records plus any local offline DPR drafts waiting for sync.</span>
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 text-white shadow-lg">
          <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Available report contents</h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {REPORT_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => selectReportType(option.id)}
                className={`text-left p-3 rounded-lg border transition ${reportType === option.id ? "border-amber-500 bg-amber-500/10" : "border-slate-700 bg-slate-800/70 hover:border-slate-500"}`}
              >
                <span className="text-xs font-bold block">{option.label}</span>
                <span className="text-[10px] text-slate-400 mt-1 block leading-4">{option.description}</span>
              </button>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Project records loaded</span>
            <span className="font-mono text-amber-400">{(roads?.length || 0) + (dprList?.length || 0) + (activities?.length || 0) + (bills?.length || 0) + (hindrances?.length || 0) + (qaQcTests?.length || 0) + (materials?.length || 0) + (documents?.length || 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
