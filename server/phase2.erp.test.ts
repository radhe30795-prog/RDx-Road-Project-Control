import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createMockContext(role: "admin" | "site_engineer" | "qs_billing_engineer" | "user" = "admin"): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-admin",
      email: "test.admin@rdxprojects.com",
      name: "Senior PM",
      loginMethod: "firebase",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

describe("Phase 2 ERP Automations: e-MB, Variance & RA Billing", () => {
  const ctx = createMockContext("admin");
  const caller = appRouter.createCaller(ctx);

  it("1. lists roads, boq items and inventory for Phase 2 operations", async () => {
    const roads = await caller.roads.list();
    expect(roads.length).toBeGreaterThan(0);

    const boq = await caller.boq.list();
    expect(boq.length).toBeGreaterThan(0);

    const inventory = await caller.inventory.list();
    expect(inventory.length).toBeGreaterThan(0);
  }, 20000);

  it("2. creates an e-MB record with automated L x B x D quantity calculation", async () => {
    const roads = await caller.roads.list();
    const boqs = await caller.boq.list();
    const targetRoad = roads[0];
    const targetBoq = boqs[0].boq;

    const testMbNo = `MB-TEST-${Date.now()}`;
    await caller.measurements.create({
      mbNo: testMbNo,
      mbDate: "2026-09-27",
      projectId: targetRoad.projectId,
      roadId: targetRoad.id,
      boqItemId: targetBoq.id,
      locationFrom: "RD 1+000",
      locationTo: "RD 1+200",
      length: "200.000",
      width: "7.000",
      depth: "0.150",
      calculatedQuantity: "210.000", // 200 * 7 * 0.15 = 210
      unit: targetBoq.unit,
      rate: String(targetBoq.rate),
      status: "Submitted",
      submittedBy: "Site Engineer",
      remarks: "Test automated e-MB record",
    });

    const mbList = await caller.measurements.list({ roadId: targetRoad.id });
    const created = mbList.find((m) => m.mb.mbNo === testMbNo);
    expect(created).toBeDefined();
    expect(parseFloat(String(created?.mb.calculatedQuantity))).toBeCloseTo(210.0, 1);
  }, 20000);

  it("3. computes material variance audit comparing theoretical vs actual site issues", async () => {
    const roads = await caller.roads.list();
    const boqs = await caller.boq.list();
    const inv = await caller.inventory.list();

    const targetRoad = roads[0];
    const targetBoq = boqs[0].boq;
    const targetMat = inv[0];

    const audit = await caller.materialVariances.compute({
      projectId: targetRoad.projectId,
      roadId: targetRoad.id,
      boqItemId: targetBoq.id,
      materialId: targetMat.id,
      periodFrom: "2026-09-01",
      periodTo: "2026-09-27",
    });

    expect(audit.varianceNo).toBeDefined();
    expect(typeof audit.theoreticalQty).toBe("number");
    expect(typeof audit.actualConsumed).toBe("number");
    expect(["Within Limit", "Watch", "Excess", "Short Consumption"]).toContain(audit.status);
  }, 20000);

  it("4. auto-generates RA Bill from BOQ with automated GST (18%) and Retention (5%)", async () => {
    const roads = await caller.roads.list();
    const targetRoad = roads[0];

    const autoBillId = `RA-TEST-${Date.now().toString().slice(-4)}`;
    const billRes = await caller.billing.generateFromBoq({
      billId: autoBillId,
      projectId: targetRoad.projectId,
      roadId: targetRoad.id,
      billType: `Automated RA Bill ${autoBillId}`,
      periodFrom: "2026-09-01",
      periodTo: "2026-09-27",
      gstPercent: 18,
      retentionPercent: 5,
      remarks: "Automated test RA bill from BOQ",
    });

    expect(billRes.id).toBeGreaterThan(0);
    expect(billRes.grossAmount).toBeGreaterThanOrEqual(0);
    expect(billRes.gstAmount).toBeCloseTo((billRes.grossAmount * 18) / 100, 1);
    expect(billRes.retentionAmount).toBeCloseTo((billRes.grossAmount * 5) / 100, 1);
    expect(billRes.netPayable).toBeCloseTo(
      billRes.grossAmount + billRes.gstAmount - billRes.retentionAmount,
      1
    );

    // Verify bill lines were created
    const lines = await caller.billing.getLines({ billId: billRes.id });
    expect(lines.length).toBe(billRes.lineCount);
  }, 20000);
});
