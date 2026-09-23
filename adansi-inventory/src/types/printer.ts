





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
  /**
   * The cartridge this printer takes, e.g. "222A". Optional so existing
   * documents load; required by the Add/Edit Printer form from now on.
   * Replacement resolves stock by this plus a colour.
   */
  tonerType?: string;
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



