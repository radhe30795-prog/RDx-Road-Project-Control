import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type PdfCell = string | number;

export interface PdfReportSection {
  title: string;
  columns: string[];
  rows: PdfCell[][];
}

export interface PdfReportConfig {
  title: string;
  subtitle?: string;
  reportDate?: string;
  summary?: Array<{ label: string; value: string }>;
  sections: PdfReportSection[];
  filename?: string;
}

export interface PhotoCompendiumEntry {
  date: string;
  roadName: string;
  roadCode?: string;
  sectionType: string;
  activityName: string;
  chainage: string;
  caption: string;
  photoUrl: string;
  actualQuantity: string;
  billableQuantity: string;
  unit: string;
  billingStatus: string;
  remarks?: string;
}

function safePdfText(value: unknown): string {
  return String(value ?? "—")
    .replace(/[\u0000-\u001f]/g, " ")
    .trim() || "—";
}

async function loadPhotoDataUrl(url: string): Promise<{ data: string; format: "JPEG" | "PNG" } | null> {
  if (!url) return null;
  if (url.startsWith("data:image/png")) return { data: url, format: "PNG" };
  if (url.startsWith("data:image/")) return { data: url, format: "JPEG" };
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read image"));
      reader.readAsDataURL(blob);
    });
    return { data, format: blob.type.includes("png") ? "PNG" : "JPEG" };
  } catch {
    return null;
  }
}

export async function createPhotoCompendiumPdf(config: {
  title: string;
  subtitle: string;
  reportDate: string;
  summary: Array<{ label: string; value: string }>;
  entries: PhotoCompendiumEntry[];
  filename?: string;
}): Promise<{ includedPhotos: number; unavailablePhotos: number }> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let cursorY = 15;
  let includedPhotos = 0;
  let unavailablePhotos = 0;

  const drawHeader = () => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 25, "F");
    doc.setTextColor(245, 158, 11);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("RDx ROAD PROJECT CONTROL", margin, 11);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text(safePdfText(config.title), margin, 19);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, 11, { align: "right" });
    doc.text(`Report date: ${safePdfText(config.reportDate)}`, pageWidth - margin, 17, { align: "right" });
  };

  const drawFooter = () => {
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("RDx ERP • Monthly Site Photo Compendium", margin, pageHeight - 7);
    doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin, pageHeight - 7, { align: "right" });
  };

  drawHeader();
  cursorY = 33;
  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(safePdfText(config.subtitle), margin, cursorY);
  cursorY += 8;

  const boxWidth = (pageWidth - margin * 2 - 6) / Math.min(config.summary.length, 5);
  config.summary.forEach((item, index) => {
    const row = Math.floor(index / 5);
    const col = index % 5;
    const x = margin + col * (boxWidth + 1.5);
    const y = cursorY + row * 16;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x, y - 4, boxWidth, 13, 1.5, 1.5, "F");
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.text(safePdfText(item.label).toUpperCase(), x + 3, y + 1);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(safePdfText(item.value), x + 3, y + 6.5, { maxWidth: boxWidth - 6 });
    doc.setFont("helvetica", "normal");
  });
  cursorY += Math.ceil(config.summary.length / 5) * 18 + 2;

  for (const entry of config.entries) {
    const cardHeight = 57;
    if (cursorY > pageHeight - cardHeight - 15) {
      drawFooter();
      doc.addPage();
      drawHeader();
      cursorY = 33;
    }

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, cursorY, pageWidth - margin * 2, cardHeight, 2, 2, "FD");

    const photo = await loadPhotoDataUrl(entry.photoUrl);
    if (photo) {
      try {
        doc.addImage(photo.data, photo.format, margin + 3, cursorY + 3, 68, 48, undefined, "FAST");
        includedPhotos += 1;
      } catch {
        unavailablePhotos += 1;
      }
    } else {
      unavailablePhotos += 1;
      doc.setFillColor(226, 232, 240);
      doc.rect(margin + 3, cursorY + 3, 68, 48, "F");
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.text("Photo unavailable", margin + 37, cursorY + 28, { align: "center" });
    }

    const x = margin + 77;
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(safePdfText(entry.caption), x, cursorY + 9, { maxWidth: pageWidth - x - margin });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(`${safePdfText(entry.date)}  •  ${safePdfText(entry.roadCode || entry.roadName)}`, x, cursorY + 16);
    doc.setTextColor(180, 83, 9);
    doc.setFont("helvetica", "bold");
    doc.text(`${safePdfText(entry.sectionType)}  •  RD ${safePdfText(entry.chainage)}`, x, cursorY + 23);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text(`Activity: ${safePdfText(entry.activityName)}`, x, cursorY + 30, { maxWidth: pageWidth - x - margin });
    doc.text(`Actual: ${safePdfText(entry.actualQuantity)} ${safePdfText(entry.unit)}   |   Billable: ${safePdfText(entry.billableQuantity)} ${safePdfText(entry.unit)}   |   ${safePdfText(entry.billingStatus)}`, x, cursorY + 37, { maxWidth: pageWidth - x - margin });
    if (entry.remarks) doc.text(`Remarks: ${safePdfText(entry.remarks)}`, x, cursorY + 44, { maxWidth: pageWidth - x - margin });
    cursorY += cardHeight + 5;
  }

  drawFooter();
  const safeFilename = (config.filename || "rdx-monthly-photo-compendium")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  doc.save(`${safeFilename}-${new Date().toISOString().split("T")[0]}.pdf`);
  return { includedPhotos, unavailablePhotos };
}

