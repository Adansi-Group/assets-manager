// src/reports/gadgets/narrative.ts
//
// GadgetReportModel -> Block[]. Pure. This is where the report's prose lives.
//
// Structure follows the hand-written report this replaces: overall summary,
// laptops in depth, phones in depth, accessories, who holds what, then an
// honest account of what the data does not contain.

import {
  bullets,
  callout,
  chart,
  heading,
  li,
  paragraph,
  table,
  type Block,
  type BulletItem,
} from "../shared/blocks";
import { capitalize, joinList, joinListCapped, pctLabel, pluralize, verbBe, verbS } from "../shared/text";
import type {
  DeviceRef,
  DeviceSection,
  FieldCoverage,
  GadgetReportModel,
  ModelGroup,
  Tally,
  ValueSpread,
  VariantGroup,
} from "./model";

const NAME_CAP = 24;

const tallyPhrase = (t: Tally[]): string =>
  joinList(t.map(x => `${x.key}: ${x.count}`));

/** "8GB" / "8GB and 16GB" / "4GB, 8GB and 16GB", ordered by how common each is. */
const spreadPhrase = (s: ValueSpread): string => joinList(s.values.map(v => v.key));

/**
 * One sentence about how well a field is filled in.
 * Silent at full coverage; the colleague's "consistently N/A" line at zero.
 */
function coverageSentence(section: DeviceSection): string | null {
  const noun = `${section.deviceType.toLowerCase()}s`;
  const absent = section.coverage.filter(c => c.total > 0 && c.present === 0);
  const partial = section.coverage.filter(c => c.present > 0 && c.present < c.total);

  const parts: string[] = [];
  if (absent.length > 0) {
    const fields = joinList(absent.map(c => c.field));
    parts.push(
      `${fields} ${verbBe(absent.length)} not recorded for any of the ${section.total} ${noun}.`
    );
  }
  for (const c of partial) {
    parts.push(`${c.field} is recorded for ${c.present} of the ${c.total} ${noun}.`);
  }
  return parts.length > 0 ? parts.join(" ") : null;
}

/**
 * One sentence describing a spec across `total` devices.
 *
 * Says "All have X" only when every device in the group actually records X.
 * Values can be missing or excluded as unusable, in which case a single distinct
 * value does NOT mean every device has it — claiming "all" there would be false.
 */
function specSentence(spread: ValueSpread, total: number, noun: string): string | null {
  const recorded = spread.values.reduce((sum, v) => sum + v.count, 0);
  if (recorded === 0) return null;

  if (spread.values.length === 1) {
    const only = spread.values[0];
    if (only.count === total) return `All have ${only.key} ${noun}.`;
    const rest = total - only.count;
    return (
      `${only.count} of ${total} ${only.count === 1 ? "has" : "have"} ${only.key} ${noun}; ` +
      `the other${rest === 1 ? "" : ` ${rest}`} ${rest === 1 ? "has" : "have"} no usable value recorded.`
    );
  }

  const varies = `${capitalize(noun)} varies: ${spreadPhrase(spread)}.`;
  return recorded === total
    ? varies
    : `${varies} Recorded for ${recorded} of ${total}.`;
}

/** Fields that are empty across the whole section — stated once, not per model. */
function absentFields(section: DeviceSection): Set<string> {
  return new Set(section.coverage.filter(c => c.total > 0 && c.present === 0).map(c => c.field));
}

/** Nested bullets for one variant of one model — RAM, storage, processors, years. */
function variantBullet(v: VariantGroup, modelName: string, absent: Set<string>): BulletItem {
  const children: BulletItem[] = [];

  const ramLine = specSentence(v.ram, v.count, "RAM");
  if (ramLine) children.push(li(ramLine));
  const storageLine = specSentence(v.storage, v.count, "storage");
  if (storageLine) children.push(li(storageLine));
  if (v.storage.unparsed.length > 0) {
    const n = v.storage.unparsed.length;
    children.push(
      li(
        `${joinList(v.storage.unparsed.map(u => `"${u}"`))} ${verbBe(n)} not a usable storage ` +
          `figure and ${n === 1 ? "looks" : "look"} unusual next to the other entries. ` +
          `${n === 1 ? "It is" : "They are"} left out of the storage figures above.`
      )
    );
  }
  if (v.years.min !== null && v.years.max !== null) {
    children.push(
      li(
        v.years.min === v.years.max
          ? `All are from ${v.years.min}.`
          : `Years range from ${v.years.min} to ${v.years.max}.`
      )
    );
  }
  // Only worth saying if year is recorded somewhere in this section; if the
  // field is empty estate-wide the section note already covers it.
  if (v.years.unknown > 0 && !absent.has("Year")) {
    children.push(
      li(
        `${v.years.unknown} ${pluralize(v.years.unknown, "unit")} ` +
          `${v.years.unknown === 1 ? "has" : "have"} no year recorded.`
      )
    );
  }
  if (v.statuses.length > 0) children.push(li(`Status — ${tallyPhrase(v.statuses)}.`));

  const label =
    v.variant === "Unknown"
      ? `${v.count} ${pluralize(v.count, "unit")}`
      : `${v.count} ${v.variant} ${modelName} ${pluralize(v.count, "unit")}`;

  return li(`${label}.`, children);
}

