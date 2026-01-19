







export type GadgetStatus = "In-Stock" | "In-Use" | "Faulty";

export type Gadget = {
  id: number;
  deviceType: "Laptop" | "Smartphone";
  model: string;
  serialNumber: string;
  processor?: string;
  storage?: string;
  year: number;
  status: GadgetStatus;
  assignedTo?: string;
};


