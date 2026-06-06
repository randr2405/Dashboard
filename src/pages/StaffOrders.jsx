import { useEffect, useState, useRef } from "react";
import {
  collection, updateDoc, doc, onSnapshot
} from "firebase/firestore";
import { db } from "../firebase";
import { Search, X, Image, Paperclip, Trash2, Calendar } from "lucide-react";

// ── Stages (print only) ───────────────────────────────────────────────────────
const PRINT_STAGES = [
  { key: "depositPaid",      label: "💰 Deposit Paid" },
  { key: "artworkApproved",  label: "🎨 Artwork Approved" },
  { key: "inProduction",     label: "⚙️ In Production" },
  { key: "productionDone",   label: "✅ Production Done" },
  { key: "delivered",        label: "🚚 Delivered" },
  { key: "balanceCollected", label: "💵 Balance Collected" },
];

function getStatus(j) {
  if (j.balanceCollected) return "complete";
  if (j.delivered)        return "delivered";
  if (j.inProduction || j.productionDone) return "production";
  if (j.depositPaid)      return "active";
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

function monthKey(dateStr) {
  if (!dateStr) return "unknown";
  const d = new Date(dateStr);
  if (isNaN(d)) return "unknown";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const inp = {
  width: "100%", background: "#111", border: "1px solid #333",
  borderRadius: 8, color: "#F0F0F0", fontSize: 14,
  padding: "10px 14px", outline: "none", boxSizing: "border-box",
  fontFamily: "'DM Sans', sans-serif",
};

export default function StaffOrders() {
  const [orders, setOrders]           = useState([]);
  const [selected, setSelected]       = useState(null);
  const [search, setSearch]           = useState("");
  const [filter, setFilter]           = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [uploading, setUploading]     = useState(false);
  const artInputRef = useRef(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "orders"), snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Staff only sees print division
      setOrders(all.filter(o => o.division === "print"));
    });
    return unsub;
  }, []);

  const availableMonths = [...new Set(orders.map(o => monthKey(o.date)).filter(k => k !== "unknown"))]
    .sort().reverse();

  const filtered = orders.filter(j => {
    const s           = getStatus(j);
    const matchFilter = filter === "all" || s === filter;
    const matchMonth  = monthFilter === "all" || monthKey(j.date) === monthFilter;
    const matchSearch = !search ||
      j.client?.toLowerCase().includes(search.toLowerCase()) ||
      j.ref?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchMonth && matchSearch;
  });

  const selectedOrder = selected ? orders.find(o => o.id === selected) : null;

  async function toggleStage(order, key) {
    await updateDoc(doc(db, "orders", order.id), { [key]: !order[key] });
  }

  async function handleArtUpload(e, orderId) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const oversized = files.filter(f => f.size > 700 * 1024);
    if (oversized.length) {
      alert(`These files are too large (max 700KB each):\n${oversized.map(f => f.name).join("\n")}\n\nPlease compress or resize them first.`);
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const order    = orders.find(o => o.id === orderId);
      const existing = order?.artworkFiles || [];
      const uploaded = [];
      for (const file of files) {
        const base64 = await fileToBase64(file);
        uploaded.push({ name: file.name, url: base64, path: `${Date.now()}_${file.name}` });
      }
      await updateDoc(doc(db, "orders", orderId), { artworkFiles: [...existing, ...uploaded] });
    } catch (err) {
      alert("Failed to save file: " + err.message);
    }
    setUploading(false);
    e.target.value = "";
  }

  async function handleDeleteArtwork(orderId, fileObj) {
    if (!confirm(`Remove artwork file "${fileObj.name}"?`)) return;
    const order   = orders.find(o => o.id === orderId);
    const updated = (order?.artworkFiles || []).filter(f => f.path !== fileObj.path);
    await updateDoc(doc(db, "orders", orderId), { artworkFiles: updated });
  }

  const isImage = name => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, color: "#C9A84C", margin: 0 }}>
          Production Orders
        </h1>
        <p style={{ color: "#555", marginTop: 6, fontSize: 14 }}>
          Print / DTF / Vinyl · {orders.length} orders
        </p>
      </div>

      {/* Month Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <Calendar size={13} style={{ color: "#555" }} />
        <button onClick={() => setMonthFilter("all")} style={{
          background: monthFilter === "all" ? "#C9A84C22" : "transparent",
          color:  monthFilter === "all" ? "#C9A84C" : "#555",
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
              color:  monthFilter === mk ? "#C9A84C" : "#555",
              border: "1px solid " + (monthFilter === mk ? "#C9A84C55" : "#2a2a2a"),
              borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}>{label}</button>
          );
        })}
      </div>

      {/* Status Filter + Search */}
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

      {/* Orders Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {filtered.length === 0 ? (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 0", color: "#444" }}>
            No orders found
          </div>
        ) : filtered.map(j => {
          const s     = getStatus(j);
          const steps = PRINT_STAGES.map(st => j[st.key]);
          const done  = steps.filter(Boolean).length;
          const artCount = (j.artworkFiles || []).length;

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
              <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                {j.description}
              </div>
              {j.due && (
                <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>
                  Due: <span style={{ color: "#C9A84C" }}>{j.due}</span>
                </div>
              )}

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
                <span style={{ fontSize: 12, color: "#555" }}>
                  {done} / {PRINT_STAGES.length} stages
                </span>
                {artCount > 0 && (
                  <span style={{ fontSize: 11, color: "#52A9E0", display: "flex", alignItems: "center", gap: 4 }}>
                    <Paperclip size={11} /> {artCount} file{artCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Order Detail Modal ── */}
      {selectedOrder && (() => {
        const s = getStatus(selectedOrder);
        return (
          <div onClick={() => setSelected(null)} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
            zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              background: "#1A1A1A", border: "1px solid #333", borderRadius: 16,
              width: "100%", maxWidth: 580, maxHeight: "90vh", overflowY: "auto",
              padding: 32, position: "relative",
            }}>
              <button onClick={() => setSelected(null)} style={{
                position: "absolute", top: 16, right: 16, background: "transparent",
                border: "none", color: "#666", cursor: "pointer",
              }}><X size={20} /></button>

              {/* Title */}
              <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#C9A84C", marginBottom: 4 }}>
                {selectedOrder.ref} — {selectedOrder.client}
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                <span style={{
                  background: statusColors[s] + "22", color: statusColors[s],
                  border: "1px solid " + statusColors[s] + "44",
                  borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600,
                }}>{statusLabels[s]}</span>
                <span style={{ color: "#555", fontSize: 13 }}>Print / DTF / Vinyl</span>
              </div>

              {/* Stages */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                  Update Stages
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {PRINT_STAGES.map(st => (
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

              {/* Artwork */}
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
                <input ref={artInputRef} type="file" multiple accept="image/*,.pdf,.svg"
                  onChange={e => handleArtUpload(e, selectedOrder.id)}
                  style={{ display: "none" }} />
                <button onClick={() => artInputRef.current.click()} disabled={uploading} style={{
                  background: "transparent", border: "1px dashed #333", borderRadius: 8,
                  color: uploading ? "#C9A84C" : "#888",
                  cursor: uploading ? "not-allowed" : "pointer",
                  padding: "10px 16px", fontSize: 13, width: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  <Image size={14} />
                  {uploading ? "⏳ Uploading, please wait..." : "Upload Artwork Files"}
                </button>
              </div>

              {/* Order info — NO pricing */}
              {[
                ["Client",      selectedOrder.client],
                ["Contact",     selectedOrder.contact],
                ["Phone",       selectedOrder.phone],
                ["Order Date",  selectedOrder.date],
                ["Due Date",    selectedOrder.due],
                ["Description", selectedOrder.description],
                ["Quantity",    selectedOrder.qty],
                ["Notes",       selectedOrder.notes],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "10px 0", borderBottom: "1px solid #222", fontSize: 13,
                }}>
                  <span style={{ color: "#666" }}>{k}</span>
                  <span style={{ color: "#ddd", fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}