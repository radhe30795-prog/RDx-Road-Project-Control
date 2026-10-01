import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

function createMockContext(role: "admin" | "site_engineer" = "site_engineer"): TrpcContext {
  return {
    user: {
      id: 99,
      openId: "test-field-engineer",
      name: "Field Site Engineer",
      email: "engineer@rdxproject.test",
      loginMethod: "google",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("Offline DPR Idempotent Sync", () => {
  it("allows submitting a DPR with a unique clientDraftId", async () => {
    const caller = appRouter.createCaller(createMockContext());
    const clientDraftId = `draft_test_${Date.now()}`;

    const result = await caller.dailyProgress.create({
      clientDraftId,
      date: "2026-09-27",
      projectId: 1,
      roadId: 1,
      activityId: 1,
      plannedQuantity: "200.00",
      actualQuantity: "190.00",
      unit: "Cum",
      percentageComplete: "75.00",
      weather: "Clear / Sunny",
      remarks: "Offline test entry",
    });

    expect(result).toBeDefined();
  });

  it("handles repeated sync attempts idempotently without error or duplicate insertion", async () => {
    const caller = appRouter.createCaller(createMockContext());
    const clientDraftId = `draft_duplicate_${Date.now()}`;

    // First sync
    const first = await caller.dailyProgress.create({
      clientDraftId,
      date: "2026-09-27",
      projectId: 1,
      roadId: 1,
      activityId: 1,
      plannedQuantity: "150.00",
      actualQuantity: "150.00",
      unit: "Cum",
      percentageComplete: "80.00",
      weather: "Clear / Sunny",
      remarks: "Offline repeated sync draft",
    });
    expect(first).toBeDefined();

    // Duplicate sync attempt with same clientDraftId (e.g. retry on unstable network)
    const second = await caller.dailyProgress.create({
      clientDraftId,
      date: "2026-09-27",
      projectId: 1,
      roadId: 1,
      activityId: 1,
      plannedQuantity: "150.00",
      actualQuantity: "150.00",
      unit: "Cum",
      percentageComplete: "80.00",
      weather: "Clear / Sunny",
      remarks: "Offline repeated sync draft",
    });

    expect(second).toHaveProperty("alreadySynced", true);
  });
});
