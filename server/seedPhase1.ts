import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  boqItems,
  materialInventory,
  grnEntries,
  materialIssues,
  projects,
  roads
} from "../drizzle/schema";
import { sql, eq } from "drizzle-orm";

async function seedPhase1() {
  if (!process.env.DATABASE_URL) {
    console.error("No DATABASE_URL set");
    process.exit(1);
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  console.log("Checking Phase 1 ERP seed data...");

  // Get project and roads
  const pList = await db.select().from(projects).limit(1);
  if (!pList.length) {
    console.log("No projects found, skip phase 1 seed");
    process.exit(0);
  }
  const projectId = pList[0].id;
  const rList = await db.select().from(roads).limit(4);
  const rd1Id = rList[0]?.id || 1;
  const rd2Id = rList[1]?.id || 2;

  // 1. BOQ Items
  const existingBoq = await db.select({ count: sql<number>`count(*)` }).from(boqItems);
  if (Number(existingBoq[0]?.count || 0) === 0) {
    console.log("Seeding BOQ Items...");
    await db.insert(boqItems).values([
      {
        itemCode: "BOQ-EW-01",
        projectId,
        roadId: rd1Id,
        chapter: "Chapter 3: Earthwork & Subgrade",
        description: "Excavation in all types of soil for roadway and disposal within initial lead",
        unit: "Cum",
        contractQuantity: "12500.000",
        executedQuantity: "4200.000",
        balanceQuantity: "8300.000",
        rate: "145.00",
        contractAmount: "1812500.00",
        status: "Active",
        remarks: "MoRTH Section 301 compliant"
      },
      {
        itemCode: "BOQ-GSB-02",
        projectId,
        roadId: rd1Id,
        chapter: "Chapter 4: Granular Sub-Base",
        description: "Construction of Granular Sub-base (GSB Grade-I) with approved crushed aggregate material",
        unit: "Cum",
        contractQuantity: "8400.000",
        executedQuantity: "3150.000",
        balanceQuantity: "5250.000",
        rate: "950.00",
        contractAmount: "7980000.00",
        status: "Active",
        remarks: "150mm compacted thickness"
      },
      {
        itemCode: "BOQ-WMM-03",
        projectId,
        roadId: rd1Id,
        chapter: "Chapter 4: Wet Mix Macadam",
        description: "Wet Mix Macadam (WMM) base course using mechanical paver and vibratory roller",
        unit: "Cum",
        contractQuantity: "6200.000",
        executedQuantity: "1800.000",
        balanceQuantity: "4400.000",
        rate: "1680.00",
        contractAmount: "10416000.00",
        status: "Active",
        remarks: "MoRTH Section 406"
      },
      {
        itemCode: "BOQ-DBM-04",
        projectId,
        roadId: rd2Id,
        chapter: "Chapter 5: Bituminous Works",
        description: "Dense Bituminous Macadam (DBM) with VG-30 bitumen using sensor paver",
        unit: "MT",
        contractQuantity: "3800.000",
        executedQuantity: "950.000",
        balanceQuantity: "2850.000",
        rate: "5400.00",
        contractAmount: "20520000.00",
        status: "Active",
        remarks: "50mm compacted thickness"
      },
      {
        itemCode: "BOQ-BC-05",
        projectId,
        roadId: rd2Id,
        chapter: "Chapter 5: Bituminous Concrete",
        description: "Bituminous Concrete (BC) wearing coat with VG-30/PMB binder",
        unit: "MT",
        contractQuantity: "2400.000",
        executedQuantity: "400.000",
        balanceQuantity: "2000.000",
        rate: "6200.00",
        contractAmount: "14880000.00",
        status: "Active",
        remarks: "30mm wearing course"
      },
      {
        itemCode: "BOQ-CD-06",
        projectId,
        roadId: rd1Id,
        chapter: "Chapter 6: Culverts & Drainage",
        description: "Reinforced cement concrete M25 grade in box culverts and roadside drains",
        unit: "Cum",
        contractQuantity: "1100.000",
        executedQuantity: "520.000",
        balanceQuantity: "580.000",
        rate: "5850.00",
        contractAmount: "6435000.00",
        status: "Active",
        remarks: "Structural concrete"
      }
    ]);
  }

  // 2. Material Inventory Master
  const existingMat = await db.select({ count: sql<number>`count(*)` }).from(materialInventory);
  if (Number(existingMat[0]?.count || 0) === 0) {
    console.log("Seeding Material Inventory...");
    await db.insert(materialInventory).values([
      {
        materialCode: "MAT-AGG-40",
        projectId,
        materialName: "Coarse Aggregate 40mm / GSB Granular",
        unit: "MT",
        minStock: "500.000",
        maxStock: "4000.000",
        openingStock: "600.000",
        receivedQuantity: "3200.000",
        issuedQuantity: "2400.000",
        returnedQuantity: "0.000",
        wastageQuantity: "20.000",
        balanceQuantity: "1380.000",
        averageRate: "720.00",
        supplier: "Shree Stone Crusher Ltd",
        storageLocation: "Batching Yard Stockpile A",
        approvalStatus: "Approved",
        remarks: "Tested for impact and crushing value"
      },
      {
        materialCode: "MAT-AGG-20",
        projectId,
        materialName: "Coarse Aggregate 20mm & 10mm (Graded)",
        unit: "MT",
        minStock: "400.000",
        maxStock: "3500.000",
        openingStock: "500.000",
        receivedQuantity: "2800.000",
        issuedQuantity: "2100.000",
        returnedQuantity: "0.000",
        wastageQuantity: "15.000",
        balanceQuantity: "1185.000",
        averageRate: "810.00",
        supplier: "Narmada Quarry Works",
        storageLocation: "Hot Mix Plant Bin 1 & 2",
        approvalStatus: "Approved",
        remarks: "MoRTH gradation compliant"
      },
      {
        materialCode: "MAT-BIT-VG30",
        projectId,
        materialName: "Bulk Bitumen Grade VG-30",
        unit: "MT",
        minStock: "80.000",
        maxStock: "500.000",
        openingStock: "90.000",
        receivedQuantity: "340.000",
        issuedQuantity: "250.000",
        returnedQuantity: "0.000",
        wastageQuantity: "2.000",
        balanceQuantity: "178.000",
        averageRate: "48500.00",
        supplier: "Indian Oil Corporation (IOCL Ref.)",
        storageLocation: "Insulated Storage Tanks 1-2",
        approvalStatus: "Approved",
        remarks: "Viscosity and ductility test passed"
      },
      {
        materialCode: "MAT-CEM-OPC53",
        projectId,
        materialName: "Portland Cement (OPC 53 Grade)",
        unit: "Bags",
        minStock: "300.000",
        maxStock: "3000.000",
        openingStock: "400.000",
        receivedQuantity: "1800.000",
        issuedQuantity: "1450.000",
        returnedQuantity: "0.000",
        wastageQuantity: "10.000",
        balanceQuantity: "740.000",
        averageRate: "375.00",
        supplier: "UltraTech Cement Depot",
        storageLocation: "Weatherproof Cement Godown",
        approvalStatus: "Approved",
        remarks: "Weekly lot-wise cube test verified"
      },
      {
        materialCode: "MAT-STL-FE500",
        projectId,
        materialName: "TMT Reinforcement Steel (Fe 500D)",
        unit: "MT",
        minStock: "20.000",
        maxStock: "200.000",
        openingStock: "25.000",
        receivedQuantity: "110.000",
        issuedQuantity: "85.000",
        returnedQuantity: "0.000",
        wastageQuantity: "1.500",
        balanceQuantity: "48.500",
        averageRate: "59000.00",
        supplier: "Tata Tiscon Authorized Dealer",
        storageLocation: "Culvert Fabrication Yard",
        approvalStatus: "Approved",
        remarks: "Yield strength test compliant"
      },
      {
        materialCode: "MAT-DIESEL",
        projectId,
        materialName: "HSD Diesel (Fuel for Pavers & Rollers)",
        unit: "Litre",
        minStock: "2000.000",
        maxStock: "20000.000",
        openingStock: "3500.000",
        receivedQuantity: "18000.000",
        issuedQuantity: "16200.000",
        returnedQuantity: "0.000",
        wastageQuantity: "50.000",
        balanceQuantity: "5250.000",
        averageRate: "92.50",
        supplier: "BPCL Retail Outlet",
        storageLocation: "Base Camp Fuel Dispenser",
        approvalStatus: "Approved",
        remarks: "Daily equipment log issued"
      }
    ]);
  }

  // 3. Sample GRN Entries
  const existingGrn = await db.select({ count: sql<number>`count(*)` }).from(grnEntries);
  if (Number(existingGrn[0]?.count || 0) === 0) {
    console.log("Seeding Sample GRN Entries...");
    const mats = await db.select().from(materialInventory);
    const agg40 = mats.find((m) => m.materialCode === "MAT-AGG-40")?.id || mats[0]?.id || 1;
    const bitVg = mats.find((m) => m.materialCode === "MAT-BIT-VG30")?.id || mats[1]?.id || 2;
    const cem = mats.find((m) => m.materialCode === "MAT-CEM-OPC53")?.id || mats[2]?.id || 3;

    await db.insert(grnEntries).values([
      {
        grnNo: "GRN-2026-001",
        grnDate: "2026-09-20",
        projectId,
        materialId: agg40,
        supplier: "Shree Stone Crusher Ltd",
        challanNo: "CH-8842",
        receivedQuantity: "120.000",
        acceptedQuantity: "120.000",
        rejectedQuantity: "0.000",
        unit: "MT",
        rate: "720.00",
        totalAmount: "86400.00",
        inspectionStatus: "Accepted",
        invoiceReference: "INV-SC-901",
        remarks: "Weighbridge slip attached, moisture within permissible limits"
      },
      {
        grnNo: "GRN-2026-002",
        grnDate: "2026-09-22",
        projectId,
        materialId: bitVg,
        supplier: "Indian Oil Corporation (IOCL)",
        challanNo: "CH-IOCL-410",
        receivedQuantity: "28.500",
        acceptedQuantity: "28.500",
        rejectedQuantity: "0.000",
        unit: "MT",
        rate: "48500.00",
        totalAmount: "1382250.00",
        inspectionStatus: "Accepted",
        invoiceReference: "INV-IOC-4481",
        remarks: "Tanker seal verified, temperature 145 deg C"
      },
      {
        grnNo: "GRN-2026-003",
        grnDate: "2026-09-25",
        projectId,
        materialId: cem,
        supplier: "UltraTech Cement Depot",
        challanNo: "CH-UT-1049",
        receivedQuantity: "300.000",
        acceptedQuantity: "300.000",
        rejectedQuantity: "0.000",
        unit: "Bags",
        rate: "375.00",
        totalAmount: "112500.00",
        inspectionStatus: "Accepted",
        invoiceReference: "INV-UTC-662",
        remarks: "Fresh factory stock, manufacturing date verified"
      }
    ]);
  }

  console.log("Phase 1 ERP seed complete!");
  await connection.end();
}

seedPhase1().catch((err) => {
  console.error(err);
  process.exit(1);
});
