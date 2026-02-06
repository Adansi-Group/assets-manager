





import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AddTonerModal from "../components/AddTonerModal";
import type { Toner, TonerReplacement } from "../types/toner";
import {
  getToners,
  addToner,
  updateToner,
  deleteToner,
} from "../services/tonerService";
import Swal from "sweetalert2";
import { Download, AlertTriangle, CheckCircle } from "lucide-react";

export default function Toners() {
  const [toners, setToners] = useState<Toner[]>([]);
  const [editing, setEditing] = useState<Toner | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

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

  async function handleQuickUpdate(toner: Toner) {
    const result = await Swal.fire({
      title: 'Update Toner Quantity',
      html: `
        <div class="text-left space-y-3">
          <p class="text-sm text-gray-600">Current quantity: <strong>${toner.quantity}</strong></p>
          <input 
            id="new-quantity" 
            type="number" 
            min="0" 
            value="${toner.quantity}"
            placeholder="Enter new quantity" 
            class="swal2-input"
            style="margin: 0; width: 100%;"
          />
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Update',
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
      const updatedToner = {
        ...toner,
        quantity: result.value,
        lastCheckedDate: new Date().toISOString().split("T")[0],
      };
      
      await updateToner(updatedToner);
      await loadToners();
      
      Swal.fire({
        icon: 'success',
        title: 'Quantity Updated',
        text: `Toner quantity updated to ${result.value}`,
        timer: 1500,
        showConfirmButton: false,
      });
    }
  }

  async function handleColorChange(toner: Toner) {
    // Find all toners with same location, printer, and toner type (all colors)
    const relatedToners = toners.filter(
      (t) =>
        t.location === toner.location &&
        t.printerType === toner.printerType &&
        t.tonerType === toner.tonerType
    );

    // Create a map of colors to their toner data
    const colorData: Record<string, { quantity: number; toner: Toner | null }> = {
      Black: { quantity: 0, toner: null },
      Cyan: { quantity: 0, toner: null },
      Magenta: { quantity: 0, toner: null },
      Yellow: { quantity: 0, toner: null },
      Color: { quantity: 0, toner: null },
    };

    // Populate with existing toner entries
    relatedToners.forEach((t) => {
      colorData[t.colorType] = {
        quantity: t.quantity,
        toner: t,
      };
    });

    const result = await Swal.fire({
      title: 'Update Color Quantity',
      html: `
        <div class="text-left space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">Select Color to Update</label>
            <select 
              id="new-color" 
              class="swal2-input"
              style="margin: 0; width: 100%;"
            >
              <option value="Black">Black (Current: ${colorData.Black.quantity})</option>
              <option value="Cyan">Cyan (Current: ${colorData.Cyan.quantity})</option>
              <option value="Magenta">Magenta (Current: ${colorData.Magenta.quantity})</option>
              <option value="Yellow">Yellow (Current: ${colorData.Yellow.quantity})</option>
              <option value="Color">Color (Current: ${colorData.Color.quantity})</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">New Quantity</label>
            <input 
              id="new-quantity" 
              type="number" 
              min="0" 
              value="0"
              class="swal2-input"
              style="margin: 0; width: 100%;"
            />
          </div>
          
          <p class="text-xs text-blue-600">💡 Tip: Each color is saved as a separate entry in the table</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Update',
      confirmButtonColor: '#16a34a',
      didOpen: () => {
        const colorSelect = document.getElementById('new-color') as HTMLSelectElement;
        const quantityInput = document.getElementById('new-quantity') as HTMLInputElement;

        // Set initial quantity based on current toner's color
        colorSelect.value = toner.colorType;
        quantityInput.value = colorData[toner.colorType].quantity.toString();

        // Update quantity when color changes
        colorSelect.addEventListener('change', () => {
          const selectedColor = colorSelect.value as keyof typeof colorData;
          quantityInput.value = colorData[selectedColor].quantity.toString();
        });
      },
      preConfirm: () => {
        const select = document.getElementById('new-color') as HTMLSelectElement;
        const input = document.getElementById('new-quantity') as HTMLInputElement;
        const newQty = parseInt(input.value);

        if (isNaN(newQty) || newQty < 0) {
          Swal.showValidationMessage('Please enter a valid quantity');
          return false;
        }

        return {
          color: select.value,
          quantity: newQty,
        };
      }
    });

    if (result.isConfirmed && result.value) {
      const selectedColor = result.value.color;
      const selectedColorData = colorData[selectedColor as keyof typeof colorData];

      // Check if a toner entry already exists for this color
      if (selectedColorData.toner) {
        // Update the existing toner entry for this color
        const updatedToner: Toner = {
          ...selectedColorData.toner,
          quantity: result.value.quantity,
          lastCheckedDate: new Date().toISOString().split("T")[0],
        };
        await updateToner(updatedToner);
      } else {
        // Create a new toner entry for this color
        const newTonerEntry: Omit<Toner, "id"> = {
          location: toner.location,
          printerType: toner.printerType,
          tonerType: toner.tonerType,
          colorType: selectedColor,
          quantity: result.value.quantity,
          dateBrought: new Date().toISOString().split("T")[0],
          initialQuantity: toner.initialQuantity,
          lastCheckedDate: new Date().toISOString().split("T")[0],
        };
        await addToner(newTonerEntry);
      }

      await loadToners();
      
      Swal.fire({
        icon: 'success',
        title: 'Quantity Updated',
        text: `${selectedColor} toner set to ${result.value.quantity}`,
        timer: 1500,
        showConfirmButton: false,
      });
    }
  }

  async function handleRemove(id: string) {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This toner will be permanently deleted",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#dc2626",
      confirmButtonText: "Yes, delete it",
    });

    if (result.isConfirmed) {
      await deleteToner(id);
      await loadToners();

      Swal.fire({
        title: "Deleted!",
        text: "Toner has been deleted.",
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
        "Printer",
        "Toner",
        "Color",
        "Quantity",
        "Status",
        "Days Remaining",
        "Date",
      ],
      ...toners.map((t) => [
        t.location,
        t.printerType,
        t.tonerType,
        t.colorType,
        t.quantity,
        t.status || "N/A",
        t.estimatedDaysRemaining || "N/A",
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

  const filtered = toners.filter((t) =>
    `${t.location} ${t.printerType} ${t.tonerType} ${t.colorType}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const totalQty = toners.reduce((a, b) => a + b.quantity, 0);
  const critical = toners.filter((t) => t.status === "Critical").length;
  const warning = toners.filter((t) => t.status === "Warning").length;
  const good = toners.filter((t) => t.status === "Good").length;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading toners...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* DASHBOARD CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat title="Total Toners" value={toners.length} />
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
          className="border rounded-lg px-4 py-2 w-full md:w-72"
        />

        <div className="flex gap-3">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 border px-4 py-2 rounded-lg hover:bg-gray-50"
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
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              {[
                "Location",
                "Printer",
                "Toner",
                "Color",
                "Quantity",
                "Status",
                "Recommendation",
                "Date",
                "Actions",
              ].map((h) => (
                <th key={h} className="px-4 py-3 text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">{t.location}</td>
                <td className="px-4 py-3">{t.printerType}</td>
                <td className="px-4 py-3">{t.tonerType}</td>
                <td className="px-4 py-3">
                  <ColorBadge color={t.colorType} onClick={() => handleColorChange(t)} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{t.quantity}</span>
                    {t.initialQuantity && (
                      <button
                        onClick={() => handleQuickUpdate(t)}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                        title="Update quantity"
                      >
                        update
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={t.status} />
                </td>
                <td className="px-4 py-3">
                  <Recommendation
                    status={t.status}
                    daysRemaining={t.estimatedDaysRemaining}
                  />
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {t.dateBrought}
                </td>
                <td className="px-4 py-3 space-x-3">
                  <button
                    onClick={() => {
                      setEditing(t);
                      navigate("/toners/add");
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleRemove(t.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="text-center py-8 text-gray-400"
                >
                  {search
                    ? "No toners found"
                    : "No toners yet. Add your first toner!"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ADD/EDIT MODAL */}
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

/* COMPONENTS */

function Stat({ title, value, color = "" }: any) {
  return (
    <div className="bg-white p-5 rounded-xl shadow">
      <p className="text-sm text-gray-500">{title}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-gray-400 text-xs">N/A</span>;

  const colors = {
    Good: "bg-green-100 text-green-700",
    Warning: "bg-yellow-100 text-yellow-700",
    Critical: "bg-red-100 text-red-700",
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

function ColorBadge({ color, onClick }: { color: string; onClick: () => void }) {
  const colors: Record<string, string> = {
    Black: "bg-gray-800 text-white",
    Cyan: "bg-cyan-500 text-white",
    Magenta: "bg-pink-500 text-white",
    Yellow: "bg-yellow-400 text-black",
    Color: "bg-gradient-to-r from-cyan-500 via-pink-500 to-yellow-400 text-white",
  };

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${
        colors[color] || "bg-gray-200"
      }`}
      title="Click to change color"
    >
      {color}
    </button>
  );
}

function Recommendation({
  status,
  daysRemaining,
}: {
  status?: string;
  daysRemaining?: number;
}) {
  if (!status) {
    return <span className="text-gray-400 text-xs">Tracking disabled</span>;
  }

  if (status === "Good" && !daysRemaining) {
    return (
      <div className="flex items-center gap-1 text-blue-600 text-xs">
        <CheckCircle size={14} />
        No usage yet
      </div>
    );
  }

  if (status === "Critical" && daysRemaining !== undefined) {
    return (
      <div className="flex items-center gap-1 text-red-600 text-xs">
        <AlertTriangle size={14} />
        Replace within {daysRemaining} days
      </div>
    );
  }

  if (status === "Warning" && daysRemaining !== undefined) {
    return (
      <div className="flex items-center gap-1 text-yellow-600 text-xs">
        <AlertTriangle size={14} />
        Order soon ({daysRemaining} days)
      </div>
    );
  }

  if (status === "Good" && daysRemaining !== undefined) {
    return (
      <div className="flex items-center gap-1 text-green-600 text-xs">
        <CheckCircle size={14} />
        {daysRemaining} days remaining
      </div>
    );
  }

  return <span className="text-gray-400 text-xs">—</span>;
}


