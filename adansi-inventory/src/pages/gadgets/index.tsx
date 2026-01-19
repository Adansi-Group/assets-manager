






import { useOutletContext } from "react-router-dom";
import { useState } from "react";
import AddGadgetModal from "../../components/AddGadgetModal";
import GadgetsTable from "../../components/GadgetsTable";
import Card from "../../components/Card";
import type { GadgetsContextType } from "../gadgets/gadgetsProvider";

export default function Gadgets() {
  const { gadgets, addGadget } =
    useOutletContext<GadgetsContextType>();

  const [showAdd, setShowAdd] = useState(false);
  const [deviceType, setDeviceType] =
    useState<"Laptop" | "Smartphone">("Laptop");

  return (
    <div className="p-6 space-y-6">
      {/* DASHBOARD */}
      <div className="grid grid-cols-4 gap-6">
        <Card title="Total Gadgets" value={gadgets.length} />
        <Card
          title="In Stock"
          value={gadgets.filter(g => g.status === "In-Stock").length}
          color="green"
        />
        <Card
          title="In Use"
          value={gadgets.filter(g => g.status === "In-Use").length}
          color="blue"
        />
        <Card
          title="Faulty"
          value={gadgets.filter(g => g.status === "Faulty").length}
          color="red"
        />
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex gap-4">
        <button
          onClick={() => {
            setDeviceType("Smartphone");
            setShowAdd(true);
          }}
          className="bg-green-600 text-white px-5 py-2 rounded"
        >
          Add Smartphone
        </button>

        <button
          onClick={() => {
            setDeviceType("Laptop");
            setShowAdd(true);
          }}
          className="bg-green-700 text-white px-5 py-2 rounded"
        >
          Add Laptop
        </button>
      </div>

      {/* TABLE */}
      <GadgetsTable gadgets={gadgets} />

      {showAdd && (
        <AddGadgetModal
          deviceType={deviceType}
          onClose={() => setShowAdd(false)}
          onSave={addGadget}
        />
      )}
    </div>
  );
}

