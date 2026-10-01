import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.js";

async function runSeed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is required for seeding");
    process.exit(1);
  }

  const pool = mysql.createPool(connectionString);
  const db = drizzle(pool, { schema, mode: "default" });

  console.log("Starting seed process for RDx Road Project Control...");

  // 1. Projects
  const [existingProjects] = await pool.query("SELECT COUNT(*) as count FROM projects");
  // @ts-ignore
  if (existingProjects[0]?.count === 0) {
    console.log("Seeding Projects...");
    await db.insert(schema.projects).values([
      {
        projectId: "PRJ-NH-2026-01",
        projectName: "SH-42 & Major MDR Package 04 Road Improvement Project",
        package: "PKG-04 / 2025-26",
        clientDepartment: "Public Works Department (PWD) / State Highway Authority",
        contractor: "RDx Infra Developers Pvt Ltd",
        agreementStartDate: "2025-10-15",
        agreementEndDate: "2027-04-14",
        status: "In Progress",
        overallProgress: "41.50",
        remarks: "Comprehensive rehabilitation and 2-lane widening with paved shoulder for 14 connecting road stretches."
      }
    ]);
  }

  // Get project ID
  const [projectRows] = await pool.query("SELECT id FROM projects LIMIT 1");
  // @ts-ignore
  const projectId = projectRows[0]?.id;

  // 2. Exactly 14 Roads (requirement: "must manage 14 roads")
  const [existingRoads] = await pool.query("SELECT COUNT(*) as count FROM roads");
  // @ts-ignore
  if (existingRoads[0]?.count === 0) {
    console.log("Seeding exactly 14 Roads...");
    const roadDefinitions = [
      { id: "RD-01", name: "Sector 18 to Expressway Link Road", length: "14.250", start: "0+000", end: "14+250", progress: "68.50" },
      { id: "RD-02", name: "Rampur - Bilaspur Arterial Bypass", length: "18.600", start: "0+000", end: "18+600", progress: "52.00" },
      { id: "RD-03", name: "Industrial Corridor Ring Corridor Road", length: "22.400", start: "0+000", end: "22+400", progress: "34.00" },
      { id: "RD-04", name: "Kalyanpur Feeder Link Highway", length: "9.800", start: "0+000", end: "9+800", progress: "74.00" },
      { id: "RD-05", name: "Ganga Canal Right Bank Service Road", length: "16.100", start: "10+000", end: "26+100", progress: "28.50" },
      { id: "RD-06", name: "Shivaji Chowk - Mandi Connection", length: "6.500", start: "0+000", end: "6+500", progress: "91.00" },
      { id: "RD-07", name: "Greenfield Logistics Park Access Road", length: "11.750", start: "0+000", end: "11+750", progress: "19.00" },
      { id: "RD-08", name: "North-South Connectivity Corridor - Section A", length: "25.300", start: "0+000", end: "25+300", progress: "44.00" },
      { id: "RD-09", name: "Airport Cargo Terminal Spur Road", length: "8.200", start: "0+000", end: "8+200", progress: "61.50" },
      { id: "RD-10", name: "Old NH Diversion & Bridge Approach", length: "5.400", start: "12+400", end: "17+800", progress: "83.00" },
      { id: "RD-11", name: "River Basin Flood Protection Embankment Road", length: "15.000", start: "0+000", end: "15+000", progress: "15.00" },
      { id: "RD-12", name: "Smart City South Periphery Road", length: "13.600", start: "0+000", end: "13+600", progress: "47.00" },
      { id: "RD-13", name: "Heavy Vehicle Minerals Truckway", length: "19.800", start: "0+000", end: "19+800", progress: "38.00" },
      { id: "RD-14", name: "Bypass Junction Interchange Loops & Service Lanes", length: "7.150", start: "0+000", end: "7+150", progress: "55.00" },
    ];

    for (const r of roadDefinitions) {
      await db.insert(schema.roads).values({
        roadId: r.id,
        projectId,
        roadName: r.name,
        roadLengthKm: r.length,
        startRd: r.start,
        endRd: r.end,
        status: parseFloat(r.progress) > 80 ? "In Progress" : parseFloat(r.progress) < 20 ? "In Progress" : "In Progress",
        progress: r.progress,
        remarks: `Standard 2-lane with 1.5m paved shoulders, flexible pavement structure.`
      });
    }
  }

  // Get Road IDs
  const [roadRows] = await pool.query("SELECT id, roadId, roadName FROM roads ORDER BY id ASC");
  // @ts-ignore
  const roadList = roadRows as Array<{ id: number; roadId: string; roadName: string }>;

  // 3. Activities
  const [existingActivities] = await pool.query("SELECT COUNT(*) as count FROM activities");
  // @ts-ignore
  if (existingActivities[0]?.count === 0 && roadList.length > 0) {
    console.log("Seeding Activities across roads...");
    const sampleTasks = [
      {
        taskId: "TSK-001",
        roadId: roadList[0].id,
        phase: "Earthwork" as const,
        activityName: "Embankment & Subgrade Compaction (Top 500mm)",
        startDate: "2025-11-01",
        endDate: "2026-03-31",
        percentageComplete: "85.00",
        status: "In Progress" as const,
        priority: "High" as const,
        assignedTo: "Er. Ramesh Verma (Site Engg)",
        remarks: "Filling in 250mm layers to 97% MDD standard."
      },
      {
        taskId: "TSK-002",
        roadId: roadList[0].id,
        phase: "GSB" as const,
        activityName: "Granular Sub-Base Grading-II Laying & Rolling",
        startDate: "2025-12-15",
        endDate: "2026-05-15",
        percentageComplete: "60.00",
        status: "In Progress" as const,
        priority: "High" as const,
        assignedTo: "Er. Ramesh Verma (Site Engg)",
        remarks: "200mm compacted thickness in progress."
      },
      {
        taskId: "TSK-003",
        roadId: roadList[0].id,
        phase: "WMM" as const,
        activityName: "Wet Mix Macadam (WMM) Base Course 150mm",
        startDate: "2026-02-01",
        endDate: "2026-06-30",
        percentageComplete: "35.00",
        status: "In Progress" as const,
        priority: "Medium" as const,
        assignedTo: "Er. Ramesh Verma (Site Engg)",
        remarks: "Material sourced from Crusher Plant Unit 2."
      },
      {
        taskId: "TSK-004",
        roadId: roadList[1].id,
        phase: "Structures / CD Works" as const,
        activityName: "Construction of Box Culvert at Ch 4+250 (2x2m)",
        startDate: "2025-11-10",
        endDate: "2026-02-28", // Overdue task demonstration
        percentageComplete: "70.00",
        status: "Overdue" as const,
        priority: "Critical" as const,
        assignedTo: "Er. Amit Saxena (Structural Engg)",
        remarks: "Delayed due to irrigation canal water diversion."
      },
      {
        taskId: "TSK-005",
        roadId: roadList[1].id,
        phase: "Bituminous Work" as const,
        activityName: "Dense Bituminous Macadam (DBM) 60mm with VG-30",
        startDate: "2026-03-01",
        endDate: "2026-08-15",
        percentageComplete: "20.00",
        status: "In Progress" as const,
        priority: "High" as const,
        assignedTo: "Er. Amit Saxena (Structural Engg)",
        remarks: "Sensor paver allocated."
      },
      {
        taskId: "TSK-006",
        roadId: roadList[5].id, // Shivaji Chowk (high progress)
        phase: "Bituminous Work" as const,
        activityName: "Bituminous Concrete (BC) 40mm Wearing Coat",
        startDate: "2026-01-10",
        endDate: "2026-03-20",
        percentageComplete: "100.00",
        status: "Complete" as const,
        priority: "High" as const,
        assignedTo: "Er. Vikas Singh",
        remarks: "100% finished with excellent ride quality index."
      },
      {
        taskId: "TSK-007",
        roadId: roadList[5].id,
        phase: "Road Furniture" as const,
        activityName: "Thermoplastic Road Marking & Cat Eyes Studs",
        startDate: "2026-03-22",
        endDate: "2026-04-10",
        percentageComplete: "80.00",
        status: "In Progress" as const,
        priority: "Medium" as const,
        assignedTo: "Er. Vikas Singh",
        remarks: "Center line and edge marking completed."
      },
      {
        taskId: "TSK-008",
        roadId: roadList[2].id,
        phase: "Drain & Protection" as const,
        activityName: "RCC Trapezoidal Side Drain Ch 0+000 to 5+000",
        startDate: "2026-01-05",
        endDate: "2026-05-30",
        percentageComplete: "42.00",
        status: "In Progress" as const,
        priority: "Medium" as const,
        assignedTo: "Er. Manoj Kumar",
        remarks: "Formwork shifting in progress."
      },
      {
        taskId: "TSK-009",
        roadId: roadList[6].id,
        phase: "Pre-Construction" as const,
        activityName: "Joint Site Verification & Tree Enumeration",
        startDate: "2026-02-15",
        endDate: "2026-03-10",
        percentageComplete: "100.00",
        status: "Complete" as const,
        priority: "High" as const,
        assignedTo: "Er. Rajesh Gupta",
        remarks: "Joint inspection report signed with Forest Ranger."
      },
      {
        taskId: "TSK-010",
        roadId: roadList[7].id,
        phase: "Earthwork" as const,
        activityName: "Borrow Area Excavation & Roadbed Preparation",
        startDate: "2026-03-01",
        endDate: "2026-07-31",
        percentageComplete: "25.00",
        status: "In Progress" as const,
        priority: "Medium" as const,
        assignedTo: "Er. Alok Mishra",
        remarks: "4 Tipper trucks and 2 excavators deployed."
      }
    ];

    for (const t of sampleTasks) {
      await db.insert(schema.activities).values({
        taskId: t.taskId,
        projectId,
        roadId: t.roadId,
        phase: t.phase,
        activityName: t.activityName,
        startDate: t.startDate,
        endDate: t.endDate,
        percentageComplete: t.percentageComplete,
        status: t.status,
        priority: t.priority,
        assignedTo: t.assignedTo,
        remarks: t.remarks,
        dependencyType: "FS"
      });
    }
  }

  // 4. Daily Progress
  const [existingDP] = await pool.query("SELECT COUNT(*) as count FROM daily_progress");
  // @ts-ignore
  if (existingDP[0]?.count === 0) {
    const [actRows] = await pool.query("SELECT id, roadId FROM activities LIMIT 2");
    // @ts-ignore
    if (actRows.length > 0) {
      await db.insert(schema.dailyProgress).values([
        {
          date: "2026-09-26",
          projectId,
          // @ts-ignore
          roadId: actRows[0].roadId,
          // @ts-ignore
          activityId: actRows[0].id,
          plannedQuantity: "450.00",
          actualQuantity: "420.00",
          unit: "Cum",
          percentageComplete: "85.00",
          manpower: "1 Site Engg, 2 Supervisors, 14 Skilled Labors, 10 Helpers",
          machinery: "1 Motor Grader (Cat 120K), 1 Soil Compactor (Hamm 311D), 4 Dumpers",
          weather: "Clear / Sunny",
          hindrance: "None. Work progressed smoothly throughout day shift.",
          remarks: "Target achieved up to RD 3+400. Level check passed.",
          sitePhotos: JSON.stringify(["/manus-storage/site_subgrade_compaction.jpg"])
        },
        {
          date: "2026-09-25",
          projectId,
          // @ts-ignore
          roadId: actRows[1].roadId,
          // @ts-ignore
          activityId: actRows[1].id,
          plannedQuantity: "300.00",
          actualQuantity: "280.00",
          unit: "Cum",
          percentageComplete: "60.00",
          manpower: "1 Supervisor, 8 Labors",
          machinery: "1 Vibromax Roller, 1 Water Bowser (10KL)",
          weather: "Partly Cloudy",
          hindrance: "Water bowser delayed by 45 mins in morning.",
          remarks: "Field density test taken at 3 locations.",
          sitePhotos: JSON.stringify(["/manus-storage/site_gsb_laying.jpg"])
        }
      ]);
    }
  }

  // 5. Billing & QS
  const [existingBills] = await pool.query("SELECT COUNT(*) as count FROM billing");
  // @ts-ignore
  if (existingBills[0]?.count === 0 && roadList.length > 0) {
    console.log("Seeding Billing & QS records...");
    await db.insert(schema.billing).values([
      {
        billId: "BILL-2026-RA-01",
        projectId,
        roadId: roadList[0].id,
        billType: "RA Bill 01 (Initial Earthwork & CD Works)",
        measurementStatus: "Completed",
        quantityCalculationStatus: "Completed",
        abstractStatus: "Completed",
        billPrepared: "Yes",
        submissionDate: "2026-01-20",
        verificationStatus: "Payment Received",
        passedAmount: "18450000.00",
        paymentStatus: "Received",
        paymentDate: "2026-02-18",
        remarks: "100% payment credited after 5% security deduction."
      },
      {
        billId: "BILL-2026-RA-02",
        projectId,
        roadId: roadList[0].id,
        billType: "RA Bill 02 (Subgrade & GSB works)",
        measurementStatus: "Completed",
        quantityCalculationStatus: "Completed",
        abstractStatus: "Completed",
        billPrepared: "Yes",
        submissionDate: "2026-05-10",
        verificationStatus: "Passed",
        passedAmount: "24200000.00",
        paymentStatus: "Unpaid",
        paymentDate: null,
        remarks: "Bill verified and sanctioned by Superintending Engineer. Treasury token generated."
      },
      {
        billId: "BILL-2026-RA-03",
        projectId,
        roadId: roadList[1].id,
        billType: "RA Bill 03 (WMM & Prime Coat)",
        measurementStatus: "Completed",
        quantityCalculationStatus: "Completed",
        abstractStatus: "Completed",
        billPrepared: "Yes",
        submissionDate: "2026-09-15",
        verificationStatus: "Under Verification",
        passedAmount: "31800000.00",
        paymentStatus: "Unpaid",
        paymentDate: null,
        remarks: "Joint measurements recorded in MB No. 412, currently with Executive Engineer."
      },
      {
        billId: "BILL-2026-RA-04",
        projectId,
        roadId: roadList[5].id,
        billType: "RA Bill 04 (Bituminous Concrete & Furniture)",
        measurementStatus: "In Progress",
        quantityCalculationStatus: "Pending",
        abstractStatus: "Pending",
        billPrepared: "No",
        submissionDate: null,
        verificationStatus: "Measurement",
        passedAmount: "0.00",
        paymentStatus: "Unpaid",
        paymentDate: null,
        remarks: "Field measurements underway on RD 0+000 to 6+500."
      }
    ]);
  }

  // 6. Hindrances (demonstrating auto calculation, overdue alerts, categories)
  const [existingHindrances] = await pool.query("SELECT COUNT(*) as count FROM hindrances");
  // @ts-ignore
  if (existingHindrances[0]?.count === 0 && roadList.length > 0) {
    console.log("Seeding Hindrances...");
    await db.insert(schema.hindrances).values([
      {
        hindranceId: "HND-2026-001",
        projectId,
        roadId: roadList[1].id,
        rdLocation: "RD 4+150 to 4+400",
        category: "Electric Pole",
        description: "11kV HT line with 6 double poles infringing the proposed road embankment and drainage alignment.",
        dateRaised: "2026-07-10",
        affectedActivity: "Embankment & Culvert Construction",
        affectedLength: "250 meters",
        responsiblePersonDepartment: "State Electricity Transmission Corp (DISCOM)",
        letterNumber: "RDX/PWD/ELEC/2026/84",
        status: "Open",
        dueDate: "2026-08-30", // Overdue demonstration
        resolutionDate: null,
        daysPending: 79,
        remarks: "Joint estimate submitted. Shifting deposit paid, shutdown schedule awaited.",
        supportingPhotosDocuments: JSON.stringify(["pole_infringement_ch4.jpg"])
      },
      {
        hindranceId: "HND-2026-002",
        projectId,
        roadId: roadList[2].id,
        rdLocation: "RD 11+800 to 12+500",
        category: "Land Issue",
        description: "Local farmers dispute RoW boundary regarding compensation disbursement by Revenue Office.",
        dateRaised: "2026-08-01",
        affectedActivity: "Earthwork Subgrade & GSB",
        affectedLength: "700 meters",
        responsiblePersonDepartment: "Competent Authority for Land Acquisition (CALA) / SDM Office",
        letterNumber: "RDX/LAND/DISP/2026/102",
        status: "Open",
        dueDate: "2026-09-15", // Overdue demonstration
        resolutionDate: null,
        daysPending: 57,
        remarks: "SDM demarcation hearing held on 18th Sep. Final boundary demarcation order awaited.",
        supportingPhotosDocuments: JSON.stringify(["land_dispute_notice.pdf"])
      },
      {
        hindranceId: "HND-2026-003",
        projectId,
        roadId: roadList[4].id,
        rdLocation: "RD 18+200",
        category: "Utility",
        description: "Public Health water pipeline 300mm dia crossing at low cover depth.",
        dateRaised: "2026-09-10",
        affectedActivity: "Box Culvert Excavation",
        affectedLength: "50 meters",
        responsiblePersonDepartment: "PHED (Water Supply Division)",
        letterNumber: "RDX/PHED/PIPE/2026/19",
        status: "Under Review",
        dueDate: "2026-10-10",
        resolutionDate: null,
        daysPending: 17,
        remarks: "Pipe casing encasement drawing submitted for approval.",
        supportingPhotosDocuments: null
      },
      {
        hindranceId: "HND-2026-004",
        projectId,
        roadId: roadList[0].id,
        rdLocation: "RD 8+600",
        category: "Forest/Tree",
        description: "14 Sheesham trees within 2m of carriage edge requiring stage-II felling permit.",
        dateRaised: "2026-05-01",
        affectedActivity: "Paved Shoulder Widening",
        affectedLength: "150 meters",
        responsiblePersonDepartment: "DFO Social Forestry",
        letterNumber: "PWD/FOR/TREE/2026/33",
        status: "Resolved",
        dueDate: "2026-07-15",
        resolutionDate: "2026-07-20",
        daysPending: 80,
        remarks: "Forest department tree felling completed and timber cleared.",
        supportingPhotosDocuments: null
      }
    ]);
  }

  // 7. QA/QC Tests
  const [existingQA] = await pool.query("SELECT COUNT(*) as count FROM qa_qc_tests");
  // @ts-ignore
  if (existingQA[0]?.count === 0 && roadList.length > 0) {
    console.log("Seeding QA/QC Tests...");
    await db.insert(schema.qaQcTests).values([
      {
        testId: "QA-2026-001",
        date: "2026-09-24",
        projectId,
        roadId: roadList[0].id,
        activity: "Subgrade Compaction Layer 2",
        testType: "FDT",
        locationRd: "Ch 2+450 RHS",
        requiredValue: ">= 97.00 % MDD",
        actualValue: "98.20 % MDD",
        unit: "% MDD",
        result: "Passed",
        testReportReference: "LAB/FDT/2026/418",
        remarks: "Sand replacement method performed by Senior QC Inspector.",
        correctiveActionStatus: "None",
        correctiveActionNotes: null
      },
      {
        testId: "QA-2026-002",
        date: "2026-09-25",
        projectId,
        roadId: roadList[1].id,
        activity: "GSB Layer 1",
        testType: "Gradation",
        locationRd: "Ch 7+100 LHS",
        requiredValue: "Sieve 75mm to 0.075mm within envelope Grad-II",
        actualValue: "Excess fines passing 0.075mm (8.4% vs max 5%)",
        unit: "Grading Envelope",
        result: "Failed",
        testReportReference: "LAB/GRAD/2026/109",
        remarks: "Fines higher than MoRTH Table 400-1 specifications.",
        correctiveActionStatus: "Required",
        correctiveActionNotes: "Rejected lot isolated. Additional 20mm aggregates mixed and re-rolled. Re-testing scheduled on 28-Sep."
      },
      {
        testId: "QA-2026-003",
        date: "2026-09-22",
        projectId,
        roadId: roadList[5].id,
        activity: "Dense Bituminous Macadam",
        testType: "Marshall",
        locationRd: "Plant Batch #84",
        requiredValue: "Stability >= 12 kN, Flow 2-4 mm",
        actualValue: "Stability 14.8 kN, Flow 3.1 mm",
        unit: "kN / mm",
        result: "Passed",
        testReportReference: "LAB/BIT/MAR/2026/72",
        remarks: "Binder content tested at 4.62% (optimal 4.60%).",
        correctiveActionStatus: "None",
        correctiveActionNotes: null
      },
      {
        testId: "QA-2026-004",
        date: "2026-09-26",
        projectId,
        roadId: roadList[0].id,
        activity: "Subgrade Soil Soil Investigation",
        testType: "CBR",
        locationRd: "Borrow Area Pit 4",
        requiredValue: "4-Day Soaked CBR >= 8.0 %",
        actualValue: "9.50 %",
        unit: "%",
        result: "Passed",
        testReportReference: "LAB/CBR/2026/304",
        remarks: "Approved for subgrade construction.",
        correctiveActionStatus: "None",
        correctiveActionNotes: null
      }
    ]);
  }

  // 8. Materials (demonstrating Balance = Received - Used)
  const [existingMat] = await pool.query("SELECT COUNT(*) as count FROM materials");
  // @ts-ignore
  if (existingMat[0]?.count === 0 && roadList.length > 0) {
    console.log("Seeding Materials stock...");
    await db.insert(schema.materials).values([
      {
        entryId: "MAT-2026-001",
        date: "2026-09-20",
        projectId,
        roadId: roadList[0].id,
        material: "VG-30 Paving Bitumen",
        receivedQuantity: "120.00",
        usedQuantity: "85.50",
        balanceQuantity: "34.50",
        unit: "MT",
        supplier: "Indian Oil Corporation Limited (Mathura)",
        challanReference: "IOCL/BIT/8921",
        remarks: "Stored in heated insulated tanks at batching yard."
      },
      {
        entryId: "MAT-2026-002",
        date: "2026-09-22",
        projectId,
        roadId: roadList[1].id,
        material: "OPC 53 Grade Cement",
        receivedQuantity: "250.00",
        usedQuantity: "190.00",
        balanceQuantity: "60.00",
        unit: "MT",
        supplier: "UltraTech Cement Depot",
        challanReference: "UT/CEM/4401",
        remarks: "Tested for fineness and 7-day compressive strength."
      },
      {
        entryId: "MAT-2026-003",
        date: "2026-09-24",
        projectId,
        roadId: roadList[0].id,
        material: "Crushed Aggregates (40mm & 20mm Grad-II)",
        receivedQuantity: "3500.00",
        usedQuantity: "2850.00",
        balanceQuantity: "650.00",
        unit: "Cum",
        supplier: "M/s Krishna Stone Crusher Zone",
        challanReference: "KSC/AGG/1209",
        remarks: "Crushing value 18.2%, flakiness 14%."
      },
      {
        entryId: "MAT-2026-004",
        date: "2026-09-25",
        projectId,
        roadId: roadList[2].id,
        material: "Fe-500D TMT Reinforcement Steel",
        receivedQuantity: "80.00",
        usedQuantity: "54.20",
        balanceQuantity: "25.80",
        unit: "MT",
        supplier: "Tata Steel BSL / Authorized Dealer",
        challanReference: "TS/TMT/7781",
        remarks: "Used for Box culverts and retaining walls."
      }
    ]);
  }

  // 9. Documents (Categories: Agreement, BOQ, Drawings, DPR, QA/QC, etc.)
  const [existingDocs] = await pool.query("SELECT COUNT(*) as count FROM documents");
  // @ts-ignore
  if (existingDocs[0]?.count === 0 && roadList.length > 0) {
    console.log("Seeding Documents...");
    await db.insert(schema.documents).values([
      {
        projectId,
        roadId: null,
        category: "Agreement",
        title: "Signed Contract Agreement with PWD Superintending Engineer",
        documentNumber: "PWD/SE/CONTR/2025/11",
        fileUrl: "/manus-storage/Contract_Agreement_Package4.pdf",
        fileSize: "14.2 MB",
        uploadedBy: "Admin / GM Contracts",
        date: "2025-10-15",
        remarks: "Standard EPC contract format with defect liability period of 36 months."
      },
      {
        projectId,
        roadId: null,
        category: "BOQ",
        title: "Priced Bill of Quantities (BOQ) Schedule A to F",
        documentNumber: "BOQ-FINAL-REV2",
        fileUrl: "/manus-storage/Priced_BOQ_RDX.xlsx",
        fileSize: "4.8 MB",
        uploadedBy: "QS Lead Er. N. Sharma",
        date: "2025-10-20",
        remarks: "Item rate breakdown including variation items."
      },
      {
        projectId,
        roadId: roadList[0].id,
        category: "Drawings",
        title: "Good For Construction (GFC) Plan & Longitudinal Profile Road 01",
        documentNumber: "DWG-GFC-RD01-P01",
        fileUrl: "/manus-storage/GFC_Road01_Plan_Profile.dwg",
        fileSize: "28.5 MB",
        uploadedBy: "Design Consultant M/s Mott MacDonald",
        date: "2025-11-05",
        remarks: "Approved by Proof Consultant."
      },
      {
        projectId,
        roadId: roadList[1].id,
        category: "Drawings",
        title: "Structural GAD of 2x2m Box Culvert at Ch 4+250",
        documentNumber: "DWG-STR-BC-04",
        fileUrl: "/manus-storage/Box_Culvert_GAD_Ch4250.pdf",
        fileSize: "6.1 MB",
        uploadedBy: "Structural Division",
        date: "2025-11-12",
        remarks: "Bar bending schedule attached."
      },
      {
        projectId,
        roadId: roadList[0].id,
        category: "QA/QC",
        title: "Approved Quality Assurance Plan (QAP) & Inspection Testing Plan",
        documentNumber: "QAP-RDX-2025-01",
        fileUrl: "/manus-storage/Approved_QAP_Roads.pdf",
        fileSize: "8.4 MB",
        uploadedBy: "QA Head Er. S. Roy",
        date: "2025-11-20",
        remarks: "Endorsed by Independent Engineer."
      }
    ]);
  }

  // 10. Notifications
  const [existingNotifs] = await pool.query("SELECT COUNT(*) as count FROM notifications");
  // @ts-ignore
  if (existingNotifs[0]?.count === 0) {
    console.log("Seeding initial notifications...");
    await db.insert(schema.notifications).values([
      {
        type: "QA_FAILED",
        title: "QA/QC Test Failed - Action Required",
        message: "Gradation test failed on Road 02 (Ch 7+100 LHS). Excess fines detected. Non-conformance note issued.",
        severity: "critical",
        targetRole: "qa_qc_engineer",
        isRead: 0,
        entityType: "QA_TEST",
        entityId: "QA-2026-002"
      },
      {
        type: "HINDRANCE_OVERDUE",
        title: "Overdue Hindrance Alert (79 Days)",
        message: "Hindrance HND-2026-001 (Electric Pole shifting on Road 02) is past due date. Executive escalation triggered.",
        severity: "warning",
        targetRole: "project_manager",
        isRead: 0,
        entityType: "HINDRANCE",
        entityId: "HND-2026-001"
      },
      {
        type: "BILL_SUBMITTED",
        title: "RA Bill 03 Submitted for Verification",
        message: "RA Bill 03 for Road 02 (Amount: ₹3.18 Cr) submitted. Responsible verifier assigned.",
        severity: "info",
        targetRole: "qs_billing_engineer",
        isRead: 0,
        entityType: "BILL",
        entityId: "BILL-2026-RA-03"
      }
    ]);
  }

  console.log("Seeding completed successfully!");
  await pool.end();
}

runSeed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
