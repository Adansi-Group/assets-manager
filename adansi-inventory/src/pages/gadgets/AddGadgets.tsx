
import { useState } from "react";
import AddGadgetModal from "../../components/AddGadgetModal";
import type { Gadget } from "../../types/gadget";

export default function AddGadgets() {
  const [open, setOpen] = useState(true);
  const [gadgets, setGadgets] = useState<Gadget[]>([]);

  function handleSave(gadget: Gadget) {
    setGadgets(prev => [...prev, gadget]);
  }

  return (
    <>
      {open && (
        <AddGadgetModal
          deviceType="Laptop"   // ✅ REQUIRED
          onClose={() => setOpen(false)}
          onSave={handleSave}
        />
      )}
    </>
  );
}