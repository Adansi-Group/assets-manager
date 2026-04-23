





// src/pages/Gadgets.tsx - WITH BEAUTIFUL DETAILS MODAL FOR ALL TYPES

import { useEffect, useState } from "react";
import { getGadgets, addGadget, updateGadget, deleteGadget } from "../services/gadgetsService";
import type { Gadget, GadgetStatus } from "../types/gadget";
import AddGadgetModal from "../components/AddGadgetModal";
import Pagination from "../components/Pagination";
import { Plus, Search, Trash2, Eye, MonitorSmartphone, Edit } from "lucide-react";
import Swal from "sweetalert2";
import ExportDropdown from "../components/ExportDropdown";

export default function Gadgets() {
  const [gadgets, setGadgets] = useState<Gadget[]>([]);
  const [filteredGadgets, setFilteredGadgets] = useState<Gadget[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<GadgetStatus | "All">("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editing, setEditing] = useState<Gadget | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    loadGadgets();
  }, []);

  useEffect(() => {
    filterGadgets();
  }, [gadgets, searchQuery, statusFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  async function loadGadgets() {
    setLoading(true);
    try {
      const data = await getGadgets();
      setGadgets(data);
    } catch (error) {
      console.error("Error loading gadgets:", error);
    } finally {
      setLoading(false);
    }
  }

  function filterGadgets() {
    let filtered = gadgets;

    // Filter by status
    if (statusFilter !== "All") {
      filtered = filtered.filter(g => g.status === statusFilter);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(g =>
        g.model.toLowerCase().includes(query) ||
        g.assignedTo?.toLowerCase().includes(query) ||
        g.serialNumber?.toLowerCase().includes(query) ||
        g.imei1?.toLowerCase().includes(query) ||
        g.imei2?.toLowerCase().includes(query) ||
        g.location?.toLowerCase().includes(query)
      );
    }

    setFilteredGadgets(filtered);
  }

  async function handleAddGadget(data: Omit<Gadget, "id"> | Gadget) {
    try {
      if ("id" in data) {
        // Editing existing gadget
        await updateGadget(data);
      } else {
        // Adding new gadget
        await addGadget(data);
      }
      
      await loadGadgets();
      setShowAddModal(false);
      setEditing(null);
      
      Swal.fire({
        icon: "success",
        title: "id" in data ? "Gadget Updated!" : "Gadget Added!",
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error("Error saving gadget:", error);
      Swal.fire({
        icon: "error",
        title: "Failed",
        text: "Could not save gadget"
      });
    }
  }

  async function handleDeleteGadget(id: string) {
    const result = await Swal.fire({
      title: "Delete Gadget?",
      text: "This action cannot be undone",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Yes, delete"
    });

    if (result.isConfirmed) {
      try {
        await deleteGadget(id);
        await loadGadgets();
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          timer: 1500,
          showConfirmButton: false
        });
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Failed",
          text: "Could not delete gadget"
        });
      }
    }
  }

  // Paginate filtered results
  const totalPages = Math.ceil(filteredGadgets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredGadgets.slice(startIndex, endIndex);

  // Prepare export data with conditional columns
  const getExportColumns = () => {
    const baseColumns = [
      { key: "deviceType", label: "Type" },
      { key: "model", label: "Model" },
      { key: "year", label: "Year" },
      { key: "status", label: "Status" },
      { key: "purchaseDate", label: "Purchase Date" }
    ];

    // Add conditional columns based on filter
    if (statusFilter === "In-Use") {
      baseColumns.push({ key: "assignedTo", label: "Assigned To" });
      baseColumns.push({ key: "gender", label: "Gender" });
      baseColumns.push({ key: "assignedDate", label: "Assigned Date" });
    } else if (statusFilter === "In-Stock") {
      baseColumns.push({ key: "location", label: "Location" });
    }

    baseColumns.push({ key: "notes", label: "Notes" });
    return baseColumns;
  };

  // Get stats
  const totalGadgets = gadgets.length;
  const inStock = gadgets.filter(g => g.status === "In-Stock").length;
  const inUse = gadgets.filter(g => g.status === "In-Use").length;
  const faulty = gadgets.filter(g => g.status === "Faulty").length;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading gadgets...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="p-6 space-y-6 bg-gray-100 dark:bg-gray-900">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Gadgets</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage all gadgets across the organization
          </p>
        </div>
        <div className="flex gap-3">
          <ExportDropdown
            data={filteredGadgets}
            filename={`Gadgets_${statusFilter}_${new Date().toISOString().split('T')[0]}`}
            columns={getExportColumns()}
          />
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            <Plus size={20} />
            Add Gadget
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <MonitorSmartphone className="text-blue-600 dark:text-blue-300" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalGadgets}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Gadgets</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <MonitorSmartphone className="text-green-600 dark:text-green-300" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{inStock}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">In Stock</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <MonitorSmartphone className="text-purple-600 dark:text-purple-300" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{inUse}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">In Use</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
              <MonitorSmartphone className="text-red-600 dark:text-red-300" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{faulty}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Faulty</p>
            </div>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by model, assigned to, serial number, IMEI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            {(["All", "In-Stock", "In-Use", "Faulty"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-gray-900 dark:text-white">Image</th>
                <th className="px-6 py-3 text-left text-gray-900 dark:text-white">Type</th>
                <th className="px-6 py-3 text-left text-gray-900 dark:text-white">Model</th>
                <th className="px-6 py-3 text-left text-gray-900 dark:text-white">Year</th>
                <th className="px-6 py-3 text-left text-gray-900 dark:text-white">Status</th>
                <th className="px-6 py-3 text-left text-gray-900 dark:text-white">Assigned To</th>
                <th className="px-6 py-3 text-left text-gray-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((gadget) => (
                <tr
                  key={gadget.id}
                  className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {/* IMAGE */}
                  <td className="px-6 py-4">
                    {gadget.imageUrl ? (
                      <img
                        src={gadget.imageUrl}
                        alt={gadget.model}
                        className="w-12 h-12 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <MonitorSmartphone size={20} className="text-gray-400" />
                      </div>
                    )}
                  </td>

                  {/* TYPE */}
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full text-xs font-medium">
                      {gadget.deviceType}
                    </span>
                  </td>

                  {/* MODEL */}
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900 dark:text-white">{gadget.model}</p>
                    {gadget.serialNumber && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">SN: {gadget.serialNumber}</p>
                    )}
                  </td>

                  {/* YEAR */}
                  <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{gadget.year}</td>

                  {/* STATUS */}
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      gadget.status === "In-Stock"
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : gadget.status === "In-Use"
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                        : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                    }`}>
                      {gadget.status}
                    </span>
                  </td>

                  {/* ASSIGNED TO - ALWAYS VISIBLE */}
                  <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                    {gadget.assignedTo || "—"}
                  </td>

                  {/* ACTIONS */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const isSmartphone = gadget.deviceType === "Smartphone";
                          const isLaptop = gadget.deviceType === "Laptop";
                          const isAccessory = gadget.deviceType === "Accessory";
                          
                          Swal.fire({
                            title: gadget.model,
                            html: `
                              <div class="text-left">
                                ${gadget.imageUrl ? `
                                  <div class="mb-6">
                                    <img src="${gadget.imageUrl}" alt="${gadget.model}" class="w-full rounded-xl shadow-lg" />
                                  </div>
                                ` : ""}
                                
                                <!-- Device Info Section -->
                                <div class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 mb-4">
                                  <h3 class="font-bold text-lg mb-3 text-gray-800 dark:text-gray-200">
                                    ${isSmartphone ? "📱" : isLaptop ? "💻" : "📦"} ${isAccessory ? "Accessory" : "Device"} Information
                                  </h3>
                                  <div class="grid grid-cols-2 gap-3">
                                    <div>
                                      <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">${isAccessory ? "Name" : "Model"}</p>
                                      <p class="font-semibold text-gray-900 dark:text-white">${gadget.model}</p>
                                    </div>
                                    ${isAccessory ? `
                                      <div>
                                        <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Type</p>
                                        <p class="font-semibold text-gray-900 dark:text-white">${gadget.accessoryType || "—"}</p>
                                      </div>
                                      <div>
                                        <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Quantity</p>
                                        <p class="font-semibold text-gray-900 dark:text-white text-2xl">${gadget.quantity || 0} <span class="text-sm">units</span></p>
                                      </div>
                                      <div>
                                        <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Condition</p>
                                        <p class="font-semibold text-gray-900 dark:text-white">${gadget.condition || "—"}</p>
                                      </div>
                                    ` : `
                                      <div>
                                        <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Year</p>
                                        <p class="font-semibold text-gray-900 dark:text-white">${gadget.year}</p>
                                      </div>
                                      ${isLaptop && gadget.processor ? `
                                        <div>
                                          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Processor</p>
                                          <p class="font-semibold text-gray-900 dark:text-white">${gadget.processor}</p>
                                        </div>
                                      ` : ""}
                                      ${gadget.storage ? `
                                        <div>
                                          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Storage</p>
                                          <p class="font-semibold text-gray-900 dark:text-white">${gadget.storage}</p>
                                        </div>
                                      ` : ""}
                                    `}
                                    <div class="${isAccessory ? '' : 'col-span-2'}">
                                      <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Status</p>
                                      <span class="px-3 py-1 rounded-full text-xs font-medium ${
                                        gadget.status === "In-Stock" ? "bg-green-100 text-green-700" :
                                        gadget.status === "In-Use" ? "bg-blue-100 text-blue-700" :
                                        "bg-red-100 text-red-700"
                                      }">${gadget.status}</span>
                                    </div>
                                  </div>
                                </div>

                                <!-- Technical Details (for Laptop/Smartphone) -->
                                ${!isAccessory ? `
                                  <div class="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 rounded-xl p-4 mb-4">
                                    <h3 class="font-bold text-lg mb-3 text-gray-800 dark:text-gray-200">🔧 Technical Details</h3>
                                    <div class="space-y-3">
                                      ${gadget.serialNumber ? `
                                        <div>
                                          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Serial Number</p>
                                          <p class="font-mono text-sm font-semibold text-gray-900 dark:text-white bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700">${gadget.serialNumber}</p>
                                        </div>
                                      ` : ""}
                                      ${isSmartphone && gadget.imei1 ? `
                                        <div>
                                          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">IMEI 1</p>
                                          <p class="font-mono text-sm font-semibold text-gray-900 dark:text-white bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700">${gadget.imei1}</p>
                                        </div>
                                      ` : ""}
                                      ${isSmartphone && gadget.imei2 ? `
                                        <div>
                                          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">IMEI 2</p>
                                          <p class="font-mono text-sm font-semibold text-gray-900 dark:text-white bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700">${gadget.imei2}</p>
                                        </div>
                                      ` : ""}
                                      ${gadget.purchaseDate ? `
                                        <div>
                                          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Purchase Date</p>
                                          <p class="font-semibold text-gray-900 dark:text-white">${new Date(gadget.purchaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                        </div>
                                      ` : ""}
                                    </div>
                                  </div>
                                ` : ""}

                                <!-- Specifications (for Accessories) -->
                                ${isAccessory ? `
                                  <div class="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 rounded-xl p-4 mb-4">
                                    <h3 class="font-bold text-lg mb-3 text-gray-800 dark:text-gray-200">🔧 Specifications</h3>
                                    <div class="space-y-3">
                                      ${gadget.specifications ? `
                                        <div>
                                          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Specifications</p>
                                          <p class="font-semibold text-gray-900 dark:text-white">${gadget.specifications}</p>
                                        </div>
                                      ` : ""}
                                      ${gadget.compatibleWith ? `
                                        <div>
                                          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Compatible With</p>
                                          <p class="font-semibold text-gray-900 dark:text-white">${gadget.compatibleWith}</p>
                                        </div>
                                      ` : ""}
                                      ${gadget.location ? `
                                        <div>
                                          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Storage Location</p>
                                          <p class="font-semibold text-gray-900 dark:text-white">${gadget.location}</p>
                                        </div>
                                      ` : ""}
                                    </div>
                                  </div>
                                ` : ""}

                                ${gadget.assignedTo ? `
                                  <!-- Assignment Section -->
                                  <div class="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 mb-4">
                                    <h3 class="font-bold text-lg mb-3 text-gray-800 dark:text-gray-200">👤 Assignment Details</h3>
                                    <div class="grid grid-cols-2 gap-3">
                                      <div>
                                        <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Assigned To</p>
                                        <p class="font-semibold text-gray-900 dark:text-white">${gadget.assignedTo}</p>
                                      </div>
                                      ${gadget.gender ? `
                                        <div>
                                          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Gender</p>
                                          <p class="font-semibold text-gray-900 dark:text-white">${gadget.gender}</p>
                                        </div>
                                      ` : ""}
                                      ${gadget.assignedDate ? `
                                        <div class="col-span-2">
                                          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Assigned Date</p>
                                          <p class="font-semibold text-gray-900 dark:text-white">${new Date(gadget.assignedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                        </div>
                                      ` : ""}
                                    </div>
                                  </div>
                                ` : ""}

                                ${gadget.notes ? `
                                  <!-- Notes Section -->
                                  <div class="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl p-4">
                                    <h3 class="font-bold text-lg mb-2 text-gray-800 dark:text-gray-200">📝 Notes</h3>
                                    <p class="text-gray-700 dark:text-gray-300 italic">${gadget.notes}</p>
                                  </div>
                                ` : ""}
                              </div>
                            `,
                            width: 700,
                            showConfirmButton: false,
                            showCloseButton: true,
                            customClass: {
                              popup: 'rounded-2xl',
                              title: 'text-2xl font-bold'
                            }
                          });
                        }}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        title="View details"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setEditing(gadget);
                          setShowAddModal(true);
                        }}
                        className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                        title="Edit"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteGadget(gadget.id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400 dark:text-gray-500">
                    No gadgets found. Click "Add Gadget" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {filteredGadgets.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredGadgets.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newItemsPerPage) => {
              setItemsPerPage(newItemsPerPage);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      {/* ADD/EDIT MODAL */}
      <AddGadgetModal
        isOpen={showAddModal}
        deviceType={editing?.deviceType || "Laptop"}
        existing={editing || undefined}
        onClose={() => {
          setShowAddModal(false);
          setEditing(null);
        }}
        onSubmit={handleAddGadget}
      />
    </div>
  );
}