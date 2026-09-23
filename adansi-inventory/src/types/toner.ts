





// src/types/toner.ts

export interface Toner {
  id: string;
  location: string;
  room?: string; // NEW: Optional room/office within location (e.g., "CEO's Office", "First Floor")
  printerType: string;
  tonerType: string;
  colorType: string;
  quantity: number;
  dateBrought: string;
  
  // Optional tracking fields
  initialQuantity?: number;
  lastCheckedDate?: string;
  status?: "Good" | "Warning" | "Critical";
  costPerUnit?: number; // Unit cost, used by budget analysis
  estimatedDaysRemaining?: number; // Projected days until depletion, used by reports
}

export interface TonerReplacement {
  id: string;
  tonerId: string;
  location: string;
  room?: string; // NEW: Room/office field
  printerType: string;
  colorType: string;
  dateChecked: string;
  dateReplaced: string;
  previousPercentage: number;
  currentPercentage: number;
  createdAt: string;
  inventoryTonerId?: string; // Stock record deducted for this replacement
}
