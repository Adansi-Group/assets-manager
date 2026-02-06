






// src/services/tonerReplacementService.ts

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import type { TonerReplacement } from "../types/toner";

const REPLACEMENTS_COLLECTION = "toner_replacements";

// Add a new toner replacement record
export async function addTonerReplacement(
  data: Omit<TonerReplacement, "id" | "createdAt">
): Promise<void> {
  try {
    await addDoc(collection(db, REPLACEMENTS_COLLECTION), {
      ...data,
      createdAt: new Date().toISOString(),
    });
    console.log("Toner replacement recorded successfully");
  } catch (error) {
    console.error("Error recording toner replacement:", error);
    throw error;
  }
}

// Get all replacement records for a specific toner
export async function getTonerReplacements(
  tonerId: string
): Promise<TonerReplacement[]> {
  try {
    const q = query(
      collection(db, REPLACEMENTS_COLLECTION),
      where("tonerId", "==", tonerId),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<TonerReplacement, "id">),
    }));
  } catch (error) {
    console.error("Error fetching toner replacements:", error);
    return [];
  }
}

// Get all replacement records (for reporting)
export async function getAllReplacements(): Promise<TonerReplacement[]> {
  try {
    const q = query(
      collection(db, REPLACEMENTS_COLLECTION),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<TonerReplacement, "id">),
    }));
  } catch (error) {
    console.error("Error fetching all replacements:", error);
    return [];
  }
}

// DELETE REPLACEMENT RECORD
export async function deleteReplacement(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, REPLACEMENTS_COLLECTION, id));
    console.log("Replacement record deleted successfully");
  } catch (error) {
    console.error("Error deleting replacement record:", error);
    throw error;
  }
}

// Get replacement statistics
export async function getReplacementStats() {
  try {
    const replacements = await getAllReplacements();
    
    return {
      total: replacements.length,
      thisMonth: replacements.filter(r => {
        const date = new Date(r.createdAt);
        const now = new Date();
        return date.getMonth() === now.getMonth() && 
               date.getFullYear() === now.getFullYear();
      }).length,
      byPrinter: replacements.reduce((acc, r) => {
        acc[r.printerType] = (acc[r.printerType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  } catch (error) {
    console.error("Error getting replacement stats:", error);
    return { total: 0, thisMonth: 0, byPrinter: {} };
  }
}


// Add this to your tonerReplacementService.ts

// UPDATE REPLACEMENT RECORD
export async function updateReplacement(replacement: TonerReplacement): Promise<void> {
  try {
    const { id, ...data } = replacement;
    if (!id) throw new Error("Replacement ID is required");
    
    await updateDoc(doc(db, REPLACEMENTS_COLLECTION, id), data);
    console.log("Replacement record updated successfully");
  } catch (error) {
    console.error("Error updating replacement record:", error);
    throw error;
  }
}







