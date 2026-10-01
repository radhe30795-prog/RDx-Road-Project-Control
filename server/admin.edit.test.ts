import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

function context(role: "admin" | "user") {
  return {
    user: {
      id: role === "admin" ? 1 : 99,
      openId: `central-edit-${role}`,
      email: `${role}@rdxinfra.example`,
      name: role === "admin" ? "Central Edit Admin" : "Site User",
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

describe("Central Edit Panel", () => {
  it("blocks non-admin users from project, road and BOQ admin queries", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.adminEdit.projects()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.adminEdit.roads({ projectId: 30001 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.adminEdit.boq({ projectId: 30001 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows an admin to load the current project master and road/BOQ records", async () => {
    const caller = appRouter.createCaller(context("admin"));
    const projects = await caller.adminEdit.projects();
    expect(projects.length).toBeGreaterThan(0);
    const projectId = projects[0]!.id;
    const roads = await caller.adminEdit.roads({ projectId });
    const boq = await caller.adminEdit.boq({ projectId });
    expect(roads.length).toBeGreaterThan(0);
    expect(boq.length).toBeGreaterThan(0);
    expect(boq[0]!.boq.itemCode).toBeTruthy();
  }, 15000);
});
