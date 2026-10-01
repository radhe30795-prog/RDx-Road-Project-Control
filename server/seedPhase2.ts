import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  boqItems,
  materialInventory,
  measurementEntries,
  materialVariances,
  projects,
  roads
} from "../drizzle/schema";
import { sql, eq } from "drizzle-orm";
import { generateRaBillFromBoq } from "./db";

async function seedPhase2() {
  if (!process.env.DATABASE_URL) {
    console.error("No DATABASE_URL set");
    process.exit(1);
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  console.log("Checking Phase 2 ERP seed data...");

  const pList = await db.select().from(projects).limit(1);
  if (!pList.length) {
    console.log("No projects found");
    process.exit(0);
  }
  const projectId = pList[0].id;
  const rList = await db.select().from(roads).limit(2);
  const rd1Id = rList[0]?.id || 1;
  const rd2Id = rList[1]?.id || 2;

  const boqList = await db.select().from(boqItems);
  const gsbBoq = boqList.find((b) => b.itemCode.includes("GSB")) || boqList[0];
  const wmmBoq = boqList.find((b) => b.itemCode.includes("WMM")) || boqList[1];

  // 1. Seed Measurement Entries (e-MB)
  const existingMb = await db.select({ count: sql<number>`count(*)` }).from(measurementEntries);
  if (Number(existingMb[0]?.count || 0) === 0 && gsbBoq && wmmBoq) {
    console.log("Seeding e-MB entries...");
    await db.insert(measurementEntries).values([
      {
        mbNo: "MB-2026-001",
        mbDate: "2026-09-22",
        projectId,
        roadId: rd1Id,
        boqItemId: gsbBoq.id,
        locationFrom: "RD 0+000",
        locationTo: "RD 0+600",
        length: "600.000",
        width: "7.000",
        depth: "0.150",
        calculatedQuantity: "630.000",
        unit: "Cum",
        rate: gsbBoq.rate,
        amount: String((630 * parseFloat(String(gsbBoq.rate))).toFixed(2)),
        status: "Approved",
        submittedBy: "Site Engineer",
        checkedBy: "QS Billing Engineer",
        remarks: "Joint field verification completed with AE PWD."
      },
      {
        mbNo: "MB-2026-002",
        mbDate: "2026-09-24",
        projectId,
        roadId: rd1Id,
        boqItemId: wmmBoq.id,
        locationFrom: "RD 0+000",
        locationTo: "RD 0+450",
        length: "450.000",
        width: "7.000",
        depth: "0.100",
        calculatedQuantity: "315.000",
        unit: "Cum",
        rate: wmmBoq.rate,
        amount: String((315 * parseFloat(String(wmmBoq.rate))).toFixed(2)),
        status: "Approved",
        submittedBy: "Site Engineer",
        checkedBy: "Project Manager",
        remarks: "Camber and compaction tested as per MoRTH Table 400-11."
      },
      {
        mbNo: "MB-2026-003",
        mbDate: "2026-09-26",
        projectId,
        roadId: rd2Id,
        boqItemId: gsbBoq.id,
        locationFrom: "RD 0+600",
        locationTo: "RD 1+200",
        length: "600.000",
        width: "7.000",
        depth: "0.150",
        calculatedQuantity: "630.000",
        unit: "Cum",
        rate: gsbBoq.rate,
        amount: String((630 * parseFloat(String(gsbBoq.rate))).toFixed(2)),
        status: "Submitted",
        submittedBy: "Site Engineer",
        remarks: "Chainage level cross-sections attached."
      }
    ]);
  }

  // 2. Seed Material Variance Reconciliations
  const existingVar = await db.select({ count: sql<number>`count(*)` }).from(materialVariances);
  if (Number(existingVar[0]?.count || 0) === 0 && gsbBoq) {
    console.log("Seeding Material Variances...");
    const mats = await db.select().from(materialInventory);
    const aggMat = mats.find((m) => m.materialCode.includes("AGG-40")) || mats[0];
    if (aggMat) {
      await db.insert(materialVariances).values([
        {
          varianceNo: "VAR-2026-001",
          projectId,
          roadId: rd1Id,
          boqItemId: gsbBoq.id,
          materialId: aggMat.id,
          periodFrom: "2026-09-01",
          periodTo: "2026-09-25",
          theoreticalQuantity: "787.500",
          actualQuantity: "805.000",
          varianceQuantity: "17.500",
          variancePercent: "2.22",
          status: "Within Limit",
          reason: "Normal MoRTH batching tolerance",
          remarks: "Verified from 2 approved e-MB stretches."
        },
        {
          varianceNo: "VAR-2026-002",
          projectId,
          roadId: rd2Id,
          boqItemId: gsbBoq.id,
          materialId: aggMat.id,
          periodFrom: "2026-09-10",
          periodTo: "2026-09-26",
          theoreticalQuantity: "420.000",
          actualQuantity: "442.000",
          varianceQuantity: "22.000",
          variancePercent: "5.24",
          status: "Excess",
          reason: "Subgrade depression filling at RD 0+800",
          remarks: "Extra rolling and unmetered depression compaction noted."
        }
      ]);
    }
  }

  // 3. Seed Auto Generated RA Bill if none
  try {
    console.log("Generating sample automated RA Bill from executed BOQ...");
    await generateRaBillFromBoq({
      billId: "RA-01",
      projectId,
      roadId: rd1Id,
      billType: "RA Bill 01 (Cumulative BOQ Progress)",
      periodFrom: "2026-09-01",
      periodTo: "2026-09-26",
      gstPercent: 18,
      retentionPercent: 5,
      remarks: "Sample automated bill generated from approved e-MB and executed BOQ quantities."
    });
  } catch (err: any) {
    console.log("RA Bill already exists or skipped:", err.message);
  }

  console.log("Phase 2 ERP seed complete!");
  await connection.end();
}

seedPhase2().catch((err) => {
  console.error(err);
  process.exit(1);
});
