import { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import type { Printer, PrinterColor } from "../types/printer";
import {
  getAllLocations,
  addCustomLocation,
  getAllModels,
  addCustomModel,
  getAllColors,
  addCustomColor,
  getAllAccessories,
  addCustomAccessory,
  DEFAULT_ACCESSORIES,
} from "../services/printerOptionsService";

type Props = {
  onClose: () => void;
  onSave: (printer: Printer | Omit<Printer, "id">) => void;
  printer?: Printer | null;
};

export default function AddPrinterModal({ onClose, onSave, printer }: Props) {
  const [location, setLocation] = useState("");
  const [model, setModel] = useState("");
  const [printerColorType, setPrinterColorType] = useState<PrinterColor | "">("");
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<"Active" | "In Repair" | "Retired">("Active");
  const [accessories, setAccessories] = useState<string[]>([]);
  const [enableTonerTracking, setEnableTonerTracking] = useState(false);
  
  // Custom input states
  const [showCustomLocation, setShowCustomLocation] = useState(false);
  const [customLocation, setCustomLocation] = useState("");
  const [showCustomModel, setShowCustomModel] = useState(false);
  const [customModel, setCustomModel] = useState("");
  const [showCustomAccessory, setShowCustomAccessory] = useState(false);
  const [customAccessory, setCustomAccessory] = useState("");
  const [showCustomColor, setShowCustomColor] = useState(false);
  const [customColor, setCustomColor] = useState("");

  // Available options
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [availableColors, setAvailableColors] = useState<Array<{ value: string; label: string }>>([]);
  const [availableAccessories, setAvailableAccessories] = useState<string[]>([]);

  // Load available options on mount
  useEffect(() => {
    async function loadOptions() {
      const [locations, models, colors, accessories] = await Promise.all([
        getAllLocations(),
        getAllModels(),
        getAllColors(),
        getAllAccessories(),
      ]);
      setAvailableLocations(locations);
      setAvailableModels(models);
      setAvailableColors(colors);
      setAvailableAccessories(accessories);
    }
    loadOptions();
  }, []);

  useEffect(() => {
    if (printer) {
      setLocation(printer.location);
      setModel(printer.model);
      setPrinterColorType(printer.printerColorType);
      setQuantity(printer.quantity);
      setStatus(printer.status);
      setAccessories(printer.accessories || []);
      setEnableTonerTracking(printer.hasTonerTracking || false);
    }
  }, [printer]);

  async function handleAddCustomLocation() {
    if (customLocation.trim()) {
      const trimmedLocation = customLocation.trim();
      await addCustomLocation(trimmedLocation);
      setLocation(trimmedLocation);
      setAvailableLocations(await getAllLocations());
      setCustomLocation("");
      setShowCustomLocation(false);
    }
  }

  async function handleAddCustomModel() {
    if (customModel.trim()) {
      const trimmedModel = customModel.trim();
      await addCustomModel(trimmedModel);
      setModel(trimmedModel);
      setAvailableModels(await getAllModels());
      setCustomModel("");
      setShowCustomModel(false);
    }
  }

  async function handleAddCustomAccessory() {
    if (customAccessory.trim() && !accessories.includes(customAccessory.trim())) {
      const trimmedAccessory = customAccessory.trim();
      await addCustomAccessory(trimmedAccessory);
      setAccessories([...accessories, trimmedAccessory]);
      setAvailableAccessories(await getAllAccessories());
      setCustomAccessory("");
      setShowCustomAccessory(false);
    }
  }

  async function handleAddCustomColor() {
    if (customColor.trim()) {
      const kebabColor = customColor.trim().toLowerCase().replace(/\s+/g, '-');
      await addCustomColor(customColor.trim());
      setPrinterColorType(kebabColor as PrinterColor);
      setAvailableColors(await getAllColors());
      setCustomColor("");
      setShowCustomColor(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate that printerColorType is not empty
    if (!printerColorType) {
      return;
    }

    const printerData: Omit<Printer, "id"> & { id?: string } = {
      location,
      model,
      printerColorType: printerColorType as PrinterColor,
      quantity,
      status,
      accessories,
      date: printer?.date || new Date().toISOString().split("T")[0],
      hasTonerTracking: enableTonerTracking,
      tonerLevels: printer?.tonerLevels || [],
    };

    if (printer) {
      onSave({ ...printerData, id: printer.id });
    } else {
      onSave(printerData);
    }

    onClose();
  }

  function toggleAccessory(accessory: string) {
    setAccessories((prev) =>
      prev.includes(accessory)
        ? prev.filter((a) => a !== accessory)
        : [...prev, accessory]
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl p-8 relative shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-black"
        >
          <X size={22} />
        </button>

        <h2 className="text-2xl font-bold text-center mb-8">
          {printer ? "Edit Printer" : "Add Printer"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Location */}
            <div>
              <label className="block text-sm font-medium mb-2">Location</label>
              {showCustomLocation ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    placeholder="Enter custom location"
                    className="flex-1 border rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomLocation())}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomLocation}
                    className="bg-green-600 text-white px-4 rounded-lg hover:bg-green-700"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCustomLocation(false)}
                    className="border px-4 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="flex-1 border rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
                    required
                  >
                    <option value="">Select location</option>
                    {availableLocations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowCustomLocation(true)}
                    className="border px-3 rounded-lg hover:bg-gray-50 flex items-center gap-1"
                    title="Add custom location"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              )}
            </div>

            {/* Model */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Printer Model
              </label>
              {showCustomModel ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    placeholder="Enter custom printer model"
                    className="flex-1 border rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomModel())}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomModel}
                    className="bg-green-600 text-white px-4 rounded-lg hover:bg-green-700"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCustomModel(false)}
                    className="border px-4 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="flex-1 border rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
                    required
                  >
                    <option value="">Select printer model</option>
                    {availableModels.map((mdl) => (
                      <option key={mdl} value={mdl}>
                        {mdl}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowCustomModel(true)}
                    className="border px-3 rounded-lg hover:bg-gray-50 flex items-center gap-1"
                    title="Add custom model"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              )}
            </div>

            {/* Printer Color Type */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Printer Color
              </label>
              {showCustomColor ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    placeholder="Enter custom color (e.g., Dark Blue)"
                    className="flex-1 border rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomColor())}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomColor}
                    className="bg-green-600 text-white px-4 rounded-lg hover:bg-green-700"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCustomColor(false)}
                    className="border px-4 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={printerColorType}
                    onChange={(e) => setPrinterColorType(e.target.value as PrinterColor | "")}
                    className="flex-1 border rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
                    required
                  >
                    <option value="">Select color</option>
                    {availableColors.map((color) => (
                      <option key={color.value} value={color.value}>
                        {color.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowCustomColor(true)}
                    className="border px-3 rounded-lg hover:bg-gray-50 flex items-center gap-1"
                    title="Add custom color"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Quantity
              </label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
                required
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "Active" | "In Repair" | "Retired")}
                className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
                required
              >
                <option value="Active">Active</option>
                <option value="In Repair">In Repair</option>
                <option value="Retired">Retired</option>
              </select>
            </div>
          </div>

          {/* Toner Tracking */}
          <div className="border-t pt-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableTonerTracking}
                onChange={(e) => setEnableTonerTracking(e.target.checked)}
                className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
              />
              <div>
                <span className="font-medium">Enable Toner Level Tracking</span>
                <p className="text-sm text-gray-600">Track toner levels (Black, Cyan, Magenta, Yellow) for this printer</p>
              </div>
            </label>
          </div>

          {/* Accessories */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium">
                Accessories (Optional)
              </label>
              <button
                type="button"
                onClick={() => setShowCustomAccessory(true)}
                className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
              >
                <Plus size={16} />
                Add Accessory
              </button>
            </div>

            {showCustomAccessory && (
              <div className="flex gap-2 mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <input
                  type="text"
                  value={customAccessory}
                  onChange={(e) => setCustomAccessory(e.target.value)}
                  placeholder="Enter accessory name"
                  className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomAccessory())}
                />
                <button
                  type="button"
                  onClick={handleAddCustomAccessory}
                  className="bg-green-600 text-white px-4 rounded-lg hover:bg-green-700"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomAccessory(false);
                    setCustomAccessory("");
                  }}
                  className="border px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Display selected accessories */}
            {accessories.length > 0 ? (
              <div className="space-y-2">
                {accessories.map((acc) => (
                  <div
                    key={acc}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
                  >
                    <span className="text-sm">{acc}</span>
                    <button
                      type="button"
                      onClick={() => setAccessories(prev => prev.filter(a => a !== acc))}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No accessories added. Click "Add Accessory" to add one.
              </p>
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
              {printer ? "Update Printer" : "Add Printer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}




