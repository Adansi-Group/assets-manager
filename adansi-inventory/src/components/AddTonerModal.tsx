
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import Swal from "sweetalert2";
import type { Toner } from "../types/toner";

type Props = {
  onClose: () => void;
  onSave: (toner: Toner | Omit<Toner, "id">) => void;
  existing?: Toner;
};

// Toner to Printer compatibility mapping
const TONER_PRINTER_MAP: Record<string, string[]> = {
  "415A": ["HP Color LaserJet Pro MFP M479fdw"],
  "207A": ["HP Color LaserJet Pro MFP M283fdw"],
  "222A": ["HP Color LaserJet Pro MFP M283fdw"],
  "CARTRIDGE 069": ["i-SENSYS MF752Cdw"],
  "C-EXV54": ["Canon imageRunner C3025i"],
  "C-EXV65": ["Canon imageRunner C3326i"],
  "PIXMA 446": ["Canon PIXMA TS3440"],
};

export default function AddTonerModal({ onClose, onSave, existing }: Props) {
  const [location, setLocation] = useState("");
  const [printerType, setPrinterType] = useState("");
  const [tonerType, setTonerType] = useState("");
  const [colorType, setColorType] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [initialQuantity, setInitialQuantity] = useState(1);
  const [enableTracking, setEnableTracking] = useState(false);

  // Get compatible printers based on selected toner
  const compatiblePrinters = tonerType ? TONER_PRINTER_MAP[tonerType] || [] : [];

  useEffect(() => {
    if (existing) {
      setLocation(existing.location);
      setPrinterType(existing.printerType);
      setTonerType(existing.tonerType);
      setColorType(existing.colorType);
      setQuantity(existing.quantity);
      setInitialQuantity(existing.initialQuantity || existing.quantity);
      setEnableTracking(!!(existing.initialQuantity && existing.lastCheckedDate));
    }
  }, [existing]);

  // Auto-reset printer type when toner type changes
  useEffect(() => {
    if (tonerType && !existing) {
      // If there's only one compatible printer, auto-select it
      if (compatiblePrinters.length === 1) {
        setPrinterType(compatiblePrinters[0]);
      } else {
        // Reset printer type if current selection is not compatible
        if (!compatiblePrinters.includes(printerType)) {
          setPrinterType("");
        }
      }
    }
  }, [tonerType, compatiblePrinters, printerType, existing]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const toner: Omit<Toner, "id"> & { id?: string } = {
      location,
      printerType,
      tonerType,
      colorType,
      quantity,
      dateBrought: existing?.dateBrought || new Date().toISOString().split("T")[0],
      ...(enableTracking && {
        initialQuantity,
        lastCheckedDate: new Date().toISOString().split("T")[0],
      }),
    };

    if (existing) {
      onSave({ ...toner, id: existing.id });
    } else {
      onSave(toner);
    }

    Swal.fire({
      icon: "success",
      title: existing ? "Toner updated" : "Toner added",
      timer: 1200,
      showConfirmButton: false,
    });

    onClose();
  }

  return (
    <>
      {/* BACKDROP */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* MODAL */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-4xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-600 hover:text-black"
          >
            <X size={22} />
          </button>

          <h2 className="text-2xl font-bold text-center mb-8">
            {existing ? "Edit Toner" : "Add Toner"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Location */}
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
                  required
                >
                  <option value="">Select location</option>
                  <option>Travel House</option>
                  <option>Botwe</option>
                  <option>Nester</option>
                  <option>Tema</option>
                  <option>Takoradi</option>
                  <option>Kumasi</option>
                  <option>Tarkwa</option>
                </select>
              </div>

              {/* Toner Type - NOW FIRST */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Toner Type
                </label>
                <select
                  value={tonerType}
                  onChange={(e) => setTonerType(e.target.value)}
                  className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
                  required
                >
                  <option value="">Select toner first</option>
                  <option>415A</option>
                  <option>207A</option>
                  <option>222A</option>
                  <option>CARTRIDGE 069</option>
                  <option>C-EXV54</option>
                  <option>C-EXV65</option>
                  <option>PIXMA 446</option>
                </select>
              </div>

              {/* Printer Type - AUTO-FILTERED */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Printer Type {tonerType && <span className="text-xs text-green-600">(Auto-filtered)</span>}
                </label>
                <select
                  value={printerType}
                  onChange={(e) => setPrinterType(e.target.value)}
                  className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none disabled:bg-gray-100"
                  required
                  disabled={!tonerType}
                >
                  <option value="">
                    {tonerType ? "Select compatible printer" : "Select toner type first"}
                  </option>
                  {compatiblePrinters.map((printer) => (
                    <option key={printer} value={printer}>
                      {printer}
                    </option>
                  ))}
                </select>
                {tonerType && compatiblePrinters.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    No compatible printers found for this toner
                  </p>
                )}
              </div>

              {/* Color Type */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Color Type
                </label>
                <select
                  value={colorType}
                  onChange={(e) => setColorType(e.target.value)}
                  className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
                  required
                >
                  <option value="">Select color</option>
                  <option>Black</option>
                  <option>Black PIXMA</option>
                  <option>Cyan</option>
                  <option>Magenta</option>
                  <option>Yellow</option>
                  <option>Color PIXMA</option>
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Current Quantity
                </label>
                <input
                  type="number"
                  min={0}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Smart Tracking Toggle */}
            <div className="border-t pt-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableTracking}
                  onChange={(e) => setEnableTracking(e.target.checked)}
                  className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                />
                <div>
                  <span className="font-medium">
                    Enable Smart Tracking (Recommended)
                  </span>
                  <p className="text-xs text-gray-500">
                    Track usage and get low stock predictions
                  </p>
                </div>
              </label>

              {enableTracking && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <label className="block text-sm font-medium mb-2">
                    Initial Quantity (when purchased)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={initialQuantity}
                    onChange={(e) => setInitialQuantity(Number(e.target.value))}
                    className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
                    required
                  />
                  <p className="text-xs text-gray-600 mt-2">
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
                className="px-6 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-green-600 text-white px-8 py-2 rounded-lg hover:bg-green-700"
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



