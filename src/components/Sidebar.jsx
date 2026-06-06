import { useEffect, useState } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { Plus, X, AlertTriangle, Pencil, Trash2, Search, ChevronUp, ChevronDown } from "lucide-react";

const DIVISIONS = [
  {
    key: "embroidery",
    label: "Embroidery",
    color: "#C9A84C",
    icon: "🧵",
    categories: [
      { key: "thread", label: "Thread", unit: "spools", trackColour: true, tableView: true },
      { key: "needles", label: "Needles", unit: "qty" },
      { key: "bobbins", label: "Bobbins", unit: "qty" },
      { key: "scissors", label: "Scissors", unit: "qty" },
      { key: "hoops", label: "Hoops", unit: "qty" },
      { key: "machine_oil", label: "Machine Oil", unit: "bottles" },
    ],
  },
  {
    key: "dtf",
    label: "DTF",
    color: "#52A9E0",
    icon: "🖨️",
    categories: [
      { key: "dtf_film", label: "DTF Film", unit: "rolls", trackMetres: true },
      { key: "powder", label: "Powder / Adhesive", unit: "bags", trackWeight: true },
      { key: "ink_cyan", label: "Ink — Cyan", unit: "bottles" },
      { key: "ink_magenta", label: "Ink — Magenta", unit: "bottles" },
      { key: "ink_yellow", label: "Ink — Yellow", unit: "bottles" },
      { key: "ink_black", label: "Ink — Black", unit: "bottles" },
      { key: "ink_white", label: "Ink — White", unit: "bottles" },
    ],
  },
  {
    key: "vinyl",
    label: "Vinyl",
    color: "#9B7DE8",
    icon: "✂️",
    categories: [
      { key: "vinyl_rolls", label: "Vinyl Rolls", unit: "rolls", trackMetres: true },
      { key: "weeding_tools", label: "Weeding Tools", unit: "qty" },
      { key: "cutting_blades", label: "Cutting Blades", unit: "qty" },
    ],
  },
];

