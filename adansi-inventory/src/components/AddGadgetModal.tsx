
// src/components/AddGadgetModal.tsx - BASE64 WITH IMEI (No Firebase Storage!)

import { useState, useEffect } from "react";
import { X, Upload, Plus } from "lucide-react";
import type { Gadget, GadgetStatus, DeviceType, Condition } from "../types/gadget";
import Swal from "sweetalert2";

const DEFAULT_ACCESSORY_TYPES = [
  "Charger",
  "Cable",
  "Adapter",
  "Case",
  "Earphones",
  "Headphones",
  "Mouse",
  "Keyboard",
  "External Drive",
  "Hub/Dongle",
  "Other",
];

type Props = {
  isOpen?: boolean;
  deviceType?: DeviceType;
  existing?: Gadget;
  onClose: () => void;
  onSubmit: (gadget: Gadget | Omit<Gadget, "id">) => void;
};

export default function AddGadgetModal({
  isOpen = true,
  deviceType,
  existing,
  onClose,
  onSubmit,
}: Props) {
  const [selectedDeviceType, setSelectedDeviceType] = useState<DeviceType>(
    deviceType || existing?.deviceType || "Laptop"
  );
  
  const [model, setModel] = useState("");
  const [status, setStatus] = useState<GadgetStatus>("In-Stock");
  const [year, setYear] = useState(new Date().getFullYear());
  const [assignedTo, setAssignedTo] = useState("");
  const [assignedDate, setAssignedDate] = useState("");
  const [gender, setGender] = useState("");
  const [notes, setNotes] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [serialNumber, setSerialNumber] = useState("");
  const [processor, setProcessor] = useState("");
  const [storage, setStorage] = useState("");
  
  // NEW - IMEI fields for smartphones
  const [imei1, setImei1] = useState("");
  const [imei2, setImei2] = useState("");
  
  const [accessoryType, setAccessoryType] = useState<string>("Charger");
  const [customAccessoryTypes, setCustomAccessoryTypes] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState<Condition>("New");
  const [compatibleWith, setCompatibleWith] = useState("");
  const [specifications, setSpecifications] = useState("");
  const [location, setLocation] = useState("");

  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("customAccessoryTypes");
    if (saved) {
      try {
        setCustomAccessoryTypes(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load custom accessory types:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (existing) {
      setSelectedDeviceType(existing.deviceType);
      setModel(existing.model);
      setStatus(existing.status);
      setYear(existing.year);
      setAssignedTo(existing.assignedTo || "");
      setAssignedDate(existing.assignedDate || "");
      setGender(existing.gender || "");
      setNotes(existing.notes || "");
      setPurchaseDate(existing.purchaseDate || new Date().toISOString().split('T')[0]);
      
      setSerialNumber(existing.serialNumber || "");
      setProcessor(existing.processor || "");
      setStorage(existing.storage || "");
      
      // NEW - Load IMEI
      setImei1(existing.imei1 || "");
      setImei2(existing.imei2 || "");
      
      setAccessoryType(existing.accessoryType || "Charger");
      setQuantity(existing.quantity || 1);
      setCondition(existing.condition || "New");
      setCompatibleWith(existing.compatibleWith || "");
      setSpecifications(existing.specifications || "");
      setLocation(existing.location || "");

      if (existing.imageUrl) {
        setImagePreview(existing.imageUrl);
      }
    }
  }, [existing]);

  // ✅ CONVERT IMAGE TO BASE64 - NO FIREBASE STORAGE NEEDED!
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 1MB for Firestore)
      if (file.size > 1024 * 1024) {
        Swal.fire({
          icon: "error",
          title: "Image Too Large",
          text: "Please select an image smaller than 1MB"
        });
        return;
      }

      setUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string); // This is base64!
        setUploading(false);
      };
      reader.onerror = () => {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to read image file"
        });
        setUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  async function handleAddCustomType() {
    const result = await Swal.fire({
      title: 'Add Custom Accessory Type',
      input: 'text',
      inputLabel: 'Enter new accessory type name',
      inputPlaceholder: 'e.g., Screen Protector, Power Bank',
      showCancelButton: true,
      confirmButtonColor: '#16a34a',
      confirmButtonText: 'Add',
      inputValidator: (value) => {
        if (!value) {
          return 'Please enter an accessory type name';
        }
        const allTypes = [...DEFAULT_ACCESSORY_TYPES, ...customAccessoryTypes];
        if (allTypes.includes(value)) {
          return 'This accessory type already exists';
        }
        return null;
      }
    });

    if (result.isConfirmed && result.value) {
      const newType = result.value.trim();
      const updatedTypes = [...customAccessoryTypes, newType];
      setCustomAccessoryTypes(updatedTypes);
      localStorage.setItem("customAccessoryTypes", JSON.stringify(updatedTypes));
      setAccessoryType(newType);
      
      Swal.fire({
        icon: 'success',
        title: 'Added!',
        text: `"${newType}" has been added to accessory types`,
        timer: 1500,
        showConfirmButton: false,
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const baseGadget = {
      deviceType: selectedDeviceType,
      model,
      status,
      year,
      purchaseDate,
      imageUrl: imagePreview || undefined, // ✅ Save base64 directly!
      assignedTo: assignedTo || undefined,
      assignedDate: assignedDate || undefined,
      gender: gender || undefined,
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
        location: status === "In-Stock" ? location : undefined,
      };
    } else {
      gadget = {
        ...baseGadget,
        serialNumber,
        processor: selectedDeviceType === "Laptop" ? (processor || undefined) : undefined,
        storage: storage || undefined,
        // NEW - Add IMEI for smartphones
        imei1: selectedDeviceType === "Smartphone" ? (imei1 || undefined) : undefined,
        imei2: selectedDeviceType === "Smartphone" ? (imei2 || undefined) : undefined,
      };
    }

    if (existing) {
      onSubmit({ ...gadget, id: existing.id });
    } else {
      onSubmit(gadget);
    }

    onClose();
  }

  if (!isOpen) return null;

  const isAccessory = selectedDeviceType === "Accessory";
  const isSmartphone = selectedDeviceType === "Smartphone";
  const allAccessoryTypes = [...DEFAULT_ACCESSORY_TYPES, ...customAccessoryTypes];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
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
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {!deviceType && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                      Device Type *
                    </label>
                    <select
                      value={selectedDeviceType}
                      onChange={(e) => setSelectedDeviceType(e.target.value as DeviceType)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    >
                      <option value="Laptop">Laptop</option>
                      <option value="Smartphone">Smartphone</option>
                      <option value="Accessory">Accessory</option>
                    </select>
                  </div>
                )}

                {isAccessory && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                      Accessory Type *
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={accessoryType}
                        onChange={(e) => setAccessoryType(e.target.value)}
                        className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      >
                        {allAccessoryTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAddCustomType}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        title="Add custom accessory type"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>
                )}

                <div className={!deviceType && !isAccessory ? "" : "col-span-2"}>
                  <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                    {isAccessory ? "Name/Description" : "Model"} *
                  </label>
                  <input
                    type="text"
                    placeholder={isAccessory ? "e.g., USB-C Cable" : "e.g., MacBook Pro"}
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Year *</label>
                  <input
                    type="number"
                    min="2000"
                    max={new Date().getFullYear() + 1}
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Status *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as GadgetStatus)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    <option value="In-Stock">In-Stock</option>
                    <option value="In-Use">In-Use</option>
                    <option value="Faulty">Faulty</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Purchase Date *</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                    Image (Optional - Max 1MB)
                  </label>
                  <div className="flex items-center gap-4">
                    {imagePreview ? (
                      <div className="relative">
                        <img src={imagePreview} alt="Preview" className="w-24 h-24 object-cover rounded-lg border-2 border-green-500" />
                        <button
                          type="button"
                          onClick={() => setImagePreview("")}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-green-500">
                        <Upload size={24} className="text-gray-400" />
                        <span className="text-xs text-gray-500 mt-1">Upload</span>
                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                      </label>
                    )}
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      <p>Square image (500x500px recommended)</p>
                      <p>Max: 1MB • JPG, PNG, WebP</p>
                      <p className="text-green-600 dark:text-green-400 mt-1">✓ No Firebase Storage needed!</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {!isAccessory && (
              <div className="border-t dark:border-gray-700 pt-6">
                <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">📊 Specifications</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Serial Number *</label>
                    <input
                      type="text"
                      placeholder="e.g., ABC123456789"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  {/* NEW - IMEI FIELDS FOR SMARTPHONES */}
                  {isSmartphone && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                          IMEI 1 📱
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., 123456789012345"
                          value={imei1}
                          onChange={(e) => setImei1(e.target.value)}
                          maxLength={15}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Primary IMEI (15 digits)
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                          IMEI 2 📱
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., 543210987654321"
                          value={imei2}
                          onChange={(e) => setImei2(e.target.value)}
                          maxLength={15}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Secondary IMEI (for dual-SIM phones)
                        </p>
                      </div>
                    </>
                  )}

                  {selectedDeviceType === "Laptop" && (
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Processor</label>
                      <input
                        type="text"
                        placeholder="e.g., M2 Pro"
                        value={processor}
                        onChange={(e) => setProcessor(e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Storage</label>
                    <input
                      type="text"
                      placeholder="e.g., 512GB"
                      value={storage}
                      onChange={(e) => setStorage(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {isAccessory && (
              <div className="border-t dark:border-gray-700 pt-6">
                <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">🔌 Accessory Details</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Quantity *</label>
                    <input
                      type="number"
                      min="0"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Condition *</label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value as Condition)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    >
                      <option value="New">New</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Specifications</label>
                    <input
                      type="text"
                      placeholder="e.g., 30W, USB-C"
                      value={specifications}
                      onChange={(e) => setSpecifications(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Compatible With</label>
                    <input
                      type="text"
                      placeholder="e.g., MacBook Pro"
                      value={compatibleWith}
                      onChange={(e) => setCompatibleWith(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  {status === "In-Stock" && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Storage Location</label>
                      <input
                        type="text"
                        placeholder="e.g., IT Store Room"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {status === "In-Use" && (
              <div className="border-t dark:border-gray-700 pt-6">
                <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">👤 Assignment Details</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Assigned To</label>
                    <input
                      type="text"
                      placeholder="Employee name"
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Assigned Date</label>
                    <input
                      type="date"
                      value={assignedDate}
                      onChange={(e) => setAssignedDate(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Not specified</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t dark:border-gray-700 pt-6">
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Notes</label>
              <textarea
                placeholder="Additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

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
                disabled={uploading}
                className="bg-green-600 text-white px-8 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {uploading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
                {uploading ? "Processing..." : (existing ? "Update" : "Add")} {isAccessory ? "Accessory" : "Gadget"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}










