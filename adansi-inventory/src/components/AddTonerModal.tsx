








import { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import Swal from "sweetalert2";
import type { TonerStock } from "../types/toner";
import { getAllTonerTypes, addTonerType } from "../services/tonerService";
import { optionsKeeping, TONER_COLOURS } from "../toners/colours";

type Props = {
  onClose: () => void;
  /** Resolves false when the person backed out; the form then stays open. */
  onSave: (pool: Omit<TonerStock, "id">) => void | boolean | Promise<void | boolean>;
  existing?: TonerStock;
};

export default function AddTonerModal({ onClose, onSave, existing }: Props) {
  const [tonerType, setTonerType] = useState("");
  const [colorType, setColorType] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [initialQuantity, setInitialQuantity] = useState(1);
  const [enableTracking, setEnableTracking] = useState(false);
  const [saving, setSaving] = useState(false);

  // Toner types from Firebase
  const [tonerTypes, setTonerTypes] = useState<string[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);

  async function loadTonerTypes() {
    setLoadingTypes(true);
    const types = await getAllTonerTypes();
    setTonerTypes(types);
    setLoadingTypes(false);
  }

  // Load toner types on mount
  useEffect(() => {
    (async () => {
      await loadTonerTypes();
    })();
  }, []);

  // Handle adding new toner type
  async function handleAddTonerType() {
    const result = await Swal.fire({
      title: 'Add New Toner Type',
      html: `
        <div class="text-left space-y-3">
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Enter the toner type/model number (e.g., "415A", "C-EXV65")
          </p>
          <input
            id="toner-type-input"
            type="text"
            placeholder="e.g., 415A"
            class="swal2-input"
            style="margin: 0; width: 100%; text-transform: uppercase;"
          />
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Add',
      confirmButtonColor: '#16a34a',
      preConfirm: () => {
        const input = document.getElementById('toner-type-input') as HTMLInputElement;
        const value = input.value.trim().toUpperCase();

        if (!value) {
          Swal.showValidationMessage('Please enter a toner type');
          return false;
        }

        if (tonerTypes.includes(value)) {
          Swal.showValidationMessage('This toner type already exists');
          return false;
        }

        return value;
      }
    });

    if (result.isConfirmed && result.value) {
      try {
        await addTonerType(result.value);
        await loadTonerTypes(); // Reload the list
        setTonerType(result.value); // Auto-select the new type

        Swal.fire({
          icon: 'success',
          title: 'Toner Type Added!',
          text: `${result.value} has been added to the list`,
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error instanceof Error ? error.message : 'Failed to add toner type',
        });
      }
    }
  }

  // Populate form fields once when editing an existing pool
  const [initialized, setInitialized] = useState(false);
  if (existing && !initialized) {
    setInitialized(true);
    setTonerType(existing.tonerType);
    setColorType(existing.colorType);
    setQuantity(existing.quantity);
    setInitialQuantity(existing.initialQuantity || existing.quantity);
    setEnableTracking(!!(existing.initialQuantity && existing.lastCheckedDate));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const pool: Omit<TonerStock, "id"> = {
      tonerType,
      colorType,
      quantity,
      dateBrought: existing?.dateBrought || new Date().toISOString().split("T")[0],
      ...(enableTracking && {
        initialQuantity,
        lastCheckedDate: new Date().toISOString().split("T")[0],
      }),
    };

    setSaving(true);
    try {
      if ((await onSave(pool)) === false) return;

      Swal.fire({
        icon: "success",
        title: existing ? "Toner updated" : "Toner added",
        timer: 1200,
        showConfirmButton: false,
      });

      onClose();
    } catch (error) {
      // Surfaces addTonerStock's duplicate-pool error (and any other save
      // failure) instead of letting it throw unhandled; the form stays open
      // so the mistake can be corrected.
      Swal.fire({
        icon: "error",
        title: "Could not save",
        text: error instanceof Error ? error.message : "Failed to save toner",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* BACKDROP */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* MODAL */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
          >
            <X size={22} />
          </button>

          <h2 className="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-white">
            {existing ? "Edit Toner" : "Add Toner"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Toner Type - WITH ADD BUTTON */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  Toner Type
                </label>
                <div className="flex gap-2">
                  <select
                    value={tonerType}
                    onChange={(e) => setTonerType(e.target.value)}
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                    disabled={loadingTypes}
                  >
                    <option value="">
                      {loadingTypes ? "Loading..." : "Select toner type"}
                    </option>
                    {optionsKeeping(tonerTypes, tonerType).map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>

                  {/* ADD BUTTON */}
                  <button
                    type="button"
                    onClick={handleAddTonerType}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                    title="Add new toner type"
                  >
                    <Plus size={18} />
                    Add
                  </button>
                </div>
              </div>

              {/* Color Type */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  Color Type
                </label>
                <select
                  value={colorType}
                  onChange={(e) => setColorType(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Select color</option>
                  {/* One list for every screen; a PIXMA uses Black and Color.
                      A saved colour outside the list is kept, not blanked. */}
                  {optionsKeeping(TONER_COLOURS, colorType).map((colour) => (
                    <option key={colour} value={colour}>
                      {colour}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  Current Quantity
                </label>
                <input
                  type="number"
                  min={0}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
            </div>

            {/* Smart Tracking Toggle */}
            <div className="border-t dark:border-gray-700 pt-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableTracking}
                  onChange={(e) => setEnableTracking(e.target.checked)}
                  className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                />
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    Enable Smart Tracking (Recommended)
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Track usage and get low stock predictions
                  </p>
                </div>
              </label>

              {enableTracking && (
                <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                    Initial Quantity (when purchased)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={initialQuantity}
                    onChange={(e) => setInitialQuantity(Number(e.target.value))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    💡 This helps predict when you'll run out of toner
                  </p>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-green-600 text-white px-8 py-2 rounded-lg hover:bg-green-700 disabled:opacity-60"
              >
                {existing ? "Update Toner" : "Add Toner"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
