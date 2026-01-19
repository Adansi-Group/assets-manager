
import { Outlet, Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import NotificationsDropdown from "../components/NotificationsDropdown";

import {
  LayoutDashboard,
  Printer,
  Bell,
  LogOut,
  ChevronDown,
  Droplet,
  Smartphone,
  Laptop,
} from "lucide-react";

export default function AdminLayout() {
  const { pathname } = useLocation();

  const [tonerOpen, setTonerOpen] = useState(false);
  const [gadgetsOpen, setGadgetsOpen] = useState(false);

  const [showNotifications, setShowNotifications] = useState(false);
const [unreadCount, setUnreadCount] = useState(0);


useEffect(() => {
  const stored = JSON.parse(
    localStorage.getItem("notifications") || "[]"
  );
  setUnreadCount(stored.filter((n: any) => !n.read).length);
}, [showNotifications]);


  // Auto-open dropdowns
  useEffect(() => {
    if (pathname.startsWith("/toners")) setTonerOpen(true);
    if (pathname.startsWith("/gadgets")) setGadgetsOpen(true);
  }, [pathname]);

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  // ✅ PAGE TITLE MAPPING (FIXES gadgets/laptops issue)
  const pageTitleMap: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/printers": "Printers",

    "/toners": "Toners",
    "/toners/add": "Add Toner",
    "/toners/replace": "Replace Toner",

    "/gadgets": "Gadgets",
    "/gadgets/phones": "Smartphones",
    "/gadgets/laptops": "Laptops",
     "/profile": "My Profile",

    "/internet-usage": "Internet Usage",
  };

  const pageTitle =
    pageTitleMap[pathname] ??
    pathname
      .split("/")
      .pop()
      ?.replace("-", " ")
      ?.replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* SIDEBAR */}
      <aside className="w-64 bg-gradient-to-b from-green-700 to-green-900 text-white flex flex-col">
        <div className="px-6 py-5 text-xl font-bold">Admin Panel</div>

        <nav className="px-4 space-y-2 flex-1">
          {/* Dashboard */}
          <Link
            to="/dashboard"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
              isActive("/dashboard")
                ? "bg-green-600"
                : "hover:bg-green-800"
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
                ? "bg-green-600"
                : "hover:bg-green-800"
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
                  ? "bg-green-600"
                  : "hover:bg-green-800"
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
                  to="/toners/add"
                  className={`block px-3 py-2 rounded text-sm ${
                    isActive("/toners/add")
                      ? "bg-green-600"
                      : "hover:bg-green-800"
                  }`}
                >
                  Add Toner
                </Link>

                <Link
                  to="/toners/replace"
                  className={`block px-3 py-2 rounded text-sm ${
                    isActive("/toners/replace")
                      ? "bg-green-600"
                      : "hover:bg-green-800"
                  }`}
                >
                  Replace Toner
                </Link>

                <Link
                  to="/toners"
                  className={`block px-3 py-2 rounded text-sm ${
                    pathname === "/toners"
                      ? "bg-green-600"
                      : "hover:bg-green-800"
                  }`}
                >
                  Total Toners
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
                  ? "bg-green-600"
                  : "hover:bg-green-800"
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
                  to="/gadgets/phones"
                  className={`block px-3 py-2 rounded text-sm ${
                    isActive("/gadgets/phones")
                      ? "bg-green-600"
                      : "hover:bg-green-800"
                  }`}
                >
                  Smartphones
                </Link>

                <Link
                  to="/gadgets/laptops"
                  className={`block px-3 py-2 rounded text-sm ${
                    isActive("/gadgets/laptops")
                      ? "bg-green-600"
                      : "hover:bg-green-800"
                  }`}
                >
                  Laptops
                </Link>

                <Link
                  to="/gadgets"
                  className={`block px-3 py-2 rounded text-sm ${
                    pathname === "/gadgets"
                      ? "bg-green-600"
                      : "hover:bg-green-800"
                  }`}
                >
                  Total Gadgets
                </Link>
              </div>
            )}
          </div>

          {/* Internet Usage */}
          <Link
            to="/internet-usage"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
              isActive("/internet-usage")
                ? "bg-green-600"
                : "hover:bg-green-800"
            }`}
          >
            <Laptop size={18} />
            Internet Usage
          </Link>
        </nav>

        {/* Logout */}
        <button className="flex items-center gap-3 px-6 py-4 hover:bg-green-800">
          <LogOut size={18} />
          Logout
        </button>
      </aside>

      {/* MAIN */}
      <main className="flex-1">
        <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">{pageTitle}</h1>
          <div className="flex items-center gap-4">
            

            <div className="relative flex items-center gap-4">
  <button
    onClick={() => setShowNotifications(!showNotifications)}
    className="relative"
    
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
  className="h-9 w-9 bg-green-700 text-white rounded-full flex items-center justify-center font-semibold hover:bg-green-800 cursor-pointer"
>
  A
</Link>

          </div>
        </header>

        <Outlet />
      </main>
    </div>
  );
}





