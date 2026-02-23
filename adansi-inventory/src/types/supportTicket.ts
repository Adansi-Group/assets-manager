




// src/types/supportTicket.ts

export type TicketCategory = 
  | "Printer Issue"
  | "Laptop Issue"
  | "Phone Issue"
  | "Network/Internet"
  | "Software"
  | "Hardware"
  | "Accessory"
  | "Other";

export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";

export type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed";

export type SupportTicket = {
  id: string;
  ticketNumber: string; // e.g., "TKT-001"
  staffName: string;
  department?: string;
  contactNumber?: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  description: string;
  location?: string;
  deviceInfo?: string; // e.g., "HP LaserJet in HR Office"
  dateReported: string;
  dateResolved?: string;
  resolvedBy?: string;
  resolution?: string;
  notes?: string;
  createdAt?: any;
};