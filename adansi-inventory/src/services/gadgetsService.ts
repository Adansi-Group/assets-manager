// src/services/gadgetsService.ts - FIXED VERSION

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
import type { Gadget } from "../types/gadget";

const COLLECTION = "gadgets";

// GET ALL GADGETS
export async function getGadgets(): Promise<Gadget[]> {
  try {
    const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Gadget, "id">),
    }));
  } catch (error) {
    console.error("Error fetching gadgets:", error);
    return [];
  }
}

// ADD NEW GADGET
export async function addGadget(gadget: Omit<Gadget, "id">): Promise<void> {
  try {
    // Validate required fields
    if (!gadget.model) {
      throw new Error("Model/Name is required");
    }

    if (!gadget.model.trim()) {
      throw new Error("Model/Name cannot be empty");
    }

    // Validate device-specific requirements
    if (gadget.deviceType === "Accessory") {
      // For accessories, require accessory type and quantity
      if (!gadget.accessoryType) {
        throw new Error("Accessory Type is required");
      }
      if (gadget.quantity === undefined || gadget.quantity < 0) {
        throw new Error("Quantity is required and must be 0 or greater");
      }
    } else {
      // For Laptop/Smartphone, require serial number
      if (!gadget.serialNumber || !gadget.serialNumber.trim()) {
        throw new Error("Serial Number is required for Laptop/Smartphone");
      }
    }

    // Clean the data - remove undefined values and trim strings
    const cleanGadget: any = {
      deviceType: gadget.deviceType,
      model: gadget.model.trim(),
      year: gadget.year,
      status: gadget.status,
      createdAt: Timestamp.now(),
    };

    // Add device-specific fields
    if (gadget.deviceType === "Accessory") {
      cleanGadget.accessoryType = gadget.accessoryType;
      cleanGadget.quantity = gadget.quantity;
      cleanGadget.condition = gadget.condition || "New";

      if (gadget.compatibleWith && gadget.compatibleWith.trim()) {
        cleanGadget.compatibleWith = gadget.compatibleWith.trim();
      }
      if (gadget.specifications && gadget.specifications.trim()) {
        cleanGadget.specifications = gadget.specifications.trim();
      }
      if (gadget.purchaseDate) {
        cleanGadget.purchaseDate = gadget.purchaseDate;
      }
      if (gadget.location && gadget.location.trim()) {
        cleanGadget.location = gadget.location.trim();
      }
    } else {
      // Laptop/Smartphone
      cleanGadget.serialNumber = gadget.serialNumber!.trim();
      
      if (gadget.processor && gadget.processor.trim()) {
        cleanGadget.processor = gadget.processor.trim();
      }
      if (gadget.storage && gadget.storage.trim()) {
        cleanGadget.storage = gadget.storage.trim();
      }
    }

    // Add common optional fields
    if (gadget.assignedTo && gadget.assignedTo.trim()) {
      cleanGadget.assignedTo = gadget.assignedTo.trim();
    }
    if (gadget.assignedDate) {
      cleanGadget.assignedDate = gadget.assignedDate;
    }
    if (gadget.gender && gadget.gender.trim()) {
      cleanGadget.gender = gadget.gender.trim();
    }
    if (gadget.notes && gadget.notes.trim()) {
      cleanGadget.notes = gadget.notes.trim();
    }

    console.log("Adding gadget to Firestore:", cleanGadget);

    await addDoc(collection(db, COLLECTION), cleanGadget);
    console.log("✅ Gadget added successfully");
  } catch (error: any) {
    console.error("❌ Error adding gadget:", error);
    throw new Error(`Failed to add gadget: ${error.message}`);
  }
}

// UPDATE GADGET - FIXED TO PROPERLY DELETE FIELDS
export async function updateGadget(gadget: Gadget): Promise<void> {
  try {
    const { id, createdAt, ...payload } = gadget;
    
    // Build the update payload
    const updatePayload: any = {};
    
    Object.keys(payload).forEach((key) => {
      const value = (payload as any)[key];
      
      // If value is explicitly undefined, use deleteField() to remove it from Firestore
      if (value === undefined) {
        updatePayload[key] = deleteField();
      } 
      // Only include non-empty values
      else if (value !== null && value !== "") {
        updatePayload[key] = value;
      }
    });
    
    console.log("Updating gadget:", id, updatePayload);
    
    await updateDoc(doc(db, COLLECTION, id), updatePayload);
    console.log("✅ Gadget updated successfully");
  } catch (error: any) {
    console.error("❌ Error updating gadget:", error);
    throw new Error(`Failed to update gadget: ${error.message}`);
  }
}

// DELETE GADGET
export async function deleteGadget(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
    console.log("Gadget deleted successfully");
  } catch (error) {
    console.error("Error deleting gadget:", error);
    throw error;
  }
}

// GET GADGETS BY TYPE
export async function getGadgetsByType(
  deviceType: "Laptop" | "Smartphone" | "Accessory"
): Promise<Gadget[]> {
  const gadgets = await getGadgets();
  return gadgets.filter((g) => g.deviceType === deviceType);
}

// GET GADGETS BY STATUS
export async function getGadgetsByStatus(
  status: "In-Stock" | "In-Use" | "Faulty"
): Promise<Gadget[]> {
  const gadgets = await getGadgets();
  return gadgets.filter((g) => g.status === status);
}

// GET ACCESSORIES BY TYPE
export async function getAccessoriesByType(
  accessoryType: string
): Promise<Gadget[]> {
  const gadgets = await getGadgets();
  return gadgets.filter(
    (g) => g.deviceType === "Accessory" && g.accessoryType === accessoryType
  );
}

// GET LOW STOCK ACCESSORIES (quantity <= threshold)
export async function getLowStockAccessories(threshold: number = 2): Promise<Gadget[]> {
  const accessories = await getGadgetsByType("Accessory");
  return accessories.filter(
    (a) => a.quantity !== undefined && a.quantity <= threshold
  );
}