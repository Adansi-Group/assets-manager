








import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AddTonerModal from "../components/AddTonerModal";
import type { TonerStock } from "../types/toner";
import { lowToners } from "../toners/stockLevel";
import { findPool, isInService, normalizeType, printersUsing } from "../toners/pools";
import { deliveryProblem } from "../toners/deliveries";
import { canonicalColour, colourChoices, withCanonicalColour } from "../toners/colours";
import {
  findPoolCollisions,
  groupPools,
  selectedPool,
  usedByLabel,
  type CartridgeRow,
} from "../toners/poolRows";
import { getPrintersStrict, PRINTERS_COLLECTION } from "../services/printerService";
import type { Printer } from "../types/printer";
import { getTonerReorderLevel } from "../services/notificationService";
import {
  getTonerStock,
  addTonerStock,
  updateTonerStock,
  deleteTonerStock,
  TONER_STOCK_COLLECTION,
} from "../services/tonerStockService";
import {
  recordTonerDelivery,
  TONER_DELIVERIES_COLLECTION,
} from "../services/tonerDeliveryService";
import { accessErrorMessage } from "../toners/accessErrors";
import { correctionHint } from "../toners/corrections";
import { getAllTonerTypes } from "../services/tonerService";
import Swal from "sweetalert2";
import { AlertTriangle, Download, ChevronDown, Unlink } from "lucide-react";

/** Cartridge names are typed by people; keep them out of the Swal markup's way. */
const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const today = () => new Date().toISOString().split("T")[0];

type StockSource = { kind: "delivery"; dateReceived: string } | { kind: "correction" };

/**
 * Ask whether new stock is a delivery or a count correction. Neither is
 * pre-selected: logging a recount as "received" would be as false as
 * missing a real delivery. Resolves null when cancelled.
 */
