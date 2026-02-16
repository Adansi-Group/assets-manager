// src/pages/gadgets/Accessories.tsx - WITH STAFF ASSIGNMENT SUPPORT

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
import { Download, Package, Upload } from "lucide-react";

export default function Accessories() {
  const [accessories, setAccessories] = useState<Gadget[]>([]);
  const [editing, setEditing] = useState<Gadget | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<GadgetStatus | "All">("All");
  const [showImportModal, setShowImportModal] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const isAddOpen = location.pathname === "/gadgets/accessories/add";

  async function loadAccessories() {
    setLoading(true);
    const data = await getGadgetsByType("Accessory");
    setAccessories(data);
    setLoading(false);
  }

  useEffect(() => {
    loadAccessories();
  }, []);

  async function handleSave(gadget: Gadget | Omit<Gadget, "id">) {
    try {
      if ("id" in gadget) {
        await updateGadget(gadget);
      } else {
        await addGadget(gadget);
      }

      await loadAccessories();
      setEditing(null);
      navigate("/gadgets/accessories");

      Swal.fire({
        icon: "success",
        title: "id" in gadget ? "Accessory Updated" : "Accessory Added",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to save accessory",
      });
    }
  }

  async function handleImport(importedGadgets: Omit<Gadget, "id">[]) {
    try {
      const accessoriesOnly = importedGadgets.filter(g => g.deviceType === "Accessory");
      
      if (accessoriesOnly.length === 0) {
        Swal.fire({
          icon: "warning",
          title: "No Accessories Found",
          text: "The Excel file contains no accessory entries.",
        });
        return;
      }

      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      for (const accessory of accessoriesOnly) {
        try {
          await addGadget(accessory);
          successCount++;
        } catch (err: any) {
          failCount++;
          errors.push(`${accessory.model}: ${err.message}`);
        }
      }

      await loadAccessories();
      setShowImportModal(false);

      if (failCount > 0) {
        Swal.fire({
          icon: "warning",
          title: "Partial Import",
          html: `<p>${successCount} imported. ${failCount} failed.</p>`,
        });
      } else {
        Swal.fire({
          title: "Import Successful!",
          text: `${successCount} accessory(ies) imported successfully.`,
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (error: any) {
      Swal.fire({
        title: "Import Failed",
        text: error.message,
        icon: "error",
      });
    }
  }

  async function handleStatusChange(accessory: Gadget) {
    const { value: newStatus } = await Swal.fire({
      title: "Change Status",
      input: "select",
      inputOptions: {
        "In-Stock": "In-Stock",
        "In-Use": "In-Use",
        Faulty: "Faulty",
      },
      inputValue: accessory.status,
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      confirmButtonText: "Update",
    });

    if (newStatus) {
      let assignedTo = accessory.assignedTo;
      let assignedDate = accessory.assignedDate;
      let gender = accessory.gender;

      if (newStatus === "In-Use") {
        const { value: employee } = await Swal.fire({
          title: "Assign To",
          input: "text",
          inputPlaceholder: "Employee name",
          inputValue: accessory.assignedTo || "",
          showCancelButton: true,
        });

        if (employee) {
          assignedTo = employee;
          assignedDate = new Date().toISOString().split("T")[0];
          
          const { value: selectedGender } = await Swal.fire({
            title: "Select Gender",
            input: "select",
            inputOptions: {
              "": "Not specified",
              "Male": "Male",
              "Female": "Female",
            },
            inputValue: accessory.gender || "",
            showCancelButton: true,
          });
          
          gender = selectedGender || undefined;
        }
      } else {
        assignedTo = undefined;
        assignedDate = undefined;
        gender = undefined;
      }

      const updatedAccessory: Gadget = {
        ...accessory,
        status: newStatus as GadgetStatus,
        assignedTo,
        assignedDate,
        gender,
      };

      await updateGadget(updatedAccessory);
      await loadAccessories();

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
      text: "This accessory will be permanently deleted",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#dc2626",
      confirmButtonText: "Yes, delete it",
    });

    if (result.isConfirmed) {
      await deleteGadget(id);
      await loadAccessories();

      Swal.fire({
        title: "Deleted!",
        text: "Accessory has been deleted.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    }
  }

  function exportCSV() {
    const csv = [
      ["Name","Type","Quantity","Condition","Specifications","Year","Status","Assigned To","Gender","Assigned Date","Location"],
      ...filtered.map((a) => [
        a.model,
        a.accessoryType || "",
        a.quantity || "",
        a.condition || "",
        a.specifications || "",
        a.year,
        a.status,
        a.assignedTo || "",
        a.gender || "",
        a.assignedDate || "",
        a.location || "",
      ]),
    ].map((r) => r.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `accessories_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  const filtered = accessories.filter((a) => {
    const matchesSearch = `${a.model} ${a.accessoryType || ""} ${a.assignedTo || ""}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const inStock = accessories.filter((a) => a.status === "In-Stock").length;
  const inUse = accessories.filter((a) => a.status === "In-Use").length;
  const totalQuantity = accessories.reduce((sum, a) => sum + (a.quantity || 0), 0);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading accessories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-100 dark:bg-gray-900">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat title="Total Items" value={accessories.length} icon={<Package size={20} />} />
        <Stat title="Total Quantity" value={totalQuantity} color="text-orange-600" />
        <Stat title="In Stock" value={inStock} color="text-green-600" />
        <Stat title="In Use" value={inUse} color="text-blue-600" />
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex gap-4 w-full md:w-auto">
          <input
            placeholder="Search accessories..."
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
          <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white">
            <Upload size={18} /> Import Excel
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white">
            <Download size={18} /> Export CSV
          </button>
          <button onClick={() => navigate("/gadgets/accessories/add")} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            Add Accessory
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              {["Name","Type","Quantity","Condition","Specifications","Year","Status","Assigned To","Location","Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left whitespace-nowrap text-gray-900 dark:text-white">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{a.model}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{a.accessoryType || "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="font-semibold text-gray-900 dark:text-white">{a.quantity || 0}</span>
                  <span className="text-xs ml-1">units</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{a.condition && <ConditionBadge condition={a.condition} />}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">{a.specifications || "—"}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{a.year}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <button onClick={() => handleStatusChange(a)}><StatusBadge status={a.status} /></button>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {a.assignedTo || "—"}
                  {a.assignedDate && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {a.assignedDate}
                      {a.gender && ` • ${a.gender}`}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{a.location || "—"}</td>
                <td className="px-4 py-3 space-x-3 whitespace-nowrap">
                  <button onClick={() => { setEditing(a); navigate("/gadgets/accessories/add"); }} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">Edit</button>
                  <button onClick={() => handleRemove(a.id)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">Delete</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-8 text-gray-400 dark:text-gray-500">
                  {search || statusFilter !== "All" ? "No accessories found" : "No accessories yet. Add your first accessory!"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isAddOpen && (
        <AddGadgetModal deviceType="Accessory" existing={editing || undefined} onSave={handleSave} onClose={() => { setEditing(null); navigate("/gadgets/accessories"); }} />
      )}

      {showImportModal && (
        <GadgetsExcelImportModal onClose={() => setShowImportModal(false)} onImport={handleImport} />
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
  return <span className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 ${colors[status]}`} title="Click to change status">{status}</span>;
}

function ConditionBadge({ condition }: { condition: "New" | "Good" | "Fair" | "Poor" }) {
  const colors = {
    New: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    Good: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    Fair: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    Poor: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[condition]}`}>{condition}</span>;
}


