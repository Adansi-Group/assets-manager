





// src/services/tonerService.ts

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import type { Toner } from "../types/toner";

const COLLECTION = "toners";

// Calculate smart metrics
function calculateMetrics(toner: Omit<Toner, "id">): Omit<Toner, "id"> {
  const result = { ...toner };

  // Only calculate if smart tracking is enabled (has initialQuantity)
  if (toner.initialQuantity && toner.dateBrought) {
    const daysSinceBought = Math.floor(
      (new Date().getTime() - new Date(toner.dateBrought).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (daysSinceBought > 0) {
      const used = toner.initialQuantity - toner.quantity;
      
      if (used > 0) {
        // Calculate usage rate and days remaining
        result.averageDailyUsage = used / daysSinceBought;

        if (result.averageDailyUsage > 0) {
          result.estimatedDaysRemaining = Math.floor(
            toner.quantity / result.averageDailyUsage
          );

          // Set status based on remaining days
          if (result.estimatedDaysRemaining <= 2) {
            result.status = "Critical";
          } else if (result.estimatedDaysRemaining <= 7) {
            result.status = "Warning";
          } else {
            result.status = "Good";
          }
        }
      } else {
        // No usage yet - set to Good status with undefined days
        result.status = "Good";
        // Don't set estimatedDaysRemaining at all
      }
    } else {
      // Just added today - set to Good status
      result.status = "Good";
      // Don't set estimatedDaysRemaining at all
    }
  }

  return result;
}

// GET ALL TONERS
export async function getToners(): Promise<Toner[]> {
  try {
    const q = query(collection(db, COLLECTION), orderBy("dateBrought", "desc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Toner, "id">),
    }));
  } catch (error) {
    console.error("Error fetching toners:", error);
    return [];
  }
}

// ADD NEW TONER
export async function addToner(toner: Omit<Toner, "id">): Promise<void> {
  try {
    const tonerWithMetrics = calculateMetrics(toner);
    await addDoc(collection(db, COLLECTION), tonerWithMetrics);
    console.log("Toner added successfully");
  } catch (error) {
    console.error("Error adding toner:", error);
    throw error;
  }
}

// UPDATE EXISTING TONER
export async function updateToner(toner: Toner): Promise<void> {
  try {
    const { id, ...payload } = toner;
    const tonerWithMetrics = calculateMetrics(payload);
    await updateDoc(doc(db, COLLECTION, id), tonerWithMetrics);
    console.log("Toner updated successfully");
  } catch (error) {
    console.error("Error updating toner:", error);
    throw error;
  }
}

// DELETE TONER
export async function deleteToner(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
    console.log("Toner deleted successfully");
  } catch (error) {
    console.error("Error deleting toner:", error);
    throw error;
  }
}

// GET LOW STOCK TONERS
export async function getLowStockToners(): Promise<Toner[]> {
  const toners = await getToners();
  return toners.filter(
    (t) => t.status === "Critical" || t.status === "Warning"
  );
}