async function askStockSource(
  tonerType: string,
  colorType: string,
  quantity: number
): Promise<StockSource | null> {
  const result = await Swal.fire({
    title: "Delivery or correction?",
    html: `
      <div class="text-left space-y-3">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          ${quantity} &times; <strong>${escapeHtml(colorType)} ${escapeHtml(tonerType)}</strong>
        </p>
        <label class="flex items-start gap-2 p-3 border rounded cursor-pointer border-gray-300 dark:border-gray-600">
          <input type="radio" name="stock-source" value="delivery" style="margin-top: 4px;" />
          <span class="text-sm">
            <strong>New delivery</strong> — arrived on
            <input id="stock-source-date" type="date" value="${today()}" max="${today()}" class="swal2-input" style="margin: 6px 0 0; width: 100%;" />
          </span>
        </label>
        <label class="flex items-start gap-2 p-3 border rounded cursor-pointer border-gray-300 dark:border-gray-600">
          <input type="radio" name="stock-source" value="correction" style="margin-top: 4px;" />
          <span class="text-sm">
            <strong>Count correction (not a delivery)</strong><br />
            <span class="text-gray-500">Cartridges already in the store, e.g. found in a recount.</span>
          </span>
        </label>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Save",
    confirmButtonColor: "#16a34a",
    preConfirm: () => {
      const chosen = document.querySelector<HTMLInputElement>('input[name="stock-source"]:checked');
      if (!chosen) {
        Swal.showValidationMessage("Choose New delivery or Count correction.");
        return false;
      }
      if (chosen.value === "correction") return { kind: "correction" } as StockSource;

      const dateReceived = (document.getElementById("stock-source-date") as HTMLInputElement).value;
      const problem = deliveryProblem(today(), { tonerType, colorType, quantity, dateReceived });
      if (problem) {
        Swal.showValidationMessage(problem);
        return false;
      }
      return { kind: "delivery", dateReceived } as StockSource;
    },
  });

  return result.isConfirmed && result.value ? result.value : null;
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
        // Strict: a failed printers read must not show every pool as
        // "used by 0 printers".
        getPrintersStrict(),
      ]);
      setPools(data);
      setReorderLevel(level);
      setPrinters(printerList);
    } catch (error) {
      // An empty table reads as "we have nothing", which would be a lie —
      // say plainly that the stock could not be read instead.
      setLoadError(
        accessErrorMessage(
          error,
          [TONER_STOCK_COLLECTION, PRINTERS_COLLECTION],
          "Failed to load toner stock"
        )
      );
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
    // The colours this cartridge comes in, plus any other colour it holds
    // stock under, so cartridges on the shelf never go missing. An empty
    // record under a colour it does not come in is left out.
    const colours = colourChoices(
      row.tonerType,
      Object.values(row.colors)
        .filter((p) => p.quantity > 0)
        .map((p) => p.colorType)
    );

    await Swal.fire({
      title: "Select Color to View",
      html: `
        <div class="text-left space-y-2">
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            <strong>${row.tonerType}</strong>
          </p>
          ${colours
            .map((color) => {
              const pool = row.colors[normalizeType(color)];
              const isSelected = normalizeType(color) === normalizeType(row.selectedColor);

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
  async function handleSave(input: Omit<TonerStock, "id">): Promise<boolean> {
    // "Color PIXMA" is filed as Color, so the duplicate check below and the
    // write both see the pool the replacement actually uses.
    const pool = withCanonicalColour(input);
    if (editing) {
      await updateTonerStock({ ...pool, id: editing.id });
    } else if (pool.quantity > 0) {
      // Refuse a duplicate before asking anything: a delivery would otherwise
      // quietly add to the existing pool from a form that says "add toner".
      if (findPool(pools, pool.tonerType, pool.colorType)) {
        throw new Error(
          `${pool.colorType} ${pool.tonerType} already has a stock record. ` +
            "Use Add stock for a delivery, or click its quantity to correct the count."
        );
      }
      const source = await askStockSource(pool.tonerType, pool.colorType, pool.quantity);
      if (!source) return false;
      if (source.kind === "delivery") {
        // Creates the pool and the dated delivery in one transaction. The
        // cartridge need not be a saved toner type: the pool is keyed by name.
        await recordTonerDelivery({
          tonerType: pool.tonerType,
          colorType: pool.colorType,
          quantity: pool.quantity,
          dateReceived: source.dateReceived,
          ...(pool.costPerUnit !== undefined ? { costPerUnit: pool.costPerUnit } : {}),
        });
      } else {
        await addTonerStock(pool);
      }
    } else {
      await addTonerStock(pool);
    }

    await loadStock();
    setEditing(null);
    navigate("/toners");
    return true;
  }

  /**
   * Record a DELIVERY: cartridges that arrived, with the date. Adds to the
   * pool (or creates it) and leaves a dated record the monthly report reads.
   * Correcting a miscount is the quantity click-to-edit, not this.
   */
  async function handleAddStock() {
    let cartridgeTypes: string[];
    try {
      cartridgeTypes = await getAllTonerTypes();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Could not load cartridge types",
        text: error instanceof Error ? error.message : "Failed to load cartridge types",
      });
      return;
    }

    // The saved cartridge types, plus any pool's own name, once each.
    const seen = new Set<string>();
    const cartridges: string[] = [];
    for (const name of [...cartridgeTypes, ...pools.map((p) => p.tonerType)]) {
      const key = normalizeType(name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      cartridges.push(name.trim());
    }

    // Only the colours the chosen cartridge comes in (plus any it already
    // has stock under): a PIXMA has Black and Color, nothing else has Color.
    const colourOptions = (cartridge: string) =>
      '<option value="">Select colour</option>' +
      colourChoices(
        cartridge,
        pools
          .filter(
            (p) =>
              cartridge &&
              p.quantity > 0 &&
              normalizeType(p.tonerType) === normalizeType(cartridge)
          )
          .map((p) => p.colorType)
      )
        .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
        .join("");

    const field = "margin: 0; width: 100%;";
    const label = 'class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"';

    const result = await Swal.fire({
      title: "Record a toner delivery",
      html: `
        <div class="text-left space-y-3">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Cartridges that arrived. They are added to the stock and dated for the monthly report.
            To correct a miscount instead, click the quantity in the table.
          </p>
          <div>
            <label for="delivery-cartridge" ${label}>Cartridge</label>
            <select id="delivery-cartridge" class="swal2-select" style="${field}">
              <option value="">Select cartridge</option>
              ${cartridges
                .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
                .join("")}
            </select>
          </div>
          <div>
            <label for="delivery-colour" ${label}>Colour</label>
            <select id="delivery-colour" class="swal2-select" style="${field}">
              ${colourOptions("")}
            </select>
          </div>
          <div>
            <label for="delivery-quantity" ${label}>Quantity received</label>
            <input id="delivery-quantity" type="number" min="1" step="1" value="1" class="swal2-input" style="${field}" />
          </div>
          <div>
            <label for="delivery-date" ${label}>Date received</label>
            <input id="delivery-date" type="date" value="${today()}" max="${today()}" class="swal2-input" style="${field}" />
          </div>
          <div>
            <label for="delivery-cost" ${label}>Cost per unit (GH₵, optional)</label>
            <input id="delivery-cost" type="number" min="0" step="0.01" class="swal2-input" style="${field}" />
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Record delivery",
      confirmButtonColor: "#16a34a",
      didOpen: () => {
        const cartridge = document.getElementById("delivery-cartridge") as HTMLSelectElement;
        const colour = document.getElementById("delivery-colour") as HTMLSelectElement;
        cartridge.addEventListener("change", () => {
          const chosen = colour.value;
          colour.innerHTML = colourOptions(cartridge.value);
          // Keep the colour if the new cartridge also comes in it.
          colour.value = [...colour.options].some((o) => o.value === chosen) ? chosen : "";
        });
      },
      preConfirm: () => {
        const value = (id: string) =>
          (document.getElementById(id) as HTMLInputElement | HTMLSelectElement).value.trim();
        const refuse = (message: string) => {
          Swal.showValidationMessage(message);
          return false as const;
        };

        const tonerType = value("delivery-cartridge");
        const colorType = value("delivery-colour");
        const quantityText = value("delivery-quantity");
        const dateReceived = value("delivery-date");
        const costText = value("delivery-cost");

        if (!tonerType) return refuse("Choose the cartridge that was delivered.");
        if (!colorType) return refuse("Choose the colour that was delivered.");
        const quantity = Number(quantityText);
        if (!/^\d+$/.test(quantityText) || !Number.isInteger(quantity) || quantity < 1) {
          return refuse("Quantity received must be a whole number of 1 or more.");
        }
        if (!dateReceived) return refuse("Enter the date the cartridges arrived.");
        const costPerUnit = costText === "" ? undefined : Number(costText);
        if (costPerUnit !== undefined && (!Number.isFinite(costPerUnit) || costPerUnit < 0)) {
          return refuse("Cost per unit must be 0 or more, or left blank.");
        }

        const delivery = {
          tonerType,
          colorType: canonicalColour(colorType),
          quantity,
          dateReceived,
          costPerUnit,
        };
        const problem = deliveryProblem(today(), delivery);
        if (problem) return refuse(problem);
        return delivery;
      },
    });

    if (!result.isConfirmed || !result.value) return;
    const delivery = result.value;

    try {
      await recordTonerDelivery(delivery);
      await loadStock();
      Swal.fire({
        icon: "success",
        title: "Delivery recorded",
        text: `${delivery.quantity} ${delivery.colorType} ${delivery.tonerType} added to stock.`,
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error) {
      // Includes a Firestore permission error: the toner_deliveries rule has
      // to be added in the Firebase console, and the message must say so
      // rather than the save appearing to have worked.
      Swal.fire({
        icon: "error",
        title: "Could not record the delivery",
        text: accessErrorMessage(
          error,
          [TONER_DELIVERIES_COLLECTION, TONER_STOCK_COLLECTION],
          "Failed to record the delivery"
        ),
      });
    }
  }

  async function handleQuantityUpdate(row: CartridgeRow) {
    const color = canonicalColour(row.selectedColor);
    const existingPool = selectedPool(row);
    const currentQty = existingPool?.quantity ?? 0;

    const result = await Swal.fire({
      title: `Update ${color} Toner Quantity`,
      html: `
        <div class="text-left space-y-3">
          <p class="text-sm text-gray-600 dark:text-gray-400">Cartridge: <strong>${row.tonerType}</strong></p>
          <p class="text-sm text-gray-600 dark:text-gray-400">Color: <strong class="${getColorTextClass(color)}">${color}</strong></p>
          <p class="text-sm text-gray-600 dark:text-gray-400">Current quantity: <strong>${currentQty}</strong></p>
          ${!existingPool ? '<p class="text-xs text-orange-600 dark:text-orange-400">⚠️ This color hasn\'t been added yet. Enter quantity to create it; you will be asked if it is a delivery or a count correction.</p>' : ""}
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
      } else if (result.value > 0) {
        const source = await askStockSource(row.tonerType, color, result.value);
        if (!source) return;
        if (source.kind === "delivery") {
          await recordTonerDelivery({
            tonerType: row.tonerType,
            colorType: color,
            quantity: result.value,
            dateReceived: source.dateReceived,
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

      // A raised count may really be a delivery; say so, but do not block it.
      const hint = existingPool ? correctionHint(existingPool.quantity, result.value) : null;
      Swal.fire({
        icon: "success",
        title: existingPool ? "Quantity Updated" : "Color Added",
        text:
          `${color} toner ${existingPool ? "updated to" : "added with quantity"} ${result.value}` +
          (hint ? `. ${hint}` : ""),
        ...(hint ? {} : { timer: 1500, showConfirmButton: false }),
      });
    } catch (error) {
      // A duplicate-pool error means this colour was created by someone else
      // between opening the row and confirming — say so instead of failing silently.
      Swal.fire({
        icon: "error",
        title: "Could not save",
        text: accessErrorMessage(
          error,
          [TONER_STOCK_COLLECTION, TONER_DELIVERIES_COLLECTION],
          "Failed to save toner stock"
        ),
      });
    }
  }

  // Acts only on the colour the row is currently showing — deleting a whole
  // cartridge's colours at once meant one confirm click could remove stock
  // no one had actually chosen to look at.
  async function handleDeleteColor(row: CartridgeRow) {
    const pool = selectedPool(row);
    if (!pool) return;

    const result = await Swal.fire({
      title: "Delete this colour pool?",
      html: `This will delete <strong>${pool.colorType} ${pool.tonerType}</strong> —
             ${pool.quantity} ${pool.quantity === 1 ? "cartridge" : "cartridges"},
             shared by ${usedByLabel(row.usedBy.length)}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete",
    });

    if (!result.isConfirmed) return;

    try {
      await deleteTonerStock(pool.id);

      Swal.fire({
        title: "Deleted!",
        text: `${pool.colorType} ${pool.tonerType} deleted.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      // A failed delete must not leave a stale table pretending the pool is
      // gone, nor a silently rejected promise.
      Swal.fire({
        icon: "error",
        title: "Could not delete",
        text: accessErrorMessage(error, TONER_STOCK_COLLECTION, "Failed to delete toner stock"),
      });
    } finally {
      await loadStock();
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
  // the reorder decision is per colour.
  const needsReorder = reorderLevel === null ? [] : lowToners(pools, reorderLevel);

  // Printers that cannot be matched to any pool at all, pools that no
  // printer draws on, and pools that collide once case/spacing is
  // normalized — all invisible until someone tries a replacement, wonders
  // why a cartridge never seems to move, or finds two records for the same
  // colour.
  // Retired printers need no toner type, so they do not nag here.
  const printersWithoutTonerType = printers.filter(
    (p) => isInService(p) && !normalizeType(p.tonerType)
  );
  const unusedPools = pools.filter((p) => printersUsing(printers, p.tonerType).length === 0);
  const collisions = findPoolCollisions(pools);

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

      {(printersWithoutTonerType.length > 0 || unusedPools.length > 0 || collisions.length > 0) && (
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

              {collisions.length > 0 && (
                <div>
                  <p className="font-bold text-amber-800 dark:text-amber-300">
                    {collisions.length} colour{collisions.length === 1 ? "" : "s"}{" "}
                    {collisions.length === 1 ? "collides" : "collide"} after normalizing case or
                    spacing
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                    These are separate stock records for what the app treats as one pool. Only one
                    is shown on the row below — merge their quantities into a single record and
                    delete the other.
                  </p>
                  <ul className="mt-3 space-y-2">
                    {collisions.map((group) => (
                      <li
                        key={group.map((p) => p.id).join("+")}
                        className="text-sm bg-white/60 dark:bg-gray-900/40 rounded p-3 text-gray-900 dark:text-white"
                      >
                        <span className="font-medium">
                          {group[0].colorType} {group[0].tonerType}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {" "}
                          &mdash; {group.map((p) => `${p.quantity} (id ${p.id})`).join(", ")}
                        </span>
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
            onClick={handleAddStock}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            title="Record cartridges that arrived, with the date received. To correct a miscount, click the quantity in the table."
          >
            Add stock
          </button>

          <button
            onClick={() => navigate("/toners/add")}
            className="border border-green-600 text-green-700 dark:text-green-400 px-4 py-2 rounded-lg hover:bg-green-50 dark:hover:bg-gray-700"
            title="Create a stock record for a new cartridge and colour"
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
                "Colour",
                "Qty",
                "Status",
                "Used by",
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
              const activePool = selectedPool(row);
              const displayedQty = activePool?.quantity ?? 0;

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
                    <button
                      onClick={() => handleQuantityUpdate(row)}
                      className="text-gray-900 dark:text-white font-bold text-lg hover:text-green-600 dark:hover:text-green-400 transition-colors"
                      title="Click to correct the count (e.g. after a recount). Record deliveries with Add stock."
                    >
                      {displayedQty}
                      {displayedQty === 0 && (
                        <span className="text-xs text-gray-400 ml-1">(add)</span>
                      )}
                    </button>
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge status={activePool?.status} />
                  </td>

                  <td className="px-4 py-3">
                    <UsedByChip count={row.usedBy.length} onClick={() => handleUsedByClick(row)} />
                  </td>

                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {activePool?.dateBrought ?? "—"}
                  </td>

                  <td className="px-4 py-3 space-x-3 whitespace-nowrap">
                    <button
                      onClick={() => {
                        const record = activePool ?? Object.values(row.colors)[0];
                        if (!record) return;
                        setEditing(record);
                        navigate("/toners/add");
                      }}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Edit
                    </button>
                    {activePool && (
                      <button
                        onClick={() => handleDeleteColor(row)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400 dark:text-gray-500">
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

