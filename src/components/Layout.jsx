import { useAuth } from "../context/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { useState } from "react";
import Sidebar from "./Sidebar";
import { Menu } from "lucide-react";

const roleAccess = {
  admin:    ["/", "/orders", "/hr", "/contracts", "/settings", "/division/print", "/division/it", "/division/clothing", "/customers", "/quotes", "/invoices", "/supplies"],
  print:    ["/", "/orders", "/division/print", "/customers"],
  it:       ["/", "/orders", "/division/it", "/customers"],
  clothing: ["/", "/orders", "/division/clothing", "/customers"],
  hr:       ["/", "/hr", "/contracts"],
  staff:    ["/staff-orders", "/supplies"],
};

const PAGE_TITLES = {
  "/": "Dashboard",
  "/orders": "Order Tracker",
  "/hr": "HR & Payroll",
  "/contracts": "Contracts",
  "/settings": "Settings",
  "/customers": "Customers",
  "/quotes": "Quotes",
  "/invoices": "Invoices",
  "/staff-orders": "Production Orders",
  "/supplies": "Stock & Supplies",
  "/division/print": "Print / DTF / Vinyl",
  "/division/it": "IT Company",
  "/division/clothing": "Clothing Brand",
};

export default function Layout({ children }) {
  const { user, userRole } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return <Navigate to="/login" />;

  const allowed = roleAccess[userRole || "admin"] || ["/"];
  const path = location.pathname;
  const hasAccess = allowed.some(p => path === p || path.startsWith(p + "/"));

  if (userRole === "staff" && path === "/") return <Navigate to="/staff-orders" />;
  if (!hasAccess) return <Navigate to="/" />;

  const pageTitle = PAGE_TITLES[path] || "R&R Agencies";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0D0D0D" }}>
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        {/* Mobile topbar */}
        <div className="mobile-topbar" style={{
          display: "none",
          background: "#111", borderBottom: "1px solid #222",
          padding: "14px 20px",
          alignItems: "center", gap: 14,
          position: "sticky", top: 0, zIndex: 200,
        }}>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: "transparent", border: "none", color: "#C9A84C", cursor: "pointer", padding: 0, display: "flex" }}
          >
            <Menu size={22} />
          </button>
          <span style={{ fontFamily: "'Playfair Display', serif", color: "#C9A84C", fontSize: 17, fontWeight: 600 }}>
            {pageTitle}
          </span>
        </div>

        <main style={{
          flex: 1,
          padding: "32px",
          fontFamily: "'DM Sans', sans-serif",
          color: "#F0F0F0",
          boxSizing: "border-box",
        }}>
          {children}
        </main>
      </div>

      <style>{`
        @media (min-width: 769px) {
          .mobile-topbar { display: none !important; }
          main, div > main {
            margin-left: 240px;
          }
        }
        @media (max-width: 768px) {
          .mobile-topbar { display: flex !important; }
          main {
            padding: 20px 16px !important;
            margin-left: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}