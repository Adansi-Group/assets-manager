










import { useState, useEffect } from "react";
import { auth } from "../firebase/firebase";
import {
  getNotificationSettings,
  updateNotificationSettings,
  type NotificationSettings,
} from "../services/notificationService";
import { Bell, Mail, MessageSquare, Trash2, User, Save, X, Plus } from "lucide-react";
import Swal from "sweetalert2";
import { migrateLocationNames } from '../services/locationMigration';
import { Droplets, Smartphone, Wifi, FileText, AlertCircle, CheckCircle } from "lucide-react";

export default function Settings() {
  const [settings, setSettings] = useState<NotificationSettings>({
    emailEnabled: false,
    smsEnabled: false,
    emails: [],
    phoneNumbers: [],
    thresholds: {
      toner: 20,
      gadget: 5,
      internet: 7,
      a4Sheet: 10,
    },
  });

  const [emailInput, setEmailInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);

  // ✅ PHONE NUMBER HELPERS (No Twilio needed!)
  function formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // If starts with 0, replace with +233 (Ghana)
    if (cleaned.startsWith('0')) {
      return '+233' + cleaned.slice(1);
    }
    
    // If starts with 233, add +
    if (cleaned.startsWith('233')) {
      return '+' + cleaned;
    }
    
    // If doesn't start with +, assume it needs +233
    if (!phone.startsWith('+')) {
      return '+233' + cleaned;
    }
    
    return phone;
  }

  function isValidPhoneNumber(phone: string): boolean {
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // Check if it's a valid format
    // Should be +233XXXXXXXXX (13 chars) or similar international format
    if (cleaned.startsWith('+233')) {
      return cleaned.length === 13; // +233 + 9 digits
    }
    
    // Check if it starts with + and has reasonable length
    if (cleaned.startsWith('+')) {
      return cleaned.length >= 11 && cleaned.length <= 15;
    }
    
    return false;
  }

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
      // Ensure emails and phoneNumbers are always arrays
      if (!Array.isArray(data.emails)) {
        console.log("⚠️ Fixing emails format");
        data.emails = [];
      }
      if (!Array.isArray(data.phoneNumbers)) {
        console.log("⚠️ Fixing phoneNumbers format");
        data.phoneNumbers = [];
      }
      setSettings(data);
    }
    setLoading(false);
  }

  function addEmail() {
    const trimmed = emailInput.trim();
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      Swal.fire({
        icon: "error",
        title: "Invalid Email",
        text: "Please enter a valid email address",
      });
      return;
    }

    // Check for duplicates
    if (settings.emails.includes(trimmed)) {
      Swal.fire({
        icon: "warning",
        title: "Duplicate Email",
        text: "This email is already in the list",
      });
      return;
    }

    setSettings({
      ...settings,
      emails: [...settings.emails, trimmed],
    });
    setEmailInput("");
  }

  function removeEmail(emailToRemove: string) {
    setSettings({
      ...settings,
      emails: settings.emails.filter((e) => e !== emailToRemove),
    });
  }

  function addPhone() {
    const trimmed = phoneInput.trim();
    
    // Format to E.164
    const formatted = formatPhoneNumber(trimmed);
    
    // Validate phone number
    if (!isValidPhoneNumber(formatted)) {
      Swal.fire({
        icon: "error",
        title: "Invalid Phone Number",
        text: "Please enter a valid phone number (e.g., 0244123456 or +233244123456)",
      });
      return;
    }

    // Check for duplicates
    if (settings.phoneNumbers.includes(formatted)) {
      Swal.fire({
        icon: "warning",
        title: "Duplicate Phone Number",
        text: "This phone number is already in the list",
      });
      return;
    }

    setSettings({
      ...settings,
      phoneNumbers: [...settings.phoneNumbers, formatted],
    });
    setPhoneInput("");
  }

  function removePhone(phoneToRemove: string) {
    setSettings({
      ...settings,
      phoneNumbers: settings.phoneNumbers.filter((p) => p !== phoneToRemove),
    });
  }

  async function handleSave() {
    // Validate that at least one email is provided if email notifications are enabled
    if (settings.emailEnabled && settings.emails.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No Email Recipients",
        text: "Please add at least one email address for notifications",
      });
      return;
    }

    // Validate that at least one phone is provided if SMS notifications are enabled
    if (settings.smsEnabled && settings.phoneNumbers.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No Phone Numbers",
        text: "Please add at least one phone number for SMS notifications",
      });
      return;
    }

    console.log("💾 Saving settings:", settings);
    console.log("📧 Emails to save:", settings.emails);
    console.log("📱 Phone numbers to save:", settings.phoneNumbers);

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
      console.error("❌ Save error:", error);
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
                      Receive alerts via email (multiple recipients supported)
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
                <div className="space-y-4">
                  {/* Email Input */}
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addEmail();
                        }
                      }}
                      placeholder="Add email (e.g., boss@company.com)"
                      className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={addEmail}
                      className="bg-green-600 text-white px-4 rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <Plus size={18} />
                      Add
                    </button>
                  </div>

                  {/* Email List */}
                  {settings.emails.length > 0 && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Recipients ({settings.emails.length})
                      </label>
                      <div className="space-y-2">
                        {settings.emails.map((email) => (
                          <div
                            key={email}
                            className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg"
                          >
                            <span className="text-gray-900 dark:text-white">
                              {email}
                            </span>
                            <button
                              onClick={() => removeEmail(email)}
                              className="text-red-600 hover:text-red-700 p-1"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {settings.emails.length === 0 && (
                    <p className="text-sm text-yellow-600 dark:text-yellow-500">
                      ⚠️ No email recipients added yet
                    </p>
                  )}
                </div>
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
                      Receive alerts via text message (multiple recipients supported)
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
                <div className="space-y-4">
                  {/* Phone Input */}
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addPhone();
                        }
                      }}
                      placeholder="Add phone number (e.g., 0244123456 or +233244123456)"
                      className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={addPhone}
                      className="bg-green-600 text-white px-4 rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <Plus size={18} />
                      Add
                    </button>
                  </div>

                  {/* Phone List */}
                  {settings.phoneNumbers.length > 0 && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Recipients ({settings.phoneNumbers.length})
                      </label>
                      <div className="space-y-2">
                        {settings.phoneNumbers.map((phone) => (
                          <div
                            key={phone}
                            className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg"
                          >
                            <span className="text-gray-900 dark:text-white font-mono">
                              {phone}
                            </span>
                            <button
                              onClick={() => removePhone(phone)}
                              className="text-red-600 hover:text-red-700 p-1"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {settings.phoneNumbers.length === 0 && (
                    <p className="text-sm text-yellow-600 dark:text-yellow-500">
                      ⚠️ No phone numbers added yet
                    </p>
                  )}

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      💡 <strong>Tip:</strong> Phone numbers are automatically formatted to international format (+233XXXXXXXXX)
                    </p>
                  </div>
                </div>
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
          <div className="flex items-center gap-4 mb-4">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <Trash2 className="text-red-600" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Database Cleanup
              </h2>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Remove unused records to optimize performance
              </p>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={16} />
              <p className="text-xs text-blue-900 dark:text-blue-300">
                Removes empty records, exhausted items, and old data. This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            
            {/* Toners */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded">
                  <Droplets className="text-purple-600 dark:text-purple-400" size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                    Toners
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    Empty stock
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleCleanup("toners")}
                className="w-full bg-purple-600 text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-1"
              >
                <Trash2 size={14} />
                Clean Up
              </button>
            </div>

            {/* Gadgets */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded">
                  <Smartphone className="text-blue-600 dark:text-blue-400" size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                    Gadgets
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    Retired items
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleCleanup("gadgets")}
                className="w-full bg-blue-600 text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
              >
                <Trash2 size={14} />
                Clean Up
              </button>
            </div>

            {/* Internet */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded">
                  <Wifi className="text-green-600 dark:text-green-400" size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                    Internet
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    Exhausted bundles
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleCleanup("internet")}
                className="w-full bg-green-600 text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
              >
                <Trash2 size={14} />
                Clean Up
              </button>
            </div>

            {/* A4 Sheets */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded">
                  <FileText className="text-orange-600 dark:text-orange-400" size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                    A4 Sheets
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    Zero quantity
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleCleanup("a4sheets")}
                className="w-full bg-orange-600 text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-orange-700 transition-colors flex items-center justify-center gap-1"
              >
                <Trash2 size={14} />
                Clean Up
              </button>
            </div>

            <button
  onClick={async () => {
    const confirm = await Swal.fire({
      title: 'Migrate Location Names?',
      text: 'This will update: Tema → Tema Branch, Botwe → Ashaley Botwe Branch, etc.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, migrate!',
      confirmButtonColor: '#16a34a',
    });

    if (confirm.isConfirmed) {
      Swal.fire({
        title: 'Migrating...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const result = await migrateLocationNames();
      
      if (result.success) {
        Swal.fire({
          icon: 'success',
          title: 'Done!',
          html: `✅ ${result.tonersUpdated} toners updated<br>✅ ${result.printersUpdated} printers updated`,
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Failed',
          text: result.error,
        });
      }
    }
  }}
  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
>
  🔄 Migrate Location Names to Branch
</button>

          </div>
        </div>
      </div>
    </div>
  );
}