import { useEffect, useState, useRef } from "react";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, serverTimestamp, query, where, getDocs
} from "firebase/firestore";
import { db } from "../firebase";
import { Plus, X, Search, Download, Upload, Paperclip, Trash2, Image, Calendar, UserCheck } from "lucide-react";

const DIVISIONS = [
  { value: "print",    label: "Print / DTF / Vinyl" },
  { value: "it",       label: "IT Company" },
  { value: "clothing", label: "Clothing Brand" },
];

const STAGES_BY_DIVISION = {
  print: [
    { key: "depositPaid",      label: "💰 Deposit Paid" },
    { key: "artworkApproved",  label: "🎨 Artwork Approved" },
    { key: "inProduction",     label: "⚙️ In Production" },
    { key: "productionDone",   label: "✅ Production Done" },
    { key: "delivered",        label: "🚚 Delivered" },
    { key: "balanceCollected", label: "💵 Balance Collected" },
  ],
  it_project: [
    { key: "depositPaid",           label: "💰 Deposit Paid" },
    { key: "requirementsConfirmed", label: "📋 Requirements Confirmed" },
    { key: "inDevelopment",         label: "💻 In Development" },
    { key: "testing",               label: "🧪 Testing" },
    { key: "handedOver",            label: "🤝 Handed Over" },
    { key: "balanceCollected",      label: "💵 Balance Collected" },
  ],
  it_recurring: [
    { key: "active",          label: "🟢 Active" },
    { key: "invoiceSent",     label: "📄 Invoice Sent" },
    { key: "paymentReceived", label: "💵 Payment Received" },
  ],
  clothing: [
    { key: "orderReceived", label: "📦 Order Received" },
    { key: "packed",        label: "📫 Packed" },
    { key: "shipped",       label: "🚚 Shipped" },
    { key: "delivered",     label: "✅ Delivered" },
  ],
};

