







import { useState, useEffect } from "react";
import {
  Package,
  Plus,
  Search,
  TrendingUp,
  TrendingDown,
  Edit2,
  Trash2,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  Eye
} from "lucide-react";
import Swal from "sweetalert2";
import {
  getInventoryItems,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  addStock,
  removeStock
} from "../services/inventoryService";
import type { InventoryItem, InventoryCategory } from "../types/inventory";
import {
  INVENTORY_ITEMS_BY_CATEGORY,
  INVENTORY_UNITS
} from "../types/inventory";
import { auth } from "../firebase/firebase";

// Item-specific fields configuration
const ITEM_SPECIFIC_FIELDS: Record<string, Array<{
  name: string;
  label: string;
  type: "text" | "number" | "date";
  placeholder?: string;
}>> = {
  "TV": [
    { name: "brand", label: "Brand", type: "text", placeholder: "e.g., Samsung, LG" },
    { name: "model", label: "Model", type: "text", placeholder: "e.g., UA55T5300" },
    { name: "serialNumber", label: "Serial Number", type: "text" },
    { name: "screenSize", label: "Screen Size", type: "text", placeholder: "e.g., 55 inches" },
    { name: "warrantyExpiry", label: "Warranty Expiry", type: "date" }
  ],
  "Bottled Water (Bel Aqua)": [
    { name: "bottleSize", label: "Bottle Size", type: "text", placeholder: "e.g., 500ml, 1.5L" },
    { name: "expiryDate", label: "Expiry Date", type: "date" }
  ],
  "Fire Extinguisher": [
    { name: "type", label: "Type", type: "text", placeholder: "e.g., CO2, Foam, Powder" },
    { name: "capacity", label: "Capacity", type: "text", placeholder: "e.g., 6kg, 9L" },
    { name: "expiryDate", label: "Expiry Date", type: "date" },
    { name: "lastInspection", label: "Last Inspection", type: "date" }
  ],
  "Pens": [
    { name: "brand", label: "Brand", type: "text", placeholder: "e.g., Bic, Pilot" },
    { name: "color", label: "Color", type: "text", placeholder: "e.g., Blue, Black, Red" }
  ]
};

// All office locations/branches
const LOCATIONS = [
  "Ashaley Botwe Branch",
  "Nester Square Branch",
  "Tema Branch",
  "Takoradi Branch",
  "Kumasi Branch",
  "Tarkwa Branch",
  "Travel House"
];

// Define which common fields each item type should show
const ITEM_FIELD_VISIBILITY: Record<string, {
  showMinStock?: boolean;
  showUnitPrice?: boolean;
  showSupplier?: boolean;
  showRoom?: boolean;
}> = {
  "TV": { showMinStock: false, showUnitPrice: true, showSupplier: true, showRoom: true },
  "Tea & Coffee Machine": { showMinStock: false, showUnitPrice: true, showSupplier: true, showRoom: true },
  "WiFi Router": { showMinStock: false, showUnitPrice: true, showSupplier: true, showRoom: true },
  "Air Conditioner (AC)": { showMinStock: false, showUnitPrice: true, showSupplier: true, showRoom: true },
  "Fridge/Refrigerator": { showMinStock: false, showUnitPrice: true, showSupplier: true, showRoom: true },
  "Smoke Sensor": { showMinStock: false, showUnitPrice: true, showSupplier: true, showRoom: true },
  "Water Dispenser": { showMinStock: false, showUnitPrice: true, showSupplier: true, showRoom: true },
  "Office Chair": { showMinStock: false, showUnitPrice: true, showSupplier: true, showRoom: true },
  "Desk/Table": { showMinStock: false, showUnitPrice: true, showSupplier: true, showRoom: true },
  "Filing Cabinet": { showMinStock: false, showUnitPrice: true, showSupplier: true, showRoom: true },
  "Fire Extinguisher": { showMinStock: true, showUnitPrice: true, showSupplier: true, showRoom: true },
  "Bottled Water (Bel Aqua)": { showMinStock: true, showUnitPrice: true, showSupplier: true, showRoom: true },
  "Water Sachets": { showMinStock: true, showUnitPrice: true, showSupplier: true, showRoom: true },
  "Tissues (Box)": { showMinStock: true, showUnitPrice: true, showSupplier: true, showRoom: false },
  "Toilet Rolls": { showMinStock: true, showUnitPrice: true, showSupplier: true, showRoom: false },
  "Pens": { showMinStock: true, showUnitPrice: true, showSupplier: true, showRoom: false },
  "Markers": { showMinStock: true, showUnitPrice: true, showSupplier: true, showRoom: false },
  "Stapler": { showMinStock: true, showUnitPrice: true, showSupplier: true, showRoom: false },
  "Paper Clips": { showMinStock: true, showUnitPrice: true, showSupplier: true, showRoom: false },
};

