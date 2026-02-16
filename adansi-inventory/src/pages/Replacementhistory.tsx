import { useEffect, useState } from "react";
import { getAllReplacements, deleteReplacement, updateReplacement } from "../services/Tonerreplacementservice";
import type { TonerReplacement } from "../types/toner";
import { Download, History, Trash2, Edit, Eye } from "lucide-react";
import Swal from "sweetalert2";

export default function ReplacementHistory() {
  const [replacements, setReplacements] = useState<TonerReplacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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
        <div class="text-left space-y-2">
          <p class="text-gray-600 dark:text-gray-400">This will permanently delete:</p>
          <div class="bg-gray-50 dark:bg-gray-700 p-3 rounded mt-2">
            <p class="font-semibold text-gray-900 dark:text-white">${location}</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">${printerType}</p>
            <p class="text-sm text-gray-500 dark:text-gray-500">${color}</p>
          </div>
        </div>
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
    const previousPercentage = record.previousPercentage; // Store in variable for use in event listener
    
    const { value: formValues } = await Swal.fire({
      title: '✏️ Update Toner Usage',
      width: '600px',
      html: `
        <div class="text-left space-y-4">
          <!-- INFO CARD -->
          <div class="bg-gray-100 p-4 rounded-lg border border-gray-300">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <p class="text-xs text-gray-600 uppercase tracking-wide mb-1">Location</p>
                <p class="text-sm font-semibold text-gray-900">${record.location || 'Unknown'}</p>
              </div>
              <div>
                <p class="text-xs text-gray-600 uppercase tracking-wide mb-1">Room/Office</p>
                <p class="text-sm font-semibold text-red-600">${record.room ? '📍 ' + record.room : 'N/A'}</p>
              </div>
              <div>
                <p class="text-xs text-gray-600 uppercase tracking-wide mb-1">Printer</p>
                <p class="text-sm font-semibold text-gray-900">${record.printerType} ${record.printerType.toLowerCase().includes('pixma') ? '📦' : ''}</p>
              </div>
              <div>
                <p class="text-xs text-gray-600 uppercase tracking-wide mb-1">Color</p>
                <p class="text-sm font-semibold text-gray-900">${record.colorType}</p>
              </div>
            </div>
          </div>
          
          <!-- CURRENT TONER LEVEL -->
          <div>
            <label class="block text-sm font-semibold mb-2 text-gray-800">
              Current Toner Level (%)
            </label>
            <input 
              id="swal-current" 
              type="number" 
              min="0" 
              max="100" 
              value="${record.currentPercentage}"
              class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-bold text-center bg-white text-gray-900"
              placeholder="Enter percentage"
            />
            <!-- PROGRESS BAR -->
            <div class="mt-3 bg-gray-200 rounded-full h-3">
              <div 
                id="progress-bar"
                class="h-full rounded-full transition-all duration-300 ${record.currentPercentage < 20 ? 'bg-red-500' : record.currentPercentage < 50 ? 'bg-yellow-500' : 'bg-green-500'}" 
                style="width: ${record.currentPercentage}%"
              ></div>
            </div>
            <div class="flex justify-between text-xs mt-1 text-gray-600">
              <span>Previous: ${record.previousPercentage}%</span>
              <span id="usage-diff">Change: 0%</span>
            </div>
          </div>
          
          <!-- DATE CHECKED -->
          <div>
            <label class="block text-sm font-semibold mb-2 text-gray-800">
              Date Checked
            </label>
            <input 
              id="swal-date" 
              type="date" 
              value="${new Date().toISOString().split('T')[0]}"
              class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
            />
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '💾 Save Changes',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#6b7280',
      didOpen: () => {
        const input = document.getElementById('swal-current') as HTMLInputElement;
        const progressBar = document.getElementById('progress-bar');
        const usageDiff = document.getElementById('usage-diff');
        
        input.addEventListener('input', () => {
          const val = parseInt(input.value) || 0;
          const clamped = Math.max(0, Math.min(100, val));
          
          // Update progress bar
          if (progressBar) {
            progressBar.style.width = clamped + '%';
            progressBar.className = 'h-full rounded-full transition-all duration-300 ' + 
              (clamped < 20 ? 'bg-red-500' : clamped < 50 ? 'bg-yellow-500' : 'bg-green-500');
          }
          
          // Update usage diff
          if (usageDiff) {
            const diff = previousPercentage - clamped;
            usageDiff.textContent = 'Change: ' + (diff > 0 ? '-' : '+') + Math.abs(diff) + '%';
            usageDiff.className = 'text-xs ' + (diff > 0 ? 'text-red-600' : 'text-green-600');
          }
        });
      },
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
          html: `<p class="text-gray-600">Toner level updated to <strong class="text-green-600">${formValues.current}%</strong></p>`,
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
    const usageAmount = record.previousPercentage - record.currentPercentage;
    const usagePerDay = daysUsed > 0 ? (usageAmount / daysUsed).toFixed(2) : 'N/A';
    const estimatedDaysLeft = record.currentPercentage > 0 && usagePerDay !== 'N/A' ? 
      Math.floor(record.currentPercentage / parseFloat(usagePerDay)) : 'N/A';
    
    Swal.fire({
      title: '📊 Replacement Details',
      width: '700px',
      html: `
        <div class="text-left space-y-4">
          <!-- HEADER CARD -->
          <div class="bg-gray-100 p-5 rounded-lg border border-gray-300">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-xs text-gray-600 uppercase tracking-wide mb-1">Location</p>
                <p class="text-lg font-bold text-gray-900">${record.location || 'Unknown'}</p>
                ${record.room ? `<p class="text-sm text-red-600 mt-1">📍 ${record.room}</p>` : ''}
              </div>
              <div>
                <p class="text-xs text-gray-600 uppercase tracking-wide mb-1">Printer</p>
                <p class="text-lg font-bold text-gray-900">${record.printerType} ${record.printerType.toLowerCase().includes('pixma') ? '📦' : ''}</p>
                <p class="text-sm text-gray-700 mt-1">${record.colorType} Toner</p>
              </div>
            </div>
          </div>
          
          <!-- TIMELINE -->
          <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Timeline</p>
            <div class="space-y-2">
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-700">🔄 Replaced On:</span>
                <span class="font-semibold text-gray-900">${new Date(record.dateReplaced).toLocaleDateString()}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-700">📅 Last Checked:</span>
                <span class="font-semibold text-gray-900">${new Date(record.dateChecked).toLocaleDateString()}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-700">⏱️ Days in Use:</span>
                <span class="font-semibold text-blue-600">${daysUsed} days</span>
              </div>
            </div>
          </div>
          
          <!-- USAGE STATS -->
          <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Usage Statistics</p>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-gray-700 mb-2">Initial Level</p>
                <div class="flex items-center gap-2">
                  <span class="text-2xl font-bold text-green-600">${record.previousPercentage}%</span>
                  <div class="flex-1 bg-gray-200 rounded-full h-2">
                    <div class="bg-green-500 h-full rounded-full" style="width: ${record.previousPercentage}%"></div>
                  </div>
                </div>
              </div>
              <div>
                <p class="text-sm text-gray-700 mb-2">Current Level</p>
                <div class="flex items-center gap-2">
                  <span class="text-2xl font-bold ${record.currentPercentage < 20 ? 'text-red-600' : record.currentPercentage < 50 ? 'text-yellow-600' : 'text-green-600'}">${record.currentPercentage}%</span>
                  <div class="flex-1 bg-gray-200 rounded-full h-2">
                    <div class="${record.currentPercentage < 20 ? 'bg-red-500' : record.currentPercentage < 50 ? 'bg-yellow-500' : 'bg-green-500'} h-full rounded-full" style="width: ${record.currentPercentage}%"></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="mt-4 pt-4 border-t border-gray-300 space-y-2">
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-700">Total Used:</span>
                <span class="text-lg font-bold text-gray-900">${usageAmount}%</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-700">Average Daily Usage:</span>
                <span class="text-lg font-bold text-blue-600">${usagePerDay}% per day</span>
              </div>
              ${estimatedDaysLeft !== 'N/A' ? `
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-700">Estimated Days Left:</span>
                  <span class="text-lg font-bold text-purple-600">~${estimatedDaysLeft} days</span>
                </div>
              ` : ''}
            </div>
          </div>
          
          <!-- ALERT -->
          ${record.currentPercentage < 20 ? 
            '<div class="bg-red-50 border-2 border-red-200 p-4 rounded-lg"><div class="flex items-center gap-3"><span class="text-3xl">⚠️</span><div><p class="font-bold text-red-800">Critical Level!</p><p class="text-sm text-red-600">Toner should be replaced soon to avoid running out.</p></div></div></div>' : 
          record.currentPercentage < 50 ?
            '<div class="bg-yellow-50 border-2 border-yellow-200 p-4 rounded-lg"><div class="flex items-center gap-3"><span class="text-3xl">⚡</span><div><p class="font-bold text-yellow-800">Low Level</p><p class="text-sm text-yellow-600">Consider ordering replacement toner soon.</p></div></div></div>' :
            '<div class="bg-green-50 border-2 border-green-200 p-4 rounded-lg"><div class="flex items-center gap-3"><span class="text-3xl">✅</span><div><p class="font-bold text-green-800">Good Level</p><p class="text-sm text-green-600">Toner level is healthy.</p></div></div></div>'
          }
        </div>
      `,
      confirmButtonText: 'Close',
      confirmButtonColor: '#16a34a',
    });
  }

  function exportToCSV() {
    const headers = [
      "Location",
      "Room/Office",
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
      r.room || 'N/A',
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
      (r.location && r.location.toLowerCase().includes(search.toLowerCase())) ||
      (r.room && r.room.toLowerCase().includes(search.toLowerCase()))
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
      <div className="p-6 flex items-center justify-center h-96 bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading replacement history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-100 dark:bg-gray-900 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
            <History className="text-green-600 dark:text-green-400" />
            Replacement History
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track all toner replacement records
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white transition-colors"
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Replacements</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{replacements.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">This Month</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
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
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Printers Tracked</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {Object.keys(groupedByPrinter).length}
          </p>
        </div>
      </div>

      {/* SEARCH */}
      <div>
        <input
          placeholder="Search by location, room, printer, or color..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 w-full md:w-96 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </div>

      {/* NO DATA */}
      {replacements.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700">
          <div className="text-gray-400 dark:text-gray-600 text-6xl mb-4">📋</div>
          <p className="text-gray-500 dark:text-gray-400 text-lg">No replacement records yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
            Replace a toner to create the first record
          </p>
        </div>
      )}

      {/* GROUPED TABLES */}
      {Object.keys(groupedByPrinter).length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedByPrinter).map(([printerType, records]) => (
            <div key={printerType} className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 rounded-t-xl">
                <h2 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                  {printerType}
                  {printerType.toLowerCase().includes('pixma') && <span className="text-purple-600 dark:text-purple-400">📦</span>}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {records.length} replacement{records.length !== 1 ? "s" : ""}
                </p>
              </div>

              {/* MOBILE: Scroll horizontally */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-700">
                    <tr>
                      <th className="p-4 text-left font-semibold text-gray-900 dark:text-white whitespace-nowrap">Location</th>
                      <th className="p-4 text-left font-semibold text-gray-900 dark:text-white whitespace-nowrap">Color</th>
                      <th className="p-4 text-left font-semibold text-gray-900 dark:text-white whitespace-nowrap">Date Checked</th>
                      <th className="p-4 text-left font-semibold text-gray-900 dark:text-white whitespace-nowrap">Date Replaced</th>
                      <th className="p-4 text-left font-semibold text-gray-900 dark:text-white whitespace-nowrap">Previous %</th>
                      <th className="p-4 text-left font-semibold text-gray-900 dark:text-white whitespace-nowrap">Current %</th>
                      <th className="p-4 text-left font-semibold text-gray-900 dark:text-white whitespace-nowrap">Recorded</th>
                      <th className="p-4 text-center font-semibold text-gray-900 dark:text-white whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {records.map((record, idx) => (
                      <tr
                        key={record.id}
                        className={`${idx !== 0 ? "border-t border-gray-200 dark:border-gray-700" : ""} hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}
                      >
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {record.location || 'Unknown'}
                            </span>
                            {record.room && (
                              <span className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                                📍 {record.room}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <ColorBadge color={record.colorType} />
                        </td>
                        <td className="p-4 text-sm text-gray-700 dark:text-gray-300">{record.dateChecked}</td>
                        <td className="p-4 text-sm text-gray-700 dark:text-gray-300">{record.dateReplaced}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-gray-900 dark:text-white">
                              {record.previousPercentage}%
                            </span>
                            <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-blue-500 dark:bg-blue-400 h-full rounded-full"
                                style={{
                                  width: `${record.previousPercentage}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-gray-900 dark:text-white">
                              {record.currentPercentage}%
                            </span>
                            <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
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
                        <td className="p-4 text-gray-600 dark:text-gray-400 text-xs">
                          {new Date(record.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleViewDetails(record)}
                              className="inline-flex items-center justify-center text-blue-600 dark:text-blue-400 hover:text-white hover:bg-blue-600 dark:hover:bg-blue-500 p-2 rounded-lg transition-all"
                              title="View details"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => handleEdit(record)}
                              className="inline-flex items-center justify-center text-green-600 dark:text-green-400 hover:text-white hover:bg-green-600 dark:hover:bg-green-500 p-2 rounded-lg transition-all"
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
                              className="inline-flex items-center justify-center text-red-600 dark:text-red-400 hover:text-white hover:bg-red-600 dark:hover:bg-red-500 p-2 rounded-lg transition-all"
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
  const colors: Record<string, string> = {
    Black: "bg-gray-800 text-white dark:bg-gray-900",
    Cyan: "bg-cyan-500 text-white dark:bg-cyan-600",
    Magenta: "bg-pink-500 text-white dark:bg-pink-600",
    Yellow: "bg-yellow-400 text-gray-800 dark:bg-yellow-500",
    Color: "bg-gradient-to-r from-cyan-500 via-pink-500 to-yellow-400 text-white", // ✅ PIXMA support
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${
        colors[color] || "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
      }`}
    >
      {color}
    </span>
  );
}



