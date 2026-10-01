import { eq } from "drizzle-orm";
import {
  activities,
  approvalSignoffs,
  billing,
  boqItems,
  dailyProgress,
  documents,
  grnEntries,
  hindrances,
  machineryAssets,
  machineryLogs,
  materialInventory,
  materialIssues,
  materialVariances,
  materials,
  measurementEntries,
  projects,
  qaQcTests,
  roads,
  roadStructures,
  subcontractors,
  workOrders,
  hrDepartments,
  hrDesignations,
  hrEmployees,
} from "../drizzle/schema";
import { getDb } from "./db";

export type WorkbookRows = Record<string, Record<string, unknown>[]>;

export type ImportIssue = {
  sheet: string;
  row: number;
  message: string;
};

export type ImportSummary = {
  imported: number;
  skipped: number;
  issues: ImportIssue[];
  sheets: Record<string, { imported: number; skipped: number; issues: number }>;
};

type RefMaps = {
  projects: Map<string, number>;
  roads: Map<string, number>;
  activities: Map<string, number>;
  boq: Map<string, number>;
  materials: Map<string, number>;
  subcontractors: Map<string, number>;
  assets: Map<string, number>;
  departments: Map<string, number>;
  designations: Map<string, number>;
};

const text = (row: Record<string, unknown>, key: string) => {
  const value = row[key];
  return value === undefined || value === null ? "" : String(value).trim();
};

const optional = (row: Record<string, unknown>, key: string) => {
  const value = text(row, key);
  return value || null;
};

const numberText = (row: Record<string, unknown>, key: string, fallback = "0") => {
  const value = text(row, key);
  if (!value) return fallback;
  const number = Number(value.replace(/,/g, ""));
  if (!Number.isFinite(number)) throw new Error(`${key} must be numeric`);
  return String(number);
};

function required(row: Record<string, unknown>, keys: string[]) {
  const missing = keys.filter((key) => !text(row, key));
  if (missing.length) throw new Error(`Missing required column value(s): ${missing.join(", ")}`);
}

function resolve(map: Map<string, number>, row: Record<string, unknown>, key: string) {
  const value = text(row, key);
  if (!value) throw new Error(`Missing ${key}`);
  const direct = Number(value);
  if (Number.isInteger(direct) && direct > 0) return direct;
  const id = map.get(value.toLowerCase());
  if (!id) throw new Error(`${key} '${value}' was not found. Use the exact code from the template.`);
  return id;
}

function resolveOptional(map: Map<string, number>, row: Record<string, unknown>, key: string) {
  const value = text(row, key);
  return value ? resolve(map, row, key) : null;
}

async function loadRefs(db: Awaited<ReturnType<typeof getDb>>): Promise<RefMaps> {
  if (!db) throw new Error("Database not connected");
  const [projectRows, roadRows, activityRows, boqRows, materialRows, subRows, assetRows, departmentRows, designationRows] = await Promise.all([
    db.select({ id: projects.id, code: projects.projectId }).from(projects),
    db.select({ id: roads.id, code: roads.roadId }).from(roads),
    db.select({ id: activities.id, code: activities.taskId }).from(activities),
    db.select({ id: boqItems.id, code: boqItems.itemCode }).from(boqItems),
    db.select({ id: materialInventory.id, code: materialInventory.materialCode }).from(materialInventory),
    db.select({ id: subcontractors.id, code: subcontractors.subcontractorCode }).from(subcontractors),
    db.select({ id: machineryAssets.id, code: machineryAssets.assetNo }).from(machineryAssets),
    db.select({ id: hrDepartments.id, code: hrDepartments.code }).from(hrDepartments),
    db.select({ id: hrDesignations.id, code: hrDesignations.code }).from(hrDesignations),
  ]);
  const toMap = (rows: Array<{ id: number; code: string }>) => new Map(rows.map((item) => [item.code.toLowerCase(), item.id]));
  return {
    projects: toMap(projectRows), roads: toMap(roadRows), activities: toMap(activityRows), boq: toMap(boqRows),
    materials: toMap(materialRows), subcontractors: toMap(subRows), assets: toMap(assetRows),
    departments: toMap(departmentRows), designations: toMap(designationRows),
  };
}

