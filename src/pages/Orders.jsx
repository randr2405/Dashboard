import { useEffect, useState, useRef } from "react";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, serverTimestamp
} from "firebase/firestore";
import {
  ref, uploadBytes, getDownloadURL, deleteObject
} from "firebase/storage";
import { db, storage } from "../firebase";
import { Plus, X, Search, Download, Upload, Paperclip, Trash2, Image, Calendar } from "lucide-react";

// ─── Divisions ───────────────────────────────────────────────────────────────
const DIVISIONS = [
  { value: "print",    label: "Print / DTF / Vinyl" },
  { value: "it",       label: "IT Company" },
  { value: "clothing", label: "Clothing Brand" },
];

// ─── Division-specific stages ────────────────────────────────────────────────
const STAGES_BY_DIVISION = {
  print: [
    { key: "depositPaid",      label: "💰 Deposit Paid" },
    { key: "artworkApproved",  label: "🎨 Artwork Approved" },
    { key: "inProduction",     label: "⚙️ In Production" },
    { key: "productionDone",   label: "✅ Production Done" },
    { key: "delivered",        label: "🚚 Delivered" },
    { key: "balanceCollected", label: "💵 Balance Collected" },
  ],
  // IT once-off project stages
  it_project: [
    { key: "depositPaid",        label: "💰 Deposit Paid" },
    { key: "requirementsConfirmed", label: "📋 Requirements Confirmed" },
    { key: "inDevelopment",      label: "💻 In Development" },
    { key: "testing",            label: "🧪 Testing" },
    { key: "handedOver",         label: "🤝 Handed Over" },
    { key: "balanceCollected",   label: "💵 Balance Collected" },
  ],
  // IT recurring/retainer — monthly cycle
  it_recurring: [
    { key: "active",         label: "🟢 Active" },
    { key: "invoiceSent",    label: "📄 Invoice Sent" },
    { key: "paymentReceived",label: "💵 Payment Received" },
  ],
  clothing: [
    { key: "orderReceived", label: "📦 Order Received" },
    { key: "packed",        label: "📫 Packed" },
    { key: "shipped",       label: "🚚 Shipped" },
    { key: "delivered",     label: "✅ Delivered" },
  ],
};

// All stage keys across all divisions (for initialising empty form)
const ALL_STAGE_KEYS = [
  "depositPaid","artworkApproved","inProduction","productionDone","delivered","balanceCollected",
  "requirementsConfirmed","inDevelopment","testing","handedOver",
  "active","invoiceSent","paymentReceived",
  "orderReceived","packed","shipped",
];

// Months for tracking recurring IT payments
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── Status derivation ───────────────────────────────────────────────────────
function getStatus(j) {
  const div = j.division;
  if (div === "clothing") {
    if (j.delivered)     return "complete";
    if (j.shipped)       return "delivered";
    if (j.packed)        return "production";
    return "new";
  }
  if (div === "it" && j.itType === "recurring") {
    if (j.paymentReceived) return "complete";
    if (j.invoiceSent)     return "active";
    if (j.active)          return "production";
    return "new";
  }
  // print + it project
  if (j.balanceCollected) return "complete";
  if (j.delivered || j.handedOver) return "delivered";
  if (j.inProduction || j.inDevelopment || j.testing) return "production";
  if (j.depositPaid) return "active";
  return "new";
}

const statusColors = {
  complete:   "#52C97A",
  delivered:  "#52A9E0",
  production: "#C9A84C",
  active:     "#9B7DE8",
  new:        "#E05252",
};
const statusLabels = {
  complete:   "Complete",
  delivered:  "Delivered",
  production: "In Progress",
  active:     "Active",
  new:        "New",
};

// ─── Empty form ──────────────────────────────────────────────────────────────
function makeEmpty() {
  const stages = {};
  ALL_STAGE_KEYS.forEach(k => { stages[k] = false; });
  return {
    ref: "", client: "", contact: "", phone: "", email: "",
    division: "print", itType: "project",
    date: "", due: "", description: "",
    qty: "", value: "", depositAmt: "", balance: "",
    paidInFull: false, notes: "",
    artworkFiles: [],
    monthlyRate: "", monthlyPaid: {}, // for recurring IT
    ...stages,
  };
}

