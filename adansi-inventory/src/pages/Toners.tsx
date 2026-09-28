








import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AddTonerModal from "../components/AddTonerModal";
import type { TonerStock } from "../types/toner";
import { lowToners, type TonerStockStatus } from "../toners/stockLevel";
import { normalizeType, printersUsing } from "../toners/pools";
import { getPrinters } from "../services/printerService";
import type { Printer } from "../types/printer";
import { getTonerReorderLevel } from "../services/notificationService";
import {
  getTonerStock,
  addTonerStock,
  updateTonerStock,
  deleteTonerStock,
} from "../services/tonerStockService";
import Swal from "sweetalert2";
import { AlertTriangle, Download, ChevronDown, Unlink } from "lucide-react";

// The colours a cartridge can be filed under. Matches the Add Toner form's
// own option list, since a pool's colour has to be one of those values to be
// reachable from that form.
const ALL_COLOR_OPTIONS = ["Black", "Cyan", "Magenta", "Yellow", "Black PIXMA", "Color PIXMA"];

type CartridgeRow = {
  key: string;
  tonerType: string;
  colors: Record<string, TonerStock>;
  selectedColor: string;
  usedBy: Printer[];
  status?: TonerStockStatus;
};

/** One row per cartridge; the colour picker chooses among that cartridge's pools. */
function groupPools(
  pools: TonerStock[],
  printers: Printer[],
  selectedColors: Record<string, string>
): CartridgeRow[] {
  const groups: Record<string, CartridgeRow> = {};

  pools.forEach((pool) => {
    const key = normalizeType(pool.tonerType);

    if (!groups[key]) {
      groups[key] = {
        key,
        tonerType: pool.tonerType,
        colors: {},
        selectedColor: selectedColors[key] || pool.colorType,
        usedBy: printersUsing(printers, pool.tonerType),
      };
    }

    groups[key].colors[pool.colorType] = pool;

    // Worst status across the set wins: a row is only calm when every
    // colour in it is.
    if (pool.status === "Critical") {
      groups[key].status = "Critical";
    } else if (pool.status === "Warning" && groups[key].status !== "Critical") {
      groups[key].status = "Warning";
    } else if (!groups[key].status) {
      groups[key].status = pool.status;
    }
  });

  return Object.values(groups);
}

function usedByLabel(n: number): string {
  return n === 1 ? "1 printer" : `${n} printers`;
}

