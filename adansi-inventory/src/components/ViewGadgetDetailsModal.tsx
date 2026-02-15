

// src/components/ViewGadgetDetailsModal.tsx - WITH GENDER FIELD

import { X } from "lucide-react";
import type { Gadget } from "../types/gadget";

type Props = {
  gadget: Gadget;
  onClose: () => void;
  onEdit: () => void;
};

export default function ViewGadgetDetailsModal({ gadget, onClose, onEdit }: Props) {
  const isAccessory = gadget.deviceType === "Accessory";

  return (
    <>
      {/* BACKDROP */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* MODAL */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-3xl shadow-2xl relative">
          {/* HEADER */}
          <div className="bg-green-600 text-white p-6 rounded-t-2xl relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white hover:text-gray-200"
            >
              <X size={24} />
            </button>
            
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl">
                {gadget.deviceType === "Laptop" ? "💻" : 
                 gadget.deviceType === "Smartphone" ? "📱" : "🔌"}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{gadget.model}</h2>
                <p className="text-green-100">{gadget.deviceType}</p>
              </div>
            </div>
          </div>

          {/* CONTENT */}
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* STATUS & YEAR */}
            <div className="flex gap-3">
              <StatusBadge status={gadget.status} />
              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                • Year: {gadget.year}
              </span>
              {isAccessory && gadget.condition && (
                <ConditionBadge condition={gadget.condition} />
              )}
            </div>

            {/* SPECIFICATIONS */}
            {!isAccessory && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h3 className="font-semibold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="text-purple-600 dark:text-purple-400">📊</span>
                  Specifications
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem label="Serial Number" value={gadget.serialNumber} />
                  <InfoItem label="Processor" value={gadget.processor} />
                  <InfoItem label="Storage" value={gadget.storage} />
                </div>
              </div>
            )}

            {/* ACCESSORY DETAILS */}
            {isAccessory && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h3 className="font-semibold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="text-orange-600 dark:text-orange-400">🔌</span>
                  Accessory Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem label="Type" value={gadget.accessoryType} />
                  <InfoItem label="Quantity" value={gadget.quantity?.toString()} />
                  <InfoItem label="Specifications" value={gadget.specifications} />
                  <InfoItem label="Compatible With" value={gadget.compatibleWith} />
                  <InfoItem label="Purchase Date" value={gadget.purchaseDate} />
                  <InfoItem label="Storage Location" value={gadget.location} />
                </div>
              </div>
            )}

            {/* ASSIGNMENT - WITH GENDER */}
            {gadget.status === "In-Use" && (gadget.assignedTo || gadget.assignedDate || gadget.gender) && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="text-blue-600 dark:text-blue-400">👤</span>
                  Assignment
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem label="Assigned To" value={gadget.assignedTo} icon="👤" />
                  <InfoItem label="Assigned Date" value={gadget.assignedDate} icon="📅" />
                  {gadget.gender && (
                    <InfoItem 
                      label="Gender" 
                      value={gadget.gender} 
                      icon={gadget.gender === "Male" ? "👨" : gadget.gender === "Female" ? "👩" : "👤"} 
                    />
                  )}
                </div>
              </div>
            )}

            {/* NOTES */}
            {gadget.notes && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h3 className="font-semibold mb-2 text-gray-900 dark:text-white flex items-center gap-2">
                  <span>📝</span>
                  Notes
                </h3>
                <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
                  {gadget.notes}
                </p>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
            >
              Close
            </button>
            <button
              onClick={onEdit}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Edit Gadget
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* HELPER COMPONENTS */

function InfoItem({ label, value, icon }: { label: string; value?: string; icon?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
        {icon && <span>{icon}</span>}
        {value || "—"}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: "In-Stock" | "In-Use" | "Faulty" }) {
  const colors = {
    "In-Stock": "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    "In-Use": "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    Faulty: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[status]}`}>
      {status}
    </span>
  );
}

function ConditionBadge({ condition }: { condition: "New" | "Good" | "Fair" | "Poor" }) {
  const colors = {
    New: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    Good: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    Fair: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    Poor: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[condition]}`}>
      {condition}
    </span>
  );
}