import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, Download, FileText, Timer, Droplets, PackageCheck, FileType2 } from "lucide-react";
import { getTonerStock } from "../services/tonerStockService";
import { getAllReplacements } from "../services/Tonerreplacementservice";
import { getA4Sheets } from "../services/a4SheetService";
import { getPrintersStrict } from "../services/printerService";
import type { TonerStock, TonerReplacement } from "../types/toner";
import type { A4Sheet } from "../types/A4Sheet";
import type { Printer } from "../types/printer";
import { buildConsumablesModel } from "../reports/consumables/model";
import { printersUsing } from "../toners/pools";
import { officesLabel, usedByLabel } from "../toners/poolRows";
import { DocBuilder } from "../reports/shared/pdf/docBuilder";
import { downloadConsumablesDocx } from "../reports/consumables/renderDocx";

export default function ConsumablesReport() {
  const [toners, setToners] = useState<TonerStock[]>([]);
  const [replacements, setReplacements] = useState<TonerReplacement[]>([]);
  const [sheets, setSheets] = useState<A4Sheet[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, r, s, p] = await Promise.all([
        getTonerStock(),
        getAllReplacements(),
        getA4Sheets(),
        getPrintersStrict(),
      ]);
      setToners(t); setReplacements(r); setSheets(s); setPrinters(p);
    } catch (e) {
      // A failed stock or printers read must never render as an empty or
      // zero report — that reads as "nothing in stock" rather than
      // "we could not load the stock".
      console.error("Error loading the consumables report:", e);
      setError(e instanceof Error ? e.message : "Could not load the consumables report.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);
  const model = useMemo(() => buildConsumablesModel(toners, replacements, sheets, printers), [toners, replacements, sheets, printers]);

  const usedByText = (t: TonerStock) => officesLabel(printersUsing(printers, t.tonerType));

  function exportPDF() {
    const today = new Date().toISOString().slice(0, 10);
    const doc = new DocBuilder({ title: "Consumables Management Report", subtitle: `Toners and A4 sheets only · Generated ${today}`, footerNote: "Adansi Travels · Assets Station" });
    doc.heading(2, "Executive Summary");
    doc.paragraph(`${model.tonerRemaining} toner cartridges remain in stock and ${model.tonerUsed} replacements are recorded as cartridges used. A4 stock is ${model.a4Remaining} reams, with ${model.a4Used} reams estimated as used from the current records.`);
    doc.table(["Measure", "Result"], [
      ["Toner cartridges remaining", model.tonerRemaining], ["Toner cartridges used", model.tonerUsed],
      ["Average toner usage duration", model.tonerAverageDays === null ? "Insufficient repeat replacements" : `${model.tonerAverageDays} days`],
      ["A4 reams remaining", model.a4Remaining], ["A4 reams estimated used", model.a4Used], ["A4 estimated monthly usage", `${model.a4MonthlyUsage} reams`],
    ]);
    doc.heading(2, "Toner Stock Detail");
    doc.table(["Cartridge", "Colour", "Left", "Status", "Used by"], toners.map(t => [t.tonerType, t.colorType, t.quantity, t.status ?? "Not set", usedByText(t)]));
    doc.heading(2, "A4 Stock and Consumption");
    doc.table(["Office", "Brand", "Initial", "Used", "Left", "Monthly use", "Days left", "Status"], sheets.map(s => [s.officeName, s.brand, s.initialQuantity, Math.max(0, s.initialQuantity - s.currentQuantity), s.currentQuantity, s.averageMonthlyUsage ?? "Not enough data", s.estimatedDaysRemaining ?? "Not enough data", s.status]));
    doc.heading(2, "Recommendations");
    model.recommendations.forEach(item => doc.bullet(`${item.priority}: ${item.text}`, 0));
    doc.callout("info", "How usage is calculated", "A toner is counted as used when a replacement is recorded. Toner duration is the number of days between repeat replacements for the same printer and colour. A4 used is initial quantity minus current quantity; restocking or missing updates can limit historical accuracy.");
    doc.save(`Consumables_Management_Report_${today}.pdf`);
  }

  if (loading) return <div className="p-6 flex justify-center h-96 items-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" /></div>;

  if (error) return <div className="p-6 space-y-6 bg-gray-100 dark:bg-gray-900">
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 flex items-center gap-4">
      <AlertTriangle className="text-red-500 shrink-0" size={24} />
      <div className="flex-1">
        <p className="font-semibold text-gray-900 dark:text-white">Could not load the consumables report</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
      </div>
      <button onClick={() => void loadData()} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm">Try again</button>
    </div>
  </div>;

  return <div className="p-6 space-y-6 bg-gray-100 dark:bg-gray-900">
    <div className="flex flex-wrap justify-between gap-3"><div><h1 className="text-3xl font-bold text-gray-900 dark:text-white">Consumables Management Report</h1><p className="text-gray-600 dark:text-gray-400">Meeting-ready toner and A4 analysis — gadgets excluded</p></div><div className="flex flex-wrap gap-3"><button onClick={() => void downloadConsumablesDocx(toners, replacements, sheets, printers)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"><FileType2 size={18}/>Download Word for Gamma</button><button onClick={exportPDF} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"><Download size={18}/>Download PDF</button></div></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card title="Toners Remaining" value={model.tonerRemaining} icon={<Droplets/>}/><Card title="Toners Used" value={model.tonerUsed} icon={<PackageCheck/>}/><Card title="Average Toner Duration" value={model.tonerAverageDays === null ? "Not enough history" : `${model.tonerAverageDays} days`} icon={<Timer/>}/>
      <Card title="A4 Remaining" value={`${model.a4Remaining} reams`} icon={<FileText/>}/><Card title="A4 Estimated Used" value={`${model.a4Used} reams`} icon={<PackageCheck/>}/><Card title="A4 Monthly Usage" value={`${model.a4MonthlyUsage} reams`} icon={<Timer/>}/>
    </div>
    <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-6"><h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex gap-2"><AlertTriangle className="text-amber-500"/>Management Recommendations</h2><div className="space-y-3">{model.recommendations.map((r, i) => <div key={i} className={`border-l-4 p-3 rounded-r ${r.priority === "Urgent" ? "border-red-500 bg-red-50 dark:bg-red-950/30" : r.priority === "Soon" ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30" : "border-blue-500 bg-blue-50 dark:bg-blue-950/30"}`}><strong>{r.priority}:</strong> {r.text}</div>)}</div></section>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><Table title="Toner Stock" headers={["Cartridge / Colour", "Left", "Used by"]} rows={toners.map(t => [`${t.tonerType} / ${t.colorType}`, t.quantity, usedByLabel(printersUsing(printers, t.tonerType).length)])}/><Table title="A4 Stock" headers={["Office", "Used", "Left / Status"]} rows={sheets.map(s => [s.officeName, Math.max(0, s.initialQuantity-s.currentQuantity), `${s.currentQuantity} / ${s.status}`])}/></div>
  </div>;
}

function Card({title,value,icon}:{title:string;value:string|number;icon:ReactNode}) { return <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5"><div className="text-green-600 mb-2">{icon}</div><p className="text-sm text-gray-500">{title}</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p></div>; }
function Table({title,headers,rows}:{title:string;headers:string[];rows:(string|number)[][]}) { return <section className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden"><h2 className="text-xl font-bold p-5 text-gray-900 dark:text-white">{title}</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-100 dark:bg-gray-700"><tr>{headers.map(h=><th key={h} className="p-3 text-left">{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i} className="border-t dark:border-gray-700">{r.map((v,j)=><td key={j} className="p-3">{v}</td>)}</tr>)}</tbody></table></div></section>; }
