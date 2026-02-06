

// src/types/gadget.ts

export type GadgetStatus = "In-Stock" | "In-Use" | "Faulty";

export type Gadget = {
  id: string; // Changed to string for Firebase
  deviceType: "Laptop" | "Smartphone";
  model: string;
  serialNumber: string;
  processor?: string;
  storage?: string;
  year: number;
  status: GadgetStatus;
  assignedTo?: string;
  assignedDate?: string;
  notes?: string;
  createdAt?: Date;
};



