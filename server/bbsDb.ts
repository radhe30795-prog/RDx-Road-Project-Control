/**
 * BBS (Bar Bending Schedule) — DB helpers.
 * Kept in a separate module so server/db.ts stays under the GitHub push size limit.
 * One-way dependency: this module imports getDb from ./db (no cycle).
 *
 * Standard QS formulas:
 *   hookAllowance(mm) = dia × shapeMultiplier, where one 90° hook = 9d (IS 2502)
 *     Straight 0d | L-bend 18d (2 hooks) | U-bend 27d (3 hooks)
 *     Stirrup 24d (2 hooks + 2 × 135° bends @ 3d) | Crank 18.84d (2 hooks + 2 cranks @ 0.42d)
 *   totalLength(m) = nos × (lengthEach + hookAllowance/1000)
 *   weightKg = dia²/162 × totalLength
 */
import { getDb } from "./db";
import { eq, desc, asc } from "drizzle-orm";
import {
  bbsSchedules, InsertBbsSchedule,
  bbsBars, InsertBbsBar,
} from "../drizzle/schema";

export const BBS_SHAPES = ["Straight", "L-bend", "U-bend", "Stirrup", "Crank"] as const;
export type BbsShape = typeof BBS_SHAPES[number];

const SHAPE_HOOKS: Record<BbsShape, number> = {
  Straight: 0,
  "L-bend": 2,
  "U-bend": 3,
  Stirrup: 2,
  Crank: 2,
};
const SHAPE_BENDS135: Record<BbsShape, number> = {
  Straight: 0,
  "L-bend": 0,
  "U-bend": 0,
  Stirrup: 2,
  Crank: 0,
};
const SHAPE_CRANKS: Record<BbsShape, number> = {
  Straight: 0,
  "L-bend": 0,
  "U-bend": 0,
  Stirrup: 0,
  Crank: 2,
};

export function shapeMultiplierD(shape: BbsShape): number {
  return SHAPE_HOOKS[shape] * 9 + SHAPE_BENDS135[shape] * 3 + SHAPE_CRANKS[shape] * 0.42;
}

export interface BbsCalc {
  hookAllowanceMm: number;
  totalLengthM: number;
  weightKg: number;
}

export function calcBar(dia: number, nos: number, lengthEach: number, shape: BbsShape): BbsCalc {
  const d = Math.max(0, dia);
  const n = Math.max(0, Math.floor(nos));
  const hookAllowanceMm = d * shapeMultiplierD(shape);
  const totalLengthM = n * (Math.max(0, lengthEach) + hookAllowanceMm / 1000);
  const weightKg = (d * d / 162) * totalLengthM;
  return {
    hookAllowanceMm: Math.round(hookAllowanceMm * 10) / 10,
    totalLengthM: Math.round(totalLengthM * 1000) / 1000,
    weightKg: Math.round(weightKg * 100) / 100,
  };
}

export async function listBbsSchedules(projectId?: number, roadId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const rows = await db.select().from(bbsSchedules).orderBy(desc(bbsSchedules.id));
  let filtered = rows;
  if (projectId) filtered = filtered.filter((r) => Number(r.projectId) === Number(projectId));
  if (roadId) filtered = filtered.filter((r) => Number(r.roadId) === Number(roadId));
  return filtered;
}

export async function createBbsSchedule(data: InsertBbsSchedule) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const res: any = await db.insert(bbsSchedules).values(data);
  const id = Number(res?.[0]?.insertId || 0);
  const rows = await db.select().from(bbsSchedules).where(eq(bbsSchedules.id, id)).limit(1);
  return rows[0] || { id };
}

export async function updateBbsSchedule(id: number, data: Partial<InsertBbsSchedule>) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  await db.update(bbsSchedules).set({ ...data, updatedAt: new Date() }).where(eq(bbsSchedules.id, id));
  return { ok: true };
}

export async function deleteBbsSchedule(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  await db.delete(bbsBars).where(eq(bbsBars.scheduleId, id));
  await db.delete(bbsSchedules).where(eq(bbsSchedules.id, id));
  return { ok: true };
}

export async function listBbsBars(scheduleId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.select().from(bbsBars)
    .where(eq(bbsBars.scheduleId, scheduleId))
    .orderBy(asc(bbsBars.sortOrder), asc(bbsBars.id));
}

export async function addBbsBar(data: InsertBbsBar) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const calc = calcBar(
    parseFloat(String(data.dia || 0)),
    Number(data.nos || 0),
    parseFloat(String(data.lengthEach || 0)),
    (data.shape as BbsShape) || "Straight",
  );
  const res: any = await db.insert(bbsBars).values({
    ...data,
    hookAllowance: calc.hookAllowanceMm.toFixed(1),
    totalLength: calc.totalLengthM.toFixed(3),
    weightKg: calc.weightKg.toFixed(2),
  });
  const id = Number(res?.[0]?.insertId || 0);
  const rows = await db.select().from(bbsBars).where(eq(bbsBars.id, id)).limit(1);
  return rows[0] || { id };
}

export async function updateBbsBar(id: number, data: Partial<InsertBbsBar>) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const existing = await db.select().from(bbsBars).where(eq(bbsBars.id, id)).limit(1);
  if (existing.length === 0) throw new Error("Bar not found");
  const merged = { ...existing[0], ...data };
  const calc = calcBar(
    parseFloat(String(merged.dia || 0)),
    Number(merged.nos || 0),
    parseFloat(String(merged.lengthEach || 0)),
    (merged.shape as BbsShape) || "Straight",
  );
  await db.update(bbsBars).set({
    ...data,
    hookAllowance: calc.hookAllowanceMm.toFixed(1),
    totalLength: calc.totalLengthM.toFixed(3),
    weightKg: calc.weightKg.toFixed(2),
    updatedAt: new Date(),
  }).where(eq(bbsBars.id, id));
  return { ok: true };
}

export async function deleteBbsBar(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  await db.delete(bbsBars).where(eq(bbsBars.id, id));
  return { ok: true };
}

export interface BbsSummary {
  byDia: { dia: string; totalLength: number; weightKg: number; bars: number }[];
  totalLength: number;
  totalWeightKg: number;
  totalWeightMT: number;
  totalBars: number;
}

export async function bbsSummary(scheduleId: number): Promise<BbsSummary> {
  const bars = await listBbsBars(scheduleId);
  const map = new Map<string, { dia: string; totalLength: number; weightKg: number; bars: number }>();
  let totalLength = 0, totalWeightKg = 0, totalBars = 0;
  for (const b of bars) {
    const diaKey = String(b.dia);
    const len = parseFloat(String(b.totalLength || 0));
    const wt = parseFloat(String(b.weightKg || 0));
    const n = Number(b.nos || 0);
    totalLength += len; totalWeightKg += wt; totalBars += n;
    const e = map.get(diaKey) || { dia: diaKey, totalLength: 0, weightKg: 0, bars: 0 };
    e.totalLength += len; e.weightKg += wt; e.bars += n;
    map.set(diaKey, e);
  }
  const byDia = Array.from(map.values())
    .map((e) => ({
      ...e,
      totalLength: Math.round(e.totalLength * 1000) / 1000,
      weightKg: Math.round(e.weightKg * 100) / 100,
    }))
    .sort((a, b) => parseFloat(a.dia) - parseFloat(b.dia));
  return {
    byDia,
    totalLength: Math.round(totalLength * 1000) / 1000,
    totalWeightKg: Math.round(totalWeightKg * 100) / 100,
    totalWeightMT: Math.round((totalWeightKg / 1000) * 1000) / 1000,
    totalBars,
  };
}
