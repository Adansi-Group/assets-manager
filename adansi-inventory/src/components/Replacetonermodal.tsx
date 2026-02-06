

import { useState, useEffect } from "react";
import { X, TrendingDown, CheckCircle, AlertCircle } from "lucide-react";
import type { Printer, TonerLevel, TonerColor } from "../types/printer";

type Props = {
  onClose: () => void;
  onSave: (printerId: string, color: string, replacementData: {
    dateChecked: string;
    dateReplaced: string;
    previousPercentage: number;
    currentPercentage: number;
  }) => void;
  printer: Printer;
  selectedColor?: string;
};

export default function ReplaceTonerModal({ onClose, onSave, printer, selectedColor }: Props) {
  const [color, setColor] = useState<string>(selectedColor || "");
  const [dateChecked, setDateChecked] = useState("");
  const [dateReplaced, setDateReplaced] = useState("");
  const [previousPercentage, setPreviousPercentage] = useState<number>(20);
  const [currentPercentage, setCurrentPercentage] = useState<number>(100);

  // Get current toner level for selected color
  const currentToner = printer.tonerLevels?.find(t => t.color === color);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setDateChecked(today);
    setDateReplaced(today);
  }, []);

  useEffect(() => {
    if (color && currentToner) {
      setPreviousPercentage(currentToner.currentPercentage);
    }
  }, [color, currentToner]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!color) {
      alert('Please select a toner color');
      return;
    }

    if (previousPercentage < 0 || previousPercentage > 100 || currentPercentage < 0 || currentPercentage > 100) {
      alert('Percentages must be between 0 and 100');
      return;
    }

    if (!dateChecked || !dateReplaced) {
      alert('Please fill in all required fields');
      return;
    }

    const replacementData = {
      dateChecked,
      dateReplaced,
      previousPercentage,
      currentPercentage,
    };

    onSave(printer.id, color, replacementData);
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

        {/* Header with Icon */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <TrendingDown className="text-green-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Replace Toner</h2>
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
                <span className={`ml-2 font-medium ${
                  printer.status === 'Active' ? 'text-green-600' :
                  printer.status === 'In Repair' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {printer.status}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Color Type:</span>
                <span className="ml-2 font-medium">{printer.printerColorType}</span>
              </div>
            </div>
          </div>

          {/* Color Display (Read-only - No Selection) */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border-2 border-blue-300 dark:border-blue-700">
            <label className="block text-sm font-medium mb-3 text-gray-900 dark:text-white">
              Replacing Toner Color
            </label>
            <div className="flex items-center gap-3">
              <ColorBadge color={color} />
              <span className="text-xl font-bold text-gray-900 dark:text-white">{color}</span>
            </div>
          </div>

          {/* Current Level Display */}
          {color && currentToner && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">Current Toner Status:</p>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-blue-700 mb-1">
                    <span>Level: {currentToner.currentPercentage}%</span>
                    <span>Last checked: {new Date(currentToner.lastChecked).toLocaleDateString()}</span>
                  </div>
                  <div className="bg-blue-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        currentToner.currentPercentage < 20 ? 'bg-red-500' :
                        currentToner.currentPercentage < 50 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${currentToner.currentPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Date Fields */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Date Checked
              </label>
              <input
                type="date"
                value={dateChecked}
                onChange={(e) => setDateChecked(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Date Replacement
              </label>
              <input
                type="date"
                value={dateReplaced}
                onChange={(e) => setDateReplaced(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Percentage Fields */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Previous Level (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={previousPercentage}
                onChange={(e) => setPreviousPercentage(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
                required
              />
              <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all"
                  style={{ width: `${previousPercentage}%` }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Current Level (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={currentPercentage}
                onChange={(e) => setCurrentPercentage(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
                required
              />
              <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    currentPercentage < 20
                      ? "bg-red-500"
                      : currentPercentage < 50
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  }`}
                  style={{ width: `${currentPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Validation Warnings */}
          {currentPercentage < previousPercentage && (
            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Unusual replacement detected</p>
                <p className="text-xs mt-1">Current level is lower than previous level. Please verify.</p>
              </div>
            </div>
          )}

          {currentPercentage === 100 && (
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-green-800">
                <p className="font-medium">Full replacement</p>
                <p className="text-xs mt-1">Toner will be replaced with a new cartridge (100%).</p>
              </div>
            </div>
          )}

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
              className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium transition-colors"
            >
              Save Replacement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Color Badge Component
function ColorBadge({ color }: { color: string }) {
  const getColorClass = () => {
    switch (color) {
      case "Black": return "bg-gray-800 text-white";
      case "Cyan": return "bg-cyan-500 text-white";
      case "Magenta": return "bg-pink-500 text-white";
      case "Yellow": return "bg-yellow-400 text-gray-800";
      default: return "bg-gray-200 text-gray-800";
    }
  };

  return (
    <span className={`px-4 py-2 rounded-full text-sm font-bold ${getColorClass()}`}>
      {color}
    </span>
  );
}