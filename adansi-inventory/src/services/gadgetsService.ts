










// src/services/gadgetsService.ts - COMPLETE FIXED VERSION

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

function isLegacyLockerDevice(gadget: Gadget): boolean {
  return Boolean(gadget.returnedFrom && String(gadget.returnedFrom).trim());
}

function isActiveGadget(gadget: Gadget): boolean {
  const isLocker = gadget.lockerDevice === true || isLegacyLockerDevice(gadget);
  if (!isLocker) return true;
  return gadget.lockerAction === "Reassigned" || (!gadget.lockerAction && gadget.status === "In-Use");
}

async function getAllGadgetRecords(): Promise<Gadget[]> {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Gadget, "id">),
  }));
}

// GET ALL GADGETS
export async function getGadgets(): Promise<Gadget[]> {
  try {
    const gadgets = await getAllGadgetRecords();
    return gadgets.filter(isActiveGadget);
  } catch (error) {
    console.error("Error fetching gadgets:", error);
    return [];
  }
}

/**
 * Same as getGadgets(), but throws instead of returning [] on failure.
 *
 * Reporting needs this: an empty array from a failed read is indistinguishable
 * from a genuinely empty estate, which would put "0 devices" in front of
 * management as though it were a fact.
 */
export async function getGadgetsStrict(): Promise<Gadget[]> {
  const gadgets = await getAllGadgetRecords();
  return gadgets.filter(isActiveGadget);
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
      if (!gadget.accessoryType) {
        throw new Error("Accessory Type is required");
      }
      if (gadget.quantity === undefined || gadget.quantity < 0) {
        throw new Error("Quantity is required and must be 0 or greater");
      }
    } else {
      if (!gadget.serialNumber || !gadget.serialNumber.trim()) {
        throw new Error("Serial Number is required for Laptop/Smartphone");
      }
    }

    // Clean the data - remove undefined values and trim strings
    const cleanGadget: Record<string, unknown> = {
      deviceType: gadget.deviceType,
      model: gadget.model.trim(),
      year: gadget.year,
      status: gadget.status,
      createdAt: Timestamp.now(),
    };

    // ✅ ADD PURCHASE DATE (NEW)
    if (gadget.purchaseDate) {
      cleanGadget.purchaseDate = gadget.purchaseDate;
    }

    // ✅ ADD IMAGE URL (NEW)
    if (gadget.imageUrl && gadget.imageUrl.trim()) {
      cleanGadget.imageUrl = gadget.imageUrl.trim();
    }

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

    // Former-staff returned-device fields
    if (gadget.returnedFrom && gadget.returnedFrom.trim()) {
      cleanGadget.returnedFrom = gadget.returnedFrom.trim();
    }
    if (gadget.formerDepartment && gadget.formerDepartment.trim()) {
      cleanGadget.formerDepartment = gadget.formerDepartment.trim();
    }
    if (gadget.staffLeftDate) {
      cleanGadget.staffLeftDate = gadget.staffLeftDate;
    }
    if (gadget.lockerDevice) cleanGadget.lockerDevice = true;
    if (gadget.lockerReason) cleanGadget.lockerReason = gadget.lockerReason;
    if (gadget.lockerCondition) cleanGadget.lockerCondition = gadget.lockerCondition;
    if (gadget.lockerAction) cleanGadget.lockerAction = gadget.lockerAction;
    if (gadget.lockerDate) cleanGadget.lockerDate = gadget.lockerDate;
    if (gadget.lockerLocation?.trim()) cleanGadget.lockerLocation = gadget.lockerLocation.trim();
    if (gadget.outcomeDate) cleanGadget.outcomeDate = gadget.outcomeDate;
    if (gadget.reassignedTo?.trim()) cleanGadget.reassignedTo = gadget.reassignedTo.trim();
    // Condition applies to returned laptops/phones too (not just accessories)
    if (gadget.deviceType !== "Accessory" && gadget.condition) {
      cleanGadget.condition = gadget.condition;
    }

    console.log("Adding gadget to Firestore:", cleanGadget);

    await addDoc(collection(db, COLLECTION), cleanGadget);
    console.log("✅ Gadget added successfully");
  } catch (error) {
    console.error("❌ Error adding gadget:", error);
    throw new Error(`Failed to add gadget: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// UPDATE GADGET - FIXED TO PROPERLY DELETE FIELDS
export async function updateGadget(gadget: Gadget): Promise<void> {
  try {
    const { id, createdAt, ...payload } = gadget;
    
    // Build the update payload
    const updatePayload: Record<string, unknown> = {};

    Object.keys(payload).forEach((key) => {
      const value = (payload as Record<string, unknown>)[key];
      
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
  } catch (error) {
    console.error("❌ Error updating gadget:", error);
    throw new Error(`Failed to update gadget: ${error instanceof Error ? error.message : String(error)}`);
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

// GET LOCKER DEVICES. Legacy returned-device records are included automatically.
export async function getReturnedDevices(): Promise<Gadget[]> {
  const gadgets = await getAllGadgetRecords();
  return gadgets.filter((g) => g.lockerDevice === true || isLegacyLockerDevice(g));
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