function modelBullet(m: ModelGroup, absent: Set<string>): BulletItem {
  // With no processor recorded anywhere, every model has exactly one "Unknown"
  // variant, so the variant layer adds nothing but noise.
  const collapse = m.variants.length === 1 && m.variants[0].variant === "Unknown";
  const children = collapse
    ? (variantBullet(m.variants[0], m.model, absent).children ?? [])
    : m.variants.map(v => variantBullet(v, m.model, absent));
  return li(`${m.model}: ${m.count} ${pluralize(m.count, "unit")}.`, children);
}

function deviceSectionBlocks(section: DeviceSection, chartId: "laptopModels" | "phoneModels"): Block[] {
  const noun = `${section.deviceType.toLowerCase()}s`;
  const blocks: Block[] = [heading(2, `Detailed ${section.deviceType} Inventory`)];

  if (section.total === 0) {
    blocks.push(paragraph(`No ${noun} are recorded for this period.`));
    return blocks;
  }

  const top = section.models[0];
  blocks.push(
    paragraph(
      `The ${section.deviceType.toLowerCase()} inventory holds ${section.total} ${pluralize(section.total, "device")} across ` +
        `${section.models.length} ${pluralize(section.models.length, "model")}. ` +
        (top
          ? `${top.model} is the most common, with ${top.count} ${pluralize(top.count, "unit")} ` +
            `(${pctLabel(top.count, section.total)} of ${noun}).`
          : "")
    )
  );

  const absent = absentFields(section);
  blocks.push(chart(chartId, `${section.deviceType}s by model`));
  blocks.push(heading(3, "Models and quantity"));
  blocks.push(bullets(section.models.map(m => modelBullet(m, absent))));

  if (section.processors.length > 0) {
    blocks.push(heading(3, "Processors"));
    blocks.push(paragraph(`${tallyPhrase(section.processors)}.`));
  }

  // Years — the colleague named the oldest and newest devices and their holders.
  const { min, max, oldest, newest, unknown } = section.yearRange;
  if (min !== null && max !== null) {
    blocks.push(heading(3, "Years of manufacture"));
    // One device: name it in full. Several: state the year once and list the
    // holders, rather than repeating "X from 2014, assigned to ..." per device.
    const nameOne = (d: DeviceRef) =>
      `${d.model} from ${d.year}${d.assignedTo ? `, assigned to ${d.assignedTo}` : " (unassigned)"}`;
    const holders = (ds: DeviceRef[]) =>
      joinListCapped(
        ds.map(d => d.assignedTo ?? `${d.model} (unassigned)`),
        4
      );
    const extreme = (ds: DeviceRef[], year: number, superlative: string): string => {
      if (ds.length === 1) return `The ${superlative} is a ${nameOne(ds[0])}.`;
      const models = [...new Set(ds.map(d => d.model))];
      const what = models.length === 1 ? `${models[0]}s` : `${pluralize(ds.length, "device")}`;
      return (
        `The ${superlative} ${pluralize(ds.length, "device")} ${verbBe(ds.length)} ${ds.length} ` +
        `${what} from ${year}, held by ${holders(ds)}.`
      );
    };

    const lines: string[] = [
      min === max
        ? `All ${noun} with a year recorded are from ${min}.`
        : `Years range from ${min} to ${max}.`,
    ];
    if (oldest.length > 0) lines.push(extreme(oldest, min, "oldest"));
    if (max !== min && newest.length > 0) lines.push(extreme(newest, max, "newest"));
    if (unknown > 0)
      lines.push(`${unknown} ${pluralize(unknown, "device")} have no year recorded and are excluded from this range.`);
    blocks.push(paragraph(lines.join(" ")));
  } else if (unknown > 0) {
    blocks.push(heading(3, "Years of manufacture"));
    blocks.push(paragraph(`No year is recorded for any of the ${section.total} ${noun}.`));
  }

  const cov = coverageSentence(section);
  if (cov) blocks.push(callout("info", "Recorded detail", cov));

  return blocks;
}

