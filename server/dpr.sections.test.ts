import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

function context(role: "admin" | "user" = "admin") {
  return {
    user: {
      id: 1,
      openId: "test-admin",
      email: "engineer@rdx.local",
      name: "Chief Project QS",
      loginMethod: "google",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: () => {} } as any,
  };
}

describe("DPR Sections & Date-wise Audit Endpoint", () => {
  it("creates sectioned DPR with billable quantity and retrieves by date", async () => {
    const caller = appRouter.createCaller(context());
    const testDate = "2026-09-25";

    // 1. Create Highway Works DPR entry (3.5km BT stretch)
    const resHw = await caller.dailyProgress.create({
      clientDraftId: `hw_test_${Date.now()}`,
      date: testDate,
      projectId: 1,
      roadId: 1,
      activityId: 1,
      sectionType: "Highway Works",
      chainageFrom: "0+000",
      chainageTo: "3+500",
      plannedQuantity: "500.00",
      actualQuantity: "480.00",
      billableQuantity: "480.00",
      billingStatus: "Ready for Bill",
      unit: "Cum",
      percentageComplete: "70.00",
      manpower: "1 Grader operator, 4 laborers",
      machinery: "CAT 120K Grader",
      weather: "Clear / Sunny",
      remarks: "Highway stretch 3.5km BT progress",
    });
    expect(resHw).toBeDefined();

    // 2. Create Concrete Works DPR entry (1.0km CC road section)
    const resCc = await caller.dailyProgress.create({
      clientDraftId: `cc_test_${Date.now()}`,
      date: testDate,
      projectId: 1,
      roadId: 1,
      activityId: 1,
      sectionType: "Concrete Works",
      chainageFrom: "3+500",
      chainageTo: "4+500",
      plannedQuantity: "150.00",
      actualQuantity: "140.00",
      billableQuantity: "140.00",
      billingStatus: "Ready for Bill",
      unit: "Cum",
      percentageComplete: "85.00",
      manpower: "Transit mixer driver, 6 concrete crew",
      machinery: "Transit Mixer, Concrete Paver",
      weather: "Clear / Sunny",
      remarks: "1.0km CC road section paving",
    });
    expect(resCc).toBeDefined();

    // 3. Query date audit endpoint
    const auditRes = await caller.dailyProgress.byDate({
      date: testDate,
      roadId: 1,
    });

    expect(auditRes.date).toBe(testDate);
    expect(auditRes.summary.totalEntries).toBeGreaterThanOrEqual(2);
    expect(auditRes.summary.actualQuantityTotal).toBeGreaterThanOrEqual(620);
    expect(auditRes.summary.billableQuantityTotal).toBeGreaterThanOrEqual(620);
    expect(auditRes.summary.bySection["Highway Works"]).toBeGreaterThanOrEqual(1);
    expect(auditRes.summary.bySection["Concrete Works"]).toBeGreaterThanOrEqual(1);
  }, 20000);
});
