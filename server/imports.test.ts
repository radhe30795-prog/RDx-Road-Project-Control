import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

function context(role: "admin" | "user") {
  return {
    user: {
      id: role === "admin" ? 1 : 99,
      openId: `import-test-${role}`,
      email: `${role}@rdxinfra.example`,
      name: role === "admin" ? "Import Admin" : "Site User",
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

describe("Excel Import Center", () => {
  it("allows an admin to validate an empty workbook without inserting rows", async () => {
    const result = await appRouter.createCaller(context("admin")).imports.execute({ sheets: {} });
    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.issues).toHaveLength(0);
  }, 15000);

  it("blocks non-admin users from bulk import", async () => {
    await expect(appRouter.createCaller(context("user")).imports.execute({ sheets: {} })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