export default function Toners() {
  const [pools, setPools] = useState<TonerStock[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [editing, setEditing] = useState<TonerStock | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedColors, setSelectedColors] = useState<Record<string, string>>({});
  const [reorderLevel, setReorderLevel] = useState<number | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  const isAddOpen = location.pathname === "/toners/add";

  async function loadStock() {
    setLoading(true);
    setLoadError(null);
    try {
      const [data, level, printerList] = await Promise.all([
        getTonerStock(),
        getTonerReorderLevel(),
        getPrinters(),
      ]);
      setPools(data);
      setReorderLevel(level);
      setPrinters(printerList);
    } catch (error) {
      // An empty table reads as "we have nothing", which would be a lie —
      // say plainly that the stock could not be read instead.
      setLoadError(error instanceof Error ? error.message : "Failed to load toner stock");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      await loadStock();
    })();
  }, []);

  async function handleColorSelect(row: CartridgeRow) {
    const colours = Array.from(new Set([...ALL_COLOR_OPTIONS, ...Object.keys(row.colors)]));

    await Swal.fire({
      title: "Select Color to View",
      html: `
        <div class="text-left space-y-2">
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            <strong>${row.tonerType}</strong>
          </p>
          ${colours
            .map((color) => {
              const pool = row.colors[color];
              const isSelected = color === row.selectedColor;

              return `
                <div class="p-3 border rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${isSelected ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-gray-300 dark:border-gray-600"}"
                     data-color="${color}">
                  <div class="flex justify-between items-center">
                    <span class="font-medium ${getColorTextClass(color)}">${color}</span>
                    <span class="text-gray-600 dark:text-gray-300">
                      Qty: <strong>${pool ? pool.quantity : 0}</strong>
                      ${!pool ? '<span class="text-xs text-gray-400 ml-2">(Not added)</span>' : ""}
                    </span>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      `,
      showCancelButton: true,
      showConfirmButton: false,
      cancelButtonText: "Close",
      didOpen: () => {
        const colorDivs = document.querySelectorAll("[data-color]");
        colorDivs.forEach((div) => {
          div.addEventListener("click", () => {
            const color = div.getAttribute("data-color");
            if (color) {
              Swal.close();
              setSelectedColors((prev) => ({
                ...prev,
                [row.key]: color,
              }));
            }
          });
        });
      },
    });
  }

  async function handleUsedByClick(row: CartridgeRow) {
    if (row.usedBy.length === 0) {
      await Swal.fire({
        title: row.tonerType,
        text: "No printer on the Printers page has this cartridge set as its toner type.",
        icon: "info",
      });
      return;
    }

    await Swal.fire({
      title: `Printers using ${row.tonerType}`,
      html: `
        <ul class="text-left space-y-1 text-sm">
          ${row.usedBy
            .map(
              (printer) =>
                `<li>${printer.location}${printer.room ? ` (${printer.room})` : ""} — ${printer.model}</li>`
            )
            .join("")}
        </ul>
      `,
    });
  }

  // The modal awaits this and shows any failure (including addTonerStock's
  // duplicate-pool error) itself, so this stays a plain write with no
  // try/catch of its own.
  async function handleSave(pool: Omit<TonerStock, "id">) {
    if (editing) {
      await updateTonerStock({ ...pool, id: editing.id });
    } else {
      await addTonerStock(pool);
    }

    await loadStock();
    setEditing(null);
    navigate("/toners");
  }

  async function handleQuantityUpdate(row: CartridgeRow) {
    const color = row.selectedColor;
    const existingPool = row.colors[color];
    const currentQty = existingPool?.quantity ?? 0;

    const result = await Swal.fire({
      title: `Update ${color} Toner Quantity`,
      html: `
        <div class="text-left space-y-3">
          <p class="text-sm text-gray-600 dark:text-gray-400">Cartridge: <strong>${row.tonerType}</strong></p>
          <p class="text-sm text-gray-600 dark:text-gray-400">Color: <strong class="${getColorTextClass(color)}">${color}</strong></p>
          <p class="text-sm text-gray-600 dark:text-gray-400">Current quantity: <strong>${currentQty}</strong></p>
          ${!existingPool ? '<p class="text-xs text-orange-600 dark:text-orange-400">⚠️ This color hasn\'t been added yet. Enter quantity to create it.</p>' : ""}
          <input
            id="new-quantity"
            type="number"
            min="0"
            value="${currentQty}"
            placeholder="Enter new quantity"
            class="swal2-input"
            style="margin: 0; width: 100%;"
          />
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: existingPool ? "Update" : "Add",
      confirmButtonColor: "#16a34a",
      preConfirm: () => {
        const input = document.getElementById("new-quantity") as HTMLInputElement;
        const newQty = parseInt(input.value);

        if (isNaN(newQty) || newQty < 0) {
          Swal.showValidationMessage("Please enter a valid quantity");
          return false;
        }

        return newQty;
      },
    });

    if (!result.isConfirmed || result.value === undefined) return;

    try {
      if (existingPool) {
        await updateTonerStock({
          ...existingPool,
          quantity: result.value,
          lastCheckedDate: new Date().toISOString().split("T")[0],
        });
      } else {
        await addTonerStock({
          tonerType: row.tonerType,
          colorType: color,
          quantity: result.value,
          initialQuantity: result.value,
          dateBrought: new Date().toISOString().split("T")[0],
          lastCheckedDate: new Date().toISOString().split("T")[0],
        });
      }

      await loadStock();

      Swal.fire({
        icon: "success",
        title: existingPool ? "Quantity Updated" : "Color Added",
        text: `${color} toner ${existingPool ? "updated to" : "added with quantity"} ${result.value}`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      // A duplicate-pool error means this colour was created by someone else
      // between opening the row and confirming — say so instead of failing silently.
      Swal.fire({
        icon: "error",
        title: "Could not save",
        text: error instanceof Error ? error.message : "Failed to save toner stock",
      });
    }
  }

  async function handleRemoveRow(row: CartridgeRow) {
    const colorCount = Object.keys(row.colors).length;

    const result = await Swal.fire({
      title: "Delete All Colors?",
      html: `This will delete <strong>${colorCount}</strong> color pool(s) for:<br><br>
            <strong>${row.tonerType}</strong>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete all",
    });

    if (result.isConfirmed) {
      for (const pool of Object.values(row.colors)) {
        await deleteTonerStock(pool.id);
      }

      await loadStock();

      Swal.fire({
        title: "Deleted!",
        text: `${colorCount} toner color pool(s) deleted.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    }
  }

  function exportCSV() {
    const csv = [
      ["Cartridge", "Colour", "Quantity", "Status", "Used by", "Date"],
      ...pools.map((p) => [
        p.tonerType,
        p.colorType,
        p.quantity,
        p.status || "N/A",
        usedByLabel(printersUsing(printers, p.tonerType).length),
        p.dateBrought,
      ]),
    ]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `toners_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  const groupedRows = groupPools(pools, printers, selectedColors);

  const filtered = groupedRows.filter((row) =>
    `${row.tonerType} ${Object.keys(row.colors).join(" ")}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Individual pools, not rows: a row is one cartridge's set of colours, and
  // the reorder decision is per colour. `location` is stood in for by the
  // cartridge + colour, since pools have no location of their own — it only
  // exists here to give lowToners a stable tie-break for equal quantities.
  const needsReorder =
    reorderLevel === null
      ? []
      : lowToners(
          pools.map((p) => ({ ...p, location: `${p.tonerType} ${p.colorType}` })),
          reorderLevel
        );

  // Printers that cannot be matched to any pool at all, and pools that no
  // printer draws on — both invisible until someone tries a replacement or
  // wonders why a cartridge never seems to move.
  const printersWithoutTonerType = printers.filter((p) => !normalizeType(p.tonerType));
  const unusedPools = pools.filter((p) => printersUsing(printers, p.tonerType).length === 0);

  const critical = groupedRows.filter((r) => r.status === "Critical").length;
  const warning = groupedRows.filter((r) => r.status === "Warning").length;
  const good = groupedRows.filter((r) => r.status === "Good").length;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading toners...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6">
        <div
          role="alert"
          className="bg-red-50 dark:bg-red-950/40 border-l-4 border-red-500 rounded-r-lg p-5"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" size={22} />
            <div className="flex-1">
              <p className="font-bold text-red-800 dark:text-red-300">Could not load toner stock</p>
              <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">{loadError}</p>
              <button
                onClick={loadStock}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-100 dark:bg-gray-900">
      {/* DASHBOARD CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat title="Total Toner Sets" value={groupedRows.length} />
        <Stat title="Good Stock" value={good} color="text-green-600" />
        <Stat title="Low Stock" value={warning} color="text-yellow-600" />
        <Stat title="Critical" value={critical} color="text-red-600" />
      </div>

      {(printersWithoutTonerType.length > 0 || unusedPools.length > 0) && (
        <div
          role="alert"
          className="bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 rounded-r-lg p-5"
        >
          <div className="flex items-start gap-3">
            <Unlink className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={22} />
            <div className="flex-1 space-y-4">
              {printersWithoutTonerType.length > 0 && (
                <div>
                  <p className="font-bold text-amber-800 dark:text-amber-300">
                    {printersWithoutTonerType.length}{" "}
                    {printersWithoutTonerType.length === 1 ? "printer has" : "printers have"} no
                    toner type set
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                    Without a toner type, replacement cannot find a stock pool for{" "}
                    {printersWithoutTonerType.length === 1 ? "it" : "them"}. Set it on the
                    Printers page.
                  </p>
                  <ul className="mt-3 space-y-2">
                    {printersWithoutTonerType.map((p) => (
                      <li
                        key={p.id}
                        className="text-sm bg-white/60 dark:bg-gray-900/40 rounded p-3 text-gray-900 dark:text-white"
                      >
                        {p.location}
                        {p.room ? ` (${p.room})` : ""} — {p.model}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {unusedPools.length > 0 && (
                <div>
                  <p className="font-bold text-amber-800 dark:text-amber-300">
                    {unusedPools.length} stock pool{unusedPools.length === 1 ? "" : "s"}{" "}
                    {unusedPools.length === 1 ? "has" : "have"} no printer using{" "}
                    {unusedPools.length === 1 ? "it" : "them"}
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                    No printer on the Printers page has this cartridge set as its toner type.
                  </p>
                  <ul className="mt-3 space-y-2">
                    {unusedPools.map((p) => (
                      <li
                        key={p.id}
                        className="text-sm bg-white/60 dark:bg-gray-900/40 rounded p-3 text-gray-900 dark:text-white"
                      >
                        {p.colorType} {p.tonerType} — {p.quantity}{" "}
                        {p.quantity === 1 ? "cartridge" : "cartridges"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {needsReorder.length > 0 && (
        <div
          role="alert"
          className="bg-red-50 dark:bg-red-950/40 border-l-4 border-red-500 rounded-r-lg p-5"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" size={22} />
            <div className="flex-1">
              <p className="font-bold text-red-800 dark:text-red-300">
                {needsReorder.length} {needsReorder.length === 1 ? "toner needs" : "toners need"}{" "}
                reordering
              </p>
              <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">
                At or below the reorder level of {reorderLevel}{" "}
                {reorderLevel === 1 ? "cartridge" : "cartridges"}. Change this in Settings.
              </p>
              <ul className="mt-3 space-y-1">
                {needsReorder.map((t) => (
                  <li key={t.id} className="text-sm text-red-900 dark:text-red-200">
                    <span className="font-semibold">
                      {t.colorType} {t.tonerType}
                    </span>{" "}
                    —{" "}
                    <span className="font-semibold">
                      {t.quantity === 0
                        ? "none left"
                        : `${t.quantity} ${t.quantity === 1 ? "cartridge" : "cartridges"} left`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ACTION BAR */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <input
          placeholder="Search toner..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 w-full md:w-72 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
          >
            <Download size={18} />
            Export CSV
          </button>

          <button
            onClick={() => navigate("/toners/add")}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Add Toner
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              {[
                "Cartridge",
                "Color",
                "Used by",
                "Qty",
                "Status",
                "Recommendation",
                "Date",
                "Actions",
              ].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-gray-900 dark:text-white whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const selectedPool = row.colors[row.selectedColor];
              const displayedQty = selectedPool?.quantity ?? 0;

              return (
                <tr key={row.key} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                    {row.tonerType}
                  </td>

                  <td className="px-4 py-3">
                    <ColorSelectorBadge
                      color={row.selectedColor}
                      onClick={() => handleColorSelect(row)}
                    />
                  </td>

                  <td className="px-4 py-3">
                    <UsedByChip count={row.usedBy.length} onClick={() => handleUsedByClick(row)} />
                  </td>

                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleQuantityUpdate(row)}
                      className="text-gray-900 dark:text-white font-bold text-lg hover:text-green-600 dark:hover:text-green-400 transition-colors"
                      title="Click to update quantity"
                    >
                      {displayedQty}
                      {displayedQty === 0 && (
                        <span className="text-xs text-gray-400 ml-1">(add)</span>
                      )}
                    </button>
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge status={selectedPool?.status} />
                  </td>

                  <td className="px-4 py-3">
                    <RecommendationBadge
                      percentage={selectedPool?.initialQuantity ? (displayedQty / selectedPool.initialQuantity) * 100 : 100}
                    />
                  </td>

                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {selectedPool?.dateBrought ?? "—"}
                  </td>

                  <td className="px-4 py-3 space-x-3 whitespace-nowrap">
                    <button
                      onClick={() => {
                        const record = row.colors[row.selectedColor] ?? Object.values(row.colors)[0];
                        if (!record) return;
                        setEditing(record);
                        navigate("/toners/add");
                      }}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleRemoveRow(row)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-400 dark:text-gray-500">
                  {search ? "No toners found" : "No toners yet. Add your first toner!"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isAddOpen && (
        <AddTonerModal
          existing={editing || undefined}
          onSave={handleSave}
          onClose={() => {
            setEditing(null);
            navigate("/toners");
          }}
        />
      )}
    </div>
  );
}

function getColorTextClass(color: string): string {
  const classes: Record<string, string> = {
    Black: "text-gray-900 dark:text-gray-100",
    Cyan: "text-cyan-600 dark:text-cyan-400",
    Magenta: "text-pink-600 dark:text-pink-400",
    Yellow: "text-yellow-600 dark:text-yellow-400",
    Color: "text-purple-600 dark:text-purple-400",
  };
  return classes[color] || "text-gray-600 dark:text-gray-400";
}

function Stat({ title, value, color = "" }: { title: string; value: string | number; color?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow border border-gray-200 dark:border-gray-700">
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p className={`text-2xl font-bold ${color || "text-gray-900 dark:text-white"}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-gray-400 text-xs">N/A</span>;

  const colors = {
    Good: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    Warning: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    Critical: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors]}`}>
      {status}
    </span>
  );
}

function ColorSelectorBadge({ color, onClick }: { color: string; onClick: () => void }) {
  const colors: Record<string, string> = {
    Black: "bg-gray-800 text-white hover:bg-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800",
    Cyan: "bg-cyan-500 text-white hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-700",
    Magenta: "bg-pink-500 text-white hover:bg-pink-600 dark:bg-pink-600 dark:hover:bg-pink-700",
    Yellow: "bg-yellow-400 text-gray-900 hover:bg-yellow-500 dark:bg-yellow-500 dark:hover:bg-yellow-600",
    Color: "bg-gradient-to-r from-cyan-500 via-pink-500 to-yellow-400 text-white hover:opacity-90",
  };

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all inline-flex items-center gap-1.5 ${
        colors[color] || "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
      }`}
      title="Click to select different color"
    >
      {color}
      <ChevronDown size={14} />
    </button>
  );
}

function UsedByChip({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
      title="Click to see which printers"
    >
      {usedByLabel(count)}
    </button>
  );
}

function RecommendationBadge({ percentage }: { percentage: number }) {
  if (percentage > 50) {
    return (
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs">
        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        No usage yet
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-xs">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      Low stock
    </div>
  );
}
