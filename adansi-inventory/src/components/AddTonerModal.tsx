






import { useState } from "react";
import { X } from "lucide-react";
import type { Toner } from "../types/toner";
import { addNotification } from "../utils/notifications";


type Props = {
  onClose: () => void;
  onSave: (toner: Toner) => void;
  existing?: Toner;
};

export default function AddTonerModal({
  onClose,
  onSave,
  existing,
}: Props) {
  const [location, setLocation] = useState(existing?.location || "");
  const [printerType, setPrinterType] = useState(existing?.printerType || "");
  const [tonerType, setTonerType] = useState(existing?.tonerType || "");
  const [colorType, setColorType] = useState(existing?.colorType || "");
  const [quantity, setQuantity] = useState(existing?.quantity || 1);

  
  function handleSubmit(e: React.FormEvent) {
  e.preventDefault();

  const toner: Toner = {
    id: existing?.id ?? Date.now(),
    location,
    printerType,
    tonerType,
    colorType,
    quantity,
    dateBrought: new Date().toLocaleDateString(),
  };

  onSave(toner);

  addNotification(
    existing
      ? `Toner updated: ${toner.tonerType} (${toner.colorType})`
      : `New toner added: ${toner.tonerType} (${toner.colorType})`
  );

  onClose();
}


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl p-8 relative shadow-2xl">
        
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-black"
        >
          <X size={22} />
        </button>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center mb-8">
          {existing ? "Edit Toner" : "Add Toner"}
        </h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
          
          {/* Location */}
          <div>
            <label className="block text-sm mb-1">Location</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full border rounded-lg p-3"
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

          {/* Printer Type */}
          <div>
            <label className="block text-sm mb-1">Printer Type</label>
            <select
              value={printerType}
              onChange={(e) => setPrinterType(e.target.value)}
              className="w-full border rounded-lg p-3"
              required
            >
              <option value="">Select printer</option>
              <option>Canon imageRunner C3025i</option>
              <option>Canon imageRunner C3326i</option>
              <option>HP Color LaserJet Pro MFP M479fdw</option>
              <option>HP Color LaserJet Pro MFP M283fdw</option>
              <option>Canon PIXMA TS3440</option>
              <option>i-SENSYS MF752Cdw</option>
            </select>
          </div>

          {/* Toner Type */}
          <div>
            <label className="block text-sm mb-1">Toner Type</label>
            <select
              value={tonerType}
              onChange={(e) => setTonerType(e.target.value)}
              className="w-full border rounded-lg p-3"
              required
            >
              <option value="">Select toner</option>
              <option>415A</option>
              <option>207A</option>
              <option>222A</option>
              <option>CARTRIDGE 069</option>
              <option>C-EXV54</option>
              <option>C-EXV65</option>
              <option>PIXMA 446</option>
            </select>
          </div>

          {/* Color Type */}
          <div>
            <label className="block text-sm mb-1">Color Type</label>
            <select
              value={colorType}
              onChange={(e) => setColorType(e.target.value)}
              className="w-full border rounded-lg p-3"
              required
            >
              <option value="">Select color</option>
              <option>Black</option>
              <option>Cyan</option>
              <option>Magenta</option>
              <option>Yellow</option>
            </select>
          </div>

          {/* Quantity */}
          <div className="col-span-2">
            <label className="block text-sm mb-1">Quantity</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full border rounded-lg p-3"
              required
            />
          </div>

          {/* Buttons */}
          <div className="col-span-2 flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-green-600 text-white px-8 py-2 rounded-lg"
            >
              {existing ? "Update Toner" : "Add Toner"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}










