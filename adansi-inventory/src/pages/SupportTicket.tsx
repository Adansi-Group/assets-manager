// src/pages/SupportTickets.tsx - COMPLETE SUPPORT TICKETS SYSTEM

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import type { SupportTicket, TicketStatus, TicketCategory, TicketPriority } from "../types/supportTicket";
import {
  getSupportTickets,
  addSupportTicket,
  updateSupportTicket,
  deleteSupportTicket,
} from "../services/supportTicketService";
import Swal from "sweetalert2";
import { Download, Search, AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";

export default function SupportTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "All">("All");
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | "All">("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState<SupportTicket | null>(null);

  async function loadTickets() {
    setLoading(true);
    const data = await getSupportTickets();
    setTickets(data);
    setLoading(false);
  }

  useEffect(() => {
    loadTickets();
  }, []);

  async function handleAddTicket(ticket: Omit<SupportTicket, "id" | "ticketNumber">) {
    try {
      await addSupportTicket(ticket);
      await loadTickets();
      setShowAddModal(false);
      
      Swal.fire({
        icon: "success",
        title: "Ticket Created!",
        text: "Support ticket has been created successfully.",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Failed to create ticket",
      });
    }
  }

  async function handleUpdateStatus(ticket: SupportTicket) {
    const { value: newStatus } = await Swal.fire({
      title: "Update Status",
      input: "select",
      inputOptions: {
        Open: "Open",
        "In Progress": "In Progress",
        Resolved: "Resolved",
        Closed: "Closed",
      },
      inputValue: ticket.status,
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
    });

    if (newStatus) {
      let resolution = ticket.resolution;
      let resolvedBy = ticket.resolvedBy;
      let dateResolved = ticket.dateResolved;

      if (newStatus === "Resolved" && !ticket.resolution) {
        const { value: resolutionText } = await Swal.fire({
          title: "Add Resolution",
          input: "textarea",
          inputPlaceholder: "Describe how the issue was resolved...",
          showCancelButton: true,
        });

        if (resolutionText) {
          resolution = resolutionText;
          resolvedBy = "IT Support"; // You can make this dynamic
          dateResolved = new Date().toISOString().split("T")[0];
        }
      }

      const updatedTicket: SupportTicket = {
        ...ticket,
        status: newStatus as TicketStatus,
        resolution,
        resolvedBy,
        dateResolved,
      };

      await updateSupportTicket(updatedTicket);
      await loadTickets();

      Swal.fire({
        icon: "success",
        title: "Status Updated",
        timer: 1500,
        showConfirmButton: false,
      });
    }
  }

  async function handleEditTicket(ticket: SupportTicket) {
    setEditingTicket(ticket);
    setShowAddModal(true);
  }

  async function handleDeleteTicket(id: string) {
    const result = await Swal.fire({
      title: "Delete Ticket?",
      text: "This action cannot be undone",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Yes, delete it",
    });

    if (result.isConfirmed) {
      await deleteSupportTicket(id);
      await loadTickets();

      Swal.fire({
        title: "Deleted!",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    }
  }

  function exportCSV() {
    const csv = [
      [
        "Ticket #",
        "Date Reported",
        "Staff Name",
        "Department",
        "Category",
        "Priority",
        "Status",
        "Subject",
        "Description",
        "Location",
        "Device",
        "Resolution",
        "Date Resolved",
      ],
      ...filtered.map((t) => [
        t.ticketNumber,
        t.dateReported,
        t.staffName,
        t.department || "",
        t.category,
        t.priority,
        t.status,
        t.subject,
        t.description,
        t.location || "",
        t.deviceInfo || "",
        t.resolution || "",
        t.dateResolved || "",
      ]),
    ]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `support-tickets_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  const filtered = tickets.filter((t) => {
    const matchesSearch = `${t.ticketNumber} ${t.staffName} ${t.subject} ${t.description} ${t.category}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || t.status === statusFilter;
    const matchesCategory = categoryFilter === "All" || t.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const totalTickets = tickets.length;
  const openTickets = tickets.filter((t) => t.status === "Open").length;
  const inProgress = tickets.filter((t) => t.status === "In Progress").length;
  const resolved = tickets.filter((t) => t.status === "Resolved").length;
  const closed = tickets.filter((t) => t.status === "Closed").length;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-100 dark:bg-gray-900">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Stat title="Total Tickets" value={totalTickets} icon={<AlertCircle size={20} />} />
        <Stat title="Open" value={openTickets} color="text-blue-600" icon={<AlertCircle size={20} />} />
        <Stat title="In Progress" value={inProgress} color="text-yellow-600" icon={<Clock size={20} />} />
        <Stat title="Resolved" value={resolved} color="text-green-600" icon={<CheckCircle size={20} />} />
        <Stat title="Closed" value={closed} color="text-gray-600" icon={<XCircle size={20} />} />
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TicketStatus | "All")}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="All">All Status</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as TicketCategory | "All")}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="All">All Categories</option>
            <option value="Printer Issue">Printer Issue</option>
            <option value="Laptop Issue">Laptop Issue</option>
            <option value="Phone Issue">Phone Issue</option>
            <option value="Network/Internet">Network/Internet</option>
            <option value="Software">Software</option>
            <option value="Hardware">Hardware</option>
            <option value="Accessory">Accessory</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="flex gap-3">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
          >
            <Download size={18} />
            Export CSV
          </button>

          <button
            onClick={() => {
              setEditingTicket(null);
              setShowAddModal(true);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Add Ticket
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              {["Ticket #", "Date", "Staff", "Category", "Priority", "Subject", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left whitespace-nowrap text-gray-900 dark:text-white">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3 font-mono font-bold text-green-600 dark:text-green-400">
                  {t.ticketNumber}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap text-xs">
                  {t.dateReported}
                </td>
                <td className="px-4 py-3 text-gray-900 dark:text-white">
                  <div className="font-medium">{t.staffName}</div>
                  {t.department && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">{t.department}</div>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <CategoryBadge category={t.category} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <PriorityBadge priority={t.priority} />
                </td>
                <td className="px-4 py-3 text-gray-900 dark:text-white max-w-xs">
                  <div className="font-medium">{t.subject}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {t.description}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <button onClick={() => handleUpdateStatus(t)}>
                    <StatusBadge status={t.status} />
                  </button>
                </td>
                <td className="px-4 py-3 space-x-3 whitespace-nowrap">
                  <button
                    onClick={() => handleEditTicket(t)}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleDeleteTicket(t.id)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-400 dark:text-gray-500">
                  {search || statusFilter !== "All" || categoryFilter !== "All"
                    ? "No tickets found"
                    : "No tickets yet. Create your first support ticket!"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <AddTicketModal
          ticket={editingTicket}
          onSave={handleAddTicket}
          onClose={() => {
            setShowAddModal(false);
            setEditingTicket(null);
          }}
        />
      )}
    </div>
  );
}

function Stat({ title, value, color = "", icon }: any) {
  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        {icon && <div className="text-gray-400 dark:text-gray-500">{icon}</div>}
      </div>
      <p className={`text-2xl font-bold ${color || "text-gray-900 dark:text-white"}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: TicketStatus }) {
  const colors = {
    Open: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    "In Progress": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    Resolved: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    Closed: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 ${colors[status]}`}>
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const colors = {
    Low: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    Medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    High: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    Urgent: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  const icons = {
    Low: "🟢",
    Medium: "🟡",
    High: "🟠",
    Urgent: "🔴",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${colors[priority]}`}>
      <span>{icons[priority]}</span>
      {priority}
    </span>
  );
}

function CategoryBadge({ category }: { category: TicketCategory }) {
  const colors: Record<string, string> = {
    "Printer Issue": "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    "Laptop Issue": "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    "Phone Issue": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
    "Network/Internet": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
    Software: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
    Hardware: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    Accessory: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
    Other: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[category]}`}>
      {category}
    </span>
  );
}

// AddTicketModal Component - Conversational Style
function AddTicketModal({ ticket, onSave, onClose }: any) {
  const [formData, setFormData] = useState({
    staffName: ticket?.staffName || "",
    department: ticket?.department || "",
    contactNumber: ticket?.contactNumber || "",
    category: ticket?.category || "Printer Issue",
    priority: ticket?.priority || "Medium",
    status: ticket?.status || "Open",
    subject: ticket?.subject || "",
    description: ticket?.description || "",
    location: ticket?.location || "",
    deviceInfo: ticket?.deviceInfo || "",
    dateReported: ticket?.dateReported || new Date().toISOString().split("T")[0],
    notes: ticket?.notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          
          {/* Header */}
          <div className="sticky top-0 bg-green-600 text-white p-6 rounded-t-2xl flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">
                {ticket ? "View Support Ticket" : "Report an Issue"}
              </h2>
              <p className="text-green-100 text-sm mt-1">
                Tell us what happened and we'll help you fix it
              </p>
            </div>
            <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
              <span className="text-2xl">×</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            
            {/* Who are you? */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                👤 Who are you?
              </h3>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.staffName}
                  onChange={(e) => setFormData({ ...formData, staffName: e.target.value })}
                  placeholder="e.g., John Doe"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Department (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g., HR, Finance"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Phone Number (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    placeholder="e.g., 024-123-4567"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700"></div>

            {/* What's the problem? */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                ❓ What's the problem?
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    What type of issue?
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="Printer Issue">🖨️ Printer Issue</option>
                    <option value="Laptop Issue">💻 Laptop Issue</option>
                    <option value="Phone Issue">📱 Phone Issue</option>
                    <option value="Network/Internet">📡 Network/Internet</option>
                    <option value="Software">💿 Software</option>
                    <option value="Hardware">🔧 Hardware</option>
                    <option value="Accessory">🔌 Accessory</option>
                    <option value="Other">❓ Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    How urgent is it?
                  </label>
                  <select
                    required
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="Low">🟢 Low - Can wait</option>
                    <option value="Medium">🟡 Medium - Soon</option>
                    <option value="High">🟠 High - Today</option>
                    <option value="Urgent">🔴 Urgent - Now!</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Quick summary of the issue
                </label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g., Printer won't print, Laptop screen is black"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Tell us what happened (be detailed)
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={5}
                  placeholder="Describe what happened, what you tried, any error messages you saw..."
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  💡 Tip: The more details you provide, the faster we can help!
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700"></div>

            {/* Where and what device? */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                📍 Where and what device?
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Where is it? (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., HR Office, 2nd Floor"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Which device? (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.deviceInfo}
                    onChange={(e) => setFormData({ ...formData, deviceInfo: e.target.value })}
                    placeholder="e.g., HP LaserJet, Dell Laptop"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Resolution (only show if viewing existing ticket) */}
            {ticket && (
              <>
                <div className="border-t border-gray-200 dark:border-gray-700"></div>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    ✅ Resolution (IT use only)
                  </h3>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    placeholder="Notes on how this was resolved..."
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-white dark:bg-gray-800 pb-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-semibold transition-colors shadow-lg"
              >
                {ticket ? "Update Ticket" : "Submit Issue"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}