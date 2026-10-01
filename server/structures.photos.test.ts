import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

function context() {
  return {
    user: {
      id: 1,
      openId: "test-admin",
      email: "engineer@rdx.com",
      name: "Site QS Incharge",
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

describe("Road Structures Photo Section & Attachment", () => {
  it("allows updating photos field directly on a structure", async () => {
    const caller = appRouter.createCaller(context());
    const list = await caller.structures.list();
    expect(list.length).toBeGreaterThan(0);
    const target = list[0].structure;

    const mockPhotos = [
      {
        id: "p1",
        url: "/manus-storage/sample_culvert_deck.jpg",
        caption: "Deck Slab Reinforcement Inspection",
        chainage: "1+250",
        uploadedAt: new Date().toISOString(),
      },
      {
        id: "p2",
        url: "/manus-storage/sample_culvert_headwall.jpg",
        caption: "Stone Masonry Headwall Progress",
        chainage: "1+260",
        uploadedAt: new Date().toISOString(),
      },
    ];

    await caller.structures.update({
      id: target.id,
      photos: JSON.stringify(mockPhotos),
    });

    const refreshedList = await caller.structures.list();
    const updated = refreshedList.find((r) => r.structure.id === target.id);
    expect(updated).toBeDefined();
    expect(updated!.structure.photos).toBeDefined();

    const parsed = JSON.parse(updated!.structure.photos!);
    expect(parsed.length).toBe(2);
    expect(parsed[0].caption).toBe("Deck Slab Reinforcement Inspection");
    expect(parsed[1].caption).toBe("Stone Masonry Headwall Progress");
  });
});
