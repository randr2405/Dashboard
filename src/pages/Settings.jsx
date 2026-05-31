import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  collection, doc, setDoc, deleteDoc,
  onSnapshot, serverTimestamp
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Plus, X, RotateCcw, Shield, User } from "lucide-react";

const ROLES = [
  { value: "admin", label: "Admin", desc: "Full access to everything" },
  { value: "print", label: "Print Division", desc: "Print/DTF/Vinyl only" },
  { value: "it", label: "IT Division", desc: "IT Company division only" },
  { value: "clothing", label: "Clothing Division", desc: "Clothing brand only" },
  { value: "hr", label: "HR Only", desc: "HR & Payroll access only" },
];

const inp = {
  width: "100%", background: "#111", border: "1px solid #333",
  borderRadius: 8, color: "#F0F0F0", fontSize: 14,
  padding: "10px 14px", outline: "none", boxSizing: "border-box",
  fontFamily: "'DM Sans', sans-serif"
};
const lbl = {
  display: "block", fontSize: 11, color: "#666",
  textTransform: "uppercase", letterSpacing: 1, marginBottom: 5
};

const roleColors = {
  admin: "#C9A84C", print: "#E8A838", it: "#52A9E0",
  clothing: "#9B7DE8", hr: "#52C97A"
};

