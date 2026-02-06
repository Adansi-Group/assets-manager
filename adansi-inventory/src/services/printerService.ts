
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

// ADD NEW PRINTER
export async function addPrinter(
  printer: Omit<Printer, "id">
): Promise<void> {
  try {
    await addDoc(collection(db, COLLECTION), printer);
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
    await updateDoc(doc(db, COLLECTION, id), payload);
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


