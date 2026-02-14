









import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AddTonerModal from "../components/AddTonerModal";
import type { Toner } from "../types/toner";
import {
  getToners,
  addToner,
  updateToner,
  deleteToner,
} from "../services/tonerService";
import Swal from "sweetalert2";
import { Download, ChevronDown, Trash2 } from "lucide-react";

// Standard CMYK colors for most printers
const STANDARD_COLORS = ["Black", "Cyan", "Magenta", "Yellow"] as const;

// PIXMA colors (ink tank printers)
const PIXMA_COLORS = ["Black", "Color"] as const;

// Function to get available colors based on printer type
function getAvailableColors(printerType: string): readonly string[] {
  // Check if printer is PIXMA (case insensitive)
  if (printerType.toLowerCase().includes("pixma")) {
    return PIXMA_COLORS;
  }
  
  // Default to standard CMYK colors
  return STANDARD_COLORS;
}

// Grouped toner with selected color
type GroupedToner = {
  id: string;
  location: string;
  room?: string;
  printerType: string;
  tonerType: string;
  colors: {
    Black?: number;
    Cyan?: number;
    Magenta?: number;
    Yellow?: number;
    Color?: number;
  };
  colorRecords: Record<string, Toner>;
  dateBrought: string;
  status?: string;
  selectedColor: string;
};

