import { eq, desc, and, sql, or, lt, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  projects, InsertProject,
  roads, InsertRoad,
  activities, InsertActivity,
  boqItems, InsertBoqItem,
  materialInventory, InsertMaterialInventory,
  grnEntries, InsertGrnEntry,
  materialIssues, InsertMaterialIssue,
  measurementEntries, InsertMeasurementEntry,
  materialVariances, InsertMaterialVariance,
  raBillLines, InsertRaBillLine,
  subcontractors, InsertSubcontractor,
  workOrders, InsertWorkOrder,
  machineryAssets, InsertMachineryAsset,
  machineryLogs, InsertMachineryLog,
  machineryCompliance, InsertMachineryCompliance,
  approvalSignoffs, InsertApprovalSignoff,
  dailyProgress, InsertDailyProgress,
  roadStructures, InsertRoadStructure,
  billing, InsertBilling,
  hindrances, InsertHindrance,
  qaQcTests, InsertQaQcTest,
  materials, InsertMaterial,
  documents, InsertDocument,
  notifications, InsertNotification,
  userApps, InsertUserApp,
  hrDepartments, InsertHrDepartment,
  hrDesignations, InsertHrDesignation,
  hrEmployees, InsertHrEmployee,
  hrAssignments, InsertHrAssignment,
  hrAttendance, InsertHrAttendance,
  hrLeaveRequests, InsertHrLeaveRequest,
  hrPayrollRuns, InsertHrPayrollRun,
  hrPayrollLines, InsertHrPayrollLine,
  hrPayrollAdjustments, InsertHrPayrollAdjustment
  ,hrPayoutBatches, InsertHrPayoutBatch,
  hrPayoutLines, InsertHrPayoutLine,
  hrGroupSettlements, InsertHrGroupSettlement,
  rateAnalyses, InsertRateAnalysis,
  rateAnalysisComponents, InsertRateAnalysisComponent
} from "../drizzle/schema";
import { ENV } from './_core/env';
import mysql from "mysql2/promise";

let _db: ReturnType<typeof drizzle> | null = null;

function parseDatabaseUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port) || 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: decodeURIComponent(u.pathname.replace(/^\//, "")),
  };
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      if (process.env.DB_SSL === "true") {
        // TLS connection pool (e.g. TiDB Cloud Serverless free tier).
        // A pool (not a single connection) survives dropped / idle-closed
        // connections: the driver opens a fresh connection automatically,
        // so logins and queries keep working after Render restarts or
        // TiDB closes an idle socket.
        const pool = mysql.createPool({
          ...parseDatabaseUrl(process.env.DATABASE_URL),
          ssl: { rejectUnauthorized: true },
          waitForConnections: true,
          connectionLimit: 5,
          maxIdle: 5,
          idleTimeout: 60000,
          enableKeepAlive: true,
          keepAliveInitialDelay: 10000,
        });
        // NOTE: mysql2/promise ka Pool type aur drizzle ke expected Pool type
        // typings me alag hain (dual-package), runtime object ek jaisa hai.
        _db = drizzle(pool as any);
      } else {
        _db = drizzle(process.env.DATABASE_URL);
      }
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertGoogleUser(user: {
  openId: string;
  name: string | null;
  email: string;
  isInitialAdmin?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const existing = await getUserByOpenId(user.openId);
  const googleUsers = existing
    ? []
    : await db.select({ id: users.id }).from(users).where(eq(users.loginMethod, "google")).limit(1);
  const role = existing?.role ?? (user.isInitialAdmin || googleUsers.length === 0 ? "admin" : "user");

  await db.insert(users).values({
    openId: user.openId,
    name: user.name,
    email: user.email,
    loginMethod: "google",
    role,
    lastSignedIn: new Date(),
  }).onDuplicateKeyUpdate({
    set: {
      name: user.name,
      email: user.email,
      loginMethod: "google",
      lastSignedIn: new Date(),
    },
  });

  return getUserByOpenId(user.openId);
}

export async function getUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    openId: users.openId,
    name: users.name,
    email: users.email,
    role: users.role,
    loginMethod: users.loginMethod,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
  }).from(users).orderBy(desc(users.createdAt));
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getAdminCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.role, "admin"));
  return Number(result[0]?.count ?? 0);
}

export async function updateUserRole(id: number, role: "user" | "admin" | "project_manager" | "qs_billing_engineer" | "site_engineer" | "qa_qc_engineer" | "hr_payroll_manager" | "site_coordinator") {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, id));
}

// ----------------- USER APP LAUNCHER -----------------
export async function getUserApps(ownerOpenId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userApps)
    .where(eq(userApps.ownerOpenId, ownerOpenId))
    .orderBy(desc(userApps.updatedAt), desc(userApps.id));
}

export async function ensureDefaultUserApp(ownerOpenId: string) {
  const db = await getDb();
  if (!db) return;

  const existing = await db.select({ id: userApps.id })
    .from(userApps)
    .where(and(eq(userApps.ownerOpenId, ownerOpenId), eq(userApps.route, "/")))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(userApps).values({
      ownerOpenId,
      name: "RDx Road Project Control",
      description: "14 Roads construction, DPR, billing, QA/QC and site control suite.",
      route: "/",
      icon: "road",
      accent: "amber",
    });
  }
}

export async function createUserApp(data: InsertUserApp) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.insert(userApps).values(data);
}

export async function deleteUserApp(id: number, ownerOpenId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.delete(userApps).where(and(eq(userApps.id, id), eq(userApps.ownerOpenId, ownerOpenId)));
}

// ----------------- AUTOMATION HELPERS -----------------

/**
 * Automation 3: Check and update overdue activities whose endDate has passed and % < 100
 */
export async function runActivityOverdueCheck() {
  const db = await getDb();
  if (!db) return;
  const todayStr = new Date().toISOString().split("T")[0];

  // Activities whose endDate < today and percentageComplete < 100 and not completed
  await db.update(activities)
    .set({ status: "Overdue" })
    .where(
      and(
        lt(activities.endDate, todayStr),
        sql`CAST(${activities.percentageComplete} AS DECIMAL(5,2)) < 100.00`,
        sql`${activities.status} != 'Complete'`
      )
    );
}

/**
 * Automation 5 & 6: Recalculate days pending for open hindrances and create reminder notifications if overdue
 */
export async function runHindrancePendingUpdate() {
  const db = await getDb();
  if (!db) return;
  const allHindrances = await db.select().from(hindrances);
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  for (const h of allHindrances) {
    const raisedDate = new Date(h.dateRaised);
    const endDate = h.resolutionDate ? new Date(h.resolutionDate) : now;
    const diffTime = Math.max(0, endDate.getTime() - raisedDate.getTime());
    const daysPending = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (daysPending !== h.daysPending) {
      await db.update(hindrances).set({ daysPending }).where(eq(hindrances.id, h.id));
    }

    // Automation 6: Overdue reminder check
    if (h.status !== "Resolved" && h.dueDate && h.dueDate < todayStr) {
      const existing = await db.select().from(notifications).where(
        and(
          eq(notifications.type, "HINDRANCE_OVERDUE"),
          eq(notifications.entityId, h.hindranceId)
        )
      ).limit(1);

      if (existing.length === 0) {
        await db.insert(notifications).values({
          type: "HINDRANCE_OVERDUE",
          title: `Overdue Hindrance Alert: ${h.hindranceId}`,
          message: `Hindrance ${h.hindranceId} (${h.category} at ${h.rdLocation}) is past due date (${h.dueDate}). ${daysPending} days pending.`,
          severity: "warning",
          targetRole: "project_manager",
          entityType: "HINDRANCE",
          entityId: h.hindranceId,
        });
      }
    }
  }
}

// ----------------- PROJECTS -----------------
export async function getProjects() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects).orderBy(projects.id);
}

export async function createProject(data: InsertProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.insert(projects).values(data);
}

export async function updateProject(id: number, data: Partial<InsertProject>) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.update(projects).set(data).where(eq(projects.id, id));
}

// ----------------- ROADS -----------------
export async function getRoads(projectId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (projectId) {
    return db.select().from(roads).where(eq(roads.projectId, projectId)).orderBy(roads.id);
  }
  return db.select().from(roads).orderBy(roads.id);
}

export async function createRoad(data: InsertRoad) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.insert(roads).values(data);
}

export async function updateRoad(id: number, data: Partial<InsertRoad>) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.update(roads).set(data).where(eq(roads.id, id));
}

// ----------------- ACTIVITIES -----------------
export async function getActivities(params?: { roadId?: number; phase?: string; status?: string; projectId?: number }) {
  const db = await getDb();
  if (!db) return [];
  await runActivityOverdueCheck();

  let query = db.select({
    activity: activities,
    road: roads,
  }).from(activities)
    .leftJoin(roads, eq(activities.roadId, roads.id))
    .orderBy(activities.id);

  const rows = await query;
  return rows.filter(({ activity }) => {
    if (params?.roadId && activity.roadId !== params.roadId) return false;
    if (params?.phase && activity.phase !== params.phase) return false;
    if (params?.status && activity.status !== params.status) return false;
    if (params?.projectId && (activity as any).projectId !== params.projectId) return false;
    return true;
  });
}

export async function createActivity(data: InsertActivity) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  // Automation 2: If % == 100, set Complete
  const pct = parseFloat(String(data.percentageComplete || "0"));
  let status = data.status || "Not Started";
  if (pct >= 100) {
    status = "Complete";
  }

  const res = await db.insert(activities).values({
    ...data,
    status
  });
  return res;
}

export async function updateActivity(id: number, data: Partial<InsertActivity>) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  let updatePayload = { ...data };
  if (data.percentageComplete !== undefined) {
    const pct = parseFloat(String(data.percentageComplete));
    if (pct >= 100) {
      updatePayload.status = "Complete";
    }
  }

  return db.update(activities).set(updatePayload).where(eq(activities.id, id));
}

// ----------------- DAILY PROGRESS -----------------
export async function getDailyProgressList(params?: { roadId?: number; date?: string; sectionType?: string; projectId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    dp: dailyProgress,
    road: roads,
    activity: activities,
    boq: boqItems,
    material: materialInventory,
    asset: machineryAssets,
  }).from(dailyProgress)
    .leftJoin(roads, eq(dailyProgress.roadId, roads.id))
    .leftJoin(activities, eq(dailyProgress.activityId, activities.id))
    .leftJoin(boqItems, eq(dailyProgress.boqItemId, boqItems.id))
    .leftJoin(materialInventory, eq(dailyProgress.materialId, materialInventory.id))
    .leftJoin(machineryAssets, eq(dailyProgress.machineryAssetId, machineryAssets.id))
    .orderBy(desc(dailyProgress.date), desc(dailyProgress.id));

  return rows.filter((r) => {
    if (params?.roadId && r.dp.roadId !== params.roadId) return false;
    if (params?.date && r.dp.date !== params.date) return false;
    if (params?.sectionType && r.dp.sectionType !== params.sectionType) return false;
    if (params?.projectId && r.dp.projectId !== params.projectId) return false;
    return true;
  });
}

