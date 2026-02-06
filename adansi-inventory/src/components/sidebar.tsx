import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Printer,
  LogOut
} from "lucide-react";
import { logout } from "../services/authService";
import Swal from "sweetalert2";

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const linkClass = (path: string) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
      location.pathname === path
        ? "bg-green-600"
        : "hover:bg-green-800"
    }`;

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

  return (
    <aside className="w-64 bg-gradient-to-b from-green-700 to-green-900 text-white flex flex-col">
      <div className="px-6 py-5 text-xl font-bold">Assets Manager</div>

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

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-6 py-4 hover:bg-green-800 text-left w-full"
      >
        <LogOut size={18} />
        Logout
      </button>
    </aside>
  );
}
