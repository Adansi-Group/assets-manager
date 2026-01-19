
// src/components/GadgetsTable.tsx
import type { Gadget } from "../types/gadget";

type Props = {
  gadgets: Gadget[];
};

export default function GadgetsTable({ gadgets }: Props) {
  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-left">Device</th>
            <th>Model</th>
            <th>Serial</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {gadgets.map(g => (
            <tr key={g.id} className="border-t">
              <td className="p-3">{g.deviceType}</td>
              <td>{g.model}</td>
              <td>{g.serialNumber}</td>
              <td>{g.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
