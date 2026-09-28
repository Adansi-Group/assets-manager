import { describe, expect, it } from "vitest";
import { tonersAcquired } from "./tonersAcquired";
import type { Range } from "./period";
import type { Toner, TonerDelivery } from "../../types/toner";

const Q3: Range = { start: "2026-07-01", end: "2026-09-30", label: "Q3 2026" };

const delivery = (id: string, dateReceived: string, over: Partial<TonerDelivery> = {}): TonerDelivery => ({
  id,
  tonerType: "222A",
  colorType: "Black",
  quantity: 2,
  dateReceived,
  ...over,
});

const legacy = (id: string, dateBrought: string, over: Partial<Toner> = {}): Toner =>
  ({
    id,
    location: "Travel House",
    printerType: "HP",
    tonerType: "59A",
    colorType: "Black",
    quantity: 3,
    dateBrought,
    ...over,
  }) as Toner;

describe("tonersAcquired", () => {
  it("adds deliveries in range to legacy records in range", () => {
    const result = tonersAcquired(
      [
        delivery("d1", "2026-08-01", { quantity: 4, costPerUnit: 100 }),
        delivery("d2", "2026-09-30", { quantity: 1 }),
      ],
      [legacy("t1", "2026-07-10", { quantity: 3, costPerUnit: 50 })],
      Q3
    );

    expect(result).toEqual({ deliveries: 2, legacyRecords: 1, units: 8, cost: 550 });
  });

  it("ignores anything dated outside the range", () => {
    const result = tonersAcquired(
      [delivery("d1", "2026-06-30", { quantity: 9, costPerUnit: 100 })],
      [legacy("t1", "2026-10-01")],
      Q3
    );

    expect(result).toEqual({ deliveries: 0, legacyRecords: 0, units: 0, cost: 0 });
  });

  it("counts units without a price as costing nothing known, not as missing", () => {
    const result = tonersAcquired([delivery("d1", "2026-08-01", { quantity: 5 })], [], Q3);

    expect(result.units).toBe(5);
    expect(result.cost).toBe(0);
  });
});
