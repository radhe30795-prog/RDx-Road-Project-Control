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

describe("Phase 3 ERP Automations: Subcontractors, Machinery Logbook & Digital Sign-off", () => {
  const ctx = createMockContext("admin");
  const caller = appRouter.createCaller(ctx);

  it("1. registers subcontractor and issues a piece-rate work order with automated amount calculation", async () => {
    const roads = await caller.roads.list();
    const targetRoad = roads[0];

    const subCode = `SUB-TEST-${Date.now().toString().slice(-4)}`;
    await caller.subcontractors.create({
      subcontractorCode: subCode,
      projectId: targetRoad.projectId,
      name: "Test Earthmoving Co",
      workCategory: "Earthwork",
      contactPerson: "Foreman Singh",
      phone: "+91 99999 11111",
      status: "Active",
    });

    const subs = await caller.subcontractors.list();
    const createdSub = subs.find((s) => s.subcontractorCode === subCode);
    expect(createdSub).toBeDefined();

    const woNo = `WO-TEST-${Date.now().toString().slice(-4)}`;
    await caller.subcontractors.createWorkOrder({
      workOrderNo: woNo,
      projectId: targetRoad.projectId,
      roadId: targetRoad.id,
      subcontractorId: createdSub!.id,
      scope: "Subgrade excavation and rolling",
      unit: "Cum",
      awardedQuantity: "5000.000",
      rate: "120.00",
      startDate: "2026-09-01",
      targetDate: "2026-10-31",
      status: "Issued",
    });

    const woList = await caller.subcontractors.workOrdersList({ roadId: targetRoad.id });
    const createdWo = woList.find((w) => w.wo.workOrderNo === woNo);
    expect(createdWo).toBeDefined();
    expect(parseFloat(String(createdWo?.wo.awardedAmount))).toBeCloseTo(600000.0, 1); // 5000 * 120 = 600,000
  }, 20000);

  it("2. records machinery log and computes net hours, fuel efficiency and updates asset hour meter", async () => {
    const roads = await caller.roads.list();
    const targetRoad = roads[0];

    const assetNo = `EQ-TEST-${Date.now().toString().slice(-4)}`;
    await caller.machinery.createAsset({
      assetNo,
      projectId: targetRoad.projectId,
      assetType: "Vibratory Soil Roller",
      makeModel: "CASE 1107EX",
      currentRoadId: targetRoad.id,
      openingHourMeter: "100.00",
      expectedFuelPerHour: "11.00",
      status: "Available",
      operator: "Test Operator",
    });

    const assets = await caller.machinery.assetsList();
    const createdAsset = assets.find((a) => a.asset.assetNo === assetNo);
    expect(createdAsset).toBeDefined();

    const logNo = `LOG-TEST-${Date.now().toString().slice(-4)}`;
    await caller.machinery.createLog({
      logNo,
      logDate: "2026-09-27",
      projectId: targetRoad.projectId,
      roadId: targetRoad.id,
      assetId: createdAsset!.asset.id,
      openingHourMeter: "100.00",
      closingHourMeter: "108.00", // 8 hours work
      fuelIssued: "88.00", // 88 / 8 = 11.00 L/hr
      fuelRate: "92.00",
      operator: "Test Operator",
      workDescription: "Compacting subgrade test stretch",
    });

    const logs = await caller.machinery.logsList({ roadId: targetRoad.id });
    const createdLog = logs.find((l) => l.log.logNo === logNo);
    expect(createdLog).toBeDefined();
    expect(parseFloat(String(createdLog?.log.workHours))).toBeCloseTo(8.0, 1);
    expect(parseFloat(String(createdLog?.log.fuelEfficiency))).toBeCloseTo(11.0, 1);
    expect(createdLog?.log.utilizationStatus).toBe("Efficient");

    // Asset hour meter should now be updated to 108.00
    const updatedAssets = await caller.machinery.assetsList();
    const refreshedAsset = updatedAssets.find((a) => a.asset.assetNo === assetNo);
    expect(parseFloat(String(refreshedAsset?.asset.currentHourMeter))).toBeCloseTo(108.0, 1);
  }, 20000);

  it("3. handles digital sign-off request, approval and audit certification trail", async () => {
    const testEntityId = `MB-SIGNOFF-${Date.now().toString().slice(-4)}`;
    await caller.signoffs.request({
      entityType: "e-MB Measurement Record",
      entityId: testEntityId,
      stage: "Field Level Verification",
      requestedBy: "site_engineer",
      assignedRole: "qs_billing_engineer",
      comments: "Please sign off chainage dimensions",
    });

    const list = await caller.signoffs.list({ entityType: "e-MB Measurement Record", entityId: testEntityId });
    expect(list.length).toBeGreaterThan(0);
    const signoffItem = list[0];
    expect(signoffItem.status).toBe("Pending");

    // Complete sign-off
    await caller.signoffs.complete({
      id: signoffItem.id,
      signedBy: "Senior QS Engineer",
      status: "Approved",
      comments: "All chainages verified on site.",
    });

    const updatedList = await caller.signoffs.list({ entityType: "e-MB Measurement Record", entityId: testEntityId });
    expect(updatedList[0].status).toBe("Approved");
    expect(updatedList[0].signedBy).toBe("Senior QS Engineer");
    expect(updatedList[0].signedAt).toBeDefined();
  }, 20000);
});
