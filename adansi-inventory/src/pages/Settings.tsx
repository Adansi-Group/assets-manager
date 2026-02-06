



import { useState, useEffect } from "react";
import { auth } from "../firebase/firebase";
import {
  getNotificationSettings,
  updateNotificationSettings,
  type NotificationSettings,
} from "../services/notificationService";
import { Bell, Mail, MessageSquare, Trash2, User, Save } from "lucide-react";
import Swal from "sweetalert2";

export default function Settings() {
  const [settings, setSettings] = useState<NotificationSettings>({
    emailEnabled: false,
    smsEnabled: false,
    email: "",
    phoneNumber: "",
    thresholds: {
      toner: 20,
      gadget: 5,
      internet: 7,
      a4Sheet: 10,
    },
  });

  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
    const user = auth.currentUser;
    if (user?.email) {
      setUserEmail(user.email);
    }
  }, []);

  async function loadSettings() {
    setLoading(true);
    const data = await getNotificationSettings();
    if (data) {
      setSettings(data);
    }
    setLoading(false);
  }

  async function handleSave() {
    try {
      await updateNotificationSettings(settings);
      Swal.fire({
        icon: "success",
        title: "Settings Saved",
        text: "Your notification settings have been updated",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to save settings",
      });
    }
  }

  async function handleCleanup(type: "toners" | "gadgets" | "internet" | "a4sheets") {
    const result = await Swal.fire({
      title: `Clean Up ${type.charAt(0).toUpperCase() + type.slice(1)}?`,
      html: `
        <p>This will permanently delete all records with:</p>
        <ul style="text-align: left; margin: 1rem 0;">
          <li>Zero quantity (for stock items)</li>
          <li>Exhausted status (for internet usage)</li>
          <li>Old records (optional)</li>
        </ul>
        <p class="text-red-600"><strong>This action cannot be undone!</strong></p>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, clean up",
    });

    if (result.isConfirmed) {
      try {
        // TODO: Implement cleanup logic for each type
        // This would call specific cleanup functions from each service

        Swal.fire({
          icon: "success",
          title: "Cleanup Complete",
          text: `${type} have been cleaned up successfully`,
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Cleanup Failed",
          text: "An error occurred during cleanup",
        });
      }
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-100 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="flex items-center gap-4 mb-6">
            <User className="text-green-600" size={24} />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Profile
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                Email
              </label>
              <input
                type="email"
                value={userEmail}
                disabled
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="flex items-center gap-4 mb-6">
            <Bell className="text-green-600" size={24} />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Notification Settings
            </h2>
          </div>

          <div className="space-y-6">
            {/* Email Notifications */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Mail className="text-blue-600" size={20} />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Email Notifications
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Receive alerts via email
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.emailEnabled}
                    onChange={(e) =>
                      setSettings({ ...settings, emailEnabled: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                </label>
              </div>

              {settings.emailEnabled && (
                <input
                  type="email"
                  value={settings.email || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, email: e.target.value })
                  }
                  placeholder="notification@example.com"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              )}
            </div>

            {/* SMS Notifications */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <MessageSquare className="text-green-600" size={20} />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      SMS Notifications
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Receive alerts via text message
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.smsEnabled}
                    onChange={(e) =>
                      setSettings({ ...settings, smsEnabled: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                </label>
              </div>

              {settings.smsEnabled && (
                <input
                  type="tel"
                  value={settings.phoneNumber || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, phoneNumber: e.target.value })
                  }
                  placeholder="+233 XX XXX XXXX"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              )}
            </div>

            {/* Alert Thresholds */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Alert Thresholds
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Toner Level (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.thresholds.toner}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        thresholds: {
                          ...settings.thresholds,
                          toner: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    A4 Sheets (reams)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.thresholds.a4Sheet}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        thresholds: {
                          ...settings.thresholds,
                          a4Sheet: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Internet (days remaining)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.thresholds.internet}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        thresholds: {
                          ...settings.thresholds,
                          internet: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Gadgets (units)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.thresholds.gadget}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        thresholds: {
                          ...settings.thresholds,
                          gadget: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="mt-6 w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <Save size={18} />
            Save Settings
          </button>
        </div>

        {/* Data Cleanup */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="flex items-center gap-4 mb-6">
            <Trash2 className="text-red-600" size={24} />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Data Cleanup
            </h2>
          </div>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Remove old or empty records to keep your database clean and organized.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleCleanup("toners")}
              className="border-2 border-red-600 text-red-600 px-4 py-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-2"
            >
              <Trash2 size={18} />
              Clean Up Toners
            </button>

            <button
              onClick={() => handleCleanup("gadgets")}
              className="border-2 border-red-600 text-red-600 px-4 py-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-2"
            >
              <Trash2 size={18} />
              Clean Up Gadgets
            </button>

            <button
              onClick={() => handleCleanup("internet")}
              className="border-2 border-red-600 text-red-600 px-4 py-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-2"
            >
              <Trash2 size={18} />
              Clean Up Internet
            </button>

            <button
              onClick={() => handleCleanup("a4sheets")}
              className="border-2 border-red-600 text-red-600 px-4 py-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-2"
            >
              <Trash2 size={18} />
              Clean Up A4 Sheets
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}