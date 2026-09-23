// src/reports/shared/pdf/chartCapture.ts
//
// Rasterise a recharts <svg> to a PNG data URL for embedding in a PDF.
//
// Deliberately not html2canvas: that reads computed styles off the live DOM, so
// a chart rendered in dark mode would carry dark colours into a white PDF. It is
// also only an optional transitive dep of jspdf, so it can vanish on a clean
// install. Serialising the SVG has neither problem — the charts are given
// explicit hex colours and render identically in both themes.

const SVG_NS = "http://www.w3.org/2000/svg";

/** Fonts do not survive serialisation — the cascade is gone. Inject them. */
const EMBEDDED_CSS = `
  text { font-family: Helvetica, Arial, sans-serif; }
`;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Chart image failed to decode"));
    img.src = url;
  });
}

/**
 * The chart's own SVG, not a legend icon.
 *
 * recharts marks legend icons with class "recharts-surface" too, and for a
 * PieChart it renders them BEFORE the chart in document order — so taking the
 * first <svg> silently captures a 14x14 icon and embeds a blank image. Picking
 * the largest is robust to that ordering.
 */
export function findChartSvg(node: HTMLElement): SVGSVGElement | null {
  const svgs = [...node.querySelectorAll("svg")];
  if (svgs.length === 0) return null;
  const area = (el: SVGSVGElement) => {
    const r = el.getBoundingClientRect();
    return (r.width || 0) * (r.height || 0);
  };
  return svgs.reduce((best, el) => (area(el) > area(best) ? el : best), svgs[0]);
}

/** Two frames: recharts computes geometry in JS, so one is not always enough. */
export function nextFrames(count = 2): Promise<void> {
  return new Promise(resolve => {
    let remaining = count;
    const tick = () => (remaining-- <= 0 ? resolve() : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
  });
}

export interface CapturedChart {
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Serialise an SVG element and draw it to a canvas.
 *
 * @param scale Pixel density. 2 keeps text crisp at print size; 4 roughly
 *              quadruples file size for no visible gain.
 */
export async function svgToPng(svg: SVGSVGElement, scale = 2): Promise<CapturedChart> {
  const rect = svg.getBoundingClientRect();
  const width = Math.round(rect.width || Number(svg.getAttribute("width")) || 0);
  const height = Math.round(rect.height || Number(svg.getAttribute("height")) || 0);
  if (width === 0 || height === 0) {
    throw new Error("Chart has no layout — it cannot be captured while hidden");
  }

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", SVG_NS);
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));

  const style = document.createElementNS(SVG_NS, "style");
  style.textContent = EMBEDDED_CSS;
  clone.insertBefore(style, clone.firstChild);

  const markup = new XMLSerializer().serializeToString(clone);
  // A Blob URL, not `data:` + btoa: btoa throws on any non-Latin-1 character,
  // and chart labels here contain "GH₵" and en-dashes.
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }));

  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");

    // SVG has no background of its own; without this the PNG is transparent,
    // which several PDF viewers render as solid black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return { dataUrl: canvas.toDataURL("image/png"), width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Capture every chart in a container, keyed by its data-chart-id.
 *
 * Never rejects: a chart that fails to capture is simply absent from the map,
 * and the PDF notes it. Tables carry the real numbers; charts are decoration,
 * and a browser quirk must not cost someone their report.
 */
export async function captureCharts(container: HTMLElement): Promise<Map<string, CapturedChart>> {
  await nextFrames();
  const nodes = [...container.querySelectorAll<HTMLElement>("[data-chart-id]")];

  const results = await Promise.allSettled(
    nodes.map(async node => {
      const id = node.dataset.chartId as string;
      const svg = findChartSvg(node);
      if (!svg) throw new Error(`Chart "${id}" rendered no SVG`);
      return [id, await svgToPng(svg)] as const;
    })
  );

  const captured = new Map<string, CapturedChart>();
  for (const r of results) {
    if (r.status === "fulfilled") captured.set(r.value[0], r.value[1]);
    else console.warn("Chart capture failed:", r.reason);
  }
  return captured;
}