export function createPdfReport(config: PdfReportConfig): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let cursorY = 15;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 25, "F");
  doc.setTextColor(245, 158, 11);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("RDx ROAD PROJECT CONTROL", margin, 11);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text(safePdfText(config.title), margin, 19);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, 11, { align: "right" });
  if (config.reportDate) {
    doc.text(`Report date: ${safePdfText(config.reportDate)}`, pageWidth - margin, 17, { align: "right" });
  }

  cursorY = 33;
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9);
  if (config.subtitle) {
    doc.text(safePdfText(config.subtitle), margin, cursorY);
    cursorY += 6;
  }

  if (config.summary?.length) {
    const boxWidth = (pageWidth - margin * 2 - 6) / Math.min(config.summary.length, 5);
    config.summary.forEach((item, index) => {
      const row = Math.floor(index / 5);
      const col = index % 5;
      const x = margin + col * (boxWidth + 1.5);
      const y = cursorY + row * 16;
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(x, y - 4, boxWidth, 13, 1.5, 1.5, "F");
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7);
      doc.text(safePdfText(item.label).toUpperCase(), x + 3, y + 1);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(safePdfText(item.value), x + 3, y + 6.5, { maxWidth: boxWidth - 6 });
      doc.setFont("helvetica", "normal");
    });
    cursorY += Math.ceil(config.summary.length / 5) * 18;
  }

  config.sections.forEach((section) => {
    if (cursorY > pageHeight - 35) {
      doc.addPage();
      cursorY = 16;
    }
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(safePdfText(section.title), margin, cursorY);
    doc.setFont("helvetica", "normal");
    cursorY += 3;

    autoTable(doc, {
      startY: cursorY,
      head: [section.columns.map(safePdfText)],
      body: section.rows.map((row) => row.map(safePdfText)),
      margin: { left: margin, right: margin },
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 7,
        cellPadding: 2,
        textColor: [30, 41, 59],
        overflow: "linebreak",
        valign: "top",
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didDrawPage: (hookData) => {
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text("RDx ERP • Project Control Report", margin, pageHeight - 7);
        doc.text(`Page ${hookData.pageNumber}`, pageWidth - margin, pageHeight - 7, { align: "right" });
      },
    });

    const tableEnd = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || cursorY + 12;
    cursorY = tableEnd + 9;
  });

  const safeFilename = (config.filename || config.title || "rdx-report")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  doc.save(`${safeFilename}-${new Date().toISOString().split("T")[0]}.pdf`);
}


export interface EmployeePayslipPdfData {
  companyName?: string;
  projectName?: string;
  packageNo?: string;
  month: string;
  employeeCode: string;
  employeeName: string;
  fatherName?: string;
  department?: string;
  designation?: string;
  employmentType: string;
  joiningDate?: string;
  payBasis: string;
  bankName?: string;
  accountLast4?: string;
  ifscCode?: string;
  panReference?: string;
  payableDays: string;
  absentDays: string;
  overtimeHours: string;
  basicRate: string;
  basicEarned: string;
  overtimeAmount: string;
  allowanceAmount: string;
  deductionAmount: string;
  grossAmount: string;
  netAmount: string;
  adjustments?: Array<{ title: string; type: string; amount: string }>;
}

