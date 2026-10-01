import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

function context(role: "admin" | "hr_payroll_manager" | "user") {
  return {
    user: {
      id: role === "admin" ? 1 : role === "hr_payroll_manager" ? 2 : 99,
      openId: `hr4-test-${role}`,
      email: `${role}@rdxinfra.example`,
      name: role === "admin" ? "HR Admin" : role === "hr_payroll_manager" ? "HR Manager" : "Basic User",
      loginMethod: "google",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: () => {} } as any,
  };
}

describe("HR & Payroll Phase 4: Bank Payouts, Muster Matrix & Labour Gang Settlements", () => {
  it("calculates monthly muster roll matrix with P/A/HD and payable days for all active staff", async () => {
    const caller = appRouter.createCaller(context("hr_payroll_manager"));
    const matrixData = await caller.hr.musterMatrix({ month: "2026-04" });

    expect(matrixData).toBeDefined();
    expect(matrixData.days.length).toBe(30); // April has 30 days
    expect(matrixData.matrix.length).toBeGreaterThan(0);

    const firstStaff = matrixData.matrix[0]!;
    expect(firstStaff.employee.id).toBeGreaterThan(0);
    expect(firstStaff.dayMap).toBeDefined();
    expect(firstStaff.payableDays).toBeGreaterThanOrEqual(0);
  }, 20000);

  it("generates a bank payout batch from an approved payroll run", async () => {
    const caller = appRouter.createCaller(context("admin"));
    const runs = await caller.hr.payrollRuns();
    expect(runs.length).toBeGreaterThan(0);
    const targetRun = runs[0]!;
    if (targetRun.status === "Draft") {
      await caller.hr.approvePayrollRun({ payrollRunId: targetRun.id });
    }

    const batchRes = await caller.hr.generatePayoutBatch({
      payrollRunId: targetRun.id,
      remarks: "Test NEFT payout generation",
    });

    expect(batchRes).toBeDefined();
    expect(batchRes.id).toBeGreaterThan(0);
    expect(batchRes.batchReference.length).toBeGreaterThan(4);

    const lines = await caller.hr.payoutLines({ payoutBatchId: batchRes.id });
    expect(lines.length).toBeGreaterThan(0);
    expect(Number(lines[0]!.line.amount)).toBeGreaterThan(0);
  }, 25000);

  it("creates, retrieves, and approves weekly labour gang wage settlements", async () => {
    const caller = appRouter.createCaller(context("hr_payroll_manager"));
    const projects = await caller.hr.projects();
    expect(projects.length).toBeGreaterThan(0);
    const pId = projects[0]!.id;

    const res = await caller.hr.createGroupSettlement({
      projectId: pId,
      groupName: "Drain Excavation Labour Gang",
      contractorName: "Shankar Labour Mukadam",
      periodFrom: "2026-04-10",
      periodTo: "2026-04-16",
      labourCount: 8,
      manDays: "48.00",
      ratePerDay: "420.00",
      grossAmount: "20160.00",
      advanceDeduction: "2000.00",
      netAmount: "18160.00",
      remarks: "Side drain clearing & dressing",
    });

    expect(res).toBeDefined();

    const list = await caller.hr.groupSettlements({ projectId: pId });
    expect(list.length).toBeGreaterThan(0);
    const created = list.find((s) => s.settlement.groupName === "Drain Excavation Labour Gang");
    expect(created).toBeDefined();
    expect(Number(created!.settlement.netAmount)).toBe(18160);

    const approveRes = await caller.hr.updateGroupSettlementStatus({
      id: created!.settlement.id,
      status: "Approved",
    });
    expect(approveRes).toBeDefined();
  }, 25000);
});
