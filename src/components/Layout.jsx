import { useAuth } from "../context/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";

const roleAccess = {
  admin:    ["/", "/orders", "/hr", "/contracts", "/settings", "/customers", "/division/print", "/division/it", "/division/clothing"],
  print:    ["/", "/orders", "/customers", "/division/print"],
  it:       ["/", "/orders", "/customers", "/division/it"],
  clothing: ["/", "/orders", "/customers", "/division/clothing"],
  hr:       ["/", "/hr", "/contracts", "/customers"],
  staff:    ["/staff-orders"],
};

const roleHome = {
  admin:    "/",
  print:    "/",
  it:       "/",
  clothing: "/",
  hr:       "/",
  staff:    "/staff-orders",
};

export default function Layout({ children }) {
  const { user, userRole } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" />;

  const role    = userRole || "admin";
  const allowed = roleAccess[role] || ["/"];
  const path    = location.pathname;

  const hasAccess = allowed.some(p => path === p || path.startsWith(p + "/") || p.startsWith(path));

  if (!hasAccess) return <Navigate to={roleHome[role] || "/"} />;

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
        boxSizing: "border-box",
      }}>
        {children}
      </main>
    </div>
  );
}