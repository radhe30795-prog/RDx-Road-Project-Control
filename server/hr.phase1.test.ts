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

describe("HR & Payroll Phase 1: Employee Master & Assignments", () => {
  it("blocks basic users without HR permissions", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.hr.summary()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.hr.employees()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows HR managers and admins to query summary and employees", async () => {
    const caller = appRouter.createCaller(context("hr_payroll_manager"));
    const summary = await caller.hr.summary();
    const employees = await caller.hr.employees();

    expect(summary.totalEmployees).toBeGreaterThanOrEqual(3);
    expect(summary.monthlyPayrollBase).toBeGreaterThan(0);
    expect(employees.length).toBeGreaterThanOrEqual(3);
    expect(employees.some((row) => row.employee.status === "Active" && Number(row.employee.basicRate) > 0)).toBe(true);
  }, 15000);

  it("supports creating an employee and linking to project assignments", async () => {
    const caller = appRouter.createCaller(context("admin"));
    const randomCode = `EMP-TEST-${Date.now().toString().slice(-4)}`;

    await caller.hr.createEmployee({
      employeeCode: randomCode,
      fullName: "Suresh Sahu",
      fatherName: "K. R. Sahu",
      phone: "+91 99881 22334",
      email: "suresh.sahu@rdxinfra.example",
      employmentType: "Supervisor",
      joiningDate: "2026-04-10",
      status: "Active",
      payBasis: "Daily",
      basicRate: "950.00",
      overtimeRate: "140.00",
      bankName: "State Bank of India",
      accountLast4: "1104",
      ifscCode: "SBIN0004321",
      aadhaarLast4: "9901",
      remarks: "Bridge & Culvert site supervisor",
    });

    const employees = await caller.hr.employees({ search: randomCode });
    expect(employees.length).toBe(1);
    const createdId = employees[0]!.employee.id;

    await caller.hr.createAssignment({
      employeeId: createdId,
      projectId: 30001,
      roleOnSite: "Structure Site Supervisor",
      assignmentStart: "2026-04-10",
      status: "Active",
      remarks: "Assigned to Package CG16-201 structures",
    });

    const assignments = await caller.hr.assignments({ employeeId: createdId });
    expect(assignments.length).toBe(1);
    expect(assignments[0]!.assignment.roleOnSite).toBe("Structure Site Supervisor");
  }, 20000);
});
