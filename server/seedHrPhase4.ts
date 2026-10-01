import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { hrGroupSettlements, hrPayoutBatches, hrPayoutLines, hrPayrollRuns, hrPayrollLines, projects, roads } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function seedPhase4() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(connection);

  console.log("Seeding HR Phase 4 Payout Batches and Labour Settlements...");

  const allProjects = await db.select().from(projects).limit(1);
  const allRoads = await db.select().from(roads).limit(2);
  const projId = allProjects[0]?.id || 30001;
  const roadId = allRoads[0]?.id || null;

  // 1. Seed sample Labour Group Settlements
  const existingSettlements = await db.select().from(hrGroupSettlements).limit(1);
  if (!existingSettlements.length) {
    await db.insert(hrGroupSettlements).values([
      {
        projectId: projId,
        roadId,
        groupName: "Culvert Shuttering & Steel Gang #1",
        contractorName: "Rameshwar Labour Contractor",
        periodFrom: "2026-04-01",
        periodTo: "2026-04-07",
        labourCount: 14,
        manDays: "84.00",
        ratePerDay: "450.00",
        grossAmount: "37800.00",
        advanceDeduction: "4000.00",
        netAmount: "33800.00",
        status: "Approved",
        remarks: "Box culvert slab concrete and reinforcement work Ch. 1+450",
      },
      {
        projectId: projId,
        roadId: allRoads[1]?.id || roadId,
        groupName: "Gravel & WMM Spreading Beldar Gang",
        contractorName: "Chouhan Manpower Suppliers",
        periodFrom: "2026-04-08",
        periodTo: "2026-04-14",
        labourCount: 10,
        manDays: "60.00",
        ratePerDay: "400.00",
        grossAmount: "24000.00",
        advanceDeduction: "2500.00",
        netAmount: "21500.00",
        status: "Draft",
        remarks: "Shoulder dressing and camber maintenance",
      },
    ]);
  }

  // 2. Seed a sample Bank Payout Batch for existing approved payroll run
  const runs = await db.select().from(hrPayrollRuns).limit(1);
  if (runs.length > 0) {
    const run = runs[0]!;
    const existingBatches = await db.select().from(hrPayoutBatches).where(eq(hrPayoutBatches.payrollRunId, run.id)).limit(1);
    if (!existingBatches.length) {
      const lines = await db.select().from(hrPayrollLines).where(eq(hrPayrollLines.payrollRunId, run.id));
      const payableLines = lines.filter((l) => Number(l.netAmount) > 0);
      const totalAmount = payableLines.reduce((sum, l) => sum + Number(l.netAmount), 0);
      const batchRef = `NEFT-${run.payrollMonth}-001`;

      const [bRes] = await db.insert(hrPayoutBatches).values({
        payrollRunId: run.id,
        batchReference: batchRef,
        status: "Exported",
        employeeCount: payableLines.length,
        totalAmount: totalAmount.toFixed(2),
        remarks: `Bank transfer batch for ${run.payrollMonth}`,
      });

      const bId = (bRes as any)?.insertId;
      for (const line of payableLines) {
        await db.insert(hrPayoutLines).values({
          payoutBatchId: bId,
          payrollLineId: line.id,
          employeeId: line.employeeId,
          beneficiaryName: `Beneficiary #${line.employeeId}`,
          bankName: "State Bank of India",
          accountLast4: "5678",
          ifscCode: "SBIN0001234",
          amount: line.netAmount,
          status: "Ready",
          remarks: "Monthly net pay NEFT",
        });
      }
    }
  }

  console.log("HR Phase 4 seed completed successfully.");
  await connection.end();
}

seedPhase4().catch((err) => {
  console.error("Failed to seed HR Phase 4:", err);
  process.exit(1);
});
