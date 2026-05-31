import { useEffect, useState, useRef } from "react";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, serverTimestamp
} from "firebase/firestore";
import {
  ref, uploadBytes, getDownloadURL, deleteObject
} from "firebase/storage";
import { db, storage } from "../firebase";
import { Plus, X, Search, Download, Upload, Paperclip, Trash2, Image } from "lucide-react";

const DIVISIONS = [
  { value: "print", label: "Print / DTF / Vinyl" },
  { value: "it", label: "IT Company" },
  { value: "clothing", label: "Clothing Brand" },
];

const STAGES = [
  { key: "depositPaid", label: "💰 Deposit Paid" },
  { key: "artworkApproved", label: "🎨 Artwork Approved" },
  { key: "inProduction", label: "⚙️ In Production" },
  { key: "productionDone", label: "✅ Production Done" },
  { key: "delivered", label: "🚚 Delivered" },
  { key: "balanceCollected", label: "💵 Balance Collected" },
];

const empty = {
  ref: "", client: "", contact: "", phone: "", email: "",
  division: "print", date: "", due: "", description: "",
  qty: "", value: "", depositAmt: "", balance: "", notes: "",
  depositPaid: false, artworkApproved: false, inProduction: false,
  productionDone: false, delivered: false, balanceCollected: false,
  artworkFiles: [],
};

function getStatus(j) {
  if (j.balanceCollected) return "complete";
  if (j.delivered) return "delivered";
  if (j.inProduction) return "production";
  if (j.depositPaid) return "active";
  return "new";
}

