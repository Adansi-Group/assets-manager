


// src/types/gadget.ts

export type DeviceType = "Laptop" | "Smartphone" | "Accessory";
export type GadgetStatus = "In-Stock" | "In-Use" | "Faulty";
export type AccessoryType =
  | "Charger"
  | "Cable"
  | "Adapter"
  | "Case"
  | "Earphones"
  | "Headphones"
  | "Mouse"
  | "Keyboard"
  | "External Drive"
  | "Hub/Dongle"
  | "Other"
  | string;  // Allow custom types

export type Condition = "New" | "Good" | "Fair" | "Poor";

export type Gadget = {
  id: string;
  deviceType: DeviceType;
  model: string;
  serialNumber?: string;
  processor?: string;  // Only for Laptops
  storage?: string;
  year: number;
  status: GadgetStatus;
  assignedTo?: string;
  assignedDate?: string;
  gender?: "Male" | "Female" | string;
  notes?: string;
  createdAt?: any;
  purchaseDate?: string;  // Date when gadget was added to stock
  imageUrl?: string;      // Image of the gadget
  
  // Smartphone-specific fields
  imei1?: string;         // NEW - Primary IMEI (for Smartphones)
  imei2?: string;         // NEW - Secondary IMEI (for dual-SIM Smartphones)
  
  // Accessory-specific fields
  accessoryType?: AccessoryType;
  quantity?: number;
  condition?: Condition;
  compatibleWith?: string;
  specifications?: string;
  location?: string;
};