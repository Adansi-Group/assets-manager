







import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import AddPrinterModal from "../components/AddPrinterModal";
import ReplaceTonerModal from "../components/Replacetonermodal";
import QuickCheckTonerModal from "../components/QuickCheckTonerModal";
import type { Printer, TonerLevel, TonerColor } from "../types/printer";
import {
  getPrinters,
  addPrinter,
  updatePrinter,
  deletePrinter,
} from "../services/printerService";
import { addTonerReplacement } from "../services/Tonerreplacementservice";
import { Droplets, AlertTriangle, Eye } from "lucide-react";

const ITEMS_PER_PAGE = 5;

export default function Printers() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Printer | null>(null);
  const [selectedPrinterForReplacement, setSelectedPrinterForReplacement] = useState<Printer | null>(null);
  const [selectedColorForReplacement, setSelectedColorForReplacement] = useState<string>("");
  const [selectedPrinterForCheck, setSelectedPrinterForCheck] = useState<Printer | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  async function loadPrinters() {
    const data = await getPrinters();
    setPrinters(data);
  }

  useEffect(() => {
    loadPrinters();
  }, []);

  async function handleSave(printer: Printer | Omit<Printer, "id">) {
    const isEditing = "id" in printer;
    
    if (isEditing) {
      await updatePrinter(printer);
    } else {
      await addPrinter(printer);
    }

    await loadPrinters();
    setEditing(null);
    setOpen(false);
    setPage(1);

    Swal.fire({
      title: isEditing ? "Updated!" : "Added!",
      text: `Printer has been ${isEditing ? "updated" : "added"} successfully.`,
      icon: "success",
      timer: 1500,
      showConfirmButton: false,
    });
  }

  async function handleQuickCheck(printerId: string, updatedLevels: TonerLevel[]) {
    try {
      const printer = printers.find(p => p.id === printerId);
      if (!printer) return;

      await updatePrinter({
        ...printer,
        tonerLevels: updatedLevels,
        hasTonerTracking: true,
      });

      await loadPrinters();

      Swal.fire({
        title: "Levels Updated!",
        text: "Toner levels have been updated successfully.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      setSelectedPrinterForCheck(null);
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "Failed to update toner levels. Please try again.",
        icon: "error",
      });
    }
  }

  async function handleTonerReplacement(
    printerId: string, 
    color: string, 
    replacementData: {
      dateChecked: string;
      dateReplaced: string;
      previousPercentage: number;
      currentPercentage: number;
    }
  ) {
    try {
      const printer = printers.find(p => p.id === printerId);
      if (!printer) return;

      await addTonerReplacement({
        tonerId: printerId,
        location: printer.location,
        printerType: printer.model,
        colorType: color,
        dateChecked: replacementData.dateChecked,
        dateReplaced: replacementData.dateReplaced,
        previousPercentage: replacementData.previousPercentage,
        currentPercentage: replacementData.currentPercentage,
      });

      const updatedTonerLevels = printer.tonerLevels || [];
      const existingTonerIndex = updatedTonerLevels.findIndex(t => t.color === color);

      const newTonerLevel: TonerLevel = {
        color: color as TonerColor,
        currentPercentage: replacementData.currentPercentage,
        lastChecked: replacementData.dateChecked,
        lastReplaced: replacementData.dateReplaced,
      };

      if (existingTonerIndex >= 0) {
        updatedTonerLevels[existingTonerIndex] = newTonerLevel;
      } else {
        updatedTonerLevels.push(newTonerLevel);
      }

      await updatePrinter({
        ...printer,
        tonerLevels: updatedTonerLevels,
        hasTonerTracking: true,
      });

      await loadPrinters();

      Swal.fire({
        title: "Replacement Recorded!",
        text: `${color} toner has been replaced successfully.`,
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });

      setSelectedPrinterForReplacement(null);
      setSelectedColorForReplacement("");
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "Failed to record replacement. Please try again.",
        icon: "error",
      });
    }
  }

  function handleRemove(id: string) {
    Swal.fire({
      title: "Delete printer?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#dc2626",
      confirmButtonText: "Yes, delete",
    }).then(async (res) => {
      if (res.isConfirmed) {
        await deletePrinter(id);
        await loadPrinters();
        
        Swal.fire({
          title: "Deleted!",
          text: "Printer has been deleted and unused options cleaned up.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    });
  }

  const filtered = printers.filter(
    (p) =>
      p.location.toLowerCase().includes(search.toLowerCase()) ||
      p.model.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const count = {
    total: printers.length,
    active: printers.filter((p) => p.status === "Active").length,
    repair: printers.filter((p) => p.status === "In Repair").length,
    retired: printers.filter((p) => p.status === "Retired").length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card title="Total Printers" value={count.total} />
        <Card title="Active" value={count.active} green />
        <Card title="In Repair" value={count.repair} yellow />
        <Card title="Retired" value={count.retired} red />
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4">
        <input
          placeholder="Search by location or model..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="border rounded-lg px-4 py-2 w-72"
        />

        <button
          onClick={() => setOpen(true)}
          className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700"
        >
          Add Printer
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="p-4 text-left">Location</th>
              <th className="p-4 text-left">Model</th>
              <th className="p-4 text-left">Type</th>
              <th className="p-4 text-left">Quantity</th>
              <th className="p-4 text-left">Toner Levels</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Date</th>
              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginated.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-gray-400">
                  {search ? "No printers found" : "No printers yet. Add your first printer!"}
                </td>
              </tr>
            )}

            {paginated.map((p) => (
              <tr key={p.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="p-4">{p.location}</td>
                <td className="p-4">{p.model}</td>
                <td className="p-4">{p.printerColorType}</td>
                <td className="p-4">{p.quantity}</td>
                <td className="p-4">
                  <TonerLevelsDisplay 
                    printer={p} 
                    onCheck={() => setSelectedPrinterForCheck(p)}
                    onReplaceColor={(color) => {
                      setSelectedPrinterForReplacement(p);
                      setSelectedColorForReplacement(color);
                    }}
                  />
                </td>
                <td className="p-4">
                  <StatusBadge status={p.status} />
                </td>
                <td className="p-4">{p.date}</td>
                <td className="p-4 space-x-3">
                  <button
                    onClick={() => setEditing(p)}
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
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex gap-2 justify-center">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-4 py-2 rounded ${
                page === i + 1
                  ? "bg-green-600 text-white"
                  : "border hover:bg-gray-100"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {(open || editing) && (
        <AddPrinterModal
          printer={editing}
          onSave={handleSave}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
        />
      )}

      {selectedPrinterForReplacement && (
        <ReplaceTonerModal
          printer={selectedPrinterForReplacement}
          selectedColor={selectedColorForReplacement}
          onSave={handleTonerReplacement}
          onClose={() => {
            setSelectedPrinterForReplacement(null);
            setSelectedColorForReplacement("");
          }}
        />
      )}

      {selectedPrinterForCheck && (
        <QuickCheckTonerModal
          printer={selectedPrinterForCheck}
          onSave={handleQuickCheck}
          onClose={() => setSelectedPrinterForCheck(null)}
        />
      )}
    </div>
  );
}

function Card({ title, value, green, yellow, red }: any) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <h2
        className={`text-2xl font-bold ${
          green ? "text-green-600" : yellow ? "text-yellow-600" : red ? "text-red-600" : "text-gray-900 dark:text-white"
        }`}
      >
        {value}
      </h2>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${
        status === "Active"
          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
          : status === "In Repair"
          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
          : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
      }`}
    >
      {status}
    </span>
  );
}

function TonerLevelsDisplay({ printer, onCheck, onReplaceColor }: { 
  printer: Printer; 
  onCheck: () => void;
  onReplaceColor: (color: string) => void;
}) {
  if (!printer.tonerLevels || printer.tonerLevels.length === 0) {
    return (
      <button
        onClick={onCheck}
        className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
      >
        <Droplets size={14} />
        Track Toner
      </button>
    );
  }

  const lowLevelToners = printer.tonerLevels.filter(t => t.currentPercentage < 20);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {printer.tonerLevels.map((toner) => (
          <button
            key={toner.color}
            onClick={() => onReplaceColor(toner.color)}
            className="cursor-pointer hover:opacity-80 transition-opacity group relative"
            title={`Click to replace ${toner.color} toner`}
          >
            <TonerLevelBadge toner={toner} />
            <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              Replace {toner.color}
            </span>
          </button>
        ))}
      </div>
      <button
        onClick={onCheck}
        className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
      >
        <Eye size={12} />
        Check
      </button>
      {lowLevelToners.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
          <AlertTriangle size={12} />
          {lowLevelToners.length} low
        </div>
      )}
    </div>
  );
}

function TonerLevelBadge({ toner }: { toner: TonerLevel }) {
  const getColorClass = () => {
    switch (toner.color) {
      case "Black": return "bg-gray-800 text-white";
      case "Cyan": return "bg-cyan-500 text-white";
      case "Magenta": return "bg-pink-500 text-white";
      case "Yellow": return "bg-yellow-400 text-gray-800";
      default: return "bg-gray-200 text-gray-800";
    }
  };

  const getLevelColor = () => {
    if (toner.currentPercentage < 20) return "text-red-600 dark:text-red-400";
    if (toner.currentPercentage < 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-green-600 dark:text-green-400";
  };

  return (
    <div className="flex flex-col gap-1">
      <span className={`px-2 py-1 rounded text-xs font-medium ${getColorClass()}`}>
        {toner.color.charAt(0)}
      </span>
      <span className={`text-xs font-semibold ${getLevelColor()}`}>
        {toner.currentPercentage}%
      </span>
    </div>
  );
}




