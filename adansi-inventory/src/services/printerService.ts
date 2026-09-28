





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
import type { Printer } from "../types/printer";
import { cleanupUnusedOptions } from "./printerOptionsService";

const COLLECTION = "printers";

// GET ALL PRINTERS
export async function getPrinters(): Promise<Printer[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      orderBy("date", "desc")
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Printer, "id">),
    }));
  } catch (error) {
    console.error("Error fetching printers:", error);
    return [];
  }
}

/**
 * Same read as `getPrinters`, but rethrows instead of swallowing into `[]`.
 *
 * `getPrinters` hides a failed read as "no printers", which a caller that
 * derives a printer count from the result (how many printers a cartridge
 * feeds) cannot tell apart from a genuinely empty estate — it would print
 * "used by 0 printers" instead of surfacing an error. Callers that need to
 * tell the two apart use this instead; `getPrinters` itself is left as is
 * because other callers depend on its swallow-to-[] behaviour.
 */
export async function getPrintersStrict(): Promise<Printer[]> {
  const q = query(
    collection(db, COLLECTION),
    orderBy("date", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Printer, "id">),
  }));
}

// ADD NEW PRINTER
export async function addPrinter(
  printer: Omit<Printer, "id">
): Promise<void> {
  try {
    // Remove undefined fields before saving to Firebase
    const cleanPrinter = Object.fromEntries(
      Object.entries(printer).filter(([_, value]) => value !== undefined)
    );
    
    await addDoc(collection(db, COLLECTION), cleanPrinter);
    console.log("Printer added successfully");
  } catch (error) {
    console.error("Error adding printer:", error);
    throw error;
  }
}

// UPDATE EXISTING PRINTER
export async function updatePrinter(printer: Printer): Promise<void> {
  try {
    const { id, ...payload } = printer;
    
    // Remove undefined fields before updating Firebase
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([_, value]) => value !== undefined)
    );
    
    await updateDoc(doc(db, COLLECTION, id), cleanPayload);
    console.log("Printer updated successfully");
  } catch (error) {
    console.error("Error updating printer:", error);
    throw error;
  }
}

// DELETE PRINTER
export async function deletePrinter(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
    console.log("Printer deleted successfully");
    
    // Clean up any unused custom options after deletion
    await cleanupUnusedOptions();
  } catch (error) {
    console.error("Error deleting printer:", error);
    throw error;
  }
}
