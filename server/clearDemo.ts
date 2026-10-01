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
  notifications,
  projects,
  qaQcTests,
  raBillLines,
  roads,
  subcontractors,
  workOrders,
} from "../drizzle/schema";
import { getDb } from "./db";

export async function clearDemoProjectData() {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const demo = await db.select({ id: projects.id, projectId: projects.projectId })
    .from(projects)
    .where(eq(projects.projectId, "PRJ-NH-2026-01"))
    .limit(1);

  if (!demo.length) {
    return { success: true, projectId: "PRJ-NH-2026-01", deleted: 0, message: "Demo project was not found. Your imported data was not changed." };
  }

  const projectId = demo[0].id;
  const demoBills = await db.select({ id: billing.id }).from(billing).where(eq(billing.projectId, projectId));
  for (const bill of demoBills) {
    await db.delete(raBillLines).where(eq(raBillLines.billId, bill.id));
  }

  const projectTables = [
    dailyProgress, grnEntries, materialIssues, measurementEntries, materialVariances,
    billing, hindrances, qaQcTests, materials, documents, workOrders, machineryLogs,
    machineryAssets, subcontractors, materialInventory, boqItems, activities, roads,
  ];
  for (const table of projectTables) {
    await db.delete(table).where(eq(table.projectId, projectId));
  }

  await db.delete(notifications).where(eq(notifications.entityId, "QA-2026-002"));
  await db.delete(notifications).where(eq(notifications.entityId, "HND-2026-001"));
  await db.delete(notifications).where(eq(notifications.entityId, "BILL-2026-RA-03"));
  await db.delete(approvalSignoffs).where(eq(approvalSignoffs.entityId, "MB-2026-001"));
  await db.delete(approvalSignoffs).where(eq(approvalSignoffs.entityId, "MB-2026-003"));
  await db.delete(approvalSignoffs).where(eq(approvalSignoffs.entityId, "RA-01"));
  await db.delete(projects).where(eq(projects.id, projectId));

  return {
    success: true,
    projectId: "PRJ-NH-2026-01",
    deleted: 1,
    message: "Known demo project and its linked records were removed. Imported projects were not changed.",
  };
}
