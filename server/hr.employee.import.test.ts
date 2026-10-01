import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { hrEmployees } from "../drizzle/schema";

function context(role: "admin" | "hr_payroll_manager" | "user") {
  return {
    user: {
      id: role === "admin" ? 1 : role === "hr_payroll_manager" ? 2 : 99,
      openId: `employee-import-${role}`,
      email: `${role}@rdxinfra.example`,
      name: role,
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

describe("HR bulk employee Excel import", () => {
  it("allows HR Payroll Manager to import valid rows and reports duplicate rows", async () => {
    const caller = appRouter.createCaller(context("hr_payroll_manager"));
    const departments = await caller.hr.departments();
    const designations = await caller.hr.designations();
    const employeeCode = `BULK-TEST-${Date.now()}`;
    const base = {
      employeeCode,
      fullName: "Bulk Import Test Employee",
      fatherName: "Test Guardian",
      phone: "9999999999",
      email: "bulk.test@example.com",
      departmentCode: departments[0]?.code,
      designationCode: designations[0]?.code,
      employmentType: "Site Engineer",
      joiningDate: "2026-09-30",
      status: "Active",
      payBasis: "Monthly",
      basicRate: "25000",
      overtimeRate: "150",
      bankName: "State Bank of India",
      accountLast4: "1234",
      ifscCode: "SBIN0001234",
    };

    const result = await caller.hr.bulkImportEmployees({ rows: [base, base] });
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.issues[0]?.message).toContain("Duplicate employeeCode");

    const db = await getDb();
    if (db) await db.delete(hrEmployees).where(eq(hrEmployees.employeeCode, employeeCode));
  }, 20000);

  it("returns row-level validation issues without inserting invalid rows", async () => {
    const caller = appRouter.createCaller(context("admin"));
    const result = await caller.hr.bulkImportEmployees({
      rows: [{ employeeCode: "BAD-ROW", fullName: "Invalid Employee", joiningDate: "2026-09-30", email: "not-an-email", accountLast4: "12" }],
    });
    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.issues[0]?.message).toMatch(/email|accountLast4/i);
  }, 15000);

  it("blocks basic users from employee bulk import", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.hr.bulkImportEmployees({ rows: [] })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
