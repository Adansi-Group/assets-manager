





// pages/gadgets/GadgetsProvider.tsx
import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import type { Gadget } from "../../types/gadget";

export type GadgetsContextType = {
  gadgets: Gadget[];
  addGadget: (g: Gadget) => void;
};

export default function GadgetsProvider() {
  const [gadgets, setGadgets] = useState<Gadget[]>(() => {
    const saved = localStorage.getItem("gadgets");
    return saved ? JSON.parse(saved) : [
      {
        id: 1,
        deviceType: "Laptop",
        model: "MacBook Air",
        serialNumber: "FVFCJXMM6KJ",
        processor: "Intel",
        storage: "8GB/500GB",
        year: 2020,
        status: "In-Stock",
      },
    ];
  });

  function addGadget(gadget: Gadget) {
    setGadgets(prev => [...prev, gadget]);
  }

  // 🔒 Persist on change
  useEffect(() => {
    localStorage.setItem("gadgets", JSON.stringify(gadgets));
  }, [gadgets]);

  return <Outlet context={{ gadgets, addGadget }} />;
}






