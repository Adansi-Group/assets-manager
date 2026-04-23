
// src/pages/gadgets/Smartphones.tsx - WITH BEAUTIFUL DETAILS MODAL

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AddGadgetModal from "../../components/AddGadgetModal";
import ExportDropdown from "../../components/ExportDropdown";
import Pagination from "../../components/Pagination";
import type { Gadget, GadgetStatus } from "../../types/gadget";
import {
  getGadgetsByType,
  addGadget,
  updateGadget,
  deleteGadget,
} from "../../services/gadgetsService";
import Swal from "sweetalert2";
import { Smartphone as PhoneIcon, Search, Edit, Trash2, Eye } from "lucide-react";

export default function Smartphones() {
  const [phones, setPhones] = useState<Gadget[]>([]);
  const [editing, setEditing] = useState<Gadget | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<GadgetStatus | "All">("All");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const location = useLocation();
  const navigate = useNavigate();

  const isAddOpen = location.pathname === "/gadgets/phones/add";

  async function loadPhones() {
    setLoading(true);
    const data = await getGadgetsByType("Smartphone");
    setPhones(data);
    setLoading(false);
  }

  useEffect(() => {
    loadPhones();
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  async function handleSave(gadget: Gadget | Omit<Gadget, "id">) {
    try {
      if ("id" in gadget) {
        await updateGadget(gadget);
      } else {
        await addGadget(gadget);
      }

      await loadPhones();
      setEditing(null);
      navigate("/gadgets/phones");

      Swal.fire({
        icon: "success",
        title: "id" in gadget ? "Phone Updated" : "Phone Added",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to save phone",
      });
    }
  }

  async function handleRemove(id: string) {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This phone will be permanently deleted",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#dc2626",
      confirmButtonText: "Yes, delete it",
    });

    if (result.isConfirmed) {
      await deleteGadget(id);
      await loadPhones();

      Swal.fire({
        title: "Deleted!",
        text: "Phone has been deleted.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    }
  }

  const filtered = phones.filter((p) => {
    const matchesSearch = `${p.model} ${p.serialNumber} ${p.imei1 || ""} ${p.imei2 || ""} ${p.assignedTo || ""}`
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesStatus = statusFilter === "All" || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Paginate filtered results
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filtered.slice(startIndex, endIndex);

  // Export columns based on status filter
  const getExportColumns = () => {
    const baseColumns = [
      { key: "model", label: "Model" },
      { key: "serialNumber", label: "Serial Number" },
      { key: "imei1", label: "IMEI 1" },
      { key: "imei2", label: "IMEI 2" },
      { key: "storage", label: "Storage" },
      { key: "year", label: "Year" },
      { key: "status", label: "Status" },
      { key: "purchaseDate", label: "Purchase Date" }
    ];

    if (statusFilter === "In-Use") {
      baseColumns.push({ key: "assignedTo", label: "Assigned To" });
      baseColumns.push({ key: "gender", label: "Gender" });
      baseColumns.push({ key: "assignedDate", label: "Assigned Date" });
    }

    baseColumns.push({ key: "notes", label: "Notes" });
    return baseColumns;
  };

  const inStock = phones.filter((p) => p.status === "In-Stock").length;
  const inUse = phones.filter((p) => p.status === "In-Use").length;
  const faulty = phones.filter((p) => p.status === "Faulty").length;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading smartphones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-100 dark:bg-gray-900">
      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat title="Total Phones" value={phones.length} icon={<PhoneIcon size={20} />} />
        <Stat title="In Stock" value={inStock} color="text-green-600" />
        <Stat title="In Use" value={inUse} color="text-blue-600" />
        <Stat title="Faulty" value={faulty} color="text-red-600" />
      </div>

      {/* FILTERS & ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              placeholder="Search smartphones..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex gap-2">
            {(["All", "In-Stock", "In-Use", "Faulty"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
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

        <div className="flex gap-3">
          <ExportDropdown
            data={filtered}
            filename={`Smartphones_${statusFilter}_${new Date().toISOString().split('T')[0]}`}
            columns={getExportColumns()}
          />

          <button
            onClick={() => navigate("/gadgets/phones/add")}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Add Smartphone
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-gray-900 dark:text-white">Image</th>
                <th className="px-6 py-3 text-left text-gray-900 dark:text-white">Product Name</th>
                <th className="px-6 py-3 text-left text-gray-900 dark:text-white">Serial Number</th>
                <th className="px-6 py-3 text-left text-gray-900 dark:text-white">Storage</th>
                <th className="px-6 py-3 text-left text-gray-900 dark:text-white">Year</th>
                <th className="px-6 py-3 text-left text-gray-900 dark:text-white">Status</th>
                <th className="px-6 py-3 text-left text-gray-900 dark:text-white">Assigned To</th>
                <th className="px-6 py-3 text-left text-gray-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((p) => (
                <tr key={p.id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  {/* IMAGE */}
                  <td className="px-6 py-4">
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.model}
                        className="w-12 h-12 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <PhoneIcon size={20} className="text-gray-400" />
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{p.model}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300 font-mono text-xs">{p.serialNumber || "—"}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{p.storage || "—"}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{p.year}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={p.status} />
                  </td>

                  {/* ASSIGNED TO - ALWAYS VISIBLE */}
                  <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                    {p.assignedTo || "—"}
                  </td>

                  {/* ACTIONS */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          Swal.fire({
                            title: p.model,
                            html: `
                              <div class="text-left">
                                ${p.imageUrl ? `
                                  <div class="mb-6">
                                    <img src="${p.imageUrl}" alt="${p.model}" class="w-full rounded-xl shadow-lg" />
                                  </div>
                                ` : ""}
                                
                                <!-- Device Info Section -->
                                <div class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 mb-4">
                                  <h3 class="font-bold text-lg mb-3 text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                    📱 Device Information
                                  </h3>
                                  <div class="grid grid-cols-2 gap-3">
                                    <div>
                                      <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Model</p>
                                      <p class="font-semibold text-gray-900 dark:text-white">${p.model}</p>
                                    </div>
                                    <div>
                                      <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Year</p>
                                      <p class="font-semibold text-gray-900 dark:text-white">${p.year}</p>
                                    </div>
                                    <div>
                                      <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Storage</p>
                                      <p class="font-semibold text-gray-900 dark:text-white">${p.storage || "—"}</p>
                                    </div>
                                    <div>
                                      <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Status</p>
                                      <span class="px-3 py-1 rounded-full text-xs font-medium ${
                                        p.status === "In-Stock" ? "bg-green-100 text-green-700" :
                                        p.status === "In-Use" ? "bg-blue-100 text-blue-700" :
                                        "bg-red-100 text-red-700"
                                      }">${p.status}</span>
                                    </div>
                                  </div>
                                </div>

                                <!-- Technical Details Section -->
                                <div class="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 rounded-xl p-4 mb-4">
                                  <h3 class="font-bold text-lg mb-3 text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                    🔧 Technical Details
                                  </h3>
                                  <div class="space-y-3">
                                    <div>
                                      <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Serial Number</p>
                                      <p class="font-mono text-sm font-semibold text-gray-900 dark:text-white bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700">${p.serialNumber || "—"}</p>
                                    </div>
                                    ${p.imei1 ? `
                                      <div>
                                        <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">IMEI 1</p>
                                        <p class="font-mono text-sm font-semibold text-gray-900 dark:text-white bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700">${p.imei1}</p>
                                      </div>
                                    ` : ""}
                                    ${p.imei2 ? `
                                      <div>
                                        <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">IMEI 2</p>
                                        <p class="font-mono text-sm font-semibold text-gray-900 dark:text-white bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700">${p.imei2}</p>
                                      </div>
                                    ` : ""}
                                    ${p.purchaseDate ? `
                                      <div>
                                        <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Purchase Date</p>
                                        <p class="font-semibold text-gray-900 dark:text-white">${new Date(p.purchaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                      </div>
                                    ` : ""}
                                  </div>
                                </div>

                                ${p.assignedTo ? `
                                  <!-- Assignment Section -->
                                  <div class="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 mb-4">
                                    <h3 class="font-bold text-lg mb-3 text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                      👤 Assignment Details
                                    </h3>
                                    <div class="grid grid-cols-2 gap-3">
                                      <div>
                                        <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Assigned To</p>
                                        <p class="font-semibold text-gray-900 dark:text-white">${p.assignedTo}</p>
                                      </div>
                                      ${p.gender ? `
                                        <div>
                                          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Gender</p>
                                          <p class="font-semibold text-gray-900 dark:text-white">${p.gender}</p>
                                        </div>
                                      ` : ""}
                                      ${p.assignedDate ? `
                                        <div class="col-span-2">
                                          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Assigned Date</p>
                                          <p class="font-semibold text-gray-900 dark:text-white">${new Date(p.assignedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                        </div>
                                      ` : ""}
                                    </div>
                                  </div>
                                ` : ""}

                                ${p.notes ? `
                                  <!-- Notes Section -->
                                  <div class="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl p-4">
                                    <h3 class="font-bold text-lg mb-2 text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                      📝 Notes
                                    </h3>
                                    <p class="text-gray-700 dark:text-gray-300 italic">${p.notes}</p>
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
                          setEditing(p);
                          navigate("/gadgets/phones/add");
                        }}
                        className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                        title="Edit"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleRemove(p.id)}
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
                  <td colSpan={8} className="text-center py-8 text-gray-400 dark:text-gray-500">
                    {search || statusFilter !== "All"
                      ? "No smartphones found"
                      : "No smartphones yet. Add your first smartphone!"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {filtered.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
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
      {isAddOpen && (
        <AddGadgetModal
          isOpen={true}
          deviceType="Smartphone"
          existing={editing || undefined}
          onSubmit={handleSave}
          onClose={() => {
            setEditing(null);
            navigate("/gadgets/phones");
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

function StatusBadge({ status }: { status: GadgetStatus }) {
  const colors = {
    "In-Stock": "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    "In-Use": "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    Faulty: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[status]}`}>
      {status}
    </span>
  );
}







