





import { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import Swal from "sweetalert2";
import type { Toner } from "../types/toner";
import { getAllTonerTypes, addTonerType } from "../services/tonerService";

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
  "222A-CEO": ["HP Color Laser Jet Pro MFP 3303"], // Updated to correct printer
  "CARTRIDGE 069": ["i-SENSYS MF752Cdw"],
  "C-EXV54": ["Canon imageRunner C3025i"],
  "C-EXV65": ["Canon imageRunner C3326i"],
  "PIXMA 446": ["Canon PIXMA TS3440"],
};

export default function AddTonerModal({ onClose, onSave, existing }: Props) {
  const [location, setLocation] = useState("");
  const [room, setRoom] = useState(""); // NEW: Room/office field
  const [printerType, setPrinterType] = useState("");
  const [tonerType, setTonerType] = useState("");
  const [colorType, setColorType] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [initialQuantity, setInitialQuantity] = useState(1);
  const [enableTracking, setEnableTracking] = useState(false);
  
  // Toner types from Firebase
  const [tonerTypes, setTonerTypes] = useState<string[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);

  // Load toner types on mount
  useEffect(() => {
    loadTonerTypes();
  }, []);

  async function loadTonerTypes() {
    setLoadingTypes(true);
    const types = await getAllTonerTypes();
    setTonerTypes(types);
    setLoadingTypes(false);
  }

  // Get compatible printers based on selected toner
  const compatiblePrinters = tonerType ? TONER_PRINTER_MAP[tonerType] || [] : [];

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
          <p class="text-xs text-amber-600 dark:text-amber-400 mt-2">
            ⚠️ Note: You'll need to manually add this toner to the printer compatibility mapping in the code.
          </p>
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
      } catch (error: any) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to add toner type',
        });
      }
    }
  }

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

  useEffect(() => {
    if (existing) {
      setLocation(existing.location);
      setRoom(existing.room || ""); // Load room if exists
      setPrinterType(existing.printerType);
      setTonerType(existing.tonerType);
      setColorType(existing.colorType);
      setQuantity(existing.quantity);
      setInitialQuantity(existing.initialQuantity || existing.quantity);
      setEnableTracking(!!(existing.initialQuantity && existing.lastCheckedDate));
    }
  }, [existing]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const toner: Omit<Toner, "id"> & { id?: string } = {
      location,
      room: room.trim() || undefined, // Only save if not empty
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
              {/* Location */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Location</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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

              {/* Room/Office - NEW FIELD */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  Room/Office <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="e.g., CEO's Office, First Floor, HR"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

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
                    {tonerTypes.map((type) => (
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

              {/* Printer Type - AUTO-FILTERED */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  Printer Type {tonerType && <span className="text-xs text-green-600 dark:text-green-400">(Auto-filtered)</span>}
                </label>
                <select
                  value={printerType}
                  onChange={(e) => setPrinterType(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none disabled:bg-gray-100 dark:disabled:bg-gray-800 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                    No compatible printers found for this toner. Please update TONER_PRINTER_MAP in AddTonerModal.tsx
                  </p>
                )}
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