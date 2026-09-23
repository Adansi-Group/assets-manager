





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

/**
 * One cartridge, one colour, one quantity.
 *
 * No location, room or printer model: every cartridge lives in the Travel House
 * store, and which printers draw on it is derived from `Printer.tonerType`. A
 * field that exists but is not matched on is how the old bugs stayed invisible.
 */
export interface TonerStock {
  id: string;
  tonerType: string;
  colorType: string;
  quantity: number;
  initialQuantity?: number;
  dateBrought: string;
  lastCheckedDate?: string;
  costPerUnit?: number;
  /** Derived on read, never trusted from storage. */
  status?: "Good" | "Warning" | "Critical";
}