export default function Toners() {
  const [toners, setToners] = useState<Toner[]>([]);
  const [editing, setEditing] = useState<Toner | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedColors, setSelectedColors] = useState<Record<string, string>>({});

  const location = useLocation();
  const navigate = useNavigate();

  const isAddOpen = location.pathname === "/toners/add";

  async function loadToners() {
    setLoading(true);
    const data = await getToners();
    setToners(data);
    setLoading(false);
  }

  useEffect(() => {
    loadToners();
  }, []);

  // CLEAR ALL TONERS FROM FIREBASE
  async function handleClearAllToners() {
    const result = await Swal.fire({
      title: "⚠️ Delete ALL Toners?",
      html: `
        <div class="text-left space-y-3">
          <p class="text-red-600 font-bold">This will permanently delete ALL toner records from Firebase!</p>
          <p class="text-gray-600">Current total: <strong>${toners.length}</strong> records</p>
          <p class="text-gray-600">Total quantity: <strong>${toners.reduce((sum, t) => sum + t.quantity, 0)}</strong></p>
          <p class="text-sm text-gray-500">You will need to re-add all toners manually after this.</p>
          <p class="text-sm font-semibold text-red-600 mt-4">This action CANNOT be undone!</p>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete everything!",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        console.log("🗑️ Deleting all toners...");
        
        // Delete each toner record
        for (const toner of toners) {
          await deleteToner(toner.id);
          console.log(`   Deleted: ${toner.location} - ${toner.printerType} - ${toner.colorType}`);
        }

        await loadToners();

        Swal.fire({
          icon: "success",
          title: "All Toners Deleted!",
          text: `${toners.length} records have been removed from Firebase.`,
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Error clearing toners:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to clear all toners. Please try again.",
        });
      }
    }
  }

  // Group toners by location + printer + toner type
  function groupToners(tonerList: Toner[]): GroupedToner[] {
    const groups: Record<string, GroupedToner> = {};

    tonerList.forEach((toner) => {
      const key = `${toner.location}|${toner.printerType}|${toner.tonerType}`;

      if (!groups[key]) {
        groups[key] = {
          id: toner.id,
          location: toner.location,
          room: toner.room,
          printerType: toner.printerType,
          tonerType: toner.tonerType,
          colors: {},
          colorRecords: {},
          dateBrought: toner.dateBrought,
          status: toner.status,
          selectedColor: selectedColors[key] || toner.colorType,
        };
      }

      groups[key].colors[toner.colorType as keyof typeof groups[typeof key]['colors']] = toner.quantity;
      groups[key].colorRecords[toner.colorType] = toner;

      if (toner.status === "Critical") {
        groups[key].status = "Critical";
      } else if (toner.status === "Warning" && groups[key].status !== "Critical") {
        groups[key].status = "Warning";
      } else if (!groups[key].status) {
        groups[key].status = toner.status;
      }
    });

    return Object.values(groups);
  }

  async function handleColorSelect(group: GroupedToner) {
    const availableColors = getAvailableColors(group.printerType);
    
    await Swal.fire({
      title: 'Select Color to View',
      html: `
        <div class="text-left space-y-2">
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            <strong>${group.location}</strong> ${group.room ? `<span class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded ml-2">📍 ${group.room}</span>` : ''}<br>
            <span class="text-xs">${group.printerType}</span>
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
            ${availableColors.length === 2 ? '📦 PIXMA Printer (2 colors)' : '🖨️ Standard Printer (4 colors)'}
          </p>
          ${availableColors.map(color => {
            const qty = group.colors[color as keyof typeof group.colors];
            const isSelected = color === group.selectedColor;
            const exists = qty !== undefined;
            
            return `
              <div class="p-3 border rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${isSelected ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600'}"
                   data-color="${color}">
                <div class="flex justify-between items-center">
                  <span class="font-medium ${getColorTextClass(color)}">${color}</span>
                  <span class="text-gray-600 dark:text-gray-300">
                    Qty: <strong>${exists ? qty : 0}</strong>
                    ${!exists ? '<span class="text-xs text-gray-400 ml-2">(Not added)</span>' : ''}
                  </span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `,
      showCancelButton: true,
      showConfirmButton: false,
      cancelButtonText: 'Close',
      didOpen: () => {
        const colorDivs = document.querySelectorAll('[data-color]');
        colorDivs.forEach(div => {
          div.addEventListener('click', () => {
            const color = div.getAttribute('data-color');
            if (color) {
              Swal.close();
              const key = `${group.location}|${group.printerType}|${group.tonerType}`;
              setSelectedColors(prev => ({
                ...prev,
                [key]: color
              }));
            }
          });
        });
      }
    });
  }

  async function handleSave(toner: Toner | Omit<Toner, "id">) {
    try {
      if ("id" in toner) {
        await updateToner(toner);
      } else {
        await addToner(toner);
      }

      await loadToners();
      setEditing(null);
      navigate("/toners");

      Swal.fire({
        icon: "success",
        title: "id" in toner ? "Toner Updated" : "Toner Added",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to save toner",
      });
    }
  }

  async function handleQuantityUpdate(group: GroupedToner) {
    const color = group.selectedColor;
    const currentQty = group.colors[color as keyof typeof group.colors] || 0;
    const existingRecord = group.colorRecords[color];

    const result = await Swal.fire({
      title: `Update ${color} Toner Quantity`,
      html: `
        <div class="text-left space-y-3">
          <p class="text-sm text-gray-600 dark:text-gray-400">Location: <strong>${group.location}</strong> ${group.room ? `<span class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded ml-2">📍 ${group.room}</span>` : ''}</p>
          <p class="text-sm text-gray-600 dark:text-gray-400">Printer: <strong>${group.printerType}</strong></p>
          <p class="text-sm text-gray-600 dark:text-gray-400">Toner: <strong>${group.tonerType}</strong></p>
          <p class="text-sm text-gray-600 dark:text-gray-400">Color: <strong class="${getColorTextClass(color)}">${color}</strong></p>
          <p class="text-sm text-gray-600 dark:text-gray-400">Current quantity: <strong>${currentQty}</strong></p>
          ${!existingRecord ? '<p class="text-xs text-orange-600 dark:text-orange-400">⚠️ This color hasn\'t been added yet. Enter quantity to create it.</p>' : ''}
          <input 
            id="new-quantity" 
            type="number" 
            min="0" 
            value="${currentQty}"
            placeholder="Enter new quantity" 
            class="swal2-input"
            style="margin: 0; width: 100%;"
          />
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: existingRecord ? 'Update' : 'Add',
      confirmButtonColor: '#16a34a',
      preConfirm: () => {
        const input = document.getElementById('new-quantity') as HTMLInputElement;
        const newQty = parseInt(input.value);
        
        if (isNaN(newQty) || newQty < 0) {
          Swal.showValidationMessage('Please enter a valid quantity');
          return false;
        }
        
        return newQty;
      }
    });

    if (result.isConfirmed && result.value !== undefined) {
      if (existingRecord) {
        const updatedToner = {
          ...existingRecord,
          quantity: result.value,
          lastCheckedDate: new Date().toISOString().split("T")[0],
        };
        await updateToner(updatedToner);
      } else {
        const newToner: Omit<Toner, "id"> = {
          location: group.location,
          room: group.room,
          printerType: group.printerType,
          tonerType: group.tonerType,
          colorType: color,
          quantity: result.value,
          dateBrought: new Date().toISOString().split("T")[0],
          initialQuantity: result.value,
          lastCheckedDate: new Date().toISOString().split("T")[0],
        };
        await addToner(newToner);
      }

      await loadToners();
      
      Swal.fire({
        icon: 'success',
        title: existingRecord ? 'Quantity Updated' : 'Color Added',
        text: `${color} toner ${existingRecord ? 'updated to' : 'added with quantity'} ${result.value}`,
        timer: 1500,
        showConfirmButton: false,
      });
    }
  }

  async function handleRemoveGroup(group: GroupedToner) {
    const colorCount = Object.keys(group.colors).length;
    
    const result = await Swal.fire({
      title: "Delete All Colors?",
      html: `This will delete <strong>${colorCount}</strong> color toner(s) for this printer:<br><br>
            <strong>${group.location}</strong> ${group.room ? `(${group.room})` : ''} - ${group.printerType}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete all",
    });

    if (result.isConfirmed) {
      for (const toner of Object.values(group.colorRecords)) {
        await deleteToner(toner.id);
      }
      
      await loadToners();

      Swal.fire({
        title: "Deleted!",
        text: `${colorCount} toner color(s) deleted.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    }
  }

  function exportCSV() {
    const csv = [
      [
        "Location",
        "Room/Office",
        "Printer",
        "Toner",
        "Color",
        "Quantity",
        "Status",
        "Date",
      ],
      ...toners.map((t) => [
        t.location,
        t.room || "N/A",
        t.printerType,
        t.tonerType,
        t.colorType,
        t.quantity,
        t.status || "N/A",
        t.dateBrought,
      ]),
    ]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `toners_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  const groupedToners = groupToners(toners);

  const filtered = groupedToners.filter((g) =>
    `${g.location} ${g.room || ''} ${g.printerType} ${g.tonerType}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const critical = groupedToners.filter((g) => g.status === "Critical").length;
  const warning = groupedToners.filter((g) => g.status === "Warning").length;
  const good = groupedToners.filter((g) => g.status === "Good").length;

  // Calculate total quantity for display
  const totalQuantity = toners.reduce((sum, t) => sum + t.quantity, 0);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading toners...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-100 dark:bg-gray-900">
      {/* DASHBOARD CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat title="Total Toner Sets" value={groupedToners.length} />
        <Stat title="Good Stock" value={good} color="text-green-600" />
        <Stat title="Low Stock" value={warning} color="text-yellow-600" />
        <Stat title="Critical" value={critical} color="text-red-600" />
      </div>

      

      {/* ACTION BAR */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <input
          placeholder="Search toner..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 w-full md:w-72 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />

        <div className="flex gap-3 flex-wrap">
         

          <button
            onClick={exportCSV}
            className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
          >
            <Download size={18} />
            Export CSV
          </button>

          <button
            onClick={() => navigate("/toners/add")}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Add Toner
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              {[
                "Location",
                "Printer",
                "Toner",
                "Color",
                "Qty",
                "Status",
                "Recommendation",
                "Date",
                "Actions",
              ].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-gray-900 dark:text-white whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((group) => {
              const displayedQty = group.colors[group.selectedColor as keyof typeof group.colors] || 0;
              const displayedToner = group.colorRecords[group.selectedColor];
              
              return (
                <tr key={group.id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-900 dark:text-white">{group.location}</span>
                      {group.room && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">📍 {group.room}</span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {group.printerType}
                    {group.printerType.toLowerCase().includes('pixma') && (
                      <span className="ml-2 text-xs text-purple-600 dark:text-purple-400">📦</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {group.tonerType}
                  </td>

                  <td className="px-4 py-3">
                    <ColorSelectorBadge
                      color={group.selectedColor}
                      onClick={() => handleColorSelect(group)}
                    />
                  </td>

                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleQuantityUpdate(group)}
                      className="text-gray-900 dark:text-white font-bold text-lg hover:text-green-600 dark:hover:text-green-400 transition-colors"
                      title="Click to update quantity"
                    >
                      {displayedQty}
                      {displayedQty === 0 && (
                        <span className="text-xs text-gray-400 ml-1">(add)</span>
                      )}
                    </button>
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge status={displayedToner?.status} />
                  </td>

                  <td className="px-4 py-3">
                    <RecommendationBadge
                      percentage={displayedToner?.initialQuantity ? (displayedQty / displayedToner.initialQuantity) * 100 : 100}
                    />
                  </td>

                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {group.dateBrought}
                  </td>

                  <td className="px-4 py-3 space-x-3 whitespace-nowrap">
                    <button
                      onClick={() => {
                        const firstRecord = Object.values(group.colorRecords)[0];
                        setEditing(firstRecord);
                        navigate("/toners/add");
                      }}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleRemoveGroup(group)}
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
                  {search ? "No toners found" : "No toners yet. Add your first toner!"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isAddOpen && (
        <AddTonerModal
          existing={editing || undefined}
          onSave={handleSave}
          onClose={() => {
            setEditing(null);
            navigate("/toners");
          }}
        />
      )}
    </div>
  );
}

function getColorTextClass(color: string): string {
  const classes: Record<string, string> = {
    Black: "text-gray-900 dark:text-gray-100",
    Cyan: "text-cyan-600 dark:text-cyan-400",
    Magenta: "text-pink-600 dark:text-pink-400",
    Yellow: "text-yellow-600 dark:text-yellow-400",
    Color: "text-purple-600 dark:text-purple-400",
  };
  return classes[color] || "text-gray-600 dark:text-gray-400";
}

function Stat({ title, value, color = "" }: any) {
  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow border border-gray-200 dark:border-gray-700">
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p className={`text-2xl font-bold ${color || "text-gray-900 dark:text-white"}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-gray-400 text-xs">N/A</span>;

  const colors = {
    Good: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    Warning: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    Critical: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors]}`}>
      {status}
    </span>
  );
}

function ColorSelectorBadge({ color, onClick }: { color: string; onClick: () => void }) {
  const colors: Record<string, string> = {
    Black: "bg-gray-800 text-white hover:bg-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800",
    Cyan: "bg-cyan-500 text-white hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-700",
    Magenta: "bg-pink-500 text-white hover:bg-pink-600 dark:bg-pink-600 dark:hover:bg-pink-700",
    Yellow: "bg-yellow-400 text-gray-900 hover:bg-yellow-500 dark:bg-yellow-500 dark:hover:bg-yellow-600",
    Color: "bg-gradient-to-r from-cyan-500 via-pink-500 to-yellow-400 text-white hover:opacity-90",
  };

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all inline-flex items-center gap-1.5 ${
        colors[color] || "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
      }`}
      title="Click to select different color"
    >
      {color}
      <ChevronDown size={14} />
    </button>
  );
}

function RecommendationBadge({ percentage }: { percentage: number }) {
  if (percentage > 50) {
    return (
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs">
        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        No usage yet
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-xs">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      Low stock
    </div>
  );
}






