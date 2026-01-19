


import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Printer,
  LogOut
} from "lucide-react";

export default function Sidebar() {
  const location = useLocation();

  const linkClass = (path: string) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
      location.pathname === path
        ? "bg-green-600"
        : "hover:bg-green-800"
    }`;

  return (
    <aside className="w-64 bg-gradient-to-b from-green-700 to-green-900 text-white flex flex-col">
      <div className="px-6 py-5 text-xl font-bold">Admin Panel</div>

      <nav className="flex-1 px-4 space-y-2">
        <Link to="/dashboard" className={linkClass("/dashboard")}>
          <LayoutDashboard size={18} />
          Dashboard
        </Link>

        <Link to="/printers" className={linkClass("/printers")}>
          <Printer size={18} />
          Printers
        </Link>
        <Link to="/toners" className={linkClass("/toners")}>
          <Printer size={18} />
          Toners
        </Link>
       
      </nav>

      <Link
        to="/"
        className="flex items-center gap-3 px-6 py-4 hover:bg-green-800"
      >
        <LogOut size={18} />
        Logout
      </Link>
    </aside>
  );
}
