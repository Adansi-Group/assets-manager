


// src/types/gadget.ts

import type { Timestamp } from "firebase/firestore";

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
export type LockerReason = "Staff Left" | "Device Issue" | "Replaced" | "Outdated" | "Damaged";
export type LockerCondition = "Good" | "Repairable" | "Damaged" | "Outdated";
export type LockerAction =
  | "Available for Reassignment"
  | "Waiting for Repair"
  | "Keep in Locker"
  | "Reassigned"
  | "Sell"
  | "Sold"
  | "Dispose"
  | "Disposed";

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
  createdAt?: Timestamp;
  purchaseDate?: string;  // Date when gadget was added to stock
  imageUrl?: string;      // Image of the gadget
  
  // Smartphone-specific fields
  imei1?: string;         // NEW - Primary IMEI (for Smartphones)
  imei2?: string;         // NEW - Secondary IMEI (for dual-SIM Smartphones)
  
  // Former-staff returned-device fields
  returnedFrom?: string;        // Name of departed staff who left this device
  formerDepartment?: string;    // Their department
  staffLeftDate?: string;       // Date the staff member left

  // Locker / returned / retired device fields
  lockerDevice?: boolean;       // Keeps the record outside active gadget totals
  lockerReason?: LockerReason;
  lockerCondition?: LockerCondition;
  lockerAction?: LockerAction;
  lockerDate?: string;
  lockerLocation?: string;
  outcomeDate?: string;
  reassignedTo?: string;

  // Accessory-specific fields
  accessoryType?: AccessoryType;
  quantity?: number;
  condition?: Condition;
  compatibleWith?: string;
  specifications?: string;
  location?: string;
};
