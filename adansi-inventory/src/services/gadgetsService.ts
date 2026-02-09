// src/services/gadgetsService.ts

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
    if (!gadget.model || !gadget.serialNumber) {
      throw new Error("Model and Serial Number are required");
    }

    if (!gadget.model.trim()) {
      throw new Error("Model cannot be empty");
    }

    if (!gadget.serialNumber.trim()) {
      throw new Error("Serial Number cannot be empty");
    }

    // Clean the data - remove undefined values and trim strings
    const cleanGadget: any = {
      deviceType: gadget.deviceType,
      model: gadget.model.trim(),
      serialNumber: gadget.serialNumber.trim(),
      year: gadget.year,
      status: gadget.status,
      createdAt: Timestamp.now(),
    };

    // Only add optional fields if they have values
    if (gadget.processor && gadget.processor.trim()) {
      cleanGadget.processor = gadget.processor.trim();
    }
    
    if (gadget.storage && gadget.storage.trim()) {
      cleanGadget.storage = gadget.storage.trim();
    }
    
    if (gadget.assignedTo && gadget.assignedTo.trim()) {
      cleanGadget.assignedTo = gadget.assignedTo.trim();
    }
    
    if (gadget.assignedDate) {
      cleanGadget.assignedDate = gadget.assignedDate;
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

// UPDATE GADGET
export async function updateGadget(gadget: Gadget): Promise<void> {
  try {
    const { id, ...payload } = gadget;
    await updateDoc(doc(db, COLLECTION, id), payload);
    console.log("Gadget updated successfully");
  } catch (error) {
    console.error("Error updating gadget:", error);
    throw error;
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
  deviceType: "Laptop" | "Smartphone"
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




