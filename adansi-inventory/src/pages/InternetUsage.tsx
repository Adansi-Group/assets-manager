






import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import AddInternetUsageModal from "../components/AddInternetModal";
import type { InternetUsage } from "../types/InternetUsage";
import {
  getInternetUsage,
  addInternetUsage,
  updateInternetUsage,
  deleteInternetUsage,
  getInternetUsageStats,
} from "../services/internetUsageService";
import { Download, Wifi, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { checkAndNotifyInternetExpiration } from "../utils/notificationsHelper";

const ITEMS_PER_PAGE = 10;

// Office names from your sheet
const OFFICE_NAMES = [
  "Takoradi Office",
  "Head Office",
  "Travel House",
  "Botwe Office",
  "Nester",
  "Tema",
  "Kumasi",
];

export default function InternetUsage() {
  const [records, setRecords] = useState<InternetUsage[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InternetUsage | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    exhausted: 0,
    totalCost: 0,
  });

  async function loadRecords() {
    setLoading(true);
    const data = await getInternetUsage();
    const statsData = await getInternetUsageStats();
    setRecords(data);
    setStats(statsData);
    
    // Check all active records for expiration notifications
    for (const record of data) {
      if (record.status === 'Active' && record.dateExhausted) {
        await checkAndNotifyInternetExpiration(record);
      }
    }
    
    setLoading(false);
  }

  useEffect(() => {
    loadRecords();
  }, []);

  async function handleSave(usage: InternetUsage | Omit<InternetUsage, "id" | "status" | "createdAt">) {
    const isEditing = "id" in usage;

    try {
      if (isEditing) {
        await updateInternetUsage(usage);
        // Check and notify for expiration after updating
        await checkAndNotifyInternetExpiration(usage);
      } else {
        await addInternetUsage(usage);
        // Check and notify for expiration after adding
        // We'll check on the next load since we need the full record with ID
      }

      await loadRecords();
      setEditing(null);
      setOpen(false);
      setPage(1);

      Swal.fire({
        title: isEditing ? "Updated!" : "Added!",
        text: `Record has been ${isEditing ? "updated" : "added"} successfully.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "Failed to save record",
        icon: "error",
      });
    }
  }

  function handleRemove(id: string, officeName: string) {
    Swal.fire({
      title: "Delete record?",
      text: `Delete ${officeName} internet usage record?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#dc2626",
      confirmButtonText: "Yes, delete",
    }).then(async (res) => {
      if (res.isConfirmed) {
        await deleteInternetUsage(id);
        await loadRecords();

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
      ["Office Name", "Date Purchased", "Date Exhausted", "Bundle Size", "Cost", "Provider", "Status", "Notes"],
      ...records.map((r) => [
        r.officeName,
        r.datePurchased,
        r.dateExhausted || "Active",
        r.bundleSize || "",
        r.cost || "",
        r.provider,
        r.status,
        r.notes || "",
      ]),
    ]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `internet-usage-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  const filtered = records.filter((r) =>
    `${r.officeName} ${r.provider} ${r.bundleSize}`
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
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-100 dark:bg-gray-900">
      {/* DASHBOARD CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card title="Total Records" value={stats.total} icon={<Wifi />} />
        <Card title="Active" value={stats.active} color="text-green-600" icon={<CheckCircle />} />
        <Card title="Exhausted" value={stats.exhausted} color="text-red-600" icon={<AlertCircle />} />
        <Card
          title="Total Cost"
          value={`GH₵${stats.totalCost.toFixed(2)}`}
          color="text-blue-600"
          icon={<span>💰</span>}
        />
      </div>

      {/* ACTION BAR */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <input
          placeholder="Search by office, provider, or bundle..."
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
            Add Record
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              {[
                "Office Name",
                "Provider",
                "Date Purchased",
                "Date Exhausted",
                "Duration (Days)",
                "Bundle Size",
                "Cost",
                "Status",
                "Actions",
              ].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-gray-900 dark:text-white whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((r) => {
              const duration = r.dateExhausted
                ? Math.ceil(
                    (new Date(r.dateExhausted).getTime() -
                      new Date(r.datePurchased).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : null;

              return (
                <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">{r.officeName}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{r.provider}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{r.datePurchased}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {r.dateExhausted || (
                      <span className="text-blue-600 dark:text-blue-400 text-xs">Still Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {duration ? `${duration} days` : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{r.bundleSize || "—"}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {r.cost ? `GH₵${r.cost.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 space-x-3 whitespace-nowrap">
                    <button
                      onClick={() => {
                        setEditing(r);
                        setOpen(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleRemove(r.id, r.officeName)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-400 dark:text-gray-500">
                  {search
                    ? "No records found"
                    : "No records yet. Add your first record!"}
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
        <AddInternetUsageModal
          usage={editing}
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
      <p className={`text-2xl font-bold ${color || "text-gray-900 dark:text-white"}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    Active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    Exhausted: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    Upcoming: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
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

