
// src/pages/inventory/InventoryCategory.tsx
// FIXED VERSION with better error handling and debugging

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getItemsByCategory,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  addStock,
  removeStock
} from "../../services/inventoryService";
import type { InventoryItem, InventoryCategory } from "../../types/inventory";
import { INVENTORY_ITEMS_BY_CATEGORY } from "../../types/inventory";
import AddInventoryItemModal from "../../components/AddInventoryItemModal";
import {
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  Package,
  RefreshCw,
  ArrowLeft
} from "lucide-react";
import Swal from "sweetalert2";
import { auth } from "../../firebase/firebase";

// Map URL param to category
const CATEGORY_MAP: Record<string, InventoryCategory> = {
  "electronics": "Electronics & Equipment",
  "furniture": "Furniture",
  "safety": "Safety Equipment",
  "office-supplies": "Office Supplies",
  "consumables": "Consumables",
  "cleaning": "Cleaning & Hygiene",
};

export default function InventoryCategory() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const categoryName = category ? CATEGORY_MAP[category] : undefined;

  // Debug logging
  useEffect(() => {
    console.log("URL Category param:", category);
    console.log("Mapped category name:", categoryName);
  }, [category, categoryName]);

  useEffect(() => {
    if (!categoryName) {
      console.error("Invalid category:", category);
      setLoading(false);
      Swal.fire({
        icon: "error",
        title: "Invalid Category",
        text: "The category you're trying to access doesn't exist.",
        confirmButtonColor: "#16a34a"
      }).then(() => {
        navigate("/inventory");
      });
      return;
    }
    
    loadItems();
  }, [categoryName]);

  async function loadItems() {
    if (!categoryName) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    console.log("Loading items for category:", categoryName);
    
    try {
      const data = await getItemsByCategory(categoryName);
      console.log("Loaded items:", data);
      setItems(data);
    } catch (error) {
      console.error("Error loading items:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load items"
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleAddItem(itemData: Omit<InventoryItem, "id">) {
    try {
      await addInventoryItem(itemData);
      await loadItems();
      setShowAddModal(false);
      Swal.fire({
        icon: "success",
        title: "Item Added!",
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error("Error adding item:", error);
      Swal.fire({
        icon: "error",
        title: "Failed",
        text: "Could not add item"
      });
    }
  }

  async function handleDeleteItem(item: InventoryItem) {
    const result = await Swal.fire({
      title: "Delete Item?",
      text: `Remove "${item.itemName}" from inventory?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Yes, delete"
    });

    if (result.isConfirmed) {
      try {
        await deleteInventoryItem(item.id);
        await loadItems();
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          timer: 1500,
          showConfirmButton: false
        });
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Failed",
          text: "Could not delete item"
        });
      }
    }
  }

  async function handleAddStock(item: InventoryItem) {
    const result = await Swal.fire({
      title: `Add Stock: ${item.itemName}`,
      html: `
        <div class="space-y-4 text-left">
          <p class="text-sm text-gray-600">Current: <strong>${item.quantity} ${item.unit}</strong></p>
          <div>
            <label class="block text-sm font-medium mb-2">Quantity to Add</label>
            <input id="quantity" type="number" class="swal2-input w-full" min="1" value="1">
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Reason</label>
            <input id="reason" type="text" class="swal2-input w-full" placeholder="e.g., Restock">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Add Stock",
      confirmButtonColor: "#16a34a",
      preConfirm: () => {
        const quantity = parseInt((document.getElementById("quantity") as HTMLInputElement).value);
        const reason = (document.getElementById("reason") as HTMLInputElement).value;
        if (quantity <= 0) {
          Swal.showValidationMessage("Quantity must be > 0");
          return false;
        }
        return { quantity, reason };
      }
    });

    if (result.isConfirmed && result.value) {
      try {
        const user = auth.currentUser;
        await addStock(
          item.id,
          item.itemName,
          result.value.quantity,
          item.location,
          result.value.reason,
          user?.email || "Unknown"
        );
        await loadItems();
        Swal.fire({
          icon: "success",
          title: "Stock Added!",
          timer: 1500,
          showConfirmButton: false
        });
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Failed",
          text: "Could not add stock"
        });
      }
    }
  }

  async function handleRemoveStock(item: InventoryItem) {
    const result = await Swal.fire({
      title: `Remove Stock: ${item.itemName}`,
      html: `
        <div class="space-y-4 text-left">
          <p class="text-sm text-gray-600">Current: <strong>${item.quantity} ${item.unit}</strong></p>
          <div>
            <label class="block text-sm font-medium mb-2">Quantity to Remove</label>
            <input id="quantity" type="number" class="swal2-input w-full" min="1" max="${item.quantity}" value="1">
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Reason</label>
            <input id="reason" type="text" class="swal2-input w-full" placeholder="e.g., Used">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Remove Stock",
      confirmButtonColor: "#dc2626",
      preConfirm: () => {
        const quantity = parseInt((document.getElementById("quantity") as HTMLInputElement).value);
        const reason = (document.getElementById("reason") as HTMLInputElement).value;
        if (quantity <= 0) {
          Swal.showValidationMessage("Quantity must be > 0");
          return false;
        }
        if (quantity > item.quantity) {
          Swal.showValidationMessage(`Cannot remove more than ${item.quantity}`);
          return false;
        }
        return { quantity, reason };
      }
    });

    if (result.isConfirmed && result.value) {
      try {
        const user = auth.currentUser;
        await removeStock(
          item.id,
          item.itemName,
          result.value.quantity,
          item.location,
          result.value.reason,
          user?.email || "Unknown"
        );
        await loadItems();
        Swal.fire({
          icon: "success",
          title: "Stock Removed!",
          timer: 1500,
          showConfirmButton: false
        });
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Failed",
          text: "Could not remove stock"
        });
      }
    }
  }

  function getStockStatus(item: InventoryItem): { label: string; color: string } {
    if (item.quantity === 0) {
      return { label: "Out of Stock", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" };
    } else if (item.quantity <= item.minStockLevel) {
      return { label: "Low Stock", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" };
    } else {
      return { label: "In Stock", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" };
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading {categoryName || "items"}...
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Category: {category} → {categoryName || "Not Found"}
          </p>
        </div>
      </div>
    );
  }

  if (!categoryName) {
    return (
      <div className="p-6">
        <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 p-4 rounded-lg">
          <h2 className="font-bold">Invalid Category</h2>
          <p>Category "{category}" not found.</p>
          <button
            onClick={() => navigate("/inventory")}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Back to Inventory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-100 dark:bg-gray-900">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/inventory")}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{categoryName}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {items.length} items in this category
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadItems}
            className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            <RefreshCw size={20} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            <Plus size={20} />
            Add Item
          </button>
        </div>
      </div>

      {/* ITEMS TABLE */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-gray-900 dark:text-white">Item</th>
              <th className="px-6 py-3 text-left text-gray-900 dark:text-white">Quantity</th>
              <th className="px-6 py-3 text-left text-gray-900 dark:text-white">Status</th>
              <th className="px-6 py-3 text-left text-gray-900 dark:text-white">Location</th>
              <th className="px-6 py-3 text-left text-gray-900 dark:text-white">Value</th>
              <th className="px-6 py-3 text-left text-gray-900 dark:text-white">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const status = getStockStatus(item);
              return (
                <tr
                  key={item.id}
                  className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.itemName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.brand && `${item.brand}`} {item.model && `- ${item.model}`}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {item.quantity} {item.unit}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Min: {item.minStockLevel}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-700 dark:text-gray-300">{item.location}</p>
                    {item.room && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.room}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      GH₵{(item.totalValue || 0).toFixed(2)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAddStock(item)}
                        className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                        title="Add stock"
                      >
                        <TrendingUp size={18} />
                      </button>
                      <button
                        onClick={() => handleRemoveStock(item)}
                        className="text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300"
                        title="Remove stock"
                      >
                        <TrendingDown size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        title="Delete item"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400 dark:text-gray-500">
                  No items in this category. Click "Add Item" to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ADD ITEM MODAL */}
      {showAddModal && categoryName && (
        <AddInventoryItemModal
          category={categoryName}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddItem}
        />
      )}
    </div>
  );
}


