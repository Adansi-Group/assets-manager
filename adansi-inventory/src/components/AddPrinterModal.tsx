







import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { addNotification } from "../utils/notifications";


type Printer = {
  id: number;
  location: string;
  printerType: string;
  quantity: number;
  status: string;
  date: string;
};

type Props = {
  onClose: () => void;
  onAdd: (printer: Printer) => void;
  printer?: Printer | null;
};

export default function AddPrinterModal({ onClose, onAdd, printer }: Props) {
  const [location, setLocation] = useState("");
  const [printerType, setPrinterType] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState("Active");

  useEffect(() => {
    if (printer) {
      setLocation(printer.location);
      setPrinterType(printer.printerType);
      setQuantity(printer.quantity);
      setStatus(printer.status);
    }
  }, [printer]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    onAdd({
      id: printer?.id ?? Date.now(),
      location,
      printerType,
      quantity,
      status,
      date: printer?.date ?? new Date().toLocaleDateString(),
    });

    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl p-8 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4">
          <X />
        </button>

        <h2 className="text-2xl font-bold mb-6 text-center">
          {printer ? "Edit Printer" : "Add Printer"}
        </h2>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
            className="border p-3 rounded-lg"
          >
            <option value="">Select Location</option>
            <option>Head Office</option>
            <option>HR</option>
            <option>IT</option>
          </select>

          <select
            value={printerType}
            onChange={(e) => setPrinterType(e.target.value)}
            required
            className="border p-3 rounded-lg"
          >
            <option value="">Select Printer</option>
            <option>HP LaserJet</option>
            <option>Canon Inkjet</option>
            <option>Epson EcoTank</option>
          </select>

          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="border p-3 rounded-lg"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border p-3 rounded-lg"
          >
            <option>Active</option>
            <option>In Repair</option>
            <option>Retired</option>
          </select>

          <div className="md:col-span-2 flex justify-end gap-4">
            <button type="button" onClick={onClose} className="border px-6 py-2 rounded">
              Cancel
            </button>
            <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



