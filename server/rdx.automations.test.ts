import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

type AuthenticatedUser = {
  id: number;
  openId: string;
  email: string;
  name: string;
  loginMethod: string;
  role: "admin";
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

function createTestContext() {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-admin",
    email: "admin@rdxinfra.com",
    name: "Project Admin",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: () => {} } as any,
  };
}

function createSecondaryUserContext() {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "test-secondary-user",
    email: "engineer@rdxinfra.com",
    name: "Vikram Engineer",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: () => {} } as any,
  };
}

describe("RDx Road Project Control - Automations & Business Logic", () => {
  const ctx = createTestContext();
  const caller = appRouter.createCaller(ctx);

  it("Module 10 & 1: Dashboard statistics are aggregated correctly", async () => {
    const stats = await caller.dashboard.getStats();
    expect(stats).toBeDefined();
    expect(stats?.totalRoads).toBeGreaterThanOrEqual(14);
    expect(stats?.overallPhysicalProgress).toBeDefined();
  }, 15000);

  it("Module 2: 14 Roads list is accessible and has chainage data", async () => {
    const roads = await caller.roads.list();
    expect(roads.length).toBeGreaterThanOrEqual(14);
    expect(roads[0].roadId).toBeDefined();
    expect(roads[0].roadLengthKm).toBeDefined();
    expect(roads[0].startRd).toBeDefined();
  }, 15000);

  it("Automation 10: Material Balance is automatically calculated as Received - Used", async () => {
    const entryId = `MAT-TEST-${Date.now()}`;
    await caller.materials.create({
      entryId,
      date: "2026-09-27",
      projectId: 1,
      roadId: 1,
      material: "VG-30 Bitumen",
      receivedQuantity: "150.00",
      usedQuantity: "65.50",
      unit: "MT",
    });

    const materials = await caller.materials.list({ roadId: 1 });
    const created = materials.find(m => m.material.entryId === entryId);
    expect(created).toBeDefined();
    // 150.00 - 65.50 = 84.50
    expect(parseFloat(String(created?.material.balanceQuantity))).toBeCloseTo(84.50, 1);
  }, 15000);

  it("Automation 4 & 5: Hindrance auto-generates unique ID and calculates Days Pending", async () => {
    const res = await caller.hindrances.create({
      projectId: 1,
      roadId: 1,
      rdLocation: "Ch 9+500",
      category: "Electric Pole",
      description: "Infringing HT electrical pole",
      dateRaised: "2026-09-01",
      affectedActivity: "Subgrade Compaction",
      responsiblePersonDepartment: "State DISCOM",
    });

    const hindrances = await caller.hindrances.list({ roadId: 1 });
    const latest = hindrances.find(h => h.hindrance.rdLocation === "Ch 9+500");
    expect(latest).toBeDefined();
    expect(latest?.hindrance.hindranceId).toMatch(/^HND-\d{4}-\d+/);
    expect(latest?.hindrance.daysPending).toBeGreaterThanOrEqual(20);
  }, 15000);

  it("Automation 9: Failed QA/QC Test triggers corrective action status", async () => {
    const testId = `QA-TEST-${Date.now()}`;
    await caller.qaQc.create({
      testId,
      date: "2026-09-27",
      projectId: 1,
      roadId: 1,
      activity: "GSB Layer 2",
      testType: "Gradation",
      locationRd: "Ch 4+100",
      requiredValue: "Envelope Grad-II",
      actualValue: "Excess fines 9%",
      unit: "%",
      result: "Failed",
    });

    const tests = await caller.qaQc.list({ roadId: 1 });
    const failed = tests.find(t => t.test.testId === testId);
    expect(failed).toBeDefined();
    expect(failed?.test.result).toBe("Failed");
    expect(failed?.test.correctiveActionStatus).toBe("Required");
  }, 15000);

  it("Automation 1 & 2: Daily Progress updates related Activity progress & marks Complete at 100%", async () => {
    // 1. Create task
    const taskId = `TSK-TEST-${Date.now()}`;
    await caller.activities.create({
      taskId,
      projectId: 1,
      roadId: 1,
      phase: "Bituminous Work",
      activityName: "Tack Coat Spraying",
      startDate: "2026-09-20",
      endDate: "2026-09-30",
      percentageComplete: "40.00",
    });

    const acts = await caller.activities.list({ roadId: 1 });
    const task = acts.find(a => a.activity.taskId === taskId)?.activity;
    expect(task).toBeDefined();

    // 2. Submit Daily Progress setting percentage to 100%
    await caller.dailyProgress.create({
      date: "2026-09-27",
      projectId: 1,
      roadId: 1,
      activityId: task!.id,
      plannedQuantity: "500",
      actualQuantity: "500",
      unit: "Sqm",
      percentageComplete: "100.00",
      remarks: "100% completed today",
    });

    // 3. Verify Activity is now 100% and Complete
    const updatedActs = await caller.activities.list({ roadId: 1 });
    const updatedTask = updatedActs.find(a => a.activity.taskId === taskId)?.activity;
    expect(parseFloat(String(updatedTask?.percentageComplete))).toBe(100);
    expect(updatedTask?.status).toBe("Complete");
  }, 15000);

  it("User Auth & Workspace: returns current user profile and strictly isolated user-created apps", async () => {
    const profile = await caller.auth.profile();
    expect(profile.name).toBe("Project Admin");
    expect(profile.email).toBe("admin@rdxinfra.com");

    // Create custom app for Admin user
    await caller.apps.create({
      name: "Admin Fast Inspection App",
      description: "Quick road quality checker for senior engineers",
      route: "/qa-qc",
      accent: "emerald",
    });

    const adminApps = await caller.apps.mine();
    expect(adminApps.length).toBeGreaterThanOrEqual(1);
    expect(adminApps.some(a => a.name === "Admin Fast Inspection App")).toBe(true);

    // Switch to another user: secondary user should NOT see admin's custom app
    const secondaryCtx = createSecondaryUserContext();
    const secondaryCaller = appRouter.createCaller(secondaryCtx);

    const secondaryProfile = await secondaryCaller.auth.profile();
    expect(secondaryProfile.name).toBe("Vikram Engineer");

    const secondaryApps = await secondaryCaller.apps.mine();
    expect(secondaryApps.some(a => a.name === "Admin Fast Inspection App")).toBe(false);
  }, 15000);
});
