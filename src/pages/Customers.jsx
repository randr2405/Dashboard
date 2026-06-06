import { useEffect, useState } from "react";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import { Plus, X, Search, Pencil, Trash2, User } from "lucide-react";

const DIVISIONS = [
  { value: "",         label: "All / Unknown" },
  { value: "print",    label: "Print / DTF / Vinyl" },
  { value: "it",       label: "IT Company" },
  { value: "clothing", label: "Clothing Brand" },
];

const divisionColors = {
  print:    "#C9A84C",
  it:       "#52A9E0",
  clothing: "#9B7DE8",
  "":       "#555",
};

const inp = {
  width: "100%", background: "#111", border: "1px solid #333",
  borderRadius: 8, color: "#F0F0F0", fontSize: 14,
  padding: "10px 14px", outline: "none", boxSizing: "border-box",
  fontFamily: "'DM Sans', sans-serif",
};
const lbl = {
  display: "block", fontSize: 11, color: "#666",
  textTransform: "uppercase", letterSpacing: 1, marginBottom: 5,
};

const emptyForm = { name: "", contact: "", phone: "", email: "", division: "", notes: "" };

const mobileStyles = `
  @media (max-width: 600px) {
    .cust-header { flex-direction: column !important; gap: 12px !important; }
    .cust-header button { width: 100% !important; justify-content: center !important; }
    .cust-filters { gap: 8px !important; }
    .cust-filters > div { min-width: 0 !important; width: 100% !important; }
    .cust-filters button { padding: 7px 10px !important; font-size: 11px !important; }
    .cust-grid { grid-template-columns: 1fr !important; }
    .cust-modal-inner { padding: 20px !important; margin: 12px !important; max-height: 92vh !important; overflow-y: auto !important; }
    .cust-form-grid { grid-template-columns: 1fr !important; }
    .cust-form-grid > div[style*="1/-1"] { grid-column: 1 !important; }
  }
`;

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders]       = useState([]);
  const [search, setSearch]       = useState("");
  const [divFilter, setDivFilter] = useState("all");
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [selected, setSelected]   = useState(null);

  useEffect(() => {
    const unsubC = onSnapshot(collection(db, "customers"), snap =>
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubO = onSnapshot(collection(db, "orders"), snap =>
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubC(); unsubO(); };
  }, []);

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    if (!form.name.trim()) return alert("Customer name is required.");
    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "customers", editingId), { ...form });
      } else {
        await addDoc(collection(db, "customers"), { ...form, createdAt: serverTimestamp() });
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch (err) {
      alert("Failed to save: " + err.message);
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm("Delete this customer? Their orders won't be deleted.")) return;
    await deleteDoc(doc(db, "customers", id));
    setSelected(null);
  }

  function openEdit(c) {
    setForm({ name: c.name || "", contact: c.contact || "", phone: c.phone || "", email: c.email || "", division: c.division || "", notes: c.notes || "" });
    setEditingId(c.id);
    setSelected(null);
    setShowForm(true);
  }

  function getOrderCount(name) {
    return orders.filter(o => o.client?.toLowerCase() === name?.toLowerCase()).length;
  }

  function getTotalValue(name) {
    return orders
      .filter(o => o.client?.toLowerCase() === name?.toLowerCase())
      .reduce((sum, o) => sum + (parseFloat(o.value) || 0), 0);
  }

  const filtered = customers.filter(c => {
    const matchSearch = !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search);
    const matchDiv = divFilter === "all" || c.division === divFilter;
    return matchSearch && matchDiv;
  });

  const selectedCustomer = selected ? customers.find(c => c.id === selected) : null;

  return (
    <div>
      <style>{mobileStyles}</style>

      {/* Header */}
      <div className="cust-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, color: "#C9A84C", margin: 0 }}>
            Customers
          </h1>
          <p style={{ color: "#555", marginTop: 6, fontSize: 14 }}>
            {customers.length} saved clients
          </p>
        </div>
        <button onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }} style={{
          background: "#C9A84C", color: "#0D0D0D", border: "none", borderRadius: 10,
          padding: "11px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8, fontFamily: "'DM Sans', sans-serif",
        }}>
          <Plus size={16} /> Add Customer
        </button>
      </div>

      {/* Search + Division Filter */}
      <div className="cust-filters" style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#555" }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, phone..."
            style={{ ...inp, paddingLeft: 36 }} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["all", "print", "it", "clothing", ""].map(f => (
            <button key={f} onClick={() => setDivFilter(f)} style={{
              background: divFilter === f ? "#C9A84C" : "#1A1A1A",
              color:      divFilter === f ? "#0D0D0D" : "#888",
              border:     "1px solid " + (divFilter === f ? "#C9A84C" : "#333"),
              borderRadius: 20, padding: "8px 16px", fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}>
              {f === "all" ? "All" : DIVISIONS.find(d => d.value === f)?.label || "Unknown"}
            </button>
          ))}
        </div>
      </div>

      {/* Customers Grid */}
      <div className="cust-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {filtered.length === 0 ? (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 0", color: "#444" }}>
            No customers found
          </div>
        ) : filtered.map(c => {
          const orderCount = getOrderCount(c.name);
          const totalVal   = getTotalValue(c.name);
          const divColor   = divisionColors[c.division] || "#555";
          return (
            <div key={c.id} onClick={() => setSelected(c.id)} style={{
              background: "#1A1A1A", border: "1px solid #2a2a2a", borderRadius: 14,
              padding: 20, cursor: "pointer", borderLeft: "3px solid " + divColor,
              transition: "border-color 0.15s",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: "50%",
                  background: divColor + "22", border: "1px solid " + divColor + "44",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <User size={16} color={divColor} />
                </div>
                {c.division && (
                  <span style={{
                    background: divColor + "22", color: divColor,
                    border: "1px solid " + divColor + "44",
                    borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600,
                  }}>
                    {DIVISIONS.find(d => d.value === c.division)?.label || c.division}
                  </span>
                )}
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#F0F0F0", marginBottom: 4 }}>{c.name}</div>
              {c.contact && <div style={{ fontSize: 12, color: "#666", marginBottom: 2 }}>{c.contact}</div>}
              {c.phone   && <div style={{ fontSize: 12, color: "#888", marginBottom: 2 }}>{c.phone}</div>}
              {c.email   && <div style={{ fontSize: 12, color: "#52A9E0", marginBottom: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}</div>}
              <div style={{ display: "flex", gap: 16, marginTop: 10, paddingTop: 10, borderTop: "1px solid #222" }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#C9A84C" }}>{orderCount}</div>
                  <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: 1 }}>Orders</div>
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#52C97A" }}>R{totalVal.toFixed(0)}</div>
                  <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: 1 }}>Total Value</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div onClick={() => setSelected(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div className="cust-modal-inner" onClick={e => e.stopPropagation()} style={{
            background: "#1A1A1A", border: "1px solid #333", borderRadius: 16,
            width: "100%", maxWidth: 480, padding: 32, position: "relative",
          }}>
            <button onClick={() => setSelected(null)} style={{
              position: "absolute", top: 16, right: 16, background: "transparent",
              border: "none", color: "#666", cursor: "pointer",
            }}><X size={20} /></button>

            <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#C9A84C", marginBottom: 4 }}>
              {selectedCustomer.name}
            </h2>
            <p style={{ color: "#555", fontSize: 13, marginBottom: 24 }}>
              {DIVISIONS.find(d => d.value === selectedCustomer.division)?.label || "No division"}
            </p>

            {[
              ["Contact",  selectedCustomer.contact],
              ["Phone",    selectedCustomer.phone],
              ["Email",    selectedCustomer.email],
              ["Notes",    selectedCustomer.notes],
              ["Orders",   getOrderCount(selectedCustomer.name) + " orders"],
              ["Total Value", "R " + getTotalValue(selectedCustomer.name).toFixed(2)],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} style={{
                display: "flex", justifyContent: "space-between",
                padding: "10px 0", borderBottom: "1px solid #222", fontSize: 13,
              }}>
                <span style={{ color: "#666" }}>{k}</span>
                <span style={{ color: "#ddd", fontWeight: 500 }}>{v}</span>
              </div>
            ))}

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={() => openEdit(selectedCustomer)} style={{
                flex: 1, background: "#C9A84C", color: "#0D0D0D", border: "none",
                borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 700,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              }}>✏️ Edit</button>
              <button onClick={() => handleDelete(selectedCustomer.id)} style={{
                background: "transparent", color: "#E05252", border: "1px solid #E05252",
                borderRadius: 8, padding: "10px 16px", fontSize: 13, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}>🗑️ Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {showForm && (
        <div onClick={() => setShowForm(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div className="cust-modal-inner" onClick={e => e.stopPropagation()} style={{
            background: "#1A1A1A", border: "1px solid #333", borderRadius: 16,
            width: "100%", maxWidth: 520, padding: 32, position: "relative",
          }}>
            <button onClick={() => setShowForm(false)} style={{
              position: "absolute", top: 16, right: 16, background: "transparent",
              border: "none", color: "#666", cursor: "pointer",
            }}><X size={20} /></button>

            <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#C9A84C", marginBottom: 24 }}>
              {editingId ? "Edit Customer" : "New Customer"}
            </h2>

            <div className="cust-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Customer / Company Name</label>
                <input value={form.name} onChange={e => setField("name", e.target.value)} style={inp} placeholder="e.g. Acme Corp" />
              </div>
              {[
                ["contact", "Contact Person", "text"],
                ["phone",   "Phone",          "text"],
                ["email",   "Email",          "email"],
              ].map(([key, label, type]) => (
                <div key={key}>
                  <label style={lbl}>{label}</label>
                  <input type={type} value={form[key]} onChange={e => setField(key, e.target.value)} style={inp} />
                </div>
              ))}
              <div>
                <label style={lbl}>Division</label>
                <select value={form.division} onChange={e => setField("division", e.target.value)}
                  style={{ ...inp, background: "#111" }}>
                  {DIVISIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Notes</label>
                <textarea value={form.notes} onChange={e => setField("notes", e.target.value)}
                  rows={2} style={{ ...inp, resize: "vertical" }} />
              </div>
            </div>

            <button onClick={handleSave} disabled={saving} style={{
              marginTop: 24, width: "100%", background: "#C9A84C", color: "#0D0D0D",
              border: "none", borderRadius: 8, padding: "13px", fontSize: 15,
              fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {saving ? "Saving..." : editingId ? "Update Customer" : "Save Customer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}