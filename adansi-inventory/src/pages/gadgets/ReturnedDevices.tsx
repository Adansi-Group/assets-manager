import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Archive, Edit, Search, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import { roleDeniedMessage } from "../../toners/accessErrors";
import AddReturnedDeviceModal from "../../components/AddReturnedDeviceModal";
import ExportDropdown from "../../components/ExportDropdown";
import Pagination from "../../components/Pagination";
import type { Gadget, LockerAction } from "../../types/gadget";
import { addGadget, deleteGadget, getReturnedDevices, updateGadget } from "../../services/gadgetsService";

const actions: LockerAction[] = ["Available for Reassignment", "Waiting for Repair", "Keep in Locker", "Reassigned", "Sell", "Sold", "Dispose", "Disposed"];

export default function ReturnedDevices() {
  const [devices, setDevices] = useState<Gadget[]>([]);
  const [editing, setEditing] = useState<Gadget | null>(null);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const location = useLocation();
  const navigate = useNavigate();
  const isAddOpen = location.pathname === "/gadgets/returned/add";

  async function loadDevices() {
    setLoading(true);
    setDevices(await getReturnedDevices());
    setLoading(false);
  }

  useEffect(() => { void loadDevices(); }, []);

  async function handleSave(gadget: Gadget | Omit<Gadget, "id">) {
    try {
      if ("id" in gadget) await updateGadget(gadget);
      else await addGadget(gadget);
      await loadDevices();
      setEditing(null);
      navigate("/gadgets/returned");
      void Swal.fire({ icon: "success", title: "id" in gadget ? "Device Updated" : "Device Recorded", timer: 1500, showConfirmButton: false });
    } catch (error) {
      void Swal.fire({ icon: "error", title: "Could not save device", text: roleDeniedMessage(error, "gadgets") ?? "Please check the details and try again." });
    }
  }

  async function handleRemove(id: string) {
    const result = await Swal.fire({ title: "Delete this locker record?", text: "This permanently removes the device record.", icon: "warning", showCancelButton: true, confirmButtonColor: "#dc2626", confirmButtonText: "Delete record" });
    if (!result.isConfirmed) return;
    try {
      await deleteGadget(id);
      await loadDevices();
      void Swal.fire({ icon: "success", title: "Record deleted", timer: 1200, showConfirmButton: false });
    } catch (error) {
      void Swal.fire({ icon: "error", title: "Could not delete record", text: roleDeniedMessage(error, "gadgets") ?? "Please try again." });
    }
  }

  const normalizedSearch = search.toLowerCase();
  const filtered = devices.filter((d) => {
    const matchesSearch = `${d.model} ${d.serialNumber || ""} ${d.imei1 || ""} ${d.returnedFrom || ""} ${d.formerDepartment || ""} ${d.lockerReason || ""} ${d.lockerCondition || ""}`.toLowerCase().includes(normalizedSearch);
    const effectiveAction = d.lockerAction || (d.status === "In-Use" ? "Reassigned" : "Available for Reassignment");
    return matchesSearch && (actionFilter === "All" || effectiveAction === actionFilter);
  });
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const countAction = (values: string[]) => devices.filter((d) => values.includes(d.lockerAction || (d.status === "In-Use" ? "Reassigned" : "Available for Reassignment"))).length;
  const available = countAction(["Available for Reassignment"]);
  const repair = countAction(["Waiting for Repair"]);
  const damaged = devices.filter((d) => d.lockerCondition === "Damaged" || (!d.lockerCondition && d.condition === "Poor")).length;
  const outdated = devices.filter((d) => d.lockerCondition === "Outdated" || d.lockerReason === "Outdated").length;
  const closed = countAction(["Sold", "Disposed"]);

  const exportColumns = [
    { key: "deviceType", label: "Device Type" }, { key: "model", label: "Model" },
    { key: "serialNumber", label: "Serial Number" }, { key: "imei1", label: "IMEI" },
    { key: "lockerReason", label: "Reason" }, { key: "lockerCondition", label: "Condition" },
    { key: "lockerAction", label: "Current Action" }, { key: "lockerDate", label: "Locker Date" },
    { key: "lockerLocation", label: "Location" }, { key: "returnedFrom", label: "Previous User" },
    { key: "formerDepartment", label: "Department" }, { key: "reassignedTo", label: "Reassigned To" },
    { key: "outcomeDate", label: "Outcome Date" }, { key: "notes", label: "Notes" },
  ];

  if (loading) return <div className="p-6 flex items-center justify-center h-96"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto" /><p className="mt-4 text-gray-600 dark:text-gray-400">Loading locker devices...</p></div></div>;

  return (
    <div className="p-6 space-y-6 bg-gray-100 dark:bg-gray-900 min-h-full">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Locker Devices</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Inactive laptops and phones kept for reassignment, repair, sale, or disposal. These are excluded from active gadget totals.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Stat title="Total in Register" value={devices.length} icon={<Archive size={20} />} />
        <Stat title="Available" value={available} color="text-green-600" />
        <Stat title="Awaiting Repair" value={repair} color="text-amber-600" />
        <Stat title="Damaged" value={damaged} color="text-red-600" />
        <Stat title="Outdated" value={outdated} color="text-orange-600" />
        <Stat title="Sold / Disposed" value={closed} color="text-gray-600 dark:text-gray-300" />
      </div>

      <div className="flex flex-col xl:flex-row justify-between gap-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative w-full md:w-96"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={19} /><input value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} placeholder="Search model, serial, IMEI or previous user..." className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></div>
          <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1); }} className="border dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"><option>All</option>{actions.map((a) => <option key={a}>{a}</option>)}</select>
        </div>
        <div className="flex gap-3"><ExportDropdown data={filtered} filename={`Locker_Devices_${new Date().toISOString().split("T")[0]}`} columns={exportColumns} /><button onClick={() => navigate("/gadgets/returned/add")} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 whitespace-nowrap">Record Locker Device</button></div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-100 dark:bg-gray-700"><tr>{["Device", "Serial / IMEI", "Reason", "Condition", "Current Action", "Previous User", "Locker Details", "Actions"].map((h) => <th key={h} className="px-5 py-3 text-left text-gray-900 dark:text-white whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>{paginatedData.map((d) => {
            const action = d.lockerAction || (d.status === "In-Use" ? "Reassigned" : "Available for Reassignment");
            return <tr key={d.id} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="px-5 py-4"><div className="font-medium text-gray-900 dark:text-white">{d.model}</div><div className="text-xs text-gray-500">{d.deviceType === "Smartphone" ? "Phone" : d.deviceType} · {d.year}</div></td>
              <td className="px-5 py-4 font-mono text-xs text-gray-600 dark:text-gray-300">{d.serialNumber || d.imei1 || "—"}</td>
              <td className="px-5 py-4 text-gray-700 dark:text-gray-300">{d.lockerReason || (d.returnedFrom ? "Staff Left" : "—")}</td>
              <td className="px-5 py-4"><ConditionBadge condition={d.lockerCondition || (d.condition === "Poor" ? "Damaged" : d.condition || "Good")} /></td>
              <td className="px-5 py-4"><ActionBadge action={action} />{action === "Reassigned" && d.reassignedTo && <div className="text-xs mt-1 text-gray-500">to {d.reassignedTo}</div>}</td>
              <td className="px-5 py-4 text-gray-700 dark:text-gray-300"><div>{d.returnedFrom || "—"}</div>{d.formerDepartment && <div className="text-xs text-gray-500">{d.formerDepartment}</div>}</td>
              <td className="px-5 py-4 text-gray-700 dark:text-gray-300"><div>{d.lockerDate ? new Date(`${d.lockerDate}T00:00:00`).toLocaleDateString() : "—"}</div><div className="text-xs text-gray-500">{d.lockerLocation || "Location not set"}</div></td>
              <td className="px-5 py-4"><div className="flex gap-2"><button onClick={() => { setEditing(d); navigate("/gadgets/returned/add"); }} className="text-green-600 hover:text-green-800" title="Edit"><Edit size={18} /></button><button onClick={() => void handleRemove(d.id)} className="text-red-600 hover:text-red-800" title="Delete"><Trash2 size={18} /></button></div></td>
            </tr>;
          })}{paginatedData.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-gray-400">{search || actionFilter !== "All" ? "No locker devices match your filters." : "No locker devices recorded yet."}</td></tr>}</tbody>
        </table></div>
        {filtered.length > 0 && <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={(value) => { setItemsPerPage(value); setCurrentPage(1); }} />}
      </div>

      {isAddOpen && <AddReturnedDeviceModal existing={editing || undefined} onSubmit={handleSave} onClose={() => { setEditing(null); navigate("/gadgets/returned"); }} />}
    </div>
  );
}

function Stat({ title, value, color = "", icon }: { title: string; value: number; color?: string; icon?: ReactNode }) {
  return <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-gray-200 dark:border-gray-700"><div className="flex justify-between"><p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>{icon && <span className="text-gray-400">{icon}</span>}</div><p className={`text-2xl font-bold mt-2 ${color || "text-gray-900 dark:text-white"}`}>{value}</p></div>;
}

function ConditionBadge({ condition }: { condition: string }) {
  const color = condition === "Good" ? "bg-green-100 text-green-700" : condition === "Repairable" ? "bg-amber-100 text-amber-700" : condition === "Damaged" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700";
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${color}`}>{condition}</span>;
}

function ActionBadge({ action }: { action: string }) {
  const color = action === "Available for Reassignment" ? "bg-green-100 text-green-700" : action === "Waiting for Repair" ? "bg-amber-100 text-amber-700" : action === "Reassigned" ? "bg-blue-100 text-blue-700" : ["Sold", "Disposed"].includes(action) ? "bg-gray-200 text-gray-700" : "bg-purple-100 text-purple-700";
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${color}`}>{action}</span>;
}
