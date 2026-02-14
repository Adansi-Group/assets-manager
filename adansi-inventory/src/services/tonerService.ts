






// src/services/tonerService.ts

import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import type { Toner } from "../types/toner";

const TONERS_COLLECTION = "toners";
const TONER_TYPES_COLLECTION = "toner_types";

// ============================================================================
// TONER CRUD OPERATIONS
// ============================================================================

// GET ALL TONERS
export async function getToners(): Promise<Toner[]> {
  try {
    const q = query(collection(db, TONERS_COLLECTION), orderBy("dateBrought", "desc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Toner, "id">),
    }));
  } catch (error) {
    console.error("Error fetching toners:", error);
    return [];
  }
}

// ADD NEW TONER
export async function addToner(toner: Omit<Toner, "id">): Promise<void> {
  try {
    // Remove undefined fields (Firebase doesn't accept undefined values)
    const cleanToner: any = {};
    Object.keys(toner).forEach((key) => {
      const value = (toner as any)[key];
      if (value !== undefined) {
        cleanToner[key] = value;
      }
    });

    await addDoc(collection(db, TONERS_COLLECTION), cleanToner);
    console.log("Toner added successfully");
  } catch (error) {
    console.error("Error adding toner:", error);
    throw error;
  }
}

// UPDATE TONER
export async function updateToner(toner: Toner): Promise<void> {
  try {
    const { id, ...data } = toner;
    if (!id) throw new Error("Toner ID is required");
    
    // Remove undefined fields (Firebase doesn't accept undefined values)
    const cleanData: any = {};
    Object.keys(data).forEach((key) => {
      const value = (data as any)[key];
      if (value !== undefined) {
        cleanData[key] = value;
      }
    });
    
    await updateDoc(doc(db, TONERS_COLLECTION, id), cleanData);
    console.log("Toner updated successfully");
  } catch (error) {
    console.error("Error updating toner:", error);
    throw error;
  }
}

// DELETE TONER
export async function deleteToner(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, TONERS_COLLECTION, id));
    console.log("Toner deleted successfully");
  } catch (error) {
    console.error("Error deleting toner:", error);
    throw error;
  }
}

// ============================================================================
// TONER TYPES MANAGEMENT
// ============================================================================

export type TonerType = {
  id: string;
  name: string;
  createdAt: string;
};

// Default toner types (built-in)
export const DEFAULT_TONER_TYPES = [
  "415A",
  "207A",
  "222A",
  "CARTRIDGE 069",
  "C-EXV54",
  "C-EXV65",
  "PIXMA 446",
];

// GET ALL CUSTOM TONER TYPES
export async function getCustomTonerTypes(): Promise<TonerType[]> {
  try {
    const q = query(collection(db, TONER_TYPES_COLLECTION), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<TonerType, "id">),
    }));
  } catch (error) {
    console.error("Error fetching custom toner types:", error);
    return [];
  }
}

// GET ALL TONER TYPES (DEFAULT + CUSTOM)
export async function getAllTonerTypes(): Promise<string[]> {
  const customTypes = await getCustomTonerTypes();
  const customNames = customTypes.map(t => t.name);
  
  // Combine default and custom, remove duplicates
  return [...DEFAULT_TONER_TYPES, ...customNames];
}

// ADD NEW CUSTOM TONER TYPE
export async function addTonerType(name: string): Promise<void> {
  try {
    // Check if it already exists
    const existingTypes = await getAllTonerTypes();
    if (existingTypes.includes(name.toUpperCase())) {
      throw new Error("This toner type already exists");
    }

    await addDoc(collection(db, TONER_TYPES_COLLECTION), {
      name: name.toUpperCase(),
      createdAt: new Date().toISOString(),
    });
    
    console.log("Custom toner type added successfully");
  } catch (error) {
    console.error("Error adding toner type:", error);
    throw error;
  }
}

// DELETE CUSTOM TONER TYPE
export async function deleteTonerType(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, TONER_TYPES_COLLECTION, id));
    console.log("Custom toner type deleted successfully");
  } catch (error) {
    console.error("Error deleting toner type:", error);
    throw error;
  }
}


