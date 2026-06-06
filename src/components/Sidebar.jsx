import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard, Package, Users, Shirt,
  Monitor, Printer, LogOut, FileText, Settings2,
  UserRound, ClipboardList, FileSignature, Receipt, Archive, X
} from "lucide-react";

const allNav = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/", roles: ["admin", "print", "it", "clothing", "hr"] },
  { label: "Order Tracker", icon: Package, to: "/orders", roles: ["admin", "print", "it", "clothing"] },
  { label: "Customers", icon: UserRound, to: "/customers", roles: ["admin", "print", "it", "clothing"] },
  { label: "Quotes", icon: FileSignature, to: "/quotes", roles: ["admin"] },
  { label: "Invoices", icon: Receipt, to: "/invoices", roles: ["admin"] },
  { label: "HR & Payroll", icon: Users, to: "/hr", roles: ["admin", "hr"] },
  { label: "Contracts", icon: FileText, to: "/contracts", roles: ["admin", "hr"] },
  { label: "Production Orders", icon: ClipboardList, to: "/staff-orders", roles: ["staff"] },
  { label: "Stock & Supplies", icon: Archive, to: "/supplies", roles: ["admin", "staff"] },
  { divider: true, label: "DIVISIONS", roles: ["admin", "print", "it", "clothing"] },
  { label: "Print / DTF / Vinyl", icon: Printer, to: "/division/print", roles: ["admin", "print"] },
  { label: "IT Company", icon: Monitor, to: "/division/it", roles: ["admin", "it"] },
  { label: "Clothing Brand", icon: Shirt, to: "/division/clothing", roles: ["admin", "clothing"] },
  { divider: true, label: "SYSTEM", roles: ["admin"] },
  { label: "Settings", icon: Settings2, to: "/settings", roles: ["admin"] },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const { logout, user, userRole } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const nav = allNav.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(userRole || "admin");
  });

  const sidebarContent = (
    <aside style={{
      width: 240, height: "100%", background: "#111",
      borderRight: "1px solid #222", display: "flex",
      flexDirection: "column", overflowY: "auto",
    }}>
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid #222", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif", fontSize: 20,
            color: "#C9A84C", margin: 0, letterSpacing: 1
          }}>R&R Agencies</h1>
          <p style={{ color: "#555", fontSize: 11, marginTop: 4, letterSpacing: 2, textTransform: "uppercase" }}>
            Admin Portal
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} style={{
            background: "transparent", border: "none", color: "#555",
            cursor: "pointer", padding: 4, marginTop: -4
          }}>
            <X size={18} />
          </button>
        )}
      </div>

      <nav style={{ flex: 1, padding: "16px 0" }}>
        {nav.map((item, i) => {
          if (item.divider) return (
            <div key={i} style={{
              padding: "16px 20px 6px", fontSize: 10, color: "#444",
              letterSpacing: 2, textTransform: "uppercase", fontWeight: 700
            }}>{item.label}</div>
          );
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} end={item.to === "/"}
              onClick={onClose}
              style={({ isActive }) => ({
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 20px", textDecoration: "none",
                color: isActive ? "#C9A84C" : "#888",
                background: isActive ? "rgba(201,168,76,0.08)" : "transparent",
                borderRight: isActive ? "2px solid #C9A84C" : "2px solid transparent",
                fontSize: 14, fontWeight: isActive ? 600 : 400,
                transition: "all 0.15s"
              })}>
              <Icon size={16} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div style={{ borderTop: "1px solid #222", padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{
            fontSize: 10, background: "#C9A84C22", border: "1px solid #C9A84C44",
            color: "#C9A84C", borderRadius: 20, padding: "2px 10px",
            textTransform: "uppercase", letterSpacing: 1, fontWeight: 700
          }}>
            {userRole || "admin"}
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#555", marginBottom: 10, wordBreak: "break-all" }}>
          {user?.email}
        </div>
        <button onClick={handleLogout} style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "transparent", border: "1px solid #333",
          borderRadius: 8, color: "#888", fontSize: 13, padding: "8px 14px",
          cursor: "pointer", width: "100%", fontFamily: "'DM Sans', sans-serif"
        }}>
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop: fixed sidebar */}
      <div style={{ display: "none" }} className="sidebar-desktop-wrapper">
        {sidebarContent}
      </div>

      {/* Always render both; CSS controls which shows */}
      <style>{`
        @media (min-width: 769px) {
          .sidebar-desktop-wrapper { display: block !important; position: fixed; top: 0; left: 0; width: 240px; height: 100vh; z-index: 100; }
          .sidebar-mobile-overlay { display: none !important; }
        }
        @media (max-width: 768px) {
          .sidebar-desktop-wrapper { display: none !important; }
          .sidebar-mobile-overlay { display: flex !important; }
        }
      `}</style>

      {/* Mobile: slide-over overlay */}
      <div
        className="sidebar-mobile-overlay"
        style={{
          display: "none",
          position: "fixed", inset: 0, zIndex: 300,
          background: mobileOpen ? "rgba(0,0,0,0.7)" : "transparent",
          pointerEvents: mobileOpen ? "all" : "none",
          transition: "background 0.2s",
        }}
        onClick={onClose}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: 240, height: "100%",
            transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.25s ease",
          }}
        >
          {sidebarContent}
        </div>
      </div>
    </>
  );
}