export default function Settings() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", role: "admin", displayName: "" });
  const [saving, setSaving] = useState(false);
  const [resetSent, setResetSent] = useState({});
  const [tab, setTab] = useState("users");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), snap =>
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, []);

  async function handleCreateUser() {
    if (!form.email || !form.password) return alert("Email and password are required.");
    if (form.password.length < 6) return alert("Password must be at least 6 characters.");
    setSaving(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await setDoc(doc(db, "users", cred.user.uid), {
        email: form.email,
        displayName: form.displayName || form.email.split("@")[0],
        role: form.role,
        createdAt: serverTimestamp(),
        createdBy: user.email,
      });
      setShowForm(false);
      setForm({ email: "", password: "", role: "admin", displayName: "" });
    } catch (err) {
      alert(err.message);
    }
    setSaving(false);
  }

  async function handleDeleteUser(u) {
    if (u.id === user.uid) return alert("You cannot delete your own account.");
    if (!confirm(`Remove ${u.email} from the dashboard? They will no longer be able to log in.`)) return;
    await deleteDoc(doc(db, "users", u.id));
  }

  async function handleResetPassword(u) {
    await sendPasswordResetEmail(auth, u.email);
    setResetSent(r => ({ ...r, [u.id]: true }));
    setTimeout(() => setResetSent(r => ({ ...r, [u.id]: false })), 4000);
  }

  async function handleRoleChange(u, newRole) {
    await setDoc(doc(db, "users", u.id), { ...u, role: newRole });
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, color: "#C9A84C", margin: 0 }}>
          Settings
        </h1>
        <p style={{ color: "#555", marginTop: 6, fontSize: 14 }}>
          Manage users, roles, and access
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 28, background: "#1A1A1A",
        borderRadius: 10, padding: 4, width: "fit-content", border: "1px solid #2a2a2a"
      }}>
        {["users", "roles"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "9px 22px", borderRadius: 7, border: "none",
            background: tab === t ? "#C9A84C" : "transparent",
            color: tab === t ? "#0D0D0D" : "#666",
            fontWeight: tab === t ? 700 : 400, fontSize: 14,
            cursor: "pointer", textTransform: "capitalize",
            fontFamily: "'DM Sans', sans-serif"
          }}>{t}</button>
        ))}
      </div>

      {/* USERS TAB */}
      {tab === "users" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ color: "#555", fontSize: 13 }}>
              {users.length} user{users.length !== 1 ? "s" : ""} · Logged in as <span style={{ color: "#C9A84C" }}>{user?.email}</span>
            </div>
            <button onClick={() => setShowForm(true)} style={{
              background: "#C9A84C", color: "#0D0D0D", border: "none", borderRadius: 10,
              padding: "11px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8, fontFamily: "'DM Sans', sans-serif"
            }}><Plus size={15} /> Add User</button>
          </div>

          {/* Current user banner */}
          <div style={{
            background: "#C9A84C12", border: "1px solid #C9A84C33",
            borderRadius: 12, padding: "14px 20px", marginBottom: 16,
            display: "flex", alignItems: "center", gap: 12
          }}>
            <Shield size={16} color="#C9A84C" />
            <div style={{ fontSize: 13, color: "#C9A84C" }}>
              You are logged in as <strong>{user?.email}</strong>. Your account is always admin.
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {users.length === 0 ? (
              <div style={{
                background: "#1A1A1A", border: "1px solid #2a2a2a", borderRadius: 14,
                padding: "60px 0", textAlign: "center", color: "#444", fontSize: 14
              }}>
                No users yet — add team members to give them access
              </div>
            ) : users.map(u => {
              const isMe = u.id === user?.uid;
              const roleInfo = ROLES.find(r => r.value === u.role) || ROLES[0];
              return (
                <div key={u.id} style={{
                  background: "#1A1A1A", border: "1px solid " + (isMe ? "#C9A84C44" : "#2a2a2a"),
                  borderRadius: 14, padding: "18px 22px",
                  display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap"
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: (roleColors[u.role] || "#C9A84C") + "22",
                    border: "1px solid " + (roleColors[u.role] || "#C9A84C") + "44",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0
                  }}>
                    <User size={18} color={roleColors[u.role] || "#C9A84C"} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontWeight: 600, color: "#F0F0F0", fontSize: 15 }}>
                      {u.displayName || u.email}
                      {isMe && <span style={{ color: "#C9A84C", fontSize: 11, marginLeft: 8 }}>(you)</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{u.email}</div>
                  </div>

                  {/* Role selector */}
                  <select
                    value={u.role}
                    disabled={isMe}
                    onChange={e => handleRoleChange(u, e.target.value)}
                    style={{
                      background: (roleColors[u.role] || "#C9A84C") + "18",
                      border: "1px solid " + (roleColors[u.role] || "#C9A84C") + "44",
                      color: roleColors[u.role] || "#C9A84C",
                      borderRadius: 20, padding: "6px 14px", fontSize: 12,
                      fontWeight: 700, cursor: isMe ? "not-allowed" : "pointer",
                      fontFamily: "'DM Sans', sans-serif", outline: "none",
                      opacity: isMe ? 0.6 : 1
                    }}>
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => handleResetPassword(u)}
                      title="Send password reset email"
                      style={{
                        background: "transparent",
                        border: "1px solid " + (resetSent[u.id] ? "#52C97A" : "#333"),
                        borderRadius: 8, color: resetSent[u.id] ? "#52C97A" : "#666",
                        cursor: "pointer", padding: "7px 12px", fontSize: 12,
                        display: "flex", alignItems: "center", gap: 6,
                        fontFamily: "'DM Sans', sans-serif"
                      }}>
                      <RotateCcw size={12} />
                      {resetSent[u.id] ? "Sent!" : "Reset PW"}
                    </button>

                    {!isMe && (
                      <button onClick={() => handleDeleteUser(u)} style={{
                        background: "transparent", border: "1px solid #E05252",
                        borderRadius: 8, color: "#E05252", cursor: "pointer",
                        padding: "7px 10px", display: "flex", alignItems: "center",
                        fontFamily: "'DM Sans', sans-serif"
                      }}><X size={14} /></button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ROLES TAB */}
      {tab === "roles" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {ROLES.map(r => (
            <div key={r.value} style={{
              background: "#1A1A1A", border: "1px solid #2a2a2a", borderRadius: 14,
              padding: 22, borderLeft: "3px solid " + (roleColors[r.value] || "#C9A84C")
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <Shield size={16} color={roleColors[r.value] || "#C9A84C"} />
                <div style={{ fontWeight: 700, color: "#F0F0F0", fontSize: 15 }}>{r.label}</div>
              </div>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 14 }}>{r.desc}</div>
              <div style={{ fontSize: 11, color: "#444", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                Access
              </div>
              {r.value === "admin" && (
                <div style={{ fontSize: 13, color: "#888" }}>
                  ✅ Dashboard · Orders · HR · Contracts · All Divisions · Settings
                </div>
              )}
              {r.value === "print" && (
                <div style={{ fontSize: 13, color: "#888" }}>
                  ✅ Dashboard · Orders (Print) · Print Division
                </div>
              )}
              {r.value === "it" && (
                <div style={{ fontSize: 13, color: "#888" }}>
                  ✅ Dashboard · Orders (IT) · IT Division
                </div>
              )}
              {r.value === "clothing" && (
                <div style={{ fontSize: 13, color: "#888" }}>
                  ✅ Dashboard · Orders (Clothing) · Clothing Division
                </div>
              )}
              {r.value === "hr" && (
                <div style={{ fontSize: 13, color: "#888" }}>
                  ✅ HR & Payroll · Contracts
                </div>
              )}
              <div style={{
                marginTop: 12, fontSize: 12, color: "#555",
                borderTop: "1px solid #2a2a2a", paddingTop: 10
              }}>
                {users.filter(u => u.role === r.value).length} user{users.filter(u => u.role === r.value).length !== 1 ? "s" : ""} assigned
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add User Modal */}
      {showForm && (
        <div onClick={() => setShowForm(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
          zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#1A1A1A", border: "1px solid #333", borderRadius: 16,
            width: "100%", maxWidth: 480, padding: 32, position: "relative"
          }}>
            <button onClick={() => setShowForm(false)} style={{
              position: "absolute", top: 16, right: 16, background: "transparent",
              border: "none", color: "#666", cursor: "pointer"
            }}><X size={20} /></button>

            <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#C9A84C", marginBottom: 6 }}>
              Add User
            </h2>
            <p style={{ color: "#555", fontSize: 13, marginBottom: 24 }}>
              They'll receive an email to set their password after you create the account.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={lbl}>Display Name</label>
                <input value={form.displayName}
                  onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                  placeholder="e.g. Rhea" style={inp} />
              </div>
              <div>
                <label style={lbl}>Email Address</label>
                <input type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  style={inp} />
              </div>
              <div>
                <label style={lbl}>Temporary Password</label>
                <input type="password" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min 6 characters" style={inp} />
              </div>
              <div>
                <label style={lbl}>Role</label>
                <select value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  style={{ ...inp, background: "#111" }}>
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
                  ))}
                </select>
              </div>
            </div>

            <button onClick={handleCreateUser} disabled={saving} style={{
              marginTop: 24, width: "100%", background: "#C9A84C", color: "#0D0D0D",
              border: "none", borderRadius: 8, padding: "13px", fontSize: 15,
              fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif"
            }}>{saving ? "Creating..." : "Create User"}</button>
          </div>
        </div>
      )}
    </div>
  );
}