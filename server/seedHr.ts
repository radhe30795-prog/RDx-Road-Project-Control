import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { hrDepartments, hrDesignations, hrEmployees, hrAssignments, projects, roads } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function seedHr() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(connection);

  console.log("Seeding HR departments...");
  const depts = [
    { code: "ENGG", name: "Highway & Civil Engineering", description: "Site execution, levels, cross-sections and quality" },
    { code: "QS-BILL", name: "Quantity Survey & Billing", description: "e-MB, abstract, contractor bills and reconciliation" },
    { code: "PLANT", name: "Plant & Machinery", description: "Batching plant, paver, roller, tipper maintenance and fuel" },
    { code: "ADMIN", name: "Site Administration & HR", description: "Timekeeping, store, camp management and compliance" },
  ];
  for (const item of depts) {
    await db.insert(hrDepartments).values(item).onDuplicateKeyUpdate({ set: { name: item.name } });
  }

  console.log("Seeding HR designations...");
  const desigs = [
    { code: "PM", name: "Project Manager", grade: "E-4" },
    { code: "SR-SE", name: "Senior Site Engineer", grade: "E-3" },
    { code: "QS-ENG", name: "Billing / QS Engineer", grade: "E-2" },
    { code: "SUPV", name: "Highway Supervisor", grade: "S-1" },
    { code: "PAVER-OP", name: "Paver / Plant Operator", grade: "T-1" },
  ];
  for (const item of desigs) {
    await db.insert(hrDesignations).values(item).onDuplicateKeyUpdate({ set: { name: item.name } });
  }

  const allDepts = await db.select().from(hrDepartments);
  const allDesigs = await db.select().from(hrDesignations);
  const deptMap = Object.fromEntries(allDepts.map((d) => [d.code, d.id]));
  const desigMap = Object.fromEntries(allDesigs.map((d) => [d.code, d.id]));

  const cgProject = await db.select().from(projects).where(eq(projects.projectId, "CG16-201")).limit(1);
  const allRoads = await db.select().from(roads).where(eq(roads.projectId, cgProject[0]?.id || 30001));

  const sampleEmployees = [
    {
      employeeCode: "RDX-EMP-001",
      fullName: "Rakesh Kumar Sharma",
      fatherName: "B. L. Sharma",
      phone: "+91 98261 11223",
      email: "rakesh.sharma@rdxinfra.example",
      departmentId: deptMap["ENGG"],
      designationId: desigMap["PM"],
      employmentType: "Staff" as const,
      joiningDate: "2026-03-30",
      status: "Active" as const,
      payBasis: "Monthly" as const,
      basicRate: "85000.00",
      overtimeRate: "0.00",
      bankName: "State Bank of India",
      accountLast4: "4412",
      ifscCode: "SBIN0001234",
      panReference: "ABCPS1234F",
      aadhaarLast4: "5512",
      remarks: "Overall project manager for Package CG16-201",
    },
    {
      employeeCode: "RDX-EMP-002",
      fullName: "Amit Patel",
      fatherName: "H. R. Patel",
      phone: "+91 94062 88441",
      email: "amit.patel@rdxinfra.example",
      departmentId: deptMap["QS-BILL"],
      designationId: desigMap["QS-ENG"],
      employmentType: "Site Engineer" as const,
      joiningDate: "2026-04-01",
      status: "Active" as const,
      payBasis: "Monthly" as const,
      basicRate: "52000.00",
      overtimeRate: "250.00",
      bankName: "HDFC Bank",
      accountLast4: "9831",
      ifscCode: "HDFC0002233",
      panReference: "AZXPP9988D",
      aadhaarLast4: "8821",
      remarks: "e-MB & RA Bill verification engineer",
    },
    {
      employeeCode: "RDX-EMP-003",
      fullName: "Dinesh Yadav",
      fatherName: "Ram Lal Yadav",
      phone: "+91 97551 77332",
      email: null,
      departmentId: deptMap["PLANT"],
      designationId: desigMap["PAVER-OP"],
      employmentType: "Operator" as const,
      joiningDate: "2026-04-05",
      status: "Active" as const,
      payBasis: "Daily" as const,
      basicRate: "1200.00",
      overtimeRate: "180.00",
      bankName: "Punjab National Bank",
      accountLast4: "3319",
      ifscCode: "PUNB0123456",
      panReference: "BKDPY4433C",
      aadhaarLast4: "3341",
      remarks: "Vogele Sensor Paver Lead Operator",
    },
  ];

  for (const emp of sampleEmployees) {
    await db.insert(hrEmployees).values(emp).onDuplicateKeyUpdate({ set: { fullName: emp.fullName, basicRate: emp.basicRate } });
  }

  if (cgProject.length) {
    const seeded = await db.select().from(hrEmployees);
    for (const emp of seeded) {
      const existing = await db.select().from(hrAssignments).where(eq(hrAssignments.employeeId, emp.id)).limit(1);
      if (!existing.length) {
        await db.insert(hrAssignments).values({
          employeeId: emp.id,
          projectId: cgProject[0]!.id,
          roadId: allRoads[0]?.id || null,
          roleOnSite: emp.employmentType,
          assignmentStart: "2026-04-01",
          status: "Active",
          remarks: "Initial package mobilization deployment",
        });
      }
    }
  }

  console.log("HR seed completed successfully.");
  await connection.end();
}

seedHr().catch((err) => {
  console.error("Failed to seed HR:", err);
  process.exit(1);
});
