// src/reports/gadgets/anomalies.ts
//
// Data oddities worth a human's attention, each detected by one pure function.
// Adding a check means adding a function here and a test — nothing else changes.

import type { Gadget } from "../../types/gadget";
import type { Anomaly } from "./model";
import { normalizeAssignee, parseSizeGb, stripNameAnnotation } from "./parse";
import { joinListCapped, pluralize } from "../shared/text";

type Detector = (gadgets: Gadget[]) => Anomaly[];

/** Storage recorded in a way that has no sane unit reading (e.g. "49438"). */
const storageOutlier: Detector = gadgets => {
  const hits = gadgets.filter(g => parseSizeGb(g.storage).suspect);
  if (hits.length === 0) return [];
  const examples = hits.slice(0, 3).map(g => `${g.model} ("${String(g.storage).trim()}")`);
  return [
    {
      code: "storage-outlier",
      severity: "warn",
      message:
        `${hits.length} ${pluralize(hits.length, "device")} ${hits.length === 1 ? "records" : "record"} a storage value that is not usable — ` +
        `either it carries no unit, or it is too large to be credible: ${joinListCapped(examples, 3)}. ` +
        `${hits.length === 1 ? "It is" : "They are"} excluded from the storage figures and ` +
        `${hits.length === 1 ? "needs" : "need"} checking against the physical device.`,
      deviceIds: hits.map(g => g.id),
    },
  ];
};

/** A status baked into the name field, e.g. "Sammy(Faulty)". */
const statusInAssigneeName: Detector = gadgets => {
  const pattern = /\((faulty|left|resigned|broken|damaged|exited|ex-staff)\)/i;
  const hits = gadgets.filter(g => g.assignedTo && pattern.test(g.assignedTo));
  if (hits.length === 0) return [];
  const names = [...new Set(hits.map(g => String(g.assignedTo).trim()))];
  return [
    {
      code: "status-in-assignee-name",
      severity: "warn",
      message:
        `${hits.length} ${pluralize(hits.length, "device")} ${hits.length === 1 ? "is" : "are"} assigned to a name carrying a status note ` +
        `(${joinListCapped(names, 3)}). The device status field should carry this instead, ` +
        `so the name groups correctly.`,
      deviceIds: hits.map(g => g.id),
    },
  ];
};

/** Someone is holding a device that is not marked In-Use. */
const assignedButNotInUse: Detector = gadgets => {
  const hits = gadgets.filter(g => normalizeAssignee(g.assignedTo) && g.status !== "In-Use");
  if (hits.length === 0) return [];
  return [
    {
      code: "assigned-not-in-use",
      severity: "info",
      message:
        `${hits.length} ${pluralize(hits.length, "device")} ${hits.length === 1 ? "has" : "have"} an assignee but ${hits.length === 1 ? "is" : "are"} not marked In-Use. ` +
        `Either the device came back and the assignee was not cleared, or the status is stale.`,
      deviceIds: hits.map(g => g.id),
    },
  ];
};

/** Marked In-Use but nobody is recorded as holding it. */
const inUseButUnassigned: Detector = gadgets => {
  const hits = gadgets.filter(
    g => g.status === "In-Use" && !normalizeAssignee(g.assignedTo) && g.deviceType !== "Accessory"
  );
  if (hits.length === 0) return [];
  return [
    {
      code: "in-use-unassigned",
      severity: "info",
      message:
        `${hits.length} ${pluralize(hits.length, "device")} ${hits.length === 1 ? "is" : "are"} marked In-Use with no assignee recorded. ` +
        `These cannot be traced to a holder.`,
      deviceIds: hits.map(g => g.id),
    },
  ];
};

/** The same serial on more than one record. */
const duplicateSerial: Detector = gadgets => {
  const bySerial = new Map<string, Gadget[]>();
  for (const g of gadgets) {
    const s = g.serialNumber?.trim();
    if (!s) continue;
    const key = s.toLowerCase();
    bySerial.set(key, [...(bySerial.get(key) ?? []), g]);
  }
  const dupes = [...bySerial.entries()].filter(([, gs]) => gs.length > 1);
  if (dupes.length === 0) return [];
  return [
    {
      code: "duplicate-serial",
      severity: "warn",
      message:
        `${dupes.length} serial ${pluralize(dupes.length, "number")} ${dupes.length === 1 ? "appears" : "appear"} on more than one record ` +
        `(${joinListCapped(dupes.map(([s]) => s.toUpperCase()), 3)}). One device may be recorded twice.`,
      deviceIds: dupes.flatMap(([, gs]) => gs.map(g => g.id)),
    },
  ];
};

/**
 * Names that differ only by a trailing initial or punctuation.
 *
 * Reported, never auto-merged: merging two real people would quietly reassign
 * someone's device in the report.
 */
const possibleDuplicateAssignee: Detector = gadgets => {
  const names = new Map<string, string>();
  for (const g of gadgets) {
    const a = normalizeAssignee(g.assignedTo);
    if (a) names.set(a.key, a.display);
  }
  const keys = [...names.keys()];
  const pairs: string[] = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = stripNameAnnotation(keys[i]).replace(/[.,]/g, "").trim();
      const b = stripNameAnnotation(keys[j]).replace(/[.,]/g, "").trim();
      if (a === b || a.startsWith(`${b} `) || b.startsWith(`${a} `)) {
        pairs.push(`"${names.get(keys[i])}" / "${names.get(keys[j])}"`);
      }
    }
  }
  if (pairs.length === 0) return [];
  return [
    {
      code: "possible-duplicate-assignee",
      severity: "info",
      message:
        `${pairs.length} pair(s) of assignee names may refer to the same person: ${joinListCapped(pairs, 3)}. ` +
        `They are counted separately here — confirm before merging.`,
      deviceIds: [],
    },
  ];
};

/** No serial recorded on a laptop or phone. */
const missingSerial: Detector = gadgets => {
  const hits = gadgets.filter(
    g => g.deviceType !== "Accessory" && !g.serialNumber?.trim()
  );
  if (hits.length === 0) return [];
  return [
    {
      code: "missing-serial",
      severity: "info",
      message:
        `${hits.length} of ${gadgets.filter(g => g.deviceType !== "Accessory").length} laptops and phones have no serial number recorded, ` +
        `so they cannot be identified individually if lost.`,
      deviceIds: hits.map(g => g.id),
    },
  ];
};

export const DETECTORS: Detector[] = [
  storageOutlier,
  statusInAssigneeName,
  duplicateSerial,
  assignedButNotInUse,
  inUseButUnassigned,
  possibleDuplicateAssignee,
  missingSerial,
];

export function detectAnomalies(gadgets: Gadget[]): Anomaly[] {
  const found = DETECTORS.flatMap(detect => detect(gadgets));
  // Warnings first — they are the ones that change what someone should do.
  return found.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "warn" ? -1 : 1));
}