const ALL_STAGE_KEYS = [
  "depositPaid","artworkApproved","inProduction","productionDone","delivered","balanceCollected",
  "requirementsConfirmed","inDevelopment","testing","handedOver",
  "active","invoiceSent","paymentReceived",
  "orderReceived","packed","shipped",
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getStatus(j) {
  const div = j.division;
  if (div === "clothing") {
    if (j.delivered) return "complete"; if (j.shipped) return "delivered"; if (j.packed) return "production"; return "new";
  }
  if (div === "it" && j.itType === "recurring") {
    if (j.paymentReceived) return "complete"; if (j.invoiceSent) return "active"; if (j.active) return "production"; return "new";
  }
  if (j.balanceCollected) return "complete";
  if (j.delivered || j.handedOver) return "delivered";
  if (j.inProduction || j.inDevelopment || j.testing) return "production";
  if (j.depositPaid) return "active";
  return "new";
}

const statusColors = { complete: "#52C97A", delivered: "#52A9E0", production: "#C9A84C", active: "#9B7DE8", new: "#E05252" };
const statusLabels = { complete: "Complete", delivered: "Delivered", production: "In Progress", active: "Active", new: "New" };

function makeEmpty() {
  const stages = {};
  ALL_STAGE_KEYS.forEach(k => { stages[k] = false; });
  return {
    ref: "", client: "", contact: "", phone: "", email: "",
    division: "print", itType: "project",
    date: "", due: "", description: "",
    qty: "", value: "", depositAmt: "", balance: "",
    paidInFull: false, notes: "", artworkFiles: [],
    monthlyRate: "", monthlyPaid: {},
    ...stages,
  };
}

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

function getStages(order) {
  if (order.division === "it") return order.itType === "recurring" ? STAGES_BY_DIVISION.it_recurring : STAGES_BY_DIVISION.it_project;
  if (order.division === "clothing") return STAGES_BY_DIVISION.clothing;
  return STAGES_BY_DIVISION.print;
}

function monthLabel(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr); if (isNaN(d)) return null;
  return d.toLocaleString("default", { month: "long", year: "numeric" });
}
function monthKey(dateStr) {
  if (!dateStr) return "unknown";
  const d = new Date(dateStr); if (isNaN(d)) return "unknown";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function Orders() {
  const [orders, setOrders]       = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(makeEmpty());
  const [editingId, setEditingId] = useState(null);
  const [selected, setSelected]   = useState(null);
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [saving, setSaving]       = useState(false);
  const [uploadingForm, setUploadingForm]     = useState(false);
  const [uploadingDirect, setUploadingDirect] = useState(false);
  const [clientSearch, setClientSearch]       = useState("");
  const [showClientDrop, setShowClientDrop]   = useState(false);
  const fileInputRef      = useRef(null);
  const artInputRef       = useRef(null);
  const artInputDetailRef = useRef(null);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, "orders"),    snap => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(collection(db, "customers"), snap => setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); };
  }, []);

  const availableMonths = [...new Set(orders.map(o => monthKey(o.date)).filter(k => k !== "unknown"))].sort().reverse();

  function setField(k, v) {
    setForm(f => {
      const updated = { ...f, [k]: v };
      if (updated.division !== "clothing") {
        const val = parseFloat(updated.value) || 0;
        const dep = parseFloat(updated.depositAmt) || 0;
        updated.balance = (val - dep).toFixed(2);
      }
      return updated;
    });
  }

  async function handleSave() {
    if (!form.client || !form.description) return alert("Client and description are required.");
    setSaving(true);
    try {
      const data = { ...form, value: parseFloat(form.value) || 0, depositAmt: form.division === "clothing" ? 0 : (parseFloat(form.depositAmt) || 0), balance: form.division === "clothing" ? 0 : (parseFloat(form.balance) || 0), artworkFiles: form.artworkFiles || [] };
      if (editingId) { await updateDoc(doc(db, "orders", editingId), data); }
      else { data.createdAt = serverTimestamp(); await addDoc(collection(db, "orders"), data); }
      if (form.client.trim()) {
        const existing = customers.find(c => c.name?.toLowerCase() === form.client.trim().toLowerCase());
        if (!existing) await addDoc(collection(db, "customers"), { name: form.client.trim(), contact: form.contact || "", phone: form.phone || "", email: form.email || "", division: form.division || "", createdAt: serverTimestamp() });
        else await updateDoc(doc(db, "customers", existing.id), { contact: form.contact || existing.contact, phone: form.phone || existing.phone, email: form.email || existing.email, division: form.division });
      }
      setShowForm(false); setForm(makeEmpty()); setEditingId(null); setClientSearch("");
    } catch (err) { alert("Failed to save order: " + err.message); }
    setSaving(false);
  }

  async function toggleStage(order, key) { await updateDoc(doc(db, "orders", order.id), { [key]: !order[key] }); }
  async function handleDelete(id) { if (!confirm("Delete this order?")) return; await deleteDoc(doc(db, "orders", id)); setSelected(null); }

  function openEdit(j) { setForm({ ...makeEmpty(), ...j, artworkFiles: j.artworkFiles || [] }); setEditingId(j.id); setSelected(null); setShowForm(true); }
  function selectCustomer(c) { setForm(f => ({ ...f, client: c.name, contact: c.contact, phone: c.phone, email: c.email })); setClientSearch(c.name); setShowClientDrop(false); }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file);
    });
  }

  async function handleArtUploadForm(e) {
    const files = Array.from(e.target.files); if (!files.length) return;
    const oversized = files.filter(f => f.size > 700 * 1024);
    if (oversized.length) { alert(`Files too large (max 700KB each):\n${oversized.map(f => f.name).join("\n")}`); e.target.value = ""; return; }
    setUploadingForm(true);
    try {
      const uploaded = [];
      for (const file of files) { const base64 = await fileToBase64(file); uploaded.push({ name: file.name, url: base64, path: `${Date.now()}_${file.name}` }); }
      setForm(f => ({ ...f, artworkFiles: [...(f.artworkFiles || []), ...uploaded] }));
    } catch (err) { alert("Failed to process file: " + err.message); }
    setUploadingForm(false); e.target.value = "";
  }

  async function handleArtUploadDirect(e, orderId) {
    const files = Array.from(e.target.files); if (!files.length) return;
    const oversized = files.filter(f => f.size > 700 * 1024);
    if (oversized.length) { alert(`Files too large (max 700KB each):\n${oversized.map(f => f.name).join("\n")}`); e.target.value = ""; return; }
    setUploadingDirect(true);
    try {
      const order = orders.find(o => o.id === orderId); const existing = order?.artworkFiles || []; const uploaded = [];
      for (const file of files) { const base64 = await fileToBase64(file); uploaded.push({ name: file.name, url: base64, path: `${Date.now()}_${file.name}` }); }
      await updateDoc(doc(db, "orders", orderId), { artworkFiles: [...existing, ...uploaded] });
    } catch (err) { alert("Failed to save file: " + err.message); }
    setUploadingDirect(false); e.target.value = "";
  }

  async function handleDeleteArtwork(orderId, fileObj) {
    if (!confirm(`Remove "${fileObj.name}"?`)) return;
    const order = orders.find(o => o.id === orderId);
    const updated = (order?.artworkFiles || []).filter(f => f.path !== fileObj.path);
    await updateDoc(doc(db, "orders", orderId), { artworkFiles: updated });
  }

  function removeArtFromForm(path) { setForm(f => ({ ...f, artworkFiles: (f.artworkFiles || []).filter(a => a.path !== path) })); }

  async function toggleMonthPaid(order, year, monthIdx) {
    const key = `${year}-${monthIdx}`; const current = order.monthlyPaid || {};
    await updateDoc(doc(db, "orders", order.id), { monthlyPaid: { ...current, [key]: !current[key] } });
  }

  function handleExport() {
    const data = orders.map(({ id, ...rest }) => rest);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `rr-orders-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url);
  }

  async function handleImport(e) {
    const file = e.target.files[0]; if (!file) return;
    try {
      const text = await file.text(); const data = JSON.parse(text);
      if (!Array.isArray(data)) return alert("Invalid file format.");
      if (!confirm(`Import ${data.length} orders?`)) return;
      for (const order of data) await addDoc(collection(db, "orders"), { ...order, createdAt: serverTimestamp() });
      alert(`${data.length} orders imported.`);
    } catch { alert("Failed to read file."); }
    e.target.value = "";
  }

  const filtered = orders.filter(j => {
    const s = getStatus(j);
    return (filter === "all" || s === filter) &&
      (monthFilter === "all" || monthKey(j.date) === monthFilter) &&
      (!search || j.client?.toLowerCase().includes(search.toLowerCase()) || j.ref?.toLowerCase().includes(search.toLowerCase()));
  });

  const selectedOrder = selected ? orders.find(o => o.id === selected) : null;
  const isImage = name => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);

  return (
    <div>
      <style>{`
        @media (max-width: 768px) {
          .orders-header { flex-direction: column !important; gap: 12px !important; }
          .orders-header-btns { display: flex; gap: 8px; flex-wrap: wrap; }
          .orders-grid { grid-template-columns: 1fr !important; }
          .orders-filters { flex-wrap: wrap !important; }
          .orders-modal-inner { padding: 20px 16px !important; max-height: 95vh !important; }
          .orders-form-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="orders-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: "#C9A84C", margin: 0 }}>Order Tracker</h1>
          <p style={{ color: "#555", marginTop: 4, fontSize: 13 }}>All divisions · {orders.length} total orders</p>
        </div>
        <div className="orders-header-btns" style={{ display: "flex", gap: 8 }}>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
          <button onClick={() => fileInputRef.current.click()} style={{ background: "transparent", color: "#888", border: "1px solid #333", borderRadius: 8, padding: "9px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "'DM Sans', sans-serif" }}>
            <Upload size={13} /> Import
          </button>
          <button onClick={handleExport} style={{ background: "transparent", color: "#888", border: "1px solid #333", borderRadius: 8, padding: "9px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "'DM Sans', sans-serif" }}>
            <Download size={13} /> Export
          </button>
          <button onClick={() => { setForm(makeEmpty()); setEditingId(null); setClientSearch(""); setShowForm(true); }} style={{ background: "#C9A84C", color: "#0D0D0D", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "'DM Sans', sans-serif" }}>
            <Plus size={14} /> New Order
          </button>
        </div>
      </div>

      {/* Month filter */}
      <div className="orders-filters" style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center", overflowX: "auto" }}>
        <Calendar size={13} style={{ color: "#555", flexShrink: 0 }} />
        <button onClick={() => setMonthFilter("all")} style={{ background: monthFilter === "all" ? "#C9A84C22" : "transparent", color: monthFilter === "all" ? "#C9A84C" : "#555", border: "1px solid " + (monthFilter === "all" ? "#C9A84C55" : "#2a2a2a"), borderRadius: 20, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>All Months</button>
        {availableMonths.map(mk => {
          const d = new Date(mk + "-01"); const label = d.toLocaleString("default", { month: "short", year: "numeric" });
          return (
            <button key={mk} onClick={() => setMonthFilter(mk)} style={{ background: monthFilter === mk ? "#C9A84C22" : "transparent", color: monthFilter === mk ? "#C9A84C" : "#555", border: "1px solid " + (monthFilter === mk ? "#C9A84C55" : "#2a2a2a"), borderRadius: 20, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>{label}</button>
          );
        })}
      </div>

      {/* Search + status */}
      <div className="orders-filters" style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#555" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search client or ref..." style={{ ...inp, paddingLeft: 36 }} />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["all", "new", "active", "production", "delivered", "complete"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? "#C9A84C" : "#1A1A1A", color: filter === f ? "#0D0D0D" : "#888", border: "1px solid " + (filter === f ? "#C9A84C" : "#333"), borderRadius: 20, padding: "7px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "capitalize", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>
              {f === "all" ? "All" : statusLabels[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Orders grid */}
      <div className="orders-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
        {filtered.length === 0 ? (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 0", color: "#444" }}>No orders found</div>
        ) : filtered.map(j => {
          const s = getStatus(j); const stages = getStages(j); const steps = stages.map(st => j[st.key]); const done = steps.filter(Boolean).length;
          const artCount = (j.artworkFiles || []).length; const isRecurring = j.division === "it" && j.itType === "recurring"; const isClothing = j.division === "clothing";
          return (
            <div key={j.id} onClick={() => setSelected(j.id)} style={{ background: "#1A1A1A", border: "1px solid #2a2a2a", borderRadius: 14, padding: 18, cursor: "pointer", borderTop: "3px solid " + statusColors[s] }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ color: "#C9A84C", fontWeight: 700, fontSize: 13 }}>{j.ref || "—"}</span>
                <span style={{ background: statusColors[s] + "22", color: statusColors[s], border: "1px solid " + statusColors[s] + "44", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>{statusLabels[s]}</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: 15, color: "#F0F0F0", marginBottom: 4 }}>{j.client}</div>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>
                {DIVISIONS.find(d => d.value === j.division)?.label}{isRecurring ? " · Recurring" : ""}{j.due ? " · Due: " + j.due : ""}
              </div>
              <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
                {steps.map((v, i) => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: v ? "#C9A84C" : (i === done ? "#444" : "#222"), border: i === done && !v ? "1px solid #555" : "none" }} />)}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {isClothing ? <span style={{ fontSize: 12, color: j.paidInFull ? "#52C97A" : "#E05252", fontWeight: 600 }}>{j.paidInFull ? "✓ Paid" : "✗ Unpaid"}</span>
                    : isRecurring ? <span style={{ fontSize: 12, color: "#9B7DE8", fontWeight: 600 }}>R{j.monthlyRate || 0}/mo</span>
                    : <span style={{ fontSize: 12, color: j.depositPaid ? "#52C97A" : "#E05252", fontWeight: 600 }}>{j.depositPaid ? "✓ Deposit" : "✗ No Deposit"}</span>}
                  {artCount > 0 && <span style={{ fontSize: 11, color: "#52A9E0", display: "flex", alignItems: "center", gap: 3 }}><Paperclip size={11} />{artCount}</span>}
                </div>
                {!isRecurring && <span style={{ fontSize: 13, fontWeight: 700, color: "#F0F0F0" }}>{isClothing ? "R " + (j.value || 0).toFixed(2) : "R " + (j.balance || 0).toFixed(2) + " owing"}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {selectedOrder && (() => {
        const stages = getStages(selectedOrder); const isRecurring = selectedOrder.division === "it" && selectedOrder.itType === "recurring"; const isClothing = selectedOrder.division === "clothing"; const currentYear = new Date().getFullYear();
        return (
          <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "12px" }}>
            <div className="orders-modal-inner" onClick={e => e.stopPropagation()} style={{ background: "#1A1A1A", border: "1px solid #333", borderRadius: 16, width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", padding: 28, position: "relative" }}>
              <button onClick={() => setSelected(null)} style={{ position: "absolute", top: 14, right: 14, background: "transparent", border: "none", color: "#666", cursor: "pointer" }}><X size={20} /></button>
              <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#C9A84C", marginBottom: 4, paddingRight: 30 }}>{selectedOrder.ref} — {selectedOrder.client}</h2>
              <p style={{ color: "#555", fontSize: 13, marginBottom: 20 }}>{DIVISIONS.find(d => d.value === selectedOrder.division)?.label}{isRecurring ? " · Recurring" : ""}</p>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Update Stages</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {stages.map(st => (
                    <button key={st.key} onClick={() => toggleStage(selectedOrder, st.key)} style={{ background: selectedOrder[st.key] ? "#C9A84C22" : "#111", border: "1px solid " + (selectedOrder[st.key] ? "#C9A84C" : "#333"), color: selectedOrder[st.key] ? "#C9A84C" : "#666", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{st.label}</button>
                  ))}
                </div>
              </div>

              {isRecurring && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Monthly Payments — {currentYear} · R{selectedOrder.monthlyRate || 0}/mo</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {MONTHS.map((m, i) => {
                      const key = `${currentYear}-${i}`; const paid = selectedOrder.monthlyPaid?.[key];
                      return <button key={key} onClick={() => toggleMonthPaid(selectedOrder, currentYear, i)} style={{ background: paid ? "#52C97A22" : "#111", border: "1px solid " + (paid ? "#52C97A" : "#333"), color: paid ? "#52C97A" : "#555", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{m}{paid ? " ✓" : ""}</button>;
                    })}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Artwork Files</div>
                {(selectedOrder.artworkFiles || []).length === 0 ? <div style={{ color: "#444", fontSize: 13, marginBottom: 10 }}>No artwork uploaded yet</div> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 10 }}>
                    {(selectedOrder.artworkFiles || []).map((file, i) => (
                      <div key={i} style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 8, padding: "9px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          {isImage(file.name) ? <img src={file.url} alt={file.name} style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4, border: "1px solid #333", flexShrink: 0 }} /> : <div style={{ width: 32, height: 32, background: "#1a1a1a", border: "1px solid #333", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Paperclip size={14} color="#555" /></div>}
                          <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ color: "#52A9E0", fontSize: 12, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</a>
                        </div>
                        <button onClick={() => handleDeleteArtwork(selectedOrder.id, file)} style={{ background: "transparent", border: "none", color: "#E05252", cursor: "pointer", flexShrink: 0 }}><Trash2 size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <input ref={artInputDetailRef} type="file" multiple accept="image/*,.pdf,.svg" onChange={e => handleArtUploadDirect(e, selectedOrder.id)} style={{ display: "none" }} />
                <button onClick={() => artInputDetailRef.current.click()} disabled={uploadingDirect} style={{ background: "transparent", border: "1px dashed #333", borderRadius: 8, color: uploadingDirect ? "#C9A84C" : "#888", cursor: uploadingDirect ? "not-allowed" : "pointer", padding: "9px 14px", fontSize: 13, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: "'DM Sans', sans-serif" }}>
                  <Image size={13} />{uploadingDirect ? "⏳ Uploading..." : "Upload Artwork Files"}
                </button>
              </div>

              {[["Client", selectedOrder.client], ["Contact", selectedOrder.contact], ["Phone", selectedOrder.phone], ["Email", selectedOrder.email], ["Order Date", selectedOrder.date], ["Due Date", selectedOrder.due], ["Description", selectedOrder.description], ["Quantity", selectedOrder.qty], ["Order Value", "R " + (selectedOrder.value || 0).toFixed(2)], ...(!isClothing && !isRecurring ? [["Deposit Paid", "R " + (selectedOrder.depositAmt || 0).toFixed(2)], ["Balance Owing", "R " + (selectedOrder.balance || 0).toFixed(2)]] : []), ...(isClothing ? [["Paid in Full", selectedOrder.paidInFull ? "Yes ✓" : "No"]] : []), ...(isRecurring ? [["Monthly Rate", "R " + (selectedOrder.monthlyRate || 0)]] : []), ["Notes", selectedOrder.notes]].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #222", fontSize: 13 }}>
                  <span style={{ color: "#666" }}>{k}</span>
                  <span style={{ color: "#ddd", fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>{v}</span>
                </div>
              ))}

              <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                <button onClick={() => openEdit(selectedOrder)} style={{ flex: 1, background: "#C9A84C", color: "#0D0D0D", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>✏️ Edit Order</button>
                <button onClick={() => handleDelete(selectedOrder.id)} style={{ background: "transparent", color: "#E05252", border: "1px solid #E05252", borderRadius: 8, padding: "10px 14px", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>🗑️ Delete</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Form Modal */}
      {showForm && (() => {
        const isIT = form.division === "it"; const isRecurring = isIT && form.itType === "recurring"; const isClothing = form.division === "clothing"; const stages = getStages(form);
        return (
          <div onClick={() => setShowForm(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "12px" }}>
            <div className="orders-modal-inner" onClick={e => e.stopPropagation()} style={{ background: "#1A1A1A", border: "1px solid #333", borderRadius: 16, width: "100%", maxWidth: 660, maxHeight: "90vh", overflowY: "auto", padding: 28, position: "relative" }}>
              <button onClick={() => setShowForm(false)} style={{ position: "absolute", top: 14, right: 14, background: "transparent", border: "none", color: "#666", cursor: "pointer" }}><X size={20} /></button>
              <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#C9A84C", marginBottom: 20 }}>{editingId ? "Edit Order" : "New Order"}</h2>

              <div className="orders-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div><label style={lbl}>Order Ref</label><input value={form.ref || ""} onChange={e => setField("ref", e.target.value)} style={inp} /></div>

                <div style={{ position: "relative" }}>
                  <label style={lbl}>Client Name {customers.length > 0 && <span style={{ color: "#555", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>· {customers.length} saved</span>}</label>
                  <div style={{ position: "relative" }}>
                    <UserCheck size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#555", pointerEvents: "none" }} />
                    <input value={clientSearch || form.client} onChange={e => { setClientSearch(e.target.value); setField("client", e.target.value); setShowClientDrop(true); }} onFocus={() => setShowClientDrop(true)} onBlur={() => setTimeout(() => setShowClientDrop(false), 150)} placeholder="Type or search client..." style={{ ...inp, paddingLeft: 34 }} />
                  </div>
                  {showClientDrop && customers.filter(c => c.name?.toLowerCase().includes((clientSearch || "").toLowerCase())).length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 999, background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, maxHeight: 160, overflowY: "auto", marginTop: 4 }}>
                      {customers.filter(c => c.name?.toLowerCase().includes((clientSearch || "").toLowerCase())).map(c => (
                        <div key={c.id} onMouseDown={() => selectCustomer(c)} style={{ padding: "9px 14px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid #222" }} onMouseEnter={e => e.currentTarget.style.background = "#252525"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <span style={{ color: "#F0F0F0", fontWeight: 600 }}>{c.name}</span>
                          {(c.phone || c.email) && <span style={{ color: "#555", fontSize: 11, marginLeft: 8 }}>{c.phone}{c.phone && c.email ? " · " : ""}{c.email}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {[["contact","Contact Person","text"],["phone","Phone","text"],["email","Email","email"],["date","Order Date","date"],["due","Due Date","date"],...(!isRecurring ? [["qty","Quantity","text"]] : [])].map(([key, label, type]) => (
                  <div key={key}><label style={lbl}>{label}</label><input type={type} value={form[key] || ""} onChange={e => setField(key, e.target.value)} style={inp} /></div>
                ))}

                <div><label style={lbl}>Division</label><select value={form.division} onChange={e => setField("division", e.target.value)} style={{ ...inp, background: "#111" }}>{DIVISIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}</select></div>
                {isIT && <div><label style={lbl}>IT Order Type</label><select value={form.itType} onChange={e => setField("itType", e.target.value)} style={{ ...inp, background: "#111" }}><option value="project">Once-off Project</option><option value="recurring">Recurring / Retainer</option></select></div>}

                {isClothing && (
                  <>
                    <div><label style={lbl}>Order Value (R)</label><input type="number" value={form.value} onChange={e => setField("value", e.target.value)} style={inp} /></div>
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                      <label style={{ ...lbl, marginBottom: 10 }}>Paid in Full</label>
                      <button onClick={() => setField("paidInFull", !form.paidInFull)} style={{ background: form.paidInFull ? "#52C97A22" : "#111", border: "1px solid " + (form.paidInFull ? "#52C97A" : "#333"), color: form.paidInFull ? "#52C97A" : "#666", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{form.paidInFull ? "✓ Paid in Full" : "Mark as Paid"}</button>
                    </div>
                  </>
                )}
                {isRecurring && <div><label style={lbl}>Monthly Rate (R)</label><input type="number" value={form.monthlyRate} onChange={e => setField("monthlyRate", e.target.value)} style={inp} /></div>}
                {!isClothing && !isRecurring && (
                  <>
                    <div><label style={lbl}>Order Value (R)</label><input type="number" value={form.value} onChange={e => setField("value", e.target.value)} style={inp} /></div>
                    <div><label style={lbl}>Deposit Amount (R)</label><input type="number" value={form.depositAmt} onChange={e => setField("depositAmt", e.target.value)} style={inp} /></div>
                    <div><label style={lbl}>Balance Owing (R)</label><input readOnly value={form.balance} style={{ ...inp, background: "#0D0D0D", color: "#C9A84C" }} /></div>
                  </>
                )}

                <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Description</label><textarea value={form.description} onChange={e => setField("description", e.target.value)} rows={3} style={{ ...inp, resize: "vertical" }} /></div>
                <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Notes</label><textarea value={form.notes} onChange={e => setField("notes", e.target.value)} rows={2} style={{ ...inp, resize: "vertical" }} /></div>
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Artwork Files</div>
                {(form.artworkFiles || []).length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 8 }}>
                    {(form.artworkFiles || []).map((file, i) => (
                      <div key={i} style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 8, padding: "7px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ color: "#52A9E0", fontSize: 12 }}>{file.name}</span>
                        <button onClick={() => removeArtFromForm(file.path)} style={{ background: "transparent", border: "none", color: "#E05252", cursor: "pointer" }}><X size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <input ref={artInputRef} type="file" multiple accept="image/*,.pdf,.svg" onChange={handleArtUploadForm} style={{ display: "none" }} />
                <button onClick={() => artInputRef.current.click()} disabled={uploadingForm} style={{ background: "transparent", border: "1px dashed #333", borderRadius: 8, color: uploadingForm ? "#C9A84C" : "#888", cursor: uploadingForm ? "not-allowed" : "pointer", padding: "9px 14px", fontSize: 13, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: "'DM Sans', sans-serif" }}>
                  <Image size={13} />{uploadingForm ? "⏳ Uploading..." : "Attach Artwork Files"}
                </button>
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Stages</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {stages.map(st => <button key={st.key} onClick={() => setField(st.key, !form[st.key])} style={{ background: form[st.key] ? "#C9A84C22" : "#111", border: "1px solid " + (form[st.key] ? "#C9A84C" : "#333"), color: form[st.key] ? "#C9A84C" : "#666", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{st.label}</button>)}
                </div>
              </div>

              <button onClick={handleSave} disabled={saving || uploadingForm} style={{ marginTop: 20, width: "100%", background: "#C9A84C", color: "#0D0D0D", border: "none", borderRadius: 8, padding: "13px", fontSize: 15, fontWeight: 700, cursor: (saving || uploadingForm) ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                {saving ? "Saving..." : editingId ? "Update Order" : "Save Order"}
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}