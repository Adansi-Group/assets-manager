import type { Gadget } from "../types/gadget";

export type InUseAssignmentExportRow = Record<string, unknown> & {
  assignedTo: string;
  laptopModel: string;
  laptopSerialNumber: string;
  phoneModel: string;
  phoneSerialNumber: string;
  phoneImei1: string;
  phoneImei2: string;
};

const joinValues = (gadgets: Gadget[], field: keyof Gadget) =>
  gadgets
    .map((gadget) => gadget[field])
    .filter((value): value is string | number => value !== undefined && value !== null && value !== "")
    .map(String)
    .join("; ");

/** Groups active laptops and phones into one shareable row per assignee. */
export function buildInUseAssignmentExport(gadgets: Gadget[]): InUseAssignmentExportRow[] {
  const assignees = new Map<string, { name: string; gadgets: Gadget[] }>();

  gadgets.forEach((gadget) => {
    const name = gadget.assignedTo?.trim();
    if (gadget.status !== "In-Use" || !name) return;
    if (gadget.deviceType !== "Laptop" && gadget.deviceType !== "Smartphone") return;

    // Ignore capitalization and accidental extra spaces when matching a person's devices.
    const key = name.replace(/\s+/g, " ").toLocaleLowerCase();
    const current = assignees.get(key) ?? { name: name.replace(/\s+/g, " "), gadgets: [] };
    current.gadgets.push(gadget);
    assignees.set(key, current);
  });

  return Array.from(assignees.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ name, gadgets: assignedGadgets }) => {
      const laptops = assignedGadgets.filter((gadget) => gadget.deviceType === "Laptop");
      const phones = assignedGadgets.filter((gadget) => gadget.deviceType === "Smartphone");

      return {
        assignedTo: name,
        laptopModel: joinValues(laptops, "model"),
        laptopSerialNumber: joinValues(laptops, "serialNumber"),
        phoneModel: joinValues(phones, "model"),
        phoneSerialNumber: joinValues(phones, "serialNumber"),
        phoneImei1: joinValues(phones, "imei1"),
        phoneImei2: joinValues(phones, "imei2"),
      };
    });
}

export const inUseAssignmentExportColumns = [
  { key: "assignedTo", label: "Assigned To" },
  { key: "laptopModel", label: "Laptop Model" },
  { key: "laptopSerialNumber", label: "Laptop Serial Number" },
  { key: "phoneModel", label: "Phone Model" },
  { key: "phoneSerialNumber", label: "Phone Serial Number" },
  { key: "phoneImei1", label: "Phone IMEI 1" },
  { key: "phoneImei2", label: "Phone IMEI 2" },
];
