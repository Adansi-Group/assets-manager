






// src/services/gadgetService.ts

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
    await addDoc(collection(db, COLLECTION), {
      ...gadget,
      createdAt: Timestamp.now(),
    });
    console.log("Gadget added successfully");
  } catch (error) {
    console.error("Error adding gadget:", error);
    throw error;
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