export async function getDailyProgressByDate(date: string, roadId?: number) {
  const db = await getDb();
  if (!db) return { date, entries: [], summary: { totalEntries: 0, actualQuantityTotal: 0, billableQuantityTotal: 0, bySection: {} as Record<string, number> }, measurements: [], matchingBills: [] };

  const rows = await getDailyProgressList({ date, roadId });

  const mbRows = await db.select({
    mb: measurementEntries,
    boq: boqItems,
    road: roads,
  }).from(measurementEntries)
    .leftJoin(boqItems, eq(measurementEntries.boqItemId, boqItems.id))
    .leftJoin(roads, eq(measurementEntries.roadId, roads.id))
    .where(eq(measurementEntries.mbDate, date));

  const billRows = await db.select({
    bill: billing,
    road: roads,
  }).from(billing)
    .leftJoin(roads, eq(billing.roadId, roads.id));

  const activeBills = billRows.filter((b) => {
    if (roadId && b.bill.roadId !== roadId) return false;
    if (b.bill.periodFrom && b.bill.periodTo) {
      return date >= b.bill.periodFrom && date <= b.bill.periodTo;
    }
    return b.bill.submissionDate === date;
  });

  const summary = {
    totalEntries: rows.length,
    actualQuantityTotal: rows.reduce((acc, r) => acc + parseFloat(String(r.dp.actualQuantity || 0)), 0),
    billableQuantityTotal: rows.reduce((acc, r) => acc + parseFloat(String(r.dp.billableQuantity ?? r.dp.actualQuantity ?? 0)), 0),
    bySection: rows.reduce((acc, r) => {
      const sec = r.dp.sectionType || "Highway Works";
      acc[sec] = (acc[sec] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  return {
    date,
    entries: rows,
    measurements: mbRows,
    matchingBills: activeBills,
    summary,
  };
}

export async function createDailyProgress(data: InsertDailyProgress) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  // Idempotent offline sync check
  if (data.clientDraftId) {
    const existing = await db.select({ id: dailyProgress.id })
      .from(dailyProgress)
      .where(eq(dailyProgress.clientDraftId, data.clientDraftId))
      .limit(1);
    if (existing.length > 0) {
      return { insertId: existing[0].id, alreadySynced: true };
    }
  }

  // Insert daily progress
  const res = await db.insert(dailyProgress).values(data);

  // AUTOMATION 1 & 2: Update the related Activity progress
  if (data.activityId && data.percentageComplete !== undefined) {
    const pct = parseFloat(String(data.percentageComplete));
    const newStatus = pct >= 100 ? "Complete" : "In Progress";
    await db.update(activities).set({
      percentageComplete: String(pct),
      status: newStatus,
    }).where(eq(activities.id, data.activityId));
  }

  // Also update overall road progress dynamically based on activity averages
  if (data.roadId) {
    const roadActs = await db.select().from(activities).where(eq(activities.roadId, data.roadId));
    if (roadActs.length > 0) {
      const totalPct = roadActs.reduce((acc, a) => acc + parseFloat(String(a.percentageComplete || 0)), 0);
      const avg = (totalPct / roadActs.length).toFixed(2);
      await db.update(roads).set({ progress: avg }).where(eq(roads.id, data.roadId));
    }
  }

  // AUTOMATION: If DPR is linked to a BOQ Item, update executed quantity and balance
  if (data.boqItemId && data.actualQuantity) {
    const boqRows = await db.select().from(boqItems).where(eq(boqItems.id, data.boqItemId)).limit(1);
    if (boqRows.length > 0) {
      const boq = boqRows[0];
      const newExecuted = (parseFloat(String(boq.executedQuantity)) + parseFloat(String(data.actualQuantity))).toFixed(3);
      const contract = parseFloat(String(boq.contractQuantity));
      const newBalance = (contract - parseFloat(newExecuted)).toFixed(3);
      await db.update(boqItems).set({
        executedQuantity: newExecuted,
        balanceQuantity: newBalance,
      }).where(eq(boqItems.id, data.boqItemId));
    }
  }

  // AUTOMATION: If DPR has material consumed, record in Material Issues and deduct stock
  if (data.materialId && data.materialConsumedQuantity && parseFloat(String(data.materialConsumedQuantity)) > 0) {
    const consumed = parseFloat(String(data.materialConsumedQuantity));
    const [dprId] = await db.select({ id: dailyProgress.id }).from(dailyProgress).where(eq(dailyProgress.clientDraftId, data.clientDraftId || "")).limit(1);
    const issueNo = `ISSUE-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    await db.insert(materialIssues).values({
      issueNo,
      issueDate: data.date,
      projectId: data.projectId,
      roadId: data.roadId,
      materialId: data.materialId,
      dailyProgressId: dprId?.id,
      boqItemId: data.boqItemId || null,
      quantity: String(consumed),
      unit: data.unit,
      purpose: `DPR consumption on ${data.date}`,
      remarks: data.remarks || "Direct DPR execution issue",
    });

    const matRows = await db.select().from(materialInventory).where(eq(materialInventory.id, data.materialId)).limit(1);
    if (matRows.length > 0) {
      const mat = matRows[0];
      const newIssued = (parseFloat(String(mat.issuedQuantity)) + consumed).toFixed(3);
      const newBalance = (parseFloat(String(mat.balanceQuantity)) - consumed).toFixed(3);
      await db.update(materialInventory).set({
        issuedQuantity: newIssued,
        balanceQuantity: newBalance,
      }).where(eq(materialInventory.id, data.materialId));

      if (parseFloat(newBalance) <= parseFloat(String(mat.minStock))) {
        await db.insert(notifications).values({
          type: "MATERIAL_LOW_STOCK",
          title: `Low Stock Alert: ${mat.materialName}`,
          message: `Current stock of ${mat.materialName} is ${newBalance} ${mat.unit}, which is below minimum threshold ${mat.minStock} ${mat.unit}.`,
          severity: "warning",
          targetRole: "site_engineer",
          entityType: "MATERIAL",
          entityId: mat.materialCode,
        });
      }
    }
  }

  // AUTOMATION: Material Section — record site receipt as a GRN (stock increases via createGrn)
  if (data.sectionType === "Material" && data.materialId && parseFloat(String(data.materialReceivedQuantity || 0)) > 0) {
    const received = parseFloat(String(data.materialReceivedQuantity));
    const matRows = await db.select().from(materialInventory).where(eq(materialInventory.id, data.materialId)).limit(1);
    if (matRows.length > 0) {
      const mat = matRows[0];
      await createGrn({
        grnNo: `GRN-DPR-${data.date}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        grnDate: data.date,
        projectId: data.projectId,
        materialId: data.materialId,
        supplier: data.materialSupplier || "Site receipt (DPR)",
        challanNo: data.materialChallanNo || undefined,
        receivedQuantity: String(received),
        acceptedQuantity: String(received),
        unit: mat.unit,
        rate: "0.00",
        remarks: `DPR Material section entry on ${data.date}${data.materialStorageLocation ? ` — stored at ${data.materialStorageLocation}` : ""}`,
      });
    }
  }

  // AUTOMATION: Material Section — record wastage (deduct from balance, accumulate wastage)
  if (data.sectionType === "Material" && data.materialId && parseFloat(String(data.materialWastageQuantity || 0)) > 0) {
    const wastage = parseFloat(String(data.materialWastageQuantity));
    const matRows = await db.select().from(materialInventory).where(eq(materialInventory.id, data.materialId)).limit(1);
    if (matRows.length > 0) {
      const mat = matRows[0];
      await db.update(materialInventory).set({
        wastageQuantity: (parseFloat(String(mat.wastageQuantity)) + wastage).toFixed(3),
        balanceQuantity: (parseFloat(String(mat.balanceQuantity)) - wastage).toFixed(3),
      }).where(eq(materialInventory.id, data.materialId));
    }
  }

  // AUTOMATION: Machine Section — create machinery log and update asset hour meter / status
  if (data.sectionType === "Machine" && data.machineryAssetId) {
    const openH = parseFloat(String(data.hourMeterOpening || 0));
    const closeH = parseFloat(String(data.hourMeterClosing || 0));
    await createMachineryLog({
      logNo: `LOG-DPR-${data.date}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      logDate: data.date,
      projectId: data.projectId,
      roadId: data.roadId,
      assetId: data.machineryAssetId,
      openingHourMeter: String(openH),
      closingHourMeter: String(closeH),
      fuelIssued: String(parseFloat(String(data.fuelConsumed || 0))),
      operator: data.machineOperator || undefined,
      workDescription: [
        data.machineLocation ? `Deployed at ${data.machineLocation}` : "",
        data.machineIdleHours && parseFloat(String(data.machineIdleHours)) > 0
          ? `Idle ${data.machineIdleHours}h${data.machineIdleReason ? ` (${data.machineIdleReason})` : ""}`
          : "",
        data.remarks || "",
      ].filter(Boolean).join(" | ") || undefined,
      remarks: `DPR Machine section entry — status: ${data.machineStatus || "Working"}`,
    });
    // Breakdown / Maintenance overrides the "Deployed" status set by createMachineryLog
    if (data.machineStatus === "Breakdown" || data.machineStatus === "Maintenance") {
      await db.update(machineryAssets).set({
        status: "Maintenance",
        operator: data.machineOperator || undefined,
        updatedAt: new Date(),
      }).where(eq(machineryAssets.id, data.machineryAssetId));
    }
  }

  return res;
}

export async function appendDailyProgressPhoto(clientDraftId: string, photo: Record<string, unknown>) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const rows = await db.select({ id: dailyProgress.id, sitePhotos: dailyProgress.sitePhotos })
    .from(dailyProgress)
    .where(eq(dailyProgress.clientDraftId, clientDraftId))
    .limit(1);
  if (!rows[0]) throw new Error("DPR record not found for photo attachment");

  let photos: Record<string, unknown>[] = [];
  try {
    const parsed = rows[0].sitePhotos ? JSON.parse(rows[0].sitePhotos) : [];
    photos = Array.isArray(parsed) ? parsed : [];
  } catch {
    photos = [];
  }

  photos.unshift(photo);
  await db.update(dailyProgress)
    .set({ sitePhotos: JSON.stringify(photos) })
    .where(eq(dailyProgress.id, rows[0].id));

  return { id: rows[0].id, photos };
}

// ----------------- BOQ MASTER & EXECUTION -----------------
export async function getBoqItems(projectId?: number, roadId?: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    boq: boqItems,
    road: roads,
  }).from(boqItems)
    .leftJoin(roads, eq(boqItems.roadId, roads.id))
    .orderBy(boqItems.itemCode);

  return rows.filter((r) => {
    if (projectId && r.boq.projectId !== projectId) return false;
    if (roadId && r.boq.roadId !== roadId) return false;
    return true;
  });
}

export async function createBoqItem(data: InsertBoqItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const contractQty = parseFloat(String(data.contractQuantity || 0));
  const executedQty = parseFloat(String(data.executedQuantity || 0));
  const balanceQty = (contractQty - executedQty).toFixed(3);
  const rate = parseFloat(String(data.rate || 0));
  const contractAmount = (contractQty * rate).toFixed(2);

  return db.insert(boqItems).values({
    ...data,
    balanceQuantity: balanceQty,
    contractAmount,
  });
}

export async function updateBoqItem(id: number, data: Partial<InsertBoqItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const existing = await db.select().from(boqItems).where(eq(boqItems.id, id)).limit(1);
  if (!existing.length) throw new Error("BOQ item not found");
  const current = existing[0];

  const contractQty = data.contractQuantity !== undefined ? parseFloat(String(data.contractQuantity)) : parseFloat(String(current.contractQuantity));
  const executedQty = data.executedQuantity !== undefined ? parseFloat(String(data.executedQuantity)) : parseFloat(String(current.executedQuantity));
  const balanceQty = (contractQty - executedQty).toFixed(3);
  const rate = data.rate !== undefined ? parseFloat(String(data.rate)) : parseFloat(String(current.rate));
  const contractAmount = (contractQty * rate).toFixed(2);

  return db.update(boqItems).set({
    ...data,
    balanceQuantity: balanceQty,
    contractAmount,
  }).where(eq(boqItems.id, id));
}

// ----------------- MATERIAL INVENTORY MASTER -----------------
export async function getMaterialInventoryList(projectId?: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(materialInventory).orderBy(materialInventory.materialCode);
  if (projectId) return rows.filter((m) => m.projectId === projectId);
  return rows;
}

export async function createMaterialInventoryItem(data: InsertMaterialInventory) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const opening = parseFloat(String(data.openingStock || 0));
  const received = parseFloat(String(data.receivedQuantity || 0));
  const issued = parseFloat(String(data.issuedQuantity || 0));
  const returned = parseFloat(String(data.returnedQuantity || 0));
  const wastage = parseFloat(String(data.wastageQuantity || 0));
  const balance = (opening + received + returned - issued - wastage).toFixed(3);

  return db.insert(materialInventory).values({
    ...data,
    balanceQuantity: balance,
  });
}

export async function updateMaterialInventoryItem(id: number, data: Partial<InsertMaterialInventory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const existing = await db.select().from(materialInventory).where(eq(materialInventory.id, id)).limit(1);
  if (!existing.length) throw new Error("Material not found");
  const current = existing[0];

  const opening = data.openingStock !== undefined ? parseFloat(String(data.openingStock)) : parseFloat(String(current.openingStock));
  const received = data.receivedQuantity !== undefined ? parseFloat(String(data.receivedQuantity)) : parseFloat(String(current.receivedQuantity));
  const issued = data.issuedQuantity !== undefined ? parseFloat(String(data.issuedQuantity)) : parseFloat(String(current.issuedQuantity));
  const returned = data.returnedQuantity !== undefined ? parseFloat(String(data.returnedQuantity)) : parseFloat(String(current.returnedQuantity));
  const wastage = data.wastageQuantity !== undefined ? parseFloat(String(data.wastageQuantity)) : parseFloat(String(current.wastageQuantity));
  const balance = (opening + received + returned - issued - wastage).toFixed(3);

  return db.update(materialInventory).set({
    ...data,
    balanceQuantity: balance,
  }).where(eq(materialInventory.id, id));
}

// ----------------- GRN (GOODS RECEIPT NOTES) -----------------
export async function getGrnList(projectId?: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    grn: grnEntries,
    material: materialInventory,
  }).from(grnEntries)
    .leftJoin(materialInventory, eq(grnEntries.materialId, materialInventory.id))
    .orderBy(desc(grnEntries.grnDate), desc(grnEntries.id));

  if (projectId) return rows.filter((r) => r.grn.projectId === projectId);
  return rows;
}

export async function createGrn(data: InsertGrnEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const receivedQty = parseFloat(String(data.receivedQuantity || 0));
  const acceptedQty = data.acceptedQuantity !== undefined ? parseFloat(String(data.acceptedQuantity)) : receivedQty;
  const rejectedQty = data.rejectedQuantity !== undefined ? parseFloat(String(data.rejectedQuantity)) : Math.max(0, receivedQty - acceptedQty);
  const rate = parseFloat(String(data.rate || 0));
  const totalAmount = (acceptedQty * rate).toFixed(2);
  const inspectionStatus = rejectedQty > 0 ? (acceptedQty > 0 ? "Partially Accepted" : "Rejected") : "Accepted";

  const res = await db.insert(grnEntries).values({
    ...data,
    acceptedQuantity: String(acceptedQty),
    rejectedQuantity: String(rejectedQty),
    totalAmount,
    inspectionStatus,
  });

  // AUTOMATION: Update Material Inventory received stock and balance
  if (data.materialId && acceptedQty > 0) {
    const matRows = await db.select().from(materialInventory).where(eq(materialInventory.id, data.materialId)).limit(1);
    if (matRows.length) {
      const mat = matRows[0];
      const newReceived = (parseFloat(String(mat.receivedQuantity)) + acceptedQty).toFixed(3);
      const newBalance = (parseFloat(String(mat.balanceQuantity)) + acceptedQty).toFixed(3);
      await db.update(materialInventory).set({
        receivedQuantity: newReceived,
        balanceQuantity: newBalance,
        averageRate: rate > 0 ? String(rate) : mat.averageRate,
      }).where(eq(materialInventory.id, data.materialId));
    }
  }

  return res;
}

// ----------------- MATERIAL ISSUES / CONSUMPTION -----------------
export async function getMaterialIssuesList(roadId?: number, projectId?: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    issue: materialIssues,
    material: materialInventory,
    road: roads,
    boq: boqItems,
  }).from(materialIssues)
    .leftJoin(materialInventory, eq(materialIssues.materialId, materialInventory.id))
    .leftJoin(roads, eq(materialIssues.roadId, roads.id))
    .leftJoin(boqItems, eq(materialIssues.boqItemId, boqItems.id))
    .orderBy(desc(materialIssues.issueDate), desc(materialIssues.id));

  return rows.filter((r) => {
    if (roadId && r.issue.roadId !== roadId) return false;
    if (projectId && r.issue.projectId !== projectId) return false;
    return true;
  });
}

export async function createMaterialIssue(data: InsertMaterialIssue) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const res = await db.insert(materialIssues).values(data);
  const qty = parseFloat(String(data.quantity || 0));

  // AUTOMATION: Deduct from Material Inventory balance
  if (data.materialId && qty > 0) {
    const matRows = await db.select().from(materialInventory).where(eq(materialInventory.id, data.materialId)).limit(1);
    if (matRows.length) {
      const mat = matRows[0];
      const newIssued = (parseFloat(String(mat.issuedQuantity)) + qty).toFixed(3);
      const newBalance = (parseFloat(String(mat.balanceQuantity)) - qty).toFixed(3);
      await db.update(materialInventory).set({
        issuedQuantity: newIssued,
        balanceQuantity: newBalance,
      }).where(eq(materialInventory.id, data.materialId));

      // Check low stock alert
      if (parseFloat(newBalance) <= parseFloat(String(mat.minStock))) {
        await db.insert(notifications).values({
          type: "MATERIAL_LOW_STOCK",
          title: `Low Stock Alert: ${mat.materialName}`,
          message: `Current stock of ${mat.materialName} is ${newBalance} ${mat.unit}, which is below minimum threshold ${mat.minStock} ${mat.unit}.`,
          severity: "warning",
          targetRole: "site_engineer",
          entityType: "MATERIAL",
          entityId: mat.materialCode,
        });
      }
    }
  }

  return res;
}

// ----------------- ELECTRONIC MEASUREMENT BOOK (e-MB) -----------------
export async function getMeasurements(roadId?: number, boqItemId?: number, projectId?: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    mb: measurementEntries,
    road: roads,
    boq: boqItems,
    activity: activities,
  }).from(measurementEntries)
    .leftJoin(roads, eq(measurementEntries.roadId, roads.id))
    .leftJoin(boqItems, eq(measurementEntries.boqItemId, boqItems.id))
    .leftJoin(activities, eq(measurementEntries.activityId, activities.id))
    .orderBy(desc(measurementEntries.mbDate), desc(measurementEntries.id));

  return rows.filter((r) => {
    if (roadId && r.mb.roadId !== roadId) return false;
    if (boqItemId && r.mb.boqItemId !== boqItemId) return false;
    if (projectId && (r.mb as any).projectId !== projectId) return false;
    return true;
  });
}

export async function createMeasurement(data: InsertMeasurementEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const l = parseFloat(String(data.length || 0));
  const w = parseFloat(String(data.width || 0));
  const d = parseFloat(String(data.depth || 0));
  let calculatedQty = parseFloat(String(data.calculatedQuantity || 0));
  if (l > 0 && w > 0 && d > 0) {
    calculatedQty = parseFloat((l * w * d).toFixed(3));
  } else if (l > 0 && w > 0 && d === 0) {
    calculatedQty = parseFloat((l * w).toFixed(3));
  } else if (l > 0 && w === 0 && d === 0) {
    calculatedQty = l;
  }

  // Get BOQ item rate
  const boqRows = await db.select().from(boqItems).where(eq(boqItems.id, data.boqItemId)).limit(1);
  const rate = boqRows.length ? parseFloat(String(boqRows[0].rate)) : parseFloat(String(data.rate || 0));
  const amount = (calculatedQty * rate).toFixed(2);
  const unit = data.unit || boqRows[0]?.unit || "Cum";

  const res = await db.insert(measurementEntries).values({
    ...data,
    unit,
    rate: String(rate),
    calculatedQuantity: String(calculatedQty),
    amount,
  });

  // AUTOMATION: If e-MB entry is created as Approved, update BOQ executed quantity
  if (data.status === "Approved") {
    if (boqRows.length > 0) {
      const boq = boqRows[0];
      const newExec = (parseFloat(String(boq.executedQuantity)) + calculatedQty).toFixed(3);
      const newBal = (parseFloat(String(boq.contractQuantity)) - parseFloat(newExec)).toFixed(3);
      await db.update(boqItems).set({
        executedQuantity: newExec,
        balanceQuantity: newBal,
      }).where(eq(boqItems.id, data.boqItemId));
    }
  }

  return res;
}

export async function updateMeasurement(id: number, data: Partial<InsertMeasurementEntry>) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const existing = await db.select().from(measurementEntries).where(eq(measurementEntries.id, id)).limit(1);
  if (!existing.length) throw new Error("Measurement entry not found");
  const current = existing[0];

  const l = data.length !== undefined ? parseFloat(String(data.length)) : parseFloat(String(current.length));
  const w = data.width !== undefined ? parseFloat(String(data.width)) : parseFloat(String(current.width));
  const d = data.depth !== undefined ? parseFloat(String(data.depth)) : parseFloat(String(current.depth));

  let calculatedQty = data.calculatedQuantity !== undefined ? parseFloat(String(data.calculatedQuantity)) : parseFloat(String(current.calculatedQuantity));
  if (l > 0 && w > 0 && d > 0) {
    calculatedQty = parseFloat((l * w * d).toFixed(3));
  }

  const rate = data.rate !== undefined ? parseFloat(String(data.rate)) : parseFloat(String(current.rate));
  const amount = (calculatedQty * rate).toFixed(2);

  const res = await db.update(measurementEntries).set({
    ...data,
    calculatedQuantity: String(calculatedQty),
    amount,
    updatedAt: new Date(),
  }).where(eq(measurementEntries.id, id));

  // If status transitioned to Approved, update BOQ
  if (data.status === "Approved" && current.status !== "Approved") {
    const boqRows = await db.select().from(boqItems).where(eq(boqItems.id, current.boqItemId)).limit(1);
    if (boqRows.length > 0) {
      const boq = boqRows[0];
      const newExec = (parseFloat(String(boq.executedQuantity)) + calculatedQty).toFixed(3);
      const newBal = (parseFloat(String(boq.contractQuantity)) - parseFloat(newExec)).toFixed(3);
      await db.update(boqItems).set({
        executedQuantity: newExec,
        balanceQuantity: newBal,
      }).where(eq(boqItems.id, current.boqItemId));
    }
  }

  return res;
}

// ----------------- MATERIAL WASTAGE & VARIANCE AUDIT -----------------
export async function getMaterialVariances(roadId?: number, projectId?: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    variance: materialVariances,
    road: roads,
    boq: boqItems,
    material: materialInventory,
  }).from(materialVariances)
    .leftJoin(roads, eq(materialVariances.roadId, roads.id))
    .leftJoin(boqItems, eq(materialVariances.boqItemId, boqItems.id))
    .leftJoin(materialInventory, eq(materialVariances.materialId, materialInventory.id))
    .orderBy(desc(materialVariances.id));

  return rows.filter((r) => {
    if (roadId && r.variance.roadId !== roadId) return false;
    if (projectId && r.variance.projectId !== projectId) return false;
    return true;
  });
}

export async function computeMaterialVarianceReport(params: {
  projectId: number;
  roadId: number;
  boqItemId: number;
  materialId: number;
  periodFrom: string;
  periodTo: string;
  theoreticalFactor?: number; // e.g. 1.25 Cum aggregate per Cum WMM or 0.05 MT bitumen per MT DBM
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  // 1. Calculate actual work executed from BOQ or e-MB
  const mbRows = await db.select().from(measurementEntries).where(
    and(
      eq(measurementEntries.roadId, params.roadId),
      eq(measurementEntries.boqItemId, params.boqItemId)
    )
  );
  const totalMeasured = mbRows.reduce((acc, m) => acc + parseFloat(String(m.calculatedQuantity || 0)), 0);

  // 2. Default standard MoRTH theoretical factors if not passed
  let factor = params.theoreticalFactor || 1.10; // 10% standard bulk factor
  const boq = await db.select().from(boqItems).where(eq(boqItems.id, params.boqItemId)).limit(1);
  const mat = await db.select().from(materialInventory).where(eq(materialInventory.id, params.materialId)).limit(1);

  if (boq.length && mat.length) {
    if (boq[0].itemCode.includes("DBM") || boq[0].itemCode.includes("BC")) {
      factor = mat[0].materialCode.includes("BIT") ? 0.05 : 0.95; // Bitumen 5% or aggregate 95%
    } else if (boq[0].itemCode.includes("WMM") || boq[0].itemCode.includes("GSB")) {
      factor = 1.25; // 1.25 MT aggregate per Cum compacted
    } else if (boq[0].itemCode.includes("CD")) {
      factor = mat[0].materialCode.includes("CEM") ? 7.0 : 0.08; // 7 bags cement per cum or 80kg steel
    }
  }

  const theoreticalQty = parseFloat((totalMeasured * factor).toFixed(3));

  // 3. Calculate actual consumed from material issues ledger
  const issueRows = await db.select().from(materialIssues).where(
    and(
      eq(materialIssues.roadId, params.roadId),
      eq(materialIssues.materialId, params.materialId)
    )
  );
  const actualConsumed = issueRows.reduce((acc, i) => acc + parseFloat(String(i.quantity || 0)), 0);

  // 4. Compute variance
  const varianceQty = parseFloat((actualConsumed - theoreticalQty).toFixed(3));
  const variancePct = theoreticalQty > 0 ? parseFloat(((varianceQty / theoreticalQty) * 100).toFixed(2)) : 0;

  let status: "Within Limit" | "Watch" | "Excess" | "Short Consumption" = "Within Limit";
  if (variancePct > 5.0) status = "Excess";
  else if (variancePct > 2.5) status = "Watch";
  else if (variancePct < -5.0) status = "Short Consumption";

  const varianceNo = `VAR-${Date.now().toString().slice(-6)}`;
  await db.insert(materialVariances).values({
    varianceNo,
    projectId: params.projectId,
    roadId: params.roadId,
    boqItemId: params.boqItemId,
    materialId: params.materialId,
    periodFrom: params.periodFrom,
    periodTo: params.periodTo,
    theoreticalQuantity: String(theoreticalQty),
    actualQuantity: String(actualConsumed),
    varianceQuantity: String(varianceQty),
    variancePercent: String(variancePct),
    status,
    reason: status === "Excess" ? "Higher field laying thickness or unmetered subgrade absorption" : "Normal MoRTH tolerances",
    remarks: `Calculated from ${mbRows.length} e-MB records and ${issueRows.length} issue entries.`,
  });

  return { varianceNo, theoreticalQty, actualConsumed, varianceQty, variancePct, status };
}

// ----------------- RA BILL & LINE ITEMS -----------------
export async function getRaBillLines(billId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    line: raBillLines,
    boq: boqItems,
  }).from(raBillLines)
    .leftJoin(boqItems, eq(raBillLines.boqItemId, boqItems.id))
    .where(eq(raBillLines.billId, billId))
    .orderBy(raBillLines.id);
}

export async function generateRaBillFromBoq(params: {
  billId: string;
  projectId: number;
  roadId: number;
  billType: string;
  periodFrom: string;
  periodTo: string;
  gstPercent?: number; // default 18%
  retentionPercent?: number; // default 5%
  remarks?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  // Fetch BOQ items for the road (or project)
  const boqRows = await db.select().from(boqItems).where(
    params.roadId ? eq(boqItems.roadId, params.roadId) : eq(boqItems.projectId, params.projectId)
  );

  let grossTotal = 0;
  const billLinesToInsert: InsertRaBillLine[] = [];

  for (const boq of boqRows) {
    const executed = parseFloat(String(boq.executedQuantity || 0));
    if (executed > 0) {
      const rate = parseFloat(String(boq.rate || 0));
      const amount = parseFloat((executed * rate).toFixed(2));
      grossTotal += amount;

      billLinesToInsert.push({
        billId: 0, // will patch after bill insert
        boqItemId: boq.id,
        description: `${boq.itemCode} - ${boq.description}`,
        unit: boq.unit,
        previousQuantity: "0.000",
        currentQuantity: String(executed),
        cumulativeQuantity: String(executed),
        rate: String(rate),
        amount: String(amount),
      });
    }
  }

  const gstPct = params.gstPercent !== undefined ? params.gstPercent : 18;
  const retPct = params.retentionPercent !== undefined ? params.retentionPercent : 5;

  const grossAmount = parseFloat(grossTotal.toFixed(2));
  const gstAmount = parseFloat(((grossAmount * gstPct) / 100).toFixed(2));
  const retentionAmount = parseFloat(((grossAmount * retPct) / 100).toFixed(2));
  const netPayable = parseFloat((grossAmount + gstAmount - retentionAmount).toFixed(2));

  // Insert master bill
  const [insertRes] = await db.insert(billing).values({
    billId: params.billId,
    projectId: params.projectId,
    roadId: params.roadId,
    billType: params.billType,
    measurementStatus: "Completed",
    quantityCalculationStatus: "Completed",
    abstractStatus: "Completed",
    billPrepared: "Yes",
    submissionDate: params.periodTo,
    verificationStatus: "Bill Prepared",
    periodFrom: params.periodFrom,
    periodTo: params.periodTo,
    grossAmount: String(grossAmount),
    gstAmount: String(gstAmount),
    retentionAmount: String(retentionAmount),
    netPayable: String(netPayable),
    passedAmount: String(netPayable),
    paymentStatus: "Unpaid",
    remarks: params.remarks || `Auto-generated from cumulative executed BOQ quantities (GST: ${gstPct}%, Ret: ${retPct}%)`,
  });

  const createdBillId = insertRes.insertId;

  // Insert bill lines
  for (const line of billLinesToInsert) {
    await db.insert(raBillLines).values({
      ...line,
      billId: createdBillId,
    });
  }

  // Automation notification
  await db.insert(notifications).values({
    type: "BILL_SUBMITTED",
    title: `New RA Bill Generated: ${params.billId}`,
    message: `RA Bill ${params.billId} generated for ₹${netPayable.toLocaleString()} across ${billLinesToInsert.length} BOQ items.`,
    severity: "info",
    targetRole: "qs_billing_engineer",
    entityType: "BILL",
    entityId: params.billId,
  });

  return { id: createdBillId, grossAmount, gstAmount, retentionAmount, netPayable, lineCount: billLinesToInsert.length };
}

// ----------------- BILLING & QS -----------------
export async function getBills(roadId?: number, projectId?: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    bill: billing,
    road: roads,
  }).from(billing)
    .leftJoin(roads, eq(billing.roadId, roads.id))
    .orderBy(desc(billing.id));

  if (roadId) {
    return rows.filter(r => r.bill.roadId === roadId);
  }
  if (projectId) {
    return rows.filter(r => (r.bill as any).projectId === projectId);
  }
  return rows;
}

export async function createBill(data: InsertBilling) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.insert(billing).values(data);
}

export async function updateBill(id: number, data: Partial<InsertBilling>) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const existing = await db.select().from(billing).where(eq(billing.id, id)).limit(1);
  const oldVerification = existing[0]?.verificationStatus;

  const res = await db.update(billing).set(data).where(eq(billing.id, id));

  // AUTOMATION 7: When a Bill changes to Submitted, notify the responsible verifier
  if (data.verificationStatus === "Submitted" && oldVerification !== "Submitted") {
    await db.insert(notifications).values({
      type: "BILL_SUBMITTED",
      title: `Bill Submitted for Verification: ${existing[0]?.billId}`,
      message: `Bill ${existing[0]?.billId} (${existing[0]?.billType}) has been submitted for scrutiny and measurement verification.`,
      severity: "info",
      targetRole: "qs_billing_engineer",
      entityType: "BILL",
      entityId: existing[0]?.billId || String(id),
    });
  }

  // AUTOMATION 8: When a Bill changes to Passed, notify the concerned user
  if (data.verificationStatus === "Passed" && oldVerification !== "Passed") {
    await db.insert(notifications).values({
      type: "BILL_PASSED",
      title: `Bill Sanctioned/Passed: ${existing[0]?.billId}`,
      message: `Bill ${existing[0]?.billId} has been passed for amount ₹${data.passedAmount || existing[0]?.passedAmount}. Payment release initiated.`,
      severity: "success",
      targetRole: "project_manager",
      entityType: "BILL",
      entityId: existing[0]?.billId || String(id),
    });
  }

  return res;
}

// ----------------- HINDRANCES -----------------
export async function getHindrances(roadId?: number, projectId?: number) {
  const db = await getDb();
  if (!db) return [];
  await runHindrancePendingUpdate();

  const rows = await db.select({
    hindrance: hindrances,
    road: roads,
  }).from(hindrances)
    .leftJoin(roads, eq(hindrances.roadId, roads.id))
    .orderBy(desc(hindrances.id));

  return rows.filter((r) => {
    if (roadId && r.hindrance.roadId !== roadId) return false;
    if (projectId && r.hindrance.projectId !== projectId) return false;
    return true;
  });
}

export async function createHindrance(data: Omit<InsertHindrance, "hindranceId" | "daysPending"> & { hindranceId?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  // AUTOMATION 4: Automatically generate a unique Hindrance ID
  const year = new Date().getFullYear();
  const [countRes] = await db.select({ count: sql<number>`count(*)` }).from(hindrances);
  const nextNum = String((countRes?.count || 0) + 1).padStart(3, "0");
  const hindranceId = data.hindranceId || `HND-${year}-${nextNum}`;

  // AUTOMATION 5: Calculate Hindrance Days Pending automatically
  const raisedDate = new Date(data.dateRaised);
  const now = new Date();
  const daysPending = Math.max(0, Math.floor((now.getTime() - raisedDate.getTime()) / (1000 * 60 * 60 * 24)));

  return db.insert(hindrances).values({
    ...data,
    hindranceId,
    daysPending,
  });
}

export async function updateHindrance(id: number, data: Partial<InsertHindrance>) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  let updatePayload = { ...data };
  if (data.status === "Resolved" && !data.resolutionDate) {
    updatePayload.resolutionDate = new Date().toISOString().split("T")[0];
  }

  return db.update(hindrances).set(updatePayload).where(eq(hindrances.id, id));
}

// ----------------- QA/QC TESTS -----------------
export async function getQaQcTests(roadId?: number, projectId?: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    test: qaQcTests,
    road: roads,
  }).from(qaQcTests)
    .leftJoin(roads, eq(qaQcTests.roadId, roads.id))
    .orderBy(desc(qaQcTests.date), desc(qaQcTests.id));

  return rows.filter((r) => {
    if (roadId && r.test.roadId !== roadId) return false;
    if (projectId && r.test.projectId !== projectId) return false;
    return true;
  });
}

export async function createQaQcTest(data: InsertQaQcTest) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  // AUTOMATION 9: If Result is Failed, create a corrective-action notification/task
  let correctiveStatus = data.correctiveActionStatus || "None";
  let correctiveNotes = data.correctiveActionNotes || null;

  if (data.result === "Failed") {
    correctiveStatus = "Required";
    if (!correctiveNotes) {
      correctiveNotes = `Non-conformance recorded. Rework/re-testing required for ${data.testType} at ${data.locationRd}.`;
    }
  }

  const res = await db.insert(qaQcTests).values({
    ...data,
    correctiveActionStatus: correctiveStatus,
    correctiveActionNotes: correctiveNotes,
  });

  if (data.result === "Failed") {
    await db.insert(notifications).values({
      type: "QA_FAILED",
      title: `QA Test Failed: ${data.testId}`,
      message: `QA/QC Test ${data.testId} (${data.testType} on ${data.activity}) FAILED at ${data.locationRd}. Corrective action required.`,
      severity: "critical",
      targetRole: "qa_qc_engineer",
      entityType: "QA_TEST",
      entityId: data.testId,
    });
  }

  return res;
}

export async function updateQaQcTest(id: number, data: Partial<InsertQaQcTest>) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.update(qaQcTests).set(data).where(eq(qaQcTests.id, id));
}

// ----------------- MATERIALS -----------------
export async function getMaterials(roadId?: number, projectId?: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    material: materials,
    road: roads,
  }).from(materials)
    .leftJoin(roads, eq(materials.roadId, roads.id))
    .orderBy(desc(materials.date), desc(materials.id));

  if (roadId) {
    return rows.filter(r => r.material.roadId === roadId);
  }
  if (projectId) {
    return rows.filter(r => (r.material as any).projectId === projectId);
  }
  return rows;
}

export async function createMaterial(data: InsertMaterial) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  // AUTOMATION 10: Automatically calculate Balance = Received Quantity - Used Quantity
  const received = parseFloat(String(data.receivedQuantity || 0));
  const used = parseFloat(String(data.usedQuantity || 0));
  const balance = (received - used).toFixed(2);

  return db.insert(materials).values({
    ...data,
    balanceQuantity: balance,
  });
}

export async function updateMaterial(id: number, data: Partial<InsertMaterial>) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  let updatePayload = { ...data };
  if (data.receivedQuantity !== undefined || data.usedQuantity !== undefined) {
    const existing = await db.select().from(materials).where(eq(materials.id, id)).limit(1);
    const rec = data.receivedQuantity !== undefined ? parseFloat(String(data.receivedQuantity)) : parseFloat(String(existing[0]?.receivedQuantity || 0));
    const used = data.usedQuantity !== undefined ? parseFloat(String(data.usedQuantity)) : parseFloat(String(existing[0]?.usedQuantity || 0));
    updatePayload.balanceQuantity = (rec - used).toFixed(2);
  }

  return db.update(materials).set(updatePayload).where(eq(materials.id, id));
}

// ----------------- DOCUMENTS -----------------
export async function getDocuments(category?: string, projectId?: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    doc: documents,
    road: roads,
  }).from(documents)
    .leftJoin(roads, eq(documents.roadId, roads.id))
    .orderBy(desc(documents.date), desc(documents.id));

  return rows.filter((r) => {
    if (category && r.doc.category !== category) return false;
    if (projectId && r.doc.projectId !== projectId) return false;
    return true;
  });
}

export async function createDocument(data: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.insert(documents).values(data);
}

// ----------------- NOTIFICATIONS -----------------
export async function getNotifications(unreadOnly = false) {
  const db = await getDb();
  if (!db) return [];
  if (unreadOnly) {
    return db.select().from(notifications).where(eq(notifications.isRead, 0)).orderBy(desc(notifications.createdAt));
  }
  return db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(30);
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) return;
  return db.update(notifications).set({ isRead: 1 }).where(eq(notifications.id, id));
}

// ----------------- 10. DASHBOARD METRICS -----------------
export async function getDashboardStats(projectId?: number) {
  const db = await getDb();
  if (!db) return null;

  await runActivityOverdueCheck();
  await runHindrancePendingUpdate();

  const [pCount] = await db.select({ count: sql<number>`count(*)` }).from(projects);
  const allRoads = await db.select().from(roads);
  const roadList = projectId ? allRoads.filter(r => r.projectId === projectId) : allRoads;
  const rCount = { count: roadList.length };

  const allActs = await db.select().from(activities);
  const actList = projectId ? allActs.filter(a => (a as any).projectId === projectId) : allActs;
  const totalActivities = actList.length;
  const completedActivities = actList.filter(a => a.status === "Complete" || parseFloat(String(a.percentageComplete)) >= 100).length;
  const inProgressActivities = actList.filter(a => a.status === "In Progress").length;
  const notStartedActivities = actList.filter(a => a.status === "Not Started").length;
  const overdueActivities = actList.filter(a => a.status === "Overdue").length;

  const overallPhysicalProgress = roadList.length > 0
    ? (roadList.reduce((acc, r) => acc + parseFloat(String(r.progress || 0)), 0) / roadList.length).toFixed(2)
    : "0.00";

  const hindList = (await db.select().from(hindrances)).filter(h => !projectId || (h as any).projectId === projectId);
  const todayStr = new Date().toISOString().split("T")[0];
  const openHindrances = hindList.filter(h => h.status !== "Resolved").length;
  const overdueHindrances = hindList.filter(h => h.status !== "Resolved" && h.dueDate && h.dueDate < todayStr).length;

  const billList = (await db.select().from(billing)).filter(b => !projectId || (b as any).projectId === projectId);
  const pendingBills = billList.filter(b => b.verificationStatus === "Measurement" || b.verificationStatus === "Quantity Calculation" || b.verificationStatus === "Abstract" || b.verificationStatus === "Bill Prepared").length;
  const submittedBills = billList.filter(b => b.verificationStatus === "Submitted" || b.verificationStatus === "Under Verification").length;
  const passedBills = billList.filter(b => b.verificationStatus === "Passed" || b.verificationStatus === "Payment Received").length;
  const paymentPending = billList.filter(b => b.paymentStatus === "Unpaid" && (b.verificationStatus === "Passed" || b.verificationStatus === "Payment Received")).length;

  const qaList = (await db.select().from(qaQcTests)).filter(q => !projectId || (q as any).projectId === projectId);
  const qaQcFailedTests = qaList.filter(q => q.result === "Failed").length;

  const matList = (await db.select().from(materials)).filter(m => !projectId || (m as any).projectId === projectId);
  const totalMaterialStockCount = matList.length;

  // Phase-wise breakdown
  const phaseMap: Record<string, { total: number; complete: number }> = {};
  actList.forEach(a => {
    if (!phaseMap[a.phase]) phaseMap[a.phase] = { total: 0, complete: 0 };
    phaseMap[a.phase].total++;
    if (a.status === "Complete" || parseFloat(String(a.percentageComplete)) >= 100) {
      phaseMap[a.phase].complete++;
    }
  });

  const phaseProgress = Object.keys(phaseMap).map(phase => ({
    phase,
    total: phaseMap[phase].total,
    complete: phaseMap[phase].complete,
    percentage: ((phaseMap[phase].complete / (phaseMap[phase].total || 1)) * 100).toFixed(1)
  }));

  return {
    totalProjects: pCount?.count || 0,
    totalRoads: rCount?.count || 0,
    totalActivities,
    completedActivities,
    inProgressActivities,
    notStartedActivities,
    overdueActivities,
    overallPhysicalProgress,
    openHindrances,
    overdueHindrances,
    pendingBills,
    submittedBills,
    passedBills,
    paymentPending,
    qaQcFailedTests,
    totalMaterialStockCount,
    roadList,
    phaseProgress,
    recentHindrances: hindList.slice(0, 5),
    recentBills: billList.slice(0, 5),
  };
}

// ----------------- SUBCONTRACTORS & WORK ORDERS -----------------
export async function getSubcontractors(projectId?: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(subcontractors).orderBy(desc(subcontractors.id));
  if (projectId) return rows.filter(r => r.projectId === projectId);
  return rows;
}

export async function createSubcontractor(data: InsertSubcontractor) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.insert(subcontractors).values(data);
}

export async function getWorkOrders(roadId?: number, subcontractorId?: number, projectId?: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    wo: workOrders,
    road: roads,
    subcontractor: subcontractors,
  }).from(workOrders)
    .leftJoin(roads, eq(workOrders.roadId, roads.id))
    .leftJoin(subcontractors, eq(workOrders.subcontractorId, subcontractors.id))
    .orderBy(desc(workOrders.id));

  return rows.filter((r) => {
    if (roadId && r.wo.roadId !== roadId) return false;
    if (subcontractorId && r.wo.subcontractorId !== subcontractorId) return false;
    if (projectId && r.wo.projectId !== projectId) return false;
    return true;
  });
}

export async function createWorkOrder(data: InsertWorkOrder) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const qty = parseFloat(String(data.awardedQuantity || 0));
  const rate = parseFloat(String(data.rate || 0));
  const awardedAmount = (qty * rate).toFixed(2);
  return db.insert(workOrders).values({
    ...data,
    awardedAmount,
  });
}

export async function updateWorkOrder(id: number, data: Partial<InsertWorkOrder>) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.update(workOrders).set({ ...data, updatedAt: new Date() }).where(eq(workOrders.id, id));
}

// ----------------- PLANT, MACHINERY & FUEL LOGBOOK -----------------
export async function getMachineryAssets(projectId?: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    asset: machineryAssets,
    road: roads,
  }).from(machineryAssets)
    .leftJoin(roads, eq(machineryAssets.currentRoadId, roads.id))
    .orderBy(machineryAssets.assetNo);

  if (projectId) return rows.filter(r => r.asset.projectId === projectId);
  return rows;
}

export async function createMachineryAsset(data: InsertMachineryAsset) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.insert(machineryAssets).values(data);
}

export async function getMachineryLogs(roadId?: number, assetId?: number, projectId?: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    log: machineryLogs,
    asset: machineryAssets,
    road: roads,
  }).from(machineryLogs)
    .leftJoin(machineryAssets, eq(machineryLogs.assetId, machineryAssets.id))
    .leftJoin(roads, eq(machineryLogs.roadId, roads.id))
    .orderBy(desc(machineryLogs.logDate), desc(machineryLogs.id));

  return rows.filter((r) => {
    if (roadId && r.log.roadId !== roadId) return false;
    if (assetId && r.log.assetId !== assetId) return false;
    if (projectId && r.log.projectId !== projectId) return false;
    return true;
  });
}

export async function createMachineryLog(data: InsertMachineryLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const openH = parseFloat(String(data.openingHourMeter || 0));
  const closeH = parseFloat(String(data.closingHourMeter || 0));
  const workHours = Math.max(0, parseFloat((closeH - openH).toFixed(2)));
  const fuelIssued = parseFloat(String(data.fuelIssued || 0));
  const fuelRate = parseFloat(String(data.fuelRate || 92)); // default diesel rate
  const fuelAmount = parseFloat((fuelIssued * fuelRate).toFixed(2));
  const fuelEff = workHours > 0 ? parseFloat((fuelIssued / workHours).toFixed(2)) : 0;

  // Retrieve expected fuel efficiency from asset
  const assetRows = await db.select().from(machineryAssets).where(eq(machineryAssets.id, data.assetId)).limit(1);
  const expectedEff = assetRows.length ? parseFloat(String(assetRows[0].expectedFuelPerHour || 0)) : 12;

  let utilizationStatus: "Efficient" | "Watch" | "High Consumption" | "Idle" = "Efficient";
  if (workHours === 0 && fuelIssued > 0) utilizationStatus = "Idle";
  else if (expectedEff > 0 && fuelEff > expectedEff * 1.2) utilizationStatus = "High Consumption";
  else if (expectedEff > 0 && fuelEff > expectedEff * 1.08) utilizationStatus = "Watch";

  const res = await db.insert(machineryLogs).values({
    ...data,
    workHours: String(workHours),
    fuelAmount: String(fuelAmount),
    fuelEfficiency: String(fuelEff),
    utilizationStatus,
  });

  // Update asset hour meter & road location
  if (closeH > 0) {
    await db.update(machineryAssets).set({
      currentHourMeter: String(closeH),
      currentRoadId: data.roadId,
      status: "Deployed",
      updatedAt: new Date(),
    }).where(eq(machineryAssets.id, data.assetId));
  }

  return res;
}

// ----------------- MACHINERY COMPLIANCE & SERVICE TRACKER -----------------
export async function getMachineryCompliance(projectId?: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    compliance: machineryCompliance,
    asset: machineryAssets,
  }).from(machineryCompliance)
    .leftJoin(machineryAssets, eq(machineryCompliance.assetId, machineryAssets.id))
    .orderBy(machineryCompliance.expiryDate);

  if (projectId) return rows.filter(r => r.compliance.projectId === projectId);
  return rows;
}

export async function createMachineryCompliance(data: InsertMachineryCompliance) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.insert(machineryCompliance).values(data);
}

export async function deleteMachineryCompliance(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.delete(machineryCompliance).where(eq(machineryCompliance.id, id));
}

/**
 * Generate due-date alerts for machine compliance documents.
 * Idempotent: skips a record if an unread notification already exists for it,
 * so the bell doesn't get spammed on every page visit.
 */
export async function generateComplianceAlerts(projectId?: number) {
  const db = await getDb();
  if (!db) return { created: 0 };
  const rows = await getMachineryCompliance(projectId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let created = 0;

  for (const { compliance, asset } of rows) {
    if (!compliance.expiryDate) continue;
    const expiry = new Date(compliance.expiryDate + "T00:00:00");
    if (isNaN(expiry.getTime())) continue;
    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
    if (daysLeft > 30) continue; // only alert within 30 days / overdue

    const existing = await db.select({ id: notifications.id }).from(notifications)
      .where(and(
        eq(notifications.entityType, "MACHINE_COMPLIANCE"),
        eq(notifications.entityId, String(compliance.id)),
        eq(notifications.isRead, 0),
      )).limit(1);
    if (existing.length > 0) continue;

    const machine = asset ? `${asset.assetNo} (${asset.assetType})` : `Machine #${compliance.assetId}`;
    const overdue = daysLeft < 0;
    await db.insert(notifications).values({
      type: overdue ? "MACHINE_COMPLIANCE_OVERDUE" : "MACHINE_COMPLIANCE_DUE",
      title: overdue
        ? `${compliance.docType} EXPIRED: ${machine}`
        : `${compliance.docType} due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}: ${machine}`,
      message: `${machine} — ${compliance.docType}${compliance.docNumber ? ` (${compliance.docNumber})` : ""} ${overdue ? `expired on ${compliance.expiryDate}` : `expires on ${compliance.expiryDate}`}. Renew in the Compliance Tracker.`,
      severity: overdue ? "critical" : "warning",
      targetRole: "site_engineer",
      entityType: "MACHINE_COMPLIANCE",
      entityId: String(compliance.id),
    });
    created++;
  }
  return { created };
}

// ----------------- DIGITAL SIGNOFF & JOINT VERIFICATION -----------------
export async function getApprovalSignoffs(entityType?: string, entityId?: string) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(approvalSignoffs).orderBy(desc(approvalSignoffs.id));
  return rows.filter((r) => {
    if (entityType && r.entityType !== entityType) return false;
    if (entityId && r.entityId !== entityId) return false;
    return true;
  });
}

export async function requestSignoff(data: Omit<InsertApprovalSignoff, "signedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const res = await db.insert(approvalSignoffs).values({
    ...data,
    status: "Pending",
  });

  await db.insert(notifications).values({
    type: "SIGNOFF_REQUESTED",
    title: `Digital Sign-off Requested: ${data.entityType} ${data.entityId}`,
    message: `${data.requestedBy} requested digital verification and sign-off for ${data.stage}.`,
    severity: "info",
    targetRole: data.assignedRole,
    entityType: data.entityType,
    entityId: data.entityId,
  });

  return res;
}

