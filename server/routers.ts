import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, hrProcedure, publicProcedure, protectedProcedure, roleProcedure, router } from "./_core/trpc";
import { COMMERCIAL_ROLES, isCommercialRole } from "@shared/roles";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { importHrEmployees, importWorkbook, WorkbookRows } from "./imports";
import { clearDemoProjectData } from "./clearDemo";
import { storagePut } from "./storage";
import { eq, like } from "drizzle-orm";
import { measurementEntries, boqItems, activities, roads } from "../drizzle/schema";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    profile: protectedProcedure.query(({ ctx }) => ({
      id: ctx.user.id,
      name: ctx.user.name,
      email: ctx.user.email,
      role: ctx.user.role,
    })),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // AUTHENTICATED USER APP LAUNCHER
  apps: router({
    mine: protectedProcedure.query(async ({ ctx }) => {
      await db.ensureDefaultUserApp(ctx.user.openId);
      return db.getUserApps(ctx.user.openId);
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(2).max(120),
        description: z.string().max(500).optional(),
        route: z.string().min(1).max(255),
        icon: z.string().max(40).default("layout-grid"),
        accent: z.string().max(30).default("amber"),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createUserApp({ ...input, ownerOpenId: ctx.user.openId });
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return db.deleteUserApp(input.id, ctx.user.openId);
    }),
  }),

  // ADMIN-ONLY TEAM & ROLE MANAGEMENT
  userManagement: router({
    list: adminProcedure.query(async () => {
      return db.getUsers();
    }),
    setRole: adminProcedure
      .input(z.object({
        id: z.number(),
        role: z.enum(["user", "admin", "project_manager", "qs_billing_engineer", "site_engineer", "qa_qc_engineer", "hr_payroll_manager", "site_coordinator"]),
      }))
      .mutation(async ({ input }) => {
        const target = await db.getUserById(input.id);
        if (!target) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User account not found" });
        }

        if (target.role === "admin" && input.role !== "admin" && (await db.getAdminCount()) <= 1) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "At least one administrator must remain assigned to the ERP.",
          });
        }

        return db.updateUserRole(input.id, input.role);
      }),
  }),

  // ADMIN-ONLY CENTRAL EDIT PANEL
  adminEdit: router({
    projects: adminProcedure.query(async () => db.getProjects()),
    roads: adminProcedure
      .input(z.object({ projectId: z.number().optional() }).nullish())
      .query(async ({ input }) => db.getRoads(input?.projectId)),
    boq: adminProcedure
      .input(z.object({ projectId: z.number().optional(), roadId: z.number().optional() }).nullish())
      .query(async ({ input }) => db.getBoqItems(input?.projectId, input?.roadId)),
    updateProject: adminProcedure
      .input(z.object({
        id: z.number(),
        projectName: z.string().min(2),
        package: z.string().optional().nullable(),
        clientDepartment: z.string().min(2),
        contractor: z.string().min(2),
        agreementStartDate: z.string().min(4),
        agreementEndDate: z.string().min(4),
        status: z.enum(["Not Started", "In Progress", "Completed", "On Hold"]),
        overallProgress: z.string(),
        remarks: z.string().optional().nullable(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateProject(id, data);
      }),
    updateRoad: adminProcedure
      .input(z.object({
        id: z.number(),
        roadName: z.string().min(2),
        roadLengthKm: z.string(),
        startRd: z.string().min(1),
        endRd: z.string().min(1),
        status: z.enum(["Not Started", "In Progress", "Completed", "On Hold"]),
        progress: z.string(),
        remarks: z.string().optional().nullable(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateRoad(id, data);
      }),
    updateBoq: adminProcedure
      .input(z.object({
        id: z.number(),
        chapter: z.string().min(1),
        description: z.string().min(2),
        unit: z.string().min(1),
        contractQuantity: z.string(),
        revisedQuantity: z.string().optional().nullable(),
        executedQuantity: z.string(),
        rate: z.string(),
        status: z.enum(["Active", "Closed", "Variation"]),
        remarks: z.string().optional().nullable(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateBoqItem(id, data);
      }),
    // Recalculate BOQ executed quantities from Approved e-MB entries
    // This is idempotent and fixes any discrepancies from import issues
    recalcBoqFromEmb: adminProcedure
      .mutation(async () => {
        const database = await db.getDb();
        if (!database) throw new Error("Database not connected");
        const { sql, sum } = await import("drizzle-orm");
        // Sum Approved e-MB quantities per BOQ item using Drizzle
        const sums = await database
          .select({
            boqItemId: measurementEntries.boqItemId,
            totalQty: sum(measurementEntries.calculatedQuantity),
          })
          .from(measurementEntries)
          .where(sql`${measurementEntries.status} = 'Approved' AND ${measurementEntries.boqItemId} IS NOT NULL`)
          .groupBy(measurementEntries.boqItemId);
        let updated = 0;
        for (const r of sums) {
          if (!r.boqItemId) continue;
          const boqRows = await database.select().from(boqItems).where(eq(boqItems.id, r.boqItemId)).limit(1);
          if (boqRows.length > 0) {
            const boq = boqRows[0];
            const execQty = parseFloat(String(r.totalQty || "0"));
            const contractQty = parseFloat(String(boq.contractQuantity || "0"));
            const newBal = Math.max(0, contractQty - execQty).toFixed(3);
            await database.update(boqItems).set({
              executedQuantity: execQty.toFixed(3),
              balanceQuantity: newBal,
            }).where(eq(boqItems.id, r.boqItemId));
            updated++;
          }
        }
        // Also update road progress (value-weighted BOQ %)
        const allBoq = await database.select().from(boqItems);
        const roadVals = new Map<number, { contract: number; exec: number }>();
        for (const b of allBoq) {
          const cq = parseFloat(String(b.contractQuantity || "0"));
          const eqty = parseFloat(String(b.executedQuantity || "0"));
          const rate = parseFloat(String(b.rate || "0"));
          if (cq <= 0 || rate <= 0 || !b.roadId) continue;
          const rid = b.roadId as number;
          if (!roadVals.has(rid)) roadVals.set(rid, { contract: 0, exec: 0 });
          const rv = roadVals.get(rid)!;
          rv.contract += cq * rate;
          rv.exec += Math.min(eqty, cq) * rate;
        }
        let roadsUpdated = 0;
        for (const [rid, rv] of Array.from(roadVals.entries())) {
          if (rv.contract <= 0) continue;
          const pct = Math.min(100, (rv.exec / rv.contract) * 100).toFixed(2);
          await database.update(roads).set({ progress: pct }).where(eq(roads.id, rid));
          roadsUpdated++;
        }
        return { updated, roadsUpdated, message: `Recalculated ${updated} BOQ items and ${roadsUpdated} road progress values.` };
      }),
    // Sync Activities from BOQ: mark activities Complete where BOQ items are 100% executed
    // Maps BOQ chapter -> activity phase, per road
    syncActivitiesFromBoq: adminProcedure
      .mutation(async () => {
        const database = await db.getDb();
        if (!database) throw new Error("Database not connected");
        const { sql } = await import("drizzle-orm");

        // Chapter -> Phase mapping
        const chapterToPhase: Record<string, string[]> = {
          "chapter 2": ["Pre-Construction"],
          "chapter 3": ["Earthwork"],
          "chapter 4": ["GSB", "WMM", "Shoulder"],
          "chapter 5": ["Bituminous Work"],
          "chapter 6": ["CC Pavement"],
          "chapter 7": ["Structures / CD Works"],
          "chapter 8": ["Drain & Protection"],
          "chapter 9": ["Road Furniture"],
          "chapter 10": ["Drain & Protection"],
          "chapter 11": ["QA/QC"],
          "chapter 12": ["Billing & QS"],
        };

        // Get BOQ completion by road + chapter (value-weighted for accurate progress %)
        const boqRows = await database.select().from(boqItems);
        // Group by roadId + chapter: sum contract value and executed value
        const groups = new Map<string, { contractVal: number; execVal: number; roadId: number; phases: string[] }>();
        for (const b of boqRows) {
          const contractQty = parseFloat(String(b.contractQuantity || "0"));
          const execQty = parseFloat(String(b.executedQuantity || "0"));
          const rate = parseFloat(String(b.rate || "0"));
          if (contractQty <= 0 || rate <= 0) continue;
          const chapterKey = String(b.chapter || "").toLowerCase();
          const phases = chapterToPhase[chapterKey] || [];
          if (phases.length === 0) continue;
          const key = `${b.roadId}|${chapterKey}`;
          if (!groups.has(key)) {
            groups.set(key, { contractVal: 0, execVal: 0, roadId: b.roadId as number, phases });
          }
          const g = groups.get(key)!;
          g.contractVal += contractQty * rate;
          g.execVal += Math.min(execQty, contractQty) * rate;
        }

        let updated = 0;
        const groupList = Array.from(groups.values());
        const { and } = await import("drizzle-orm");
        for (const g of groupList) {
          if (g.contractVal <= 0) continue;
          // Proportional progress: e.g. 300/500 cum = 60%
          const pct = Math.min(100, (g.execVal / g.contractVal) * 100);
          const pctStr = pct.toFixed(2);
          const status = pct >= 100 ? "Complete" : pct > 0 ? "In Progress" : "Not Started";
          for (const phase of g.phases) {
            const result = await database
              .update(activities)
              .set({ status: status as any, percentageComplete: pctStr })
              .where(
                and(
                  eq(activities.roadId, g.roadId),
                  eq(activities.phase, phase as any)
                )
              );
            const affected = (result as any)[0]?.affectedRows || 0;
            updated += affected;
          }
        }
        return { updated, message: `Synced ${updated} activities with proportional BOQ progress.` };
      }),
  }),

  // HR & PAYROLL PHASE 1: HR MASTER AND PROJECT/ROAD ASSIGNMENTS
  hr: router({
    summary: hrProcedure.query(() => db.getHrSummary()),
    departments: hrProcedure.query(() => db.getHrDepartments()),
    designations: hrProcedure.query(() => db.getHrDesignations()),
    projects: hrProcedure.query(() => db.getProjects()),
    roads: hrProcedure
      .input(z.object({ projectId: z.number().optional() }).nullish())
      .query(({ input }) => db.getRoads(input?.projectId)),
    employees: hrProcedure
      .input(z.object({ search: z.string().optional(), status: z.string().optional(), departmentId: z.number().optional(), projectId: z.number().optional() }).nullish())
      .query(({ input }) => db.getHrEmployees(input || undefined)),
    bulkImportEmployees: hrProcedure
      .input(z.object({ rows: z.array(z.record(z.string(), z.unknown())).max(2000) }))
      .mutation(({ input }) => importHrEmployees(input.rows)),
    assignments: hrProcedure
      .input(z.object({ employeeId: z.number().optional(), projectId: z.number().optional() }).nullish())
      .query(({ input }) => db.getHrAssignments(input?.employeeId, input?.projectId)),
    createDepartment: hrProcedure
      .input(z.object({ code: z.string().min(2).max(40), name: z.string().min(2).max(120), description: z.string().optional().nullable() }))
      .mutation(({ input }) => db.createHrDepartment(input)),
    createDesignation: hrProcedure
      .input(z.object({ code: z.string().min(2).max(40), name: z.string().min(2).max(120), grade: z.string().optional().nullable(), description: z.string().optional().nullable() }))
      .mutation(({ input }) => db.createHrDesignation(input)),
    createEmployee: hrProcedure
      .input(z.object({
        employeeCode: z.string().min(2).max(60),
        fullName: z.string().min(2).max(180),
        fatherName: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        email: z.string().email().optional().or(z.literal("")),
        dateOfBirth: z.string().optional().nullable(),
        gender: z.enum(["Male", "Female", "Other"]).optional().nullable(),
        aadhaarLast4: z.string().regex(/^$|^\d{4}$/).optional().nullable(),
        panReference: z.string().max(20).optional().nullable(),
        address: z.string().optional().nullable(),
        emergencyContactName: z.string().optional().nullable(),
        emergencyContactPhone: z.string().optional().nullable(),
        departmentId: z.number().optional().nullable(),
        designationId: z.number().optional().nullable(),
        employmentType: z.enum(["Staff", "Site Engineer", "Supervisor", "Operator", "Skilled Labour", "Unskilled Labour", "Contract", "Consultant"]),
        joiningDate: z.string().min(4),
        exitDate: z.string().optional().nullable(),
        status: z.enum(["Active", "On Leave", "Inactive", "Exited"]),
        payBasis: z.enum(["Monthly", "Daily", "Hourly"]),
        basicRate: z.string(),
        overtimeRate: z.string(),
        bankName: z.string().optional().nullable(),
        accountLast4: z.string().regex(/^$|^\d{4}$/).optional().nullable(),
        ifscCode: z.string().max(20).optional().nullable(),
        photoUrl: z.string().optional().nullable(),
        documentReferences: z.string().optional().nullable(),
        remarks: z.string().optional().nullable(),
      }))
      .mutation(({ input }) => db.createHrEmployee({ ...input, email: input.email || null })),
    updateEmployee: hrProcedure
      .input(z.object({
        id: z.number(),
        employeeCode: z.string().min(2).max(60),
        fullName: z.string().min(2).max(180),
        fatherName: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        email: z.string().email().optional().or(z.literal("")),
        dateOfBirth: z.string().optional().nullable(),
        gender: z.enum(["Male", "Female", "Other"]).optional().nullable(),
        aadhaarLast4: z.string().regex(/^$|^\d{4}$/).optional().nullable(),
        panReference: z.string().max(20).optional().nullable(),
        address: z.string().optional().nullable(),
        emergencyContactName: z.string().optional().nullable(),
        emergencyContactPhone: z.string().optional().nullable(),
        departmentId: z.number().optional().nullable(),
        designationId: z.number().optional().nullable(),
        employmentType: z.enum(["Staff", "Site Engineer", "Supervisor", "Operator", "Skilled Labour", "Unskilled Labour", "Contract", "Consultant"]),
        joiningDate: z.string().min(4),
        exitDate: z.string().optional().nullable(),
        status: z.enum(["Active", "On Leave", "Inactive", "Exited"]),
        payBasis: z.enum(["Monthly", "Daily", "Hourly"]),
        basicRate: z.string(),
        overtimeRate: z.string(),
        bankName: z.string().optional().nullable(),
        accountLast4: z.string().regex(/^$|^\d{4}$/).optional().nullable(),
        ifscCode: z.string().max(20).optional().nullable(),
        photoUrl: z.string().optional().nullable(),
        documentReferences: z.string().optional().nullable(),
        remarks: z.string().optional().nullable(),
      }))
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return db.updateHrEmployee(id, { ...data, email: data.email || null });
      }),
    createAssignment: hrProcedure
      .input(z.object({ employeeId: z.number(), projectId: z.number(), roadId: z.number().optional().nullable(), roleOnSite: z.string().optional().nullable(), assignmentStart: z.string().min(4), assignmentEnd: z.string().optional().nullable(), status: z.enum(["Active", "Completed", "Cancelled"]), remarks: z.string().optional().nullable() }))
      .mutation(({ input }) => db.createHrAssignment(input)),
    updateAssignment: hrProcedure
      .input(z.object({ id: z.number(), roadId: z.number().optional().nullable(), roleOnSite: z.string().optional().nullable(), assignmentStart: z.string().min(4), assignmentEnd: z.string().optional().nullable(), status: z.enum(["Active", "Completed", "Cancelled"]), remarks: z.string().optional().nullable() }))
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return db.updateHrAssignment(id, data);
      }),

    // PHASE 2: DAILY ATTENDANCE, MUSTER ROLL & LEAVE
    attendanceList: hrProcedure
      .input(z.object({ date: z.string().optional(), employeeId: z.number().optional(), projectId: z.number().optional(), roadId: z.number().optional() }).nullish())
      .query(({ input }) => db.getHrAttendanceList(input || undefined)),
    markAttendance: hrProcedure
      .input(z.object({
        employeeId: z.number(),
        attendanceDate: z.string().min(4),
        projectId: z.number().optional().nullable(),
        roadId: z.number().optional().nullable(),
        status: z.enum(["Present", "Absent", "Half Day", "Weekly Off", "Holiday", "On Leave"]),
        inTime: z.string().optional().nullable(),
        outTime: z.string().optional().nullable(),
        overtimeHours: z.string().default("0.00"),
        remarks: z.string().optional().nullable(),
      }))
      .mutation(({ input, ctx }) => db.upsertHrAttendance({ ...input, markedBy: ctx.user?.id })),
    leaveRequests: hrProcedure
      .input(z.object({ employeeId: z.number().optional(), status: z.string().optional() }).nullish())
      .query(({ input }) => db.getHrLeaveRequests(input || undefined)),
    createLeaveRequest: hrProcedure
      .input(z.object({
        employeeId: z.number(),
        leaveType: z.enum(["Casual", "Sick", "Earned", "Unpaid", "Compensatory", "Other"]),
        fromDate: z.string().min(4),
        toDate: z.string().min(4),
        totalDays: z.string().default("1.00"),
        reason: z.string().optional().nullable(),
      }))
      .mutation(({ input }) => db.createHrLeaveRequest(input)),
    updateLeaveStatus: hrProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["Approved", "Rejected", "Cancelled"]),
        remarks: z.string().optional().nullable(),
      }))
      .mutation(({ input, ctx }) => db.updateHrLeaveStatus(input.id, input.status, ctx.user?.id, input.remarks || undefined)),

    // PHASE 2: MONTHLY SALARY / PAYROLL DRAFT
    payrollRuns: hrProcedure.query(() => db.getHrPayrollRuns()),
    payrollLines: hrProcedure
      .input(z.object({ payrollRunId: z.number() }))
      .query(({ input }) => db.getHrPayrollLines(input.payrollRunId)),
    generateMonthlyPayroll: hrProcedure
      .input(z.object({
        payrollMonth: z.string().regex(/^\d{4}-\d{2}$/),
        remarks: z.string().optional().nullable(),
      }))
      .mutation(({ input, ctx }) => db.computeMonthlyPayrollDraft({ payrollMonth: input.payrollMonth, userId: ctx.user?.id, remarks: input.remarks || undefined })),
    approvePayrollRun: hrProcedure
      .input(z.object({ payrollRunId: z.number() }))
      .mutation(({ input, ctx }) => db.approveHrPayrollRun(input.payrollRunId, ctx.user?.id)),

    // PHASE 3: SALARY ADVANCE / DEDUCTIONS LEDGER & PAYSLIP
    adjustments: hrProcedure
      .input(z.object({ payrollMonth: z.string().optional(), employeeId: z.number().optional(), status: z.string().optional() }).nullish())
      .query(({ input }) => db.getHrPayrollAdjustments(input || undefined)),
    createAdjustment: hrProcedure
      .input(z.object({
        employeeId: z.number(),
        payrollMonth: z.string().regex(/^\d{4}-\d{2}$/),
        adjustmentType: z.enum(["Advance", "Loan Recovery", "Allowance", "Bonus", "Fine", "Other"]),
        title: z.string().min(2).max(160),
        amount: z.string().min(1),
        recoveryInstallment: z.string().default("0.00"),
        referenceNo: z.string().optional().nullable(),
        remarks: z.string().optional().nullable(),
        status: z.enum(["Draft", "Approved", "Applied", "Cancelled"]).default("Approved"),
      }))
      .mutation(({ input, ctx }) => db.createHrPayrollAdjustment({ ...input, createdBy: ctx.user?.id })),
    updateAdjustmentStatus: hrProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["Approved", "Applied", "Cancelled"]),
      }))
      .mutation(({ input, ctx }) => db.updateHrPayrollAdjustmentStatus(input.id, input.status, ctx.user?.id)),
    payslip: hrProcedure
      .input(z.object({
        payrollRunId: z.number(),
        employeeId: z.number(),
      }))
      .query(({ input }) => db.getEmployeePayslip(input)),

    // PHASE 4: BANK PAYOUT BATCHES, MUSTER MATRIX & LABOUR GROUP SETTLEMENTS
    payoutBatches: hrProcedure
      .input(z.object({ payrollRunId: z.number().optional(), status: z.string().optional() }).nullish())
      .query(({ input }) => db.getHrPayoutBatches(input || undefined)),
    payoutLines: hrProcedure
      .input(z.object({ payoutBatchId: z.number() }))
      .query(({ input }) => db.getHrPayoutLines(input.payoutBatchId)),
    generatePayoutBatch: hrProcedure
      .input(z.object({
        payrollRunId: z.number(),
        remarks: z.string().optional().nullable(),
      }))
      .mutation(({ input, ctx }) => db.generateHrPayoutBatch({ payrollRunId: input.payrollRunId, userId: ctx.user?.id, remarks: input.remarks || undefined })),
    updatePayoutBatchStatus: hrProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["Exported", "Submitted", "Paid", "Cancelled"]),
      }))
      .mutation(({ input }) => db.updateHrPayoutBatchStatus(input.id, input.status)),
    musterMatrix: hrProcedure
      .input(z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/),
        roadId: z.number().optional().nullable(),
      }))
      .query(({ input }) => db.getHrMusterMatrix({ month: input.month, roadId: input.roadId || undefined })),
    groupSettlements: hrProcedure
      .input(z.object({ projectId: z.number().optional(), roadId: z.number().optional(), status: z.string().optional() }).nullish())
      .query(({ input }) => db.getHrGroupSettlements(input || undefined)),
    createGroupSettlement: hrProcedure
      .input(z.object({
        projectId: z.number(),
        roadId: z.number().optional().nullable(),
        groupName: z.string().min(2).max(160),
        contractorName: z.string().optional().nullable(),
        periodFrom: z.string().min(4),
        periodTo: z.string().min(4),
        labourCount: z.number().default(0),
        manDays: z.string().default("0.00"),
        ratePerDay: z.string().default("0.00"),
        grossAmount: z.string().default("0.00"),
        advanceDeduction: z.string().default("0.00"),
        netAmount: z.string().default("0.00"),
        remarks: z.string().optional().nullable(),
        status: z.enum(["Draft", "Submitted", "Approved", "Paid", "Rejected"]).default("Draft"),
      }))
      .mutation(({ input, ctx }) => db.createHrGroupSettlement({ ...input, createdBy: ctx.user?.id })),
    updateGroupSettlementStatus: hrProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["Approved", "Paid", "Rejected"]),
      }))
      .mutation(({ input, ctx }) => db.updateHrGroupSettlementStatus(input.id, input.status, ctx.user?.id)),
  }),

  // 10. DASHBOARD ROUTER
  dashboard: router({
    getStats: publicProcedure
      .input(z.object({ projectId: z.number().optional() }).nullish())
      .query(async ({ input }) => {
        return db.getDashboardStats(input?.projectId);
      }),
  }),

  // 1. PROJECTS ROUTER
  projects: router({
    list: publicProcedure.query(async () => {
      return db.getProjects();
    }),
    create: publicProcedure
      .input(z.object({
        projectId: z.string(),
        projectName: z.string(),
        package: z.string().optional(),
        clientDepartment: z.string(),
        contractor: z.string(),
        agreementStartDate: z.string(),
        agreementEndDate: z.string(),
        status: z.enum(["Not Started", "In Progress", "Completed", "On Hold"]).default("In Progress"),
        overallProgress: z.string().default("0.00"),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createProject(input);
      }),
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["Not Started", "In Progress", "Completed", "On Hold"]).optional(),
        overallProgress: z.string().optional(),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateProject(id, data);
      }),
  }),

  // 2. ROADS ROUTER
  roads: router({
    list: publicProcedure
      .input(z.object({ projectId: z.number().optional() }).nullish())
      .query(async ({ input }) => {
        return db.getRoads(input?.projectId);
      }),
    create: publicProcedure
      .input(z.object({
        roadId: z.string(),
        projectId: z.number(),
        roadName: z.string(),
        roadLengthKm: z.string(),
        startRd: z.string(),
        endRd: z.string(),
        status: z.enum(["Not Started", "In Progress", "Completed", "On Hold"]).default("In Progress"),
        progress: z.string().default("0.00"),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createRoad(input);
      }),
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        progress: z.string().optional(),
        status: z.enum(["Not Started", "In Progress", "Completed", "On Hold"]).optional(),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateRoad(id, data);
      }),
  }),

  // 3. ACTIVITIES ROUTER
  activities: router({
    list: publicProcedure
      .input(z.object({
        roadId: z.number().optional(),
        phase: z.string().optional(),
        status: z.string().optional(),
        projectId: z.number().optional()
      }).nullish())
      .query(async ({ input }) => {
        return db.getActivities(input || undefined);
      }),
    create: publicProcedure
      .input(z.object({
        taskId: z.string(),
        projectId: z.number(),
        roadId: z.number(),
        phase: z.enum([
          "Pre-Construction",
          "Earthwork",
          "GSB",
          "WMM",
          "Bituminous Work",
          "Structures / CD Works",
          "Drain & Protection",
          "Shoulder",
          "Road Furniture",
          "QA/QC",
          "Billing & QS",
          "Hindrance",
          "Completion"
        ]),
        activityName: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        percentageComplete: z.string().default("0.00"),
        status: z.enum(["Not Started", "In Progress", "Complete", "On Hold", "Overdue"]).default("Not Started"),
        priority: z.enum(["Low", "Medium", "High", "Critical"]).default("Medium"),
        assignedTo: z.string().optional(),
        predecessorActivity: z.string().optional(),
        dependencyType: z.string().default("FS"),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createActivity(input);
      }),
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        percentageComplete: z.string().optional(),
        status: z.enum(["Not Started", "In Progress", "Complete", "On Hold", "Overdue"]).optional(),
        priority: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
        assignedTo: z.string().optional(),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateActivity(id, data);
      }),
  }),

  // 4. DAILY PROGRESS ROUTER
  dailyProgress: router({
    list: publicProcedure
      .input(z.object({
        roadId: z.number().optional(),
        date: z.string().optional(),
        sectionType: z.enum(["Highway Works", "Concrete Works", "Material", "Machine"]).optional(),
        projectId: z.number().optional(),
      }).nullish())
      .query(async ({ input }) => {
        return db.getDailyProgressList(input || undefined);
      }),
    byDate: publicProcedure
      .input(z.object({
        date: z.string(),
        roadId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return db.getDailyProgressByDate(input.date, input.roadId);
      }),
    create: publicProcedure
      .input(z.object({
        clientDraftId: z.string().max(64).optional(),
        date: z.string(),
        projectId: z.number(),
        roadId: z.number(),
        activityId: z.number().optional(),
        sectionType: z.enum(["Highway Works", "Concrete Works", "Material", "Machine"]).default("Highway Works"),
        chainageFrom: z.string().optional(),
        chainageTo: z.string().optional(),
        boqItemId: z.number().optional(),
        materialId: z.number().optional(),
        materialConsumedQuantity: z.string().optional(),
        materialOpeningBalance: z.string().optional(),
        materialReceivedQuantity: z.string().optional(),
        materialChallanNo: z.string().max(100).optional(),
        materialSupplier: z.string().max(255).optional(),
        materialWastageQuantity: z.string().optional(),
        materialStorageLocation: z.string().max(255).optional(),
        machineryAssetId: z.number().optional(),
        machineWorkingHours: z.string().optional(),
        machineIdleHours: z.string().optional(),
        machineIdleReason: z.string().max(255).optional(),
        hourMeterOpening: z.string().optional(),
        hourMeterClosing: z.string().optional(),
        fuelConsumed: z.string().optional(),
        machineStatus: z.enum(["Working", "Breakdown", "Maintenance", "Idle"]).optional(),
        machineOperator: z.string().max(150).optional(),
        machineLocation: z.string().max(255).optional(),
        plannedQuantity: z.string().default("0.00"),
        actualQuantity: z.string().default("0.00"),
        billableQuantity: z.string().optional(),
        billingStatus: z.enum(["Pending", "Ready for Bill", "Included in Bill"]).default("Pending"),
        unit: z.string(),
        percentageComplete: z.string(),
        manpower: z.string().optional(),
        machinery: z.string().optional(),
        weather: z.string().default("Clear / Sunny"),
        hindrance: z.string().optional(),
        remarks: z.string().optional(),
        sitePhotos: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createDailyProgress(input);
      }),
    uploadPhoto: publicProcedure
      .input(z.object({
        clientDraftId: z.string().max(64),
        fileName: z.string().max(255),
        fileBase64: z.string().max(8_000_000),
        sectionType: z.enum(["Highway Works", "Concrete Works", "Material", "Machine"]),
        caption: z.string().max(255).optional(),
        chainage: z.string().max(50).optional(),
      }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.fileBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
        if (buffer.length > 6 * 1024 * 1024) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Photo is too large. Please upload a photo under 6 MB." });
        }

        const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const { url } = await storagePut(
          `dpr/${input.clientDraftId}/${Date.now()}_${safeName}`,
          buffer,
          "image/jpeg",
        );

        const photo = {
          id: `dpr_photo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          url,
          caption: input.caption || `${input.sectionType} site photo`,
          sectionType: input.sectionType,
          chainage: input.chainage || "",
          uploadedAt: new Date().toISOString(),
        };

        return {
          success: true,
          photo: await db.appendDailyProgressPhoto(input.clientDraftId, photo),
        };
      }),
  }),

  // 4D. ELECTRONIC MEASUREMENT BOOK (e-MB) ROUTER
  measurements: router({
    list: roleProcedure(COMMERCIAL_ROLES)
      .input(z.object({ roadId: z.number().optional(), boqItemId: z.number().optional(), projectId: z.number().optional() }).nullish())
      .query(async ({ input }) => {
        return db.getMeasurements(input?.roadId, input?.boqItemId, input?.projectId);
      }),
    create: roleProcedure(COMMERCIAL_ROLES)
      .input(z.object({
        mbNo: z.string(),
        mbDate: z.string(),
        projectId: z.number(),
        roadId: z.number(),
        boqItemId: z.number(),
        activityId: z.number().optional(),
        locationFrom: z.string(),
        locationTo: z.string(),
        length: z.string().default("0.000"),
        width: z.string().default("0.000"),
        depth: z.string().default("0.000"),
        calculatedQuantity: z.string().default("0.000"),
        unit: z.string(),
        rate: z.string().default("0.00"),
        status: z.enum(["Draft", "Submitted", "Checked", "Approved", "Rejected"]).default("Draft"),
        submittedBy: z.string().optional(),
        checkedBy: z.string().optional(),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createMeasurement(input);
      }),
    update: roleProcedure(COMMERCIAL_ROLES)
      .input(z.object({
        id: z.number(),
        length: z.string().optional(),
        width: z.string().optional(),
        depth: z.string().optional(),
        calculatedQuantity: z.string().optional(),
        rate: z.string().optional(),
        status: z.enum(["Draft", "Submitted", "Checked", "Approved", "Rejected"]).optional(),
        checkedBy: z.string().optional(),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateMeasurement(id, data);
      }),
    // DISABLED: Temporary cleanup was for bad 105-row import. Now disabled to protect correct data.
    // The 126-item correct import uses RA-01-* and RA-02-* mbNo patterns.
    cleanupWrongRa01: roleProcedure(["admin"])
      .mutation(async () => {
        throw new Error("Cleanup disabled: correct 126-item RA data is now in production. This endpoint is permanently disabled to prevent accidental deletion.");
      }),
  }),

  // 4E. MATERIAL WASTAGE & VARIANCE AUDIT ROUTER
  materialVariances: router({
    list: publicProcedure
      .input(z.object({ roadId: z.number().optional(), projectId: z.number().optional() }).nullish())
      .query(async ({ input }) => {
        return db.getMaterialVariances(input?.roadId, input?.projectId);
      }),
    compute: publicProcedure
      .input(z.object({
        projectId: z.number(),
        roadId: z.number(),
        boqItemId: z.number(),
        materialId: z.number(),
        periodFrom: z.string(),
        periodTo: z.string(),
        theoreticalFactor: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.computeMaterialVarianceReport(input);
      }),
  }),

  // 5. BILLING & QS ROUTER
  billing: router({
    list: roleProcedure(COMMERCIAL_ROLES)
      .input(z.object({ roadId: z.number().optional(), projectId: z.number().optional() }).nullish())
      .query(async ({ input }) => {
        return db.getBills(input?.roadId, input?.projectId);
      }),
    getLines: roleProcedure(COMMERCIAL_ROLES)
      .input(z.object({ billId: z.number() }))
      .query(async ({ input }) => {
        return db.getRaBillLines(input.billId);
      }),
    getBillExportData: roleProcedure(COMMERCIAL_ROLES)
      .input(z.object({
        projectId: z.number(),
        roadIds: z.array(z.number()).optional(),
        periodFrom: z.string(),
        periodTo: z.string(),
      }))
      .query(async ({ input }) => {
        return db.getRaBillExportData(input);
      }),
    generateFromBoq: roleProcedure(COMMERCIAL_ROLES)
      .input(z.object({
        billId: z.string(),
        projectId: z.number(),
        roadId: z.number(),
        billType: z.string(),
        periodFrom: z.string(),
        periodTo: z.string(),
        gstPercent: z.number().optional(),
        retentionPercent: z.number().optional(),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.generateRaBillFromBoq(input);
      }),
    create: roleProcedure(COMMERCIAL_ROLES)
      .input(z.object({
        billId: z.string(),
        projectId: z.number(),
        roadId: z.number(),
        billType: z.string(),
        measurementStatus: z.enum(["Pending", "In Progress", "Completed"]).default("Pending"),
        quantityCalculationStatus: z.enum(["Pending", "In Progress", "Completed"]).default("Pending"),
        abstractStatus: z.enum(["Pending", "In Progress", "Completed"]).default("Pending"),
        billPrepared: z.enum(["No", "Yes"]).default("No"),
        submissionDate: z.string().optional(),
        verificationStatus: z.enum([
          "Measurement",
          "Quantity Calculation",
          "Abstract",
          "Bill Prepared",
          "Submitted",
          "Under Verification",
          "Passed",
          "Payment Received"
        ]).default("Measurement"),
        passedAmount: z.string().default("0.00"),
        paymentStatus: z.enum(["Unpaid", "Partial", "Received"]).default("Unpaid"),
        paymentDate: z.string().optional(),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createBill(input);
      }),
    update: roleProcedure(COMMERCIAL_ROLES)
      .input(z.object({
        id: z.number(),
        measurementStatus: z.enum(["Pending", "In Progress", "Completed"]).optional(),
        quantityCalculationStatus: z.enum(["Pending", "In Progress", "Completed"]).optional(),
        abstractStatus: z.enum(["Pending", "In Progress", "Completed"]).optional(),
        billPrepared: z.enum(["No", "Yes"]).optional(),
        submissionDate: z.string().optional(),
        verificationStatus: z.enum([
          "Measurement",
          "Quantity Calculation",
          "Abstract",
          "Bill Prepared",
          "Submitted",
          "Under Verification",
          "Passed",
          "Payment Received"
        ]).optional(),
        passedAmount: z.string().optional(),
        paymentStatus: z.enum(["Unpaid", "Partial", "Received"]).optional(),
        paymentDate: z.string().optional(),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateBill(id, data);
      }),
  }),

  // 6. HINDRANCE ROUTER
  hindrances: router({
    list: publicProcedure
      .input(z.object({ roadId: z.number().optional(), projectId: z.number().optional() }).nullish())
      .query(async ({ input }) => {
        return db.getHindrances(input?.roadId, input?.projectId);
      }),
    create: publicProcedure
      .input(z.object({
        hindranceId: z.string().optional(),
        projectId: z.number(),
        roadId: z.number(),
        rdLocation: z.string(),
        category: z.enum([
          "Electric Pole",
          "Land Issue",
          "Utility",
          "Forest/Tree",
          "Local Obstruction",
          "Department Decision",
          "Drawing Issue",
          "Material",
          "Other"
        ]),
        description: z.string(),
        dateRaised: z.string(),
        affectedActivity: z.string(),
        affectedLength: z.string().optional(),
        responsiblePersonDepartment: z.string(),
        letterNumber: z.string().optional(),
        status: z.enum(["Open", "Under Review", "Resolved"]).default("Open"),
        dueDate: z.string().optional(),
        remarks: z.string().optional(),
        supportingPhotosDocuments: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createHindrance(input);
      }),
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["Open", "Under Review", "Resolved"]).optional(),
        resolutionDate: z.string().optional(),
        remarks: z.string().optional(),
        responsiblePersonDepartment: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateHindrance(id, data);
      }),
  }),

  // 7. QA/QC ROUTER
  qaQc: router({
    list: publicProcedure
      .input(z.object({ roadId: z.number().optional(), projectId: z.number().optional() }).nullish())
      .query(async ({ input }) => {
        return db.getQaQcTests(input?.roadId, input?.projectId);
      }),
    create: publicProcedure
      .input(z.object({
        testId: z.string(),
        date: z.string(),
        projectId: z.number(),
        roadId: z.number(),
        activity: z.string(),
        testType: z.enum([
          "FDT",
          "Proctor",
          "CBR",
          "Gradation",
          "Atterberg Limits",
          "Aggregate Crushing Value",
          "Flakiness & Elongation",
          "Bitumen Test",
          "Core Test",
          "Marshall",
          "Other"
        ]),
        locationRd: z.string(),
        requiredValue: z.string(),
        actualValue: z.string(),
        unit: z.string(),
        result: z.enum(["Passed", "Failed", "Pending"]).default("Pending"),
        testReportReference: z.string().optional(),
        remarks: z.string().optional(),
        correctiveActionStatus: z.enum(["None", "Required", "In Progress", "Rectified"]).optional(),
        correctiveActionNotes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createQaQcTest(input);
      }),
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        result: z.enum(["Passed", "Failed", "Pending"]).optional(),
        correctiveActionStatus: z.enum(["None", "Required", "In Progress", "Rectified"]).optional(),
        correctiveActionNotes: z.string().optional(),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateQaQcTest(id, data);
      }),
  }),

  // 8. MATERIALS ROUTER
  materials: router({
    list: publicProcedure
      .input(z.object({ roadId: z.number().optional(), projectId: z.number().optional() }).nullish())
      .query(async ({ input }) => {
        return db.getMaterials(input?.roadId, input?.projectId);
      }),
    create: publicProcedure
      .input(z.object({
        entryId: z.string(),
        date: z.string(),
        projectId: z.number(),
        roadId: z.number(),
        material: z.string(),
        receivedQuantity: z.string(),
        usedQuantity: z.string(),
        unit: z.string(),
        supplier: z.string().optional(),
        challanReference: z.string().optional(),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createMaterial({
          ...input,
          balanceQuantity: "0.00" // Calculated by db.createMaterial
        });
      }),
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        receivedQuantity: z.string().optional(),
        usedQuantity: z.string().optional(),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateMaterial(id, data);
      }),
  }),

  // 9. DOCUMENTS ROUTER
  documents: router({
    list: publicProcedure
      .input(z.object({ category: z.string().optional(), projectId: z.number().optional() }).nullish())
      .query(async ({ input }) => {
        return db.getDocuments(input?.category, input?.projectId);
      }),
    create: publicProcedure
      .input(z.object({
        projectId: z.number(),
        roadId: z.number().optional(),
        category: z.enum([
          "Agreement",
          "BOQ",
          "Drawings",
          "DPR",
          "Survey",
          "QA/QC",
          "Measurement",
          "RA Bills",
          "Hindrance",
          "Correspondence",
          "Site Photos",
          "Completion"
        ]),
        title: z.string(),
        documentNumber: z.string().optional(),
        fileUrl: z.string(),
        fileSize: z.string().optional(),
        uploadedBy: z.string().optional(),
        date: z.string(),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createDocument(input);
      }),
  }),

  // NOTIFICATIONS ROUTER
  notifications: router({
    list: publicProcedure
      .input(z.object({ unreadOnly: z.boolean().optional() }).nullish())
      .query(async ({ input }) => {
        return db.getNotifications(input?.unreadOnly);
      }),
    markAsRead: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.markNotificationRead(input.id);
      }),
  }),

  // BOQ MASTER & CONTROL ROUTER
  boq: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number().optional(), roadId: z.number().optional() }).nullish())
      .query(async ({ input, ctx }) => {
        const rows = await db.getBoqItems(input?.projectId, input?.roadId);
        if (isCommercialRole(ctx.user.role)) return rows;
        // Hide commercial rate fields from site/QA/HR roles (DPR only needs codes & quantities)
        return rows.map(({ boq, road }) => ({
          boq: { ...boq, rate: "0.00", contractAmount: null },
          road,
        }));
      }),
    create: roleProcedure(COMMERCIAL_ROLES)
      .input(z.object({
        itemCode: z.string().min(2).max(60),
        projectId: z.number(),
        roadId: z.number().optional(),
        chapter: z.string(),
        description: z.string(),
        unit: z.string(),
        contractQuantity: z.string().default("0.000"),
        revisedQuantity: z.string().optional(),
        executedQuantity: z.string().default("0.000"),
        rate: z.string().default("0.00"),
        status: z.enum(["Active", "Closed", "Variation"]).default("Active"),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createBoqItem(input);
      }),
    update: roleProcedure(COMMERCIAL_ROLES)
      .input(z.object({
        id: z.number(),
        contractQuantity: z.string().optional(),
        revisedQuantity: z.string().optional(),
        executedQuantity: z.string().optional(),
        rate: z.string().optional(),
        status: z.enum(["Active", "Closed", "Variation"]).optional(),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateBoqItem(id, data);
      }),
  }),

  // MATERIAL INVENTORY ROUTER
  inventory: router({
    list: publicProcedure
      .input(z.object({ projectId: z.number().optional() }).nullish())
      .query(async ({ input }) => {
        return db.getMaterialInventoryList(input?.projectId);
      }),
    create: publicProcedure
      .input(z.object({
        materialCode: z.string().min(2).max(60),
        projectId: z.number(),
        materialName: z.string(),
        unit: z.string(),
        minStock: z.string().default("0.000"),
        maxStock: z.string().default("0.000"),
        openingStock: z.string().default("0.000"),
        averageRate: z.string().default("0.00"),
        supplier: z.string().optional(),
        storageLocation: z.string().optional(),
        approvalStatus: z.enum(["Pending", "Approved", "Rejected", "Blocked"]).default("Approved"),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createMaterialInventoryItem(input);
      }),
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        minStock: z.string().optional(),
        maxStock: z.string().optional(),
        averageRate: z.string().optional(),
        storageLocation: z.string().optional(),
        approvalStatus: z.enum(["Pending", "Approved", "Rejected", "Blocked"]).optional(),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateMaterialInventoryItem(id, data);
      }),
  }),

  // GRN (GOODS RECEIPT NOTES) ROUTER
  grn: router({
    list: publicProcedure
      .input(z.object({ projectId: z.number().optional() }).nullish())
      .query(async ({ input }) => {
        return db.getGrnList(input?.projectId);
      }),
    create: publicProcedure
      .input(z.object({
        grnNo: z.string(),
        grnDate: z.string(),
        projectId: z.number(),
        materialId: z.number(),
        supplier: z.string(),
        challanNo: z.string().optional(),
        receivedQuantity: z.string(),
        acceptedQuantity: z.string().optional(),
        rejectedQuantity: z.string().optional(),
        unit: z.string(),
        rate: z.string().default("0.00"),
        invoiceReference: z.string().optional(),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createGrn(input);
      }),
  }),

  // MATERIAL ISSUES & DPR CONSUMPTION ROUTER
  materialIssues: router({
    list: publicProcedure
      .input(z.object({ roadId: z.number().optional(), projectId: z.number().optional() }).nullish())
      .query(async ({ input }) => {
        return db.getMaterialIssuesList(input?.roadId, input?.projectId);
      }),
    create: publicProcedure
      .input(z.object({
        issueNo: z.string(),
        issueDate: z.string(),
        projectId: z.number(),
        roadId: z.number(),
        materialId: z.number(),
        boqItemId: z.number().optional(),
        quantity: z.string(),
        unit: z.string(),
        purpose: z.string(),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createMaterialIssue(input);
      }),
  }),
  // 10A. SUBCONTRACTORS & WORK ORDERS ROUTER
  subcontractors: router({
    list: publicProcedure
      .input(z.object({ projectId: z.number().optional() }).nullish())
      .query(async ({ input }) => {
        return db.getSubcontractors(input?.projectId);
      }),
    create: publicProcedure
      .input(z.object({
        subcontractorCode: z.string(),
        projectId: z.number(),
        name: z.string(),
        workCategory: z.string(),
        contactPerson: z.string().optional(),
        phone: z.string().optional(),
        gstin: z.string().optional(),
        status: z.enum(["Active", "On Hold", "Closed"]).default("Active"),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createSubcontractor(input);
      }),
    workOrdersList: publicProcedure
      .input(z.object({ roadId: z.number().optional(), subcontractorId: z.number().optional(), projectId: z.number().optional() }).nullish())
      .query(async ({ input }) => {
        return db.getWorkOrders(input?.roadId, input?.subcontractorId, input?.projectId);
      }),
    createWorkOrder: publicProcedure
      .input(z.object({
        workOrderNo: z.string(),
        projectId: z.number(),
        roadId: z.number(),
        subcontractorId: z.number(),
        scope: z.string(),
        unit: z.string(),
        awardedQuantity: z.string().default("0.000"),
        executedQuantity: z.string().default("0.000"),
        rate: z.string().default("0.00"),
        paidAmount: z.string().default("0.00"),
        retentionAmount: z.string().default("0.00"),
        startDate: z.string(),
        targetDate: z.string(),
        status: z.enum(["Draft", "Issued", "In Progress", "Completed", "Closed", "On Hold"]).default("Issued"),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createWorkOrder(input);
      }),
    updateWorkOrder: publicProcedure
      .input(z.object({
        id: z.number(),
        scope: z.string().optional(),
        unit: z.string().optional(),
        awardedQuantity: z.string().optional(),
        rate: z.string().optional(),
        executedQuantity: z.string().optional(),
        paidAmount: z.string().optional(),
        retentionAmount: z.string().optional(),
        startDate: z.string().optional(),
        targetDate: z.string().optional(),
        status: z.enum(["Draft", "Issued", "In Progress", "Completed", "Closed", "On Hold"]).optional(),
        remarks: z.string().optional(),
        termsOverride: z.string().nullable().optional(),
        docLang: z.enum(["hi", "en"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateWorkOrder(id, data);
      }),
    deleteWorkOrder: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteWorkOrder(input.id);
      }),
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        subcontractorCode: z.string().optional(),
        workCategory: z.string().optional(),
        contactPerson: z.string().optional(),
        phone: z.string().optional(),
        gstin: z.string().optional(),
        address: z.string().optional(),
        status: z.enum(["Active", "On Hold", "Closed"]).optional(),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateSubcontractor(id, data);
      }),
    // WO BOQ items (multiple rate items per WO — Hindi WO document)
    workOrderItemsList: publicProcedure
      .input(z.object({ workOrderId: z.number() }))
      .query(async ({ input }) => {
        return db.getWorkOrderItems(input.workOrderId);
      }),
    addWorkOrderItem: publicProcedure
      .input(z.object({
        workOrderId: z.number(),
        srNo: z.number().default(1),
        description: z.string(),
        unit: z.string(),
        rate: z.string().default("0.00"),
        sortOrder: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        return db.createWorkOrderItem(input);
      }),
    updateWorkOrderItem: publicProcedure
      .input(z.object({
        id: z.number(),
        srNo: z.number().optional(),
        description: z.string().optional(),
        unit: z.string().optional(),
        rate: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateWorkOrderItem(id, data);
      }),
    deleteWorkOrderItem: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteWorkOrderItem(input.id);
      }),
    // Full Hindi WO document data
    workOrderDocument: publicProcedure
      .input(z.object({ workOrderId: z.number() }))
      .query(async ({ input }) => {
        return db.getWorkOrderDocument(input.workOrderId);
      }),
  }),

  // 10B. PLANT, MACHINERY & FUEL LOGBOOK ROUTER
  machinery: router({
    assetsList: publicProcedure
      .input(z.object({ projectId: z.number().optional() }).nullish())
      .query(async ({ input }) => {
        return db.getMachineryAssets(input?.projectId);
      }),
    createAsset: publicProcedure
      .input(z.object({
        assetNo: z.string(),
        projectId: z.number(),
        assetType: z.string(),
        makeModel: z.string().optional(),
        registrationNo: z.string().optional(),
        currentRoadId: z.number().optional(),
        openingHourMeter: z.string().default("0.00"),
        expectedFuelPerHour: z.string().default("12.00"),
        status: z.enum(["Available", "Deployed", "Maintenance", "Standby", "Retired"]).default("Available"),
        operator: z.string().optional(),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createMachineryAsset(input);
      }),
    logsList: publicProcedure
      .input(z.object({ roadId: z.number().optional(), assetId: z.number().optional(), projectId: z.number().optional() }).nullish())
      .query(async ({ input }) => {
        return db.getMachineryLogs(input?.roadId, input?.assetId, input?.projectId);
      }),
    createLog: publicProcedure
      .input(z.object({
        logNo: z.string(),
        logDate: z.string(),
        projectId: z.number(),
        roadId: z.number(),
        assetId: z.number(),
        openingHourMeter: z.string().default("0.00"),
        closingHourMeter: z.string().default("0.00"),
        fuelIssued: z.string().default("0.00"),
        fuelRate: z.string().default("92.00"),
        operator: z.string().optional(),
        workDescription: z.string().optional(),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createMachineryLog(input);
      }),
    complianceList: publicProcedure
      .input(z.object({ projectId: z.number().optional() }).nullish())
      .query(async ({ input }) => {
        return db.getMachineryCompliance(input?.projectId);
      }),
    createCompliance: publicProcedure
      .input(z.object({
        assetId: z.number(),
        projectId: z.number(),
        docType: z.enum(["Registration", "PUC", "Road Tax", "Insurance", "Fitness", "Permit", "Service", "Other"]),
        docNumber: z.string().optional(),
        issueDate: z.string().optional(),
        expiryDate: z.string(),
        amount: z.string().optional(),
        vendor: z.string().optional(),
        meterReading: z.string().optional(),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createMachineryCompliance(input);
      }),
    deleteCompliance: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteMachineryCompliance(input.id);
      }),
    generateComplianceAlerts: publicProcedure
      .input(z.object({ projectId: z.number().optional() }).nullish())
      .mutation(async ({ input }) => {
        return db.generateComplianceAlerts(input?.projectId);
      }),
  }),

  // 10C. DIGITAL SIGN-OFF WORKFLOW ROUTER
  signoffs: router({
    list: publicProcedure
      .input(z.object({ entityType: z.string().optional(), entityId: z.string().optional() }).nullish())
      .query(async ({ input }) => {
        return db.getApprovalSignoffs(input?.entityType, input?.entityId);
      }),
    request: publicProcedure
      .input(z.object({
        entityType: z.string(),
        entityId: z.string(),
        stage: z.string(),
        requestedBy: z.string(),
        assignedRole: z.string(),
        comments: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.requestSignoff(input);
      }),
    complete: publicProcedure
      .input(z.object({
        id: z.number(),
        signedBy: z.string(),
        status: z.enum(["Approved", "Rejected"]),
        comments: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...params } = input;
        return db.completeSignoff(id, params);
    }),
  }),
  // ADMIN-ONLY EXCEL WORKBOOK IMPORT
  imports: router({
    execute: adminProcedure
      .input(z.object({ sheets: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))) }))
      .mutation(async ({ input }) => {
        return importWorkbook(input.sheets as WorkbookRows);
      }),
    clearDemo: adminProcedure.mutation(async () => {
      return clearDemoProjectData();
    }),
  }),

  // 11. ROAD STRUCTURES / CD & PROTECTION REGISTER ROUTER
  structures: router({
    list: publicProcedure
      .input(z.object({
        roadId: z.number().optional(),
        structureType: z.enum([
          "Slab Culvert",
          "HPC",
          "Box Culvert",
          "Minor Bridge",
          "Causeway",
          "Retaining Wall",
          "Toe Wall",
          "Drain",
          "Other"
        ]).optional(),
        status: z.enum(["Not Started", "In Progress", "Completed", "On Hold"]).optional(),
        projectId: z.number().optional(),
      }).nullish())
      .query(async ({ input }) => {
        return db.getRoadStructures(input || undefined);
      }),

    summary: publicProcedure.query(async () => {
      return db.getRoadStructuresSummary();
    }),

    create: publicProcedure
      .input(z.object({
        structureNo: z.string(),
        projectId: z.number(),
        roadId: z.number(),
        structureType: z.enum([
          "Slab Culvert",
          "HPC",
          "Box Culvert",
          "Minor Bridge",
          "Causeway",
          "Retaining Wall",
          "Toe Wall",
          "Drain",
          "Other"
        ]),
        chainageFrom: z.string(),
        chainageTo: z.string().optional(),
        locationDescription: z.string().optional(),
        count: z.string().default("1.00"),
        length: z.string().optional(),
        width: z.string().optional(),
        height: z.string().optional(),
        quantity: z.string().default("0.000"),
        unit: z.string().default("Nos"),
        status: z.enum(["Not Started", "In Progress", "Completed", "On Hold"]).default("Not Started"),
        billableQuantity: z.string().default("0.000"),
        photos: z.string().optional(),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createRoadStructure(input);
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["Not Started", "In Progress", "Completed", "On Hold"]).optional(),
        billableQuantity: z.string().optional(),
        quantity: z.string().optional(),
        photos: z.string().optional(),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateRoadStructure(id, data);
      }),

    uploadPhoto: publicProcedure
      .input(z.object({
        structureId: z.number(),
        fileName: z.string(),
        fileBase64: z.string(),
        caption: z.string().optional(),
        chainage: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.fileBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
        const relKey = `structures/str_${input.structureId}/${Date.now()}_${input.fileName}`;
        const { url } = await storagePut(relKey, buffer, "image/jpeg");

        const rows = await db.getRoadStructures();
        const current = rows.find(r => r.structure.id === input.structureId);
        if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Structure not found" });

        let photosList: any[] = [];
        try {
          photosList = current.structure.photos ? JSON.parse(current.structure.photos) : [];
        } catch {
          photosList = [];
        }

        const newPhoto = {
          id: `photo_${Date.now()}`,
          url,
          caption: input.caption || current.structure.structureType,
          chainage: input.chainage || current.structure.chainageFrom,
          uploadedAt: new Date().toISOString(),
        };

        photosList.unshift(newPhoto);
        await db.updateRoadStructure(input.structureId, {
          photos: JSON.stringify(photosList),
        });

        return { success: true, photo: newPhoto };
      }),
  }),

  // RATE ANALYSIS (QS Module) — SOR-based rate build-up
  rateAnalysis: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number().optional() }).nullish())
      .query(async ({ input }) => {
        return db.getRateAnalyses(input?.projectId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getRateAnalysisWithComponents(input.id);
      }),

    create: roleProcedure(COMMERCIAL_ROLES)
      .input(z.object({
        projectId: z.number(),
        analysisNo: z.string().min(1),
        description: z.string().optional(),
        unit: z.string().default("Cum"),
        sorRef: z.string().optional(),
        leadKm: z.string().default("0.00"),
        overheadPct: z.string().default("0.00"),
        profitPct: z.string().default("0.00"),
        status: z.enum(["Draft", "Approved"]).default("Draft"),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createRateAnalysis(input);
      }),

    update: roleProcedure(COMMERCIAL_ROLES)
      .input(z.object({
        id: z.number(),
        analysisNo: z.string().optional(),
        description: z.string().optional(),
        unit: z.string().optional(),
        sorRef: z.string().optional(),
        leadKm: z.string().optional(),
        overheadPct: z.string().optional(),
        profitPct: z.string().optional(),
        status: z.enum(["Draft", "Approved"]).optional(),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateRateAnalysis(id, data);
      }),

    delete: roleProcedure(COMMERCIAL_ROLES)
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteRateAnalysis(input.id);
      }),

    addComponent: roleProcedure(COMMERCIAL_ROLES)
      .input(z.object({
        analysisId: z.number(),
        category: z.enum(["Material", "Labour", "Machinery"]),
        description: z.string().min(1),
        unit: z.string().default("Nos"),
        coefficient: z.string().default("0.0000"),
        rate: z.string().default("0.00"),
        sortOrder: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        return db.addRateAnalysisComponent(input);
      }),

    updateComponent: roleProcedure(COMMERCIAL_ROLES)
      .input(z.object({
        id: z.number(),
        category: z.enum(["Material", "Labour", "Machinery"]).optional(),
        description: z.string().optional(),
        unit: z.string().optional(),
        coefficient: z.string().optional(),
        rate: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateRateAnalysisComponent(id, data);
      }),

    deleteComponent: roleProcedure(COMMERCIAL_ROLES)
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteRateAnalysisComponent(input.id);
      }),

    seedTemplates: roleProcedure(COMMERCIAL_ROLES)
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ input }) => {
        return db.seedRateAnalysisTemplates(input.projectId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