const statusColors = {
  complete: "#52C97A", delivered: "#52A9E0",
  production: "#C9A84C", active: "#9B7DE8", new: "#E05252"
};
const statusLabels = {
  complete: "Complete", delivered: "Delivered",
  production: "In Production", active: "Active", new: "New"
};

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

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [uploadingArt, setUploadingArt] = useState(false);
  const fileInputRef = useRef(null);
  const artInputRef = useRef(null);
  const artInputDetailRef = useRef(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "orders"), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  function setField(k, v) {
    setForm(f => {
      const updated = { ...f, [k]: v };
      const val = parseFloat(updated.value) || 0;
      const dep = parseFloat(updated.depositAmt) || 0;
      updated.balance = (val - dep).toFixed(2);
      return updated;
    });
  }

  async function handleSave() {
    if (!form.client || !form.description) return alert("Client and description are required.");
    setSaving(true);
    const data = {
      ...form,
      value: parseFloat(form.value) || 0,
      depositAmt: parseFloat(form.depositAmt) || 0,
      balance: parseFloat(form.balance) || 0,
      artworkFiles: form.artworkFiles || [],
    };
    if (editingId) {
      await updateDoc(doc(db, "orders", editingId), data);
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, "orders"), data);
    }
    setSaving(false);
    setShowForm(false);
    setForm(empty);
    setEditingId(null);
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
    setForm({ ...j, artworkFiles: j.artworkFiles || [] });
    setEditingId(j.id);
    setSelected(null);
    setShowForm(true);
  }

  // Upload artwork during form (before save)
  async function handleArtUploadForm(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingArt(true);
    const uploaded = [];
    for (const file of files) {
      const storageRef = ref(storage, `artwork/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      uploaded.push({ name: file.name, url, path: storageRef.fullPath });
    }
    setForm(f => ({ ...f, artworkFiles: [...(f.artworkFiles || []), ...uploaded] }));
    setUploadingArt(false);
    e.target.value = "";
  }

  // Upload artwork directly from detail modal (already saved order)
  async function handleArtUploadDirect(e, orderId) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingArt(true);
    const order = orders.find(o => o.id === orderId);
    const existing = order?.artworkFiles || [];
    const uploaded = [];
    for (const file of files) {
      const storageRef = ref(storage, `artwork/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      uploaded.push({ name: file.name, url, path: storageRef.fullPath });
    }
    const updated = [...existing, ...uploaded];
    await updateDoc(doc(db, "orders", orderId), { artworkFiles: updated });
    setUploadingArt(false);
    e.target.value = "";
  }

  async function handleDeleteArtwork(orderId, fileObj) {
    if (!confirm(`Remove artwork file "${fileObj.name}"?`)) return;
    try {
      const fileRef = ref(storage, fileObj.path);
      await deleteObject(fileRef);
    } catch {}
    const order = orders.find(o => o.id === orderId);
    const updated = (order?.artworkFiles || []).filter(f => f.path !== fileObj.path);
    await updateDoc(doc(db, "orders", orderId), { artworkFiles: updated });
  }

  function removeArtFromForm(path) {
    setForm(f => ({ ...f, artworkFiles: (f.artworkFiles || []).filter(a => a.path !== path) }));
  }

  function handleExport() {
    const data = orders.map(({ id, ...rest }) => rest);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
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
      if (!confirm(`Import ${data.length} orders? They will be added alongside existing orders.`)) return;
      for (const order of data) {
        await addDoc(collection(db, "orders"), { ...order, createdAt: serverTimestamp() });
      }
      alert(`${data.length} orders imported successfully!`);
    } catch {
      alert("Failed to read file. Make sure it's a valid JSON export from this app.");
    }
    e.target.value = "";
  }

  const filtered = orders.filter(j => {
    const s = getStatus(j);
    const matchFilter = filter === "all" || s === filter;
    const matchSearch = !search ||
      j.client?.toLowerCase().includes(search.toLowerCase()) ||
      j.ref?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const selectedOrder = selected ? orders.find(o => o.id === selected) : null;

  const isImage = (name) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);

  return (
    <div>
      {/* Header */}
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
            fontFamily: "'DM Sans', sans-serif"
          }}>
            <Upload size={14} /> Import
          </button>
          <button onClick={handleExport} style={{
            background: "transparent", color: "#888", border: "1px solid #333",
            borderRadius: 10, padding: "11px 16px", fontSize: 13, fontWeight: 600,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            fontFamily: "'DM Sans', sans-serif"
          }}>
            <Download size={14} /> Export
          </button>
          <button onClick={() => { setForm(empty); setEditingId(null); setShowForm(true); }} style={{
            background: "#C9A84C", color: "#0D0D0D", border: "none", borderRadius: 10,
            padding: "11px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8, fontFamily: "'DM Sans', sans-serif"
          }}>
            <Plus size={16} /> New Order
          </button>
        </div>
      </div>

      {/* Search + Filter */}
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
            color: filter === f ? "#0D0D0D" : "#888",
            border: "1px solid " + (filter === f ? "#C9A84C" : "#333"),
            borderRadius: 20, padding: "8px 16px", fontSize: 12, fontWeight: 600,
            cursor: "pointer", textTransform: "capitalize", fontFamily: "'DM Sans', sans-serif"
          }}>{f === "all" ? "All" : statusLabels[f]}</button>
        ))}
      </div>

      {/* Orders Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {filtered.length === 0 ? (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 0", color: "#444" }}>
            No orders found
          </div>
        ) : filtered.map(j => {
          const s = getStatus(j);
          const steps = STAGES.map(st => j[st.key]);
          const done = steps.filter(Boolean).length;
          const artCount = (j.artworkFiles || []).length;
          return (
            <div key={j.id} onClick={() => setSelected(j.id)} style={{
              background: "#1A1A1A", border: "1px solid #2a2a2a", borderRadius: 14,
              padding: 20, cursor: "pointer", borderTop: "3px solid " + statusColors[s]
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ color: "#C9A84C", fontWeight: 700, fontSize: 13 }}>{j.ref || "—"}</span>
                <span style={{
                  background: statusColors[s] + "22", color: statusColors[s],
                  border: "1px solid " + statusColors[s] + "44",
                  borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600
                }}>{statusLabels[s]}</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: 16, color: "#F0F0F0", marginBottom: 4 }}>{j.client}</div>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
                {DIVISIONS.find(d => d.value === j.division)?.label} {j.due ? "· Due: " + j.due : ""}
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {steps.map((s, i) => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: s ? "#C9A84C" : (i === done ? "#444" : "#222"),
                    border: i === done && !s ? "1px solid #555" : "none"
                  }} />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, color: j.depositPaid ? "#52C97A" : "#E05252", fontWeight: 600 }}>
                    {j.depositPaid ? "✓ Deposit" : "✗ No Deposit"}
                  </span>
                  {artCount > 0 && (
                    <span style={{ fontSize: 11, color: "#52A9E0", display: "flex", alignItems: "center", gap: 4 }}>
                      <Paperclip size={11} /> {artCount}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#F0F0F0" }}>
                  R {(j.balance || 0).toFixed(2)} owing
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div onClick={() => setSelected(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#1A1A1A", border: "1px solid #333", borderRadius: 16,
            width: "100%", maxWidth: 580, maxHeight: "90vh", overflowY: "auto",
            padding: 32, position: "relative"
          }}>
            <button onClick={() => setSelected(null)} style={{
              position: "absolute", top: 16, right: 16, background: "transparent",
              border: "none", color: "#666", cursor: "pointer"
            }}><X size={20} /></button>

            <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#C9A84C", marginBottom: 4 }}>
              {selectedOrder.ref} — {selectedOrder.client}
            </h2>
            <p style={{ color: "#555", fontSize: 13, marginBottom: 24 }}>
              {DIVISIONS.find(d => d.value === selectedOrder.division)?.label}
            </p>

            {/* Stage toggles */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                Update Stages
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {STAGES.map(st => (
                  <button key={st.key} onClick={() => toggleStage(selectedOrder, st.key)} style={{
                    background: selectedOrder[st.key] ? "#C9A84C22" : "#111",
                    border: "1px solid " + (selectedOrder[st.key] ? "#C9A84C" : "#333"),
                    color: selectedOrder[st.key] ? "#C9A84C" : "#666",
                    borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600,
                    cursor: "pointer", fontFamily: "'DM Sans', sans-serif"
                  }}>{st.label}</button>
                ))}
              </div>
            </div>

            {/* Artwork Section */}
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
                      padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between"
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
                        background: "transparent", border: "none", color: "#E05252", cursor: "pointer"
                      }}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}

              <input ref={artInputDetailRef} type="file" multiple accept="image/*,.pdf,.ai,.eps,.svg,.psd,.cdr"
                onChange={e => handleArtUploadDirect(e, selectedOrder.id)}
                style={{ display: "none" }} />
              <button onClick={() => artInputDetailRef.current.click()} disabled={uploadingArt} style={{
                background: "transparent", border: "1px dashed #333", borderRadius: 8,
                color: uploadingArt ? "#555" : "#888", cursor: uploadingArt ? "not-allowed" : "pointer",
                padding: "10px 16px", fontSize: 13, width: "100%",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                fontFamily: "'DM Sans', sans-serif"
              }}>
                <Image size={14} /> {uploadingArt ? "Uploading..." : "Upload Artwork Files"}
              </button>
            </div>

            {/* Order details */}
            {[
              ["Client", selectedOrder.client],
              ["Contact", selectedOrder.contact],
              ["Phone", selectedOrder.phone],
              ["Email", selectedOrder.email],
              ["Order Date", selectedOrder.date],
              ["Due Date", selectedOrder.due],
              ["Description", selectedOrder.description],
              ["Quantity", selectedOrder.qty],
              ["Order Value", "R " + (selectedOrder.value || 0).toFixed(2)],
              ["Deposit Paid", "R " + (selectedOrder.depositAmt || 0).toFixed(2)],
              ["Balance Owing", "R " + (selectedOrder.balance || 0).toFixed(2)],
              ["Notes", selectedOrder.notes],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} style={{
                display: "flex", justifyContent: "space-between",
                padding: "10px 0", borderBottom: "1px solid #222", fontSize: 13
              }}>
                <span style={{ color: "#666" }}>{k}</span>
                <span style={{ color: "#ddd", fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>{v}</span>
              </div>
            ))}

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={() => openEdit(selectedOrder)} style={{
                flex: 1, background: "#C9A84C", color: "#0D0D0D", border: "none",
                borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 700,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif"
              }}>✏️ Edit Order</button>
              <button onClick={() => handleDelete(selectedOrder.id)} style={{
                background: "transparent", color: "#E05252", border: "1px solid #E05252",
                borderRadius: 8, padding: "10px 16px", fontSize: 13, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif"
              }}>🗑️ Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* New / Edit Order Form Modal */}
      {showForm && (
        <div onClick={() => setShowForm(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#1A1A1A", border: "1px solid #333", borderRadius: 16,
            width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto",
            padding: 32, position: "relative"
          }}>
            <button onClick={() => setShowForm(false)} style={{
              position: "absolute", top: 16, right: 16, background: "transparent",
              border: "none", color: "#666", cursor: "pointer"
            }}><X size={20} /></button>

            <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#C9A84C", marginBottom: 24 }}>
              {editingId ? "Edit Order" : "New Order"}
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                ["ref", "Order Ref", "text"], ["client", "Client Name", "text"],
                ["contact", "Contact Person", "text"], ["phone", "Phone", "text"],
                ["email", "Email", "email"], ["date", "Order Date", "date"],
                ["due", "Due Date", "date"], ["qty", "Quantity", "text"],
                ["value", "Order Value (R)", "number"], ["depositAmt", "Deposit Amount (R)", "number"],
              ].map(([key, label, type]) => (
                <div key={key}>
                  <label style={lbl}>{label}</label>
                  <input type={type} value={form[key]} onChange={e => setField(key, e.target.value)} style={inp} />
                </div>
              ))}

              <div>
                <label style={lbl}>Balance Owing (R)</label>
                <input readOnly value={form.balance} style={{ ...inp, background: "#0D0D0D", color: "#C9A84C" }} />
              </div>

              <div>
                <label style={lbl}>Division</label>
                <select value={form.division} onChange={e => setField("division", e.target.value)}
                  style={{ ...inp, background: "#111" }}>
                  {DIVISIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>

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

            {/* Artwork upload in form */}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                Artwork Files
              </div>
              {(form.artworkFiles || []).length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                  {(form.artworkFiles || []).map((file, i) => (
                    <div key={i} style={{
                      background: "#111", border: "1px solid #2a2a2a", borderRadius: 8,
                      padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between"
                    }}>
                      <span style={{ color: "#52A9E0", fontSize: 13 }}>{file.name}</span>
                      <button onClick={() => removeArtFromForm(file.path)} style={{
                        background: "transparent", border: "none", color: "#E05252", cursor: "pointer"
                      }}><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
              <input ref={artInputRef} type="file" multiple accept="image/*,.pdf,.ai,.eps,.svg,.psd,.cdr"
                onChange={handleArtUploadForm} style={{ display: "none" }} />
              <button onClick={() => artInputRef.current.click()} disabled={uploadingArt} style={{
                background: "transparent", border: "1px dashed #333", borderRadius: 8,
                color: uploadingArt ? "#555" : "#888", cursor: uploadingArt ? "not-allowed" : "pointer",
                padding: "10px 16px", fontSize: 13, width: "100%",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                fontFamily: "'DM Sans', sans-serif"
              }}>
                <Image size={14} /> {uploadingArt ? "Uploading..." : "Attach Artwork Files (images, PDF, AI, PSD, CDR...)"}
              </button>
            </div>

            {/* Stages */}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Stages</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {STAGES.map(st => (
                  <button key={st.key} onClick={() => setField(st.key, !form[st.key])} style={{
                    background: form[st.key] ? "#C9A84C22" : "#111",
                    border: "1px solid " + (form[st.key] ? "#C9A84C" : "#333"),
                    color: form[st.key] ? "#C9A84C" : "#666",
                    borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600,
                    cursor: "pointer", fontFamily: "'DM Sans', sans-serif"
                  }}>{st.label}</button>
                ))}
              </div>
            </div>

            <button onClick={handleSave} disabled={saving || uploadingArt} style={{
              marginTop: 24, width: "100%", background: "#C9A84C", color: "#0D0D0D",
              border: "none", borderRadius: 8, padding: "13px", fontSize: 15,
              fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif"
            }}>
              {saving ? "Saving..." : editingId ? "Update Order" : "Save Order"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}