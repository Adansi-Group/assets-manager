
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { InternetUsage } from "../types/InternetUsage";

type Props = {
  onClose: () => void;
  onSave: (usage: InternetUsage | Omit<InternetUsage, "id" | "status" | "createdAt">) => void;
  usage?: InternetUsage | null;
  officeNames: string[]; // Pass available office names
};

export default function AddInternetUsageModal({ onClose, onSave, usage, officeNames }: Props) {
  const [officeName, setOfficeName] = useState("");
  const [datePurchased, setDatePurchased] = useState("");
  const [dateExhausted, setDateExhausted] = useState("");
  const [bundleSize, setBundleSize] = useState("");
  const [cost, setCost] = useState<number>(0);
  const [provider, setProvider] = useState("Starlink");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (usage) {
      setOfficeName(usage.officeName);
      setDatePurchased(usage.datePurchased);
      setDateExhausted(usage.dateExhausted || "");
      setBundleSize(usage.bundleSize || "");
      setCost(usage.cost || 0);
      setProvider(usage.provider);
      setNotes(usage.notes || "");
    } else {
      // Set today's date as default
      const today = new Date().toISOString().split("T")[0];
      setDatePurchased(today);
    }
  }, [usage]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const usageData = {
      officeName,
      datePurchased,
      dateExhausted: dateExhausted || null,
      bundleSize,
      cost,
      provider,
      notes,
    };

    if (usage) {
      onSave({ ...usageData, id: usage.id, status: usage.status, createdAt: usage.createdAt });
    } else {
      onSave(usageData);
    }

    onClose();
  }

  // Calculate days duration if both dates are set
  const calculateDuration = () => {
    if (datePurchased && dateExhausted) {
      const start = new Date(datePurchased);
      const end = new Date(dateExhausted);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return days > 0 ? days : 0;
    }
    return null;
  };

  const duration = calculateDuration();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl p-8 relative shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
        >
          <X size={22} />
        </button>

        <h2 className="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-white">
          {usage ? "Edit Internet Usage" : "Add Internet Usage"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Office Name */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                Office Name
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

            {/* Provider */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                Provider
              </label>
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                required
              />
            </div>

            {/* Date Purchased */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                Date Purchased
              </label>
              <input
                type="date"
                value={datePurchased}
                onChange={(e) => setDatePurchased(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                required
              />
            </div>

            {/* Date Exhausted */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                Date Exhausted (Optional)
              </label>
              <input
                type="date"
                value={dateExhausted}
                onChange={(e) => setDateExhausted(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>

            {/* Bundle Size */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                Bundle Size (Optional)
              </label>
              <input
                type="text"
                value={bundleSize}
                onChange={(e) => setBundleSize(e.target.value)}
                placeholder="e.g., 100GB, Unlimited"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>

            {/* Cost */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                Cost (Optional)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
                placeholder="0.00"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Duration Display */}
          {duration !== null && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                📊 <strong>Duration:</strong> {duration} days
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
              placeholder="Additional notes..."
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
              {usage ? "Update" : "Add"} Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}