function coverageTable(coverage: FieldCoverage[], caption: string): Block {
  return table(
    ["Field", "Recorded", "Coverage"],
    coverage.map(c => [c.field, `${c.present} of ${c.total}`, pctLabel(c.present, c.total)]),
    caption
  );
}

export function narrate(model: GadgetReportModel): Block[] {
  const { meta, summary, laptops, phones, accessories, assignments, anomalies, dataGaps } = model;
  const blocks: Block[] = [];

  // ---- Header ---------------------------------------------------------------
  blocks.push(heading(1, "IT Asset Inventory Report"));
  blocks.push(
    paragraph(
      `An itemised view of the device inventory recorded in the Assets Station: device types, ` +
        `specifications, status and assignment. Period: ${meta.periodLabel}. Generated ${meta.generatedAt}.`
    )
  );

  const scopeNotes: string[] = [];
  if (meta.excludedLockerCount > 0) {
    scopeNotes.push(
      `${meta.excludedLockerCount} returned or locker ${pluralize(meta.excludedLockerCount, "device")} ` +
        `${verbBe(meta.excludedLockerCount)} held outside the active estate and excluded from every figure below.`
    );
  }
  if (meta.filtered && meta.missingDateCount > 0) {
    scopeNotes.push(
      `${meta.missingDateCount} ${pluralize(meta.missingDateCount, "device")} have no ` +
        `${meta.dateBasis === "createdAt" ? "record date" : "purchase date"} and are excluded by the period filter, ` +
        `so these counts are a floor rather than a full total.`
    );
  }
  if (scopeNotes.length > 0) blocks.push(callout("warn", "What these numbers cover", scopeNotes.join(" ")));

  // ---- Overall summary ------------------------------------------------------
  blocks.push(heading(2, "Overall Inventory Summary"));

  if (summary.total === 0) {
    blocks.push(paragraph("No devices are recorded for this period."));
    return blocks;
  }

  blocks.push(
    paragraph(
      `The inventory comprises ${summary.total} ${pluralize(summary.total, "device")}: ` +
        `${tallyPhrase(summary.byType)}.`
    )
  );
  blocks.push(chart("byType", "Devices by type"));
  blocks.push(
    bullets([
      li(`By type — ${tallyPhrase(summary.byType)}.`),
      li(`By status — ${tallyPhrase(summary.byStatus)}.`),
    ])
  );
  blocks.push(chart("byStatus", "Devices by status"));
  blocks.push(
    table(
      ["Type", "Status", "Devices"],
      summary.byTypeAndStatus.map(r => [r.type, r.status, r.count]),
      "Device count by type and status"
    )
  );

  // ---- Laptops, phones ------------------------------------------------------
  blocks.push(...deviceSectionBlocks(laptops, "laptopModels"));
  blocks.push(...deviceSectionBlocks(phones, "phoneModels"));

  // ---- Accessories ----------------------------------------------------------
  blocks.push(heading(2, "Accessories"));
  if (accessories.total === 0) {
    blocks.push(paragraph("No accessories are recorded for this period."));
  } else {
    blocks.push(
      paragraph(
        `${accessories.total} accessory ${pluralize(accessories.total, "record")} covering ` +
          `${accessories.totalUnits} ${pluralize(accessories.totalUnits, "unit")} in total. ` +
          `Accessories carry no processor, storage or year, so they are reported by type, quantity and condition.`
      )
    );
    if (accessories.byType.length > 0) {
      blocks.push(
        table(
          ["Accessory type", "Records"],
          accessories.byType.map(t => [t.key, t.count]),
          "Accessories by type"
        )
      );
    }
    if (accessories.byCondition.length > 0) {
      blocks.push(paragraph(`Condition — ${tallyPhrase(accessories.byCondition)}.`));
    }
    if (accessories.lowStock.length > 0) {
      blocks.push(
        table(
          ["Item", "Type", "Quantity"],
          accessories.lowStock.map(a => [a.model, a.accessoryType, a.quantity]),
          "Low stock (2 or fewer)"
        )
      );
    }
  }

  // ---- Assignments ----------------------------------------------------------
  blocks.push(heading(2, "Assigned Devices and Users"));
  const a = assignments;
  const totalLaptops = a.assignedCounts.laptops + a.unassigned.laptops;
  const totalPhones = a.assignedCounts.phones + a.unassigned.phones;

  const assignLines: string[] = [];
  if (totalLaptops > 0)
    assignLines.push(
      `${a.assignedCounts.laptops} of ${totalLaptops} laptops ${verbBe(a.assignedCounts.laptops)} assigned to an individual.`
    );
  if (totalPhones > 0)
    assignLines.push(
      `${a.assignedCounts.phones} of ${totalPhones} phones ${verbBe(a.assignedCounts.phones)} assigned.`
    );
  assignLines.push(
    `${a.people.length} ${pluralize(a.people.length, "person", "people")} ` +
      `${a.people.length === 1 ? "holds" : "hold"} at least one device.`
  );
  blocks.push(paragraph(assignLines.join(" ")));

  if (a.bothLaptopAndPhone.length > 0) {
    blocks.push(
      paragraph(
        `${a.bothLaptopAndPhone.length} ${pluralize(a.bothLaptopAndPhone.length, "individual")} ` +
          `${verbBe(a.bothLaptopAndPhone.length)} assigned both a laptop and a phone, which looks like the standard ` +
          `allocation: ${joinListCapped(a.bothLaptopAndPhone, NAME_CAP)}.`
      )
    );
  }
  if (a.laptopOnly.length > 0)
    blocks.push(
      paragraph(
        `${a.laptopOnly.length} ${pluralize(a.laptopOnly.length, "person", "people")} ${verbS(a.laptopOnly.length, "hold")} a laptop only: ` +
          `${joinListCapped(a.laptopOnly, NAME_CAP)}.`
      )
    );
  if (a.phoneOnly.length > 0)
    blocks.push(
      paragraph(
        `${a.phoneOnly.length} ${pluralize(a.phoneOnly.length, "person", "people")} ${verbS(a.phoneOnly.length, "hold")} a phone only: ` +
          `${joinListCapped(a.phoneOnly, NAME_CAP)}.`
      )
    );

  if (a.people.length > 0) {
    // "MacBook Air ×4" rather than the same name repeated four times.
    const models = (ds: { model: string }[]): string => {
      if (ds.length === 0) return "—";
      const counts = new Map<string, number>();
      for (const d of ds) counts.set(d.model, (counts.get(d.model) ?? 0) + 1);
      return [...counts.entries()]
        .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
        .map(([m, n]) => (n > 1 ? `${m} ×${n}` : m))
        .join(", ");
    };
    blocks.push(
      table(
        ["Person", "Laptops", "Phones", "Accessories", "Devices"],
        a.people.map(p => [
          p.display,
          models(p.laptops),
          models(p.phones),
          p.accessories.length,
          p.laptops.length + p.phones.length + p.accessories.length,
        ]),
        "Who holds what"
      )
    );
  }

  const unassignedTotal = a.unassigned.laptops + a.unassigned.phones;
  if (unassignedTotal > 0) {
    blocks.push(
      paragraph(
        `${a.unassigned.laptops} ${pluralize(a.unassigned.laptops, "laptop")} and ` +
          `${a.unassigned.phones} ${pluralize(a.unassigned.phones, "phone")} are not assigned to anyone.`
      )
    );
  }

  // ---- Anomalies ------------------------------------------------------------
  if (anomalies.length > 0) {
    blocks.push(heading(2, "Records Needing Attention"));
    blocks.push(
      paragraph(
        `The following entries look inconsistent and are worth checking. They do not change the counts above.`
      )
    );
    for (const an of anomalies) {
      blocks.push(callout(an.severity, an.code.replace(/-/g, " "), an.message));
    }
  }

  // ---- Data gaps ------------------------------------------------------------
  blocks.push(heading(2, "Data Coverage and Limitations"));
  blocks.push(
    paragraph(
      `What this report cannot show, and why — so the figures above are read for what they are.`
    )
  );
  blocks.push(bullets(dataGaps.map(g => li(`${g.field}: ${g.note}`))));
  blocks.push(coverageTable(laptops.coverage, "Field coverage — laptops"));
  blocks.push(coverageTable(phones.coverage, "Field coverage — smartphones"));

  return blocks;
}
