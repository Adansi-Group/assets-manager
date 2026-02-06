import { useEffect, useState } from "react";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  type Notification,
} from "../services/notificationService";
import { Bell, X, Trash2 } from "lucide-react";

export default function NotificationsDropdown({
  onClose,
}: {
  onClose: () => void;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();

    // Listen for new notifications
    const handleNewNotification = () => {
      loadNotifications();
    };

    window.addEventListener("notification-added", handleNewNotification);

    return () => {
      window.removeEventListener("notification-added", handleNewNotification);
    };
  }, []);

  async function loadNotifications() {
    setLoading(true);
    const data = await getNotifications();
    setNotifications(data);
    setLoading(false);
  }

  async function handleMarkAsRead(id: string) {
    await markAsRead(id);
    await loadNotifications();
  }

  async function handleClearAll() {
    await markAllAsRead();
    await loadNotifications();
  }

  function getSeverityColor(severity?: string) {
    switch (severity) {
      case "critical":
        return "bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500";
      case "low":
        return "bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500";
      default:
        return "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500";
    }
  }

  function getSeverityIcon(severity?: string) {
    switch (severity) {
      case "critical":
        return "🔴";
      case "low":
        return "🟡";
      default:
        return "🔵";
    }
  }

  function formatTime(createdAt: string) {
    const date = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Dropdown */}
      <div className="absolute right-0 top-12 w-96 bg-white dark:bg-gray-800 shadow-2xl rounded-xl overflow-hidden z-50 border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-green-600 text-white">
          <div className="flex items-center gap-2">
            <Bell size={18} />
            <h4 className="font-semibold">Notifications</h4>
            {notifications.filter((n) => !n.read).length > 0 && (
              <span className="bg-white text-green-600 text-xs px-2 py-0.5 rounded-full font-bold">
                {notifications.filter((n) => !n.read).length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="hover:bg-green-700 p-1 rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No notifications yet
            </p>
          </div>
        ) : (
          <>
            <ul className="max-h-96 overflow-y-auto">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  onClick={() => !n.read && handleMarkAsRead(n.id)}
                  className={`px-4 py-3 border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-colors ${
                    n.read
                      ? "bg-white dark:bg-gray-800"
                      : getSeverityColor(n.severity)
                  } hover:bg-gray-50 dark:hover:bg-gray-700`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">
                      {getSeverityIcon(n.severity)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {n.title}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                        {n.message}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(n.createdAt)}
                        </p>
                        {n.type && (
                          <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">
                            {n.type}
                          </span>
                        )}
                        {!n.read && (
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                            • New
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Footer Actions */}
            <div className="p-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleClearAll}
                className="w-full flex items-center justify-center gap-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 py-2 rounded-lg transition-colors"
              >
                <Trash2 size={14} />
                Mark All as Read
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

