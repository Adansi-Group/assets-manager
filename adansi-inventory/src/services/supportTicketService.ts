



// src/services/supportTicketService.ts

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp,
  deleteField,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import type { SupportTicket } from "../types/supportTicket";

const COLLECTION = "support_tickets";

// Generate ticket number
async function generateTicketNumber(): Promise<string> {
  const tickets = await getSupportTickets();
  const ticketCount = tickets.length + 1;
  return `TKT-${String(ticketCount).padStart(4, '0')}`;
}

// GET ALL TICKETS
export async function getSupportTickets(): Promise<SupportTicket[]> {
  try {
    const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<SupportTicket, "id">),
    }));
  } catch (error) {
    console.error("Error fetching support tickets:", error);
    return [];
  }
}

// ADD NEW TICKET
export async function addSupportTicket(ticket: Omit<SupportTicket, "id" | "ticketNumber">): Promise<void> {
  try {
    const ticketNumber = await generateTicketNumber();
    
    const cleanTicket: any = {
      ticketNumber,
      staffName: ticket.staffName.trim(),
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      subject: ticket.subject.trim(),
      description: ticket.description.trim(),
      dateReported: ticket.dateReported,
      createdAt: Timestamp.now(),
    };

    // Add optional fields
    if (ticket.department && ticket.department.trim()) {
      cleanTicket.department = ticket.department.trim();
    }
    if (ticket.contactNumber && ticket.contactNumber.trim()) {
      cleanTicket.contactNumber = ticket.contactNumber.trim();
    }
    if (ticket.location && ticket.location.trim()) {
      cleanTicket.location = ticket.location.trim();
    }
    if (ticket.deviceInfo && ticket.deviceInfo.trim()) {
      cleanTicket.deviceInfo = ticket.deviceInfo.trim();
    }
    if (ticket.notes && ticket.notes.trim()) {
      cleanTicket.notes = ticket.notes.trim();
    }

    await addDoc(collection(db, COLLECTION), cleanTicket);
    console.log("✅ Support ticket added successfully");
  } catch (error: any) {
    console.error("❌ Error adding support ticket:", error);
    throw new Error(`Failed to add support ticket: ${error.message}`);
  }
}

// UPDATE TICKET
export async function updateSupportTicket(ticket: SupportTicket): Promise<void> {
  try {
    const { id, createdAt, ticketNumber, ...payload } = ticket;
    
    const updatePayload: any = {};
    
    Object.keys(payload).forEach((key) => {
      const value = (payload as any)[key];
      
      if (value === undefined) {
        updatePayload[key] = deleteField();
      } else if (value !== null && value !== "") {
        updatePayload[key] = value;
      }
    });
    
    console.log("Updating support ticket:", id, updatePayload);
    
    await updateDoc(doc(db, COLLECTION, id), updatePayload);
    console.log("✅ Support ticket updated successfully");
  } catch (error: any) {
    console.error("❌ Error updating support ticket:", error);
    throw new Error(`Failed to update support ticket: ${error.message}`);
  }
}

// DELETE TICKET
export async function deleteSupportTicket(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
    console.log("Support ticket deleted successfully");
  } catch (error) {
    console.error("Error deleting support ticket:", error);
    throw error;
  }
}

// GET TICKETS BY STATUS
export async function getTicketsByStatus(status: string): Promise<SupportTicket[]> {
  const tickets = await getSupportTickets();
  return tickets.filter((t) => t.status === status);
}

// GET TICKETS BY CATEGORY
export async function getTicketsByCategory(category: string): Promise<SupportTicket[]> {
  const tickets = await getSupportTickets();
  return tickets.filter((t) => t.category === category);
}

// GET TICKETS BY PRIORITY
export async function getTicketsByPriority(priority: string): Promise<SupportTicket[]> {
  const tickets = await getSupportTickets();
  return tickets.filter((t) => t.priority === priority);
}