






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
  runTransaction,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import type { TonerReplacement } from "../types/toner";
import type { Printer, TonerLevel, TonerColor } from "../types/printer";
import { normalizeType, findPool } from "../toners/pools";
import { TONER_STOCK_COLLECTION } from "./tonerStockService";

export const REPLACEMENTS_COLLECTION = "toner_replacements";
const PRINTERS_COLLECTION = "printers";

export class TonerStockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TonerStockError";
  }
}

type ReplacementInput = {
  dateChecked: string;
  dateReplaced: string;
  previousPercentage: number;
  currentPercentage: number;
};

/**
 * Deduct stock, write replacement history, and update the printer atomically.
 * None of the three changes is saved if matching stock is unavailable.
 */
export async function replacePrinterToner(
  printer: Printer,
  color: string,
  replacement: ReplacementInput
): Promise<void> {
  // PIXMA printers use one combined colour cartridge. The printer-level UI
  // historically represents it as Yellow, while inventory stores it as Color.
  const stockColor = normalizeType(printer.model).includes("pixma") && normalizeType(color) !== "black"
    ? "Color"
    : color;

  if (!printer.tonerType) {
    throw new TonerStockError("Set the toner type on this printer before replacing a cartridge.");
  }

  const stockSnapshot = await getDocs(collection(db, TONER_STOCK_COLLECTION));
  const pools = stockSnapshot.docs.map((d) => ({
    id: d.id,
    ref: d.ref,
    ...(d.data() as { tonerType: string; colorType: string; quantity: number }),
  }));

  const pool = findPool(pools, printer.tonerType, stockColor);
  if (!pool) {
    throw new TonerStockError(
      `No ${printer.tonerType} ${stockColor} in stock. Add it on the Toners page.`
    );
  }

  const stockRef = pool.ref;
  const printerRef = doc(db, PRINTERS_COLLECTION, printer.id);
  const replacementRef = doc(collection(db, REPLACEMENTS_COLLECTION));

  await runTransaction(db, async (transaction) => {
    const stockSnapshot = await transaction.get(stockRef);
    const printerSnapshot = await transaction.get(printerRef);
    if (!stockSnapshot.exists()) throw new TonerStockError("The matching toner stock no longer exists.");
    if (!printerSnapshot.exists()) throw new Error("The printer no longer exists.");

    const stock = stockSnapshot.data();
    const currentQuantity = Number(stock.quantity) || 0;
    if (currentQuantity < 1) {
      throw new TonerStockError(`${stockColor} toner stock for ${printer.model} is empty. Add stock before recording a replacement.`);
    }

    // No status is written: it is derived from the quantity on read.
    transaction.update(stockRef, {
      quantity: currentQuantity - 1,
      lastCheckedDate: replacement.dateReplaced,
    });

    const currentPrinter = printerSnapshot.data() as Omit<Printer, "id">;
    const updatedTonerLevels = [...(currentPrinter.tonerLevels ?? [])];
    const existingIndex = updatedTonerLevels.findIndex((level) => normalizeType(level.color) === normalizeType(color));
    const newLevel: TonerLevel = {
      color: color as TonerColor,
      currentPercentage: replacement.currentPercentage,
      lastChecked: replacement.dateChecked,
      lastReplaced: replacement.dateReplaced,
    };
    if (existingIndex >= 0) updatedTonerLevels[existingIndex] = newLevel;
    else updatedTonerLevels.push(newLevel);

    transaction.update(printerRef, {
      tonerLevels: updatedTonerLevels,
      hasTonerTracking: true,
    });
    transaction.set(replacementRef, {
      tonerId: printer.id,
      inventoryTonerId: stockRef.id,
      location: printer.location,
      ...(printer.room ? { room: printer.room } : {}),
      printerType: printer.model,
      colorType: stockColor,
      tonerType: printer.tonerType,
      ...replacement,
      createdAt: new Date().toISOString(),
    });
  });
}

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

/**
 * Every replacement record, newest first. Throws on failure — an empty list
 * would let a report say "no toner replacements were recorded", which is a
 * claim, not an absence of data. Reports use this; getAllReplacements stays
 * for screens that already cope with an empty list.
 */
export async function getAllReplacementsStrict(): Promise<TonerReplacement[]> {
  const q = query(
    collection(db, REPLACEMENTS_COLLECTION),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<TonerReplacement, "id">),
  }));
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




