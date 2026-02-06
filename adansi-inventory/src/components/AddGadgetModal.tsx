// src/components/AddGadgetModal.tsx

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { Gadget, GadgetStatus } from "../types/gadget";

type Props = {
  deviceType?: "Laptop" | "Smartphone";
  existing?: Gadget;
  onClose: () => void;
  onSave: (gadget: Gadget | Omit<Gadget, "id">) => void;
};

export default function AddGadgetModal({
  deviceType,
  existing,
  onClose,
  onSave,
}: Props) {
  const [selectedDeviceType, setSelectedDeviceType] = useState<"Laptop" | "Smartphone">(
    deviceType || existing?.deviceType || "Laptop"
  );
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [processor, setProcessor] = useState("");
  const [storage, setStorage] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [status, setStatus] = useState<GadgetStatus>("In-Stock");
  const [assignedTo, setAssignedTo] = useState("");
  const [assignedDate, setAssignedDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (existing) {
      setSelectedDeviceType(existing.deviceType);
      setModel(existing.model);
      setSerialNumber(existing.serialNumber);
      setProcessor(existing.processor || "");
      setStorage(existing.storage || "");
      setYear(existing.year);
      setStatus(existing.status);
      setAssignedTo(existing.assignedTo || "");
      setAssignedDate(existing.assignedDate || "");
      setNotes(existing.notes || "");
    }
  }, [existing]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const gadget: Omit<Gadget, "id"> & { id?: string } = {
      deviceType: selectedDeviceType,
      model,
      serialNumber,
      processor: processor || undefined,
      storage: storage || undefined,
      year,
      status,
      assignedTo: assignedTo || undefined,
      assignedDate: assignedDate || undefined,
      notes: notes || undefined,
    };

    if (existing) {
      onSave({ ...gadget, id: existing.id });
    } else {
      onSave(gadget);
    }

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
            {existing ? "Edit Gadget" : `Add ${deviceType || "Gadget"}`}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Device Type */}
              {!deviceType && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Device Type
                  </label>
                  <select
                    value={selectedDeviceType}
                    onChange={(e) =>
                      setSelectedDeviceType(e.target.value as "Laptop" | "Smartphone")
                    }
                    className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
                    required
                  >
                    <option value="Laptop">Laptop</option>
                    <option value="Smartphone">Smartphone</option>
                  </select>
                </div>
              )}

              {/* Model */}
              <div className={!deviceType ? "" : "col-span-2"}>
                <label className="block text-sm font-medium mb-2">Model *</label>
                <input
                  type="text"
                  placeholder="e.g., MacBook Pro 16-inch, iPhone 15 Pro"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
                  required
                />
              </div>

              {/* Serial Number */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Serial Number *
                </label>
                <input
                  type="text"
                  placeholder="e.g., ABC123456789"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
                  required
                />
              </div>

              {/* Processor */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Processor
                </label>
                <input
                  type="text"
                  placeholder="e.g., M2 Pro, Snapdragon 8 Gen 2"
                  value={processor}
                  onChange={(e) => setProcessor(e.target.value)}
                  className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>

              {/* Storage */}
              <div>
                <label className="block text-sm font-medium mb-2">Storage</label>
                <input
                  type="text"
                  placeholder="e.g., 512GB, 256GB"
                  value={storage}
                  onChange={(e) => setStorage(e.target.value)}
                  className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>

              {/* Year */}
              <div>
                <label className="block text-sm font-medium mb-2">Year *</label>
                <input
                  type="number"
                  min="2000"
                  max={new Date().getFullYear() + 1}
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
                  required
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium mb-2">Status *</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as GadgetStatus)}
                  className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
                  required
                >
                  <option value="In-Stock">In-Stock</option>
                  <option value="In-Use">In-Use</option>
                  <option value="Faulty">Faulty</option>
                </select>
              </div>
            </div>

            {/* Assignment Section */}
            {status === "In-Use" && (
              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Assignment Details</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Assigned To
                    </label>
                    <input
                      type="text"
                      placeholder="Employee name"
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Assigned Date
                    </label>
                    <input
                      type="date"
                      value={assignedDate}
                      onChange={(e) => setAssignedDate(e.target.value)}
                      className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-2">Notes</label>
              <textarea
                placeholder="Additional notes or comments..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
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
                {existing ? "Update Gadget" : "Add Gadget"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}



