import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

function context(role: "admin" | "hr_payroll_manager" | "user") {
  return {
    user: {
      id: role === "admin" ? 1 : role === "hr_payroll_manager" ? 2 : 99,
      openId: `hr3-test-${role}`,
      email: `${role}@rdxinfra.example`,
      name: role === "admin" ? "HR Admin" : role === "hr_payroll_manager" ? "HR Officer" : "Basic User",
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

describe("HR & Payroll Phase 3: Salary Advances, Deductions & Pay Slips", () => {
  it("records and filters salary advance adjustments", async () => {
    const caller = appRouter.createCaller(context("hr_payroll_manager"));
    const employees = await caller.hr.employees();
    expect(employees.length).toBeGreaterThan(0);
    const emp = employees.find((row) => row.employee.status === "Active" && Number(row.employee.basicRate) > 0)?.employee || employees[0]!.employee;

    const res = await caller.hr.createAdjustment({
      employeeId: emp.id,
      payrollMonth: "2026-04",
      adjustmentType: "Advance",
      title: "Site Tool Expense Advance",
      amount: "1500.00",
      status: "Approved",
      remarks: "Field advance voucher #ADV-104",
    });

    expect(res).toBeDefined();

    const list = await caller.hr.adjustments({ employeeId: emp.id, payrollMonth: "2026-04" });
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list.some((a) => a.adjustment.title === "Site Tool Expense Advance")).toBe(true);
  }, 20000);

  it("calculates monthly payroll deducting advances and adding allowances", async () => {
    const caller = appRouter.createCaller(context("admin"));

    const result = await caller.hr.generateMonthlyPayroll({
      payrollMonth: "2026-04",
      remarks: "April 2026 with verified advances",
    });

    expect(result.payrollRunId).toBeGreaterThan(0);

    const lines = await caller.hr.payrollLines({ payrollRunId: result.payrollRunId });
    expect(lines.length).toBeGreaterThan(0);

    // Verify deductionAmount and netAmount calculations
    const lineWithDeduction = lines.find((l) => Number(l.line.deductionAmount) > 0);
    expect(lineWithDeduction).toBeDefined();
    if (lineWithDeduction) {
      const gross = Number(lineWithDeduction.line.grossAmount);
      const ded = Number(lineWithDeduction.line.deductionAmount);
      const net = Number(lineWithDeduction.line.netAmount);
      expect(net).toBeCloseTo(Math.max(0, gross - ded), 1);
    }
  }, 25000);

  it("retrieves comprehensive payslip data for individual employee", async () => {
    const caller = appRouter.createCaller(context("hr_payroll_manager"));
    const runs = await caller.hr.payrollRuns();
    expect(runs.length).toBeGreaterThan(0);
    const runId = runs[0]!.id;

    const lines = await caller.hr.payrollLines({ payrollRunId: runId });
    expect(lines.length).toBeGreaterThan(0);
    const empId = lines[0]!.line.employeeId;

    const payslip = await caller.hr.payslip({ payrollRunId: runId, employeeId: empId });
    expect(payslip).toBeDefined();
    expect(payslip.employee.id).toBe(empId);
    expect(payslip.run.id).toBe(runId);
    expect(Number(payslip.line.netAmount)).toBeGreaterThanOrEqual(0);
    expect(payslip.attendanceSummary).toBeDefined();
  }, 20000);
});
