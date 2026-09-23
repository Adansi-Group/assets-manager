import { describe, expect, it } from "vitest";
import { findPrinterForToner, selectablePrinterModels, unlinkedStock } from "./stockMatching";
import type { Toner } from "../types/toner";
import type { Printer } from "../types/printer";

const toner = (over: Partial<Toner> & { id: string }): Toner =>
  ({
    location: "Travel House",
    room: "CEO's Office",
    printerType: "Color Laser Jet Pro MFP 3303fdw",
    tonerType: "222A-CEO",
    colorType: "Magenta",
    quantity: 1,
    dateBrought: "2026-02-13",
    ...over,
  }) as Toner;

const printer = (over: Partial<Printer> & { id: string }): Printer =>
  ({
    location: "Travel House",
    room: "CEO's Office",
    model: "Color Laser Jet Pro MFP 3303fdw",
    printerColorType: "black",
    quantity: 1,
    accessories: [],
    status: "Active",
    date: "2026-01-26",
    ...over,
  }) as Printer;

describe("findPrinterForToner", () => {
  it("links stock to its printer", () => {
    expect(findPrinterForToner(toner({ id: "t" }), [printer({ id: "p" })])?.id).toBe("p");
  });

  it("forgives casing and stray spacing", () => {
    const record = toner({ id: "t", printerType: "  color laser   jet pro MFP 3303fdw " });

    expect(findPrinterForToner(record, [printer({ id: "p" })])?.id).toBe("p");
  });

  it("does not link a printer in another room", () => {
    const record = toner({ id: "t", room: "Reception" });

    expect(findPrinterForToner(record, [printer({ id: "p" })])).toBeUndefined();
  });

  it("does not treat a missing room as a wildcard", () => {
    expect(findPrinterForToner(toner({ id: "t", room: undefined }), [printer({ id: "p" })]))
      .toBeUndefined();
  });
});

describe("unlinkedStock", () => {
  // The real case: the stock record kept the name from the hardcoded map while
  // the printer was recorded under a different one.
  it("reports stock whose model no longer names a real printer", () => {
    const orphan = toner({ id: "mag", printerType: "HP Color Laser Jet Pro MFP 3303" });

    const [result] = unlinkedStock([orphan], [printer({ id: "p" })]);

    expect(result.toner.id).toBe("mag");
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].differs).toBe("model");
    expect(result.candidates[0].printer.id).toBe("p");
  });

  it("says nothing about stock that links cleanly", () => {
    expect(unlinkedStock([toner({ id: "t" })], [printer({ id: "p" })])).toEqual([]);
  });

  it("names a room difference when the model is right", () => {
    const orphan = toner({ id: "t", room: "Reception" });

    const [result] = unlinkedStock([orphan], [printer({ id: "p" })]);

    expect(result.candidates[0].differs).toBe("room");
  });

  it("offers no candidate when nothing is close", () => {
    const orphan = toner({ id: "t", location: "Tema Branch", room: "Store", printerType: "Other" });

    expect(unlinkedStock([orphan], [printer({ id: "p" })])[0].candidates).toEqual([]);
  });

  it("puts a model difference ahead of a room difference", () => {
    const orphan = toner({ id: "t", printerType: "Wrong Model" });
    const printers = [
      printer({ id: "other-room", room: "Reception", model: "Wrong Model" }),
      printer({ id: "same-room" }),
    ];

    const [result] = unlinkedStock([orphan], printers);

    expect(result.candidates.map((c) => c.differs)).toEqual(["model", "room"]);
  });

  it("reports every broken record, not just the first", () => {
    const orphans = [
      toner({ id: "a", printerType: "Wrong One" }),
      toner({ id: "b", printerType: "Wrong Two" }),
    ];

    expect(unlinkedStock(orphans, [printer({ id: "p" })]).map((r) => r.toner.id))
      .toEqual(["a", "b"]);
  });
});

describe("selectablePrinterModels", () => {
  const owned = [
    { model: "Color Laser Jet Pro MFP 3303fdw" },
    { model: "Canon imageRunner C3326i" },
    { model: "Canon imageRunner C3326i" },
  ];

  it("offers each owned model once", () => {
    expect(selectablePrinterModels(owned)).toEqual([
      "Color Laser Jet Pro MFP 3303fdw",
      "Canon imageRunner C3326i",
    ]);
  });

  it("puts a compatible model first without dropping the others", () => {
    expect(selectablePrinterModels(owned, ["Canon imageRunner C3326i"])).toEqual([
      "Canon imageRunner C3326i",
      "Color Laser Jet Pro MFP 3303fdw",
    ]);
  });

  // The COO's Office case: the map named a real model, so narrowing would have
  // hidden the 3303fdw that the stock actually had to be filed against.
  it("still offers a model the compatibility list leaves out", () => {
    expect(selectablePrinterModels(owned, ["Canon imageRunner C3326i"])).toContain(
      "Color Laser Jet Pro MFP 3303fdw"
    );
  });

  // The Tema Branch case: the map named a printer in another branch entirely.
  it("offers every owned model when the compatible list names none of them", () => {
    expect(selectablePrinterModels(owned, ["HP Color Laser Jet Pro MFP 3303"])).toEqual([
      "Color Laser Jet Pro MFP 3303fdw",
      "Canon imageRunner C3326i",
    ]);
  });

  it("never offers an empty list when printers exist", () => {
    expect(selectablePrinterModels(owned, ["Nothing Owned"]).length).toBeGreaterThan(0);
  });

  it("keeps an already-saved model visible so it can be corrected", () => {
    const options = selectablePrinterModels(owned, [], "HP Color Laser Jet Pro MFP 3303");

    expect(options[0]).toBe("HP Color Laser Jet Pro MFP 3303");
  });

  it("does not duplicate a saved model that is already owned", () => {
    const options = selectablePrinterModels(owned, [], "canon imagerunner c3326i");

    expect(options).toEqual(["Color Laser Jet Pro MFP 3303fdw", "Canon imageRunner C3326i"]);
  });
});
