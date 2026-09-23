// src/reports/shared/pdf/renderPdf.ts
//
// Block[] -> PDF. Pure layout: it walks the document and draws it. All report
// logic already happened in buildModel/narrate.

import type { Block, BulletItem } from "../blocks";
import { DocBuilder } from "./docBuilder";
import type { CapturedChart } from "./chartCapture";

export interface RenderOptions {
  title: string;
  subtitle?: string;
  footerNote?: string;
  charts: Map<string, CapturedChart>;
}

function drawBullets(builder: DocBuilder, items: BulletItem[], depth = 0) {
  for (const item of items) {
    builder.bullet(item.text, depth);
    if (item.children?.length) drawBullets(builder, item.children, depth + 1);
  }
}

/** Draws the document and returns it. The caller decides what to do with it. */
export function renderReportPdf(blocks: Block[], options: RenderOptions): DocBuilder {
  const builder = new DocBuilder({
    title: options.title,
    subtitle: options.subtitle,
    footerNote: options.footerNote,
  });

  for (const block of blocks) {
    switch (block.kind) {
      case "heading":
        // The document's own H1 is already the cover title.
        if (block.level === 1) break;
        builder.heading(block.level, block.text);
        break;
      case "paragraph":
        builder.paragraph(block.text);
        break;
      case "bullets":
        drawBullets(builder, block.items);
        builder.paragraph("", { size: 2 });
        break;
      case "table":
        builder.table(block.head, block.rows, block.caption);
        break;
      case "callout":
        builder.callout(block.tone, block.title, block.text);
        break;
      case "chart": {
        const captured = options.charts.get(block.chartId);
        if (captured) {
          builder.image(captured.dataUrl, captured.width, captured.height, block.title);
        } else {
          // Never fail the document over a chart — the tables hold the numbers.
          builder.paragraph(`[${block.title} — chart unavailable]`, { color: [107, 114, 128] });
        }
        break;
      }
    }
  }

  return builder;
}
