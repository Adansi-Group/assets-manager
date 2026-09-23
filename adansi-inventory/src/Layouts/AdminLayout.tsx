





import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import NotificationsDropdown from "../components/NotificationsDropdown";
import ThemeSwitcher from "../components/ThemeSwitcher";
import { auth } from "../firebase/firebase";
import { logout } from "../services/authService";
import type { User, Permission } from "../types/users";
import { hasPermission } from "../types/users";
import Swal from "sweetalert2";

import {
  LayoutDashboard,
  Printer,
  Bell,
  LogOut,
  ChevronDown,
  Droplet,
  Wifi,
  FileText,
  Settings as SettingsIcon,
  BarChart3,
  Headphones,
  MonitorSmartphone,
  Users as UsersIcon,
  Package,
} from "lucide-react";

interface Props {
  currentUser: User | null;
}

export default function AdminLayout({ currentUser }: Props) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [tonerOpen, setTonerOpen] = useState(() => pathname.startsWith("/toners"));
  const [gadgetsOpen, setGadgetsOpen] = useState(() => pathname.startsWith("/gadgets"));
  const [inventoryOpen, setInventoryOpen] = useState(() => pathname.startsWith("/inventory")); // NEW!

  const [showNotifications, setShowNotifications] = useState(false);
  const userPhoto = auth.currentUser?.photoURL ?? null;
  const userInitials = (
    auth.currentUser?.displayName?.trim()[0] ??
    auth.currentUser?.email?.[0] ??
    "A"
  ).toUpperCase();
  const unreadCount = (() => {
    const stored = JSON.parse(localStorage.getItem("notifications") || "[]") as Array<{ read?: boolean }>;
    return stored.filter((n) => !n.read).length;
  })();

  const isTonerOpen = tonerOpen || pathname.startsWith("/toners");
  const isGadgetsOpen = gadgetsOpen || pathname.startsWith("/gadgets");
  const isInventoryOpen = inventoryOpen || pathname.startsWith("/inventory");

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  async function handleLogout() {
    const result = await Swal.fire({
      title: "Logout?",
      text: "Are you sure you want to logout?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#dc2626",
      confirmButtonText: "Yes, logout",
    });

    if (result.isConfirmed) {
      try {
        await logout();
        navigate("/");
        Swal.fire({
          icon: "success",
          title: "Logged out successfully",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Logout failed",
          text: "Please try again",
        });
      }
    }
  }

  const canAccess = (permission: string) => {
    if (!currentUser) return false;
    return hasPermission(currentUser, permission as Permission);
  };

  const pageTitleMap: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/printers": "Printers",
    "/toners": "Toners",
    "/toners/add": "Add Toner",
    "/toners/history": "Replacement History",
    "/gadgets": "Gadgets",
    "/gadgets/phones": "Smartphones",
    "/gadgets/laptops": "Laptops",
    "/gadgets/accessories": "Accessories",
    "/gadgets/returned": "Locker Devices",
    "/profile": "My Profile",
    "/internet-usage": "Internet Usage",
    "/a4-sheets": "A4 Sheets",
    "/inventory": "Inventory & Store",
    "/inventory/electronics": "Electronics & Equipment",
    "/inventory/furniture": "Furniture",
    "/inventory/safety": "Safety Equipment",
    "/inventory/office-supplies": "Office Supplies",
    "/inventory/consumables": "Consumables",
    "/inventory/cleaning": "Cleaning & Hygiene",
    "/reports": "Reports & Analytics",
    "/reports/toners": "Toner Reports",
    "/reports/gadgets": "Gadget Reports",
    "/reports/internet": "Internet Reports",
    "/reports/a4sheets": "A4 Sheet Reports",
    "/reports/consumables": "Consumables Management Report",
    "/reports/consolidated": "Consolidated Report",
    "/users": "User Management",
    "/settings": "Settings",
  };

  const pageTitle =
    pageTitleMap[pathname] ??
    pathname
      .split("/")
      .pop()
      ?.replace("-", " ")
      ?.replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* SIDEBAR */}
      <aside className="w-64 bg-gradient-to-b from-green-700 to-green-900 dark:from-gray-800 dark:to-gray-900 text-white flex flex-col">
        <div className="px-6 py-5">
          <div className="text-xl font-bold">Assets Station</div>
          {currentUser && (
            <div className="mt-3 pt-3 border-t border-green-600 dark:border-gray-700">
              <p className="text-sm text-green-100 dark:text-gray-300">{currentUser.name}</p>
              <p className="text-xs text-green-200 dark:text-gray-400">{currentUser.role}</p>
            </div>
          )}
        </div>

        <nav className="px-4 space-y-2 flex-1 overflow-y-auto">
          {/* Dashboard */}
          <Link
            to="/dashboard"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
              isActive("/dashboard")
                ? "bg-green-600 dark:bg-gray-700"
                : "hover:bg-green-800 dark:hover:bg-gray-700"
            }`}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </Link>

          {/* Printers */}
          {canAccess("view_printers") && (
            <Link
              to="/printers"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                isActive("/printers")
                  ? "bg-green-600 dark:bg-gray-700"
                  : "hover:bg-green-800 dark:hover:bg-gray-700"
              }`}
            >
              <Printer size={18} />
              Printers
            </Link>
          )}

          {/* TONERS DROPDOWN */}
          {canAccess("view_toners") && (
            <div>
              <button
                onClick={() => setTonerOpen(!isTonerOpen)}
                className={`flex items-center justify-between w-full px-4 py-3 rounded-lg ${
                  pathname.startsWith("/toners")
                    ? "bg-green-600 dark:bg-gray-700"
                    : "hover:bg-green-800 dark:hover:bg-gray-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Droplet size={18} />
                  Toners
                </div>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${isTonerOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isTonerOpen && (
                <div className="ml-9 mt-1 space-y-1">
                  <Link
                    to="/toners"
                    className={`block px-3 py-2 rounded text-sm ${
                      pathname === "/toners"
                        ? "bg-green-600 dark:bg-gray-700"
                        : "hover:bg-green-800 dark:hover:bg-gray-700"
                    }`}
                  >
                    View All Toners
                  </Link>
                  <Link
                    to="/toners/history"
                    className={`block px-3 py-2 rounded text-sm ${
                      isActive("/toners/history")
                        ? "bg-green-600 dark:bg-gray-700"
                        : "hover:bg-green-800 dark:hover:bg-gray-700"
                    }`}
                  >
                    Replacement History
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* GADGETS DROPDOWN */}
          {canAccess("view_gadgets") && (
            <div>
              <button
                onClick={() => setGadgetsOpen(!isGadgetsOpen)}
                className={`flex items-center justify-between w-full px-4 py-3 rounded-lg ${
                  pathname.startsWith("/gadgets")
                    ? "bg-green-600 dark:bg-gray-700"
                    : "hover:bg-green-800 dark:hover:bg-gray-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <MonitorSmartphone size={18} />
                  Gadgets
                </div>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${isGadgetsOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isGadgetsOpen && (
                <div className="ml-9 mt-1 space-y-1">
                  <Link
                    to="/gadgets"
                    className={`block px-3 py-2 rounded text-sm ${
                      pathname === "/gadgets"
                        ? "bg-green-600 dark:bg-gray-700"
                        : "hover:bg-green-800 dark:hover:bg-gray-700"
                    }`}
                  >
                    View All Gadgets
                  </Link>
                  <Link
                    to="/gadgets/phones"
                    className={`block px-3 py-2 rounded text-sm ${
                      isActive("/gadgets/phones")
                        ? "bg-green-600 dark:bg-gray-700"
                        : "hover:bg-green-800 dark:hover:bg-gray-700"
                    }`}
                  >
                    Smartphones
                  </Link>
                  <Link
                    to="/gadgets/laptops"
                    className={`block px-3 py-2 rounded text-sm ${
                      isActive("/gadgets/laptops")
                        ? "bg-green-600 dark:bg-gray-700"
                        : "hover:bg-green-800 dark:hover:bg-gray-700"
                    }`}
                  >
                    Laptops
                  </Link>
                  <Link
                    to="/gadgets/accessories"
                    className={`block px-3 py-2 rounded text-sm ${
                      isActive("/gadgets/accessories")
                        ? "bg-green-600 dark:bg-gray-700"
                        : "hover:bg-green-800 dark:hover:bg-gray-700"
                    }`}
                  >
                    Accessories
                  </Link>
                  <Link
                    to="/gadgets/returned"
                    className={`block px-3 py-2 rounded text-sm ${
                      isActive("/gadgets/returned")
                        ? "bg-green-600 dark:bg-gray-700"
                        : "hover:bg-green-800 dark:hover:bg-gray-700"
                    }`}
                  >
                    Locker Devices
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Internet Usage */}
          {canAccess("view_internet_usage") && (
            <Link
              to="/internet-usage"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                isActive("/internet-usage")
                  ? "bg-green-600 dark:bg-gray-700"
                  : "hover:bg-green-800 dark:hover:bg-gray-700"
              }`}
            >
              <Wifi size={18} />
              Internet Usage
            </Link>
          )}

          {/* A4 Sheets */}
          {canAccess("view_a4_sheets") && (
            <Link
              to="/a4-sheets"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                isActive("/a4-sheets")
                  ? "bg-green-600 dark:bg-gray-700"
                  : "hover:bg-green-800 dark:hover:bg-gray-700"
              }`}
            >
              <FileText size={18} />
              A4 Sheets
            </Link>
          )}

          {/* ✨ NEW: INVENTORY DROPDOWN WITH CATEGORIES */}
          {canAccess("view_inventory") && (
            <div>
              <button
                onClick={() => setInventoryOpen(!isInventoryOpen)}
                className={`flex items-center justify-between w-full px-4 py-3 rounded-lg ${
                  pathname.startsWith("/inventory")
                    ? "bg-green-600 dark:bg-gray-700"
                    : "hover:bg-green-800 dark:hover:bg-gray-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Package size={18} />
                  Inventory
                </div>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${isInventoryOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isInventoryOpen && (
                <div className="ml-9 mt-1 space-y-1">
                  <Link
                    to="/inventory"
                    className={`block px-3 py-2 rounded text-sm ${
                      pathname === "/inventory"
                        ? "bg-green-600 dark:bg-gray-700"
                        : "hover:bg-green-800 dark:hover:bg-gray-700"
                    }`}
                  >
                    📦 All Items
                  </Link>
                  <Link
                    to="/inventory/electronics"
                    className={`block px-3 py-2 rounded text-sm ${
                      isActive("/inventory/electronics")
                        ? "bg-green-600 dark:bg-gray-700"
                        : "hover:bg-green-800 dark:hover:bg-gray-700"
                    }`}
                  >
                    🖥️ Electronics
                  </Link>
                  <Link
                    to="/inventory/furniture"
                    className={`block px-3 py-2 rounded text-sm ${
                      isActive("/inventory/furniture")
                        ? "bg-green-600 dark:bg-gray-700"
                        : "hover:bg-green-800 dark:hover:bg-gray-700"
                    }`}
                  >
                    🪑 Furniture
                  </Link>
                  <Link
                    to="/inventory/safety"
                    className={`block px-3 py-2 rounded text-sm ${
                      isActive("/inventory/safety")
                        ? "bg-green-600 dark:bg-gray-700"
                        : "hover:bg-green-800 dark:hover:bg-gray-700"
                    }`}
                  >
                    🔥 Safety Equipment
                  </Link>
                  <Link
                    to="/inventory/office-supplies"
                    className={`block px-3 py-2 rounded text-sm ${
                      isActive("/inventory/office-supplies")
                        ? "bg-green-600 dark:bg-gray-700"
                        : "hover:bg-green-800 dark:hover:bg-gray-700"
                    }`}
                  >
                    ✏️ Office Supplies
                  </Link>
                  <Link
                    to="/inventory/consumables"
                    className={`block px-3 py-2 rounded text-sm ${
                      isActive("/inventory/consumables")
                        ? "bg-green-600 dark:bg-gray-700"
                        : "hover:bg-green-800 dark:hover:bg-gray-700"
                    }`}
                  >
                    🥤 Consumables
                  </Link>
                  <Link
                    to="/inventory/cleaning"
                    className={`block px-3 py-2 rounded text-sm ${
                      isActive("/inventory/cleaning")
                        ? "bg-green-600 dark:bg-gray-700"
                        : "hover:bg-green-800 dark:hover:bg-gray-700"
                    }`}
                  >
                    🧹 Cleaning & Hygiene
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Support Ticket */}
          <Link
            to="/support-tickets"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
              isActive("/support-tickets")
                ? "bg-green-600 dark:bg-gray-700"
                : "hover:bg-green-800 dark:hover:bg-gray-700"
            }`}
          >
            <Headphones size={18} />
            Support
          </Link>

          {/* Reports */}
          {canAccess("view_reports") && (
            <Link
              to="/reports"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                isActive("/reports")
                  ? "bg-green-600 dark:bg-gray-700"
                  : "hover:bg-green-800 dark:hover:bg-gray-700"
              }`}
            >
              <BarChart3 size={18} />
              Reports
            </Link>
          )}

          {/* User Management */}
          {canAccess("manage_users") && (
            <Link
              to="/users"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                isActive("/users")
                  ? "bg-green-600 dark:bg-gray-700"
                  : "hover:bg-green-800 dark:hover:bg-gray-700"
              }`}
            >
              <UsersIcon size={18} />
              Users
            </Link>
          )}

          {/* Settings */}
          {canAccess("manage_settings") && (
            <Link
              to="/settings"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                isActive("/settings")
                  ? "bg-green-600 dark:bg-gray-700"
                  : "hover:bg-green-800 dark:hover:bg-gray-700"
              }`}
            >
              <SettingsIcon size={18} />
              Settings
            </Link>
          )}
        </nav>

        {/* Logout */}
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-6 py-4 hover:bg-green-800 dark:hover:bg-gray-700"
        >
          <LogOut size={18} />
          Logout
        </button>
      </aside>

      {/* MAIN */}
      <main className="flex-1">
        <header className="bg-white dark:bg-gray-800 shadow px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{pageTitle}</h1>
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            
            <div className="relative flex items-center gap-4">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                <Bell />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <NotificationsDropdown
                  onClose={() => setShowNotifications(false)}
                />
              )}
            </div>

            <Link
              to="/profile"
              className="h-9 w-9 rounded-full flex items-center justify-center font-semibold hover:opacity-80 cursor-pointer overflow-hidden"
            >
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-green-700 text-white flex items-center justify-center">
                  {userInitials}
                </div>
              )}
            </Link>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  );
}
