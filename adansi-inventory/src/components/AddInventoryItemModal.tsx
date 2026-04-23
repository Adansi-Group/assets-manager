



// src/components/AddInventoryItemModal.tsx
// Modal component for adding inventory items with dynamic fields

import { useState } from "react";
import { X } from "lucide-react";
import type { InventoryItem, InventoryCategory } from "../types/inventory";
import { INVENTORY_ITEMS_BY_CATEGORY, INVENTORY_UNITS } from "../types/inventory";

// Define which fields each ITEM needs
const ITEM_SPECIFIC_FIELDS: Record<string, FieldConfig[]> = {
  // Electronics & Equipment
  "TV": [
    { name: "brand", label: "Brand", type: "text", placeholder: "e.g., Samsung, LG" },
    { name: "model", label: "Model", type: "text", placeholder: "Model number" },
    { name: "serialNumber", label: "Serial Number", type: "text" },
    { name: "screenSize", label: "Screen Size", type: "text", placeholder: 'e.g., 55"' },
    { name: "warranty", label: "Warranty Expiry", type: "date" },
  ],
  "WiFi Router": [
    { name: "brand", label: "Brand", type: "text" },
    { name: "model", label: "Model", type: "text" },
    { name: "serialNumber", label: "Serial Number", type: "text" },
  ],
  "Air Conditioner (AC)": [
    { name: "brand", label: "Brand", type: "text" },
    { name: "model", label: "Model", type: "text" },
    { name: "serialNumber", label: "Serial Number", type: "text" },
    { name: "warranty", label: "Warranty Expiry", type: "date" },
  ],
  "Fridge/Refrigerator": [
    { name: "brand", label: "Brand", type: "text" },
    { name: "model", label: "Model", type: "text" },
    { name: "serialNumber", label: "Serial Number", type: "text" },
    { name: "warranty", label: "Warranty Expiry", type: "date" },
  ],
  "Smoke Sensor": [
    { name: "brand", label: "Brand", type: "text" },
    { name: "model", label: "Model", type: "text" },
    { name: "serialNumber", label: "Serial Number", type: "text" },
    { name: "expiryDate", label: "Expiry Date", type: "date" },
  ],
  // Furniture
  "Office Chair": [
    { name: "brand", label: "Brand", type: "text" },
    { name: "material", label: "Material", type: "text", placeholder: "e.g., Leather, Mesh, Fabric" },
    { name: "condition", label: "Condition", type: "select", options: ["New", "Good", "Fair", "Poor"] },
  ],
  "Desk/Table": [
    { name: "material", label: "Material", type: "text", placeholder: "e.g., Wood, Metal, Glass" },
    { name: "dimensions", label: "Dimensions", type: "text", placeholder: "L x W x H" },
    { name: "condition", label: "Condition", type: "select", options: ["New", "Good", "Fair", "Poor"] },
  ],
  // Safety Equipment
  "Fire Extinguisher": [
    { name: "brand", label: "Brand", type: "text" },
    { name: "type", label: "Type", type: "text", placeholder: "e.g., CO2, Foam, Powder" },
    { name: "capacity", label: "Capacity", type: "text", placeholder: "e.g., 6kg" },
    { name: "expiryDate", label: "Expiry Date", type: "date" },
    { name: "inspectionDate", label: "Last Inspection", type: "date" },
  ],
  // Consumables
  "Bottled Water (Bel Aqua)": [
    { name: "bottleSize", label: "Bottle Size", type: "text", placeholder: "e.g., 500ml, 1.5L" },
    { name: "expiryDate", label: "Expiry Date", type: "date" },
  ],
  "Water Sachets": [
    { name: "packSize", label: "Pack Size", type: "text", placeholder: "e.g., 30 sachets" },
    { name: "expiryDate", label: "Expiry Date", type: "date" },
  ],
  // Cleaning & Hygiene
  "Air Freshener Spray": [
    { name: "brand", label: "Brand", type: "text" },
    { name: "scent", label: "Scent", type: "text", placeholder: "e.g., Lavender, Citrus" },
    { name: "expiryDate", label: "Expiry Date", type: "date" },
  ],
};

interface FieldConfig {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "textarea";
  placeholder?: string;
  options?: string[];
}

interface Props {
  category: InventoryCategory;
  onClose: () => void;
  onAdd: (item: Omit<InventoryItem, "id">) => Promise<void>;
}

