import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { hrEmployees, hrPayrollAdjustments } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function seedPhase3() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(connection);

  console.log("Seeding HR Phase 3 Payroll Adjustments and Advances...");
  const employees = await db.select().from(hrEmployees);

  if (employees.length >= 2) {
    const existing = await db.select().from(hrPayrollAdjustments).limit(1);
    if (!existing.length) {
      await db.insert(hrPayrollAdjustments).values([
        {
          employeeId: employees[0]!.id,
          payrollMonth: "2026-04",
          adjustmentType: "Allowance",
          title: "Site Mobilization & Travel Allowance",
          amount: "3500.00",
          status: "Approved",
          remarks: "Monthly field conveyance",
        },
        {
          employeeId: employees[1]!.id,
          payrollMonth: "2026-04",
          adjustmentType: "Advance",
          title: "Festival Salary Advance",
          amount: "5000.00",
          status: "Approved",
          remarks: "Deducted in April 2026 payroll",
        },
        {
          employeeId: employees[2] ? employees[2].id : employees[0]!.id,
          payrollMonth: "2026-04",
          adjustmentType: "Advance",
          title: "Emergency Medical Advance",
          amount: "2000.00",
          status: "Approved",
          remarks: "Approved by Admin",
        },
      ]);
    }
  }

  console.log("HR Phase 3 seed completed successfully.");
  await connection.end();
}

seedPhase3().catch((err) => {
  console.error("Failed to seed HR Phase 3:", err);
  process.exit(1);
});
