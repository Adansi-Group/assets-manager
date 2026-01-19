

import { useOutletContext } from "react-router-dom";
import type { Gadget } from "../../types/gadget";

export default function TotalGadgets() {
  const { gadgets } = useOutletContext<{
    gadgets: Gadget[];
    addGadget: (g: Gadget) => void;
  }>();

  const total = gadgets.length;
  const inStock = gadgets.filter(g => g.status === "In-Stock").length;
  const inUse = gadgets.filter(g => g.status === "In-Use").length;
  const faulty = gadgets.filter(g => g.status === "Faulty").length;

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-4 gap-6">
        <Card title="Total Gadgets" value={total} />
        <Card title="In Stock" value={inStock} color="green" />
        <Card title="In Use" value={inUse} color="blue" />
        <Card title="Faulty" value={faulty} color="red" />
      </div>

      <GadgetTable gadgets={gadgets} />
    </div>
  );
}