export async function completeSignoff(id: number, params: { signedBy: string; status: "Approved" | "Rejected"; comments?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const res = await db.update(approvalSignoffs).set({
    signedBy: params.signedBy,
    status: params.status,
    comments: params.comments,
    signedAt: new Date(),
  }).where(eq(approvalSignoffs.id, id));

  const signoff = await db.select().from(approvalSignoffs).where(eq(approvalSignoffs.id, id)).limit(1);
  if (signoff.length) {
    await db.insert(notifications).values({
      type: "SIGNOFF_COMPLETED",
      title: `Sign-off ${params.status}: ${signoff[0].entityType} ${signoff[0].entityId}`,
      message: `${signoff[0].stage} has been ${params.status.toLowerCase()} by ${params.signedBy}.`,
      severity: params.status === "Approved" ? "success" : "critical",
      targetRole: "project_manager",
      entityType: signoff[0].entityType,
      entityId: signoff[0].entityId,
    });
  }

  return res;
}


// ----------------- ROAD STRUCTURES / CD & PROTECTION WORKS REGISTER -----------------
export async function getRoadStructures(params?: { roadId?: number; structureType?: string; status?: string; projectId?: number }) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db.select({
    structure: roadStructures,
    road: roads,
  }).from(roadStructures)
    .leftJoin(roads, eq(roadStructures.roadId, roads.id))
    .orderBy(roadStructures.roadId, roadStructures.chainageFrom);

  return rows.filter((r) => {
    if (params?.roadId && r.structure.roadId !== params.roadId) return false;
    if (params?.structureType && r.structure.structureType !== params.structureType) return false;
    if (params?.status && r.structure.status !== params.status) return false;
    if (params?.projectId && (r.structure as any).projectId !== params.projectId) return false;
    return true;
  });
}

