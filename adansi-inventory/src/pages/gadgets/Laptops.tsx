






// pages/gadgets/Laptops.tsx
import { useOutletContext } from "react-router-dom";
import AddGadgetModal from "../../components/AddGadgetModal";
import { useState } from "react";
import type { GadgetsContextType } from "../gadgets/gadgetsProvider";
import GadgetsTable from "../../components/GadgetsTable";


export default function Laptops() {
  const { gadgets, addGadget } =
    useOutletContext<GadgetsContextType>();

  const [open, setOpen] = useState(false);

  const laptops = gadgets.filter(g => g.deviceType === "Laptop");

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => setOpen(true)}
        className="bg-green-700 text-white px-5 py-2 rounded"
      >
        Add Laptop
      </button>

      <GadgetsTable gadgets={laptops} />

      {open && (
        <AddGadgetModal
          deviceType="Laptop"
          onClose={() => setOpen(false)}
          onSave={addGadget}
        />
      )}
    </div>
  );
}







