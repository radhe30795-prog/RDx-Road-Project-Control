import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { hrEmployees, hrAttendance, hrLeaveRequests, hrPayrollRuns, hrPayrollLines, projects, roads } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

async function seedPhase2() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(connection);

  console.log("Seeding HR Phase 2 Attendance and Leave records...");
  const employees = await db.select().from(hrEmployees);
  const cgProject = await db.select().from(projects).where(eq(projects.projectId, "CG16-201")).limit(1);
  const allRoads = await db.select().from(roads).where(eq(roads.projectId, cgProject[0]?.id || 30001));

  const dates = ["2026-04-01", "2026-04-02", "2026-04-03", "2026-04-04", "2026-04-05", "2026-04-06"];

  for (const emp of employees) {
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i]!;
      const existing = await db.select().from(hrAttendance).where(and(eq(hrAttendance.employeeId, emp.id), eq(hrAttendance.attendanceDate, date))).limit(1);
      if (!existing.length) {
        let status: "Present" | "Absent" | "Half Day" | "Weekly Off" = "Present";
        let ot = "0.00";

        if (i === 3 && emp.payBasis === "Daily") {
          status = "Half Day";
          ot = "2.00";
        } else if (i === 4 && emp.employmentType === "Operator") {
          status = "Present";
          ot = "3.50";
        } else if (i === 5) {
          status = "Weekly Off";
        }

        await db.insert(hrAttendance).values({
          employeeId: emp.id,
          attendanceDate: date,
          projectId: cgProject[0]?.id || 30001,
          roadId: allRoads[0]?.id || null,
          status,
          inTime: "08:30",
          outTime: "17:30",
          overtimeHours: ot,
          remarks: "Regular site shift",
        });
      }
    }
  }

  // Sample Leave Requests
  if (employees.length >= 2) {
    const existingLeave = await db.select().from(hrLeaveRequests).limit(1);
    if (!existingLeave.length) {
      await db.insert(hrLeaveRequests).values([
        {
          employeeId: employees[1]!.id,
          leaveType: "Casual",
          fromDate: "2026-04-15",
          toDate: "2026-04-16",
          totalDays: "2.00",
          reason: "Family function in Bilaspur",
          status: "Approved",
          remarks: "Approved by Project Manager",
        },
        {
          employeeId: employees[0]!.id,
          leaveType: "Earned",
          fromDate: "2026-04-24",
          toDate: "2026-04-26",
          totalDays: "3.00",
          reason: "Head office quarterly review meeting",
          status: "Pending",
          remarks: null,
        },
      ]);
    }
  }

  console.log("HR Phase 2 seed completed successfully.");
  await connection.end();
}

seedPhase2().catch((err) => {
  console.error("Failed to seed HR Phase 2:", err);
  process.exit(1);
});
