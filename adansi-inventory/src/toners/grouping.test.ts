import { describe, expect, it } from "vitest";
import { groupToners, selectedRecord, tonerGroupKey } from "./grouping";
import type { Toner } from "../types/toner";

const toner = (over: Partial<Toner> & { id: string }): Toner =>
  ({
    location: "Travel House",
    printerType: "Canon imageRunner C3326i",
    tonerType: "C-EXV65",
    colorType: "Black",
    quantity: 3,
    dateBrought: "2026-02-14",
    ...over,
  }) as Toner;

describe("tonerGroupKey", () => {
  it("separates two printers of the same model in different rooms", () => {
    const downFloor = toner({ id: "a", room: "Down Floor" });
    const reception = toner({ id: "b", room: "Reception" });

    expect(tonerGroupKey(downFloor)).not.toBe(tonerGroupKey(reception));
  });

  it("keeps a room apart from no room at all", () => {
    expect(tonerGroupKey(toner({ id: "a", room: "Reception" }))).not.toBe(
      tonerGroupKey(toner({ id: "b" }))
    );
  });

  it("ignores casing and stray whitespace, as the replacement matcher does", () => {
    expect(tonerGroupKey(toner({ id: "a", room: "Down Floor" }))).toBe(
      tonerGroupKey(toner({ id: "b", room: "  down   floor " }))
    );
  });
});

describe("groupToners", () => {
  // The bug this module exists for: Down Floor holds only Black, while the
  // Cyan/Magenta/Yellow at Travel House belong to the Reception unit. Merging
  // them showed Down Floor a Yellow it could not replace.
  it("does not lend one printer's colours to another printer in a different room", () => {
    const groups = groupToners([
      toner({ id: "blk", room: "Down Floor", colorType: "Black", quantity: 4 }),
      toner({ id: "mag", room: "Reception", colorType: "Magenta", quantity: 3 }),
      toner({ id: "yel", room: "Reception", colorType: "Yellow", quantity: 3 }),
      toner({ id: "cya", room: "Reception", colorType: "Cyan", quantity: 4 }),
    ]);

    expect(groups).toHaveLength(2);

    const downFloor = groups.find((g) => g.room === "Down Floor")!;
    expect(Object.keys(downFloor.colors)).toEqual(["Black"]);
    expect(downFloor.colors.Yellow).toBeUndefined();

    const reception = groups.find((g) => g.room === "Reception")!;
    expect(reception.colors.Yellow).toBe(3);
    expect(reception.colors.Black).toBeUndefined();
  });

  it("folds one printer's colours into a single row", () => {
    const groups = groupToners([
      toner({ id: "a", room: "Reception", colorType: "Cyan", quantity: 4 }),
      toner({ id: "b", room: "Reception", colorType: "Yellow", quantity: 3 }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].colors).toEqual({ Cyan: 4, Yellow: 3 });
  });

  it("holds only its own records, so deleting a row cannot reach another printer", () => {
    const groups = groupToners([
      toner({ id: "blk", room: "Down Floor", colorType: "Black" }),
      toner({ id: "yel", room: "Reception", colorType: "Yellow" }),
    ]);

    const downFloor = groups.find((g) => g.room === "Down Floor")!;
    expect(Object.values(downFloor.colorRecords).map((t) => t.id)).toEqual(["blk"]);
  });

  it("reports the worst status in the set", () => {
    const groups = groupToners([
      toner({ id: "a", room: "Reception", colorType: "Cyan", status: "Good" }),
      toner({ id: "b", room: "Reception", colorType: "Yellow", status: "Critical" }),
    ]);

    expect(groups[0].status).toBe("Critical");
  });

  it("uses the picked colour for its own row only", () => {
    const records = [
      toner({ id: "blk", room: "Down Floor", colorType: "Black" }),
      toner({ id: "cya", room: "Reception", colorType: "Cyan" }),
      toner({ id: "yel", room: "Reception", colorType: "Yellow" }),
    ];
    const reception = groupToners(records).find((g) => g.room === "Reception")!;

    const groups = groupToners(records, { [reception.key]: "Yellow" });

    expect(groups.find((g) => g.room === "Reception")!.selectedColor).toBe("Yellow");
    expect(groups.find((g) => g.room === "Down Floor")!.selectedColor).toBe("Black");
  });
});

describe("selectedRecord", () => {
  const records = [
    toner({ id: "blk", room: "Reception", colorType: "Black" }),
    toner({ id: "yel", room: "Reception", colorType: "Yellow" }),
  ];

  it("acts on the colour the row is showing, not the first one stored", () => {
    const [group] = groupToners(records, { [tonerGroupKey(records[0])]: "Yellow" });

    expect(selectedRecord(group)!.id).toBe("yel");
  });

  it("falls back to the first record when the shown colour has no stock yet", () => {
    const [group] = groupToners(records);
    group.selectedColor = "Cyan";

    expect(selectedRecord(group)!.id).toBe("blk");
  });
});
