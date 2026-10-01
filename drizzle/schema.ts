import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, date } from "drizzle-orm/mysql-core";

/**
 * Users Table
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "project_manager", "qs_billing_engineer", "site_engineer", "qa_qc_engineer", "hr_payroll_manager"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Apps created by each authenticated Manus user.
 * Ownership is keyed by the stable OAuth openId so the launcher is isolated per account.
 */
export const userApps = mysqlTable("user_apps", {
  id: int("id").autoincrement().primaryKey(),
  ownerOpenId: varchar("ownerOpenId", { length: 64 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  route: varchar("route", { length: 255 }).notNull(),
  icon: varchar("icon", { length: 40 }).default("layout-grid").notNull(),
  accent: varchar("accent", { length: 30 }).default("amber").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserApp = typeof userApps.$inferSelect;
export type InsertUserApp = typeof userApps.$inferInsert;

/**
 * 1. PROJECTS
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  projectId: varchar("projectId", { length: 50 }).notNull().unique(),
  projectName: varchar("projectName", { length: 255 }).notNull(),
  package: varchar("package", { length: 100 }),
  clientDepartment: varchar("clientDepartment", { length: 255 }).notNull(),
  contractor: varchar("contractor", { length: 255 }).notNull(),
  agreementStartDate: varchar("agreementStartDate", { length: 20 }).notNull(),
  agreementEndDate: varchar("agreementEndDate", { length: 20 }).notNull(),
  status: mysqlEnum("status", ["Not Started", "In Progress", "Completed", "On Hold"]).default("In Progress").notNull(),
  overallProgress: decimal("overallProgress", { precision: 5, scale: 2 }).default("0.00").notNull(),
  remarks: text("remarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * 2. ROADS (Target: 14 Roads)
 */
export const roads = mysqlTable("roads", {
  id: int("id").autoincrement().primaryKey(),
  roadId: varchar("roadId", { length: 50 }).notNull().unique(),
  projectId: int("projectId").notNull(),
  roadName: varchar("roadName", { length: 255 }).notNull(),
  roadLengthKm: decimal("roadLengthKm", { precision: 8, scale: 3 }).notNull(),
  startRd: varchar("startRd", { length: 50 }).notNull(),
  endRd: varchar("endRd", { length: 50 }).notNull(),
  status: mysqlEnum("status", ["Not Started", "In Progress", "Completed", "On Hold"]).default("In Progress").notNull(),
  progress: decimal("progress", { precision: 5, scale: 2 }).default("0.00").notNull(),
  remarks: text("remarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Road = typeof roads.$inferSelect;
export type InsertRoad = typeof roads.$inferInsert;

/**
 * 3. ACTIVITIES
 */
export const activities = mysqlTable("activities", {
  id: int("id").autoincrement().primaryKey(),
  taskId: varchar("taskId", { length: 50 }).notNull().unique(),
  projectId: int("projectId").notNull(),
  roadId: int("roadId").notNull(),
  phase: mysqlEnum("phase", [
    "Pre-Construction",
    "Earthwork",
    "GSB",
    "WMM",
    "Bituminous Work",
    "Structures / CD Works",
    "Drain & Protection",
    "Shoulder",
    "Road Furniture",
    "QA/QC",
    "Billing & QS",
    "Hindrance",
    "Completion"
  ]).notNull(),
  activityName: varchar("activityName", { length: 255 }).notNull(),
  startDate: varchar("startDate", { length: 20 }).notNull(),
  endDate: varchar("endDate", { length: 20 }).notNull(),
  percentageComplete: decimal("percentageComplete", { precision: 5, scale: 2 }).default("0.00").notNull(),
  status: mysqlEnum("status", ["Not Started", "In Progress", "Complete", "On Hold", "Overdue"]).default("Not Started").notNull(),
  priority: mysqlEnum("priority", ["Low", "Medium", "High", "Critical"]).default("Medium").notNull(),
  assignedTo: varchar("assignedTo", { length: 255 }),
  predecessorActivity: varchar("predecessorActivity", { length: 255 }),
  dependencyType: varchar("dependencyType", { length: 50 }).default("FS"),
  remarks: text("remarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = typeof activities.$inferInsert;

/**
 * 3A. BOQ MASTER & EXECUTION CONTROL
 */
export const boqItems = mysqlTable("boq_items", {
  id: int("id").autoincrement().primaryKey(),
  itemCode: varchar("itemCode", { length: 60 }).notNull().unique(),
  projectId: int("projectId").notNull(),
  roadId: int("roadId"),
  chapter: varchar("chapter", { length: 120 }).notNull(),
  description: text("description").notNull(),
  unit: varchar("unit", { length: 30 }).notNull(),
  contractQuantity: decimal("contractQuantity", { precision: 14, scale: 3 }).default("0.000").notNull(),
  revisedQuantity: decimal("revisedQuantity", { precision: 14, scale: 3 }),
  executedQuantity: decimal("executedQuantity", { precision: 14, scale: 3 }).default("0.000").notNull(),
  balanceQuantity: decimal("balanceQuantity", { precision: 14, scale: 3 }).default("0.000").notNull(),
  rate: decimal("rate", { precision: 14, scale: 2 }).default("0.00").notNull(),
  contractAmount: decimal("contractAmount", { precision: 16, scale: 2 }).default("0.00").notNull(),
  status: mysqlEnum("status", ["Active", "Closed", "Variation"]).default("Active").notNull(),
  remarks: text("remarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BoqItem = typeof boqItems.$inferSelect;
export type InsertBoqItem = typeof boqItems.$inferInsert;

/**
 * 4. DAILY PROGRESS
 */
export const dailyProgress = mysqlTable("daily_progress", {
  id: int("id").autoincrement().primaryKey(),
  clientDraftId: varchar("clientDraftId", { length: 64 }).unique(),
  date: varchar("date", { length: 20 }).notNull(),
  projectId: int("projectId").notNull(),
  roadId: int("roadId").notNull(),
  activityId: int("activityId"),
  sectionType: mysqlEnum("sectionType", ["Highway Works", "Concrete Works", "Material", "Machine"]).default("Highway Works").notNull(),
  chainageFrom: varchar("chainageFrom", { length: 50 }),
  chainageTo: varchar("chainageTo", { length: 50 }),
  boqItemId: int("boqItemId"),
  materialId: int("materialId"),
  materialConsumedQuantity: decimal("materialConsumedQuantity", { precision: 12, scale: 3 }),
  // --- Material Section: daily material statement ---
  materialOpeningBalance: decimal("materialOpeningBalance", { precision: 12, scale: 3 }),
  materialReceivedQuantity: decimal("materialReceivedQuantity", { precision: 12, scale: 3 }),
  materialChallanNo: varchar("materialChallanNo", { length: 100 }),
  materialSupplier: varchar("materialSupplier", { length: 255 }),
  materialWastageQuantity: decimal("materialWastageQuantity", { precision: 12, scale: 3 }),
  materialStorageLocation: varchar("materialStorageLocation", { length: 255 }),
  // --- Machine Section: equipment deployment log ---
  machineryAssetId: int("machineryAssetId"),
  machineWorkingHours: decimal("machineWorkingHours", { precision: 10, scale: 2 }),
  machineIdleHours: decimal("machineIdleHours", { precision: 10, scale: 2 }),
  machineIdleReason: varchar("machineIdleReason", { length: 255 }),
  hourMeterOpening: decimal("hourMeterOpening", { precision: 12, scale: 2 }),
  hourMeterClosing: decimal("hourMeterClosing", { precision: 12, scale: 2 }),
  fuelConsumed: decimal("fuelConsumed", { precision: 12, scale: 2 }),
  machineStatus: mysqlEnum("machineStatus", ["Working", "Breakdown", "Maintenance", "Idle"]).default("Working"),
  machineOperator: varchar("machineOperator", { length: 150 }),
  machineLocation: varchar("machineLocation", { length: 255 }),
  plannedQuantity: decimal("plannedQuantity", { precision: 12, scale: 2 }).default("0.00").notNull(),
  actualQuantity: decimal("actualQuantity", { precision: 12, scale: 2 }).default("0.00").notNull(),
  billableQuantity: decimal("billableQuantity", { precision: 12, scale: 2 }),
  billingStatus: mysqlEnum("billingStatus", ["Pending", "Ready for Bill", "Included in Bill"]).default("Pending").notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  percentageComplete: decimal("percentageComplete", { precision: 5, scale: 2 }).default("0.00").notNull(),
  manpower: text("manpower"),
  machinery: text("machinery"),
  weather: varchar("weather", { length: 50 }).default("Clear / Sunny"),
  hindrance: text("hindrance"),
  remarks: text("remarks"),
  sitePhotos: text("sitePhotos"), // JSON array of URLs or notes
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DailyProgress = typeof dailyProgress.$inferSelect;
export type InsertDailyProgress = typeof dailyProgress.$inferInsert;

/**
 * 4A. MATERIAL INVENTORY MASTER
 */
export const materialInventory = mysqlTable("material_inventory", {
  id: int("id").autoincrement().primaryKey(),
  materialCode: varchar("materialCode", { length: 60 }).notNull().unique(),
  projectId: int("projectId").notNull(),
  materialName: varchar("materialName", { length: 255 }).notNull(),
  unit: varchar("unit", { length: 30 }).notNull(),
  minStock: decimal("minStock", { precision: 14, scale: 3 }).default("0.000").notNull(),
  maxStock: decimal("maxStock", { precision: 14, scale: 3 }).default("0.000").notNull(),
  openingStock: decimal("openingStock", { precision: 14, scale: 3 }).default("0.000").notNull(),
  receivedQuantity: decimal("receivedQuantity", { precision: 14, scale: 3 }).default("0.000").notNull(),
  issuedQuantity: decimal("issuedQuantity", { precision: 14, scale: 3 }).default("0.000").notNull(),
  returnedQuantity: decimal("returnedQuantity", { precision: 14, scale: 3 }).default("0.000").notNull(),
  wastageQuantity: decimal("wastageQuantity", { precision: 14, scale: 3 }).default("0.000").notNull(),
  balanceQuantity: decimal("balanceQuantity", { precision: 14, scale: 3 }).default("0.000").notNull(),
  averageRate: decimal("averageRate", { precision: 14, scale: 2 }).default("0.00").notNull(),
  supplier: varchar("supplier", { length: 255 }),
  storageLocation: varchar("storageLocation", { length: 255 }),
  approvalStatus: mysqlEnum("approvalStatus", ["Pending", "Approved", "Rejected", "Blocked"]).default("Pending").notNull(),
  remarks: text("remarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MaterialInventory = typeof materialInventory.$inferSelect;
export type InsertMaterialInventory = typeof materialInventory.$inferInsert;

/**
 * 4B. GOODS RECEIPT NOTES
 */
export const grnEntries = mysqlTable("grn_entries", {
  id: int("id").autoincrement().primaryKey(),
  grnNo: varchar("grnNo", { length: 60 }).notNull().unique(),
  grnDate: varchar("grnDate", { length: 20 }).notNull(),
  projectId: int("projectId").notNull(),
  materialId: int("materialId").notNull(),
  supplier: varchar("supplier", { length: 255 }).notNull(),
  challanNo: varchar("challanNo", { length: 100 }),
  receivedQuantity: decimal("receivedQuantity", { precision: 14, scale: 3 }).notNull(),
  acceptedQuantity: decimal("acceptedQuantity", { precision: 14, scale: 3 }).default("0.000").notNull(),
  rejectedQuantity: decimal("rejectedQuantity", { precision: 14, scale: 3 }).default("0.000").notNull(),
  unit: varchar("unit", { length: 30 }).notNull(),
  rate: decimal("rate", { precision: 14, scale: 2 }).default("0.00").notNull(),
  totalAmount: decimal("totalAmount", { precision: 16, scale: 2 }).default("0.00").notNull(),
  inspectionStatus: mysqlEnum("inspectionStatus", ["Pending", "Accepted", "Partially Accepted", "Rejected"]).default("Pending").notNull(),
  invoiceReference: varchar("invoiceReference", { length: 100 }),
  remarks: text("remarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GrnEntry = typeof grnEntries.$inferSelect;
export type InsertGrnEntry = typeof grnEntries.$inferInsert;

/**
 * 4C. MATERIAL ISSUE LEDGER (including DPR-linked consumption)
 */
export const materialIssues = mysqlTable("material_issues", {
  id: int("id").autoincrement().primaryKey(),
  issueNo: varchar("issueNo", { length: 70 }).notNull().unique(),
  issueDate: varchar("issueDate", { length: 20 }).notNull(),
  projectId: int("projectId").notNull(),
  roadId: int("roadId").notNull(),
  materialId: int("materialId").notNull(),
  dailyProgressId: int("dailyProgressId"),
  boqItemId: int("boqItemId"),
  quantity: decimal("quantity", { precision: 14, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 30 }).notNull(),
  purpose: varchar("purpose", { length: 255 }).notNull(),
  remarks: text("remarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MaterialIssue = typeof materialIssues.$inferSelect;
export type InsertMaterialIssue = typeof materialIssues.$inferInsert;

/**
 * 4D. ELECTRONIC MEASUREMENT BOOK (e-MB)
 */
export const measurementEntries = mysqlTable("measurement_entries", {
  id: int("id").autoincrement().primaryKey(),
  mbNo: varchar("mbNo", { length: 70 }).notNull().unique(),
  mbDate: varchar("mbDate", { length: 20 }).notNull(),
  projectId: int("projectId").notNull(),
  roadId: int("roadId").notNull(),
  boqItemId: int("boqItemId").notNull(),
  activityId: int("activityId"),
  locationFrom: varchar("locationFrom", { length: 80 }).notNull(),
  locationTo: varchar("locationTo", { length: 80 }).notNull(),
  length: decimal("length", { precision: 12, scale: 3 }).default("0.000").notNull(),
  width: decimal("width", { precision: 12, scale: 3 }).default("0.000").notNull(),
  depth: decimal("depth", { precision: 12, scale: 3 }).default("0.000").notNull(),
  calculatedQuantity: decimal("calculatedQuantity", { precision: 14, scale: 3 }).default("0.000").notNull(),
  unit: varchar("unit", { length: 30 }).notNull(),
  rate: decimal("rate", { precision: 14, scale: 2 }).default("0.00").notNull(),
  amount: decimal("amount", { precision: 16, scale: 2 }).default("0.00").notNull(),
  status: mysqlEnum("status", ["Draft", "Submitted", "Checked", "Approved", "Rejected"]).default("Draft").notNull(),
  submittedBy: varchar("submittedBy", { length: 120 }),
  checkedBy: varchar("checkedBy", { length: 120 }),
  remarks: text("remarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MeasurementEntry = typeof measurementEntries.$inferSelect;
export type InsertMeasurementEntry = typeof measurementEntries.$inferInsert;

/**
 * 4E. MATERIAL CONSUMPTION VARIANCE
 */
export const materialVariances = mysqlTable("material_variances", {
  id: int("id").autoincrement().primaryKey(),
  varianceNo: varchar("varianceNo", { length: 70 }).notNull().unique(),
  projectId: int("projectId").notNull(),
  roadId: int("roadId").notNull(),
  boqItemId: int("boqItemId").notNull(),
  materialId: int("materialId").notNull(),
  periodFrom: varchar("periodFrom", { length: 20 }).notNull(),
  periodTo: varchar("periodTo", { length: 20 }).notNull(),
  theoreticalQuantity: decimal("theoreticalQuantity", { precision: 14, scale: 3 }).default("0.000").notNull(),
  actualQuantity: decimal("actualQuantity", { precision: 14, scale: 3 }).default("0.000").notNull(),
  varianceQuantity: decimal("varianceQuantity", { precision: 14, scale: 3 }).default("0.000").notNull(),
  variancePercent: decimal("variancePercent", { precision: 8, scale: 2 }).default("0.00").notNull(),
  status: mysqlEnum("status", ["Within Limit", "Watch", "Excess", "Short Consumption"]).default("Within Limit").notNull(),
  reason: varchar("reason", { length: 255 }),
  remarks: text("remarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MaterialVariance = typeof materialVariances.$inferSelect;
export type InsertMaterialVariance = typeof materialVariances.$inferInsert;

/**
 * 5. BILLING & QS
 */
export const billing = mysqlTable("billing", {
  id: int("id").autoincrement().primaryKey(),
  billId: varchar("billId", { length: 50 }).notNull().unique(),
  projectId: int("projectId").notNull(),
  roadId: int("roadId").notNull(),
  billType: varchar("billType", { length: 100 }).notNull(), // RA Bill 1, RA Bill 2, Final Bill, etc.
  measurementStatus: mysqlEnum("measurementStatus", ["Pending", "In Progress", "Completed"]).default("Pending").notNull(),
  quantityCalculationStatus: mysqlEnum("quantityCalculationStatus", ["Pending", "In Progress", "Completed"]).default("Pending").notNull(),
  abstractStatus: mysqlEnum("abstractStatus", ["Pending", "In Progress", "Completed"]).default("Pending").notNull(),
  billPrepared: mysqlEnum("billPrepared", ["No", "Yes"]).default("No").notNull(),
  submissionDate: varchar("submissionDate", { length: 20 }),
  verificationStatus: mysqlEnum("verificationStatus", [
    "Measurement",
    "Quantity Calculation",
    "Abstract",
    "Bill Prepared",
    "Submitted",
    "Under Verification",
    "Passed",
    "Payment Received"
  ]).default("Measurement").notNull(),
  passedAmount: decimal("passedAmount", { precision: 14, scale: 2 }).default("0.00"),
  paymentStatus: mysqlEnum("paymentStatus", ["Unpaid", "Partial", "Received"]).default("Unpaid").notNull(),
  paymentDate: varchar("paymentDate", { length: 20 }),
  periodFrom: varchar("periodFrom", { length: 20 }),
  periodTo: varchar("periodTo", { length: 20 }),
  grossAmount: decimal("grossAmount", { precision: 16, scale: 2 }).default("0.00"),
  gstAmount: decimal("gstAmount", { precision: 16, scale: 2 }).default("0.00"),
  retentionAmount: decimal("retentionAmount", { precision: 16, scale: 2 }).default("0.00"),
  netPayable: decimal("netPayable", { precision: 16, scale: 2 }).default("0.00"),
  remarks: text("remarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Billing = typeof billing.$inferSelect;
export type InsertBilling = typeof billing.$inferInsert;

/**
 * 5A. RA BILL LINE ITEMS
 */
export const raBillLines = mysqlTable("ra_bill_lines", {
  id: int("id").autoincrement().primaryKey(),
  billId: int("billId").notNull(),
  measurementId: int("measurementId"),
  boqItemId: int("boqItemId").notNull(),
  description: text("description").notNull(),
  unit: varchar("unit", { length: 30 }).notNull(),
  previousQuantity: decimal("previousQuantity", { precision: 14, scale: 3 }).default("0.000").notNull(),
  currentQuantity: decimal("currentQuantity", { precision: 14, scale: 3 }).default("0.000").notNull(),
  cumulativeQuantity: decimal("cumulativeQuantity", { precision: 14, scale: 3 }).default("0.000").notNull(),
  rate: decimal("rate", { precision: 14, scale: 2 }).default("0.00").notNull(),
  amount: decimal("amount", { precision: 16, scale: 2 }).default("0.00").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RaBillLine = typeof raBillLines.$inferSelect;
export type InsertRaBillLine = typeof raBillLines.$inferInsert;

/**
 * 6. HINDRANCES
 */
export const hindrances = mysqlTable("hindrances", {
  id: int("id").autoincrement().primaryKey(),
  hindranceId: varchar("hindranceId", { length: 50 }).notNull().unique(),
  projectId: int("projectId").notNull(),
  roadId: int("roadId").notNull(),
  rdLocation: varchar("rdLocation", { length: 100 }).notNull(),
  category: mysqlEnum("category", [
    "Electric Pole",
    "Land Issue",
    "Utility",
    "Forest/Tree",
    "Local Obstruction",
    "Department Decision",
    "Drawing Issue",
    "Material",
    "Other"
  ]).notNull(),
  description: text("description").notNull(),
  dateRaised: varchar("dateRaised", { length: 20 }).notNull(),
  affectedActivity: varchar("affectedActivity", { length: 255 }).notNull(),
  affectedLength: varchar("affectedLength", { length: 100 }),
  responsiblePersonDepartment: varchar("responsiblePersonDepartment", { length: 255 }).notNull(),
  letterNumber: varchar("letterNumber", { length: 100 }),
  status: mysqlEnum("status", ["Open", "Under Review", "Resolved"]).default("Open").notNull(),
  dueDate: varchar("dueDate", { length: 20 }),
  resolutionDate: varchar("resolutionDate", { length: 20 }),
  daysPending: int("daysPending").default(0).notNull(),
  remarks: text("remarks"),
  supportingPhotosDocuments: text("supportingPhotosDocuments"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Hindrance = typeof hindrances.$inferSelect;
export type InsertHindrance = typeof hindrances.$inferInsert;

/**
 * 7. QA/QC
 */
export const qaQcTests = mysqlTable("qa_qc_tests", {
  id: int("id").autoincrement().primaryKey(),
  testId: varchar("testId", { length: 50 }).notNull().unique(),
  date: varchar("date", { length: 20 }).notNull(),
  projectId: int("projectId").notNull(),
  roadId: int("roadId").notNull(),
  activity: varchar("activity", { length: 255 }).notNull(),
  testType: mysqlEnum("testType", [
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
  ]).notNull(),
  locationRd: varchar("locationRd", { length: 100 }).notNull(),
  requiredValue: varchar("requiredValue", { length: 100 }).notNull(),
  actualValue: varchar("actualValue", { length: 100 }).notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  result: mysqlEnum("result", ["Passed", "Failed", "Pending"]).default("Pending").notNull(),
  testReportReference: varchar("testReportReference", { length: 100 }),
  remarks: text("remarks"),
  correctiveActionStatus: mysqlEnum("correctiveActionStatus", ["None", "Required", "In Progress", "Rectified"]).default("None").notNull(),
  correctiveActionNotes: text("correctiveActionNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QaQcTest = typeof qaQcTests.$inferSelect;
export type InsertQaQcTest = typeof qaQcTests.$inferInsert;

/**
 * 8. MATERIALS
 */
export const materials = mysqlTable("materials", {
  id: int("id").autoincrement().primaryKey(),
  entryId: varchar("entryId", { length: 50 }).notNull().unique(),
  date: varchar("date", { length: 20 }).notNull(),
  projectId: int("projectId").notNull(),
  roadId: int("roadId").notNull(),
  material: varchar("material", { length: 255 }).notNull(),
  receivedQuantity: decimal("receivedQuantity", { precision: 12, scale: 2 }).default("0.00").notNull(),
  usedQuantity: decimal("usedQuantity", { precision: 12, scale: 2 }).default("0.00").notNull(),
  balanceQuantity: decimal("balanceQuantity", { precision: 12, scale: 2 }).default("0.00").notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  supplier: varchar("supplier", { length: 255 }),
  challanReference: varchar("challanReference", { length: 100 }),
  remarks: text("remarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Material = typeof materials.$inferSelect;
export type InsertMaterial = typeof materials.$inferInsert;

/**
 * 9. DOCUMENTS
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  roadId: int("roadId"),
  category: mysqlEnum("category", [
    "Agreement",
    "BOQ",
    "Drawings",
    "DPR",
    "Survey",
    "QA/QC",
    "Measurement",
    "RA Bills",
    "Hindrance",
    "Correspondence",
    "Site Photos",
    "Completion"
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  documentNumber: varchar("documentNumber", { length: 100 }),
  fileUrl: text("fileUrl").notNull(),
  fileSize: varchar("fileSize", { length: 50 }),
  uploadedBy: varchar("uploadedBy", { length: 100 }),
  date: varchar("date", { length: 20 }).notNull(),
  remarks: text("remarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * 10A. SUBCONTRACTORS & WORK ORDERS
 */
export const subcontractors = mysqlTable("subcontractors", {
  id: int("id").autoincrement().primaryKey(),
  subcontractorCode: varchar("subcontractorCode", { length: 60 }).notNull().unique(),
  projectId: int("projectId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  workCategory: varchar("workCategory", { length: 120 }).notNull(),
  contactPerson: varchar("contactPerson", { length: 150 }),
  phone: varchar("phone", { length: 40 }),
  gstin: varchar("gstin", { length: 30 }),
  status: mysqlEnum("status", ["Active", "On Hold", "Closed"]).default("Active").notNull(),
  remarks: text("remarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subcontractor = typeof subcontractors.$inferSelect;
export type InsertSubcontractor = typeof subcontractors.$inferInsert;

export const workOrders = mysqlTable("work_orders", {
  id: int("id").autoincrement().primaryKey(),
  workOrderNo: varchar("workOrderNo", { length: 70 }).notNull().unique(),
  projectId: int("projectId").notNull(),
  roadId: int("roadId").notNull(),
  subcontractorId: int("subcontractorId").notNull(),
  scope: text("scope").notNull(),
  unit: varchar("unit", { length: 30 }).notNull(),
  awardedQuantity: decimal("awardedQuantity", { precision: 14, scale: 3 }).default("0.000").notNull(),
  executedQuantity: decimal("executedQuantity", { precision: 14, scale: 3 }).default("0.000").notNull(),
  rate: decimal("rate", { precision: 14, scale: 2 }).default("0.00").notNull(),
  awardedAmount: decimal("awardedAmount", { precision: 16, scale: 2 }).default("0.00").notNull(),
  paidAmount: decimal("paidAmount", { precision: 16, scale: 2 }).default("0.00").notNull(),
  retentionAmount: decimal("retentionAmount", { precision: 16, scale: 2 }).default("0.00").notNull(),
  startDate: varchar("startDate", { length: 20 }).notNull(),
  targetDate: varchar("targetDate", { length: 20 }).notNull(),
  status: mysqlEnum("status", ["Draft", "Issued", "In Progress", "Completed", "Closed", "On Hold"]).default("Draft").notNull(),
  remarks: text("remarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkOrder = typeof workOrders.$inferSelect;
export type InsertWorkOrder = typeof workOrders.$inferInsert;

/**
 * 10B. PLANT, MACHINERY & FUEL LOGBOOK
 */
export const machineryAssets = mysqlTable("machinery_assets", {
  id: int("id").autoincrement().primaryKey(),
  assetNo: varchar("assetNo", { length: 70 }).notNull().unique(),
  projectId: int("projectId").notNull(),
  assetType: varchar("assetType", { length: 100 }).notNull(),
  makeModel: varchar("makeModel", { length: 150 }),
  registrationNo: varchar("registrationNo", { length: 60 }),
  currentRoadId: int("currentRoadId"),
  openingHourMeter: decimal("openingHourMeter", { precision: 12, scale: 2 }).default("0.00").notNull(),
  currentHourMeter: decimal("currentHourMeter", { precision: 12, scale: 2 }).default("0.00").notNull(),
  expectedFuelPerHour: decimal("expectedFuelPerHour", { precision: 10, scale: 2 }).default("0.00").notNull(),
  status: mysqlEnum("status", ["Available", "Deployed", "Maintenance", "Standby", "Retired"]).default("Available").notNull(),
  operator: varchar("operator", { length: 150 }),
  remarks: text("remarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MachineryAsset = typeof machineryAssets.$inferSelect;
export type InsertMachineryAsset = typeof machineryAssets.$inferInsert;

export const machineryLogs = mysqlTable("machinery_logs", {
  id: int("id").autoincrement().primaryKey(),
  logNo: varchar("logNo", { length: 70 }).notNull().unique(),
  logDate: varchar("logDate", { length: 20 }).notNull(),
  projectId: int("projectId").notNull(),
  roadId: int("roadId").notNull(),
  assetId: int("assetId").notNull(),
  openingHourMeter: decimal("openingHourMeter", { precision: 12, scale: 2 }).default("0.00").notNull(),
  closingHourMeter: decimal("closingHourMeter", { precision: 12, scale: 2 }).default("0.00").notNull(),
  workHours: decimal("workHours", { precision: 10, scale: 2 }).default("0.00").notNull(),
  fuelIssued: decimal("fuelIssued", { precision: 12, scale: 2 }).default("0.00").notNull(),
  fuelRate: decimal("fuelRate", { precision: 10, scale: 2 }).default("0.00").notNull(),
  fuelAmount: decimal("fuelAmount", { precision: 14, scale: 2 }).default("0.00").notNull(),
  fuelEfficiency: decimal("fuelEfficiency", { precision: 10, scale: 2 }).default("0.00").notNull(),
  operator: varchar("operator", { length: 150 }),
  workDescription: text("workDescription"),
  utilizationStatus: mysqlEnum("utilizationStatus", ["Efficient", "Watch", "High Consumption", "Idle"]).default("Efficient").notNull(),
  remarks: text("remarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MachineryLog = typeof machineryLogs.$inferSelect;
export type InsertMachineryLog = typeof machineryLogs.$inferInsert;

/**
 * 10B. MACHINERY COMPLIANCE & SERVICE TRACKER
 * Registration / PUC / Road Tax / Insurance / Fitness / Permit documents
 * and servicing records. `expiryDate` is the trigger date for due alerts.
 */
export const machineryCompliance = mysqlTable("machinery_compliance", {
  id: int("id").autoincrement().primaryKey(),
  assetId: int("assetId").notNull(),
  projectId: int("projectId").notNull(),
  docType: mysqlEnum("docType", ["Registration", "PUC", "Road Tax", "Insurance", "Fitness", "Permit", "Service", "Other"]).notNull(),
  docNumber: varchar("docNumber", { length: 100 }),
  issueDate: varchar("issueDate", { length: 20 }),
  expiryDate: varchar("expiryDate", { length: 20 }).notNull(),
  amount: decimal("amount", { precision: 14, scale: 2 }).default("0.00"),
  vendor: varchar("vendor", { length: 255 }),
  meterReading: decimal("meterReading", { precision: 12, scale: 2 }),
  remarks: text("remarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MachineryCompliance = typeof machineryCompliance.$inferSelect;
export type InsertMachineryCompliance = typeof machineryCompliance.$inferInsert;

/**
 * 10C. DIGITAL SIGN-OFF WORKFLOW
 */
export const approvalSignoffs = mysqlTable("approval_signoffs", {
  id: int("id").autoincrement().primaryKey(),
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: varchar("entityId", { length: 80 }).notNull(),
  stage: varchar("stage", { length: 100 }).notNull(),
  requestedBy: varchar("requestedBy", { length: 150 }).notNull(),
  assignedRole: varchar("assignedRole", { length: 80 }).notNull(),
  signedBy: varchar("signedBy", { length: 150 }),
  status: mysqlEnum("status", ["Pending", "Approved", "Rejected"]).default("Pending").notNull(),
  comments: text("comments"),
  signedAt: timestamp("signedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApprovalSignoff = typeof approvalSignoffs.$inferSelect;
export type InsertApprovalSignoff = typeof approvalSignoffs.$inferInsert;

/**
 * NOTIFICATIONS & AUDIT / AUTOMATION LOGS
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  type: varchar("type", { length: 50 }).notNull(), // 'BILL_SUBMITTED', 'BILL_PASSED', 'QA_FAILED', 'HINDRANCE_OVERDUE', etc.
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  severity: mysqlEnum("severity", ["info", "warning", "critical", "success"]).default("info").notNull(),
  targetRole: varchar("targetRole", { length: 50 }),
  isRead: int("isRead").default(0).notNull(),
  entityType: varchar("entityType", { length: 50 }),
  entityId: varchar("entityId", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * 11. ROAD STRUCTURES / CD WORKS REGISTER
 * One row per physical structure, linked to a road and chainage.
 */
export const roadStructures = mysqlTable("road_structures", {
  id: int("id").autoincrement().primaryKey(),
  structureNo: varchar("structureNo", { length: 80 }).notNull().unique(),
  projectId: int("projectId").notNull(),
  roadId: int("roadId").notNull(),
  structureType: mysqlEnum("structureType", [
    "Slab Culvert",
    "HPC",
    "Box Culvert",
    "Minor Bridge",
    "Causeway",
    "Retaining Wall",
    "Toe Wall",
    "Drain",
    "Other",
  ]).notNull(),
  chainageFrom: varchar("chainageFrom", { length: 50 }).notNull(),
  chainageTo: varchar("chainageTo", { length: 50 }),
  locationDescription: varchar("locationDescription", { length: 255 }),
  count: decimal("count", { precision: 10, scale: 2 }).default("1.00").notNull(),
  length: decimal("length", { precision: 12, scale: 3 }),
  width: decimal("width", { precision: 12, scale: 3 }),
  height: decimal("height", { precision: 12, scale: 3 }),
  quantity: decimal("quantity", { precision: 14, scale: 3 }).default("0.000").notNull(),
  unit: varchar("unit", { length: 30 }).default("Nos").notNull(),
  status: mysqlEnum("status", ["Not Started", "In Progress", "Completed", "On Hold"]).default("Not Started").notNull(),
  billableQuantity: decimal("billableQuantity", { precision: 14, scale: 3 }).default("0.000").notNull(),
  photos: text("photos"),
  remarks: text("remarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RoadStructure = typeof roadStructures.$inferSelect;
export type InsertRoadStructure = typeof roadStructures.$inferInsert;

/**
 * 12. HR & PAYROLL FOUNDATION
 * Phase 1 stores the employee master and assignment/pay-rate inputs.
 * Sensitive identifiers are intentionally limited to references/last-four fields.
 */
export const hrDepartments = mysqlTable("hr_departments", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["Active", "Inactive"]).default("Active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HrDepartment = typeof hrDepartments.$inferSelect;
export type InsertHrDepartment = typeof hrDepartments.$inferInsert;

export const hrDesignations = mysqlTable("hr_designations", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  grade: varchar("grade", { length: 50 }),
  description: text("description"),
  status: mysqlEnum("status", ["Active", "Inactive"]).default("Active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HrDesignation = typeof hrDesignations.$inferSelect;
export type InsertHrDesignation = typeof hrDesignations.$inferInsert;

export const hrEmployees = mysqlTable("hr_employees", {
  id: int("id").autoincrement().primaryKey(),
  employeeCode: varchar("employeeCode", { length: 60 }).notNull().unique(),
  fullName: varchar("fullName", { length: 180 }).notNull(),
  fatherName: varchar("fatherName", { length: 180 }),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 320 }),
  dateOfBirth: varchar("dateOfBirth", { length: 20 }),
  gender: mysqlEnum("gender", ["Male", "Female", "Other"]),
  aadhaarLast4: varchar("aadhaarLast4", { length: 4 }),
  panReference: varchar("panReference", { length: 20 }),
  address: text("address"),
  emergencyContactName: varchar("emergencyContactName", { length: 150 }),
  emergencyContactPhone: varchar("emergencyContactPhone", { length: 30 }),
  departmentId: int("departmentId"),
  designationId: int("designationId"),
  employmentType: mysqlEnum("employmentType", ["Staff", "Site Engineer", "Supervisor", "Operator", "Skilled Labour", "Unskilled Labour", "Contract", "Consultant"]).default("Staff").notNull(),
  joiningDate: varchar("joiningDate", { length: 20 }).notNull(),
  exitDate: varchar("exitDate", { length: 20 }),
  status: mysqlEnum("status", ["Active", "On Leave", "Inactive", "Exited"]).default("Active").notNull(),
  payBasis: mysqlEnum("payBasis", ["Monthly", "Daily", "Hourly"]).default("Monthly").notNull(),
  basicRate: decimal("basicRate", { precision: 14, scale: 2 }).default("0.00").notNull(),
  overtimeRate: decimal("overtimeRate", { precision: 14, scale: 2 }).default("0.00").notNull(),
  bankName: varchar("bankName", { length: 150 }),
  accountLast4: varchar("accountLast4", { length: 4 }),
  ifscCode: varchar("ifscCode", { length: 20 }),
  photoUrl: text("photoUrl"),
  documentReferences: text("documentReferences"),
  remarks: text("remarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HrEmployee = typeof hrEmployees.$inferSelect;
export type InsertHrEmployee = typeof hrEmployees.$inferInsert;

export const hrAssignments = mysqlTable("hr_assignments", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  projectId: int("projectId").notNull(),
  roadId: int("roadId"),
  roleOnSite: varchar("roleOnSite", { length: 150 }),
  assignmentStart: varchar("assignmentStart", { length: 20 }).notNull(),
  assignmentEnd: varchar("assignmentEnd", { length: 20 }),
  status: mysqlEnum("status", ["Active", "Completed", "Cancelled"]).default("Active").notNull(),
  remarks: text("remarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HrAssignment = typeof hrAssignments.$inferSelect;
export type InsertHrAssignment = typeof hrAssignments.$inferInsert;

/**
 * 13. HR & PAYROLL PHASE 2
 * Attendance is one row per employee/date; leave is approval-controlled;
 * payroll runs are drafts until an administrator approves them.
 */
export const hrAttendance = mysqlTable("hr_attendance", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  attendanceDate: varchar("attendanceDate", { length: 20 }).notNull(),
  projectId: int("projectId"),
  roadId: int("roadId"),
  status: mysqlEnum("status", ["Present", "Absent", "Half Day", "Weekly Off", "Holiday", "On Leave"]).default("Present").notNull(),
  inTime: varchar("inTime", { length: 10 }),
  outTime: varchar("outTime", { length: 10 }),
  overtimeHours: decimal("overtimeHours", { precision: 8, scale: 2 }).default("0.00").notNull(),
  remarks: text("remarks"),
  markedBy: int("markedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HrAttendance = typeof hrAttendance.$inferSelect;
export type InsertHrAttendance = typeof hrAttendance.$inferInsert;

export const hrLeaveRequests = mysqlTable("hr_leave_requests", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  leaveType: mysqlEnum("leaveType", ["Casual", "Sick", "Earned", "Unpaid", "Compensatory", "Other"]).default("Casual").notNull(),
  fromDate: varchar("fromDate", { length: 20 }).notNull(),
  toDate: varchar("toDate", { length: 20 }).notNull(),
  totalDays: decimal("totalDays", { precision: 8, scale: 2 }).default("1.00").notNull(),
  reason: text("reason"),
  status: mysqlEnum("status", ["Pending", "Approved", "Rejected", "Cancelled"]).default("Pending").notNull(),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  remarks: text("remarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HrLeaveRequest = typeof hrLeaveRequests.$inferSelect;
export type InsertHrLeaveRequest = typeof hrLeaveRequests.$inferInsert;

export const hrPayrollRuns = mysqlTable("hr_payroll_runs", {
  id: int("id").autoincrement().primaryKey(),
  payrollMonth: varchar("payrollMonth", { length: 7 }).notNull().unique(),
  periodFrom: varchar("periodFrom", { length: 20 }).notNull(),
  periodTo: varchar("periodTo", { length: 20 }).notNull(),
  status: mysqlEnum("status", ["Draft", "Approved", "Paid", "Cancelled"]).default("Draft").notNull(),
  employeeCount: int("employeeCount").default(0).notNull(),
  grossTotal: decimal("grossTotal", { precision: 16, scale: 2 }).default("0.00").notNull(),
  deductionTotal: decimal("deductionTotal", { precision: 16, scale: 2 }).default("0.00").notNull(),
  netTotal: decimal("netTotal", { precision: 16, scale: 2 }).default("0.00").notNull(),
  preparedBy: int("preparedBy"),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  remarks: text("remarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HrPayrollRun = typeof hrPayrollRuns.$inferSelect;
export type InsertHrPayrollRun = typeof hrPayrollRuns.$inferInsert;

export const hrPayrollLines = mysqlTable("hr_payroll_lines", {
  id: int("id").autoincrement().primaryKey(),
  payrollRunId: int("payrollRunId").notNull(),
  employeeId: int("employeeId").notNull(),
  payableDays: decimal("payableDays", { precision: 8, scale: 2 }).default("0.00").notNull(),
  absentDays: decimal("absentDays", { precision: 8, scale: 2 }).default("0.00").notNull(),
  overtimeHours: decimal("overtimeHours", { precision: 8, scale: 2 }).default("0.00").notNull(),
  basicAmount: decimal("basicAmount", { precision: 14, scale: 2 }).default("0.00").notNull(),
  overtimeAmount: decimal("overtimeAmount", { precision: 14, scale: 2 }).default("0.00").notNull(),
  allowanceAmount: decimal("allowanceAmount", { precision: 14, scale: 2 }).default("0.00").notNull(),
  deductionAmount: decimal("deductionAmount", { precision: 14, scale: 2 }).default("0.00").notNull(),
  grossAmount: decimal("grossAmount", { precision: 14, scale: 2 }).default("0.00").notNull(),
  netAmount: decimal("netAmount", { precision: 14, scale: 2 }).default("0.00").notNull(),
  remarks: text("remarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HrPayrollLine = typeof hrPayrollLines.$inferSelect;
export type InsertHrPayrollLine = typeof hrPayrollLines.$inferInsert;

/** HR & Payroll Phase 3: payroll adjustments ledger.
 * Positive adjustments are allowances/bonuses; negative adjustments are
 * advances, recoveries and other deductions. Each entry can be attached to
 * one payroll month and remains auditable with an approval status.
 */
export const hrPayrollAdjustments = mysqlTable("hr_payroll_adjustments", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  payrollMonth: varchar("payrollMonth", { length: 7 }).notNull(),
  adjustmentType: mysqlEnum("adjustmentType", ["Advance", "Loan Recovery", "Allowance", "Bonus", "Fine", "Other"]).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  recoveryInstallment: decimal("recoveryInstallment", { precision: 14, scale: 2 }).default("0.00").notNull(),
  status: mysqlEnum("status", ["Draft", "Approved", "Applied", "Cancelled"]).default("Draft").notNull(),
  referenceNo: varchar("referenceNo", { length: 80 }),
  remarks: text("remarks"),
  createdBy: int("createdBy"),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HrPayrollAdjustment = typeof hrPayrollAdjustments.$inferSelect;
export type InsertHrPayrollAdjustment = typeof hrPayrollAdjustments.$inferInsert;

/** HR & Payroll Phase 4: approved payroll bank payout batches. */
export const hrPayoutBatches = mysqlTable("hr_payout_batches", {
  id: int("id").autoincrement().primaryKey(),
  payrollRunId: int("payrollRunId").notNull(),
  batchReference: varchar("batchReference", { length: 80 }).notNull().unique(),
  status: mysqlEnum("status", ["Draft", "Exported", "Submitted", "Paid", "Cancelled"]).default("Draft").notNull(),
  employeeCount: int("employeeCount").default(0).notNull(),
  totalAmount: decimal("totalAmount", { precision: 16, scale: 2 }).default("0.00").notNull(),
  exportedAt: timestamp("exportedAt"),
  submittedAt: timestamp("submittedAt"),
  paidAt: timestamp("paidAt"),
  createdBy: int("createdBy"),
  remarks: text("remarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HrPayoutBatch = typeof hrPayoutBatches.$inferSelect;
export type InsertHrPayoutBatch = typeof hrPayoutBatches.$inferInsert;

export const hrPayoutLines = mysqlTable("hr_payout_lines", {
  id: int("id").autoincrement().primaryKey(),
  payoutBatchId: int("payoutBatchId").notNull(),
  payrollLineId: int("payrollLineId").notNull(),
  employeeId: int("employeeId").notNull(),
  beneficiaryName: varchar("beneficiaryName", { length: 180 }).notNull(),
  bankName: varchar("bankName", { length: 150 }),
  accountLast4: varchar("accountLast4", { length: 4 }),
  ifscCode: varchar("ifscCode", { length: 20 }),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  transferReference: varchar("transferReference", { length: 100 }),
  status: mysqlEnum("status", ["Ready", "Submitted", "Paid", "Failed"]).default("Ready").notNull(),
  remarks: text("remarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HrPayoutLine = typeof hrPayoutLines.$inferSelect;
export type InsertHrPayoutLine = typeof hrPayoutLines.$inferInsert;

/** Weekly/periodic wage settlement for labour groups or contractor gangs. */
export const hrGroupSettlements = mysqlTable("hr_group_settlements", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  roadId: int("roadId"),
  groupName: varchar("groupName", { length: 160 }).notNull(),
  contractorName: varchar("contractorName", { length: 180 }),
  periodFrom: varchar("periodFrom", { length: 20 }).notNull(),
  periodTo: varchar("periodTo", { length: 20 }).notNull(),
  labourCount: int("labourCount").default(0).notNull(),
  manDays: decimal("manDays", { precision: 10, scale: 2 }).default("0.00").notNull(),
  ratePerDay: decimal("ratePerDay", { precision: 12, scale: 2 }).default("0.00").notNull(),
  grossAmount: decimal("grossAmount", { precision: 14, scale: 2 }).default("0.00").notNull(),
  advanceDeduction: decimal("advanceDeduction", { precision: 14, scale: 2 }).default("0.00").notNull(),
  netAmount: decimal("netAmount", { precision: 14, scale: 2 }).default("0.00").notNull(),
  status: mysqlEnum("status", ["Draft", "Submitted", "Approved", "Paid", "Rejected"]).default("Draft").notNull(),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  remarks: text("remarks"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HrGroupSettlement = typeof hrGroupSettlements.$inferSelect;
export type InsertHrGroupSettlement = typeof hrGroupSettlements.$inferInsert;
