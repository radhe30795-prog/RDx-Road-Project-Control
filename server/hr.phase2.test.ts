import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

function context(role: "admin" | "hr_payroll_manager" | "user") {
  return {
    user: {
      id: role === "admin" ? 1 : role === "hr_payroll_manager" ? 2 : 99,
      openId: `hr-test-${role}`,
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

describe("HR & Payroll Phase 2: Attendance, Leave & Monthly Salary Sheet", () => {
  it("allows marking daily muster roll attendance with overtime", async () => {
    const caller = appRouter.createCaller(context("hr_payroll_manager"));
    const employees = await caller.hr.employees();
    expect(employees.length).toBeGreaterThan(0);
    const emp = employees[0]!.employee;

    const res = await caller.hr.markAttendance({
      employeeId: emp.id,
      attendanceDate: "2026-04-12",
      status: "Present",
      overtimeHours: "2.50",
      remarks: "Bridge concreting late night shift",
    });

    expect(res).toBeDefined();

    const list = await caller.hr.attendanceList({ date: "2026-04-12", employeeId: emp.id });
    expect(list.length).toBe(1);
    expect(list[0]!.attendance.status).toBe("Present");
    expect(Number(list[0]!.attendance.overtimeHours)).toBe(2.5);
  }, 20000);

  it("handles leave request submission and approval lifecycle", async () => {
    const caller = appRouter.createCaller(context("hr_payroll_manager"));
    const employees = await caller.hr.employees();
    const emp = employees[0]!.employee;

    const created = await caller.hr.createLeaveRequest({
      employeeId: emp.id,
      leaveType: "Sick",
      fromDate: "2026-04-18",
      toDate: "2026-04-19",
      totalDays: "2.00",
      reason: "Viral fever",
    });
    const leaveId = (created as any)[0]?.insertId;

    const leaves = await caller.hr.leaveRequests({ employeeId: emp.id, status: "Pending" });
    const targetLeave = leaves.find((l) => l.leave.id === leaveId) || leaves[0];
    expect(targetLeave).toBeDefined();

    await caller.hr.updateLeaveStatus({
      id: targetLeave!.leave.id,
      status: "Approved",
      remarks: "Medical certificate verified",
    });

    const approvedLeaves = await caller.hr.leaveRequests({ employeeId: emp.id, status: "Approved" });
    expect(approvedLeaves.some((l) => l.leave.id === targetLeave!.leave.id)).toBe(true);
  }, 20000);

  it("computes monthly payroll draft from employee rates, attendance & overtime", async () => {
    const caller = appRouter.createCaller(context("admin"));

    const result = await caller.hr.generateMonthlyPayroll({
      payrollMonth: "2026-04",
      remarks: "April 2026 Site Mobilization & Works",
    });

    expect(result.payrollRunId).toBeGreaterThan(0);
    expect(result.employeeCount).toBeGreaterThanOrEqual(3);
    expect(result.grossTotal).toBeGreaterThan(0);

    const lines = await caller.hr.payrollLines({ payrollRunId: result.payrollRunId });
    expect(lines.length).toBeGreaterThanOrEqual(3);
    expect(lines.every((line) => Number(line.line.grossAmount) >= 0)).toBe(true);

    await caller.hr.approvePayrollRun({ payrollRunId: result.payrollRunId });
    const runs = await caller.hr.payrollRuns();
    const currentRun = runs.find((r) => r.id === result.payrollRunId);
    expect(currentRun?.status).toBe("Approved");
  }, 25000);
});
