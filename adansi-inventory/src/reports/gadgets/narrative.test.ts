import { describe, expect, it } from "vitest";
import type { Gadget } from "../../types/gadget";
import { resolveRange } from "../shared/period";
import type { Block, BulletItem } from "../shared/blocks";
import { buildGadgetReport } from "./buildModel";
import { narrate } from "./narrative";

function flatten(items: BulletItem[]): string[] {
  return items.flatMap(i => [i.text, ...flatten(i.children ?? [])]);
}

/** All prose in the document, for asserting that a claim was actually made. */
function allText(blocks: Block[]): string {
  return blocks
    .flatMap(b => {
      switch (b.kind) {
        case "heading":
        case "paragraph":
          return [b.text];
        case "bullets":
          return flatten(b.items);
        case "callout":
          return [b.title, b.text];
        case "table":
          return [b.caption ?? "", ...b.rows.flat().map(String)];
        case "chart":
          return [b.title];
      }
    })
    .join("\n");
}

const laptop = (over: Partial<Gadget> & { id: string }): Gadget =>
  ({ deviceType: "Laptop", model: "MacBook Air", year: 2020, status: "In-Stock", ...over }) as Gadget;
const phone = (over: Partial<Gadget> & { id: string }): Gadget =>
  ({ deviceType: "Smartphone", model: "Galaxy A25", year: 0, status: "In-Use", ...over }) as Gadget;

const FIXTURE: Gadget[] = [
  laptop({ id: "l1", processor: "Apple M1 8GB RAM", storage: "245.11GB" }),
  laptop({ id: "l2", processor: "Apple M1 8GB RAM", storage: "245.11GB" }),
  laptop({
    id: "l3",
    processor: "Intel Core i5 4GB RAM",
    storage: "121.02GB",
    year: 2014,
    status: "In-Use",
    assignedTo: "Grace",
  }),
  laptop({
    id: "l4",
    model: "MacBook Pro",
    processor: "Apple M1 16GB RAM",
    storage: "49438",
    year: 2021,
    status: "In-Use",
    assignedTo: "Sammy(Faulty)",
  }),
  phone({ id: "p1", assignedTo: "Grace" }),
  phone({ id: "p2", model: "Galaxy A31", assignedTo: "Sammy(Faulty)" }),
];

const blocks = narrate(
  buildGadgetReport(FIXTURE, {
    range: resolveRange(2026, "ALL", "", ""),
    dateBasis: "purchaseDate",
    scope: "active",
    returned: [],
    generatedAt: "2026-07-16",
  })
);
const text = allText(blocks);

describe("narrate", () => {
  it("opens with the estate total", () => {
    expect(text).toContain("The inventory comprises 6 devices");
  });

  it("names the oldest laptop and who holds it", () => {
    // The sentence the former colleague wrote by hand.
    expect(text).toContain("The oldest is a MacBook Air from 2014, assigned to Grace.");
  });

  it("states a uniform spec once rather than repeating it per device", () => {
    expect(text).toContain("All have 8GB RAM.");
    expect(text).toContain("All have 245.11GB storage.");
  });

  it("calls out the unreadable storage value", () => {
    expect(text).toContain("is not a usable storage figure");
    expect(text).toContain('"49438"');
  });

  it("does not both report and disown the same storage value", () => {
    // It must not say "All have 49438 storage" and then say 49438 is unusable.
    expect(text).not.toContain("All have 49438 storage");
    expect(text).toContain("left out of the storage figures above");
  });

  it("does not say \"all\" when only some devices record the value", () => {
    // Two Pros, one with a usable 512GB and one with the unusable 49438. One
    // distinct value does NOT mean every device has it.
    const mixed = narrate(
      buildGadgetReport(
        [
          laptop({ id: "a", model: "MacBook Pro", processor: "Apple M1", storage: "49438", year: 2021 }),
          laptop({ id: "b", model: "MacBook Pro", processor: "Apple M1", storage: "512GB", year: 2021 }),
        ],
        {
          range: resolveRange(2026, "ALL", "", ""),
          dateBasis: "purchaseDate",
          scope: "active",
          returned: [],
          generatedAt: "2026-07-16",
        }
      )
    );
    const t = allText(mixed);
    expect(t).not.toContain("All have 512GB storage");
    expect(t).toContain("1 of 2 has 512GB storage; the other has no usable value recorded.");
  });

  it("says plainly which fields phones never carry", () => {
    expect(text).toMatch(/Processor, Storage, RAM(.*)are not recorded for any of the 2 smartphones/);
  });

  it("reports who holds both a laptop and a phone", () => {
    expect(text).toContain("2 individuals are assigned both a laptop and a phone");
    expect(text).toContain("Grace");
    expect(text).toContain("Sammy(Faulty)");
  });

  it("always states that cost is not recorded", () => {
    expect(text).toContain("Purchase cost");
    expect(text).toContain("no purchase price for gadgets");
  });

  it("agrees in number for a single device", () => {
    const one = narrate(
      buildGadgetReport([laptop({ id: "solo", year: 2019, status: "In-Use", assignedTo: "Ama" })], {
        range: resolveRange(2026, "ALL", "", ""),
        dateBasis: "purchaseDate",
        scope: "active",
        returned: [],
        generatedAt: "2026-07-16",
      })
    );
    const t = allText(one);
    expect(t).toContain("The inventory comprises 1 device:");
    expect(t).not.toContain("1 devices");
    expect(t).toContain("1 person holds at least one device");
  });

  it("degrades to an empty-state sentence rather than rendering zeroes", () => {
    const empty = narrate(
      buildGadgetReport([], {
        range: resolveRange(2026, "ALL", "", ""),
        dateBasis: "purchaseDate",
        scope: "active",
        returned: [],
        generatedAt: "2026-07-16",
      })
    );
    expect(allText(empty)).toContain("No devices are recorded for this period");
  });

  it("discloses excluded locker devices up front", () => {
    const withLocker = narrate(
      buildGadgetReport(FIXTURE, {
        range: resolveRange(2026, "ALL", "", ""),
        dateBasis: "purchaseDate",
        scope: "active",
        returned: [laptop({ id: "r1", lockerDevice: true })],
        generatedAt: "2026-07-16",
      })
    );
    expect(allText(withLocker)).toContain("excluded from every figure below");
  });

  it("emits charts for the renderers to fill", () => {
    const chartIds = blocks.filter(b => b.kind === "chart").map(b => (b as { chartId: string }).chartId);
    expect(chartIds).toContain("byType");
    expect(chartIds).toContain("byStatus");
  });
});
