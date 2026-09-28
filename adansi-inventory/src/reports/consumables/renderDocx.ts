import {
  AlignmentType, BorderStyle, Document, HeadingLevel, Packer, Paragraph,
  ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
} from "docx";
import type { A4Sheet } from "../../types/A4Sheet";
import type { TonerStock, TonerReplacement } from "../../types/toner";
import type { Printer } from "../../types/printer";
import { buildConsumablesModel } from "./model";
import { printersUsing } from "../../toners/pools";

const green = "16A34A";
const cell = (text: string | number, header = false) => new TableCell({
  shading: header ? { fill: green, type: ShadingType.CLEAR } : undefined,
  margins: { top: 100, bottom: 100, left: 120, right: 120 },
  children: [new Paragraph({ children: [new TextRun({ text: String(text), bold: header, color: header ? "FFFFFF" : "111827", size: 18 })] })],
});
const table = (headers: string[], rows: (string | number)[][]) => new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: { top:{style:BorderStyle.SINGLE,size:1,color:"D1D5DB"}, bottom:{style:BorderStyle.SINGLE,size:1,color:"D1D5DB"}, left:{style:BorderStyle.SINGLE,size:1,color:"D1D5DB"}, right:{style:BorderStyle.SINGLE,size:1,color:"D1D5DB"}, insideHorizontal:{style:BorderStyle.SINGLE,size:1,color:"E5E7EB"}, insideVertical:{style:BorderStyle.SINGLE,size:1,color:"E5E7EB"} },
  rows: [new TableRow({ children: headers.map(h => cell(h, true)), tableHeader: true }), ...rows.map(row => new TableRow({ children: row.map(v => cell(v)) }))],
});
const heading = (text: string) => new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 140 } });

export async function downloadConsumablesDocx(toners: TonerStock[], replacements: TonerReplacement[], sheets: A4Sheet[], printers: Printer[]) {
  const m = buildConsumablesModel(toners, replacements, sheets, printers);
  const today = new Date().toISOString().slice(0, 10);
  const document = new Document({
    styles: { default: { document: { run: { font: "Aptos", size: 22 } } } },
    sections: [{ properties: {}, children: [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing:{after:120}, children:[new TextRun({ text:"CONSUMABLES MANAGEMENT REPORT", bold:true, size:36, color:"14532D" })] }),
      new Paragraph({ alignment:AlignmentType.CENTER, spacing:{after:300}, children:[new TextRun({ text:`Toners and A4 sheets only | Generated ${today}`, color:"6B7280", size:20 })] }),
      heading("Executive Summary"),
      new Paragraph(`There are ${m.tonerRemaining} toner cartridges remaining and ${m.tonerUsed} recorded toner replacements (used cartridges). A4 stock is ${m.a4Remaining} reams, with ${m.a4Used} reams estimated as used from current records.`),
      table(["Management measure", "Result"], [
        ["Toner cartridges remaining", m.tonerRemaining], ["Toner cartridges used", m.tonerUsed],
        ["Average toner usage duration", m.tonerAverageDays === null ? "Not enough repeat history" : `${m.tonerAverageDays} days`],
        ["A4 reams remaining", m.a4Remaining], ["A4 reams estimated used", m.a4Used], ["A4 estimated monthly usage", `${m.a4MonthlyUsage} reams`],
      ]),
      heading("Management Recommendations"),
      ...m.recommendations.map(r => new Paragraph({ bullet:{level:0}, children:[new TextRun({text:`${r.priority}: `,bold:true}),new TextRun(r.text)] })),
      heading("Toner Stock Detail"),
      table(["Cartridge", "Colour", "Left", "Status", "Used by"], toners.map(t => {
        const usedBy = printersUsing(printers, t.tonerType);
        const offices = usedBy.length
          ? usedBy.map(p => `${p.location}${p.room ? ` (${p.room})` : ""}`).join(", ")
          : "No printers assigned";
        return [t.tonerType, t.colorType, t.quantity, t.status ?? "Not set", offices];
      })),
      heading("A4 Stock and Consumption"),
      table(["Office", "Brand", "Initial", "Used", "Left", "Monthly use", "Days left", "Status"], sheets.map(s => [s.officeName, s.brand, s.initialQuantity, Math.max(0,s.initialQuantity-s.currentQuantity), s.currentQuantity, s.averageMonthlyUsage ?? "N/A", s.estimatedDaysRemaining ?? "N/A", s.status])),
      heading("Data Notes"),
      new Paragraph("Toner used is based on recorded replacement entries. Toner duration is calculated only when the same printer and colour have at least two replacement dates. A4 used is initial quantity minus current quantity. Missing updates or restocking within one record may limit historical accuracy."),
    ] }],
  });
  const blob = await Packer.toBlob(document);
  const url = URL.createObjectURL(blob);
  const anchor = documentRef().createElement("a");
  anchor.href = url; anchor.download = `Consumables_Management_Report_${today}.docx`; anchor.click();
  URL.revokeObjectURL(url);
}

const documentRef = () => globalThis.document;