// ─── Styles ──────────────────────────────────────────────────────────────────
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

// ─── Helper: get stages for an order ────────────────────────────────────────
function getStages(order) {
  if (order.division === "it") {
    return order.itType === "recurring" ? STAGES_BY_DIVISION.it_recurring : STAGES_BY_DIVISION.it_project;
  }
  if (order.division === "clothing") return STAGES_BY_DIVISION.clothing;
  return STAGES_BY_DIVISION.print;
}

// ─── Helper: format month label ──────────────────────────────────────────────
function monthLabel(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return d.toLocaleString("default", { month: "long", year: "numeric" });
}

function monthKey(dateStr) {
  if (!dateStr) return "unknown";
  const d = new Date(dateStr);
  if (isNaN(d)) return "unknown";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function Orders() {
  const [orders, setOrders]         = useState([]);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(makeEmpty());
  const [editingId, setEditingId]   = useState(null);
  const [selected, setSelected]     = useState(null);
  const [search, setSearch]         = useState("");
  const [filter, setFilter]         = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [saving, setSaving]         = useState(false);
  const [uploadingForm, setUploadingForm]     = useState(false);
  const [uploadingDirect, setUploadingDirect] = useState(false);
  const fileInputRef      = useRef(null);
  const artInputRef       = useRef(null);
  const artInputDetailRef = useRef(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "orders"), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  // ── Available months from existing orders ──
  const availableMonths = [...new Set(orders.map(o => monthKey(o.date)).filter(k => k !== "unknown"))]
    .sort()
    .reverse();

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

  // ── Save / Update ──────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.client || !form.description) return alert("Client and description are required.");
    setSaving(true);
    try {
      const data = {
        ...form,
        value:      parseFloat(form.value) || 0,
        depositAmt: form.division === "clothing" ? 0 : (parseFloat(form.depositAmt) || 0),
        balance:    form.division === "clothing" ? 0 : (parseFloat(form.balance) || 0),
        artworkFiles: form.artworkFiles || [],
      };
      if (editingId) {
        await updateDoc(doc(db, "orders", editingId), data);
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, "orders"), data);
      }
      setShowForm(false);
      setForm(makeEmpty());
      setEditingId(null);
    } catch (err) {
      alert("Failed to save order: " + err.message);
    }
    setSaving(false);
  }

  async function toggleStage(order, key) {
    await updateDoc(doc(db, "orders", order.id), { [key]: !order[key] });
  }

  async function handleDelete(id) {
    if (!confirm("Delete this order? This cannot be undone.")) return;
    await deleteDoc(doc(db, "orders", id));
    setSelected(null);
  }

  function openEdit(j) {
    setForm({ ...makeEmpty(), ...j, artworkFiles: j.artworkFiles || [] });
    setEditingId(j.id);
    setSelected(null);
    setShowForm(true);
  }

  // ── Artwork upload (form) ──────────────────────────────────────────────────
  async function handleArtUploadForm(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingForm(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const storageRef = ref(storage, `artwork/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        uploaded.push({ name: file.name, url, path: storageRef.fullPath });
      }
      setForm(f => ({ ...f, artworkFiles: [...(f.artworkFiles || []), ...uploaded] }));
    } catch (err) {
      alert("Upload failed: " + err.message);
    }
    setUploadingForm(false);
    e.target.value = "";
  }

  // ── Artwork upload (detail modal) ─────────────────────────────────────────
  async function handleArtUploadDirect(e, orderId) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingDirect(true);
    try {
      const order    = orders.find(o => o.id === orderId);
      const existing = order?.artworkFiles || [];
      const uploaded = [];
      for (const file of files) {
        const storageRef = ref(storage, `artwork/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        uploaded.push({ name: file.name, url, path: storageRef.fullPath });
      }
      await updateDoc(doc(db, "orders", orderId), { artworkFiles: [...existing, ...uploaded] });
    } catch (err) {
      alert("Upload failed: " + err.message);
    }
    setUploadingDirect(false);
    e.target.value = "";
  }

  async function handleDeleteArtwork(orderId, fileObj) {
    if (!confirm(`Remove artwork file "${fileObj.name}"?`)) return;
    try { await deleteObject(ref(storage, fileObj.path)); } catch {}
    const order   = orders.find(o => o.id === orderId);
    const updated = (order?.artworkFiles || []).filter(f => f.path !== fileObj.path);
    await updateDoc(doc(db, "orders", orderId), { artworkFiles: updated });
  }

  function removeArtFromForm(path) {
    setForm(f => ({ ...f, artworkFiles: (f.artworkFiles || []).filter(a => a.path !== path) }));
  }

  // ── Recurring IT: toggle a month's payment ────────────────────────────────
  async function toggleMonthPaid(order, year, monthIdx) {
    const key = `${year}-${monthIdx}`;
    const current = order.monthlyPaid || {};
    await updateDoc(doc(db, "orders", order.id), {
      monthlyPaid: { ...current, [key]: !current[key] }
    });
  }

  // ── Export / Import ────────────────────────────────────────────────────────
  function handleExport() {
    const data = orders.map(({ id, ...rest }) => rest);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `rr-orders-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) return alert("Invalid file format.");
      if (!confirm(`Import ${data.length} orders?`)) return;
      for (const order of data) {
        await addDoc(collection(db, "orders"), { ...order, createdAt: serverTimestamp() });
      }
      alert(`${data.length} orders imported.`);
    } catch {
      alert("Failed to read file.");
    }
    e.target.value = "";
  }

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = orders.filter(j => {
    const s            = getStatus(j);
    const matchFilter  = filter === "all" || s === filter;
    const matchMonth   = monthFilter === "all" || monthKey(j.date) === monthFilter;
    const matchSearch  = !search ||
      j.client?.toLowerCase().includes(search.toLowerCase()) ||
      j.ref?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchMonth && matchSearch;
  });

  const selectedOrder = selected ? orders.find(o => o.id === selected) : null;
  const isImage = (name) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, color: "#C9A84C", margin: 0 }}>
            Order Tracker
          </h1>
          <p style={{ color: "#555", marginTop: 6, fontSize: 14 }}>All divisions · {orders.length} total orders</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
          <button onClick={() => fileInputRef.current.click()} style={{
            background: "transparent", color: "#888", border: "1px solid #333",
            borderRadius: 10, padding: "11px 16px", fontSize: 13, fontWeight: 600,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            <Upload size={14} /> Import
          </button>
          <button onClick={handleExport} style={{
            background: "transparent", color: "#888", border: "1px solid #333",
            borderRadius: 10, padding: "11px 16px", fontSize: 13, fontWeight: 600,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            <Download size={14} /> Export
          </button>
          <button onClick={() => { setForm(makeEmpty()); setEditingId(null); setShowForm(true); }} style={{
            background: "#C9A84C", color: "#0D0D0D", border: "none", borderRadius: 10,
            padding: "11px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8, fontFamily: "'DM Sans', sans-serif",
          }}>
            <Plus size={16} /> New Order
          </button>
        </div>
      </div>

      {/* ── Month Filter ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <Calendar size={13} style={{ color: "#555" }} />
        <button onClick={() => setMonthFilter("all")} style={{
          background: monthFilter === "all" ? "#C9A84C22" : "transparent",
          color: monthFilter === "all" ? "#C9A84C" : "#555",
          border: "1px solid " + (monthFilter === "all" ? "#C9A84C55" : "#2a2a2a"),
          borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 600,
          cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
        }}>All Months</button>
        {availableMonths.map(mk => {
          const d = new Date(mk + "-01");
          const label = d.toLocaleString("default", { month: "short", year: "numeric" });
          return (
            <button key={mk} onClick={() => setMonthFilter(mk)} style={{
              background: monthFilter === mk ? "#C9A84C22" : "transparent",
              color: monthFilter === mk ? "#C9A84C" : "#555",
              border: "1px solid " + (monthFilter === mk ? "#C9A84C55" : "#2a2a2a"),
              borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}>{label}</button>
          );
        })}
      </div>

      {/* ── Status Filter + Search ── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#555" }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search client or ref..."
            style={{ ...inp, paddingLeft: 36 }} />
        </div>
        {["all", "new", "active", "production", "delivered", "complete"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            background: filter === f ? "#C9A84C" : "#1A1A1A",
            color:      filter === f ? "#0D0D0D" : "#888",
            border:     "1px solid " + (filter === f ? "#C9A84C" : "#333"),
            borderRadius: 20, padding: "8px 16px", fontSize: 12, fontWeight: 600,
            cursor: "pointer", textTransform: "capitalize", fontFamily: "'DM Sans', sans-serif",
          }}>{f === "all" ? "All" : statusLabels[f]}</button>
        ))}
      </div>

      {/* ── Orders Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {filtered.length === 0 ? (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 0", color: "#444" }}>
            No orders found
          </div>
        ) : filtered.map(j => {
          const s      = getStatus(j);
          const stages = getStages(j);
          const steps  = stages.map(st => j[st.key]);
          const done   = steps.filter(Boolean).length;
          const artCount = (j.artworkFiles || []).length;
          const isRecurring = j.division === "it" && j.itType === "recurring";
          const isClothing  = j.division === "clothing";

          return (
            <div key={j.id} onClick={() => setSelected(j.id)} style={{
              background: "#1A1A1A", border: "1px solid #2a2a2a", borderRadius: 14,
              padding: 20, cursor: "pointer", borderTop: "3px solid " + statusColors[s],
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ color: "#C9A84C", fontWeight: 700, fontSize: 13 }}>{j.ref || "—"}</span>
                <span style={{
                  background: statusColors[s] + "22", color: statusColors[s],
                  border: "1px solid " + statusColors[s] + "44",
                  borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600,
                }}>{statusLabels[s]}</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: 16, color: "#F0F0F0", marginBottom: 4 }}>{j.client}</div>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
                {DIVISIONS.find(d => d.value === j.division)?.label}
                {isRecurring ? " · Recurring" : ""}
                {j.due ? " · Due: " + j.due : ""}
                {j.date ? " · " + (monthLabel(j.date) || j.date) : ""}
              </div>
              {/* Stage dots */}
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {steps.map((v, i) => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: v ? "#C9A84C" : (i === done ? "#444" : "#222"),
                    border: i === done && !v ? "1px solid #555" : "none",
                  }} />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {isClothing ? (
                    <span style={{ fontSize: 12, color: j.paidInFull ? "#52C97A" : "#E05252", fontWeight: 600 }}>
                      {j.paidInFull ? "✓ Paid" : "✗ Unpaid"}
                    </span>
                  ) : isRecurring ? (
                    <span style={{ fontSize: 12, color: "#9B7DE8", fontWeight: 600 }}>
                      R{j.monthlyRate || 0}/mo
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: j.depositPaid ? "#52C97A" : "#E05252", fontWeight: 600 }}>
                      {j.depositPaid ? "✓ Deposit" : "✗ No Deposit"}
                    </span>
                  )}
                  {artCount > 0 && (
                    <span style={{ fontSize: 11, color: "#52A9E0", display: "flex", alignItems: "center", gap: 4 }}>
                      <Paperclip size={11} /> {artCount}
                    </span>
                  )}
                </div>
                {!isRecurring && (
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#F0F0F0" }}>
                    {isClothing
                      ? "R " + (j.value || 0).toFixed(2)
                      : "R " + (j.balance || 0).toFixed(2) + " owing"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─────────────────── Order Detail Modal ─────────────────── */}
      {selectedOrder && (() => {
        const stages     = getStages(selectedOrder);
        const isRecurring = selectedOrder.division === "it" && selectedOrder.itType === "recurring";
        const isClothing  = selectedOrder.division === "clothing";
        const currentYear = new Date().getFullYear();

        return (
          <div onClick={() => setSelected(null)} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
            zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              background: "#1A1A1A", border: "1px solid #333", borderRadius: 16,
              width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto",
              padding: 32, position: "relative",
            }}>
              <button onClick={() => setSelected(null)} style={{
                position: "absolute", top: 16, right: 16, background: "transparent",
                border: "none", color: "#666", cursor: "pointer",
              }}><X size={20} /></button>

              <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#C9A84C", marginBottom: 4 }}>
                {selectedOrder.ref} — {selectedOrder.client}
              </h2>
              <p style={{ color: "#555", fontSize: 13, marginBottom: 24 }}>
                {DIVISIONS.find(d => d.value === selectedOrder.division)?.label}
                {isRecurring ? " · Recurring / Retainer" : ""}
                {selectedOrder.date ? " · " + (monthLabel(selectedOrder.date) || selectedOrder.date) : ""}
              </p>

              {/* ── Stages ── */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                  {isRecurring ? "Monthly Cycle Status" : "Update Stages"}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {stages.map(st => (
                    <button key={st.key} onClick={() => toggleStage(selectedOrder, st.key)} style={{
                      background: selectedOrder[st.key] ? "#C9A84C22" : "#111",
                      border:     "1px solid " + (selectedOrder[st.key] ? "#C9A84C" : "#333"),
                      color:      selectedOrder[st.key] ? "#C9A84C" : "#666",
                      borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600,
                      cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                    }}>{st.label}</button>
                  ))}
                </div>
              </div>

              {/* ── Recurring IT: monthly payment tracker ── */}
              {isRecurring && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                    Monthly Payments — {currentYear} · R{selectedOrder.monthlyRate || 0}/mo
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {MONTHS.map((m, i) => {
                      const key  = `${currentYear}-${i}`;
                      const paid = selectedOrder.monthlyPaid?.[key];
                      return (
                        <button key={key} onClick={() => toggleMonthPaid(selectedOrder, currentYear, i)} style={{
                          background:   paid ? "#52C97A22" : "#111",
                          border:       "1px solid " + (paid ? "#52C97A" : "#333"),
                          color:        paid ? "#52C97A" : "#555",
                          borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600,
                          cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                        }}>{m} {paid ? "✓" : ""}</button>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 12, color: "#555" }}>
                    {MONTHS.filter((_, i) => selectedOrder.monthlyPaid?.[`${currentYear}-${i}`]).length} of 12 months paid
                    {" · "}Total collected: R{(MONTHS.filter((_, i) => selectedOrder.monthlyPaid?.[`${currentYear}-${i}`]).length * (parseFloat(selectedOrder.monthlyRate) || 0)).toFixed(2)}
                  </div>
                </div>
              )}

              {/* ── Artwork ── */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                  Artwork Files
                </div>
                {(selectedOrder.artworkFiles || []).length === 0 ? (
                  <div style={{ color: "#444", fontSize: 13, marginBottom: 12 }}>No artwork uploaded yet</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                    {(selectedOrder.artworkFiles || []).map((file, i) => (
                      <div key={i} style={{
                        background: "#111", border: "1px solid #2a2a2a", borderRadius: 8,
                        padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {isImage(file.name)
                            ? <img src={file.url} alt={file.name} style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 4, border: "1px solid #333" }} />
                            : <div style={{ width: 36, height: 36, background: "#1a1a1a", border: "1px solid #333", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Paperclip size={16} color="#555" />
                              </div>
                          }
                          <a href={file.url} target="_blank" rel="noopener noreferrer"
                            style={{ color: "#52A9E0", fontSize: 13, textDecoration: "none", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {file.name}
                          </a>
                        </div>
                        <button onClick={() => handleDeleteArtwork(selectedOrder.id, file)} style={{
                          background: "transparent", border: "none", color: "#E05252", cursor: "pointer",
                        }}><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <input ref={artInputDetailRef} type="file" multiple accept="image/*,.pdf,.ai,.eps,.svg,.psd,.cdr"
                  onChange={e => handleArtUploadDirect(e, selectedOrder.id)}
                  style={{ display: "none" }} />
                <button onClick={() => artInputDetailRef.current.click()} disabled={uploadingDirect} style={{
                  background: "transparent", border: "1px dashed #333", borderRadius: 8,
                  color: uploadingDirect ? "#C9A84C" : "#888",
                  cursor: uploadingDirect ? "not-allowed" : "pointer",
                  padding: "10px 16px", fontSize: 13, width: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  <Image size={14} />
                  {uploadingDirect ? "⏳ Uploading, please wait..." : "Upload Artwork Files"}
                </button>
              </div>

              {/* ── Order Details ── */}
              {[
                ["Client",       selectedOrder.client],
                ["Contact",      selectedOrder.contact],
                ["Phone",        selectedOrder.phone],
                ["Email",        selectedOrder.email],
                ["Order Date",   selectedOrder.date],
                ["Due Date",     selectedOrder.due],
                ["Description",  selectedOrder.description],
                ["Quantity",     selectedOrder.qty],
                ["Order Value",  "R " + (selectedOrder.value || 0).toFixed(2)],
                ...(!isClothing && !isRecurring ? [
                  ["Deposit Paid",  "R " + (selectedOrder.depositAmt || 0).toFixed(2)],
                  ["Balance Owing", "R " + (selectedOrder.balance || 0).toFixed(2)],
                ] : []),
                ...(isClothing ? [["Paid in Full", selectedOrder.paidInFull ? "Yes ✓" : "No"]] : []),
                ...(isRecurring ? [["Monthly Rate", "R " + (selectedOrder.monthlyRate || 0)]] : []),
                ["Notes", selectedOrder.notes],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "10px 0", borderBottom: "1px solid #222", fontSize: 13,
                }}>
                  <span style={{ color: "#666" }}>{k}</span>
                  <span style={{ color: "#ddd", fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>{v}</span>
                </div>
              ))}

              <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                <button onClick={() => openEdit(selectedOrder)} style={{
                  flex: 1, background: "#C9A84C", color: "#0D0D0D", border: "none",
                  borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                }}>✏️ Edit Order</button>
                <button onClick={() => handleDelete(selectedOrder.id)} style={{
                  background: "transparent", color: "#E05252", border: "1px solid #E05252",
                  borderRadius: 8, padding: "10px 16px", fontSize: 13, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}>🗑️ Delete</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─────────────────── New / Edit Form Modal ─────────────────── */}
      {showForm && (() => {
        const isIT        = form.division === "it";
        const isRecurring = isIT && form.itType === "recurring";
        const isClothing  = form.division === "clothing";
        const stages      = getStages(form);

        return (
          <div onClick={() => setShowForm(false)} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
            zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              background: "#1A1A1A", border: "1px solid #333", borderRadius: 16,
              width: "100%", maxWidth: 660, maxHeight: "90vh", overflowY: "auto",
              padding: 32, position: "relative",
            }}>
              <button onClick={() => setShowForm(false)} style={{
                position: "absolute", top: 16, right: 16, background: "transparent",
                border: "none", color: "#666", cursor: "pointer",
              }}><X size={20} /></button>

              <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#C9A84C", marginBottom: 24 }}>
                {editingId ? "Edit Order" : "New Order"}
              </h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Ref + Client */}
                {[
                  ["ref",     "Order Ref",       "text"],
                  ["client",  "Client Name",      "text"],
                  ["contact", "Contact Person",   "text"],
                  ["phone",   "Phone",            "text"],
                  ["email",   "Email",            "email"],
                  ["date",    "Order Date",       "date"],
                  ["due",     "Due Date",         "date"],
                  ...(!isRecurring ? [["qty", "Quantity", "text"]] : []),
                ].map(([key, label, type]) => (
                  <div key={key}>
                    <label style={lbl}>{label}</label>
                    <input type={type} value={form[key] || ""} onChange={e => setField(key, e.target.value)} style={inp} />
                  </div>
                ))}

                {/* Division */}
                <div>
                  <label style={lbl}>Division</label>
                  <select value={form.division} onChange={e => setField("division", e.target.value)}
                    style={{ ...inp, background: "#111" }}>
                    {DIVISIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>

                {/* IT sub-type toggle */}
                {isIT && (
                  <div>
                    <label style={lbl}>IT Order Type</label>
                    <select value={form.itType} onChange={e => setField("itType", e.target.value)}
                      style={{ ...inp, background: "#111" }}>
                      <option value="project">Once-off Project</option>
                      <option value="recurring">Recurring / Retainer</option>
                    </select>
                  </div>
                )}

                {/* Financials — clothing */}
                {isClothing && (
                  <>
                    <div>
                      <label style={lbl}>Order Value (R)</label>
                      <input type="number" value={form.value} onChange={e => setField("value", e.target.value)} style={inp} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                      <label style={{ ...lbl, marginBottom: 10 }}>Paid in Full</label>
                      <button onClick={() => setField("paidInFull", !form.paidInFull)} style={{
                        background: form.paidInFull ? "#52C97A22" : "#111",
                        border: "1px solid " + (form.paidInFull ? "#52C97A" : "#333"),
                        color:  form.paidInFull ? "#52C97A" : "#666",
                        borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 600,
                        cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textAlign: "center",
                      }}>{form.paidInFull ? "✓ Paid in Full" : "Mark as Paid"}</button>
                    </div>
                  </>
                )}

                {/* Financials — recurring IT */}
                {isRecurring && (
                  <div>
                    <label style={lbl}>Monthly Rate (R)</label>
                    <input type="number" value={form.monthlyRate} onChange={e => setField("monthlyRate", e.target.value)} style={inp} />
                  </div>
                )}

                {/* Financials — print / IT project */}
                {!isClothing && !isRecurring && (
                  <>
                    <div>
                      <label style={lbl}>Order Value (R)</label>
                      <input type="number" value={form.value} onChange={e => setField("value", e.target.value)} style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Deposit Amount (R)</label>
                      <input type="number" value={form.depositAmt} onChange={e => setField("depositAmt", e.target.value)} style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Balance Owing (R)</label>
                      <input readOnly value={form.balance} style={{ ...inp, background: "#0D0D0D", color: "#C9A84C" }} />
                    </div>
                  </>
                )}

                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>Description</label>
                  <textarea value={form.description} onChange={e => setField("description", e.target.value)}
                    rows={3} style={{ ...inp, resize: "vertical" }} />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>Notes</label>
                  <textarea value={form.notes} onChange={e => setField("notes", e.target.value)}
                    rows={2} style={{ ...inp, resize: "vertical" }} />
                </div>
              </div>

              {/* Artwork upload */}
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                  Artwork Files
                </div>
                {(form.artworkFiles || []).length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                    {(form.artworkFiles || []).map((file, i) => (
                      <div key={i} style={{
                        background: "#111", border: "1px solid #2a2a2a", borderRadius: 8,
                        padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between",
                      }}>
                        <span style={{ color: "#52A9E0", fontSize: 13 }}>{file.name}</span>
                        <button onClick={() => removeArtFromForm(file.path)} style={{
                          background: "transparent", border: "none", color: "#E05252", cursor: "pointer",
                        }}><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <input ref={artInputRef} type="file" multiple accept="image/*,.pdf,.ai,.eps,.svg,.psd,.cdr"
                  onChange={handleArtUploadForm} style={{ display: "none" }} />
                <button onClick={() => artInputRef.current.click()} disabled={uploadingForm} style={{
                  background: "transparent", border: "1px dashed #333", borderRadius: 8,
                  color: uploadingForm ? "#C9A84C" : "#888",
                  cursor: uploadingForm ? "not-allowed" : "pointer",
                  padding: "10px 16px", fontSize: 13, width: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  <Image size={14} />
                  {uploadingForm ? "⏳ Uploading, please wait..." : "Attach Artwork Files (images, PDF, AI, PSD, CDR...)"}
                </button>
              </div>

              {/* Stages */}
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Stages</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {stages.map(st => (
                    <button key={st.key} onClick={() => setField(st.key, !form[st.key])} style={{
                      background: form[st.key] ? "#C9A84C22" : "#111",
                      border:     "1px solid " + (form[st.key] ? "#C9A84C" : "#333"),
                      color:      form[st.key] ? "#C9A84C" : "#666",
                      borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600,
                      cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                    }}>{st.label}</button>
                  ))}
                </div>
              </div>

              <button onClick={handleSave} disabled={saving || uploadingForm} style={{
                marginTop: 24, width: "100%", background: "#C9A84C", color: "#0D0D0D",
                border: "none", borderRadius: 8, padding: "13px", fontSize: 15,
                fontWeight: 700, cursor: (saving || uploadingForm) ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}>
                {saving ? "Saving..." : editingId ? "Update Order" : "Save Order"}
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}