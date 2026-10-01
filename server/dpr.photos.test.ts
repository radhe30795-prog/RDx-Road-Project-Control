import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

function context() {
  return {
    user: {
      id: 1,
      openId: "dpr-photo-test",
      email: "site.engineer@rdx.test",
      name: "DPR Photo Tester",
      loginMethod: "google",
      role: "admin" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: () => {} } as any,
  };
}

describe("DPR photos across all work sections", () => {
  it("stores and returns photo metadata for Highway, Concrete, Material and Machine DPRs", async () => {
    const caller = appRouter.createCaller(context());
    const roads = await caller.roads.list();
    const activities = await caller.activities.list({ roadId: roads[0]?.id || 1 });
    expect(roads.length).toBeGreaterThan(0);
    const activityId = activities[0]?.activity.id || 1;

    const sections = ["Highway Works", "Concrete Works", "Material", "Machine"] as const;
    const date = "2099-01-01";
    const testRemark = `Photo section regression test ${Date.now()}`;

    for (const sectionType of sections) {
      const clientDraftId = `photo-test-${sectionType.replace(/\s/g, "-")}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await caller.dailyProgress.create({
        clientDraftId,
        date,
        projectId: roads[0].projectId,
        roadId: roads[0].id,
        activityId,
        sectionType,
        chainageFrom: "2+000",
        chainageTo: "2+500",
        plannedQuantity: "100.00",
        actualQuantity: "25.00",
        billableQuantity: "25.00",
        billingStatus: "Ready for Bill",
        unit: sectionType === "Machine" ? "Hrs" : "Cum",
        percentageComplete: "25.00",
        manpower: "Site crew",
        machinery: "Plant deployed",
        weather: "Clear / Sunny",
        remarks: testRemark,
        sitePhotos: JSON.stringify([{
          id: `photo-${sectionType}`,
          url: "/manus-storage/test-dpr-photo.jpg",
          caption: `${sectionType} progress photo`,
          sectionType,
          chainage: "2+250",
        }]),
      });
    }

    const result = (await caller.dailyProgress.list({ date })).filter((row) => row.dp.remarks === testRemark);
    expect(result.length).toBe(4);
    for (const row of result) {
      expect(row.dp.sitePhotos).toContain("progress photo");
      expect(row.dp.sectionType).toBeTruthy();
    }
  }, 20000);
});
