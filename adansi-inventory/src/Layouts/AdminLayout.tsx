












import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import NotificationsDropdown from "../components/NotificationsDropdown";
import ThemeSwitcher from "../components/ThemeSwitcher";
import { auth } from "../firebase/firebase";
import { logout } from "../services/authService";
import Swal from "sweetalert2";

import {
  LayoutDashboard,
  Printer,
  Bell,
  LogOut,
  ChevronDown,
  Droplet,
  Smartphone,
  Laptop,
  History,
  Wifi,
  FileText,
  Settings as SettingsIcon,
  BarChart3,
} from "lucide-react";

export default function AdminLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [tonerOpen, setTonerOpen] = useState(false);
  const [gadgetsOpen, setGadgetsOpen] = useState(false);

  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userInitials, setUserInitials] = useState("A");
  const [userPhoto, setUserPhoto] = useState<string | null>(null);

  useEffect(() => {
    const stored = JSON.parse(
      localStorage.getItem("notifications") || "[]"
    );
    setUnreadCount(stored.filter((n: any) => !n.read).length);
  }, [showNotifications]);

  // Get user initials and photo
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const displayName = user.displayName || "";
      const email = user.email || "";
      
      if (user.photoURL) {
        setUserPhoto(user.photoURL);
      }
      
      if (displayName && displayName.trim()) {
        setUserInitials(displayName[0].toUpperCase());
      } else if (email && email.length > 0) {
        setUserInitials(email[0].toUpperCase());
      }
    }
  }, []);

  // Auto-open dropdowns
  useEffect(() => {
    if (pathname.startsWith("/toners")) setTonerOpen(true);
    if (pathname.startsWith("/gadgets")) setGadgetsOpen(true);
  }, [pathname]);

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

  // PAGE TITLE MAPPING
  const pageTitleMap: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/printers": "Printers",

    "/toners": "Toners",
    "/toners/add": "Add Toner",
    "/toners/history": "Replacement History",

    "/gadgets": "Gadgets",
    "/gadgets/phones": "Smartphones",
    "/gadgets/laptops": "Laptops",
    "/profile": "My Profile",

    "/internet-usage": "Internet Usage",
    "/a4-sheets": "A4 Sheets",
    "/reports": "Reports & Analytics",
    "/reports/toners": "Toner Reports",
    "/reports/gadgets": "Gadget Reports",
    "/reports/internet": "Internet Reports",
    "/reports/a4sheets": "A4 Sheet Reports",
    "/reports/consolidated": "Consolidated Report",
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
        <div className="px-6 py-5 text-xl font-bold">Admin Panel</div>

        <nav className="px-4 space-y-2 flex-1">
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

          {/* TONERS */}
          <div>
            <button
              onClick={() => setTonerOpen(!tonerOpen)}
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
                className={`transition-transform ${
                  tonerOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {tonerOpen && (
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
                  className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${
                    isActive("/toners/history")
                      ? "bg-green-600 dark:bg-gray-700"
                      : "hover:bg-green-800 dark:hover:bg-gray-700"
                  }`}
                >
                  <History size={14} />
                  Replacement History
                </Link>
              </div>
            )}
          </div>

          {/* GADGETS */}
          <div>
            <button
              onClick={() => setGadgetsOpen(!gadgetsOpen)}
              className={`flex items-center justify-between w-full px-4 py-3 rounded-lg ${
                pathname.startsWith("/gadgets")
                  ? "bg-green-600 dark:bg-gray-700"
                  : "hover:bg-green-800 dark:hover:bg-gray-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <Smartphone size={18} />
                Gadgets
              </div>
              <ChevronDown
                size={16}
                className={`transition-transform ${
                  gadgetsOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {gadgetsOpen && (
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
                  className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${
                    isActive("/gadgets/laptops")
                      ? "bg-green-600 dark:bg-gray-700"
                      : "hover:bg-green-800 dark:hover:bg-gray-700"
                  }`}
                >
                  <Laptop size={14} />
                  Laptops
                </Link>
              </div>
            )}
          </div>

          {/* Internet Usage */}
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

          {/* A4 Sheets */}
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

          {/* Reports */}
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

          {/* Settings */}
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
            {/* Theme Switcher */}
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