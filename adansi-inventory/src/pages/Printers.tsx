







import { useEffect, useState } from "react";
import AddPrinterModal from "../components/AddPrinterModal";
import Swal from "sweetalert2";

export type Printer = {
  id: number;
  location: string;
  printerType: string;
  quantity: number;
  status: string;
  date: string;
};

const ITEMS_PER_PAGE = 5;

export default function Printers() {
  const [printers, setPrinters] = useState<Printer[]>(() => {
    const saved = localStorage.getItem("printers");
    return saved ? JSON.parse(saved) : [];
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Printer | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    localStorage.setItem("printers", JSON.stringify(printers));
  }, [printers]);

  function handleSave(printer: Printer) {
    if (editing) {
      setPrinters((prev) =>
        prev.map((p) => (p.id === printer.id ? printer : p))
      );
      setEditing(null);
    } else {
      setPrinters((prev) => [...prev, printer]);
    }
  }

  

  function handleRemove(id: number) {
  Swal.fire({
    title: "Are you sure?",
    text: "This toner will be permanently deleted",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#16a34a", // green
    cancelButtonColor: "#dc2626",  // red
    confirmButtonText: "Yes, delete it",
  }).then((result) => {
    if (result.isConfirmed) {
      const updated = printers.filter(p => p.id !== id);
      setPrinters(updated);
      localStorage.setItem("printers", JSON.stringify(updated));

      Swal.fire({
        title: "Deleted!",
        text: "Printer has been deleted.",
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
      p.printerType.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const start = (page - 1) * ITEMS_PER_PAGE;
  const paginated = filtered.slice(start, start + ITEMS_PER_PAGE);

  const count = {
    total: printers.length,
    active: printers.filter((p) => p.status === "Active").length,
    repair: printers.filter((p) => p.status === "In Repair").length,
    retired: printers.filter((p) => p.status === "Retired").length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* DASHBOARD */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card title="Total Printers" value={count.total} />
        <Card title="Active" value={count.active} green />
        <Card title="In Repair" value={count.repair} yellow />
        <Card title="Retired" value={count.retired} red />
      </div>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <input
          placeholder="Search printer..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="border rounded-lg px-4 py-2 w-64"
        />

        <button
          onClick={() => setOpen(true)}
          className="bg-green-600 text-white px-5 py-2 rounded-lg"
        >
          Add Printer
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Location</th>
              <th className="p-4 text-left">Printer</th>
              <th className="p-4 text-left">Quantity</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Date</th>
              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginated.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-400">
                  No printers found
                </td>
              </tr>
            )}

            {paginated.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-4">{p.location}</td>
                <td className="p-4">{p.printerType}</td>
                <td className="p-4">{p.quantity}</td>
                <td className="p-4">
                  <StatusBadge status={p.status} />
                </td>
                <td className="p-4">{p.date}</td>
                <td className="p-4 space-x-2">
                  <button
                    onClick={() => setEditing(p)}
                    className="text-blue-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleRemove(p.id)}
                    className="text-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex gap-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-4 py-2 rounded ${
                page === i + 1
                  ? "bg-green-600 text-white"
                  : "border"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {(open || editing) && (
        <AddPrinterModal
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
          onAdd={handleSave}
          printer={editing}
        />
      )}
    </div>
  );
}

/* SMALL COMPONENTS */
function Card({ title, value, green, yellow, red }: any) {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <p className="text-sm text-gray-500">{title}</p>
      <h2
        className={`text-2xl font-bold ${
          green
            ? "text-green-600"
            : yellow
            ? "text-yellow-600"
            : red
            ? "text-red-600"
            : ""
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
      className={`px-3 py-1 rounded-full text-xs ${
        status === "Active"
          ? "bg-green-100 text-green-700"
          : status === "In Repair"
          ? "bg-yellow-100 text-yellow-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {status}
    </span>
  );
}
