





// src/types/printer.ts

export type PrinterColor = "white" | "black" | "gray" | string;

export type TonerColor = "Black" | "Cyan" | "Magenta" | "Yellow";

export type TonerLevel = {
  color: TonerColor;
  currentPercentage: number;
  lastChecked: string;
  lastReplaced: string;
};

export interface Printer {
  id: string;
  location: string;
  room?: string; // Optional room/office within location
  model: string;
  printerColorType: PrinterColor;
  quantity: number;
  accessories: string[];
  status: "Active" | "In Repair" | "Retired";
  date: string;
  
  // Toner tracking (optional)
  tonerLevels?: TonerLevel[];
  hasTonerTracking?: boolean;
}



