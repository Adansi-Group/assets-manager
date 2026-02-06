


// src/services/internetUsageService.ts

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
import type { InternetUsage } from "../types/InternetUsage";

const COLLECTION = "internet_usage";

// Calculate status based on dates
function calculateStatus(datePurchased: string, dateExhausted: string | null): "Active" | "Exhausted" | "Upcoming" {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
  
  const purchaseDate = new Date(datePurchased);
  purchaseDate.setHours(0, 0, 0, 0);
  
  // If purchase date is in the future, it's "Upcoming"
  if (purchaseDate > today) {
    return "Upcoming";
  }
  
  // If no exhausted date is set, it's still "Active"
  if (!dateExhausted) {
    return "Active";
  }
  
  const exhaustedDate = new Date(dateExhausted);
  exhaustedDate.setHours(0, 0, 0, 0);
  
  // If exhausted date has passed (or is today), it's "Exhausted"
  if (exhaustedDate <= today) {
    return "Exhausted";
  }
  
  // Otherwise it's still "Active"
  return "Active";
}

// GET ALL INTERNET USAGE RECORDS
export async function getInternetUsage(): Promise<InternetUsage[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      orderBy("datePurchased", "desc")
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        officeName: data.officeName,
        datePurchased: data.datePurchased,
        dateExhausted: data.dateExhausted || null,
        bundleSize: data.bundleSize || "",
        cost: data.cost || 0,
        provider: data.provider || "Starlink",
        status: calculateStatus(data.datePurchased, data.dateExhausted),
        notes: data.notes || "",
        createdAt: data.createdAt,
      };
    });
  } catch (error) {
    console.error("Error fetching internet usage:", error);
    return [];
  }
}

// ADD NEW RECORD
export async function addInternetUsage(
  usage: Omit<InternetUsage, "id" | "status" | "createdAt">
): Promise<void> {
  try {
    await addDoc(collection(db, COLLECTION), {
      ...usage,
      createdAt: new Date().toISOString(),
    });
    console.log("Internet usage added successfully");
  } catch (error) {
    console.error("Error adding internet usage:", error);
    throw error;
  }
}

// UPDATE EXISTING RECORD
export async function updateInternetUsage(usage: InternetUsage): Promise<void> {
  try {
    const { id, status, ...payload } = usage;
    await updateDoc(doc(db, COLLECTION, id), payload);
    console.log("Internet usage updated successfully");
  } catch (error) {
    console.error("Error updating internet usage:", error);
    throw error;
  }
}

// DELETE RECORD
export async function deleteInternetUsage(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
    console.log("Internet usage deleted successfully");
  } catch (error) {
    console.error("Error deleting internet usage:", error);
    throw error;
  }
}

// GET STATISTICS
export async function getInternetUsageStats() {
  try {
    const records = await getInternetUsage();
    
    const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);
    const active = records.filter(r => r.status === "Active").length;
    const exhausted = records.filter(r => r.status === "Exhausted").length;
    
    // Group by office
    const byOffice = records.reduce((acc, r) => {
      if (!acc[r.officeName]) {
        acc[r.officeName] = {
          count: 0,
          totalCost: 0,
          active: 0,
        };
      }
      acc[r.officeName].count++;
      acc[r.officeName].totalCost += r.cost || 0;
      if (r.status === "Active") acc[r.officeName].active++;
      return acc;
    }, {} as Record<string, { count: number; totalCost: number; active: number }>);
    
    return {
      total: records.length,
      active,
      exhausted,
      totalCost,
      byOffice,
    };
  } catch (error) {
    console.error("Error getting stats:", error);
    return {
      total: 0,
      active: 0,
      exhausted: 0,
      totalCost: 0,
      byOffice: {},
    };
  }
}