export async function getRoadStructuresSummary() {
  const db = await getDb();
  if (!db) return { roadWise: [], totalStructures: 0, byType: {} };

  const allRoads = await db.select().from(roads).orderBy(roads.id);
  const allStructures = await db.select().from(roadStructures);

  const byType: Record<string, number> = {};
  allStructures.forEach((s) => {
    const t = s.structureType || "Other";
    byType[t] = (byType[t] || 0) + Number(s.count || 1);
  });

  const roadWise = allRoads.map((road) => {
    const structs = allStructures.filter((s) => s.roadId === road.id);
    const counts = {
      slabCulvert: structs.filter((s) => s.structureType === "Slab Culvert").reduce((acc, s) => acc + Number(s.count || 1), 0),
      hpc: structs.filter((s) => s.structureType === "HPC").reduce((acc, s) => acc + Number(s.count || 1), 0),
      boxCulvert: structs.filter((s) => s.structureType === "Box Culvert").reduce((acc, s) => acc + Number(s.count || 1), 0),
      minorBridge: structs.filter((s) => s.structureType === "Minor Bridge").reduce((acc, s) => acc + Number(s.count || 1), 0),
      causeway: structs.filter((s) => s.structureType === "Causeway").reduce((acc, s) => acc + Number(s.count || 1), 0),
      retainingWall: structs.filter((s) => s.structureType === "Retaining Wall").reduce((acc, s) => acc + Number(s.quantity || s.length || 0), 0),
      toeWall: structs.filter((s) => s.structureType === "Toe Wall").reduce((acc, s) => acc + Number(s.quantity || s.length || 0), 0),
      drain: structs.filter((s) => s.structureType === "Drain").reduce((acc, s) => acc + Number(s.quantity || s.length || 0), 0),
      completed: structs.filter((s) => s.status === "Completed").length,
      inProgress: structs.filter((s) => s.status === "In Progress").length,
      totalItems: structs.length,
    };

    return {
      roadId: road.id,
      roadCode: road.roadId,
      roadName: road.roadName,
      roadLengthKm: road.roadLengthKm,
      counts,
      structures: structs,
    };
  });

  return {
    roadWise,
    totalStructures: allStructures.length,
    byType,
  };
}

