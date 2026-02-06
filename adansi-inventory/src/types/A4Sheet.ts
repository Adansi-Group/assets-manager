



// src/types/A4Sheet.ts

export interface A4Sheet {
  id: string;
  officeName: string;
  currentQuantity: number; // Current number of reams
  initialQuantity: number; // Starting quantity when added
  minimumStockLevel: number; // Alert threshold
  dateAdded: string;
  lastRestocked?: string | null;
  costPerReam: number;
  supplier: string;
  brand: string;
  status: "In Stock" | "Low Stock" | "Out of Stock";
  averageMonthlyUsage?: number; // Calculated usage rate
  estimatedDaysRemaining?: number; // Based on usage pattern
  notes?: string;
  createdAt: string;
}