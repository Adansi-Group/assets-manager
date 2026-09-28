import { beforeEach, describe, expect, it, vi } from "vitest";

// Firestore is the boundary: these tests pin WHICH document the service asks
// it to touch, and that a hand-typed entry cannot break the list.
const calls = vi.hoisted(() => ({
  deleted: [] as string[],
  updated: [] as string[],
  docs: [] as { id: string; data: Record<string, unknown> }[],
}));

vi.mock("../firebase/firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, name: string) => ({ path: name }),
  doc: (_db: unknown, name: string, id: string) => ({ path: `${name}/${id}` }),
  getDoc: vi.fn(),
  getDocs: async () => ({ docs: calls.docs.map((d) => ({ id: d.id, data: () => d.data })) }),
  runTransaction: vi.fn(),
  updateDoc: async (ref: { path: string }) => {
    calls.updated.push(ref.path);
  },
  deleteDoc: async (ref: { path: string }) => {
    calls.deleted.push(ref.path);
  },
}));

import { getMembers, removeMember, updateMember } from "./memberService";

beforeEach(() => {
  calls.deleted.length = 0;
  calls.updated.length = 0;
  calls.docs.length = 0;
});

describe("an entry typed by hand with capitals in its id", () => {
  it("is removed by its own id, not by the lower-cased one", async () => {
    await removeMember("Mannan@AdansiTravels.com");
    expect(calls.deleted).toEqual(["members/Mannan@AdansiTravels.com"]);
  });
  it("is edited by its own id", async () => {
    await updateMember("Mannan@AdansiTravels.com", { name: "Mannan", role: "Admin" });
    expect(calls.updated).toEqual(["members/Mannan@AdansiTravels.com"]);
  });
});

describe("getMembers", () => {
  it("lists an entry that has no name instead of failing", async () => {
    calls.docs.push(
      { id: "zed@adansitravels.com", data: { name: "Zed", role: "Viewer" } },
      { id: "hr@adansitravels.com", data: { role: "HR Manager" } }
    );
    const list = await getMembers();
    expect(list.map((m) => [m.email, m.name])).toEqual([
      ["hr@adansitravels.com", ""],
      ["zed@adansitravels.com", "Zed"],
    ]);
  });
});