export async function createRoadStructure(data: InsertRoadStructure) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.insert(roadStructures).values(data);
}

export async function updateRoadStructure(id: number, data: Partial<InsertRoadStructure>) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.update(roadStructures).set(data).where(eq(roadStructures.id, id));
}


// ----------------- HR & PAYROLL FOUNDATION -----------------
export async function getHrDepartments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(hrDepartments).orderBy(hrDepartments.name);
}

export async function getHrDesignations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(hrDesignations).orderBy(hrDesignations.name);
}

export async function createHrDepartment(data: InsertHrDepartment) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.insert(hrDepartments).values(data);
}

export async function createHrDesignation(data: InsertHrDesignation) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.insert(hrDesignations).values(data);
}

export async function getHrEmployees(params?: { search?: string; status?: string; departmentId?: number; projectId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const employeeRows = await db.select({
    employee: hrEmployees,
    department: hrDepartments,
    designation: hrDesignations,
  }).from(hrEmployees)
    .leftJoin(hrDepartments, eq(hrEmployees.departmentId, hrDepartments.id))
    .leftJoin(hrDesignations, eq(hrEmployees.designationId, hrDesignations.id))
    .orderBy(hrEmployees.fullName);

  let rows = employeeRows;
  if (params?.status) rows = rows.filter((row) => row.employee.status === params.status);
  if (params?.departmentId) rows = rows.filter((row) => row.employee.departmentId === params.departmentId);
  if (params?.search) {
    const query = params.search.trim().toLowerCase();
    rows = rows.filter((row) => [
      row.employee.employeeCode,
      row.employee.fullName,
      row.employee.phone || "",
      row.department?.name || "",
      row.designation?.name || "",
    ].some((value) => value.toLowerCase().includes(query)));
  }

  if (params?.projectId) {
    const assignments = await db.select({ employeeId: hrAssignments.employeeId })
      .from(hrAssignments)
      .where(and(eq(hrAssignments.projectId, params.projectId), eq(hrAssignments.status, "Active")));
    const assignedIds = new Set(assignments.map((assignment) => assignment.employeeId));
    rows = rows.filter((row) => assignedIds.has(row.employee.id));
  }

  return rows;
}

export async function getHrEmployeeById(id: number) {
  const rows = await getHrEmployees();
  return rows.find((row) => row.employee.id === id);
}

export async function createHrEmployee(data: InsertHrEmployee) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.insert(hrEmployees).values(data);
}

