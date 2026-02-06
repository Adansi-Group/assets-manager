// src/types/toner.ts

export type Toner = {
  id: string;
  location: string;
  printerType: string;
  tonerType: string;
  colorType: string;
  quantity: number;
  dateBrought: string;
  
  // SMART TRACKING
  lastCheckedDate?: string;
  initialQuantity?: number;
  averageDailyUsage?: number;
  status?: "Good" | "Warning" | "Critical";
  estimatedDaysRemaining?: number;
};

export type TonerReplacement = {
  id?: string;
  tonerId: string;
  location: string;
  printerType: string;
  colorType: string;
  dateChecked: string;
  dateReplaced: string;
  previousPercentage: number;
  currentPercentage: number;
  createdAt: string;
};