const EMPLOYMENT_TYPES = ["Staff", "Site Engineer", "Supervisor", "Operator", "Skilled Labour", "Unskilled Labour", "Contract", "Consultant"] as const;
const PAY_BASES = ["Monthly", "Daily", "Hourly"] as const;
const EMPLOYEE_STATUSES = ["Active", "On Leave", "Inactive", "Exited"] as const;

function enumValue<T extends readonly string[]>(row: Record<string, unknown>, key: string, values: T, fallback: T[number]) {
  const value = text(row, key) || fallback;
  if (!values.includes(value)) throw new Error(`${key} must be one of: ${values.join(", ")}`);
  return value as T[number];
}

function optionalLast4(row: Record<string, unknown>, key: string) {
  const value = optional(row, key);
  if (value && !/^\d{4}$/.test(value)) throw new Error(`${key} must contain exactly 4 digits`);
  return value;
}

function optionalEmail(row: Record<string, unknown>, key: string) {
  const value = optional(row, key);
  if (value && !/^\S+@\S+\.\S+$/.test(value)) throw new Error(`${key} must be a valid email address`);
  return value;
}

function resolveHrReference(map: Map<string, number>, row: Record<string, unknown>, key: string) {
  const value = text(row, key);
  if (!value) return null;
  const direct = Number(value);
  if (Number.isInteger(direct) && direct > 0) return direct;
  const id = map.get(value.toLowerCase());
  if (!id) throw new Error(`${key} '${value}' was not found. Use the exact department/designation code from HR Masters.`);
  return id;
}

function employeeInsertValues(row: Record<string, unknown>, refs: RefMaps) {
  required(row, ["employeeCode", "fullName", "joiningDate"]);
  return {
    employeeCode: text(row, "employeeCode"),
    fullName: text(row, "fullName"),
    fatherName: optional(row, "fatherName"),
    phone: optional(row, "phone"),
    email: optionalEmail(row, "email"),
    dateOfBirth: optional(row, "dateOfBirth"),
    gender: optional(row, "gender") as "Male" | "Female" | "Other" | null,
    aadhaarLast4: optionalLast4(row, "aadhaarLast4"),
    panReference: optional(row, "panReference"),
    address: optional(row, "address"),
    emergencyContactName: optional(row, "emergencyContactName"),
    emergencyContactPhone: optional(row, "emergencyContactPhone"),
    departmentId: resolveHrReference(refs.departments, row, "departmentCode"),
    designationId: resolveHrReference(refs.designations, row, "designationCode"),
    employmentType: enumValue(row, "employmentType", EMPLOYMENT_TYPES, "Staff"),
    joiningDate: text(row, "joiningDate"),
    exitDate: optional(row, "exitDate"),
    status: enumValue(row, "status", EMPLOYEE_STATUSES, "Active"),
    payBasis: enumValue(row, "payBasis", PAY_BASES, "Monthly"),
    basicRate: numberText(row, "basicRate"),
    overtimeRate: numberText(row, "overtimeRate"),
    bankName: optional(row, "bankName"),
    accountLast4: optionalLast4(row, "accountLast4"),
    ifscCode: optional(row, "ifscCode"),
    photoUrl: optional(row, "photoUrl"),
    documentReferences: optional(row, "documentReferences"),
    remarks: optional(row, "remarks"),
  };
}

export async function importHrEmployees(rows: Record<string, unknown>[]): Promise<ImportSummary> {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const summary: ImportSummary = { imported: 0, skipped: 0, issues: [], sheets: {} };
  const refs = await loadRefs(db);
  const seenCodes = new Set<string>();

  for (let index = 0; index < rows.length; index += 1) {
    try {
      const values = employeeInsertValues(rows[index]!, refs);
      const key = values.employeeCode.toLowerCase();
      if (seenCodes.has(key)) throw new Error(`Duplicate employeeCode '${values.employeeCode}' in this workbook`);
      seenCodes.add(key);
      await db.insert(hrEmployees).values(values);
      summary.imported += 1;
    } catch (error) {
      summary.skipped += 1;
      summary.issues.push({ sheet: "Employees", row: index + 2, message: error instanceof Error ? error.message : "Employee import failed" });
    }
  }

  summary.sheets.Employees = { imported: summary.imported, skipped: summary.skipped, issues: summary.issues.length };
  return summary;
}