export async function updateHrEmployee(id: number, data: Partial<InsertHrEmployee>) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.update(hrEmployees).set({ ...data, updatedAt: new Date() }).where(eq(hrEmployees.id, id));
}

export async function getHrAssignments(employeeId?: number, projectId?: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    assignment: hrAssignments,
    employee: hrEmployees,
    project: projects,
    road: roads,
  }).from(hrAssignments)
    .leftJoin(hrEmployees, eq(hrAssignments.employeeId, hrEmployees.id))
    .leftJoin(projects, eq(hrAssignments.projectId, projects.id))
    .leftJoin(roads, eq(hrAssignments.roadId, roads.id))
    .orderBy(desc(hrAssignments.createdAt));
  return rows.filter((row) => {
    if (employeeId && row.assignment.employeeId !== employeeId) return false;
    if (projectId && row.assignment.projectId !== projectId) return false;
    return true;
  });
}

export async function createHrAssignment(data: InsertHrAssignment) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.insert(hrAssignments).values(data);
}

export async function updateHrAssignment(id: number, data: Partial<InsertHrAssignment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.update(hrAssignments).set({ ...data, updatedAt: new Date() }).where(eq(hrAssignments.id, id));
}

export async function getHrSummary() {
  const db = await getDb();
  if (!db) return { totalEmployees: 0, activeEmployees: 0, onLeave: 0, monthlyPayrollBase: 0, dailyWageHeadcount: 0, assignedEmployees: 0 };
  const employees = await db.select().from(hrEmployees);
  const assignments = await db.select().from(hrAssignments).where(eq(hrAssignments.status, "Active"));
  return {
    totalEmployees: employees.length,
    activeEmployees: employees.filter((employee) => employee.status === "Active").length,
    onLeave: employees.filter((employee) => employee.status === "On Leave").length,
    monthlyPayrollBase: employees.filter((employee) => employee.status === "Active" && employee.payBasis === "Monthly").reduce((total, employee) => total + Number(employee.basicRate || 0), 0),
    dailyWageHeadcount: employees.filter((employee) => employee.status === "Active" && employee.payBasis === "Daily").length,
    assignedEmployees: new Set(assignments.map((assignment) => assignment.employeeId)).size,
  };
}


// ----------------- HR & PAYROLL PHASE 2 -----------------
export async function getHrAttendanceList(params?: { date?: string; employeeId?: number; projectId?: number; roadId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    attendance: hrAttendance,
    employee: hrEmployees,
    project: projects,
    road: roads,
  }).from(hrAttendance)
    .leftJoin(hrEmployees, eq(hrAttendance.employeeId, hrEmployees.id))
    .leftJoin(projects, eq(hrAttendance.projectId, projects.id))
    .leftJoin(roads, eq(hrAttendance.roadId, roads.id))
    .orderBy(desc(hrAttendance.attendanceDate), hrAttendance.employeeId);

  return rows.filter((row) => {
    if (params?.date && row.attendance.attendanceDate !== params.date) return false;
    if (params?.employeeId && row.attendance.employeeId !== params.employeeId) return false;
    if (params?.projectId && row.attendance.projectId !== params.projectId) return false;
    if (params?.roadId && row.attendance.roadId !== params.roadId) return false;
    return true;
  });
}

export async function upsertHrAttendance(data: InsertHrAttendance) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const existing = await db.select({ id: hrAttendance.id })
    .from(hrAttendance)
    .where(and(eq(hrAttendance.employeeId, data.employeeId), eq(hrAttendance.attendanceDate, data.attendanceDate)))
    .limit(1);

  if (existing.length > 0) {
    const existingId = existing[0]!.id;
    await db.update(hrAttendance).set({
      projectId: data.projectId,
      roadId: data.roadId,
      status: data.status,
      inTime: data.inTime,
      outTime: data.outTime,
      overtimeHours: data.overtimeHours,
      remarks: data.remarks,
      markedBy: data.markedBy,
      updatedAt: new Date(),
    }).where(eq(hrAttendance.id, existingId));
    return { id: existingId, updated: true };
  }

  const [res] = await db.insert(hrAttendance).values(data);
  return { id: (res as any)?.insertId, created: true };
}

export async function getHrLeaveRequests(params?: { employeeId?: number; status?: string }) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    leave: hrLeaveRequests,
    employee: hrEmployees,
  }).from(hrLeaveRequests)
    .leftJoin(hrEmployees, eq(hrLeaveRequests.employeeId, hrEmployees.id))
    .orderBy(desc(hrLeaveRequests.createdAt));

  return rows.filter((row) => {
    if (params?.employeeId && row.leave.employeeId !== params.employeeId) return false;
    if (params?.status && row.leave.status !== params.status) return false;
    return true;
  });
}

export async function createHrLeaveRequest(data: InsertHrLeaveRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.insert(hrLeaveRequests).values(data);
}

export async function updateHrLeaveStatus(id: number, status: "Approved" | "Rejected" | "Cancelled", approverUserId?: number, remarks?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.update(hrLeaveRequests).set({
    status,
    approvedBy: approverUserId ?? null,
    approvedAt: new Date(),
    remarks: remarks ?? null,
    updatedAt: new Date(),
  }).where(eq(hrLeaveRequests.id, id));
}

export async function getHrPayrollRuns() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(hrPayrollRuns).orderBy(desc(hrPayrollRuns.payrollMonth));
}

export async function getHrPayrollLines(payrollRunId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    line: hrPayrollLines,
    employee: hrEmployees,
  }).from(hrPayrollLines)
    .leftJoin(hrEmployees, eq(hrPayrollLines.employeeId, hrEmployees.id))
    .where(eq(hrPayrollLines.payrollRunId, payrollRunId))
    .orderBy(hrPayrollLines.id);
}

