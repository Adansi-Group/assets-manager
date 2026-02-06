



// src/services/a4SheetService.ts

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import type { A4Sheet } from "../types/A4Sheet";

const COLLECTION = "a4_sheets";

// Calculate stock status based on current quantity and minimum level
function calculateStatus(
  currentQuantity: number,
  minimumStockLevel: number
): "In Stock" | "Low Stock" | "Out of Stock" {
  if (currentQuantity === 0) {
    return "Out of Stock";
  }
  if (currentQuantity <= minimumStockLevel) {
    return "Low Stock";
  }
  return "In Stock";
}

// Calculate average monthly usage and estimated days remaining
function calculateUsageMetrics(sheet: Omit<A4Sheet, "id">) {
  const result = { ...sheet };

  if (sheet.dateAdded && sheet.initialQuantity > 0) {
    const daysSinceAdded = Math.floor(
      (new Date().getTime() - new Date(sheet.dateAdded).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (daysSinceAdded > 0) {
      const used = sheet.initialQuantity - sheet.currentQuantity;

      if (used > 0) {
        // Calculate average daily usage
        const dailyUsage = used / daysSinceAdded;

        // Convert to monthly usage
        result.averageMonthlyUsage = Math.round(dailyUsage * 30);

        // Estimate days remaining
        if (dailyUsage > 0) {
          result.estimatedDaysRemaining = Math.floor(
            sheet.currentQuantity / dailyUsage
          );
        }
      }
    }
  }

  return result;
}

// GET ALL A4 SHEETS
export async function getA4Sheets(): Promise<A4Sheet[]> {
  try {
    const q = query(collection(db, COLLECTION), orderBy("dateAdded", "desc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => {
      const data = d.data();
      const withMetrics = calculateUsageMetrics(data as Omit<A4Sheet, "id">);
      
      return {
        id: d.id,
        ...withMetrics,
        status: calculateStatus(data.currentQuantity, data.minimumStockLevel),
      } as A4Sheet;
    });
  } catch (error) {
    console.error("Error fetching A4 sheets:", error);
    return [];
  }
}

// ADD NEW A4 SHEET RECORD
export async function addA4Sheet(
  sheet: Omit<A4Sheet, "id" | "status" | "createdAt" | "averageMonthlyUsage" | "estimatedDaysRemaining">
): Promise<void> {
  try {
    await addDoc(collection(db, COLLECTION), {
      ...sheet,
      createdAt: new Date().toISOString(),
    });
    console.log("A4 sheet record added successfully");
  } catch (error) {
    console.error("Error adding A4 sheet:", error);
    throw error;
  }
}

// UPDATE A4 SHEET RECORD
export async function updateA4Sheet(sheet: A4Sheet): Promise<void> {
  try {
    const { id, status, averageMonthlyUsage, estimatedDaysRemaining, ...payload } = sheet;
    
    // Update lastRestocked if quantity increased
    const currentSheet = await getA4SheetById(id);
    if (currentSheet && sheet.currentQuantity > currentSheet.currentQuantity) {
      payload.lastRestocked = new Date().toISOString().split("T")[0];
    }
    
    await updateDoc(doc(db, COLLECTION, id), payload);
    console.log("A4 sheet record updated successfully");
  } catch (error) {
    console.error("Error updating A4 sheet:", error);
    throw error;
  }
}

// GET SINGLE A4 SHEET BY ID
async function getA4SheetById(id: string): Promise<A4Sheet | null> {
  try {
    const sheets = await getA4Sheets();
    return sheets.find(s => s.id === id) || null;
  } catch (error) {
    console.error("Error fetching A4 sheet by ID:", error);
    return null;
  }
}

// DELETE A4 SHEET RECORD
export async function deleteA4Sheet(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
    console.log("A4 sheet record deleted successfully");
  } catch (error) {
    console.error("Error deleting A4 sheet:", error);
    throw error;
  }
}

// GET STATISTICS
export async function getA4SheetStats() {
  try {
    const sheets = await getA4Sheets();

    const totalReams = sheets.reduce((sum, s) => sum + s.currentQuantity, 0);
    const totalValue = sheets.reduce(
      (sum, s) => sum + s.currentQuantity * s.costPerReam,
      0
    );
    const inStock = sheets.filter((s) => s.status === "In Stock").length;
    const lowStock = sheets.filter((s) => s.status === "Low Stock").length;
    const outOfStock = sheets.filter((s) => s.status === "Out of Stock").length;

    // Group by office
    const byOffice = sheets.reduce((acc, s) => {
      if (!acc[s.officeName]) {
        acc[s.officeName] = {
          quantity: 0,
          value: 0,
          status: s.status,
        };
      }
      acc[s.officeName].quantity += s.currentQuantity;
      acc[s.officeName].value += s.currentQuantity * s.costPerReam;
      return acc;
    }, {} as Record<string, { quantity: number; value: number; status: string }>);

    return {
      totalRecords: sheets.length,
      totalReams,
      totalValue,
      inStock,
      lowStock,
      outOfStock,
      byOffice,
    };
  } catch (error) {
    console.error("Error getting A4 sheet stats:", error);
    return {
      totalRecords: 0,
      totalReams: 0,
      totalValue: 0,
      inStock: 0,
      lowStock: 0,
      outOfStock: 0,
      byOffice: {},
    };
  }
}

// GET LOW STOCK ALERTS
export async function getLowStockAlerts(): Promise<A4Sheet[]> {
  const sheets = await getA4Sheets();
  return sheets.filter(
    (s) => s.status === "Low Stock" || s.status === "Out of Stock"
  );
}