function fmt(n) {
  return Number(n || 0).toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const inputStyle = {
  width: "100%", background: "#111", border: "1px solid #2a2a2a",
  borderRadius: 8, padding: "10px 12px", color: "#F0F0F0", fontSize: 13,
  outline: "none", boxSizing: "border-box",
};
const labelStyle = {
  fontSize: 11, color: "#666", textTransform: "uppercase",
  letterSpacing: 1, marginBottom: 5, display: "block",
};
const btnStyle = (bg, color = "#0D0D0D") => ({
  background: bg, color, border: "none", borderRadius: 8,
  padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer",
});

export default function Supplies() {
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState("embroidery");
  const [activeCat, setActiveCat] = useState({});
  const [addModal, setAddModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [adjustModal, setAdjustModal] = useState(null);
  const [form, setForm] = useState({});
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustType, setAdjustType] = useState("add");
  const [saving, setSaving] = useState(false);
  const [threadSearch, setThreadSearch] = useState("");
  const [threadSort, setThreadSort] = useState("name"); // name | qty
  const [threadSortDir, setThreadSortDir] = useState("asc");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "supplies"), snap =>
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, []);

  const currentDiv = DIVISIONS.find(d => d.key === activeTab);
  const currentCatKey = activeCat[activeTab] || currentDiv?.categories[0]?.key;
  const currentCat = currentDiv?.categories.find(c => c.key === currentCatKey);

  function catItems(divKey, catKey) {
    return items.filter(i => i.division === divKey && i.category === catKey);
  }
  function isLow(item) {
    return (item.qty || 0) <= (item.lowStockThreshold ?? 2);
  }
  const totalLowStock = items.filter(isLow).length;

  function openAdd() {
    setForm({ name: currentCat?.trackColour ? "" : currentCat?.label, colourNumber: "", qty: "", metres: "", weight: "", lowStockThreshold: "2", notes: "" });
    setAddModal(true);
  }

  async function handleAdd() {
    if (!form.name?.trim()) return;
    setSaving(true);
    await addDoc(collection(db, "supplies"), {
      division: currentDiv.key,
      category: currentCat.key,
      categoryLabel: currentCat.label,
      name: form.name.trim(),
      colourNumber: form.colourNumber || null,
      qty: parseFloat(form.qty) || 0,
      metres: currentCat.trackMetres ? (parseFloat(form.metres) || 0) : null,
      weight: currentCat.trackWeight ? (parseFloat(form.weight) || 0) : null,
      lowStockThreshold: parseFloat(form.lowStockThreshold) || 2,
      notes: form.notes || "",
      createdAt: serverTimestamp(),
    });
    setSaving(false);
    setAddModal(null);
  }

  async function handleEdit() {
    if (!form.name?.trim()) return;
    setSaving(true);
    await updateDoc(doc(db, "supplies", editModal.id), {
      name: form.name.trim(),
      colourNumber: form.colourNumber || null,
      metres: editModal.metres !== null && editModal.metres !== undefined ? (parseFloat(form.metres) || 0) : null,
      weight: editModal.weight !== null && editModal.weight !== undefined ? (parseFloat(form.weight) || 0) : null,
      lowStockThreshold: parseFloat(form.lowStockThreshold) || 2,
      notes: form.notes || "",
    });
    setSaving(false);
    setEditModal(null);
  }

  async function handleAdjust() {
    const delta = parseFloat(adjustQty);
    if (!delta || delta <= 0) return;
    setSaving(true);
    const newQty = adjustType === "add"
      ? (adjustModal.qty || 0) + delta
      : Math.max(0, (adjustModal.qty || 0) - delta);
    await updateDoc(doc(db, "supplies", adjustModal.id), { qty: newQty });
    setSaving(false);
    setAdjustModal(null);
    setAdjustQty("");
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this item?")) return;
    await deleteDoc(doc(db, "supplies", id));
  }

  const overlay = {
    position: "fixed", inset: 0, background: "#000000cc", zIndex: 1000,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
  };
  const modal = {
    background: "#1A1A1A", border: "1px solid #2a2a2a", borderRadius: 16,
    padding: 28, width: "100%", maxWidth: 440, position: "relative",
  };

  // ── Thread table sorted/filtered
  const threadItems = catItems(activeTab, "thread");
  const filteredThread = threadItems
    .filter(i => !threadSearch || i.name?.toLowerCase().includes(threadSearch.toLowerCase()) || i.colourNumber?.includes(threadSearch))
    .sort((a, b) => {
      let va = threadSort === "qty" ? (a.qty || 0) : (a.name || "").toLowerCase();
      let vb = threadSort === "qty" ? (b.qty || 0) : (b.name || "").toLowerCase();
      if (va < vb) return threadSortDir === "asc" ? -1 : 1;
      if (va > vb) return threadSortDir === "asc" ? 1 : -1;
      return 0;
    });

  function toggleSort(col) {
    if (threadSort === col) setThreadSortDir(d => d === "asc" ? "desc" : "asc");
    else { setThreadSort(col); setThreadSortDir("asc"); }
  }

  const SortIcon = ({ col }) => {
    if (threadSort !== col) return <span style={{ color: "#333", fontSize: 10 }}>↕</span>;
    return threadSortDir === "asc" ? <ChevronUp size={12} color="#C9A84C" /> : <ChevronDown size={12} color="#C9A84C" />;
  };

  // ── Small card for non-thread categories
  function SmallItemCard({ item }) {
    const low = isLow(item);
    return (
      <div style={{
        background: "#111", border: `1px solid ${low ? "#E07D5244" : "#1f1f1f"}`,
        borderRadius: 12, padding: "16px 18px",
        borderLeft: `3px solid ${low ? "#E07D52" : currentDiv.color}`,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, color: "#F0F0F0", fontWeight: 600 }}>{item.name}</div>
          {item.notes && <div style={{ fontSize: 11, color: "#444", marginTop: 2, fontStyle: "italic" }}>{item.notes}</div>}
          {low && <div style={{ fontSize: 11, color: "#E07D52", fontWeight: 600, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}><AlertTriangle size={11} /> Low stock</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: low ? "#E07D52" : currentDiv.color, fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>{fmt(item.qty)}</div>
            <div style={{ fontSize: 11, color: "#555" }}>
              {currentCat?.unit}
              {item.metres != null && ` · ${fmt(item.metres)}m`}
              {item.weight != null && ` · ${fmt(item.weight)}kg`}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <button onClick={() => { setAdjustModal(item); setAdjustType("add"); setAdjustQty(""); }}
              style={{ background: `${currentDiv.color}18`, border: `1px solid ${currentDiv.color}44`, color: currentDiv.color, borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
              + In
            </button>
            <button onClick={() => { setAdjustModal(item); setAdjustType("use"); setAdjustQty(""); }}
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#888", borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              − Used
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <button onClick={() => { setEditModal(item); setForm({ name: item.name, colourNumber: item.colourNumber || "", metres: item.metres ?? "", weight: item.weight ?? "", lowStockThreshold: item.lowStockThreshold || 2, notes: item.notes || "" }); }}
              style={{ background: "none", border: "none", color: "#555", cursor: "pointer", padding: 4 }}>
              <Pencil size={14} />
            </button>
            <button onClick={() => handleDelete(item.id)}
              style={{ background: "none", border: "none", color: "#555", cursor: "pointer", padding: 4 }}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, color: "#C9A84C", margin: 0 }}>
          Stock & Supplies
        </h1>
        <p style={{ color: "#555", marginTop: 6, fontSize: 14 }}>Manage consumables across all production divisions</p>
      </div>

      {totalLowStock > 0 && (
        <div style={{ background: "#E07D5215", border: "1px solid #E07D5244", borderRadius: 12, padding: "13px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <AlertTriangle size={16} color="#E07D52" />
          <span style={{ fontSize: 14, color: "#E07D52", fontWeight: 600 }}>{totalLowStock} item{totalLowStock !== 1 ? "s" : ""} at or below low stock threshold</span>
        </div>
      )}

      {/* Division tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 0, borderBottom: "1px solid #2a2a2a" }}>
        {DIVISIONS.map(div => {
          const divLow = items.filter(i => i.division === div.key && isLow(i)).length;
          const active = activeTab === div.key;
          return (
            <button key={div.key} onClick={() => setActiveTab(div.key)}
              style={{
                background: active ? "#1A1A1A" : "transparent",
                border: "none", borderBottom: active ? `2px solid ${div.color}` : "2px solid transparent",
                color: active ? div.color : "#555", padding: "14px 24px", fontSize: 14,
                fontWeight: active ? 700 : 400, cursor: "pointer", display: "flex",
                alignItems: "center", gap: 8, transition: "all 0.15s", marginBottom: -1,
              }}>
              <span>{div.icon}</span>
              {div.label}
              {divLow > 0 && (
                <span style={{ background: "#E07D5222", color: "#E07D52", border: "1px solid #E07D5244", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>
                  ⚠ {divLow}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content panel */}
      <div style={{ background: "#1A1A1A", border: "1px solid #2a2a2a", borderTop: "none", borderRadius: "0 0 16px 16px", display: "flex", minHeight: 500 }}>

        {/* Category sidebar */}
        <div style={{ width: 200, borderRight: "1px solid #2a2a2a", padding: "16px 0", flexShrink: 0 }}>
          {currentDiv?.categories.map(cat => {
            const count = catItems(currentDiv.key, cat.key).length;
            const lowCount = catItems(currentDiv.key, cat.key).filter(isLow).length;
            const active = currentCatKey === cat.key;
            return (
              <button key={cat.key}
                onClick={() => setActiveCat(p => ({ ...p, [activeTab]: cat.key }))}
                style={{
                  width: "100%", background: active ? `${currentDiv.color}12` : "transparent",
                  border: "none", borderRight: active ? `2px solid ${currentDiv.color}` : "2px solid transparent",
                  color: active ? currentDiv.color : "#777", padding: "11px 18px",
                  fontSize: 13, fontWeight: active ? 600 : 400, cursor: "pointer",
                  textAlign: "left", display: "flex", alignItems: "center",
                  justifyContent: "space-between", transition: "all 0.15s",
                }}>
                <span>{cat.label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {lowCount > 0 && <span style={{ color: "#E07D52", fontSize: 11 }}>⚠</span>}
                  {count > 0 && <span style={{ background: "#2a2a2a", color: "#555", borderRadius: 20, padding: "1px 7px", fontSize: 11 }}>{count}</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Category content */}
        <div style={{ flex: 1, padding: "24px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: currentDiv?.color, margin: 0 }}>
                {currentCat?.label}
              </h2>
              <div style={{ fontSize: 12, color: "#555", marginTop: 3 }}>
                {catItems(activeTab, currentCatKey).length} items · tracked in {currentCat?.unit}
              </div>
            </div>
            <button onClick={openAdd}
              style={{ background: `${currentDiv?.color}18`, border: `1px solid ${currentDiv?.color}44`, color: currentDiv?.color, borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <Plus size={14} /> Add {currentCat?.label}
            </button>
          </div>

          {/* Thread — table view */}
          {currentCat?.tableView ? (
            <div>
              {/* Search + summary */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
                  <Search size={14} color="#555" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                  <input value={threadSearch} onChange={e => setThreadSearch(e.target.value)}
                    placeholder="Search by name or colour number..."
                    style={{ ...inputStyle, paddingLeft: 36 }} />
                </div>
                <div style={{ fontSize: 12, color: "#555" }}>
                  {filteredThread.length} of {threadItems.length} shown
                  {threadItems.filter(isLow).length > 0 && (
                    <span style={{ color: "#E07D52", marginLeft: 8 }}>· ⚠ {threadItems.filter(isLow).length} low</span>
                  )}
                </div>
              </div>

              {filteredThread.length === 0 ? (
                <div style={{ color: "#333", fontSize: 14, textAlign: "center", padding: "60px 0", fontStyle: "italic" }}>
                  {threadItems.length === 0 ? "No thread added yet — click Add Thread to get started" : "No results match your search"}
                </div>
              ) : (
                <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #2a2a2a" }}>
                  {/* Table header */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 90px 90px 160px 80px", background: "#111", padding: "10px 16px", gap: 12 }}>
                    {[
                      { label: "Name / Colour", col: "name" },
                      { label: "Colour #", col: null },
                      { label: "Qty", col: "qty" },
                      { label: "Threshold", col: null },
                      { label: "Notes", col: null },
                      { label: "", col: null },
                    ].map((h, i) => (
                      <div key={i}
                        onClick={h.col ? () => toggleSort(h.col) : undefined}
                        style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, cursor: h.col ? "pointer" : "default", userSelect: "none" }}>
                        {h.label}
                        {h.col && <SortIcon col={h.col} />}
                      </div>
                    ))}
                  </div>

                  {/* Rows */}
                  {filteredThread.map((item, idx) => {
                    const low = isLow(item);
                    return (
                      <div key={item.id}
                        style={{ display: "grid", gridTemplateColumns: "1fr 120px 90px 90px 160px 80px", padding: "12px 16px", gap: 12, alignItems: "center", borderTop: idx === 0 ? "none" : "1px solid #1f1f1f", background: low ? "#E07D520a" : "transparent" }}>
                        <div>
                          <span style={{ fontSize: 13, color: "#F0F0F0", fontWeight: 500 }}>{item.name}</span>
                          {low && <span style={{ marginLeft: 8, fontSize: 10, color: "#E07D52", fontWeight: 700 }}>⚠ LOW</span>}
                        </div>
                        <div style={{ fontSize: 13, color: "#777" }}>{item.colourNumber || "—"}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: low ? "#E07D52" : currentDiv.color, fontFamily: "'Playfair Display', serif" }}>{fmt(item.qty)}</div>
                        <div style={{ fontSize: 12, color: "#555" }}>{item.lowStockThreshold ?? 2}</div>
                        <div style={{ fontSize: 12, color: "#555", fontStyle: "italic", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{item.notes || "—"}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <button onClick={() => { setAdjustModal(item); setAdjustType("add"); setAdjustQty(""); }}
                            title="Stock In"
                            style={{ background: `${currentDiv.color}18`, border: `1px solid ${currentDiv.color}33`, color: currentDiv.color, borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+</button>
                          <button onClick={() => { setAdjustModal(item); setAdjustType("use"); setAdjustQty(""); }}
                            title="Used"
                            style={{ background: "#111", border: "1px solid #2a2a2a", color: "#777", borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>−</button>
                          <button onClick={() => { setEditModal(item); setForm({ name: item.name, colourNumber: item.colourNumber || "", metres: item.metres ?? "", weight: item.weight ?? "", lowStockThreshold: item.lowStockThreshold || 2, notes: item.notes || "" }); }}
                            style={{ background: "none", border: "none", color: "#555", cursor: "pointer", padding: "3px 4px" }}>
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleDelete(item.id)}
                            style={{ background: "none", border: "none", color: "#555", cursor: "pointer", padding: "3px 4px" }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Non-thread — clean list cards */
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {catItems(activeTab, currentCatKey).length === 0 ? (
                <div style={{ color: "#333", fontSize: 14, textAlign: "center", padding: "60px 0", fontStyle: "italic" }}>
                  No {currentCat?.label} added yet — click the button above to add
                </div>
              ) : (
                catItems(activeTab, currentCatKey).map(item => (
                  <SmallItemCard key={item.id} item={item} />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Add Modal ── */}
      {addModal && (
        <div style={overlay} onClick={() => setAddModal(null)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <button onClick={() => setAddModal(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "#555", cursor: "pointer" }}><X size={18} /></button>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: currentDiv.color, margin: "0 0 22px" }}>
              Add {currentCat?.label}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>{currentCat?.trackColour ? "Name / Label" : "Name"}</label>
                <input style={inputStyle} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder={currentCat?.trackColour ? "e.g. Red, Royal Blue, 304..." : currentCat?.label} autoFocus />
              </div>
              {currentCat?.trackColour && (
                <div>
                  <label style={labelStyle}>Colour Number (optional)</label>
                  <input style={inputStyle} value={form.colourNumber} onChange={e => setForm(p => ({ ...p, colourNumber: e.target.value }))} placeholder="e.g. 304" />
                </div>
              )}
              <div>
                <label style={labelStyle}>Quantity ({currentCat?.unit})</label>
                <input style={inputStyle} type="number" min="0" value={form.qty} onChange={e => setForm(p => ({ ...p, qty: e.target.value }))} placeholder="0" />
              </div>
              {currentCat?.trackMetres && (
                <div>
                  <label style={labelStyle}>Metres</label>
                  <input style={inputStyle} type="number" min="0" value={form.metres} onChange={e => setForm(p => ({ ...p, metres: e.target.value }))} placeholder="0" />
                </div>
              )}
              {currentCat?.trackWeight && (
                <div>
                  <label style={labelStyle}>Weight (kg)</label>
                  <input style={inputStyle} type="number" min="0" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))} placeholder="0" />
                </div>
              )}
              <div>
                <label style={labelStyle}>Low Stock Alert Threshold</label>
                <input style={inputStyle} type="number" min="0" value={form.lowStockThreshold} onChange={e => setForm(p => ({ ...p, lowStockThreshold: e.target.value }))} placeholder="2" />
              </div>
              <div>
                <label style={labelStyle}>Notes (optional)</label>
                <input style={inputStyle} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any extra info..." />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button onClick={() => setAddModal(null)} style={btnStyle("#222", "#888")}>Cancel</button>
              <button onClick={handleAdd} disabled={saving} style={btnStyle(currentDiv.color)}>{saving ? "Saving..." : "Add Item"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editModal && (
        <div style={overlay} onClick={() => setEditModal(null)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <button onClick={() => setEditModal(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "#555", cursor: "pointer" }}><X size={18} /></button>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: currentDiv?.color || "#C9A84C", margin: "0 0 22px" }}>Edit Item</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Name</label>
                <input style={inputStyle} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              {editModal.colourNumber !== undefined && (
                <div>
                  <label style={labelStyle}>Colour Number</label>
                  <input style={inputStyle} value={form.colourNumber} onChange={e => setForm(p => ({ ...p, colourNumber: e.target.value }))} />
                </div>
              )}
              {editModal.metres !== null && editModal.metres !== undefined && (
                <div>
                  <label style={labelStyle}>Metres</label>
                  <input style={inputStyle} type="number" min="0" value={form.metres} onChange={e => setForm(p => ({ ...p, metres: e.target.value }))} />
                </div>
              )}
              {editModal.weight !== null && editModal.weight !== undefined && (
                <div>
                  <label style={labelStyle}>Weight (kg)</label>
                  <input style={inputStyle} type="number" min="0" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))} />
                </div>
              )}
              <div>
                <label style={labelStyle}>Low Stock Threshold</label>
                <input style={inputStyle} type="number" min="0" value={form.lowStockThreshold} onChange={e => setForm(p => ({ ...p, lowStockThreshold: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <input style={inputStyle} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button onClick={() => setEditModal(null)} style={btnStyle("#222", "#888")}>Cancel</button>
              <button onClick={handleEdit} disabled={saving} style={btnStyle("#C9A84C")}>{saving ? "Saving..." : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Adjust Modal ── */}
      {adjustModal && (
        <div style={overlay} onClick={() => setAdjustModal(null)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <button onClick={() => setAdjustModal(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "#555", cursor: "pointer" }}><X size={18} /></button>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: adjustType === "add" ? "#52C97A" : "#E07D52", margin: "0 0 6px" }}>
              {adjustType === "add" ? "Stock In" : "Mark as Used"}
            </h2>
            <p style={{ color: "#555", fontSize: 13, margin: "0 0 20px" }}>
              {adjustModal.name}{adjustModal.colourNumber ? ` (#${adjustModal.colourNumber})` : ""} — current: <strong style={{ color: "#F0F0F0" }}>{fmt(adjustModal.qty)}</strong>
            </p>
            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              {["add", "use"].map(t => (
                <button key={t} onClick={() => setAdjustType(t)}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1px solid", borderColor: adjustType === t ? (t === "add" ? "#52C97A" : "#E07D52") : "#2a2a2a", background: adjustType === t ? (t === "add" ? "#52C97A18" : "#E07D5218") : "#111", color: adjustType === t ? (t === "add" ? "#52C97A" : "#E07D52") : "#555" }}>
                  {t === "add" ? "+ Stock In" : "− Used / Consumed"}
                </button>
              ))}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Quantity</label>
              <input style={inputStyle} type="number" min="0.01" step="0.01" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} placeholder="Enter amount..." autoFocus />
            </div>
            {adjustQty && (
              <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13 }}>
                <span style={{ color: "#555" }}>New level: </span>
                <strong style={{ color: adjustType === "add" ? "#52C97A" : "#E07D52" }}>
                  {fmt(adjustType === "add" ? (adjustModal.qty || 0) + parseFloat(adjustQty || 0) : Math.max(0, (adjustModal.qty || 0) - parseFloat(adjustQty || 0)))}
                </strong>
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setAdjustModal(null)} style={btnStyle("#222", "#888")}>Cancel</button>
              <button onClick={handleAdjust} disabled={saving || !adjustQty} style={btnStyle(adjustType === "add" ? "#52C97A" : "#E07D52")}>
                {saving ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}