type InventoryStatus = "In Stock" | "Low Stock" | "Out of Stock";

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory | "All">("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [stockAction, setStockAction] = useState<"add" | "remove">("add");

  // Form states
  const [formData, setFormData] = useState<Partial<InventoryItem> & { itemName: string }>({
    category: "Office Supplies",
    itemName: "",
    quantity: 0,
    unit: "piece(s)",
    minStockLevel: 5,
    location: "Ashaley Botwe Branch"
  });
  const [itemSpecificData, setItemSpecificData] = useState<Record<string, any>>({});
  const [stockQuantity, setStockQuantity] = useState(1);
  const [stockReason, setStockReason] = useState("");
  const [useCustomItem, setUseCustomItem] = useState(false);
  const [useCustomCategory, setUseCustomCategory] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [customItems, setCustomItems] = useState<Record<string, string[]>>({});

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, searchTerm, selectedCategory]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const data = await getInventoryItems();
      setItems(data);
    } catch (error) {
      console.error("Error loading items:", error);
      Swal.fire("Error", "Failed to load inventory items", "error");
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = items;

    // Filter by category
    if (selectedCategory !== "All") {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.itemName.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        item.location.toLowerCase().includes(term) ||
        item.brand?.toLowerCase().includes(term)
      );
    }

    setFilteredItems(filtered);
  };

  const getStatus = (item: InventoryItem): InventoryStatus => {
    if (item.quantity === 0) return "Out of Stock";
    if (item.quantity <= item.minStockLevel) return "Low Stock";
    return "In Stock";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "In Stock": return "text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300";
      case "Low Stock": return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300";
      case "Out of Stock": return "text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const handleAddItem = async () => {
    if (!formData.itemName || formData.quantity === undefined) {
      Swal.fire("Error", "Please fill in all required fields", "error");
      return;
    }

    try {
      const itemData = {
        ...formData,
        notes: Object.keys(itemSpecificData).length > 0 
          ? JSON.stringify(itemSpecificData) 
          : formData.notes
      } as Omit<InventoryItem, "id">;

      await addInventoryItem(itemData);
      
      Swal.fire("Success", "Item added successfully", "success");
      setShowAddModal(false);
      resetForm();
      loadItems();
    } catch (error) {
      console.error("Error adding item:", error);
      Swal.fire("Error", "Failed to add item", "error");
    }
  };

  const handleEditItem = async () => {
    if (!selectedItem) return;

    try {
      // Merge selectedItem with formData to create complete InventoryItem
      const updatedItem: InventoryItem = {
        ...selectedItem,
        ...formData,
        quantity: formData.quantity !== undefined ? formData.quantity : selectedItem.quantity,
        minStockLevel: formData.minStockLevel !== undefined ? formData.minStockLevel : selectedItem.minStockLevel,
      };
      
      await updateInventoryItem(updatedItem);
      
      Swal.fire("Success", "Item updated successfully", "success");
      setShowEditModal(false);
      setSelectedItem(null);
      resetForm();
      loadItems();
    } catch (error) {
      console.error("Error updating item:", error);
      Swal.fire("Error", "Failed to update item", "error");
    }
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    const result = await Swal.fire({
      title: "Delete Item?",
      text: `Are you sure you want to delete "${item.itemName}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Yes, delete it"
    });

    if (result.isConfirmed) {
      try {
        await deleteInventoryItem(item.id);
        Swal.fire("Deleted!", "Item has been deleted", "success");
        loadItems();
      } catch (error) {
        console.error("Error deleting item:", error);
        Swal.fire("Error", "Failed to delete item", "error");
      }
    }
  };

  const handleStockChange = async () => {
    if (!selectedItem || stockQuantity <= 0) {
      Swal.fire("Error", "Please enter a valid quantity", "error");
      return;
    }

    try {
      const userName = auth.currentUser?.displayName || auth.currentUser?.email || "Unknown User";

      if (stockAction === "add") {
        await addStock(
          selectedItem.id,
          selectedItem.itemName,
          stockQuantity,
          selectedItem.location,
          stockReason || "Manual stock addition",
          userName
        );
      } else {
        await removeStock(
          selectedItem.id,
          selectedItem.itemName,
          stockQuantity,
          selectedItem.location,
          stockReason || "Manual stock removal",
          userName
        );
      }

      Swal.fire("Success", `Stock ${stockAction === "add" ? "added" : "removed"} successfully`, "success");
      setShowStockModal(false);
      setSelectedItem(null);
      setStockQuantity(1);
      setStockReason("");
      loadItems();
    } catch (error) {
      console.error("Error updating stock:", error);
      Swal.fire("Error", "Failed to update stock", "error");
    }
  };

  const openEditModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setFormData({
      itemName: item.itemName,  // ← ADD THIS LINE
      quantity: item.quantity,
      minStockLevel: item.minStockLevel,
      location: item.location,
      room: item.room,
      unitPrice: item.unitPrice,
      supplier: item.supplier,
      notes: item.notes
    });
    setShowEditModal(true);
  };

  const openStockModal = (item: InventoryItem, action: "add" | "remove") => {
    setSelectedItem(item);
    setStockAction(action);
    setStockQuantity(1);
    setStockReason("");
    setShowStockModal(true);
  };

  const resetForm = () => {
    setFormData({
      category: "Office Supplies",
      itemName: "",
      quantity: 0,
      unit: "piece(s)",
      minStockLevel: 5,
      location: "Ashaley Botwe Branch"
    });
    setItemSpecificData({});
    setUseCustomItem(false);
    setUseCustomCategory(false);
  };

  const getFieldVisibility = (itemName: string) => {
    // If no item selected, show all fields
    if (!itemName) {
      return { showMinStock: true, showUnitPrice: true, showSupplier: true, showRoom: true };
    }
    // If in custom mode (adding new item), show all fields
    if (useCustomItem || useCustomCategory) {
      return { showMinStock: true, showUnitPrice: true, showSupplier: true, showRoom: true };
    }
    // Return specific configuration or default to showing all fields
    return ITEM_FIELD_VISIBILITY[itemName] || { showMinStock: true, showUnitPrice: true, showSupplier: true, showRoom: true };
  };

  const parseItemSpecificData = (notes: string | undefined): Record<string, any> => {
    if (!notes) return {};
    try {
      const parsed = JSON.parse(notes);
      if (typeof parsed === 'object') return parsed;
      return {};
    } catch {
      return {};
    }
  };

  const totalValue = items.reduce((sum, item) => sum + (item.totalValue || 0), 0);
  const lowStockCount = items.filter(item => getStatus(item) === "Low Stock").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Package className="w-8 h-8" />
          Inventory & Store
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Track and manage all office items and consumables
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Items</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {items.length}
              </p>
            </div>
            <Package className="w-12 h-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Low Stock Alerts</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">
                {lowStockCount}
              </p>
            </div>
            <AlertCircle className="w-12 h-12 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Value</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                GH₵{totalValue.toFixed(2)}
              </p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-600" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col gap-4">
          {/* Search and Buttons Row */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button
              onClick={() => loadItems()}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 justify-center"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 justify-center"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>

          {/* Category Filter Buttons */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {(["All", "Electronics & Equipment", "Furniture", "Safety Equipment", "Office Supplies", "Consumables", "Cleaning & Hygiene"] as Array<InventoryCategory | "All">).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-colors ${
                    selectedCategory === cat
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {cat}
                </button>
              ))}
              {customCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat as any)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-colors ${
                    selectedCategory === cat
                      ? "bg-purple-600 text-white"
                      : "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800"
                  }`}
                >
                  {cat} ⭐
                </button>
              ))}
            </div>
            {filteredItems.length !== items.length && (
              <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                Showing {filteredItems.length} of {items.length} items
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredItems.map((item) => {
                const status = getStatus(item);
                return (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.itemName}
                      </div>
                      {item.brand && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {item.brand}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {item.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white font-medium">
                        {item.quantity} {item.unit}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Min: {item.minStockLevel}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {item.location}
                      </div>
                      {item.room && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {item.room}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      GH₵{item.totalValue?.toFixed(2) || "0.00"}
                      {item.unitPrice && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          @GH₵{item.unitPrice.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3">
                        {/* Add Stock Button - Green */}
                        <button
                          onClick={() => openStockModal(item, "add")}
                          className="w-9 h-9 rounded-full bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 flex items-center justify-center text-green-600 dark:text-green-400 transition-colors duration-200"
                          title="Add Stock"
                        >
                          <PlusCircle className="w-5 h-5" strokeWidth={2} />
                        </button>

                        {/* Edit Button - Blue */}
                        <button
                          onClick={() => openEditModal(item)}
                          className="w-9 h-9 rounded-full bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 transition-colors duration-200"
                          title="Edit"
                        >
                          <Edit2 className="w-5 h-5" strokeWidth={2} />
                        </button>

                        {/* Delete Button - Red */}
                        <button
                          onClick={() => handleDeleteItem(item)}
                          className="w-9 h-9 rounded-full bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 transition-colors duration-200"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" strokeWidth={2} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Inventory Item</h2>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Category & Item Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Category
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setUseCustomCategory(!useCustomCategory);
                        if (!useCustomCategory) {
                          setFormData({ ...formData, category: "" as InventoryCategory, itemName: "" });
                        } else {
                          setFormData({ ...formData, category: "Office Supplies" as InventoryCategory, itemName: "" });
                        }
                        setUseCustomItem(false);
                      }}
                      className="text-xs px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      {useCustomCategory ? "Use Dropdown" : "Add Custom"}
                    </button>
                  </div>
                  {useCustomCategory ? (
                    <>
                      <input
                        type="text"
                        placeholder="Enter custom category name..."
                        value={formData.category}
                        onChange={(e) => {
                          setFormData({ ...formData, category: e.target.value as InventoryCategory, itemName: "" });
                        }}
                        onBlur={(e) => {
                          const newCategory = e.target.value.trim();
                          if (newCategory && !customCategories.includes(newCategory)) {
                            setCustomCategories([...customCategories, newCategory]);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      />
                      <p className="mt-1 text-xs text-purple-600 dark:text-purple-400">
                        💡 Custom category - click away to save it
                      </p>
                    </>
                  ) : (
                    <select
                      value={formData.category}
                      onChange={(e) => {
                        setFormData({ ...formData, category: e.target.value as InventoryCategory, itemName: "" });
                        setItemSpecificData({});
                        setUseCustomItem(false);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    >
                      {Object.keys(INVENTORY_ITEMS_BY_CATEGORY).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      {customCategories.map(cat => (
                        <option key={cat} value={cat}>{cat} ⭐</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Item Name
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setUseCustomItem(!useCustomItem);
                        setFormData({ ...formData, itemName: "" });
                      }}
                      className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      {useCustomItem ? "Use Dropdown" : "Add Custom"}
                    </button>
                  </div>
                  {useCustomItem ? (
                    <>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter custom item name..."
                          value={formData.itemName}
                          onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && formData.itemName.trim()) {
                              e.preventDefault();
                              const itemName = formData.itemName.trim();
                              const category = formData.category || "Office Supplies";
                              setCustomItems(prev => ({
                                ...prev,
                                [category]: [...(prev[category] || []), itemName]
                              }));
                              setUseCustomItem(false);
                              setFormData({ ...formData, itemName });
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (formData.itemName.trim()) {
                              const itemName = formData.itemName.trim();
                              const category = formData.category || "Office Supplies";
                              // Add to custom items list for this category
                              setCustomItems(prev => ({
                                ...prev,
                                [category]: [...(prev[category] || []), itemName]
                              }));
                              // Switch back to dropdown mode with this item selected
                              setUseCustomItem(false);
                              setFormData({ ...formData, itemName });
                            }
                          }}
                          disabled={!formData.itemName.trim()}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          Add to List
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                        💡 Type item name and click "Add to List" or press Enter
                      </p>
                    </>
                  ) : (
                    <>
                      <select
                        value={formData.itemName}
                        onChange={(e) => {
                          setFormData({ ...formData, itemName: e.target.value });
                          setItemSpecificData({});
                        }}
                        disabled={useCustomCategory}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">{useCustomCategory ? "Use 'Add Custom' button →" : "Select an item"}</option>
                        {/* Predefined items */}
                        {formData.category && INVENTORY_ITEMS_BY_CATEGORY[formData.category] && INVENTORY_ITEMS_BY_CATEGORY[formData.category].map(item => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                        {/* Custom items for this category */}
                        {formData.category && customItems[formData.category] && customItems[formData.category].length > 0 && (
                          <>
                            <option disabled>──────────</option>
                            {customItems[formData.category].map(item => (
                              <option key={item} value={item}>{item} ⭐</option>
                            ))}
                          </>
                        )}
                      </select>
                      {useCustomCategory && (
                        <p className="mt-1 text-xs text-purple-600 dark:text-purple-400">
                          💡 Custom category selected - click "Add Custom" to enter item name
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Item-Specific Fields */}
              {!useCustomItem && formData.itemName && ITEM_SPECIFIC_FIELDS[formData.itemName] && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    {formData.itemName} Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ITEM_SPECIFIC_FIELDS[formData.itemName].map(field => (
                      <div key={field.name}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {field.label}
                        </label>
                        <input
                          type={field.type}
                          placeholder={field.placeholder}
                          value={itemSpecificData[field.name] || ""}
                          onChange={(e) => setItemSpecificData({ ...itemSpecificData, [field.name]: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity & Unit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Unit
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  >
                    {INVENTORY_UNITS.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Min Stock Level & Unit Price - Conditional */}
              {formData.itemName && (() => {
                const visibility = getFieldVisibility(formData.itemName);
                const showMinStock = visibility.showMinStock;
                const showUnitPrice = visibility.showUnitPrice;
                
                if (!showMinStock && !showUnitPrice) return null;
                
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {showMinStock && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Min Stock Level
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.minStockLevel}
                          onChange={(e) => setFormData({ ...formData, minStockLevel: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    )}

                    {showUnitPrice && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Unit Price (GH₵) - Optional
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.unitPrice || ""}
                          onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || undefined })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                          placeholder="e.g., 30.00"
                        />
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Location & Room */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Location (Branch)
                  </label>
                  <select
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  >
                    {LOCATIONS.map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                </div>

                {(!formData.itemName || getFieldVisibility(formData.itemName).showRoom) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Room/Office (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.room || ""}
                      onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      placeholder="e.g., Conference Room, IT Office"
                    />
                  </div>
                )}
              </div>

              {/* Supplier - Optional - Conditional */}
              {(!formData.itemName || getFieldVisibility(formData.itemName).showSupplier) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Supplier (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.supplier || ""}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., ABC Supplies Ltd."
                  />
                </div>
              )}

              {/* Notes - Optional */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={formData.notes || ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Any additional information..."
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-600 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Edit: {selectedItem.itemName}
              </h2>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Quantity & Min Stock Level - Conditional */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {getFieldVisibility(selectedItem.itemName).showMinStock && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Min Stock Level
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.minStockLevel}
                      onChange={(e) => setFormData({ ...formData, minStockLevel: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                )}
              </div>

              {/* Location & Room */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Location
                  </label>
                  <select
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  >
                    {LOCATIONS.map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                </div>

                {getFieldVisibility(selectedItem.itemName).showRoom && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Room/Office (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.room || ""}
                      onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      placeholder="e.g., Conference Room"
                    />
                  </div>
                )}
              </div>

              {/* Unit Price & Supplier - Conditional */}
              {(() => {
                const visibility = getFieldVisibility(selectedItem.itemName);
                const showUnitPrice = visibility.showUnitPrice;
                const showSupplier = visibility.showSupplier;
                
                if (!showUnitPrice && !showSupplier) return null;
                
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {showUnitPrice && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Unit Price (GH₵)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.unitPrice || ""}
                          onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || undefined })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                          placeholder="e.g., 30.00"
                        />
                      </div>
                    )}

                    {showSupplier && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Supplier (Optional)
                        </label>
                        <input
                          type="text"
                          value={formData.supplier || ""}
                          onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                          placeholder="e.g., ABC Supplies Ltd."
                        />
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Display Item-Specific Data if exists */}
              {selectedItem.notes && (() => {
                const specificData = parseItemSpecificData(selectedItem.notes);
                return Object.keys(specificData).length > 0 ? (
                  <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      {selectedItem.itemName} Details
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {Object.entries(specificData).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-blue-700 dark:text-blue-400 font-medium capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}:
                          </span>
                          <span className="ml-2 text-blue-900 dark:text-blue-200">
                            {String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={(() => {
                    const specificData = parseItemSpecificData(selectedItem.notes);
                    return Object.keys(specificData).length > 0 ? "" : (formData.notes || "");
                  })()}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Any additional information..."
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-600 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedItem(null);
                  resetForm();
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleEditItem}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Modal (Add/Remove) */}
      {showStockModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 rounded-t-lg">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {stockAction === "add" ? <PlusCircle className="w-6 h-6" /> : <MinusCircle className="w-6 h-6" />}
                {stockAction === "add" ? "Add" : "Remove"} Stock
              </h2>
              <p className="text-green-100 text-sm mt-1">{selectedItem.itemName}</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="text-sm text-blue-900 dark:text-blue-200">
                  <span className="font-medium">Current Stock:</span> {selectedItem.quantity} {selectedItem.unit}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quantity to {stockAction === "add" ? "Add" : "Remove"}
                </label>
                <input
                  type="number"
                  min="1"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason (Optional)
                </label>
                <textarea
                  value={stockReason}
                  onChange={(e) => setStockReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., New purchase, Damaged items, Used for meeting..."
                />
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Stock Level:
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {stockAction === "add" 
                    ? selectedItem.quantity + stockQuantity 
                    : Math.max(0, selectedItem.quantity - stockQuantity)
                  } {selectedItem.unit}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-600 flex justify-end gap-3 rounded-b-lg">
              <button
                onClick={() => {
                  setShowStockModal(false);
                  setSelectedItem(null);
                  setStockQuantity(1);
                  setStockReason("");
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleStockChange}
                className={`px-4 py-2 text-white rounded-lg ${
                  stockAction === "add" 
                    ? "bg-green-600 hover:bg-green-700" 
                    : "bg-orange-600 hover:bg-orange-700"
                }`}
              >
                {stockAction === "add" ? "Add Stock" : "Remove Stock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}