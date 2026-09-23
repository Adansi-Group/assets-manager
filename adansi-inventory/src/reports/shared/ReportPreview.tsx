// src/reports/shared/ReportPreview.tsx
//
// Renders Block[] on screen. The PDF writer renders the same Block[], so what
// is reviewed here is what gets downloaded.

import type { Block, BulletItem } from "./blocks";

function Bullets({ items, depth = 0 }: { items: BulletItem[]; depth?: number }) {
  return (
    <ul className={depth === 0 ? "space-y-1.5" : "mt-1.5 space-y-1.5"}>
      {items.map((item, i) => (
        <li key={i} className="text-sm text-gray-700 dark:text-gray-300">
          <div className="flex gap-2">
            <span className="text-gray-400 dark:text-gray-500 select-none">
              {depth === 0 ? "•" : depth === 1 ? "–" : "·"}
            </span>
            <span>{item.text}</span>
          </div>
          {item.children?.length ? (
            <div className="ml-5">
              <Bullets items={item.children} depth={depth + 1} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case "heading": {
      if (block.level === 1) {
        return (
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{block.text}</h1>
        );
      }
      const size = block.level === 2 ? "text-lg" : "text-base";
      return (
        <h2
          className={`${size} font-bold text-gray-900 dark:text-white ${
            block.level === 2 ? "border-b border-gray-200 dark:border-gray-700 pb-1.5 mt-2" : "mt-1"
          }`}
        >
          {block.text}
        </h2>
      );
    }

    case "paragraph":
      return <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{block.text}</p>;

    case "bullets":
      return <Bullets items={block.items} />;

    case "table":
      return (
        <div>
          {block.caption && (
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
              {block.caption}
            </p>
          )}
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-green-600">
                <tr>
                  {block.head.map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-white">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {block.rows.map((row, i) => (
                  <tr key={i} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-800 dark:even:bg-gray-900">
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-1.5 text-gray-700 dark:text-gray-300">
                        {String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    case "callout": {
      const tone =
        block.tone === "warn"
          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40"
          : "border-blue-500 bg-blue-50 dark:bg-blue-950/40";
      const title =
        block.tone === "warn"
          ? "text-amber-700 dark:text-amber-400"
          : "text-blue-700 dark:text-blue-400";
      return (
        <div className={`border-l-4 rounded-r-lg px-4 py-3 ${tone}`}>
          <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${title}`}>{block.title}</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{block.text}</p>
        </div>
      );
    }

    case "chart":
      // Charts are drawn offscreen for capture; on screen this is just a marker
      // so the preview's running order matches the PDF's.
      return (
        <p className="text-xs italic text-gray-400 dark:text-gray-500">
          {block.title} — included as a chart in the PDF
        </p>
      );
  }
}

export default function ReportPreview({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-3">
      {blocks.map((block, i) => (
        <BlockView key={i} block={block} />
      ))}
    </div>
  );
}