async function importRow(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, sheet: string, row: Record<string, unknown>, refs: RefMaps) {
  switch (sheet) {
    case "Projects":
      required(row, ["projectId", "projectName", "clientDepartment", "contractor", "agreementStartDate", "agreementEndDate"]);
      await db.insert(projects).values({
        projectId: text(row, "projectId"), projectName: text(row, "projectName"), package: optional(row, "package"),
        clientDepartment: text(row, "clientDepartment"), contractor: text(row, "contractor"),
        agreementStartDate: text(row, "agreementStartDate"), agreementEndDate: text(row, "agreementEndDate"),
        status: (text(row, "status") || "In Progress") as any, overallProgress: numberText(row, "overallProgress"), remarks: optional(row, "remarks"),
      });
      return;
    case "Roads":
      required(row, ["roadId", "projectId", "roadName", "roadLengthKm", "startRd", "endRd"]);
      await db.insert(roads).values({
        roadId: text(row, "roadId"), projectId: resolve(refs.projects, row, "projectId"), roadName: text(row, "roadName"),
        roadLengthKm: numberText(row, "roadLengthKm"), startRd: text(row, "startRd"), endRd: text(row, "endRd"),
        status: (text(row, "status") || "In Progress") as any, progress: numberText(row, "progress"), remarks: optional(row, "remarks"),
      });
      return;
    case "Activities":
      required(row, ["taskId", "projectId", "roadId", "phase", "activityName", "startDate", "endDate"]);
      await db.insert(activities).values({
        taskId: text(row, "taskId"), projectId: resolve(refs.projects, row, "projectId"), roadId: resolve(refs.roads, row, "roadId"),
        phase: text(row, "phase") as any, activityName: text(row, "activityName"), startDate: text(row, "startDate"), endDate: text(row, "endDate"),
        percentageComplete: numberText(row, "percentageComplete"), status: (text(row, "status") || "Not Started") as any,
        priority: (text(row, "priority") || "Medium") as any, assignedTo: optional(row, "assignedTo"), predecessorActivity: optional(row, "predecessorActivity"),
        dependencyType: optional(row, "dependencyType") || "FS", remarks: optional(row, "remarks"),
      });
      return;
    case "Employees":
      await db.insert(hrEmployees).values(employeeInsertValues(row, refs));
      return;
    case "BOQ":
      required(row, ["itemCode", "projectId", "chapter", "description", "unit", "contractQuantity", "rate"]);
      await db.insert(boqItems).values({
        itemCode: text(row, "itemCode"), projectId: resolve(refs.projects, row, "projectId"), roadId: resolveOptional(refs.roads, row, "roadId"),
        chapter: text(row, "chapter"), description: text(row, "description"), unit: text(row, "unit"),
        contractQuantity: numberText(row, "contractQuantity"), revisedQuantity: optional(row, "revisedQuantity"), executedQuantity: numberText(row, "executedQuantity"),
        balanceQuantity: numberText(row, "balanceQuantity"), rate: numberText(row, "rate"), contractAmount: numberText(row, "contractAmount"),
        status: (text(row, "status") || "Active") as any, remarks: optional(row, "remarks"),
      });
      return;
    case "Inventory":
      required(row, ["materialCode", "projectId", "materialName", "unit"]);
      await db.insert(materialInventory).values({
        materialCode: text(row, "materialCode"), projectId: resolve(refs.projects, row, "projectId"), materialName: text(row, "materialName"), unit: text(row, "unit"),
        minStock: numberText(row, "minStock"), maxStock: numberText(row, "maxStock"), openingStock: numberText(row, "openingStock"),
        receivedQuantity: numberText(row, "receivedQuantity"), issuedQuantity: numberText(row, "issuedQuantity"), returnedQuantity: numberText(row, "returnedQuantity"),
        wastageQuantity: numberText(row, "wastageQuantity"), balanceQuantity: numberText(row, "balanceQuantity"), averageRate: numberText(row, "averageRate"),
        supplier: optional(row, "supplier"), storageLocation: optional(row, "storageLocation"), approvalStatus: (text(row, "approvalStatus") || "Pending") as any, remarks: optional(row, "remarks"),
      });
      return;
    case "GRN":
      required(row, ["grnNo", "grnDate", "projectId", "materialCode", "supplier", "receivedQuantity", "unit"]);
      await db.insert(grnEntries).values({
        grnNo: text(row, "grnNo"), grnDate: text(row, "grnDate"), projectId: resolve(refs.projects, row, "projectId"), materialId: resolve(refs.materials, row, "materialCode"),
        supplier: text(row, "supplier"), challanNo: optional(row, "challanNo"), receivedQuantity: numberText(row, "receivedQuantity"), acceptedQuantity: numberText(row, "acceptedQuantity", numberText(row, "receivedQuantity")),
        rejectedQuantity: numberText(row, "rejectedQuantity"), unit: text(row, "unit"), rate: numberText(row, "rate"), totalAmount: numberText(row, "totalAmount"),
        inspectionStatus: (text(row, "inspectionStatus") || "Pending") as any, invoiceReference: optional(row, "invoiceReference"), remarks: optional(row, "remarks"),
      });
      return;
    case "Material Issues":
      required(row, ["issueNo", "issueDate", "projectId", "roadId", "materialCode", "quantity", "unit", "purpose"]);
      await db.insert(materialIssues).values({
        issueNo: text(row, "issueNo"), issueDate: text(row, "issueDate"), projectId: resolve(refs.projects, row, "projectId"), roadId: resolve(refs.roads, row, "roadId"), materialId: resolve(refs.materials, row, "materialCode"), boqItemId: resolveOptional(refs.boq, row, "itemCode"), dailyProgressId: text(row, "dailyProgressId") ? Number(text(row, "dailyProgressId")) : null, quantity: numberText(row, "quantity"), unit: text(row, "unit"), purpose: text(row, "purpose"), remarks: optional(row, "remarks"),
      });
      return;
    case "Material Variance":
      required(row, ["varianceNo", "projectId", "roadId", "itemCode", "materialCode", "periodFrom", "periodTo"]);
      await db.insert(materialVariances).values({
        varianceNo: text(row, "varianceNo"), projectId: resolve(refs.projects, row, "projectId"), roadId: resolve(refs.roads, row, "roadId"), boqItemId: resolve(refs.boq, row, "itemCode"), materialId: resolve(refs.materials, row, "materialCode"), periodFrom: text(row, "periodFrom"), periodTo: text(row, "periodTo"), theoreticalQuantity: numberText(row, "theoreticalQuantity"), actualQuantity: numberText(row, "actualQuantity"), varianceQuantity: numberText(row, "varianceQuantity"), variancePercent: numberText(row, "variancePercent"), status: (text(row, "status") || "Within Limit") as any, reason: optional(row, "reason"), remarks: optional(row, "remarks"),
      });
      return;
    case "DPR":
      required(row, ["date", "projectId", "roadId", "taskId", "plannedQuantity", "actualQuantity", "unit", "percentageComplete"]);
      await db.insert(dailyProgress).values({
        date: text(row, "date"), projectId: resolve(refs.projects, row, "projectId"), roadId: resolve(refs.roads, row, "roadId"), activityId: resolve(refs.activities, row, "taskId"),
        clientDraftId: optional(row, "clientDraftId"), boqItemId: resolveOptional(refs.boq, row, "itemCode"), materialId: resolveOptional(refs.materials, row, "materialCode"),
        materialConsumedQuantity: optional(row, "materialConsumedQuantity"), plannedQuantity: numberText(row, "plannedQuantity"), actualQuantity: numberText(row, "actualQuantity"), unit: text(row, "unit"), percentageComplete: numberText(row, "percentageComplete"),
        manpower: optional(row, "manpower"), machinery: optional(row, "machinery"), weather: optional(row, "weather") || "Clear / Sunny", hindrance: optional(row, "hindrance"), remarks: optional(row, "remarks"), sitePhotos: optional(row, "sitePhotos"),
      });
      return;
    case "e-MB":
      required(row, ["mbNo", "mbDate", "projectId", "roadId", "itemCode", "locationFrom", "locationTo", "length", "unit"]);
      await db.insert(measurementEntries).values({
        mbNo: text(row, "mbNo"), mbDate: text(row, "mbDate"), projectId: resolve(refs.projects, row, "projectId"), roadId: resolve(refs.roads, row, "roadId"), boqItemId: resolve(refs.boq, row, "itemCode"), activityId: resolveOptional(refs.activities, row, "taskId"),
        locationFrom: text(row, "locationFrom"), locationTo: text(row, "locationTo"), length: numberText(row, "length"), width: numberText(row, "width"), depth: numberText(row, "depth"), calculatedQuantity: numberText(row, "calculatedQuantity"), unit: text(row, "unit"), rate: numberText(row, "rate"), amount: numberText(row, "amount"), status: (text(row, "status") || "Draft") as any, submittedBy: optional(row, "submittedBy"), checkedBy: optional(row, "checkedBy"), remarks: optional(row, "remarks"),
      });
      return;
    case "Billing":
      required(row, ["billId", "projectId", "roadId", "billType"]);
      await db.insert(billing).values({
        billId: text(row, "billId"), projectId: resolve(refs.projects, row, "projectId"), roadId: resolve(refs.roads, row, "roadId"), billType: text(row, "billType"),
        measurementStatus: (text(row, "measurementStatus") || "Pending") as any, quantityCalculationStatus: (text(row, "quantityCalculationStatus") || "Pending") as any, abstractStatus: (text(row, "abstractStatus") || "Pending") as any, billPrepared: (text(row, "billPrepared") || "No") as any, submissionDate: optional(row, "submissionDate"), verificationStatus: (text(row, "verificationStatus") || "Measurement") as any, passedAmount: optional(row, "passedAmount"), paymentStatus: (text(row, "paymentStatus") || "Unpaid") as any, paymentDate: optional(row, "paymentDate"), periodFrom: optional(row, "periodFrom"), periodTo: optional(row, "periodTo"), grossAmount: optional(row, "grossAmount"), gstAmount: optional(row, "gstAmount"), retentionAmount: optional(row, "retentionAmount"), netPayable: optional(row, "netPayable"), remarks: optional(row, "remarks"),
      });
      return;
    case "Hindrances":
      required(row, ["hindranceId", "projectId", "roadId", "rdLocation", "category", "description", "dateRaised", "affectedActivity", "responsiblePersonDepartment"]);
      await db.insert(hindrances).values({ hindranceId: text(row, "hindranceId"), projectId: resolve(refs.projects, row, "projectId"), roadId: resolve(refs.roads, row, "roadId"), rdLocation: text(row, "rdLocation"), category: text(row, "category") as any, description: text(row, "description"), dateRaised: text(row, "dateRaised"), affectedActivity: text(row, "affectedActivity"), affectedLength: optional(row, "affectedLength"), responsiblePersonDepartment: text(row, "responsiblePersonDepartment"), letterNumber: optional(row, "letterNumber"), status: (text(row, "status") || "Open") as any, dueDate: optional(row, "dueDate"), resolutionDate: optional(row, "resolutionDate"), daysPending: Number(numberText(row, "daysPending")), remarks: optional(row, "remarks"), supportingPhotosDocuments: optional(row, "supportingPhotosDocuments") });
      return;
    case "QA-QC":
      required(row, ["testId", "date", "projectId", "roadId", "activity", "testType", "locationRd", "requiredValue", "actualValue", "unit"]);
      await db.insert(qaQcTests).values({ testId: text(row, "testId"), date: text(row, "date"), projectId: resolve(refs.projects, row, "projectId"), roadId: resolve(refs.roads, row, "roadId"), activity: text(row, "activity"), testType: text(row, "testType") as any, locationRd: text(row, "locationRd"), requiredValue: text(row, "requiredValue"), actualValue: text(row, "actualValue"), unit: text(row, "unit"), result: (text(row, "result") || "Pending") as any, testReportReference: optional(row, "testReportReference"), remarks: optional(row, "remarks"), correctiveActionStatus: (text(row, "correctiveActionStatus") || "None") as any, correctiveActionNotes: optional(row, "correctiveActionNotes") });
      return;
    case "Materials":
      required(row, ["entryId", "date", "projectId", "roadId", "material", "unit"]);
      await db.insert(materials).values({ entryId: text(row, "entryId"), date: text(row, "date"), projectId: resolve(refs.projects, row, "projectId"), roadId: resolve(refs.roads, row, "roadId"), material: text(row, "material"), receivedQuantity: numberText(row, "receivedQuantity"), usedQuantity: numberText(row, "usedQuantity"), balanceQuantity: numberText(row, "balanceQuantity"), unit: text(row, "unit"), supplier: optional(row, "supplier"), challanReference: optional(row, "challanReference"), remarks: optional(row, "remarks") });
      return;
    case "Documents":
      required(row, ["projectId", "category", "title", "fileUrl", "date"]);
      await db.insert(documents).values({ projectId: resolve(refs.projects, row, "projectId"), roadId: resolveOptional(refs.roads, row, "roadId"), category: text(row, "category") as any, title: text(row, "title"), documentNumber: optional(row, "documentNumber"), fileUrl: text(row, "fileUrl"), fileSize: optional(row, "fileSize"), uploadedBy: optional(row, "uploadedBy"), date: text(row, "date"), remarks: optional(row, "remarks") });
      return;
    case "Subcontractors":
      required(row, ["subcontractorCode", "projectId", "name", "workCategory"]);
      await db.insert(subcontractors).values({ subcontractorCode: text(row, "subcontractorCode"), projectId: resolve(refs.projects, row, "projectId"), name: text(row, "name"), workCategory: text(row, "workCategory"), contactPerson: optional(row, "contactPerson"), phone: optional(row, "phone"), gstin: optional(row, "gstin"), status: (text(row, "status") || "Active") as any, remarks: optional(row, "remarks") });
      return;
    case "Work Orders":
      required(row, ["workOrderNo", "projectId", "roadId", "subcontractorCode", "scope", "unit", "startDate", "targetDate"]);
      await db.insert(workOrders).values({ workOrderNo: text(row, "workOrderNo"), projectId: resolve(refs.projects, row, "projectId"), roadId: resolve(refs.roads, row, "roadId"), subcontractorId: resolve(refs.subcontractors, row, "subcontractorCode"), scope: text(row, "scope"), unit: text(row, "unit"), awardedQuantity: numberText(row, "awardedQuantity"), executedQuantity: numberText(row, "executedQuantity"), rate: numberText(row, "rate"), awardedAmount: numberText(row, "awardedAmount"), paidAmount: numberText(row, "paidAmount"), retentionAmount: numberText(row, "retentionAmount"), startDate: text(row, "startDate"), targetDate: text(row, "targetDate"), status: (text(row, "status") || "Draft") as any, remarks: optional(row, "remarks") });
      return;
    case "Machinery Assets":
      required(row, ["assetNo", "projectId", "assetType"]);
      await db.insert(machineryAssets).values({ assetNo: text(row, "assetNo"), projectId: resolve(refs.projects, row, "projectId"), assetType: text(row, "assetType"), makeModel: optional(row, "makeModel"), registrationNo: optional(row, "registrationNo"), currentRoadId: resolveOptional(refs.roads, row, "roadId"), openingHourMeter: numberText(row, "openingHourMeter"), currentHourMeter: numberText(row, "currentHourMeter"), expectedFuelPerHour: numberText(row, "expectedFuelPerHour"), status: (text(row, "status") || "Available") as any, operator: optional(row, "operator"), remarks: optional(row, "remarks") });
      return;
    case "Machinery Logs":
      required(row, ["logNo", "logDate", "projectId", "roadId", "assetNo"]);
      await db.insert(machineryLogs).values({ logNo: text(row, "logNo"), logDate: text(row, "logDate"), projectId: resolve(refs.projects, row, "projectId"), roadId: resolve(refs.roads, row, "roadId"), assetId: resolve(refs.assets, row, "assetNo"), openingHourMeter: numberText(row, "openingHourMeter"), closingHourMeter: numberText(row, "closingHourMeter"), workHours: numberText(row, "workHours"), fuelIssued: numberText(row, "fuelIssued"), fuelRate: numberText(row, "fuelRate"), fuelAmount: numberText(row, "fuelAmount"), fuelEfficiency: numberText(row, "fuelEfficiency"), operator: optional(row, "operator"), workDescription: optional(row, "workDescription"), utilizationStatus: (text(row, "utilizationStatus") || "Efficient") as any, remarks: optional(row, "remarks") });
      return;
    case "Sign-offs":
      required(row, ["entityType", "entityId", "stage", "requestedBy", "assignedRole"]);
      await db.insert(approvalSignoffs).values({ entityType: text(row, "entityType"), entityId: text(row, "entityId"), stage: text(row, "stage"), requestedBy: text(row, "requestedBy"), assignedRole: text(row, "assignedRole"), signedBy: optional(row, "signedBy"), status: (text(row, "status") || "Pending") as any, comments: optional(row, "comments"), signedAt: optional(row, "signedAt") as any });
      return;
    case "Structures": {
      required(row, ["structureNo", "projectId", "roadId", "structureType", "chainageFrom"]);
      // Upsert on structureNo: re-importing corrects quantities without creating duplicates.
      // status / billableQuantity are intentionally NOT overwritten (user progress is preserved).
      const sno = text(row, "structureNo");
      const existing = await db.select({ id: roadStructures.id }).from(roadStructures).where(eq(roadStructures.structureNo, sno)).limit(1);
      const measurement = {
        projectId: resolve(refs.projects, row, "projectId"),
        roadId: resolve(refs.roads, row, "roadId"),
        structureType: text(row, "structureType") as any,
        chainageFrom: text(row, "chainageFrom"),
        chainageTo: optional(row, "chainageTo"),
        locationDescription: optional(row, "locationDescription"),
        count: numberText(row, "count", "1.00"),
        length: optional(row, "length"),
        width: optional(row, "width"),
        height: optional(row, "height"),
        quantity: numberText(row, "quantity", "1.000"),
        unit: text(row, "unit") || "Nos",
        remarks: optional(row, "remarks"),
      };
      if (existing.length > 0) {
        await db.update(roadStructures).set(measurement).where(eq(roadStructures.id, existing[0].id));
      } else {
        await db.insert(roadStructures).values({
          structureNo: sno,
          ...measurement,
          status: (text(row, "status") || "Not Started") as any,
          billableQuantity: numberText(row, "billableQuantity", "0.000"),
        });
      }
      return;
    }
    default:
      throw new Error(`Unsupported sheet '${sheet}'. Download the latest template.`);
  }
}

