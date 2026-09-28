// src/reports/station/narrate.ts
//
// StationReportModel -> Block[]. Pure. This is where the report's prose lives.
//
// This is an ACTIVITY report: it says what was recorded during the period and
// nothing else. It deliberately does not restate the standing inventory — the
// supervisor asked for the month, not a stocktake, and mixing the two invites
// the reader to take today's stock figure as the month's closing position,
// which the data cannot support (quantities are overwritten in place, with no
// history kept).
//
// Prose only: headings and paragraphs, no tables, charts or bullet lists. A
// category with nothing in it says so rather than disappearing, so the reader
// can tell "nothing happened" from "we left it out".

import { heading, paragraph, type Block } from "../shared/blocks";
import { joinList, joinListCapped, pluralize, verbWas } from "../shared/text";
import type { Tally } from "../gadgets/model";
import type { GadgetAdded, StationReportModel } from "./model";

/** Joins sentence fragments into one paragraph, dropping those with nothing to say. */
const para = (...sentences: (string | null)[]) =>
  paragraph(sentences.filter((s): s is string => !!s).join(" "));

/** "2 at Travel House and 1 at Tema Branch" */
const wherePhrase = (t: Tally[], max = 4) =>
  joinListCapped(
    t.map(x => `${x.count} at ${x.key}`),
    max
  );

/** "5 black and 2 cyan" — colours read better lowercase mid-sentence. */
const colourPhrase = (t: Tally[]) => joinList(t.map(x => `${x.count} ${x.key.toLowerCase()}`));

/** "MacBook Air, assigned to Esther Nyarkoh" */
const devicePhrase = (g: GadgetAdded) =>
  g.assignedTo ? `${g.model}, assigned to ${g.assignedTo}` : g.model;

/* ------------------------------------------------------------------ */

function opening(model: StationReportModel): Block[] {
  const { activity } = model;
  const period = activity.label;

  const lead = activity.filtered
    ? `This report covers ${period} only. It sets out what was recorded in the Assets Station ` +
      `during the month for gadgets, toners and A4 paper.`
    : `This report covers all time — every device added, toner replacement and A4 restock logged ` +
      `in the Assets Station, with no period filter applied.`;

  if (activity.empty) {
    return [
      para(
        lead,
        `Nothing was recorded in ${period}: no devices added, no toner replaced or received and no ` +
          `paper restocked. That is a quiet month in the records rather than an empty store.`
      ),
    ];
  }

  const counts: string[] = [];
  if (activity.gadgetsAdded.length > 0) {
    counts.push(
      `${activity.gadgetsAdded.length} ${pluralize(activity.gadgetsAdded.length, "device")} added`
    );
  }
  if (activity.tonerReplacements.length > 0) {
    counts.push(
      `${activity.tonerReplacements.length} toner ` +
        `${pluralize(activity.tonerReplacements.length, "replacement")}`
    );
  }
  if (activity.cartridgesReceived > 0) {
    counts.push(
      `${activity.cartridgesReceived} toner ` +
        `${pluralize(activity.cartridgesReceived, "cartridge")} received`
    );
  }
  if (activity.tonersBrought > 0) {
    counts.push(
      `${activity.tonersBrought} new toner stock ${pluralize(activity.tonersBrought, "record")}`
    );
  }
  if (activity.a4Restocked.length > 0) {
    counts.push(
      `${activity.a4Restocked.length} A4 ${pluralize(activity.a4Restocked.length, "restock")}`
    );
  }

  return [para(lead, `In short: ${joinList(counts)}.`)];
}

/* ------------------------------------------------------------------ */

function gadgetParagraphs(model: StationReportModel): Block[] {
  const { activity } = model;
  const period = activity.label;
  const added = activity.gadgetsAdded;

  if (added.length === 0) {
    return [heading(2, "Gadgets"), para(`No devices were added to the inventory in ${period}.`)];
  }

  const byType = activity.gadgetsAddedByType;
  const assigned = added.filter(g => g.assignedTo);
  const unassigned = added.length - assigned.length;

  return [
    heading(2, "Gadgets"),
    para(
      `${added.length} ${pluralize(added.length, "device")} ${verbWas(added.length)} added to the ` +
        `inventory in ${period}` +
        (byType.length > 1
          ? `: ${joinList(byType.map(t => `${t.count} ${pluralize(t.count, t.key.toLowerCase())}`))}.`
          : "."),
      `${added.length === 1 ? "It was" : "They were"} ` +
        `${joinListCapped(added.map(devicePhrase), 6)}.`,
      unassigned === added.length
        ? `None ${verbWas(added.length)} assigned during the month; they went into stock.`
        : unassigned > 0
          ? `${unassigned} of them went into stock unassigned.`
          : null
    ),
  ];
}

