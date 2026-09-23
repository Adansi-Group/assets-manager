// src/reports/gadgets/ReportCharts.tsx
//
// The charts that get captured into the PDF.
//
// Two rules make capture reliable:
//  - Explicit hex colours, never Tailwind classes. The PDF is always white, so
//    a chart must not inherit the app's dark theme.
//  - Fixed pixel sizes and no ResponsiveContainer: its ResizeObserver does not
//    fire dependably for an offscreen node, which yields a blank chart.

import { Bar, BarChart, Cell, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartId } from "../shared/blocks";
import type { GadgetReportModel } from "./model";

/** Print-safe palette, checked for contrast on white. */
const PALETTE = ["#166534", "#2563eb", "#c2410c", "#7c3aed", "#0891b2", "#a16207", "#be123c"];
const AXIS = "#374151";
const GRID = "#e5e7eb";

const CHART_W = 620;
const CHART_H = 300;

const axisProps = {
  stroke: AXIS,
  tick: { fill: AXIS, fontSize: 12 },
} as const;

/** Long model names need room; keep the axis readable without truncating data. */
const trim = (s: string, max = 22) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

function CategoryBar({ data }: { data: { name: string; value: number }[] }) {
  return (
    <BarChart
      width={CHART_W}
      height={CHART_H}
      data={data}
      margin={{ top: 8, right: 16, bottom: 56, left: 8 }}
    >
      <XAxis
        dataKey="name"
        {...axisProps}
        angle={-30}
        textAnchor="end"
        interval={0}
        height={60}
        tickFormatter={(v: string) => trim(v)}
      />
      <YAxis {...axisProps} allowDecimals={false} />
      <Tooltip cursor={{ fill: GRID }} />
      <Bar dataKey="value" isAnimationActive={false} radius={[3, 3, 0, 0]}>
        {data.map((_, i) => (
          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
        ))}
      </Bar>
    </BarChart>
  );
}

function CategoryPie({ data }: { data: { name: string; value: number }[] }) {
  return (
    <PieChart width={CHART_W} height={CHART_H}>
      <Pie
        data={data}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        outerRadius={100}
        isAnimationActive={false}
        label={({ name, value }: { name?: string; value?: number }) => `${name}: ${value}`}
        labelLine={{ stroke: AXIS }}
      >
        {data.map((_, i) => (
          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
        ))}
      </Pie>
      {/* No <Legend>: each slice is already labelled, and recharts renders
          legend icons as sibling <svg class="recharts-surface"> elements that
          confuse chart capture. */}
    </PieChart>
  );
}

const toData = (t: { key: string; count: number }[]) =>
  t.map(x => ({ name: x.key, value: x.count }));

function chartFor(id: ChartId, model: GadgetReportModel) {
  switch (id) {
    case "byType":
      return <CategoryPie data={toData(model.summary.byType)} />;
    case "byStatus":
      return <CategoryBar data={toData(model.summary.byStatus)} />;
    case "laptopModels":
      return <CategoryBar data={model.laptops.models.map(m => ({ name: m.model, value: m.count }))} />;
    case "phoneModels":
      return <CategoryBar data={model.phones.models.map(m => ({ name: m.model, value: m.count }))} />;
    case "byYear": {
      const years = new Map<number, number>();
      for (const s of [model.laptops, model.phones]) {
        for (const m of s.models)
          for (const v of m.variants)
            if (v.years.min !== null) years.set(v.years.min, (years.get(v.years.min) ?? 0) + v.count);
      }
      return (
        <CategoryBar
          data={[...years.entries()].sort((a, b) => a[0] - b[0]).map(([y, c]) => ({ name: String(y), value: c }))}
        />
      );
    }
  }
}

/**
 * Renders every chart the document references, offscreen but laid out.
 *
 * `left: -10000px` rather than `display: none` — recharts needs real layout to
 * compute geometry, and a hidden node captures blank.
 */
export function ChartStage({ model, chartIds }: { model: GadgetReportModel; chartIds: ChartId[] }) {
  return (
    <div
      aria-hidden
      style={{ position: "absolute", left: -10000, top: 0, width: CHART_W, background: "#ffffff" }}
    >
      {chartIds.map(id => (
        <div key={id} data-chart-id={id} style={{ background: "#ffffff" }}>
          {chartFor(id, model)}
        </div>
      ))}
    </div>
  );
}
