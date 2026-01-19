import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AddTonerModal from "../components/AddTonerModal";
import type { Toner } from "../types/toner";
import Swal from "sweetalert2";

export default function Toners() {
  const [toners, setToners] = useState<Toner[]>([]);
  const [editing, setEditing] = useState<Toner | null>(null);
  const [search, setSearch] = useState("");

  const location = useLocation();
  const navigate = useNavigate();

  const isAddOpen = location.pathname === "/toners/add";
  const isReplaceOpen = location.pathname === "/toners/replace";

  useEffect(() => {
    setToners(JSON.parse(localStorage.getItem("toners") || "[]"));
  }, []);

  function save(data: Toner) {
    const updated = editing
      ? toners.map(t => (t.id === data.id ? data : t))
      : [...toners, data];

    setToners(updated);
    localStorage.setItem("toners", JSON.stringify(updated));
    setEditing(null);
  }

  function remove(id: number) {
    Swal.fire({
      title: "Are you sure?",
      text: "This toner will be permanently deleted",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#dc2626",
      confirmButtonText: "Yes, delete it",
    }).then((result) => {
      if (result.isConfirmed) {
        const updated = toners.filter(t => t.id !== id);
        setToners(updated);
        localStorage.setItem("toners", JSON.stringify(updated));

        Swal.fire({
          title: "Deleted!",
          text: "Toner has been deleted.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    });
  }

  function exportCSV() {
    const csv = [
      ["Location", "Printer", "Toner", "Color", "Quantity", "Date"],
      ...toners.map(t => [
        t.location,
        t.printerType,
        t.tonerType,
        t.colorType,
        t.quantity,
        t.dateBrought,
      ]),
    ]
      .map(r => r.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "toners.csv";
    a.click();
  }

  const filtered = toners.filter(t =>
    `${t.location} ${t.printerType} ${t.tonerType} ${t.colorType}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const totalQty = toners.reduce((a, b) => a + b.quantity, 0);
  const lowStock = toners.filter(t => t.quantity === 1).length;
  const outOfStock = toners.filter(t => t.quantity === 0).length;

  return (
    <div className="p-6 space-y-6">
      {/* DASHBOARD */}
      <div className="grid grid-cols-4 gap-6">
        <Stat title="Toners" value={toners.length} />
        <Stat title="Total Quantity" value={totalQty} color="text-green-600" />
        <Stat title="Low Stock" value={lowStock} color="text-yellow-600" />
        <Stat title="Out of Stock" value={outOfStock} color="text-red-600" />
      </div>

      {/* ACTION BAR */}
      <div className="flex justify-between items-center">
        <input
          placeholder="Search toner..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-4 py-2 w-72"
        />

        <div className="space-x-3">
          <button onClick={exportCSV} className="border px-4 py-2 rounded-lg">
            Export Excel
          </button>

          <button
            onClick={() => navigate("/toners/add")}
            className="bg-green-600 text-white px-4 py-2 rounded-lg"
          >
            Add Toner
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              {["Location","Printer","Toner","Color","Qty","Date","Actions"].map(h=>(
                <th key={h} className="px-6 py-4 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id} className="border-t">
                <td className="px-6 py-4">{t.location}</td>
                <td className="px-6 py-4">{t.printerType}</td>
                <td className="px-6 py-4">{t.tonerType}</td>
                <td className="px-6 py-4">{t.colorType}</td>
                <td className="px-6 py-4">{t.quantity}</td>
                <td className="px-6 py-4">{t.dateBrought}</td>
                <td className="px-6 py-4 space-x-3">
                  <button
                    onClick={() => {
                      setEditing(t);
                      navigate("/toners/add");
                    }}
                    className="text-blue-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(t.id)}
                    className="text-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-6 text-gray-500">
                  No toners found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ADD MODAL */}
      {isAddOpen && (
        <AddTonerModal
          existing={editing || undefined}
          onSave={save}
          onClose={() => {
            setEditing(null);
            navigate("/toners");
          }}
        />
      )}
    </div>
  );
}

function Stat({ title, value, color="" }: any) {
  return (
    <div className="bg-white p-5 rounded-xl shadow">
      <p className="text-sm text-gray-500">{title}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}







