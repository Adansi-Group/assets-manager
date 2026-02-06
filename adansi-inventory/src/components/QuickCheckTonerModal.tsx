



import { useState, useEffect } from "react";
import { X, Eye, Save } from "lucide-react";
import type { Printer, TonerLevel, TonerColor } from "../types/printer";

type Props = {
  onClose: () => void;
  onSave: (printerId: string, updatedLevels: TonerLevel[]) => void;
  printer: Printer;
};

export default function QuickCheckTonerModal({ onClose, onSave, printer }: Props) {
  const [tonerLevels, setTonerLevels] = useState<TonerLevel[]>([]);
  const [dateChecked, setDateChecked] = useState("");

  const allColors: TonerColor[] = ["Black", "Cyan", "Magenta", "Yellow"];

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setDateChecked(today);

    // Initialize with existing levels or default to 100%
    const initialLevels = allColors.map((color) => {
      const existing = printer.tonerLevels?.find((t) => t.color === color);
      return existing || {
        color,
        currentPercentage: 100,
        lastChecked: today,
        lastReplaced: today,
      };
    });
    setTonerLevels(initialLevels);
  }, [printer]);

  function updateLevel(color: TonerColor, percentage: number) {
    setTonerLevels((prev) =>
      prev.map((level) =>
        level.color === color
          ? { ...level, currentPercentage: percentage, lastChecked: dateChecked }
          : level
      )
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate percentages
    const invalidLevel = tonerLevels.find(
      (level) => level.currentPercentage < 0 || level.currentPercentage > 100
    );

    if (invalidLevel) {
      alert("All percentages must be between 0 and 100");
      return;
    }

    onSave(printer.id, tonerLevels);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl p-8 relative shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Eye className="text-blue-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Check Toner Levels</h2>
          <p className="text-gray-600">
            {printer.location} - {printer.model}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Info Card */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Location:</span>
                <span className="ml-2 font-medium">{printer.location}</span>
              </div>
              <div>
                <span className="text-gray-600">Model:</span>
                <span className="ml-2 font-medium">{printer.model}</span>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <span
                  className={`ml-2 font-medium ${
                    printer.status === "Active"
                      ? "text-green-600"
                      : printer.status === "In Repair"
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {printer.status}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Date:</span>
                <input
                  type="date"
                  value={dateChecked}
                  onChange={(e) => setDateChecked(e.target.value)}
                  className="ml-2 text-sm border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Toner Levels Grid */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Update Toner Levels</h3>
            <div className="grid grid-cols-2 gap-4">
              {tonerLevels.map((toner) => (
                <TonerLevelInput
                  key={toner.color}
                  toner={toner}
                  onChange={(percentage) => updateLevel(toner.color, percentage)}
                />
              ))}
            </div>
          </div>

          {/* Warning for low levels */}
          {tonerLevels.some((t) => t.currentPercentage < 20) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm font-medium text-yellow-800">
                ⚠️ Low Toner Alert
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                {tonerLevels
                  .filter((t) => t.currentPercentage < 20)
                  .map((t) => t.color)
                  .join(", ")}{" "}
                {tonerLevels.filter((t) => t.currentPercentage < 20).length > 1
                  ? "are"
                  : "is"}{" "}
                below 20%. Consider ordering replacement toners.
              </p>
            </div>
          )}

          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-800 mb-2">
              📊 Summary
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
              {tonerLevels.map((toner) => (
                <div key={toner.color} className="flex justify-between">
                  <span>{toner.color}:</span>
                  <span className="font-semibold">
                    {toner.currentPercentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Save size={20} />
              Save Levels
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TonerLevelInput({
  toner,
  onChange,
}: {
  toner: TonerLevel;
  onChange: (percentage: number) => void;
}) {
  const getColorClass = () => {
    switch (toner.color) {
      case "Black":
        return "border-gray-800 bg-gray-50";
      case "Cyan":
        return "border-cyan-500 bg-cyan-50";
      case "Magenta":
        return "border-pink-500 bg-pink-50";
      case "Yellow":
        return "border-yellow-400 bg-yellow-50";
      default:
        return "border-gray-300 bg-gray-50";
    }
  };

  const getProgressColor = () => {
    if (toner.currentPercentage < 20) return "bg-red-500";
    if (toner.currentPercentage < 50) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getBadgeClass = () => {
    switch (toner.color) {
      case "Black":
        return "bg-gray-800 text-white";
      case "Cyan":
        return "bg-cyan-500 text-white";
      case "Magenta":
        return "bg-pink-500 text-white";
      case "Yellow":
        return "bg-yellow-400 text-gray-800";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  return (
    <div className={`border-2 rounded-lg p-4 ${getColorClass()}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getBadgeClass()}`}>
          {toner.color}
        </span>
        <span className="text-sm text-gray-600">
          Last: {new Date(toner.lastChecked).toLocaleDateString()}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="0"
            max="100"
            value={toner.currentPercentage}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-center font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <span className="text-lg font-semibold">%</span>
          <input
            type="range"
            min="0"
            max="100"
            value={toner.currentPercentage}
            onChange={(e) => onChange(Number(e.target.value))}
            className="flex-1"
          />
        </div>

        <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all ${getProgressColor()}`}
            style={{ width: `${toner.currentPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}