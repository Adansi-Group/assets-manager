import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase/firebase";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Printers from "./pages/Printers";
import Toners from "./pages/Toners";
import AdminLayout from "./Layouts/AdminLayout";
import Gadgets from './pages/Gadgets';
import Laptops from './pages/gadgets/Laptops';
import Smartphones from './pages/gadgets/SmartPhones';
import InternetUsage from './pages/InternetUsage';
import Profile from "./pages/Profile";
import ReplacementHistory from "./pages/Replacementhistory";
import Settings from "./pages/Settings";
import A4Sheets from "./pages/A4Sheet";


export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Login page - redirect to dashboard if already logged in */}
        <Route 
          path="/" 
          element={user ? <Navigate to="/dashboard" /> : <Login />} 
        />

        {/* Protected Admin Routes */}
        <Route element={user ? <AdminLayout /> : <Navigate to="/" />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/printers" element={<Printers />} />

          {/* TONERS */}
          <Route path="/toners" element={<Toners />} />
          <Route path="/toners/add" element={<Toners />} />
          <Route path="/toners/replace" element={<Toners />} />
          <Route path="/toners/history" element={<ReplacementHistory />} />

          {/* GADGETS */}
          <Route path="/gadgets" element={<Gadgets />} />
          <Route path="/gadgets/add" element={<Gadgets />} />
          <Route path="/gadgets/laptops" element={<Laptops />} />
          <Route path="/gadgets/laptops/add" element={<Laptops />} />
          <Route path="/gadgets/phones" element={<Smartphones />} />
          <Route path="/gadgets/phones/add" element={<Smartphones />} />

          {/* INTERNET USAGE */}
          <Route path="/internet-usage" element={<InternetUsage />} />
          <Route path="/internet-usage/add" element={<InternetUsage />} />

          {/* A4 SHEETS */}
          <Route path="/a4-sheets" element={<A4Sheets />} />

          {/* SETTINGS */}
          <Route path="/settings" element={<Settings />} />

          {/* PROFILE */}
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Catch all - redirect to login or dashboard */}
        <Route 
          path="*" 
          element={<Navigate to={user ? "/dashboard" : "/"} />} 
        />
      </Routes>
    </BrowserRouter>
  );
}



