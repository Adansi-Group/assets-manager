
import { useEffect, useState } from "react";
import { getAllReplacements, deleteReplacement, updateReplacement } from "../services/Tonerreplacementservice";
import type { TonerReplacement } from "../types/toner";
import { Download, History, Trash2, Edit, Eye } from "lucide-react";
import Swal from "sweetalert2";

export default function ReplacementHistory() {
  const [replacements, setReplacements] = useState<TonerReplacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingRecord, setEditingRecord] = useState<TonerReplacement | null>(null);
  const [viewingRecord, setViewingRecord] = useState<TonerReplacement | null>(null);

  useEffect(() => {
    loadReplacements();
  }, []);

  async function loadReplacements() {
    setLoading(true);
    const data = await getAllReplacements();
    setReplacements(data);
    setLoading(false);
  }

  async function handleDelete(id: string, location: string, printerType: string, color: string) {
    const result = await Swal.fire({
      title: "Delete Replacement Record?",
      html: `
        <p class="text-gray-600">This will permanently delete:</p>
        <p class="font-semibold mt-2">${location} - ${printerType}</p>
        <p class="text-sm text-gray-500">${color}</p>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        await deleteReplacement(id);
        await loadReplacements();

        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Replacement record has been deleted.",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to delete replacement record",
        });
      }
    }
  }

  async function handleEdit(record: TonerReplacement) {
    const { value: formValues } = await Swal.fire({
      title: 'Update Toner Usage',
      html: `
        <div class="text-left space-y-4">
          <div class="bg-gray-50 p-3 rounded">
            <p class="text-sm"><strong>Location:</strong> ${record.location || 'Unknown'}</p>
            <p class="text-sm"><strong>Printer:</strong> ${record.printerType}</p>
            <p class="text-sm"><strong>Color:</strong> ${record.colorType}</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Current Toner Level (%)</label>
            <input 
              id="swal-current" 
              type="number" 
              min="0" 
              max="100" 
              value="${record.currentPercentage}"
              class="swal2-input" 
              style="margin: 0; width: 100%;"
            />
            <p class="text-xs text-gray-500 mt-1">Previous: ${record.previousPercentage}% → Current: ${record.currentPercentage}%</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Date Checked</label>
            <input 
              id="swal-date" 
              type="date" 
              value="${new Date().toISOString().split('T')[0]}"
              class="swal2-input" 
              style="margin: 0; width: 100%;"
            />
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Update',
      confirmButtonColor: '#16a34a',
      preConfirm: () => {
        const current = (document.getElementById('swal-current') as HTMLInputElement).value;
        const date = (document.getElementById('swal-date') as HTMLInputElement).value;
        
        if (!current || !date) {
          Swal.showValidationMessage('Please fill all fields');
          return false;
        }
        
        const currentNum = parseInt(current);
        if (isNaN(currentNum) || currentNum < 0 || currentNum > 100) {
          Swal.showValidationMessage('Percentage must be between 0 and 100');
          return false;
        }
        
        return { current: currentNum, date };
      }
    });

    if (formValues) {
      try {
        const updatedRecord: TonerReplacement = {
          ...record,
          currentPercentage: formValues.current,
          dateChecked: formValues.date,
        };
        
        await updateReplacement(updatedRecord);
        await loadReplacements();
        
        Swal.fire({
          icon: 'success',
          title: 'Updated!',
          text: `Toner level updated to ${formValues.current}%`,
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to update record',
        });
      }
    }
  }

  function handleViewDetails(record: TonerReplacement) {
    const daysUsed = Math.floor(
      (new Date(record.dateChecked).getTime() - new Date(record.dateReplaced).getTime()) / 
      (1000 * 60 * 60 * 24)
    );
    const usagePerDay = daysUsed > 0 ? ((record.previousPercentage - record.currentPercentage) / daysUsed).toFixed(2) : 'N/A';
    
    Swal.fire({
      title: 'Replacement Details',
      html: `
        <div class="text-left space-y-3">
          <div class="bg-gray-50 p-4 rounded">
            <p class="text-sm mb-2"><strong>Location:</strong> ${record.location || 'Unknown'}</p>
            <p class="text-sm mb-2"><strong>Printer:</strong> ${record.printerType}</p>
            <p class="text-sm"><strong>Color:</strong> ${record.colorType}</p>
          </div>
          
          <div class="border-t pt-3">
            <p class="text-sm mb-2"><strong>Date Replaced:</strong> ${new Date(record.dateReplaced).toLocaleDateString()}</p>
            <p class="text-sm mb-2"><strong>Last Checked:</strong> ${new Date(record.dateChecked).toLocaleDateString()}</p>
            <p class="text-sm mb-2"><strong>Days in Use:</strong> ${daysUsed} days</p>
          </div>
          
          <div class="border-t pt-3">
            <p class="text-sm mb-2"><strong>Initial Level:</strong> ${record.previousPercentage}%</p>
            <p class="text-sm mb-2"><strong>Current Level:</strong> ${record.currentPercentage}%</p>
            <p class="text-sm mb-2"><strong>Used:</strong> ${record.previousPercentage - record.currentPercentage}%</p>
            <p class="text-sm"><strong>Average Daily Usage:</strong> ${usagePerDay}%/day</p>
          </div>
          
          ${record.currentPercentage < 20 ? 
            '<div class="bg-red-50 border border-red-200 p-3 rounded mt-3"><p class="text-sm text-red-800"><strong>⚠️ Low Level:</strong> Consider replacing soon</p></div>' : 
            ''}
        </div>
      `,
      confirmButtonText: 'Close',
      confirmButtonColor: '#16a34a',
    });
  }

  function exportToCSV() {
    const headers = [
      "Location",
      "Printer Type",
      "Color",
      "Date Checked",
      "Date Replaced",
      "Prev Percentage",
      "Current Percentage",
      "Recorded Date",
    ];

    const rows = filtered.map((r) => [
      r.location || 'Unknown',
      r.printerType,
      r.colorType,
      r.dateChecked,
      r.dateReplaced,
      r.previousPercentage,
      r.currentPercentage,
      r.createdAt,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `toner-replacements-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  const filtered = replacements.filter(
    (r) =>
      r.printerType.toLowerCase().includes(search.toLowerCase()) ||
      r.colorType.toLowerCase().includes(search.toLowerCase()) ||
      (r.location && r.location.toLowerCase().includes(search.toLowerCase()))
  );

  // Group replacements by printer type
  const groupedByPrinter = filtered.reduce((acc, replacement) => {
    if (!acc[replacement.printerType]) {
      acc[replacement.printerType] = [];
    }
    acc[replacement.printerType].push(replacement);
    return acc;
  }, {} as Record<string, TonerReplacement[]>);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading replacement history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <History className="text-green-600" />
            Replacement History
          </h1>
          <p className="text-gray-600 mt-1">
            Track all toner replacement records
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="border px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow">
          <p className="text-sm text-gray-500">Total Replacements</p>
          <p className="text-2xl font-bold">{replacements.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow">
          <p className="text-sm text-gray-500">This Month</p>
          <p className="text-2xl font-bold text-green-600">
            {
              replacements.filter((r) => {
                const date = new Date(r.createdAt);
                const now = new Date();
                return (
                  date.getMonth() === now.getMonth() &&
                  date.getFullYear() === now.getFullYear()
                );
              }).length
            }
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow">
          <p className="text-sm text-gray-500">Printers Tracked</p>
          <p className="text-2xl font-bold text-blue-600">
            {Object.keys(groupedByPrinter).length}
          </p>
        </div>
      </div>

      {/* SEARCH */}
      <div>
        <input
          placeholder="Search by location, printer, or color..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-4 py-2 w-96"
        />
      </div>

      {/* NO DATA */}
      {replacements.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow">
          <div className="text-gray-400 text-6xl mb-4">📋</div>
          <p className="text-gray-500 text-lg">No replacement records yet</p>
          <p className="text-gray-400 text-sm mt-2">
            Replace a toner to create the first record
          </p>
        </div>
      )}

      {/* GROUPED TABLES */}
      {Object.keys(groupedByPrinter).length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedByPrinter).map(([printerType, records]) => (
            <div key={printerType} className="bg-white rounded-xl shadow">
              <div className="p-4 bg-gray-50 border-b rounded-t-xl">
                <h2 className="font-bold text-lg">{printerType}</h2>
                <p className="text-sm text-gray-600">
                  {records.length} replacement
                  {records.length !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-4 text-left font-semibold">Location</th>
                      <th className="p-4 text-left font-semibold">Color</th>
                      <th className="p-4 text-left font-semibold">
                        Date Checked
                      </th>
                      <th className="p-4 text-left font-semibold">
                        Date Replaced
                      </th>
                      <th className="p-4 text-left font-semibold">
                        Previous %
                      </th>
                      <th className="p-4 text-left font-semibold">
                        Current %
                      </th>
                      <th className="p-4 text-left font-semibold">
                        Recorded
                      </th>
                      <th className="p-4 text-center font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {records.map((record, idx) => (
                      <tr
                        key={record.id}
                        className={idx !== 0 ? "border-t hover:bg-gray-50" : "hover:bg-gray-50"}
                      >
                        <td className="p-4">
                          <span className="text-sm font-semibold text-gray-900">
                            {record.location || 'Unknown'}
                          </span>
                        </td>
                        <td className="p-4">
                          <ColorBadge color={record.colorType} />
                        </td>
                        <td className="p-4 text-sm">{record.dateChecked}</td>
                        <td className="p-4 text-sm">{record.dateReplaced}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {record.previousPercentage}%
                            </span>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-full rounded-full"
                                style={{
                                  width: `${record.previousPercentage}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {record.currentPercentage}%
                            </span>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-full rounded-full ${
                                  record.currentPercentage < 20
                                    ? "bg-red-500"
                                    : record.currentPercentage < 50
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                                }`}
                                style={{
                                  width: `${record.currentPercentage}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-gray-600 text-xs">
                          {new Date(record.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleViewDetails(record)}
                              className="inline-flex items-center justify-center text-blue-600 hover:text-white hover:bg-blue-600 p-2 rounded-lg transition-all"
                              title="View details"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => handleEdit(record)}
                              className="inline-flex items-center justify-center text-green-600 hover:text-white hover:bg-green-600 p-2 rounded-lg transition-all"
                              title="Edit usage"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(
                                record.id!, 
                                record.location || 'Unknown', 
                                record.printerType, 
                                record.colorType
                              )}
                              className="inline-flex items-center justify-center text-red-600 hover:text-white hover:bg-red-600 p-2 rounded-lg transition-all"
                              title="Delete record"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ColorBadge({ color }: { color: string }) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${
        color === "Black"
          ? "bg-gray-800 text-white"
          : color === "Cyan"
          ? "bg-cyan-500 text-white"
          : color === "Magenta"
          ? "bg-pink-500 text-white"
          : "bg-yellow-400 text-gray-800"
      }`}
    >
      {color}
    </span>
  );
}





