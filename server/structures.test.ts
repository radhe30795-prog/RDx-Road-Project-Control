import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

function context(role: "admin" | "site_engineer" = "admin") {
  return {
    user: {
      id: 1,
      openId: "test-admin",
      email: "engineer@rdx.com",
      name: "Site QS Incharge",
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

describe("Road Structures / CD & Protection Works Register", () => {
  it("fetches road-wise structures summary with accurate category groupings", async () => {
    const caller = appRouter.createCaller(context());
    const summary = await caller.structures.summary();

    expect(summary).toBeDefined();
    expect(summary.totalStructures).toBeGreaterThanOrEqual(14);
    expect(Array.isArray(summary.roadWise)).toBe(true);
    expect(summary.roadWise.length).toBeGreaterThanOrEqual(14);

    const rd01 = summary.roadWise.find((r) => r.roadCode === "RD-01" || r.roadCode === "R01");
    expect(rd01).toBeDefined();
    expect(rd01!.counts.slabCulvert).toBeGreaterThanOrEqual(1);
    expect(rd01!.counts.hpc).toBeGreaterThanOrEqual(2);
    expect(rd01!.counts.retainingWall).toBeGreaterThanOrEqual(300);
    expect(rd01!.counts.toeWall).toBeGreaterThanOrEqual(200);
    expect(rd01!.counts.drain).toBeGreaterThanOrEqual(500);
  });

  it("filters individual structures by road and structure type", async () => {
    const caller = appRouter.createCaller(context());
    const culverts = await caller.structures.list({ structureType: "Slab Culvert" });

    expect(Array.isArray(culverts)).toBe(true);
    expect(culverts.length).toBeGreaterThan(0);
    culverts.forEach(({ structure }) => {
      expect(structure.structureType).toBe("Slab Culvert");
    });
  });

  it("allows creating and updating a new protection work item", async () => {
    const caller = appRouter.createCaller(context());
    const roads = await caller.roads.list();
    expect(roads.length).toBeGreaterThan(0);
    const testRoad = roads[0];

    const testNo = `TEST-RW-${Date.now().toString().slice(-4)}`;
    await caller.structures.create({
      structureNo: testNo,
      projectId: testRoad.projectId,
      roadId: testRoad.id,
      structureType: "Retaining Wall",
      chainageFrom: "4+100",
      chainageTo: "4+250",
      locationDescription: "Canal deep curve slope protection",
      count: "1.00",
      length: "150.000",
      width: "0.800",
      height: "3.000",
      quantity: "150.000",
      unit: "Rmt",
      status: "In Progress",
      billableQuantity: "50.000",
      remarks: "Test retaining wall",
    });

    const list = await caller.structures.list({ roadId: testRoad.id });
    const created = list.find(({ structure }) => structure.structureNo === testNo);
    expect(created).toBeDefined();
    expect(created!.structure.structureType).toBe("Retaining Wall");
    expect(parseFloat(String(created!.structure.quantity))).toBe(150);

    // Update status to Completed
    await caller.structures.update({
      id: created!.structure.id,
      status: "Completed",
      billableQuantity: "150.000",
    });

    const updatedList = await caller.structures.list({ roadId: testRoad.id });
    const updated = updatedList.find(({ structure }) => structure.structureNo === testNo);
    expect(updated!.structure.status).toBe("Completed");
    expect(parseFloat(String(updated!.structure.billableQuantity))).toBe(150);
  });
});
