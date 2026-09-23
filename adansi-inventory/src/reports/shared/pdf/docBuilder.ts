// src/reports/shared/pdf/docBuilder.ts
//
// A thin cursor/pagination wrapper over jsPDF. Layout only — no report logic,
// so the parts that cannot be unit-tested stay small and dumb.

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const BRAND_GREEN: [number, number, number] = [22, 163, 74];
const INK: [number, number, number] = [17, 24, 39];
const MUTED: [number, number, number] = [107, 114, 128];

const MARGIN = 14; // mm
const FOOTER_RESERVE = 14;

export interface DocOptions {
  title: string;
  subtitle?: string;
  /** Printed at the foot of every page. */
  footerNote?: string;
}

export class DocBuilder {
  readonly doc: jsPDF;
  private y: number;
  private readonly pageWidth: number;
  private readonly pageHeight: number;
  private readonly footerNote?: string;

  constructor(options: DocOptions) {
    // compress: jsPDF embeds streams uncompressed otherwise, which pushed a
    // four-chart report to ~7MB. With it, the same document is a fraction of that.
    this.doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.footerNote = options.footerNote;
    this.y = MARGIN;
    this.coverHeader(options);
  }

  get contentWidth(): number {
    return this.pageWidth - MARGIN * 2;
  }

  private coverHeader({ title, subtitle }: DocOptions) {
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(20);
    this.doc.setTextColor(...INK);
    this.doc.text(title, MARGIN, this.y + 6);
    this.y += 12;

    if (subtitle) {
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(10);
      this.doc.setTextColor(...MUTED);
      this.doc.text(subtitle, MARGIN, this.y);
      this.y += 6;
    }

    this.doc.setDrawColor(...BRAND_GREEN);
    this.doc.setLineWidth(0.6);
    this.doc.line(MARGIN, this.y, this.pageWidth - MARGIN, this.y);
    this.y += 8;
  }

  /** Start a new page if `height` mm will not fit above the footer. */
  ensureSpace(height: number) {
    if (this.y + height > this.pageHeight - FOOTER_RESERVE) {
      this.doc.addPage();
      this.y = MARGIN;
    }
  }

  heading(level: 1 | 2 | 3, text: string) {
    const size = level === 1 ? 16 : level === 2 ? 13 : 11;
    const gapAbove = level === 3 ? 4 : 7;
    // Reserve the heading plus two lines, so a heading never orphans at a foot.
    this.ensureSpace(gapAbove + size * 0.5 + 12);
    this.y += gapAbove;

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(size);
    this.doc.setTextColor(...INK);
    this.doc.text(text, MARGIN, this.y);
    this.y += size * 0.42;

    if (level <= 2) {
      this.doc.setDrawColor(229, 231, 235);
      this.doc.setLineWidth(0.3);
      this.doc.line(MARGIN, this.y, this.pageWidth - MARGIN, this.y);
      this.y += 4;
    } else {
      this.y += 2;
    }
  }

  paragraph(text: string, options: { size?: number; color?: [number, number, number] } = {}) {
    const size = options.size ?? 10;
    const lineHeight = size * 0.52;
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(size);
    this.doc.setTextColor(...(options.color ?? INK));

    for (const line of this.doc.splitTextToSize(text, this.contentWidth) as string[]) {
      this.ensureSpace(lineHeight);
      this.doc.text(line, MARGIN, this.y);
      this.y += lineHeight;
    }
    this.y += 2;
  }

  /** One bullet, indented by depth. Wrapped lines align under the text. */
  bullet(text: string, depth: number) {
    const size = 9.5;
    const lineHeight = size * 0.52;
    const indent = MARGIN + depth * 5;
    const marker = depth === 0 ? "•" : depth === 1 ? "–" : "·";
    const width = this.contentWidth - depth * 5 - 4;

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(size);
    this.doc.setTextColor(...INK);

    const lines = this.doc.splitTextToSize(text, width) as string[];
    lines.forEach((line, i) => {
      this.ensureSpace(lineHeight);
      if (i === 0) this.doc.text(marker, indent, this.y);
      this.doc.text(line, indent + 4, this.y);
      this.y += lineHeight;
    });
  }

  callout(tone: "info" | "warn", title: string, text: string) {
    const size = 9.5;
    const lineHeight = size * 0.52;
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(size);
    const lines = this.doc.splitTextToSize(text, this.contentWidth - 8) as string[];
    const boxHeight = lines.length * lineHeight + 11;

    this.ensureSpace(boxHeight + 3);
    this.y += 2;

    const fill: [number, number, number] = tone === "warn" ? [254, 243, 199] : [239, 246, 255];
    const edge: [number, number, number] = tone === "warn" ? [217, 119, 6] : [37, 99, 235];
    this.doc.setFillColor(...fill);
    this.doc.rect(MARGIN, this.y, this.contentWidth, boxHeight, "F");
    this.doc.setFillColor(...edge);
    this.doc.rect(MARGIN, this.y, 1.2, boxHeight, "F");

    let ty = this.y + 5;
    this.doc.setFont("helvetica", "bold");
    this.doc.setTextColor(...edge);
    this.doc.text(title, MARGIN + 4, ty);
    ty += lineHeight + 1;

    this.doc.setFont("helvetica", "normal");
    this.doc.setTextColor(...INK);
    for (const line of lines) {
      this.doc.text(line, MARGIN + 4, ty);
      ty += lineHeight;
    }
    this.y += boxHeight + 3;
  }

  table(head: string[], rows: (string | number)[][], caption?: string) {
    if (caption) {
      this.ensureSpace(10);
      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(9.5);
      this.doc.setTextColor(...MUTED);
      this.doc.text(caption, MARGIN, this.y);
      this.y += 4;
    }
    // autoTable paginates itself — that is why it is used rather than hand-rolled.
    autoTable(this.doc, {
      head: [head],
      body: rows.map(r => r.map(String)),
      startY: this.y,
      margin: { left: MARGIN, right: MARGIN, bottom: FOOTER_RESERVE },
      styles: { fontSize: 8, cellPadding: 1.6 },
      headStyles: { fillColor: BRAND_GREEN, textColor: 255 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });
    const after = (this.doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    this.y = (after?.finalY ?? this.y) + 5;
  }

  image(dataUrl: string, naturalWidth: number, naturalHeight: number, caption?: string) {
    const width = Math.min(this.contentWidth, 150);
    const height = (naturalHeight / naturalWidth) * width;
    this.ensureSpace(height + (caption ? 6 : 0) + 4);

    if (caption) {
      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(9.5);
      this.doc.setTextColor(...MUTED);
      this.doc.text(caption, MARGIN, this.y);
      this.y += 4;
    }
    this.doc.addImage(dataUrl, "PNG", MARGIN, this.y, width, height);
    this.y += height + 4;
  }

  /**
   * Stamp "Page N of M" on every page.
   * Runs last because M is not known until the document is finished.
   */
  private stampFooters() {
    const pages = this.doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      this.doc.setPage(i);
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(8);
      this.doc.setTextColor(...MUTED);
      if (this.footerNote) this.doc.text(this.footerNote, MARGIN, this.pageHeight - 7);
      this.doc.text(`Page ${i} of ${pages}`, this.pageWidth - MARGIN, this.pageHeight - 7, {
        align: "right",
      });
    }
  }

  save(filename: string) {
    this.stampFooters();
    this.doc.save(filename);
  }

  /** The finished document as a data URI. Used to inspect output without a download. */
  toDataUri(): string {
    this.stampFooters();
    return this.doc.output("datauristring");
  }
}
