import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError("Invalid email or password.");
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#0D0D0D", display: "flex",
      alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif"
    }}>
      <div style={{
        background: "#1A1A1A", border: "1px solid #333", borderRadius: 16,
        padding: "48px 40px", width: "100%", maxWidth: 420,
        boxShadow: "0 8px 48px rgba(201,168,76,0.1)"
      }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h1 style={{
            fontFamily: "'Playfair Display', serif", fontSize: 28,
            color: "#C9A84C", margin: 0, letterSpacing: 1
          }}>R&R Agencies</h1>
          <p style={{ color: "#888", fontSize: 13, marginTop: 6, letterSpacing: 2, textTransform: "uppercase" }}>
            Admin Dashboard
          </p>
        </div>

        {error && (
          <div style={{
            background: "#2a1a1a", border: "1px solid #E05252", borderRadius: 8,
            padding: "10px 14px", color: "#E05252", fontSize: 13, marginBottom: 20
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              style={{
                width: "100%", background: "#111", border: "1px solid #333", borderRadius: 8,
                color: "#F0F0F0", fontSize: 14, padding: "10px 14px", outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              style={{
                width: "100%", background: "#111", border: "1px solid #333", borderRadius: 8,
                color: "#F0F0F0", fontSize: 14, padding: "10px 14px", outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>

          <button type="submit" disabled={loading} style={{
            width: "100%", background: "#C9A84C", color: "#0D0D0D", border: "none",
            borderRadius: 8, padding: "12px", fontSize: 15, fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
            fontFamily: "'DM Sans', sans-serif"
          }}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}