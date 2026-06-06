import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import HR from "./pages/HR";
import Division from "./pages/Division";
import Contracts from "./pages/Contracts";
import Settings from "./pages/Settings";
import Customers from "./pages/Customers";
import StaffOrders from "./pages/StaffOrders";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout><Dashboard /></Layout>} />
          <Route path="/orders" element={<Layout><Orders /></Layout>} />
          <Route path="/hr" element={<Layout><HR /></Layout>} />
          <Route path="/division/:slug" element={<Layout><Division /></Layout>} />
          <Route path="/contracts" element={<Layout><Contracts /></Layout>} />
          <Route path="/settings" element={<Layout><Settings /></Layout>} />
          <Route path="/customers" element={<Layout><Customers /></Layout>} />
          <Route path="/staff-orders" element={<Layout><StaffOrders /></Layout>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}