const importOrder = ["Projects", "Roads", "Structures", "Activities", "Employees", "BOQ", "Inventory", "GRN", "Material Issues", "Material Variance", "DPR", "e-MB", "Billing", "Hindrances", "QA-QC", "Materials", "Documents", "Subcontractors", "Work Orders", "Machinery Assets", "Machinery Logs", "Sign-offs"];

export async function importWorkbook(rowsBySheet: WorkbookRows): Promise<ImportSummary> {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const summary: ImportSummary = { imported: 0, skipped: 0, issues: [], sheets: {} };
  let refs = await loadRefs(db);

  for (const sheet of importOrder) {
    const rows = rowsBySheet[sheet] || [];
    if (!rows.length) continue;
    let imported = 0;
    let skipped = 0;
    for (let index = 0; index < rows.length; index += 1) {
      try {
        await importRow(db, sheet, rows[index], refs);
        imported += 1;
        summary.imported += 1;
        refs = await loadRefs(db);
      } catch (error) {
        skipped += 1;
        summary.skipped += 1;
        summary.issues.push({ sheet, row: index + 2, message: error instanceof Error ? error.message : "Import failed" });
      }
    }
    summary.sheets[sheet] = { imported, skipped, issues: skipped };
  }
  return summary;
}

export const TEMPLATE_SHEETS = importOrder;
