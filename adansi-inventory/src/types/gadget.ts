





// src/types/gadget.ts

export type DeviceType = "Laptop" | "Smartphone" | "Accessory";
export type GadgetStatus = "In-Stock" | "In-Use" | "Faulty";
export type AccessoryType =
  | "Charger"
  | "Cable"
  | "Adapter"
  | "Case"
  | "Earphones"
  | "Mouse"
  | "Keyboard"
  | "External Drive"
  | "Hub/Dongle"
  | "Other";
export type Condition = "New" | "Good" | "Fair" | "Poor";

export type Gadget = {
  id: string;
  deviceType: DeviceType;
  model: string;
  serialNumber?: string;
  processor?: string;
  storage?: string;
  year: number;
  status: GadgetStatus;
  assignedTo?: string;
  assignedDate?: string;
  gender?: "Male" | "Female" | string; // NEW FIELD
  notes?: string;
  createdAt?: any;
  
  // Accessory-specific fields
  accessoryType?: AccessoryType;
  quantity?: number;
  condition?: Condition;
  compatibleWith?: string;
  specifications?: string;
  purchaseDate?: string;
  location?: string;
};