


import { useEffect, useState } from "react";
import type { Notification } from "../types/notification";

export default function NotificationsDropdown({
  onClose,
}: {
  onClose: () => void;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const stored = JSON.parse(
      localStorage.getItem("notifications") || "[]"
    );
    setNotifications(stored);
  }, []);

  function markAsRead(id: string) {
    const updated = notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    );
    setNotifications(updated);
    localStorage.setItem(
      "notifications",
      JSON.stringify(updated)
    );
  }

  function clearAll() {
    localStorage.setItem("notifications", "[]");
    setNotifications([]);
  }

  return (
    <div className="absolute right-0 top-12 w-80 bg-white shadow-xl rounded-xl overflow-hidden z-50">
      <div className="flex justify-between items-center px-4 py-3 border-b">
        <h4 className="font-semibold">Notifications</h4>
        <button
          onClick={clearAll}
          className="text-xs text-red-500 hover:underline"
        >
          Clear all
        </button>
      </div>

      {notifications.length === 0 ? (
        <p className="p-4 text-sm text-gray-500">
          No notifications
        </p>
      ) : (
        <ul className="max-h-80 overflow-y-auto">
          {notifications.map(n => (
            <li
              key={n.id}
              onClick={() => markAsRead(n.id)}
              className={`px-4 py-3 border-b cursor-pointer ${
                n.read
                  ? "bg-white"
                  : "bg-green-50"
              } hover:bg-gray-50`}
            >
              <p className="text-sm">{n.message}</p>
              <p className="text-xs text-gray-400">
                {n.time}
              </p>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={onClose}
        className="w-full text-center text-sm py-2 bg-gray-100 hover:bg-gray-200"
      >
        Close
      </button>
    </div>
  );
}
