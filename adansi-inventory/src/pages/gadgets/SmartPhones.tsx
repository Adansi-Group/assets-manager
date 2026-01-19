





// pages/gadgets/Smartphones.tsx
import { useOutletContext } from "react-router-dom";
import AddGadgetModal from "../../components/AddGadgetModal";
import { useState } from "react";
import type { GadgetsContextType } from "../gadgets/gadgetsProvider";
import GadgetsTable from "../../components/GadgetsTable";


export default function Smartphones() {
  const { gadgets, addGadget } =
    useOutletContext<GadgetsContextType>();

  const [open, setOpen] = useState(false);

  const phones = gadgets.filter(g => g.deviceType === "Smartphone");

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => setOpen(true)}
        className="bg-green-600 text-white px-5 py-2 rounded"
      >
        Add Smartphone
      </button>

      <GadgetsTable gadgets={phones} />

      {open && (
        <AddGadgetModal
          deviceType="Smartphone"
          onClose={() => setOpen(false)}
          onSave={addGadget}
        />
      )}
    </div>
  );
}