export default function AddInventoryItemModal({ category, onClose, onAdd }: Props) {
  const predefinedItems = INVENTORY_ITEMS_BY_CATEGORY[category];
  
  const [selectedItem, setSelectedItem] = useState("");
  const [formData, setFormData] = useState<Record<string, any>>({
    quantity: 0,
    unit: "piece(s)",
    minStockLevel: 5,
    location: "Ashaley Botwe Branch",
  });
  const [loading, setLoading] = useState(false);

  const currentItemFields = selectedItem ? (ITEM_SPECIFIC_FIELDS[selectedItem] || []) : [];

  function handleChange(field: string, value: any) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  function handleItemSelect(itemName: string) {
    setSelectedItem(itemName);
    // Reset item-specific fields
    const fieldsToKeep = ["quantity", "unit", "minStockLevel", "location", "room", "unitPrice", "supplier", "notes"];
    const newFormData: Record<string, any> = {};
    fieldsToKeep.forEach(field => {
      if (formData[field] !== undefined) {
        newFormData[field] = formData[field];
      }
    });
    setFormData(newFormData);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!selectedItem) {
      alert("Please select an item");
      return;
    }

    if (!formData.quantity || !formData.unit || !formData.location) {
      alert("Please fill in all required fields");
      return;
    }

    setLoading(true);
    
    try {
      const itemData: Omit<InventoryItem, "id"> = {
        category,
        itemName: selectedItem,
        quantity: parseInt(formData.quantity),
        unit: formData.unit,
        minStockLevel: parseInt(formData.minStockLevel),
        location: formData.location,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add optional common fields
      if (formData.brand) itemData.brand = formData.brand;
      if (formData.model) itemData.model = formData.model;
      if (formData.room) itemData.room = formData.room;
      if (formData.unitPrice) {
        itemData.unitPrice = parseFloat(formData.unitPrice);
        itemData.totalValue = itemData.quantity * itemData.unitPrice;
      }
      if (formData.supplier) itemData.supplier = formData.supplier;
      if (formData.notes) itemData.notes = formData.notes;

      // Add item-specific fields to notes as JSON
      const specificFields: Record<string, any> = {};
      currentItemFields.forEach(field => {
        if (formData[field.name]) {
          specificFields[field.name] = formData[field.name];
        }
      });

      if (Object.keys(specificFields).length > 0) {
        itemData.notes = itemData.notes 
          ? `${JSON.stringify(specificFields)}\n${itemData.notes}`
          : JSON.stringify(specificFields);
      }

      await onAdd(itemData);
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Failed to add item");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Add Item to {category}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Select Item */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Item *
            </label>
            <select
              value={selectedItem}
              onChange={(e) => handleItemSelect(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Choose an item...</option>
              {predefinedItems.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* Item-Specific Fields */}
          {selectedItem && currentItemFields.length > 0 && (
            <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
              <h3 className="font-medium text-blue-900 dark:text-blue-100">
                {selectedItem} Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentItemFields.map((field) => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {field.label}
                    </label>
                    {field.type === "select" ? (
                      <select
                        value={formData[field.name] || ""}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Select...</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "textarea" ? (
                      <textarea
                        value={formData[field.name] || ""}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={formData[field.name] || ""}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Common Fields */}
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => handleChange("quantity", e.target.value)}
                    min="0"
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Unit *
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => handleChange("unit", e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {INVENTORY_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Minimum Stock Level *
                </label>
                <input
                  type="number"
                  value={formData.minStockLevel}
                  onChange={(e) => handleChange("minStockLevel", e.target.value)}
                  min="0"
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Location (Branch) *
                </label>
                <select
                  value={formData.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="Ashaley Botwe Branch">Ashaley Botwe Branch</option>
                  <option value="Nester Square Branch">Nester Square Branch</option>
                  <option value="Tema Branch">Tema Branch</option>
                  <option value="Takoradi Branch">Takoradi Branch</option>
                  <option value="Kumasi Branch">Kumasi Branch</option>
                  <option value="Tarkwa Branch">Tarkwa Branch</option>
                  <option value="Travel House">Travel House</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Room/Office
                </label>
                <input
                  type="text"
                  value={formData.room || ""}
                  onChange={(e) => handleChange("room", e.target.value)}
                  placeholder="e.g., Store Room"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Unit Price (GH₵)
                  </label>
                  <input
                    type="number"
                    value={formData.unitPrice || ""}
                    onChange={(e) => handleChange("unitPrice", e.target.value)}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Supplier
                  </label>
                  <input
                    type="text"
                    value={formData.supplier || ""}
                    onChange={(e) => handleChange("supplier", e.target.value)}
                    placeholder="Supplier name"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes || ""}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  rows={3}
                  placeholder="Additional notes..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedItem}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? "Adding..." : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}