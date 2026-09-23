// src/reports/shared/blocks.ts
//
// A tiny document AST. `narrate()` produces Block[]; the React preview and the
// jsPDF writer both render it. Neither renderer holds report logic, so what the
// screen shows and what the PDF contains cannot drift apart.

export type Block =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "bullets"; items: BulletItem[] }
  | { kind: "table"; head: string[]; rows: (string | number)[][]; caption?: string }
  | { kind: "chart"; chartId: ChartId; title: string }
  | { kind: "callout"; tone: "info" | "warn"; title: string; text: string };

/** A bullet, optionally with nested children — the colleague's report nests 3 deep. */
export interface BulletItem {
  text: string;
  children?: BulletItem[];
}

/** Charts the report can reference. Rendered offscreen, captured, embedded. */
export type ChartId = "byType" | "byStatus" | "laptopModels" | "phoneModels" | "byYear";

export const heading = (level: 1 | 2 | 3, text: string): Block => ({ kind: "heading", level, text });
export const paragraph = (text: string): Block => ({ kind: "paragraph", text });
export const bullets = (items: BulletItem[]): Block => ({ kind: "bullets", items });
export const table = (head: string[], rows: (string | number)[][], caption?: string): Block => ({
  kind: "table",
  head,
  rows,
  caption,
});
export const chart = (chartId: ChartId, title: string): Block => ({ kind: "chart", chartId, title });
export const callout = (tone: "info" | "warn", title: string, text: string): Block => ({
  kind: "callout",
  tone,
  title,
  text,
});

/** Convenience for a plain bullet with no children. */
export const li = (text: string, children?: BulletItem[]): BulletItem => ({ text, children });
