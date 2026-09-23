import { describe, expect, it } from "vitest";
import type { Gadget } from "../types/gadget";
import { buildInUseAssignmentExport } from "./inUseAssignmentExport";

const gadget = (overrides: Partial<Gadget>): Gadget => ({
  id: "device",
  deviceType: "Laptop",
  model: "Device",
  year: 2025,
  status: "In-Use",
  ...overrides,
});

describe("buildInUseAssignmentExport", () => {
  it("puts a person's laptop and phone on one row", () => {
    const rows = buildInUseAssignmentExport([
      gadget({ id: "laptop", assignedTo: "Ama Mensah", model: "ThinkPad", serialNumber: "LP-1" }),
      gadget({ id: "phone", deviceType: "Smartphone", assignedTo: "Ama Mensah", model: "iPhone", imei1: "IMEI-1" }),
    ]);

    expect(rows).toEqual([expect.objectContaining({
      assignedTo: "Ama Mensah",
      laptopModel: "ThinkPad",
      laptopSerialNumber: "LP-1",
      phoneModel: "iPhone",
      phoneImei1: "IMEI-1",
    })]);
  });

  it("matches names despite case/spacing and excludes unassigned or non-active devices", () => {
    const rows = buildInUseAssignmentExport([
      gadget({ assignedTo: "  Kofi   Addo ", model: "Laptop A" }),
      gadget({ deviceType: "Smartphone", assignedTo: "kofi addo", model: "Phone A" }),
      gadget({ id: "stock", status: "In-Stock", assignedTo: "Kofi Addo", model: "Stock laptop" }),
      gadget({ id: "missing-name", assignedTo: "", model: "Unnamed laptop" }),
      gadget({ id: "accessory", deviceType: "Accessory", assignedTo: "Kofi Addo", model: "Mouse" }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      assignedTo: "Kofi Addo",
      laptopModel: "Laptop A",
      phoneModel: "Phone A",
    });
  });
});
