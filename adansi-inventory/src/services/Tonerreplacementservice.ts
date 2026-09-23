






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
import type { Toner, TonerReplacement } from "../types/toner";
import type { Printer, TonerLevel, TonerColor } from "../types/printer";
import { normalize, printerIdentity, tonerIdentity } from "../toners/stockMatching";

const REPLACEMENTS_COLLECTION = "toner_replacements";
const TONERS_COLLECTION = "toners";
const PRINTERS_COLLECTION = "printers";

export class TonerStockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TonerStockError";
  }
}

function stockStatus(quantity: number, initialQuantity?: number): "Good" | "Warning" | "Critical" {
  if (!initialQuantity || initialQuantity <= 0) return quantity === 0 ? "Critical" : "Good";
  const percentage = (quantity / initialQuantity) * 100;
  if (percentage <= 20) return "Critical";
  if (percentage <= 50) return "Warning";
  return "Good";
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
  const stockColor = normalize(printer.model).includes("pixma") && normalize(color) !== "black"
    ? "Color"
    : color;
  const tonerSnapshot = await getDocs(collection(db, TONERS_COLLECTION));
  // Same comparison the Toners page reports as linked, so a row that looks
  // healthy there is a row a replacement can actually find.
  const wantedPrinter = printerIdentity(printer);
  const matches = tonerSnapshot.docs.filter((tonerDoc) => {
    const toner = tonerDoc.data() as Toner;
    return tonerIdentity(toner) === wantedPrinter
      && normalize(toner.colorType) === normalize(stockColor);
  });

  if (matches.length === 0) {
    throw new TonerStockError(
      `No ${stockColor} toner stock was found for ${printer.model} at ${printer.location}${printer.room ? ` (${printer.room})` : ""}. Add the stock on the Toners page first.`
    );
  }
  if (matches.length > 1) {
    throw new TonerStockError(
      `More than one ${stockColor} stock record matches this printer. Please combine or remove the duplicate records on the Toners page first.`
    );
  }

  const stockRef = matches[0].ref;
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

    const newQuantity = currentQuantity - 1;
    transaction.update(stockRef, {
      quantity: newQuantity,
      status: stockStatus(newQuantity, Number(stock.initialQuantity) || undefined),
      lastCheckedDate: replacement.dateReplaced,
    });

    const currentPrinter = printerSnapshot.data() as Omit<Printer, "id">;
    const updatedTonerLevels = [...(currentPrinter.tonerLevels ?? [])];
    const existingIndex = updatedTonerLevels.findIndex((level) => normalize(level.color) === normalize(color));
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




