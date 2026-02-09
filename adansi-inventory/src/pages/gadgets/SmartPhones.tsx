







// src/pages/gadgets/Smartphones.tsx

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AddGadgetModal from "../../components/AddGadgetModal";
import GadgetsExcelImportModal from "../../components/ExcelImportModal";
import type { Gadget, GadgetStatus } from "../../types/gadget";
import {
  getGadgetsByType,
  addGadget,
  updateGadget,
  deleteGadget,
} from "../../services/gadgetsService";
import Swal from "sweetalert2";
import { Download, Smartphone as PhoneIcon, Upload } from "lucide-react";

export default function Smartphones() {
  const [phones, setPhones] = useState<Gadget[]>([]);
  const [editing, setEditing] = useState<Gadget | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<GadgetStatus | "All">("All");
  const [showImportModal, setShowImportModal] = useState(false);

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

  async function handleImport(importedGadgets: Omit<Gadget, "id">[]) {
    try {
      // Filter only smartphones
      const phonesOnly = importedGadgets.filter(g => g.deviceType === "Smartphone");
      
      if (phonesOnly.length === 0) {
        Swal.fire({
          icon: "warning",
          title: "No Smartphones Found",
          text: "The Excel file contains no smartphone entries.",
        });
        return;
      }

      console.log("Starting import of", phonesOnly.length, "smartphones");
      
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      for (const phone of phonesOnly) {
        try {
          console.log("Importing smartphone:", phone);
          await addGadget(phone);
          successCount++;
        } catch (err: any) {
          failCount++;
          console.error("Failed to import smartphone:", phone, err);
          errors.push(`${phone.model}: ${err.message}`);
        }
      }

      await loadPhones();
      setShowImportModal(false);

      const skipped = importedGadgets.length - phonesOnly.length;

      if (failCount > 0) {
        Swal.fire({
          icon: "warning",
          title: "Partial Import",
          html: `
            <p>${successCount} smartphone(s) imported successfully.</p>
            <p class="text-red-600">${failCount} failed to import.</p>
            ${skipped > 0 ? `<p class="text-yellow-600">${skipped} non-smartphone item(s) were skipped.</p>` : ""}
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
          html: `${successCount} smartphone(s) imported successfully.${skipped > 0 ? `<br><small>${skipped} non-smartphone item(s) were skipped.</small>` : ""}`,
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (error: any) {
      console.error("Import error:", error);
      Swal.fire({
        title: "Import Failed",
        text: error.message || "An error occurred while importing smartphones.",
        icon: "error",
      });
    }
  }

  async function handleStatusChange(phone: Gadget) {
    const { value: newStatus } = await Swal.fire({
      title: "Change Status",
      input: "select",
      inputOptions: {
        "In-Stock": "In-Stock",
        "In-Use": "In-Use",
        Faulty: "Faulty",
      },
      inputValue: phone.status,
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      confirmButtonText: "Update",
    });

    if (newStatus) {
      let assignedTo = phone.assignedTo;
      let assignedDate = phone.assignedDate;

      if (newStatus === "In-Use") {
        const { value: employee } = await Swal.fire({
          title: "Assign To",
          input: "text",
          inputPlaceholder: "Employee name",
          inputValue: phone.assignedTo || "",
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

      const updatedPhone: Gadget = {
        ...phone,
        status: newStatus as GadgetStatus,
        assignedTo,
        assignedDate,
      };

      await updateGadget(updatedPhone);
      await loadPhones();

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

  function exportCSV() {
    const csv = [
      [
        "Model",
        "Serial Number",
        "Processor",
        "Storage",
        "Year",
        "Status",
        "Assigned To",
        "Assigned Date",
      ],
      ...filtered.map((p) => [
        p.model,
        p.serialNumber,
        p.processor || "",
        p.storage || "",
        p.year,
        p.status,
        p.assignedTo || "",
        p.assignedDate || "",
      ]),
    ]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smartphones_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  const filtered = phones.filter((p) => {
    const matchesSearch = `${p.model} ${p.serialNumber} ${p.assignedTo || ""}`
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesStatus = statusFilter === "All" || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const inStock = phones.filter((p) => p.status === "In-Stock").length;
  const inUse = phones.filter((p) => p.status === "In-Use").length;
  const faulty = phones.filter((p) => p.status === "Faulty").length;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading smartphones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* DASHBOARD CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat title="Total Phones" value={phones.length} icon={<PhoneIcon size={20} />} />
        <Stat title="In Stock" value={inStock} color="text-green-600" />
        <Stat title="In Use" value={inUse} color="text-blue-600" />
        <Stat title="Faulty" value={faulty} color="text-red-600" />
      </div>

      {/* ACTION BAR */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex gap-4 w-full md:w-auto">
          <input
            placeholder="Search smartphones..."
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
            onClick={() => navigate("/gadgets/phones/add")}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Add Smartphone
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              {[
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
            {filtered.map((p) => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{p.model}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.serialNumber}</td>
                <td className="px-4 py-3 text-gray-600">{p.processor || "—"}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.storage || "—"}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.year}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <button onClick={() => handleStatusChange(p)}>
                    <StatusBadge status={p.status} />
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                  {p.assignedTo || "—"}
                </td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                  {p.assignedDate || "—"}
                </td>
                <td className="px-4 py-3 space-x-3 whitespace-nowrap">
                  <button
                    onClick={() => {
                      setEditing(p);
                      navigate("/gadgets/phones/add");
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleRemove(p.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-400">
                  {search || statusFilter !== "All"
                    ? "No smartphones found"
                    : "No smartphones yet. Add your first smartphone!"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ADD/EDIT MODAL */}
      {isAddOpen && (
        <AddGadgetModal
          deviceType="Smartphone"
          existing={editing || undefined}
          onSave={handleSave}
          onClose={() => {
            setEditing(null);
            navigate("/gadgets/phones");
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