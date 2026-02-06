




import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import AddA4SheetModal from "../components/Adda4sheetmodal";
import type { A4Sheet } from "../types/A4Sheet";
import {
  getA4Sheets,
  addA4Sheet,
  updateA4Sheet,
  deleteA4Sheet,
  getA4SheetStats,
} from "../services/a4SheetService";
import {
  Download,
  FileText,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Package,
} from "lucide-react";

const ITEMS_PER_PAGE = 10;

// Office names
const OFFICE_NAMES = [
  "Takoradi Office",
  "Head Office",
  "Travel House",
  "Botwe Office",
  "Nester",
  "Tema",
  "Kumasi",
  "Tarkwa",
];

export default function A4Sheets() {
  const [sheets, setSheets] = useState<A4Sheet[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<A4Sheet | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRecords: 0,
    totalReams: 0,
    totalValue: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
  });

  async function loadSheets() {
    setLoading(true);
    const data = await getA4Sheets();
    const statsData = await getA4SheetStats();
    setSheets(data);
    setStats(statsData);
    setLoading(false);
  }

  useEffect(() => {
    loadSheets();
  }, []);

  async function handleSave(
    sheet: A4Sheet | Omit<A4Sheet, "id" | "status" | "createdAt" | "averageMonthlyUsage" | "estimatedDaysRemaining">
  ) {
    const isEditing = "id" in sheet;

    try {
      if (isEditing) {
        await updateA4Sheet(sheet);
      } else {
        await addA4Sheet(sheet);
      }

      await loadSheets();
      setEditing(null);
      setOpen(false);
      setPage(1);

      Swal.fire({
        title: isEditing ? "Updated!" : "Added!",
        text: `Stock has been ${isEditing ? "updated" : "added"} successfully.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "Failed to save stock record",
        icon: "error",
      });
    }
  }

  async function handleQuickUpdate(sheet: A4Sheet) {
    const result = await Swal.fire({
      title: "Update Stock Quantity",
      html: `
        <div class="text-left space-y-3">
          <p class="text-sm text-gray-600">Current quantity: <strong>${sheet.currentQuantity} reams</strong></p>
          <input 
            id="new-quantity" 
            type="number" 
            min="0" 
            value="${sheet.currentQuantity}"
            placeholder="Enter new quantity" 
            class="swal2-input"
            style="margin: 0; width: 100%;"
          />
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Update",
      confirmButtonColor: "#16a34a",
      preConfirm: () => {
        const input = document.getElementById("new-quantity") as HTMLInputElement;
        const newQty = parseInt(input.value);

        if (isNaN(newQty) || newQty < 0) {
          Swal.showValidationMessage("Please enter a valid quantity");
          return false;
        }

        return newQty;
      },
    });

    if (result.isConfirmed && result.value !== undefined) {
      const updatedSheet = {
        ...sheet,
        currentQuantity: result.value,
      };

      await updateA4Sheet(updatedSheet);
      await loadSheets();

      Swal.fire({
        icon: "success",
        title: "Quantity Updated",
        text: `Stock quantity updated to ${result.value} reams`,
        timer: 1500,
        showConfirmButton: false,
      });
    }
  }

  function handleRemove(id: string, officeName: string) {
    Swal.fire({
      title: "Delete record?",
      text: `Delete ${officeName} A4 sheet stock record?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#dc2626",
      confirmButtonText: "Yes, delete",
    }).then(async (res) => {
      if (res.isConfirmed) {
        await deleteA4Sheet(id);
        await loadSheets();

        Swal.fire({
          title: "Deleted!",
          text: "Record has been deleted.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    });
  }

  function exportCSV() {
    const csv = [
      [
        "Office Name",
        "Brand",
        "Current Quantity",
        "Initial Quantity",
        "Min Stock Level",
        "Cost Per Ream",
        "Total Value",
        "Supplier",
        "Status",
        "Avg Monthly Usage",
        "Days Remaining",
        "Date Added",
        "Last Restocked",
        "Notes",
      ],
      ...sheets.map((s) => [
        s.officeName,
        s.brand,
        s.currentQuantity,
        s.initialQuantity,
        s.minimumStockLevel,
        `GH₵${s.costPerReam.toFixed(2)}`,
        `GH₵${(s.currentQuantity * s.costPerReam).toFixed(2)}`,
        s.supplier,
        s.status,
        s.averageMonthlyUsage || "N/A",
        s.estimatedDaysRemaining || "N/A",
        s.dateAdded,
        s.lastRestocked || "Never",
        s.notes || "",
      ]),
    ]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `a4-sheets-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  const filtered = sheets.filter((s) =>
    `${s.officeName} ${s.brand} ${s.supplier}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading stock records...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-100 dark:bg-gray-900">
      {/* DASHBOARD CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card
          title="Total Stock"
          value={`${stats.totalReams} reams`}
          icon={<Package />}
        />
        <Card
          title="In Stock"
          value={stats.inStock}
          color="text-green-600"
          icon={<CheckCircle />}
        />
        <Card
          title="Low Stock"
          value={stats.lowStock}
          color="text-yellow-600"
          icon={<AlertTriangle />}
        />
        <Card
          title="Total Value"
          value={`GH₵${stats.totalValue.toFixed(2)}`}
          color="text-blue-600"
          icon={<span>💰</span>}
        />
      </div>

      {/* ACTION BAR */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <input
          placeholder="Search by office, brand, or supplier..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 w-full md:w-72 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />

        <div className="flex gap-3">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
          >
            <Download size={18} />
            Export CSV
          </button>

          <button
            onClick={() => setOpen(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Add Stock
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              {[
                "Office",
                "Brand",
                "Current Stock",
                "Min Level",
                "Status",
                "Usage Rate",
                "Days Left",
                "Cost/Ream",
                "Total Value",
                "Supplier",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-gray-900 dark:text-white"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((s) => (
              <tr
                key={s.id}
                className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                  {s.officeName}
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                  {s.brand}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {s.currentQuantity} reams
                    </span>
                    <button
                      onClick={() => handleQuickUpdate(s)}
                      className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                      title="Quick update"
                    >
                      update
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                  {s.minimumStockLevel}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={s.status} />
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                  {s.averageMonthlyUsage ? (
                    <span className="text-xs">
                      {s.averageMonthlyUsage} reams/mo
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">No data</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {s.estimatedDaysRemaining ? (
                    <span
                      className={`text-xs font-medium ${
                        s.estimatedDaysRemaining <= 7
                          ? "text-red-600 dark:text-red-400"
                          : s.estimatedDaysRemaining <= 14
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-green-600 dark:text-green-400"
                      }`}
                    >
                      ~{s.estimatedDaysRemaining} days
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                  GH₵{s.costPerReam.toFixed(2)}
                </td>
                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                  GH₵{(s.currentQuantity * s.costPerReam).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                  {s.supplier}
                </td>
                <td className="px-4 py-3 space-x-3">
                  <button
                    onClick={() => {
                      setEditing(s);
                      setOpen(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleRemove(s.id, s.officeName)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={11}
                  className="text-center py-8 text-gray-400 dark:text-gray-500"
                >
                  {search
                    ? "No stock records found"
                    : "No stock records yet. Add your first record!"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex gap-2 justify-center">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-4 py-2 rounded ${
                page === i + 1
                  ? "bg-green-600 text-white"
                  : "border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* MODAL */}
      {open && (
        <AddA4SheetModal
          sheet={editing}
          onSave={handleSave}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
          officeNames={OFFICE_NAMES}
        />
      )}
    </div>
  );
}

/* COMPONENTS */

function Card({ title, value, color = "", icon }: any) {
  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <div className="text-gray-400 dark:text-gray-500">{icon}</div>
      </div>
      <p
        className={`text-2xl font-bold ${
          color || "text-gray-900 dark:text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    "In Stock": "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    "Low Stock": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    "Out of Stock": "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${
        colors[status as keyof typeof colors]
      }`}
    >
      {status}
    </span>
  );
}