export async function computeMonthlyPayrollDraft(params: { payrollMonth: string; userId?: number; remarks?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const [yearStr, monthStr] = params.payrollMonth.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month || month < 1 || month > 12) {
    throw new Error("Invalid payroll month format. Use YYYY-MM");
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const periodFrom = `${params.payrollMonth}-01`;
  const periodTo = `${params.payrollMonth}-${String(daysInMonth).padStart(2, "0")}`;

  const activeEmployees = await db.select().from(hrEmployees).where(eq(hrEmployees.status, "Active"));
  const allAttendance = await db.select().from(hrAttendance);
  const monthAttendance = allAttendance.filter((att) => att.attendanceDate >= periodFrom && att.attendanceDate <= periodTo);
  const allAdjustments = await db.select().from(hrPayrollAdjustments).where(and(
    eq(hrPayrollAdjustments.payrollMonth, params.payrollMonth),
    or(eq(hrPayrollAdjustments.status, "Approved"), eq(hrPayrollAdjustments.status, "Applied"))
  ));

  const existingRun = await db.select().from(hrPayrollRuns).where(eq(hrPayrollRuns.payrollMonth, params.payrollMonth)).limit(1);
  let payrollRunId: number;

  if (existingRun.length > 0) {
    payrollRunId = existingRun[0]!.id;
    await db.delete(hrPayrollLines).where(eq(hrPayrollLines.payrollRunId, payrollRunId));
    await db.update(hrPayrollRuns).set({
      periodFrom,
      periodTo,
      status: "Draft",
      preparedBy: params.userId ?? null,
      remarks: params.remarks ?? "Auto-recalculated monthly draft",
      updatedAt: new Date(),
    }).where(eq(hrPayrollRuns.id, payrollRunId));
  } else {
    const [res] = await db.insert(hrPayrollRuns).values({
      payrollMonth: params.payrollMonth,
      periodFrom,
      periodTo,
      status: "Draft",
      preparedBy: params.userId ?? null,
      remarks: params.remarks ?? "Monthly payroll preview draft",
    });
    payrollRunId = (res as any)?.insertId;
  }

  let grossTotal = 0;
  let deductionTotal = 0;
  let netTotal = 0;
  let employeeCount = 0;

  for (const emp of activeEmployees) {
    const empAtt = monthAttendance.filter((att) => att.employeeId === emp.id);
    let presentCount = 0;
    let halfDayCount = 0;
    let absentCount = 0;
    let totalOvertimeHours = 0;

    empAtt.forEach((att) => {
      if (att.status === "Present" || att.status === "Weekly Off" || att.status === "Holiday") presentCount += 1;
      else if (att.status === "Half Day") halfDayCount += 1;
      else if (att.status === "Absent") absentCount += 1;
      totalOvertimeHours += Number(att.overtimeHours || 0);
    });

    const payableDays = empAtt.length > 0
      ? presentCount + (halfDayCount * 0.5)
      : (emp.payBasis === "Monthly" ? daysInMonth : 0);

    const baseRate = Number(emp.basicRate || 0);
    const otRate = Number(emp.overtimeRate || 0);

    let basicAmount = 0;
    if (emp.payBasis === "Monthly") {
      basicAmount = daysInMonth > 0 ? (baseRate / daysInMonth) * payableDays : baseRate;
    } else if (emp.payBasis === "Daily") {
      basicAmount = baseRate * payableDays;
    } else {
      basicAmount = baseRate * payableDays * 8;
    }

    const overtimeAmount = totalOvertimeHours * otRate;
    const empAdjustments = allAdjustments.filter((adj) => adj.employeeId === emp.id);
    const allowanceAmount = empAdjustments
      .filter((adj) => adj.adjustmentType === "Allowance" || adj.adjustmentType === "Bonus")
      .reduce((sum, adj) => sum + Number(adj.amount || 0), 0);
    const deductionAmount = empAdjustments
      .filter((adj) => adj.adjustmentType === "Advance" || adj.adjustmentType === "Loan Recovery" || adj.adjustmentType === "Fine" || adj.adjustmentType === "Other")
      .reduce((sum, adj) => sum + Number(adj.amount || 0), 0);

    const grossAmount = basicAmount + overtimeAmount + allowanceAmount;
    const netAmount = Math.max(0, grossAmount - deductionAmount);

    grossTotal += grossAmount;
    deductionTotal += deductionAmount;
    netTotal += netAmount;
    employeeCount += 1;

    await db.insert(hrPayrollLines).values({
      payrollRunId,
      employeeId: emp.id,
      payableDays: payableDays.toFixed(2),
      absentDays: absentCount.toFixed(2),
      overtimeHours: totalOvertimeHours.toFixed(2),
      basicAmount: basicAmount.toFixed(2),
      overtimeAmount: overtimeAmount.toFixed(2),
      allowanceAmount: allowanceAmount.toFixed(2),
      deductionAmount: deductionAmount.toFixed(2),
      grossAmount: grossAmount.toFixed(2),
      netAmount: netAmount.toFixed(2),
      remarks: `${emp.payBasis} calculation (${payableDays.toFixed(1)} / ${daysInMonth} days)`,
    });
  }

  await db.update(hrPayrollRuns).set({
    employeeCount,
    grossTotal: grossTotal.toFixed(2),
    deductionTotal: deductionTotal.toFixed(2),
    netTotal: netTotal.toFixed(2),
    updatedAt: new Date(),
  }).where(eq(hrPayrollRuns.id, payrollRunId));

  return {
    payrollRunId,
    payrollMonth: params.payrollMonth,
    employeeCount,
    grossTotal,
    netTotal,
  };
}

export async function approveHrPayrollRun(payrollRunId: number, approverUserId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.update(hrPayrollRuns).set({
    status: "Approved",
    approvedBy: approverUserId ?? null,
    approvedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(hrPayrollRuns.id, payrollRunId));
}


// ----------------- HR & PAYROLL PHASE 3 -----------------
export async function getHrPayrollAdjustments(params?: { payrollMonth?: string; employeeId?: number; status?: string }) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    adjustment: hrPayrollAdjustments,
    employee: hrEmployees,
  }).from(hrPayrollAdjustments)
    .leftJoin(hrEmployees, eq(hrPayrollAdjustments.employeeId, hrEmployees.id))
    .orderBy(desc(hrPayrollAdjustments.createdAt));

  return rows.filter((row) => {
    if (params?.payrollMonth && row.adjustment.payrollMonth !== params.payrollMonth) return false;
    if (params?.employeeId && row.adjustment.employeeId !== params.employeeId) return false;
    if (params?.status && row.adjustment.status !== params.status) return false;
    return true;
  });
}

export async function createHrPayrollAdjustment(data: InsertHrPayrollAdjustment) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.insert(hrPayrollAdjustments).values(data);
}

export async function updateHrPayrollAdjustmentStatus(id: number, status: "Approved" | "Applied" | "Cancelled", approverUserId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.update(hrPayrollAdjustments).set({
    status,
    approvedBy: approverUserId ?? null,
    approvedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(hrPayrollAdjustments.id, id));
}

export async function getEmployeePayslip(params: { payrollRunId: number; employeeId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const [run] = await db.select().from(hrPayrollRuns).where(eq(hrPayrollRuns.id, params.payrollRunId)).limit(1);
  if (!run) throw new Error("Payroll run not found");

  const [lineRow] = await db.select({
    line: hrPayrollLines,
    employee: hrEmployees,
    department: hrDepartments,
    designation: hrDesignations,
  }).from(hrPayrollLines)
    .leftJoin(hrEmployees, eq(hrPayrollLines.employeeId, hrEmployees.id))
    .leftJoin(hrDepartments, eq(hrEmployees.departmentId, hrDepartments.id))
    .leftJoin(hrDesignations, eq(hrEmployees.designationId, hrDesignations.id))
    .where(and(eq(hrPayrollLines.payrollRunId, params.payrollRunId), eq(hrPayrollLines.employeeId, params.employeeId)))
    .limit(1);

  if (!lineRow || !lineRow.employee) throw new Error("Payslip line not found for this employee");

  const adjustments = await db.select().from(hrPayrollAdjustments).where(and(
    eq(hrPayrollAdjustments.employeeId, params.employeeId),
    eq(hrPayrollAdjustments.payrollMonth, run.payrollMonth)
  ));

  const attendance = await db.select().from(hrAttendance).where(and(
    eq(hrAttendance.employeeId, params.employeeId)
  ));
  const monthAttendance = attendance.filter((a) => a.attendanceDate >= run.periodFrom && a.attendanceDate <= run.periodTo);

  return {
    run,
    line: lineRow.line,
    employee: lineRow.employee,
    department: lineRow.department,
    designation: lineRow.designation,
    adjustments,
    attendanceSummary: {
      totalMarkedDays: monthAttendance.length,
      presentDays: monthAttendance.filter((a) => a.status === "Present" || a.status === "Weekly Off" || a.status === "Holiday").length,
      halfDays: monthAttendance.filter((a) => a.status === "Half Day").length,
      absentDays: monthAttendance.filter((a) => a.status === "Absent").length,
      totalOvertimeHours: monthAttendance.reduce((sum, a) => sum + Number(a.overtimeHours || 0), 0),
    },
  };
}


// ----------------- HR & PAYROLL PHASE 4 -----------------
export async function getHrPayoutBatches(params?: { payrollRunId?: number; status?: string }) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    batch: hrPayoutBatches,
    run: hrPayrollRuns,
  }).from(hrPayoutBatches)
    .leftJoin(hrPayrollRuns, eq(hrPayoutBatches.payrollRunId, hrPayrollRuns.id))
    .orderBy(desc(hrPayoutBatches.createdAt));

  return rows.filter((r) => {
    if (params?.payrollRunId && r.batch.payrollRunId !== params.payrollRunId) return false;
    if (params?.status && r.batch.status !== params.status) return false;
    return true;
  });
}

export async function getHrPayoutLines(payoutBatchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    line: hrPayoutLines,
    employee: hrEmployees,
  }).from(hrPayoutLines)
    .leftJoin(hrEmployees, eq(hrPayoutLines.employeeId, hrEmployees.id))
    .where(eq(hrPayoutLines.payoutBatchId, payoutBatchId))
    .orderBy(hrPayoutLines.id);
}

export async function generateHrPayoutBatch(params: { payrollRunId: number; userId?: number; remarks?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const [run] = await db.select().from(hrPayrollRuns).where(eq(hrPayrollRuns.id, params.payrollRunId)).limit(1);
  if (!run) throw new Error("Payroll run not found");
  if (run.status !== "Approved" && run.status !== "Paid") {
    throw new Error("Only approved or paid payroll runs can generate a bank payout batch");
  }

  const existing = await db.select().from(hrPayoutBatches).where(eq(hrPayoutBatches.payrollRunId, params.payrollRunId)).limit(1);
  if (existing.length > 0) {
    return {
      id: existing[0]!.id,
      batchReference: existing[0]!.batchReference,
      alreadyExisted: true,
      totalAmount: existing[0]!.totalAmount,
      employeeCount: existing[0]!.employeeCount,
    };
  }

  const lines = await db.select({
    payrollLine: hrPayrollLines,
    employee: hrEmployees,
  }).from(hrPayrollLines)
    .leftJoin(hrEmployees, eq(hrPayrollLines.employeeId, hrEmployees.id))
    .where(eq(hrPayrollLines.payrollRunId, params.payrollRunId));

  const batchReference = `PAYOUT-${run.payrollMonth}-${Date.now().toString().slice(-4)}`;
  const payableLines = lines.filter((l) => Number(l.payrollLine.netAmount) > 0);
  const totalAmount = payableLines.reduce((sum, l) => sum + Number(l.payrollLine.netAmount), 0);

  const [batchRes] = await db.insert(hrPayoutBatches).values({
    payrollRunId: params.payrollRunId,
    batchReference,
    status: "Draft",
    employeeCount: payableLines.length,
    totalAmount: totalAmount.toFixed(2),
    createdBy: params.userId ?? null,
    remarks: params.remarks ?? `Generated bank payout for ${run.payrollMonth}`,
  });

  const payoutBatchId = (batchRes as any)?.insertId;

  for (const item of payableLines) {
    await db.insert(hrPayoutLines).values({
      payoutBatchId,
      payrollLineId: item.payrollLine.id,
      employeeId: item.employee ? item.employee.id : item.payrollLine.employeeId,
      beneficiaryName: item.employee?.fullName || "Employee",
      bankName: item.employee?.bankName || null,
      accountLast4: item.employee?.accountLast4 || null,
      ifscCode: item.employee?.ifscCode || null,
      amount: item.payrollLine.netAmount,
      transferReference: null,
      status: "Ready",
      remarks: `${item.employee?.payBasis || "Monthly"} Net Pay`,
    });
  }

  return {
    id: payoutBatchId,
    batchReference,
    employeeCount: payableLines.length,
    totalAmount: totalAmount.toFixed(2),
    alreadyExisted: false,
  };
}

export async function updateHrPayoutBatchStatus(id: number, status: "Exported" | "Submitted" | "Paid" | "Cancelled") {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const now = new Date();
  const updateData: any = { status, updatedAt: now };
  if (status === "Exported") updateData.exportedAt = now;
  if (status === "Submitted") updateData.submittedAt = now;
  if (status === "Paid") {
    updateData.paidAt = now;
    // Mark parent payroll run paid as well
    const [batch] = await db.select().from(hrPayoutBatches).where(eq(hrPayoutBatches.id, id)).limit(1);
    if (batch?.payrollRunId) {
      await db.update(hrPayrollRuns).set({ status: "Paid", updatedAt: now }).where(eq(hrPayrollRuns.id, batch.payrollRunId));
    }
  }

  await db.update(hrPayoutBatches).set(updateData).where(eq(hrPayoutBatches.id, id));
  return { id, status };
}

export async function getHrMusterMatrix(params: { month: string; roadId?: number }) {
  const db = await getDb();
  if (!db) return { days: [], matrix: [] };

  const [yearStr, monthStr] = params.month.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const daysInMonth = new Date(year, month, 0).getDate();

  const days: string[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(`${params.month}-${String(i).padStart(2, "0")}`);
  }

  const employees = await db.select({
    employee: hrEmployees,
    department: hrDepartments,
    designation: hrDesignations,
  }).from(hrEmployees)
    .leftJoin(hrDepartments, eq(hrEmployees.departmentId, hrDepartments.id))
    .leftJoin(hrDesignations, eq(hrEmployees.designationId, hrDesignations.id))
    .where(eq(hrEmployees.status, "Active"))
    .orderBy(hrEmployees.employeeCode);

  const allAttendance = await db.select().from(hrAttendance);
  const monthAttendance = allAttendance.filter((a) => a.attendanceDate >= days[0]! && a.attendanceDate <= days[days.length - 1]!);

  const matrix = employees.map((emp) => {
    const empAtt = monthAttendance.filter((a) => a.employeeId === emp.employee.id);
    const dayMap: Record<string, string> = {};
    let presentCount = 0;
    let halfDayCount = 0;
    let absentCount = 0;
    let totalOt = 0;

    days.forEach((day) => {
      const rec = empAtt.find((a) => a.attendanceDate === day);
      if (!rec) {
        dayMap[day] = "—";
      } else {
        if (rec.status === "Present" || rec.status === "Weekly Off" || rec.status === "Holiday") {
          dayMap[day] = rec.status === "Present" ? "P" : rec.status === "Weekly Off" ? "WO" : "H";
          presentCount += 1;
        } else if (rec.status === "Half Day") {
          dayMap[day] = "HD";
          halfDayCount += 1;
        } else if (rec.status === "Absent") {
          dayMap[day] = "A";
          absentCount += 1;
        } else {
          dayMap[day] = "L";
        }
        totalOt += Number(rec.overtimeHours || 0);
      }
    });

    const payableDays = empAtt.length > 0
      ? presentCount + (halfDayCount * 0.5)
      : (emp.employee.payBasis === "Monthly" ? daysInMonth : (presentCount > 0 ? presentCount : 0));

    return {
      employee: emp.employee,
      department: emp.department?.name,
      designation: emp.designation?.name || emp.employee.employmentType,
      dayMap,
      presentCount,
      halfDayCount,
      absentCount,
      totalOt,
      payableDays,
    };
  });

  return { days, matrix };
}

export async function getHrGroupSettlements(params?: { projectId?: number; roadId?: number; status?: string }) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    settlement: hrGroupSettlements,
    project: projects,
    road: roads,
  }).from(hrGroupSettlements)
    .leftJoin(projects, eq(hrGroupSettlements.projectId, projects.id))
    .leftJoin(roads, eq(hrGroupSettlements.roadId, roads.id))
    .orderBy(desc(hrGroupSettlements.createdAt));

  return rows.filter((r) => {
    if (params?.projectId && r.settlement.projectId !== params.projectId) return false;
    if (params?.roadId && r.settlement.roadId !== params.roadId) return false;
    if (params?.status && r.settlement.status !== params.status) return false;
    return true;
  });
}

