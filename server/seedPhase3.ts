import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  projects,
  roads,
  subcontractors,
  workOrders,
  machineryAssets,
  machineryLogs,
  approvalSignoffs
} from "../drizzle/schema";
import { sql } from "drizzle-orm";

async function seedPhase3() {
  if (!process.env.DATABASE_URL) {
    console.error("No DATABASE_URL set");
    process.exit(1);
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  console.log("Checking Phase 3 ERP seed data...");

  const pList = await db.select().from(projects).limit(1);
  const projectId = pList[0]?.id || 1;
  const rList = await db.select().from(roads).limit(2);
  const rd1Id = rList[0]?.id || 1;
  const rd2Id = rList[1]?.id || 2;

  // 1. Subcontractors
  const existingSubs = await db.select({ count: sql<number>`count(*)` }).from(subcontractors);
  if (Number(existingSubs[0]?.count || 0) === 0) {
    console.log("Seeding subcontractors...");
    await db.insert(subcontractors).values([
      {
        subcontractorCode: "SUB-01",
        projectId,
        name: "M/s Maa Bhavani Earthmovers",
        workCategory: "Earthwork & Embankment",
        contactPerson: "Vikram Singh",
        phone: "+91 98290 11223",
        gstin: "08AABCB1234F1Z8",
        status: "Active",
        remarks: "Owns fleet of 4 excavators and 12 tippers."
      },
      {
        subcontractorCode: "SUB-02",
        projectId,
        name: "Shree Ram Road Builders",
        workCategory: "GSB & WMM Laying",
        contactPerson: "Dinesh Patel",
        phone: "+91 94140 55667",
        gstin: "08AACSR9988D1Z2",
        status: "Active",
        remarks: "Sensor paver & compaction specialist gang."
      },
      {
        subcontractorCode: "SUB-03",
        projectId,
        name: "Apex Infrastructure & Culverts",
        workCategory: "Culvert & Concrete Structures",
        contactPerson: "Sunil Joshi",
        phone: "+91 98281 33445",
        gstin: "08AAKCA5544H1Z1",
        status: "Active",
        remarks: "Reinforced concrete box and pipe culvert execution."
      }
    ]);
  }

  // 2. Work Orders
  const subRows = await db.select().from(subcontractors);
  const sub1 = subRows[0]?.id || 1;
  const sub2 = subRows[1]?.id || 2;

  const existingWo = await db.select({ count: sql<number>`count(*)` }).from(workOrders);
  if (Number(existingWo[0]?.count || 0) === 0) {
    console.log("Seeding work orders...");
    await db.insert(workOrders).values([
      {
        workOrderNo: "WO-2026-01",
        projectId,
        roadId: rd1Id,
        subcontractorId: sub1,
        scope: "Subgrade excavation, hauling, spreading and 98% MDD roller compaction",
        unit: "Cum",
        awardedQuantity: "12000.000",
        executedQuantity: "5400.000",
        rate: "135.00",
        awardedAmount: "1620000.00",
        paidAmount: "650000.00",
        retentionAmount: "81000.00",
        startDate: "2026-09-01",
        targetDate: "2026-10-31",
        status: "In Progress",
        remarks: "Progress verified via e-MB Sheet MB-2026-001."
      },
      {
        workOrderNo: "WO-2026-02",
        projectId,
        roadId: rd2Id,
        subcontractorId: sub2,
        scope: "Laying and grading Wet Mix Macadam (WMM) with hydrostatic sensor paver",
        unit: "Cum",
        awardedQuantity: "8000.000",
        executedQuantity: "2100.000",
        rate: "240.00",
        awardedAmount: "1920000.00",
        paidAmount: "450000.00",
        retentionAmount: "96000.00",
        startDate: "2026-09-10",
        targetDate: "2026-11-15",
        status: "In Progress",
        remarks: "Joint levels taken at 10m intervals."
      }
    ]);
  }

  // 3. Machinery Assets
  const existingAssets = await db.select({ count: sql<number>`count(*)` }).from(machineryAssets);
  if (Number(existingAssets[0]?.count || 0) === 0) {
    console.log("Seeding machinery assets...");
    await db.insert(machineryAssets).values([
      {
        assetNo: "EQ-ROLL-01",
        projectId,
        assetType: "Vibratory Soil Roller",
        makeModel: "CASE 1107EX (11 Ton)",
        registrationNo: "RJ-14-EA-4411",
        currentRoadId: rd1Id,
        openingHourMeter: "1240.00",
        currentHourMeter: "1268.50",
        expectedFuelPerHour: "11.50",
        status: "Deployed",
        operator: "Ramesh Kumar",
        remarks: "Compacting subgrade and GSB layers."
      },
      {
        assetNo: "EQ-GRAD-01",
        projectId,
        assetType: "Motor Grader",
        makeModel: "Liugong 4180D (180 HP)",
        registrationNo: "RJ-14-EA-8822",
        currentRoadId: rd1Id,
        openingHourMeter: "820.00",
        currentHourMeter: "835.00",
        expectedFuelPerHour: "16.00",
        status: "Deployed",
        operator: "Mukesh Sharma",
        remarks: "Camber and crown shaping."
      },
      {
        assetNo: "EQ-PAVE-01",
        projectId,
        assetType: "Hydrostatic Sensor Paver",
        makeModel: "Vogele Super 1800-3",
        registrationNo: "RJ-14-EA-9900",
        currentRoadId: rd2Id,
        openingHourMeter: "650.00",
        currentHourMeter: "650.00",
        expectedFuelPerHour: "18.50",
        status: "Standby",
        operator: "Sanjay Verma",
        remarks: "Calibrated for DBM/BC laying."
      }
    ]);
  }

  // 4. Machinery Logs
  const assetsList = await db.select().from(machineryAssets);
  const rollAsset = assetsList.find((a) => a.assetNo === "EQ-ROLL-01") || assetsList[0];
  const gradAsset = assetsList.find((a) => a.assetNo === "EQ-GRAD-01") || assetsList[1];

  const existingLogs = await db.select({ count: sql<number>`count(*)` }).from(machineryLogs);
  if (Number(existingLogs[0]?.count || 0) === 0 && rollAsset) {
    console.log("Seeding machinery logs...");
    await db.insert(machineryLogs).values([
      {
        logNo: "LOG-2026-001",
        logDate: "2026-09-24",
        projectId,
        roadId: rd1Id,
        assetId: rollAsset.id,
        openingHourMeter: "1240.00",
        closingHourMeter: "1248.50",
        workHours: "8.50",
        fuelIssued: "94.00",
        fuelRate: "92.00",
        fuelAmount: "8648.00",
        fuelEfficiency: "11.06",
        operator: "Ramesh Kumar",
        workDescription: "Subgrade soil compaction RD 0+000 to 0+450",
        utilizationStatus: "Efficient",
        remarks: "Field density test passed 98.6%."
      },
      {
        logNo: "LOG-2026-002",
        logDate: "2026-09-25",
        projectId,
        roadId: rd1Id,
        assetId: rollAsset.id,
        openingHourMeter: "1248.50",
        closingHourMeter: "1257.00",
        workHours: "8.50",
        fuelIssued: "98.00",
        fuelRate: "92.00",
        fuelAmount: "9016.00",
        fuelEfficiency: "11.53",
        operator: "Ramesh Kumar",
        workDescription: "GSB layer rolling RD 0+000 to 0+600",
        utilizationStatus: "Efficient",
        remarks: "MoRTH Table 400-11 rolling cycle complete."
      },
      {
        logNo: "LOG-2026-003",
        logDate: "2026-09-26",
        projectId,
        roadId: rd1Id,
        assetId: gradAsset.id,
        openingHourMeter: "820.00",
        closingHourMeter: "827.00",
        workHours: "7.000",
        fuelIssued: "118.00",
        fuelRate: "92.00",
        fuelAmount: "10856.00",
        fuelEfficiency: "16.86",
        operator: "Mukesh Sharma",
        workDescription: "Subgrade leveling and surface dressing",
        utilizationStatus: "Watch",
        remarks: "Slightly high idle time during tipper spotting."
      }
    ]);
  }

  // 5. Digital Sign-offs
  const existingSignoffs = await db.select({ count: sql<number>`count(*)` }).from(approvalSignoffs);
  if (Number(existingSignoffs[0]?.count || 0) === 0) {
    console.log("Seeding digital sign-offs...");
    await db.insert(approvalSignoffs).values([
      {
        entityType: "e-MB Measurement Record",
        entityId: "MB-2026-001",
        stage: "Joint Measurement & Field Dimensions Sign-off",
        requestedBy: "site_engineer",
        assignedRole: "qs_billing_engineer",
        signedBy: "QS Billing Engineer",
        status: "Approved",
        comments: "All chainage levels and offsets verified with PWD AE. Passed for billing abstract.",
        signedAt: new Date("2026-09-24T11:30:00Z"),
      },
      {
        entityType: "Running Account (RA) Bill",
        entityId: "RA-01",
        stage: "Scrutiny of Net Payable & Deductions",
        requestedBy: "qs_billing_engineer",
        assignedRole: "project_manager",
        signedBy: "Project Manager",
        status: "Approved",
        comments: "GST 18% and Retention 5% checked. Forwarded for payment release.",
        signedAt: new Date("2026-09-26T16:00:00Z"),
      },
      {
        entityType: "e-MB Measurement Record",
        entityId: "MB-2026-003",
        stage: "GSB Layer Cross-section Verification",
        requestedBy: "site_engineer",
        assignedRole: "qs_billing_engineer",
        status: "Pending",
        comments: "Awaiting cross-section RL sheets before final signature.",
      }
    ]);
  }

  console.log("Phase 3 ERP seed complete!");
  await connection.end();
}

seedPhase3().catch((err) => {
  console.error(err);
  process.exit(1);
});
