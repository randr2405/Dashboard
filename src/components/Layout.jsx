import { useAuth } from "../context/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";

const roleAccess = {
  admin:    ["/", "/orders", "/hr", "/contracts", "/settings", "/division/print", "/division/it", "/division/clothing", "/customers", "/quotes", "/invoices"],
  print:    ["/", "/orders", "/division/print", "/customers"],
  it:       ["/", "/orders", "/division/it", "/customers"],
  clothing: ["/", "/orders", "/division/clothing", "/customers"],
  hr:       ["/", "/hr", "/contracts"],
  staff:    ["/staff-orders"],
};

export default function Layout({ children }) {
  const { user, userRole } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" />;

  const allowed = roleAccess[userRole || "admin"] || ["/"];
  const path = location.pathname;

  const hasAccess = allowed.some(p => path === p || path.startsWith(p + "/"));

  // Staff landing on / → redirect to their page
  if (userRole === "staff" && path === "/") return <Navigate to="/staff-orders" />;

  if (!hasAccess) return <Navigate to="/" />;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0D0D0D" }}>
      <Sidebar />
      <main style={{
        marginLeft: 240,
        flex: 1,
        padding: "32px",
        fontFamily: "'DM Sans', sans-serif",
        color: "#F0F0F0",
        minHeight: "100vh",
        boxSizing: "border-box"
      }}>
        {children}
      </main>
    </div>
  );
}