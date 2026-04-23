









// src/services/inventoryService.ts

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp,
  deleteField,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import type { InventoryItem } from "../types/inventory";

const COLLECTION = "inventory";

// GET ALL ITEMS
export async function getInventoryItems(): Promise<InventoryItem[]> {
  try {
    const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<InventoryItem, "id">),
    }));
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return [];
  }
}

// ADD NEW ITEM
export async function addInventoryItem(item: Omit<InventoryItem, "id">): Promise<void> {
  try {
    const cleanItem: any = {
      category: item.category,
      itemName: item.itemName.trim(),
      quantity: item.quantity || 0,
      unit: item.unit,
      minStockLevel: item.minStockLevel || 0,
      location: item.location.trim(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    // Add optional fields only if they have values
    if (item.brand && item.brand.trim()) {
      cleanItem.brand = item.brand.trim();
    }
    if (item.model && item.model.trim()) {
      cleanItem.model = item.model.trim();
    }
    if (item.room && item.room.trim()) {
      cleanItem.room = item.room.trim();
    }
    if (item.unitPrice && item.unitPrice > 0) {
      cleanItem.unitPrice = item.unitPrice;
      cleanItem.totalValue = item.quantity * item.unitPrice;
    }
    if (item.supplier && item.supplier.trim()) {
      cleanItem.supplier = item.supplier.trim();
    }
    if (item.lastRestocked) {
      cleanItem.lastRestocked = item.lastRestocked;
    }
    if (item.notes && item.notes.trim()) {
      cleanItem.notes = item.notes.trim();
    }

    await addDoc(collection(db, COLLECTION), cleanItem);
    console.log("✅ Inventory item added successfully");
  } catch (error: any) {
    console.error("❌ Error adding inventory item:", error);
    throw new Error(`Failed to add inventory item: ${error.message}`);
  }
}

// UPDATE ITEM
export async function updateInventoryItem(item: InventoryItem): Promise<void> {
  try {
    const { id, createdAt, ...payload } = item;
    
    const updatePayload: any = {
      updatedAt: Timestamp.now(),
    };
    
    Object.keys(payload).forEach((key) => {
      const value = (payload as any)[key];
      
      if (value === undefined || value === "") {
        updatePayload[key] = deleteField();
      } else if (value !== null) {
        updatePayload[key] = value;
      }
    });

    // Recalculate total value if price or quantity changed
    if (item.unitPrice && item.quantity) {
      updatePayload.totalValue = item.quantity * item.unitPrice;
    }
    
    await updateDoc(doc(db, COLLECTION, id), updatePayload);
    console.log("✅ Inventory item updated successfully");
  } catch (error: any) {
    console.error("❌ Error updating inventory item:", error);
    throw new Error(`Failed to update inventory item: ${error.message}`);
  }
}

// DELETE ITEM
export async function deleteInventoryItem(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
    console.log("✅ Inventory item deleted successfully");
  } catch (error) {
    console.error("❌ Error deleting inventory item:", error);
    throw error;
  }
}

// GET LOW STOCK ITEMS
export async function getLowStockItems(): Promise<InventoryItem[]> {
  const items = await getInventoryItems();
  return items.filter((item) => item.quantity <= item.minStockLevel);
}

// GET ITEMS BY CATEGORY
export async function getItemsByCategory(category: string): Promise<InventoryItem[]> {
  const items = await getInventoryItems();
  return items.filter((item) => item.category === category);
}

// ADD STOCK (Increase quantity)
export async function addStock(
  itemId: string,
  itemName: string,
  quantityToAdd: number,
  location: string,
  reason: string,
  performedBy: string
): Promise<void> {
  try {
    // Get current item
    const items = await getInventoryItems();
    const item = items.find(i => i.id === itemId);
    if (!item) throw new Error("Item not found");

    const newQuantity = item.quantity + quantityToAdd;

    // Update item quantity
    const updatePayload: any = {
      quantity: newQuantity,
      lastRestocked: new Date().toISOString(),
      updatedAt: Timestamp.now(),
    };

    // Recalculate total value if unit price exists
    if (item.unitPrice) {
      updatePayload.totalValue = newQuantity * item.unitPrice;
    }

    await updateDoc(doc(db, COLLECTION, itemId), updatePayload);
    console.log(`✅ Added ${quantityToAdd} to stock. New quantity: ${newQuantity}`);
  } catch (error) {
    console.error("❌ Error adding stock:", error);
    throw error;
  }
}

// REMOVE STOCK (Decrease quantity)
export async function removeStock(
  itemId: string,
  itemName: string,
  quantityToRemove: number,
  location: string,
  reason: string,
  performedBy: string
): Promise<void> {
  try {
    // Get current item
    const items = await getInventoryItems();
    const item = items.find(i => i.id === itemId);
    if (!item) throw new Error("Item not found");

    const newQuantity = Math.max(0, item.quantity - quantityToRemove);

    // Update item quantity
    const updatePayload: any = {
      quantity: newQuantity,
      updatedAt: Timestamp.now(),
    };

    // Recalculate total value if unit price exists
    if (item.unitPrice) {
      updatePayload.totalValue = newQuantity * item.unitPrice;
    }

    await updateDoc(doc(db, COLLECTION, itemId), updatePayload);
    console.log(`✅ Removed ${quantityToRemove} from stock. New quantity: ${newQuantity}`);
  } catch (error) {
    console.error("❌ Error removing stock:", error);
    throw error;
  }
}