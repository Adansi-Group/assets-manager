





// src/pages/Gadgets.tsx

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AddGadgetModal from "../components/AddGadgetModal";
import GadgetsExcelImportModal from "../components/ExcelImportModal";
import type { Gadget, GadgetStatus } from "../types/gadget";
import {
  getGadgets,
  addGadget,
  updateGadget,
  deleteGadget,
} from "../services/gadgetsService";
import Swal from "sweetalert2";
import { Download, Smartphone, Laptop, Upload } from "lucide-react";

export default function Gadgets() {
  const [gadgets, setGadgets] = useState<Gadget[]>([]);
  const [editing, setEditing] = useState<Gadget | null>(null);
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
        title: "id" in gadget ? "Gadget Updated" : "Gadget Added",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to save gadget",
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
      ],
      ...filtered.map((g) => [
        g.deviceType,
        g.model,
        g.serialNumber,
        g.processor || "",
        g.storage || "",
        g.year,
        g.status,
        g.assignedTo || "",
        g.assignedDate || "",
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
    const matchesSearch = `${g.model} ${g.serialNumber} ${g.deviceType} ${g.assignedTo || ""}`
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesStatus = statusFilter === "All" || g.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalGadgets = gadgets.length;
  const laptops = gadgets.filter((g) => g.deviceType === "Laptop").length;
  const phones = gadgets.filter((g) => g.deviceType === "Smartphone").length;
  const inStock = gadgets.filter((g) => g.status === "In-Stock").length;
  const inUse = gadgets.filter((g) => g.status === "In-Use").length;
  const faulty = gadgets.filter((g) => g.status === "Faulty").length;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading gadgets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* DASHBOARD CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Stat title="Total Gadgets" value={totalGadgets} />
        <Stat title="Laptops" value={laptops} icon={<Laptop size={20} />} />
        <Stat title="Phones" value={phones} icon={<Smartphone size={20} />} />
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
            className="border rounded-lg px-4 py-2 flex-1 md:w-72"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as GadgetStatus | "All")}
            className="border rounded-lg px-4 py-2"
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
            className="flex items-center gap-2 border px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            <Upload size={18} />
            Import Excel
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center gap-2 border px-4 py-2 rounded-lg hover:bg-gray-50"
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
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              {[
                "Device Type",
                "Model",
                "Serial Number",
                "Processor",
                "Storage",
                "Year",
                "Status",
                "Assigned To",
                "Assigned Date",
                "Actions",
              ].map((h) => (
                <th key={h} className="px-4 py-3 text-left whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((g) => (
              <tr key={g.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <DeviceTypeBadge type={g.deviceType} />
                </td>
                <td className="px-4 py-3 font-medium">{g.model}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{g.serialNumber}</td>
                <td className="px-4 py-3 text-gray-600">{g.processor || "—"}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{g.storage || "—"}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{g.year}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <button onClick={() => handleStatusChange(g)}>
                    <StatusBadge status={g.status} />
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                  {g.assignedTo || "—"}
                </td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                  {g.assignedDate || "—"}
                </td>
                <td className="px-4 py-3 space-x-3 whitespace-nowrap">
                  <button
                    onClick={() => {
                      setEditing(g);
                      navigate("/gadgets/add");
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleRemove(g.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-8 text-gray-400">
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
    <div className="bg-white p-5 rounded-xl shadow">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500">{title}</p>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: GadgetStatus }) {
  const colors = {
    "In-Stock": "bg-green-100 text-green-700",
    "In-Use": "bg-blue-100 text-blue-700",
    Faulty: "bg-red-100 text-red-700",
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

function DeviceTypeBadge({ type }: { type: "Laptop" | "Smartphone" }) {
  const colors = {
    Laptop: "bg-purple-100 text-purple-700",
    Smartphone: "bg-indigo-100 text-indigo-700",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[type]}`}>
      {type}
    </span>
  );
}



