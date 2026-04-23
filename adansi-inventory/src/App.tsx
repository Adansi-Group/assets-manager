import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase/firebase";
import type { User } from "./types/users";
import { hasPermission } from "./types/users";

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
import Reports from "./pages/Reports";
import ConsolidatedReport from "./pages/ConsolidatedReport";
import TonerReports from "./pages/TonerReports";
import GadgetReports from "./pages/Gadgetreports";
import InternetReports from "./pages/Internetreports";
import A4SheetReports from "./pages/A4sheetreports";
import BudgetAnalysis from "./pages/Budgetanalysis";
import Accessories from "./pages/gadgets/Accessories";
import SupportTickets from "./pages/SupportTicket";
import Users from "./pages/Users";
import Inventory from "./pages/Inventory";
import InventoryCategory from "./pages/inventory/InventoryCategory";

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", fbUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as Omit<User, "id">;
            setCurrentUser({
              id: fbUser.uid,
              ...userData,
            });
          } else {
            setCurrentUser({
              id: fbUser.uid,
              email: fbUser.email || "",
              name: fbUser.displayName || fbUser.email?.split("@")[0] || "User",
              role: "Viewer",
              createdAt: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setCurrentUser(null);
      }
      setFirebaseUser(fbUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const canAccess = (permission: string) => {
    if (!currentUser) return false;
    return hasPermission(currentUser, permission as any);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={firebaseUser ? <Navigate to="/dashboard" /> : <Login />} 
        />

        <Route element={firebaseUser ? <AdminLayout currentUser={currentUser} /> : <Navigate to="/" />}>
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* PRINTERS */}
          {canAccess("view_printers") && (
            <Route path="/printers" element={<Printers />} />
          )}

          {/* TONERS */}
          {canAccess("view_toners") && (
            <>
              <Route path="/toners" element={<Toners />} />
              <Route path="/toners/add" element={<Toners />} />
              <Route path="/toners/replace" element={<Toners />} />
              <Route path="/toners/history" element={<ReplacementHistory />} />
            </>
          )}

          {/* GADGETS */}
          {canAccess("view_gadgets") && (
            <>
              <Route path="/gadgets" element={<Gadgets />} />
              <Route path="/gadgets/add" element={<Gadgets />} />
              <Route path="/gadgets/laptops" element={<Laptops />} />
              <Route path="/gadgets/laptops/add" element={<Laptops />} />
              <Route path="/gadgets/phones" element={<Smartphones />} />
              <Route path="/gadgets/phones/add" element={<Smartphones />} />
              <Route path="/gadgets/accessories" element={<Accessories />} />
              <Route path="/gadgets/accessories/add" element={<Accessories />} />
            </>
          )}

          {/* INTERNET USAGE */}
          {canAccess("view_internet_usage") && (
            <>
              <Route path="/internet-usage" element={<InternetUsage />} />
              <Route path="/internet-usage/add" element={<InternetUsage />} />
            </>
          )}

          {/* A4 SHEETS */}
          {canAccess("view_a4_sheets") && (
            <Route path="/a4-sheets" element={<A4Sheets />} />
          )}

          {/* INVENTORY - FIXED: Use dynamic :category parameter */}
          {canAccess("view_inventory") && (
            <>
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/inventory/:category" element={<InventoryCategory />} />
            </>
          )}

          {/* REPORTS */}
          {canAccess("view_reports") && (
            <>
              <Route path="reports" element={<Reports />} />
              <Route path="reports/toners" element={<TonerReports />} />
              <Route path="reports/gadgets" element={<GadgetReports />} />
              <Route path="reports/internet" element={<InternetReports />} />
              <Route path="reports/a4sheets" element={<A4SheetReports />} />
              <Route path="reports/consolidated" element={<ConsolidatedReport />} />
              <Route path="reports/budget" element={<BudgetAnalysis />} />
            </>
          )}

          {/* SUPPORT TICKETS */}
          <Route path="support-tickets" element={<SupportTickets />} />

          {/* USERS */}
          {canAccess("manage_users") && (
            <Route path="/users" element={<Users />} />
          )}

          {/* SETTINGS */}
          {canAccess("manage_settings") && (
            <Route path="/settings" element={<Settings />} />
          )}

          {/* PROFILE */}
          <Route path="/profile" element={<Profile />} />
        </Route>

        <Route 
          path="*" 
          element={<Navigate to={firebaseUser ? "/dashboard" : "/"} />} 
        />
      </Routes>
    </BrowserRouter>
  );
}



