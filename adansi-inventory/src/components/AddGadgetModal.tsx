






import { useState } from "react";
import { X } from "lucide-react";
import type { Gadget } from "../types/gadget";
import { addNotification } from "../utils/notifications";


type Props = {
  deviceType: "Laptop" | "Smartphone";
  onClose: () => void;
  onSave: (gadget: Gadget) => void;
};

export default function AddGadgetModal({
  deviceType,
  onClose,
  onSave,
}: Props) {
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [processor, setProcessor] = useState("");
  const [storage, setStorage] = useState("");
  const [year, setYear] = useState(2024);

  function submit(e: React.FormEvent) {
    e.preventDefault();

    onSave({
      id: Date.now(),
      deviceType,
      model,
      serialNumber,
      processor,
      storage,
      year,
      status: "In-Stock",
    });

    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-3xl rounded-2xl p-8 relative">
        <button onClick={onClose} className="absolute top-4 right-4">
          <X />
        </button>

        <h2 className="text-2xl font-bold mb-6 text-center">
          Add {deviceType}
        </h2>

        <form onSubmit={submit} className="grid grid-cols-2 gap-6">
          <input
            placeholder="Model"
            className="border p-3 rounded"
            required
            onChange={e => setModel(e.target.value)}
          />

          <input
            placeholder="Serial Number"
            className="border p-3 rounded"
            required
            onChange={e => setSerialNumber(e.target.value)}
          />

          <input
            placeholder="Processor"
            className="border p-3 rounded"
            onChange={e => setProcessor(e.target.value)}
          />

          <input
            placeholder="Storage"
            className="border p-3 rounded"
            onChange={e => setStorage(e.target.value)}
          />

          <input
            type="number"
            placeholder="Year"
            className="border p-3 rounded col-span-2"
            value={year}
            onChange={e => setYear(+e.target.value)}
          />

          <div className="col-span-2 flex justify-end gap-4">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="bg-green-600 text-white px-6 py-2 rounded">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}