export function generateEmployeePayslipPdf(data: EmployeePayslipPdfData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let cursorY = 16;

  // Header Box
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, cursorY, pageWidth - margin * 2, 28, "F");
  doc.setTextColor(245, 158, 11);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(data.companyName || "RDx ROAD PROJECT CONTROL", margin + 6, cursorY + 8);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(`SALARY PAY SLIP — ${safePdfText(data.month).toUpperCase()}`, margin + 6, cursorY + 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Project: ${safePdfText(data.projectName || "PMGSY-IV Batch-I")} | Pkg: ${safePdfText(data.packageNo || "CG 16-201")}`, margin + 6, cursorY + 23);
  doc.text(`Date Generated: ${new Date().toLocaleDateString("en-IN")}`, pageWidth - margin - 6, cursorY + 23, { align: "right" });

  cursorY += 34;

  // Employee Identity Block
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, cursorY, pageWidth - margin * 2, 38, 2, 2, "FD");

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`${safePdfText(data.employeeName)} (${safePdfText(data.employeeCode)})`, margin + 6, cursorY + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  const col1 = margin + 6;
  const col2 = margin + 66;
  const col3 = margin + 126;

  doc.text(`Designation: ${safePdfText(data.designation)}`, col1, cursorY + 16);
  doc.text(`Department: ${safePdfText(data.department)}`, col1, cursorY + 23);
  doc.text(`Employment: ${safePdfText(data.employmentType)}`, col1, cursorY + 30);

  doc.text(`Pay Basis: ${safePdfText(data.payBasis)}`, col2, cursorY + 16);
  doc.text(`Base Rate: ₹${safePdfText(data.basicRate)}`, col2, cursorY + 23);
  doc.text(`Joining Date: ${safePdfText(data.joiningDate)}`, col2, cursorY + 30);

  doc.text(`Bank: ${safePdfText(data.bankName)}`, col3, cursorY + 16);
  doc.text(`A/C: ****${safePdfText(data.accountLast4)}`, col3, cursorY + 23);
  doc.text(`IFSC: ${safePdfText(data.ifscCode)}`, col3, cursorY + 30);

  cursorY += 44;

  // Attendance metrics block
  const attWidth = (pageWidth - margin * 2 - 8) / 3;
  const attMetrics = [
    { label: "Payable Days", value: data.payableDays },
    { label: "Absent Days", value: data.absentDays },
    { label: "Overtime Hours", value: `${data.overtimeHours} Hrs` },
  ];
  attMetrics.forEach((m, idx) => {
    const x = margin + idx * (attWidth + 4);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x, cursorY, attWidth, 14, 1.5, 1.5, "F");
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7.5);
    doc.text(m.label.toUpperCase(), x + 4, cursorY + 5);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(safePdfText(m.value), x + 4, cursorY + 11);
    doc.setFont("helvetica", "normal");
  });

  cursorY += 20;

  // Earnings & Deductions Table
  const tableData = [
    ["Basic / Duty Pay", `₹${safePdfText(data.basicEarned)}`, "Salary Advance / Recovery", `₹${safePdfText(data.deductionAmount)}`],
    ["Overtime Pay", `₹${safePdfText(data.overtimeAmount)}`, "Other Deductions / Fines", "₹0.00"],
    ["Site Allowances / Bonus", `₹${safePdfText(data.allowanceAmount)}`, "—", "—"],
    ["GROSS EARNINGS", `₹${safePdfText(data.grossAmount)}`, "TOTAL DEDUCTIONS", `₹${safePdfText(data.deductionAmount)}`],
  ];

  autoTable(doc, {
    startY: cursorY,
    head: [["Earnings Description", "Amount", "Deductions & Recoveries", "Amount"]],
    body: tableData,
    margin: { left: margin, right: margin },
    theme: "grid",
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  cursorY = (doc as any).lastAutoTable.finalY + 8;

  // Net Payable Box
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(52, 211, 153);
  doc.roundedRect(margin, cursorY, pageWidth - margin * 2, 20, 2, 2, "FD");

  doc.setTextColor(4, 120, 87);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("NET TAKE-HOME PAYABLE:", margin + 6, cursorY + 8);
  doc.setFontSize(14);
  doc.text(`₹${safePdfText(data.netAmount)}`, margin + 6, cursorY + 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("System calculated from daily muster roll and verified advances", pageWidth - margin - 6, cursorY + 12, { align: "right" });

  cursorY += 32;

  // Signatures
  doc.setDrawColor(203, 213, 225);
  doc.line(margin + 10, cursorY + 18, margin + 65, cursorY + 18);
  doc.line(pageWidth - margin - 65, cursorY + 18, pageWidth - margin - 10, cursorY + 18);

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.text("Employee Signature", margin + 22, cursorY + 23);
  doc.text("Authorised Signatory / HR", pageWidth - margin - 58, cursorY + 23);

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("This is an electronically generated salary slip and requires no physical seal if digitally approved.", margin, pageHeight - 8);

  const filename = `payslip-${data.employeeCode}-${data.month}.pdf`;
  doc.save(filename);
}


export interface BankPayoutCsvRow {
  beneficiaryName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  amount: string;
  employeeCode: string;
  narration: string;
}

export function exportBankPayoutCsv(batchReference: string, rows: BankPayoutCsvRow[]): void {
  const headers = ["Beneficiary Name", "Account Number / Mask", "IFSC Code", "Bank Name", "Amount (INR)", "Employee Code", "Payment Narration"];
  const csvLines = [
    headers.join(","),
    ...rows.map((r) => [
      `"${r.beneficiaryName.replace(/"/g, '""')}"`,
      `"${r.accountNumber}"`,
      `"${r.ifscCode}"`,
      `"${(r.bankName || "SBI").replace(/"/g, '""')}"`,
      r.amount,
      `"${r.employeeCode}"`,
      `"${r.narration.replace(/"/g, '""')}"`,
    ].join(",")),
  ];

  const blob = new Blob([csvLines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `NEFT-Payout-${batchReference}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface MusterMatrixPdfData {
  projectName?: string;
  month: string;
  days: string[];
  matrix: Array<{
    code: string;
    name: string;
    role: string;
    present: number;
    halfDay: number;
    absent: number;
    ot: number;
    payable: number;
    daysMap: Record<string, string>;
  }>;
}

export function generateMusterMatrixPdf(data: MusterMatrixPdfData): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  let cursorY = 12;

  doc.setFillColor(15, 23, 42);
  doc.rect(margin, cursorY, pageWidth - margin * 2, 16, "F");
  doc.setTextColor(245, 158, 11);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("RDx ROAD PROJECT CONTROL — MONTHLY MUSTER ROLL MATRIX", margin + 4, cursorY + 6);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.text(`Project: ${safePdfText(data.projectName || "PMGSY-IV Batch-I CG 16-201")} | Month: ${safePdfText(data.month)}`, margin + 4, cursorY + 12);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, pageWidth - margin - 4, cursorY + 12, { align: "right" });

  cursorY += 20;

  const dayHeaders = data.days.map((d) => d.slice(-2));
  const tableHead = [["Emp Code", "Staff Name", "Role", ...dayHeaders, "P", "HD", "A", "OT", "Payable"]];

  const tableBody = data.matrix.map((row) => {
    const dayCells = data.days.map((d) => row.daysMap[d] || "—");
    return [
      row.code,
      row.name,
      row.role,
      ...dayCells,
      String(row.present),
      String(row.halfDay),
      String(row.absent),
      `${row.ot}h`,
      String(row.payable),
    ];
  });

  autoTable(doc, {
    startY: cursorY,
    head: tableHead,
    body: tableBody,
    margin: { left: margin, right: margin },
    theme: "grid",
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 6.5, halign: "center" },
    bodyStyles: { fontSize: 6, textColor: [51, 65, 85], halign: "center" },
    columnStyles: {
      0: { halign: "left", cellWidth: 16 },
      1: { halign: "left", cellWidth: 28 },
      2: { halign: "left", cellWidth: 22 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(`Muster-Matrix-${data.month}.pdf`);
}
