/**
 * Subcontractor RA Billing — write helpers (kept in a separate module so
 * server/db.ts stays under the GitHub push size limit).
 * One-way dependency: this module imports getDb from ./db (no cycle).
 */
import { getDb } from "./db";
import { eq, desc } from "drizzle-orm";
import {
  subcontractorBills, InsertSubcontractorBill,
  subcontractorBillItems, InsertSubcontractorBillItem,
  workOrders,
} from "../drizzle/schema";

export async function recalcSubcontractorBill(billId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const billRows = await db.select().from(subcontractorBills).where(eq(subcontractorBills.id, billId)).limit(1);
  if (billRows.length === 0) throw new Error("Bill not found");
  const bill = billRows[0];
  const items = await db.select().from(subcontractorBillItems).where(eq(subcontractorBillItems.billId, billId));
  const gross = items.reduce((s, it) => s + parseFloat(String(it.amount || 0)), 0);
  const isFinal = !!bill.isFinalBill;
  const retentionPct = isFinal ? 0 : parseFloat(String(bill.retentionPct || 0));
  const retention = (gross * retentionPct) / 100;
  const tdsPct = parseFloat(String(bill.tdsPct || 0));
  const tds = (gross * tdsPct) / 100;
  const other = parseFloat(String(bill.otherDeductions || 0));
  const net = Math.max(0, gross - retention - tds - other);
  await db.update(subcontractorBills).set({
    grossAmount: gross.toFixed(2),
    retentionAmount: retention.toFixed(2),
    tdsAmount: tds.toFixed(2),
    netPayable: net.toFixed(2),
    updatedAt: new Date(),
  }).where(eq(subcontractorBills.id, billId));
  return { gross, retention, tds, other, net };
}

export async function createSubcontractorBill(data: InsertSubcontractorBill) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const res = await db.insert(subcontractorBills).values(data);
  const insertId = ((res as any)[0]?.insertId ?? (res as any)?.insertId) as number | undefined;
  if (insertId) await recalcSubcontractorBill(insertId);
  return res;
}

export async function updateSubcontractorBill(id: number, data: Partial<InsertSubcontractorBill>) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  // Never allow direct jump to Paid — must go through markSubcontractorBillPaid
  const set: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (set.status === "Paid") delete set.status;
  await db.update(subcontractorBills).set(set).where(eq(subcontractorBills.id, id));
  // Recompute totals when money-affecting fields change
  if (data.retentionPct !== undefined || data.tdsPct !== undefined || data.otherDeductions !== undefined || data.isFinalBill !== undefined) {
    await recalcSubcontractorBill(id);
  }
  return { ok: true };
}

export async function deleteSubcontractorBill(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const rows = await db.select().from(subcontractorBills).where(eq(subcontractorBills.id, id)).limit(1);
  if (rows.length > 0 && rows[0].status === "Paid") throw new Error("Paid bill cannot be deleted");
  await db.delete(subcontractorBillItems).where(eq(subcontractorBillItems.billId, id));
  return db.delete(subcontractorBills).where(eq(subcontractorBills.id, id));
}

export async function createSubcontractorBillItem(data: InsertSubcontractorBillItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const qty = parseFloat(String(data.qty || 0));
  const rate = parseFloat(String(data.rate || 0));
  const res = await db.insert(subcontractorBillItems).values({ ...data, amount: (qty * rate).toFixed(2) });
  await recalcSubcontractorBill(data.billId as number);
  return res;
}

export async function updateSubcontractorBillItem(id: number, data: Partial<InsertSubcontractorBillItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const rows = await db.select().from(subcontractorBillItems).where(eq(subcontractorBillItems.id, id)).limit(1);
  if (rows.length === 0) throw new Error("Bill item not found");
  const cur = rows[0];
  const qty = parseFloat(String(data.qty ?? cur.qty ?? 0));
  const rate = parseFloat(String(data.rate ?? cur.rate ?? 0));
  await db.update(subcontractorBillItems).set({ ...data, amount: (qty * rate).toFixed(2) }).where(eq(subcontractorBillItems.id, id));
  await recalcSubcontractorBill(cur.billId as number);
  return { ok: true };
}

export async function deleteSubcontractorBillItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const rows = await db.select().from(subcontractorBillItems).where(eq(subcontractorBillItems.id, id)).limit(1);
  if (rows.length === 0) return { ok: true };
  const billId = rows[0].billId as number;
  await db.delete(subcontractorBillItems).where(eq(subcontractorBillItems.id, id));
  await recalcSubcontractorBill(billId);
  return { ok: true };
}

/**
 * Mark bill Paid: WO.paidAmount += netPayable, WO.retentionAmount += bill retention.
 * Final bill: previously held retention is released (hold -> 0, released amount paid out).
 */
export async function markSubcontractorBillPaid(billId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const billRows = await db.select().from(subcontractorBills).where(eq(subcontractorBills.id, billId)).limit(1);
  if (billRows.length === 0) throw new Error("Bill not found");
  const bill = billRows[0];
  if (bill.status === "Paid") throw new Error("Bill is already paid");
  const woRows = await db.select().from(workOrders).where(eq(workOrders.id, bill.workOrderId as number)).limit(1);
  if (woRows.length === 0) throw new Error("Work order not found");
  const wo = woRows[0];
  const net = parseFloat(String(bill.netPayable || 0));
  const billRetention = parseFloat(String(bill.retentionAmount || 0));
  const curPaid = parseFloat(String(wo.paidAmount || 0));
  const curRetention = parseFloat(String(wo.retentionAmount || 0));
  const today = new Date().toISOString().slice(0, 10);

  let newPaid = curPaid + net;
  let newRetention = curRetention + billRetention;
  let note = `Payment ₹${net.toLocaleString("en-IN")} on ${today}: RA bill ${bill.billNo}`;
  if (bill.isFinalBill) {
    // Release all held retention on final bill — hold amount becomes 0
    const released = newRetention;
    newPaid += released;
    newRetention = 0;
    note += ` | Retention ₹${released.toLocaleString("en-IN")} released (final bill)`;
  }
  const prevRemarks = String(wo.remarks || "").trim();
  await db.update(workOrders).set({
    paidAmount: newPaid.toFixed(2),
    retentionAmount: newRetention.toFixed(2),
    updatedAt: new Date(),
    remarks: prevRemarks ? `${prevRemarks}\n${note}` : note,
  }).where(eq(workOrders.id, wo.id));
  await db.update(subcontractorBills).set({ status: "Paid", updatedAt: new Date() }).where(eq(subcontractorBills.id, billId));
  return { ok: true, paid: net, retentionReleased: bill.isFinalBill ? curRetention + billRetention : 0 };
}
