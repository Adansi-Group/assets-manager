






// src/components/AddGadgetModal.tsx - WITH GENDER FIELD

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { Gadget, GadgetStatus, DeviceType, AccessoryType, Condition } from "../types/gadget";

type Props = {
  deviceType?: DeviceType;
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
  const [selectedDeviceType, setSelectedDeviceType] = useState<DeviceType>(
    deviceType || existing?.deviceType || "Laptop"
  );
  
  // Common fields
  const [model, setModel] = useState("");
  const [status, setStatus] = useState<GadgetStatus>("In-Stock");
  const [year, setYear] = useState(new Date().getFullYear());
  const [assignedTo, setAssignedTo] = useState("");
  const [assignedDate, setAssignedDate] = useState("");
  const [gender, setGender] = useState(""); // NEW
  const [notes, setNotes] = useState("");
  
  // Laptop/Smartphone fields
  const [serialNumber, setSerialNumber] = useState("");
  const [processor, setProcessor] = useState("");
  const [storage, setStorage] = useState("");
  
  // Accessory fields
  const [accessoryType, setAccessoryType] = useState<AccessoryType>("Charger");
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState<Condition>("New");
  const [compatibleWith, setCompatibleWith] = useState("");
  const [specifications, setSpecifications] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    if (existing) {
      setSelectedDeviceType(existing.deviceType);
      setModel(existing.model);
      setStatus(existing.status);
      setYear(existing.year);
      setAssignedTo(existing.assignedTo || "");
      setAssignedDate(existing.assignedDate || "");
      setGender(existing.gender || ""); // NEW
      setNotes(existing.notes || "");
      
      // Laptop/Smartphone
      setSerialNumber(existing.serialNumber || "");
      setProcessor(existing.processor || "");
      setStorage(existing.storage || "");
      
      // Accessory
      setAccessoryType(existing.accessoryType || "Charger");
      setQuantity(existing.quantity || 1);
      setCondition(existing.condition || "New");
      setCompatibleWith(existing.compatibleWith || "");
      setSpecifications(existing.specifications || "");
      setPurchaseDate(existing.purchaseDate || "");
      setLocation(existing.location || "");
    }
  }, [existing]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const baseGadget = {
      deviceType: selectedDeviceType,
      model,
      status,
      year,
      assignedTo: assignedTo || undefined,
      assignedDate: assignedDate || undefined,
      gender: gender || undefined, // NEW
      notes: notes || undefined,
    };

    let gadget: Omit<Gadget, "id"> & { id?: string };

    if (selectedDeviceType === "Accessory") {
      gadget = {
        ...baseGadget,
        accessoryType,
        quantity,
        condition,
        compatibleWith: compatibleWith || undefined,
        specifications: specifications || undefined,
        purchaseDate: purchaseDate || undefined,
        location: location || undefined,
      };
    } else {
      gadget = {
        ...baseGadget,
        serialNumber,
        processor: processor || undefined,
        storage: storage || undefined,
      };
    }

    if (existing) {
      onSave({ ...gadget, id: existing.id });
    } else {
      onSave(gadget);
    }

    onClose();
  }

  const isAccessory = selectedDeviceType === "Accessory";

  return (
    <>
      {/* BACKDROP */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* MODAL */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
          >
            <X size={22} />
          </button>

          <h2 className="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-white">
            {existing ? "Edit Gadget" : `Add ${deviceType || "Gadget"}`}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* BASIC INFO SECTION */}
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Device Type */}
                {!deviceType && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                      Device Type *
                    </label>
                    <select
                      value={selectedDeviceType}
                      onChange={(e) => setSelectedDeviceType(e.target.value as DeviceType)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                      required
                    >
                      <option value="Laptop">Laptop</option>
                      <option value="Smartphone">Smartphone</option>
                      <option value="Accessory">Accessory</option>
                    </select>
                  </div>
                )}

                {/* Accessory Type (only for accessories) */}
                {isAccessory && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                      Accessory Type *
                    </label>
                    <select
                      value={accessoryType}
                      onChange={(e) => setAccessoryType(e.target.value as AccessoryType)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                      required
                    >
                      <option value="Charger">Charger</option>
                      <option value="Cable">Cable</option>
                      <option value="Adapter">Adapter</option>
                      <option value="Case">Case</option>
                      <option value="Earphones">Earphones</option>
                      <option value="Mouse">Mouse</option>
                      <option value="Keyboard">Keyboard</option>
                      <option value="External Drive">External Drive</option>
                      <option value="Hub/Dongle">Hub/Dongle</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                )}

                {/* Model/Name */}
                <div className={!deviceType && !isAccessory ? "" : "col-span-2"}>
                  <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                    {isAccessory ? "Name/Description" : "Model"} *
                  </label>
                  <input
                    type="text"
                    placeholder={isAccessory ? "e.g., USB-C Charge Cable (2m)" : "e.g., MacBook Pro 16-inch"}
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Year */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                    Year *
                  </label>
                  <input
                    type="number"
                    min="2000"
                    max={new Date().getFullYear() + 1}
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                    Status *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as GadgetStatus)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                    required
                  >
                    <option value="In-Stock">In-Stock</option>
                    <option value="In-Use">In-Use</option>
                    <option value="Faulty">Faulty</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SPECIFICATIONS SECTION - For Laptops/Smartphones */}
            {!isAccessory && (
              <div className="border-t dark:border-gray-700 pt-6">
                <h3 className="font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="text-purple-600 dark:text-purple-400">📊</span>
                  Specifications
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  {/* Serial Number */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                      Serial Number *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., ABC123456789"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Processor */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                      Processor
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., M2 Pro, Snapdragon 8 Gen 2"
                      value={processor}
                      onChange={(e) => setProcessor(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                  </div>

                  {/* Storage */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                      Storage
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 512GB, 256GB"
                      value={storage}
                      onChange={(e) => setStorage(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ACCESSORY DETAILS SECTION */}
            {isAccessory && (
              <div className="border-t dark:border-gray-700 pt-6">
                <h3 className="font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="text-orange-600 dark:text-orange-400">🔌</span>
                  Accessory Details
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Condition */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                      Condition *
                    </label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value as Condition)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                      required
                    >
                      <option value="New">New</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor</option>
                    </select>
                  </div>

                  {/* Specifications */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                      Specifications
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 30W, 2m length, USB-C"
                      value={specifications}
                      onChange={(e) => setSpecifications(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                  </div>

                  {/* Compatible With */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                      Compatible With
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., MacBook Pro, iPhone 15"
                      value={compatibleWith}
                      onChange={(e) => setCompatibleWith(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                  </div>

                  {/* Purchase Date */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                      Purchase Date
                    </label>
                    <input
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                      Storage Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., IT Store Room, Drawer 3"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ASSIGNMENT SECTION - WITH GENDER */}
            {status === "In-Use" && (
              <div className="border-t dark:border-gray-700 pt-6">
                <h3 className="font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="text-blue-600 dark:text-blue-400">👤</span>
                  Assignment Details
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                      Assigned To
                    </label>
                    <input
                      type="text"
                      placeholder="Employee name"
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                      Assigned Date
                    </label>
                    <input
                      type="date"
                      value={assignedDate}
                      onChange={(e) => setAssignedDate(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                  </div>

                  {/* NEW GENDER FIELD */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                      Gender
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                    >
                      <option value="">Not specified</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* NOTES SECTION */}
            <div className="border-t dark:border-gray-700 pt-6">
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                Notes
              </label>
              <textarea
                placeholder="Additional notes or comments..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>

            {/* BUTTONS */}
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
                {existing ? "Update" : "Add"} {isAccessory ? "Accessory" : "Gadget"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}