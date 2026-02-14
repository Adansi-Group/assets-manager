










// src/pages/Gadgets.tsx - WITH VIEW DETAILS BUTTON

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AddGadgetModal from "../components/AddGadgetModal";
import ViewGadgetDetailsModal from "../components/ViewGadgetDetailsModal";
import GadgetsExcelImportModal from "../components/ExcelImportModal";
import type { Gadget, GadgetStatus } from "../types/gadget";
import {
  getGadgets,
  addGadget,
  updateGadget,
  deleteGadget,
} from "../services/gadgetsService";
import Swal from "sweetalert2";
import { Download, Smartphone, Laptop, Upload, Package, Eye } from "lucide-react";

export default function Gadgets() {
  const [gadgets, setGadgets] = useState<Gadget[]>([]);
  const [editing, setEditing] = useState<Gadget | null>(null);
  const [viewing, setViewing] = useState<Gadget | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<GadgetStatus | "All">("All");
  const [showImportModal, setShowImportModal] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const isAddOpen = location.pathname === "/gadgets/add";

  async function loadGadgets() {
    setLoading(true);
    const data = await getGadgets();
    setGadgets(data);
    setLoading(false);
  }

  useEffect(() => {
    loadGadgets();
  }, []);

  async function handleSave(gadget: Gadget | Omit<Gadget, "id">) {
    try {
      if ("id" in gadget) {
        await updateGadget(gadget);
      } else {
        await addGadget(gadget);
      }

      await loadGadgets();
      setEditing(null);
      navigate("/gadgets");

      Swal.fire({
        icon: "success",
        title: "id" in gadget ? "Updated Successfully" : "Added Successfully",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error: any) {
      console.error("Save error:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Failed to save gadget",
      });
    }
  }

  async function handleImport(importedGadgets: Omit<Gadget, "id">[]) {
    try {
      console.log("Starting import of", importedGadgets.length, "gadgets");
      
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      for (const gadget of importedGadgets) {
        try {
          console.log("Importing gadget:", gadget);
          await addGadget(gadget);
          successCount++;
        } catch (err: any) {
          failCount++;
          console.error("Failed to import gadget:", gadget, err);
          errors.push(`${gadget.model}: ${err.message}`);
        }
      }

      await loadGadgets();
      setShowImportModal(false);

      if (failCount > 0) {
        Swal.fire({
          icon: "warning",
          title: "Partial Import",
          html: `
            <p>${successCount} gadget(s) imported successfully.</p>
            <p class="text-red-600">${failCount} failed to import.</p>
            <details class="mt-2 text-left text-sm">
              <summary>Show errors</summary>
              <ul class="mt-2 list-disc list-inside">
                ${errors.map(e => `<li>${e}</li>`).join("")}
              </ul>
            </details>
          `,
        });
      } else {
        Swal.fire({
          title: "Import Successful!",
          text: `${successCount} gadget(s) have been imported successfully.`,
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (error: any) {
      console.error("Import error:", error);
      Swal.fire({
        title: "Import Failed",
        text: error.message || "An error occurred while importing gadgets.",
        icon: "error",
      });
    }
  }

  async function handleStatusChange(gadget: Gadget) {
    const { value: newStatus } = await Swal.fire({
      title: "Change Status",
      input: "select",
      inputOptions: {
        "In-Stock": "In-Stock",
        "In-Use": "In-Use",
        Faulty: "Faulty",
      },
      inputValue: gadget.status,
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      confirmButtonText: "Update",
    });

    if (newStatus) {
      let assignedTo = gadget.assignedTo;
      let assignedDate = gadget.assignedDate;

      if (newStatus === "In-Use") {
        const { value: employee } = await Swal.fire({
          title: "Assign To",
          input: "text",
          inputPlaceholder: "Employee name",
          inputValue: gadget.assignedTo || "",
          showCancelButton: true,
        });

        if (employee) {
          assignedTo = employee;
          assignedDate = new Date().toISOString().split("T")[0];
        }
      } else {
        assignedTo = undefined;
        assignedDate = undefined;
      }

      const updatedGadget: Gadget = {
        ...gadget,
        status: newStatus as GadgetStatus,
        assignedTo,
        assignedDate,
      };

      await updateGadget(updatedGadget);
      await loadGadgets();

      Swal.fire({
        icon: "success",
        title: "Status Updated",
        timer: 1500,
        showConfirmButton: false,
      });
    }
  }

  async function handleRemove(id: string) {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This gadget will be permanently deleted",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#dc2626",
      confirmButtonText: "Yes, delete it",
    });

    if (result.isConfirmed) {
      await deleteGadget(id);
      await loadGadgets();

      Swal.fire({
        title: "Deleted!",
        text: "Gadget has been deleted.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    }
  }

  function exportCSV() {
    const csv = [
      [
        "Device Type",
        "Model",
        "Serial Number",
        "Processor",
        "Storage",
        "Year",
        "Status",
        "Assigned To",
        "Assigned Date",
        "Accessory Type",
        "Quantity",
        "Condition",
        "Compatible With",
        "Specifications",
        "Location",
      ],
      ...filtered.map((g) => [
        g.deviceType,
        g.model,
        g.serialNumber || "",
        g.processor || "",
        g.storage || "",
        g.year,
        g.status,
        g.assignedTo || "",
        g.assignedDate || "",
        g.accessoryType || "",
        g.quantity || "",
        g.condition || "",
        g.compatibleWith || "",
        g.specifications || "",
        g.location || "",
      ]),
    ]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gadgets_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  const filtered = gadgets.filter((g) => {
    const matchesSearch = `${g.model} ${g.serialNumber || ""} ${g.deviceType} ${g.assignedTo || ""} ${g.accessoryType || ""} ${g.location || ""}`
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesStatus = statusFilter === "All" || g.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalGadgets = gadgets.length;
  const laptops = gadgets.filter((g) => g.deviceType === "Laptop").length;
  const phones = gadgets.filter((g) => g.deviceType === "Smartphone").length;
  const accessories = gadgets.filter((g) => g.deviceType === "Accessory").length;
  const inStock = gadgets.filter((g) => g.status === "In-Stock").length;
  const inUse = gadgets.filter((g) => g.status === "In-Use").length;
  const faulty = gadgets.filter((g) => g.status === "Faulty").length;

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
      {/* DASHBOARD CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
        <Stat title="Total Gadgets" value={totalGadgets} />
        <Stat title="Laptops" value={laptops} icon={<Laptop size={20} />} color="text-purple-600" />
        <Stat title="Phones" value={phones} icon={<Smartphone size={20} />} color="text-indigo-600" />
        <Stat title="Accessories" value={accessories} icon={<Package size={20} />} color="text-orange-600" />
        <Stat title="In Stock" value={inStock} color="text-green-600" />
        <Stat title="In Use" value={inUse} color="text-blue-600" />
        <Stat title="Faulty" value={faulty} color="text-red-600" />
      </div>

      {/* ACTION BAR */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex gap-4 w-full md:w-auto">
          <input
            placeholder="Search gadgets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 flex-1 md:w-72 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as GadgetStatus | "All")}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="All">All Status</option>
            <option value="In-Stock">In-Stock</option>
            <option value="In-Use">In-Use</option>
            <option value="Faulty">Faulty</option>
          </select>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
          >
            <Upload size={18} />
            Import Excel
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
          >
            <Download size={18} />
            Export CSV
          </button>

          <button
            onClick={() => navigate("/gadgets/add")}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Add Gadget
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              {[
                "Device Type",
                "Model/Name",
                "Serial/Qty",
                "Specs",
                "Year",
                "Status",
                "Assigned To",
                "Location",
                "Actions",
              ].map((h) => (
                <th key={h} className="px-4 py-3 text-left whitespace-nowrap text-gray-900 dark:text-white">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((g) => (
              <tr key={g.id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                {/* Device Type */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <DeviceTypeBadge type={g.deviceType} />
                </td>

                {/* Model/Name */}
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  <div>
                    {g.model}
                    {g.deviceType === "Accessory" && g.accessoryType && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {g.accessoryType}
                      </div>
                    )}
                  </div>
                </td>

                {/* Serial Number OR Quantity */}
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {g.deviceType === "Accessory" ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {g.quantity || 0}
                      </span>
                      <span className="text-xs">units</span>
                    </span>
                  ) : (
                    <span className="font-mono text-xs">{g.serialNumber || "—"}</span>
                  )}
                </td>

                {/* Specs (Processor/Storage OR Specifications) */}
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  {g.deviceType === "Accessory" ? (
                    <div className="text-xs">
                      {g.specifications || "—"}
                      {g.compatibleWith && (
                        <div className="text-gray-500 dark:text-gray-400 mt-1">
                          ↳ {g.compatibleWith}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs">
                      {g.processor && <div>{g.processor}</div>}
                      {g.storage && <div className="text-gray-500 dark:text-gray-400">{g.storage}</div>}
                      {!g.processor && !g.storage && "—"}
                    </div>
                  )}
                </td>

                {/* Year */}
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {g.year}
                </td>

                {/* Status */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <button onClick={() => handleStatusChange(g)}>
                    <StatusBadge status={g.status} />
                  </button>
                  {g.deviceType === "Accessory" && g.condition && (
                    <div className="mt-1">
                      <ConditionBadge condition={g.condition} />
                    </div>
                  )}
                </td>

                {/* Assigned To */}
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {g.assignedTo || "—"}
                  {g.assignedDate && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {g.assignedDate}
                    </div>
                  )}
                </td>

                {/* Location */}
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {g.location || "—"}
                </td>

                {/* Actions */}
                <td className="px-4 py-3 space-x-3 whitespace-nowrap">
                  <button
                    onClick={() => setViewing(g)}
                    className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                    title="View Details"
                  >
                    View
                  </button>
                  <button
                    onClick={() => {
                      setEditing(g);
                      navigate("/gadgets/add");
                    }}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleRemove(g.id)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-400 dark:text-gray-500">
                  {search || statusFilter !== "All"
                    ? "No gadgets found"
                    : "No gadgets yet. Add your first gadget!"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ADD/EDIT MODAL */}
      {isAddOpen && (
        <AddGadgetModal
          existing={editing || undefined}
          onSave={handleSave}
          onClose={() => {
            setEditing(null);
            navigate("/gadgets");
          }}
        />
      )}

      {/* VIEW DETAILS MODAL */}
      {viewing && (
        <ViewGadgetDetailsModal
          gadget={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing(viewing);
            setViewing(null);
            navigate("/gadgets/add");
          }}
        />
      )}

      {/* IMPORT MODAL */}
      {showImportModal && (
        <GadgetsExcelImportModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
        />
      )}
    </div>
  );
}

/* COMPONENTS */

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

function StatusBadge({ status }: { status: "In-Stock" | "In-Use" | "Faulty" }) {
  const colors = {
    "In-Stock": "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    "In-Use": "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    Faulty: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 ${colors[status]}`}
      title="Click to change status"
    >
      {status}
    </span>
  );
}

function DeviceTypeBadge({ type }: { type: "Laptop" | "Smartphone" | "Accessory" }) {
  const colors = {
    Laptop: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    Smartphone: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
    Accessory: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  };

  const icons = {
    Laptop: "💻",
    Smartphone: "📱",
    Accessory: "🔌",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${colors[type]}`}>
      <span>{icons[type]}</span>
      {type}
    </span>
  );
}

function ConditionBadge({ condition }: { condition: "New" | "Good" | "Fair" | "Poor" }) {
  const colors = {
    New: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    Good: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    Fair: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    Poor: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[condition]}`}>
      {condition}
    </span>
  );
}