/** "6 toner cartridges were received during the month: 4 Black 222A and 2 Cyan 069." */
function receivedSentence(model: StationReportModel): string {
  const { activity } = model;
  const received = activity.cartridgesReceived;
  const lines = activity.cartridgesReceivedByCartridge;
  const when = activity.filtered ? "during the month" : `in ${activity.label}`;

  return (
    `${received} toner ${pluralize(received, "cartridge")} ${verbWas(received)} received ${when}` +
    (lines.length > 0 ? `: ${joinListCapped(lines.map(l => `${l.count} ${l.key}`), 6)}.` : ".")
  );
}

/* ------------------------------------------------------------------ */

function tonerParagraphs(model: StationReportModel): Block[] {
  const { activity } = model;
  const period = activity.label;
  const replaced = activity.tonerReplacements.length;
  const brought = activity.tonersBrought;
  const received = activity.cartridgesReceived;

  if (replaced === 0 && brought === 0 && received === 0) {
    return [
      heading(2, "Toners"),
      para(`No toner replacements or new toner stock were recorded in ${period}.`),
    ];
  }

  return [
    heading(2, "Toners"),
    para(
      replaced > 0
        ? `${replaced} toner ${pluralize(replaced, "cartridge")} ${verbWas(replaced)} replaced in ` +
          `${period}` +
          (activity.tonerReplacementsByLocation.length > 0
            ? ` — ${wherePhrase(activity.tonerReplacementsByLocation)}.`
            : ".")
        : `No toner replacements were recorded in ${period}.`,
      replaced > 0 && activity.tonerReplacementsByColour.length > 0
        ? `By colour: ${colourPhrase(activity.tonerReplacementsByColour)}.`
        : null,
      replaced > 0 && activity.tonerReplacementsByPrinter.length > 1
        ? `The printers involved were ` +
          `${joinListCapped(activity.tonerReplacementsByPrinter.map(p => p.key), 4)}.`
        : null,
      received > 0 ? receivedSentence(model) : null,
      brought > 0
        ? `${brought} new toner stock ${pluralize(brought, "record")} ${verbWas(brought)} entered ` +
          `during the month.`
        : null
    ),
  ];
}

/* ------------------------------------------------------------------ */

function a4Paragraphs(model: StationReportModel): Block[] {
  const { activity } = model;
  const period = activity.label;
  const restocked = activity.a4Restocked;

  if (restocked.length === 0) {
    return [heading(2, "A4 Paper"), para(`No A4 paper was restocked in ${period}.`)];
  }

  return [
    heading(2, "A4 Paper"),
    para(
      `${joinList(restocked.map(r => r.office))} ${verbWas(restocked.length)} restocked with A4 ` +
        `paper in ${period}.`,
      `The Assets Station records only the date of the most recent restock for each office, not the ` +
        `quantity delivered, so how much paper arrived cannot be given.`
    ),
  ];
}

/* ------------------------------------------------------------------ */

function closing(model: StationReportModel): Block[] {
  const { activity } = model;

  return [
    heading(2, "A Note on the Records"),
    para(
      `This is a record of what happened in ${activity.label}, not a stocktake — it does not say ` +
        `what is currently held, because the Assets Station overwrites stock quantities as they ` +
        `change rather than keeping a history.`,
      activity.filtered && activity.gadgetsUndated > 0
        ? `${activity.gadgetsUndated} device ${pluralize(activity.gadgetsUndated, "record")} ` +
          `${activity.gadgetsUndated === 1 ? "carries" : "carry"} no date of entry and so cannot be ` +
          `attributed to any month; they are not counted above.`
        : null,
      `Nothing here has been filled in with an assumed number.`
    ),
  ];
}

/* ------------------------------------------------------------------ */

export function narrateStation(model: StationReportModel): Block[] {
  return [
    ...opening(model),
    ...gadgetParagraphs(model),
    ...tonerParagraphs(model),
    ...a4Paragraphs(model),
    ...closing(model),
  ];
}
