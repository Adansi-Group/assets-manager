
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Printers from "./pages/Printers";
import Toners from "./pages/Toners";
import AdminLayout from "./Layouts/AdminLayout";
import Gadgets from "./pages/gadgets";
import GadgetsProvider from "./pages/gadgets/gadgetsProvider";
import Smartphones from "./pages/gadgets/SmartPhones";
import Laptops from "./pages/gadgets/Laptops";
import Profile from "./pages/Profile";


export default function App() {
  return (



    <BrowserRouter>
  <Routes>
    <Route path="/" element={<Login />} />

    {/* ADMIN AREA */}
    <Route element={<AdminLayout />}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/printers" element={<Printers />} />

      {/* TONERS */}
      <Route path="/toners" element={<Toners />} />
      <Route path="/toners/add" element={<Toners />} />
      <Route path="/toners/replace" element={<Toners />} />

      {/* GADGETS */}
      <Route path="/gadgets" element={<GadgetsProvider />}>
        <Route index element={<Gadgets />} />
        <Route path="phones" element={<Smartphones />} />
        <Route path="laptops" element={<Laptops />} />
      </Route>

      {/* ✅ PROFILE — MUST BE HERE */}
      <Route path="/profile" element={<Profile />} />
    </Route>

    <Route path="*" element={<Navigate to="/" />} />
  </Routes>
</BrowserRouter>
  );
}

    