




import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { A4Sheet } from "../types/A4Sheet";

type Props = {
  onClose: () => void;
  onSave: (
    sheet: A4Sheet | Omit<A4Sheet, "id" | "status" | "createdAt" | "averageMonthlyUsage" | "estimatedDaysRemaining">
  ) => void;
  sheet?: A4Sheet | null;
  officeNames: string[];
};

export default function AddA4SheetModal({ onClose, onSave, sheet, officeNames }: Props) {
  const [officeName, setOfficeName] = useState("");
  const [currentQuantity, setCurrentQuantity] = useState(0);
  const [initialQuantity, setInitialQuantity] = useState(0);
  const [minimumStockLevel, setMinimumStockLevel] = useState(5);
  const [dateAdded, setDateAdded] = useState("");
  const [costPerReam, setCostPerReam] = useState(0);
  const [supplier, setSupplier] = useState("");
  const [brand, setBrand] = useState("PaperOne");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (sheet) {
      setOfficeName(sheet.officeName);
      setCurrentQuantity(sheet.currentQuantity);
      setInitialQuantity(sheet.initialQuantity);
      setMinimumStockLevel(sheet.minimumStockLevel);
      setDateAdded(sheet.dateAdded);
      setCostPerReam(sheet.costPerReam);
      setSupplier(sheet.supplier);
      setBrand(sheet.brand);
      setNotes(sheet.notes || "");
    } else {
      // Set defaults for new record
      const today = new Date().toISOString().split("T")[0];
      setDateAdded(today);
    }
  }, [sheet]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const sheetData = {
      officeName,
      currentQuantity,
      initialQuantity,
      minimumStockLevel,
      dateAdded,
      lastRestocked: sheet?.lastRestocked || null,
      costPerReam,
      supplier,
      brand,
      notes,
    };

    if (sheet) {
      onSave({
        ...sheetData,
        id: sheet.id,
        status: sheet.status,
        createdAt: sheet.createdAt,
      });
    } else {
      onSave(sheetData);
    }

    onClose();
  }

  // Calculate total value
  const totalValue = currentQuantity * costPerReam;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-3xl p-8 relative shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
        >
          <X size={22} />
        </button>

        <h2 className="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-white">
          {sheet ? "Edit A4 Sheet Stock" : "Add A4 Sheet Stock"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Office Name */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                Office Name *
              </label>
              <select
                value={officeName}
                onChange={(e) => setOfficeName(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                required
              >
                <option value="">Select office</option>
                {officeNames.map((office) => (
                  <option key={office} value={office}>
                    {office}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                Brand *
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g., PaperOne, Double A"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                required
              />
            </div>

            {/* Current Quantity */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                Current Quantity (Box) *
              </label>
              <input
                type="number"
                min="0"
                value={currentQuantity}
                onChange={(e) => setCurrentQuantity(Number(e.target.value))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                required
              />
            </div>

            {/* Initial Quantity */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                Initial Quantity (Boxes) *
              </label>
              <input
                type="number"
                min="0"
                value={initialQuantity}
                onChange={(e) => setInitialQuantity(Number(e.target.value))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Starting quantity when first added
              </p>
            </div>

            {/* Minimum Stock Level */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                Minimum Stock Level (Alert) *
              </label>
              <input
                type="number"
                min="0"
                value={minimumStockLevel}
                onChange={(e) => setMinimumStockLevel(Number(e.target.value))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Alert when stock falls below this
              </p>
            </div>

            {/* Date Added */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                Date Added *
              </label>
              <input
                type="date"
                value={dateAdded}
                onChange={(e) => setDateAdded(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                required
              />
            </div>

            {/* Cost Per Ream */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                Cost Per Box (GH₵) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={costPerReam}
                onChange={(e) => setCostPerReam(Number(e.target.value))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                required
              />
            </div>

            {/* Supplier */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                Supplier *
              </label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="e.g., Office Depot"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Total Value Display */}
          {totalValue > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                💰 <strong>Total Stock Value:</strong> GH₵{totalValue.toFixed(2)}
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Additional notes about stock..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
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
              className="bg-green-600 text-white px-8 py-2 rounded-lg hover:bg-green-700"
            >
              {sheet ? "Update" : "Add"} Stock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}