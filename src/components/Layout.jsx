import { useAuth } from "../context/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";

const roleAccess = {
  admin:    ["/", "/orders", "/hr", "/contracts", "/settings", "/division/print", "/division/it", "/division/clothing"],
  print:    ["/", "/orders", "/division/print"],
  it:       ["/", "/orders", "/division/it"],
  clothing: ["/", "/orders", "/division/clothing"],
  hr:       ["/", "/hr", "/contracts"],
};

export default function Layout({ children }) {
  const { user, userRole } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" />;

  const allowed = roleAccess[userRole || "admin"] || ["/"];
  const path = location.pathname;

  // Check exact match or prefix match for dynamic routes like /division/print
  const hasAccess = allowed.some(p => path === p || path.startsWith(p + "/") || p.startsWith(path));

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