export async function createHrGroupSettlement(data: InsertHrGroupSettlement) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.insert(hrGroupSettlements).values(data);
}

export async function updateHrGroupSettlementStatus(id: number, status: "Approved" | "Paid" | "Rejected", userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.update(hrGroupSettlements).set({
    status,
    approvedBy: userId ?? null,
    approvedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(hrGroupSettlements.id, id));
}

/**
 * Get RA bill export data in the user's Excel measurement-sheet format.
 * Returns per-road: items with detailed measurements, split into Previous (before periodFrom)
 * and Current (within period), plus Up-to-date totals.
 */
export async function getRaBillExportData(params: {
  projectId: number;
  roadIds?: number[];
  periodFrom: string; // YYYY-MM-DD
  periodTo: string;   // YYYY-MM-DD
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  // Get roads
  const roadCond = params.roadIds && params.roadIds.length > 0
    ? and(eq(roads.projectId, params.projectId), sql`${roads.id} IN (${sql.join(params.roadIds.map(id => sql`${id}`), sql`, `)})`)
    : eq(roads.projectId, params.projectId);
  const roadRows = await db.select().from(roads).where(roadCond).orderBy(roads.id);

  const result: Array<{
    roadId: number;
    roadCode: string;
    roadName: string;
    items: Array<{
      boqItemId: number;
      itemCode: string;
      sor: string;
      description: string;
      unit: string;
      rate: number;
      measurements: Array<{
        mbNo: string;
        location: string;
        nos: number | null;
        length: number | null;
        width: number | null;
        depth: number | null;
        quantity: number;
      }>;
      previousQty: number;
      currentQty: number;
      uptoQty: number;
      previousAmt: number;
      currentAmt: number;
      uptoAmt: number;
    }>;
    roadTotal: { previousAmt: number; currentAmt: number; uptoAmt: number };
  }> = [];

  for (const road of roadRows) {
    // Get all approved e-MB entries for this road
    const entries = await db.select({
      entry: measurementEntries,
      boq: boqItems,
    }).from(measurementEntries)
      .leftJoin(boqItems, eq(measurementEntries.boqItemId, boqItems.id))
      .where(and(
        eq(measurementEntries.roadId, road.id),
        eq(measurementEntries.status, "Approved")
      ))
      .orderBy(measurementEntries.mbDate, measurementEntries.id);

    // Group by BOQ item
    const byItem = new Map<number, {
      boq: typeof boqItems.$inferSelect;
      prevMeasurements: typeof entries;
      currMeasurements: typeof entries;
    }>();

    for (const { entry, boq } of entries) {
      if (!boq) continue;
      const isCurrent = entry.mbDate >= params.periodFrom && entry.mbDate <= params.periodTo;
      const isPrevious = entry.mbDate < params.periodFrom;
      if (!isCurrent && !isPrevious) continue; // after periodTo, skip

      if (!byItem.has(boq.id)) {
        byItem.set(boq.id, { boq, prevMeasurements: [], currMeasurements: [] });
      }
      const g = byItem.get(boq.id)!;
      if (isCurrent) g.currMeasurements.push({ entry, boq } as any);
      else g.prevMeasurements.push({ entry, boq } as any);
    }

    const items: typeof result[0]["items"] = [];
    let roadPrev = 0, roadCurr = 0, roadUpto = 0;

    for (const [boqId, g] of Array.from(byItem.entries())) {
      const rate = parseFloat(String(g.boq.rate || "0"));
      const prevQty = g.prevMeasurements.reduce((s: number, r: any) => s + parseFloat(String(r.entry.calculatedQuantity || "0")), 0);
      const currQty = g.currMeasurements.reduce((s: number, r: any) => s + parseFloat(String(r.entry.calculatedQuantity || "0")), 0);
      const uptoQty = prevQty + currQty;

      if (uptoQty <= 0) continue;

      const prevAmt = parseFloat((prevQty * rate).toFixed(2));
      const currAmt = parseFloat((currQty * rate).toFixed(2));
      const uptoAmt = parseFloat((uptoQty * rate).toFixed(2));

      roadPrev += prevAmt;
      roadCurr += currAmt;
      roadUpto += uptoAmt;

      // Detailed measurements for the CURRENT bill (these go on the measurement sheet)
      const measurements = g.currMeasurements.map((r: any) => {
        const e = r.entry;
        // NOS: derive from qty / (L*W*D) if possible, else null
        const l = parseFloat(String(e.length || "0"));
        const w = parseFloat(String(e.width || "0"));
        const d = parseFloat(String(e.depth || "0"));
        const q = parseFloat(String(e.calculatedQuantity || "0"));
        let nos: number | null = null;
        const lwd = l * w * d;
        if (lwd > 0 && q > 0) {
          const n = q / lwd;
          // Only use if it's close to an integer (else the qty was entered directly)
          if (Math.abs(n - Math.round(n)) < 0.01) nos = Math.round(n);
        }
        return {
          mbNo: e.mbNo,
          location: e.locationFrom || "",
          nos,
          length: l > 0 ? l : null,
          width: w > 0 ? w : null,
          depth: d > 0 ? d : null,
          quantity: q,
        };
      });

      // Extract SOR from itemCode (format: ROADCODE-SOR)
      const itemCode = g.boq.itemCode || "";
      const sor = itemCode.includes("-") ? itemCode.split("-").slice(1).join("-") : itemCode;

      items.push({
        boqItemId: boqId,
        itemCode,
        sor,
        description: g.boq.description || "",
        unit: g.boq.unit || "",
        rate,
        measurements,
        previousQty: parseFloat(prevQty.toFixed(3)),
        currentQty: parseFloat(currQty.toFixed(3)),
        uptoQty: parseFloat(uptoQty.toFixed(3)),
        previousAmt: prevAmt,
        currentAmt: currAmt,
        uptoAmt: uptoAmt,
      });
    }

    // Sort items by SOR for consistent output
    items.sort((a, b) => a.sor.localeCompare(b.sor, undefined, { numeric: true }));

    if (items.length > 0) {
      result.push({
        roadId: road.id,
        roadCode: road.roadId,
        roadName: road.roadName,
        items,
        roadTotal: {
          previousAmt: parseFloat(roadPrev.toFixed(2)),
          currentAmt: parseFloat(roadCurr.toFixed(2)),
          uptoAmt: parseFloat(roadUpto.toFixed(2)),
        },
      });
    }
  }

  return result;
}


// ----------------- RATE ANALYSIS (QS Module) -----------------
export async function getRateAnalyses(projectId?: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(rateAnalyses).orderBy(rateAnalyses.analysisNo);
  const filtered = projectId ? rows.filter(r => r.projectId === projectId) : rows;
  // Attach component count + total amount per analysis for the list view
  const result = [];
  for (const a of filtered) {
    const comps = await db.select({
      amount: rateAnalysisComponents.amount,
    }).from(rateAnalysisComponents).where(eq(rateAnalysisComponents.analysisId, a.id));
    const total = comps.reduce((s, c) => s + parseFloat(String(c.amount || "0")), 0);
    const ohPct = parseFloat(String(a.overheadPct || "0"));
    const pPct = parseFloat(String(a.profitPct || "0"));
    const grand = total * (1 + ohPct / 100) * (1 + pPct / 100);
    result.push({ ...a, componentCount: comps.length, totalAmount: total.toFixed(2), grandTotal: grand.toFixed(2) });
  }
  return result;
}

export async function getRateAnalysisWithComponents(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [analysis] = await db.select().from(rateAnalyses).where(eq(rateAnalyses.id, id)).limit(1);
  if (!analysis) return null;
  const components = await db.select().from(rateAnalysisComponents)
    .where(eq(rateAnalysisComponents.analysisId, id))
    .orderBy(rateAnalysisComponents.sortOrder, rateAnalysisComponents.id);
  return { analysis, components };
}

export async function createRateAnalysis(data: InsertRateAnalysis) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const res = await db.insert(rateAnalyses).values(data);
  const insertId = (res as any)[0]?.insertId;
  if (insertId) {
    const [row] = await db.select().from(rateAnalyses).where(eq(rateAnalyses.id, insertId)).limit(1);
    return row;
  }
  return null;
}

export async function updateRateAnalysis(id: number, data: Partial<InsertRateAnalysis>) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  await db.update(rateAnalyses).set(data).where(eq(rateAnalyses.id, id));
  const [row] = await db.select().from(rateAnalyses).where(eq(rateAnalyses.id, id)).limit(1);
  return row;
}

export async function deleteRateAnalysis(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  await db.delete(rateAnalysisComponents).where(eq(rateAnalysisComponents.analysisId, id));
  return db.delete(rateAnalyses).where(eq(rateAnalyses.id, id));
}

export async function addRateAnalysisComponent(data: InsertRateAnalysisComponent) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  // Auto-compute amount = coefficient x rate
  const coeff = parseFloat(String(data.coefficient || "0"));
  const rate = parseFloat(String(data.rate || "0"));
  const withAmount = { ...data, amount: (coeff * rate).toFixed(2) };
  return db.insert(rateAnalysisComponents).values(withAmount);
}

export async function updateRateAnalysisComponent(id: number, data: Partial<InsertRateAnalysisComponent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const [existing] = await db.select().from(rateAnalysisComponents).where(eq(rateAnalysisComponents.id, id)).limit(1);
  if (!existing) throw new Error("Component not found");
  const coeff = data.coefficient !== undefined ? parseFloat(String(data.coefficient)) : parseFloat(String(existing.coefficient || "0"));
  const rate = data.rate !== undefined ? parseFloat(String(data.rate)) : parseFloat(String(existing.rate || "0"));
  const withAmount = { ...data, amount: (coeff * rate).toFixed(2) };
  return db.update(rateAnalysisComponents).set(withAmount).where(eq(rateAnalysisComponents.id, id));
}

export async function deleteRateAnalysisComponent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.delete(rateAnalysisComponents).where(eq(rateAnalysisComponents.id, id));
}

/** Seed 3 empty SOR template analyses (headers only, zero components — user fills from SOR). Idempotent. */
export async function seedRateAnalysisTemplates(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const existing = await db.select().from(rateAnalyses).where(eq(rateAnalyses.projectId, projectId)).limit(1);
  if (existing.length > 0) return { seeded: 0, message: "Templates already exist for this project." };
  const templates: InsertRateAnalysis[] = [
    { projectId, analysisNo: "RA-GSB-001", description: "Granular Sub-Base (GSB) — grading as per MORTH Table 400-1", unit: "Cum", sorRef: "MORTH 401", leadKm: "0.00", overheadPct: "0.00", profitPct: "0.00", status: "Draft", remarks: "Fill coefficients from SOR" },
    { projectId, analysisNo: "RA-WMM-001", description: "Wet Mix Macadam (WMM) — as per MORTH 406", unit: "Cum", sorRef: "MORTH 406", leadKm: "0.00", overheadPct: "0.00", profitPct: "0.00", status: "Draft", remarks: "Fill coefficients from SOR" },
    { projectId, analysisNo: "RA-PCC-001", description: "PCC 1:4:8 in foundation — as per MORTH 409", unit: "Cum", sorRef: "MORTH 409", leadKm: "0.00", overheadPct: "0.00", profitPct: "0.00", status: "Draft", remarks: "Fill coefficients from SOR" },
  ];
  for (const t of templates) {
    await db.insert(rateAnalyses).values(t);
  }
  return { seeded: templates.length, message: `Seeded ${templates.length} SOR template analyses.` };
}
