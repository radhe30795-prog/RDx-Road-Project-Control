import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createTestContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-admin",
      email: "admin@rdx.local",
      name: "Admin Engineer",
      loginMethod: "google",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as any,
    res: { clearCookie: () => {} } as any,
  };
}

describe("Phase 1 ERP Automations & Linking", () => {
  it("computes BOQ item balance and contract amount automatically", async () => {
    const caller = appRouter.createCaller(createTestContext());
    const itemCode = `BOQ-TEST-${Date.now()}`;
    await caller.boq.create({
      itemCode,
      projectId: 1,
      chapter: "Chapter 4: Granular Sub-Base",
      description: "Test GSB layer execution",
      unit: "Cum",
      contractQuantity: "1000.000",
      rate: "900.00",
    });

    const list = await caller.boq.list({ projectId: 1 });
    const created = list.find((b) => b.boq.itemCode === itemCode);
    expect(created).toBeDefined();
    expect(parseFloat(String(created?.boq.contractAmount))).toBe(900000);
    expect(parseFloat(String(created?.boq.balanceQuantity))).toBe(1000);
  }, 15000);

  it("updates inventory stock automatically upon GRN receipt", async () => {
    const caller = appRouter.createCaller(createTestContext());
    const matCode = `MAT-TEST-${Date.now()}`;
    await caller.inventory.create({
      materialCode: matCode,
      projectId: 1,
      materialName: "Test Crushed Aggregate",
      unit: "MT",
      openingStock: "100.000",
      minStock: "50.000",
      maxStock: "1000.000",
      averageRate: "700.00",
    });

    const mats = await caller.inventory.list({ projectId: 1 });
    const mat = mats.find((m) => m.materialCode === matCode);
    expect(mat).toBeDefined();
    expect(parseFloat(String(mat?.balanceQuantity))).toBe(100);

    const grnNo = `GRN-TEST-${Date.now()}`;
    await caller.grn.create({
      grnNo,
      grnDate: "2026-09-27",
      projectId: 1,
      materialId: mat!.id,
      supplier: "Test Stone Quarry",
      receivedQuantity: "150.000",
      acceptedQuantity: "150.000",
      unit: "MT",
      rate: "720.00",
    });

    const updatedMats = await caller.inventory.list({ projectId: 1 });
    const updatedMat = updatedMats.find((m) => m.materialCode === matCode);
    expect(parseFloat(String(updatedMat?.receivedQuantity))).toBe(150);
    expect(parseFloat(String(updatedMat?.balanceQuantity))).toBe(250);
  }, 15000);

  it("links DPR entry to BOQ item and deducts material consumption from inventory", async () => {
    const caller = appRouter.createCaller(createTestContext());

    // 1. Create a BOQ item
    const boqCode = `BOQ-DPR-${Date.now()}`;
    await caller.boq.create({
      itemCode: boqCode,
      projectId: 1,
      chapter: "Chapter 4: Wet Mix Macadam",
      description: "WMM Base for DPR linking",
      unit: "Cum",
      contractQuantity: "500.000",
      rate: "1600.00",
    });
    const boqList = await caller.boq.list({ projectId: 1 });
    const boq = boqList.find((b) => b.boq.itemCode === boqCode)!.boq;

    // 2. Create a material
    const matCode = `MAT-DPR-${Date.now()}`;
    await caller.inventory.create({
      materialCode: matCode,
      projectId: 1,
      materialName: "WMM Aggregate Premix",
      unit: "Cum",
      openingStock: "400.000",
      minStock: "50.000",
      maxStock: "2000.000",
      averageRate: "1200.00",
    });
    const matList = await caller.inventory.list({ projectId: 1 });
    const mat = matList.find((m) => m.materialCode === matCode)!;

    // 3. Submit DPR linked to BOQ and material
    const clientDraftId = `dpr_test_link_${Date.now()}`;
    await caller.dailyProgress.create({
      clientDraftId,
      date: "2026-09-27",
      projectId: 1,
      roadId: 1,
      activityId: 1,
      boqItemId: boq.id,
      materialId: mat.id,
      materialConsumedQuantity: "60.000",
      plannedQuantity: "80.00",
      actualQuantity: "75.00",
      unit: "Cum",
      percentageComplete: "50.00",
    });

    // 4. Verify BOQ executedQuantity increased and balanceQuantity decreased
    const afterBoqList = await caller.boq.list({ projectId: 1 });
    const afterBoq = afterBoqList.find((b) => b.boq.id === boq.id)!.boq;
    expect(parseFloat(String(afterBoq.executedQuantity))).toBe(75);
    expect(parseFloat(String(afterBoq.balanceQuantity))).toBe(425);

    // 5. Verify Material Inventory issuedQuantity increased and balance decreased
    const afterMatList = await caller.inventory.list({ projectId: 1 });
    const afterMat = afterMatList.find((m) => m.id === mat.id)!;
    expect(parseFloat(String(afterMat.issuedQuantity))).toBe(60);
    expect(parseFloat(String(afterMat.balanceQuantity))).toBe(340);

    // 6. Verify material issue ledger entry
    const issues = await caller.materialIssues.list({ roadId: 1 });
    const linkedIssue = issues.find((i) => i.issue.materialId === mat.id);
    expect(linkedIssue).toBeDefined();
    expect(parseFloat(String(linkedIssue?.issue.quantity))).toBe(60);
  }, 15000);
});
