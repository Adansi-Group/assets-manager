import { describe, expect, it } from "vitest";
import { deliveryProblem, planDelivery } from "./deliveries";

const TODAY = "2026-09-28";

const input = (over: Record<string, unknown> = {}) => ({
  tonerType: "222A",
  colorType: "Black",
  quantity: 4,
  dateReceived: "2026-09-12",
  ...over,
});

describe("deliveryProblem", () => {
  it("accepts a whole, positive quantity with a cartridge, colour and date", () => {
    expect(deliveryProblem(TODAY, input())).toBeNull();
  });

  it.each([0, -2, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "refuses a quantity of %s",
    (quantity) => {
      expect(deliveryProblem(TODAY, input({ quantity }))).toMatch(/whole number of 1 or more/);
    }
  );

  it("refuses a delivery with no cartridge or colour", () => {
    expect(deliveryProblem(TODAY, input({ tonerType: "  " }))).toMatch(/cartridge/);
    expect(deliveryProblem(TODAY, input({ colorType: "" }))).toMatch(/colour/);
  });

  it("refuses a date that is not YYYY-MM-DD", () => {
    expect(deliveryProblem(TODAY, input({ dateReceived: "12/09/2026" }))).toMatch(/date/i);
    expect(deliveryProblem(TODAY, input({ dateReceived: "2026-02-31" }))).toMatch(/date/i);
  });

  it("refuses a delivery dated after today, but accepts today", () => {
    expect(deliveryProblem(TODAY, input({ dateReceived: "2026-09-29" }))).toMatch(/future/i);
    expect(deliveryProblem(TODAY, input({ dateReceived: TODAY }))).toBeNull();
  });

  it("refuses a negative cost per unit but allows none", () => {
    expect(deliveryProblem(TODAY, input({ costPerUnit: -1 }))).toMatch(/cost/i);
    expect(deliveryProblem(TODAY, input({ costPerUnit: undefined }))).toBeNull();
    expect(deliveryProblem(TODAY, input({ costPerUnit: 0 }))).toBeNull();
  });
});

describe("planDelivery", () => {
  it("adds to the pool that is already there and stamps the check date", () => {
    const plan = planDelivery(TODAY, { quantity: 3 }, input());

    expect(plan.pool).toEqual({
      kind: "increment",
      fields: { quantity: 7, lastCheckedDate: "2026-09-12" },
    });
  });

  it("keeps a later check date already on the pool rather than moving it back", () => {
    const plan = planDelivery(
      TODAY,
      { quantity: 3, lastCheckedDate: "2026-09-20" },
      input({ dateReceived: "2026-09-12" })
    );

    expect(plan.pool.fields).toMatchObject({ lastCheckedDate: "2026-09-20" });
  });

  it("moves the check date forward when the delivery is later", () => {
    const plan = planDelivery(
      TODAY,
      { quantity: 3, lastCheckedDate: "2026-09-01" },
      input({ dateReceived: "2026-09-12" })
    );

    expect(plan.pool.fields).toMatchObject({ lastCheckedDate: "2026-09-12" });
  });

  it("treats an unreadable stored quantity as none rather than NaN", () => {
    const plan = planDelivery(TODAY, { quantity: "abc" }, input());

    expect(plan.pool).toMatchObject({ fields: { quantity: 4 } });
  });

  it("creates the pool when there is none, dated the day it arrived", () => {
    const plan = planDelivery(TODAY, undefined, input({ costPerUnit: 250 }));

    expect(plan.pool).toEqual({
      kind: "create",
      fields: {
        tonerType: "222A",
        colorType: "Black",
        quantity: 4,
        initialQuantity: 4,
        dateBrought: "2026-09-12",
        costPerUnit: 250,
      },
    });
  });

  it("writes no undefined field, which Firestore would reject", () => {
    const plan = planDelivery(TODAY, undefined, input({ costPerUnit: undefined }));

    expect(Object.values(plan.pool.fields)).not.toContain(undefined);
    expect(plan.pool.fields).not.toHaveProperty("costPerUnit");
    expect(plan.delivery).not.toHaveProperty("costPerUnit");
  });

  it("records the delivery exactly as received, trimmed", () => {
    const plan = planDelivery(TODAY, undefined, input({ tonerType: " 222A ", costPerUnit: 250 }));

    expect(plan.delivery).toEqual({
      tonerType: "222A",
      colorType: "Black",
      quantity: 4,
      dateReceived: "2026-09-12",
      costPerUnit: 250,
    });
  });

  it("throws on a future-dated delivery instead of writing it", () => {
    expect(() => planDelivery(TODAY, undefined, input({ dateReceived: "2026-10-01" }))).toThrow(
      /future/i
    );
  });

  it("throws on an invalid delivery instead of writing it", () => {
    expect(() => planDelivery(TODAY, undefined, input({ quantity: 0 }))).toThrow(/whole number/);
  });
});
