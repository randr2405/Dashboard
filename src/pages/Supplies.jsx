import { useEffect, useState } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { Plus, X, AlertTriangle, Package, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";

const DIVISIONS = [
  {
    key: "embroidery",
    label: "Embroidery",
    color: "#C9A84C",
    icon: "🧵",
    categories: [
      { key: "thread", label: "Thread", unit: "spools", trackColour: true },
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

export default function Supplies() {
  const [items, setItems] = useState([]);
  const [openDiv, setOpenDiv] = useState({ embroidery: true, dtf: true, vinyl: true });
  const [addModal, setAddModal] = useState(null); // { division, category }
  const [editModal, setEditModal] = useState(null); // item
  const [adjustModal, setAdjustModal] = useState(null); // item
  const [form, setForm] = useState({});
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustType, setAdjustType] = useState("add"); // add | use
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "supplies"), snap =>
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, []);

  function openAdd(division, category) {
    setForm({
      name: category.trackColour ? "" : category.label,
      colourNumber: "",
      qty: "",
      metres: "",
      weight: "",
      lowStockThreshold: "",
      notes: "",
    });
    setAddModal({ division, category });
  }

  async function handleAdd() {
    if (!form.name?.trim()) return;
    setSaving(true);
    const cat = addModal.category;
    await addDoc(collection(db, "supplies"), {
      division: addModal.division.key,
      category: cat.key,
      categoryLabel: cat.label,
      name: form.name.trim(),
      colourNumber: form.colourNumber || null,
      qty: parseFloat(form.qty) || 0,
      metres: cat.trackMetres ? (parseFloat(form.metres) || 0) : null,
      weight: cat.trackWeight ? (parseFloat(form.weight) || 0) : null,
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
      metres: editModal.metres !== null ? (parseFloat(form.metres) || 0) : null,
      weight: editModal.weight !== null ? (parseFloat(form.weight) || 0) : null,
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
    setAdjustNote("");
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this item?")) return;
    await deleteDoc(doc(db, "supplies", id));
  }

  function itemsFor(divKey, catKey) {
    return items.filter(i => i.division === divKey && i.category === catKey);
  }

  function isLow(item) {
    return (item.qty || 0) <= (item.lowStockThreshold || 2);
  }

  const totalLowStock = items.filter(isLow).length;

  // ── Modal base style
  const overlay = {
    position: "fixed", inset: 0, background: "#000000cc", zIndex: 1000,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
  };
  const modal = {
    background: "#1A1A1A", border: "1px solid #2a2a2a", borderRadius: 16,
    padding: 28, width: "100%", maxWidth: 440, position: "relative",
  };
  const input = {
    width: "100%", background: "#111", border: "1px solid #2a2a2a",
    borderRadius: 8, padding: "10px 12px", color: "#F0F0F0", fontSize: 13,
    outline: "none", boxSizing: "border-box",
  };
  const label = { fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5, display: "block" };
  const btn = (bg, color = "#0D0D0D") => ({
    background: bg, color, border: "none", borderRadius: 8, padding: "10px 20px",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
  });

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, color: "#C9A84C", margin: 0 }}>
          Stock & Supplies
        </h1>
        <p style={{ color: "#555", marginTop: 6, fontSize: 14 }}>
          Manage consumables across all production divisions
        </p>
      </div>

      {/* Low stock banner */}
      {totalLowStock > 0 && (
        <div style={{
          background: "#E07D5215", border: "1px solid #E07D5244", borderRadius: 12,
          padding: "14px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12,
        }}>
          <AlertTriangle size={18} color="#E07D52" />
          <span style={{ fontSize: 14, color: "#E07D52", fontWeight: 600 }}>
            {totalLowStock} item{totalLowStock !== 1 ? "s" : ""} at or below low stock threshold
          </span>
        </div>
      )}

      {/* Divisions */}
      {DIVISIONS.map(div => (
        <div key={div.key} style={{
          background: "#1A1A1A", border: `1px solid ${div.color}33`,
          borderRadius: 16, marginBottom: 20, overflow: "hidden",
        }}>
          {/* Division header */}
          <div
            onClick={() => setOpenDiv(p => ({ ...p, [div.key]: !p[div.key] }))}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "18px 24px", cursor: "pointer",
              borderBottom: openDiv[div.key] ? `1px solid ${div.color}22` : "none",
              background: `${div.color}08`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 22 }}>{div.icon}</span>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: div.color, fontWeight: 700 }}>
                {div.label}
              </span>
              <span style={{
                background: `${div.color}22`, color: div.color, border: `1px solid ${div.color}44`,
                borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600,
              }}>
                {items.filter(i => i.division === div.key).length} items
              </span>
              {items.filter(i => i.division === div.key && isLow(i)).length > 0 && (
                <span style={{
                  background: "#E07D5222", color: "#E07D52", border: "1px solid #E07D5244",
                  borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600,
                }}>
                  ⚠ {items.filter(i => i.division === div.key && isLow(i)).length} low
                </span>
              )}
            </div>
            {openDiv[div.key] ? <ChevronUp size={16} color="#555" /> : <ChevronDown size={16} color="#555" />}
          </div>

          {/* Categories */}
          {openDiv[div.key] && (
            <div style={{ padding: "20px 24px" }}>
              {div.categories.map(cat => {
                const catItems = itemsFor(div.key, cat.key);
                return (
                  <div key={cat.key} style={{ marginBottom: 28 }}>
                    {/* Category header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 13, color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
                          {cat.label}
                        </span>
                        <span style={{ fontSize: 11, color: "#444" }}>({cat.unit})</span>
                      </div>
                      <button
                        onClick={() => openAdd(div, cat)}
                        style={{
                          background: `${div.color}18`, border: `1px solid ${div.color}44`,
                          color: div.color, borderRadius: 8, padding: "5px 12px",
                          fontSize: 12, fontWeight: 600, cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 5,
                        }}
                      >
                        <Plus size={12} /> Add
                      </button>
                    </div>

                    {catItems.length === 0 ? (
                      <div style={{ color: "#333", fontSize: 13, fontStyle: "italic", paddingLeft: 4 }}>
                        No items yet — click Add to stock this category
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                        {catItems.map(item => {
                          const low = isLow(item);
                          return (
                            <div key={item.id} style={{
                              background: "#111", border: `1px solid ${low ? "#E07D5244" : "#1f1f1f"}`,
                              borderRadius: 12, padding: "14px 16px",
                              borderLeft: `3px solid ${low ? "#E07D52" : div.color}`,
                            }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                                <div>
                                  <div style={{ fontSize: 13, color: "#F0F0F0", fontWeight: 600 }}>{item.name}</div>
                                  {item.colourNumber && (
                                    <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>Colour #{item.colourNumber}</div>
                                  )}
                                </div>
                                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                                  <button onClick={() => { setEditModal(item); setForm({ name: item.name, colourNumber: item.colourNumber || "", metres: item.metres ?? "", weight: item.weight ?? "", lowStockThreshold: item.lowStockThreshold || 2, notes: item.notes || "" }); }}
                                    style={{ background: "none", border: "none", color: "#555", cursor: "pointer", padding: 2 }}>
                                    <Pencil size={13} />
                                  </button>
                                  <button onClick={() => handleDelete(item.id)}
                                    style={{ background: "none", border: "none", color: "#555", cursor: "pointer", padding: 2 }}>
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>

                              {/* Qty display */}
                              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
                                <span style={{ fontSize: 24, fontWeight: 700, color: low ? "#E07D52" : div.color, fontFamily: "'Playfair Display', serif" }}>
                                  {fmt(item.qty)}
                                </span>
                                <span style={{ fontSize: 11, color: "#555" }}>{cat.unit}</span>
                                {item.metres !== null && item.metres !== undefined && (
                                  <span style={{ fontSize: 11, color: "#555", marginLeft: 4 }}>· {fmt(item.metres)}m</span>
                                )}
                                {item.weight !== null && item.weight !== undefined && (
                                  <span style={{ fontSize: 11, color: "#555", marginLeft: 4 }}>· {fmt(item.weight)}kg</span>
                                )}
                              </div>

                              {low && (
                                <div style={{ fontSize: 11, color: "#E07D52", fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                                  <AlertTriangle size={11} /> Low stock
                                </div>
                              )}

                              {item.notes && (
                                <div style={{ fontSize: 11, color: "#444", marginBottom: 8, fontStyle: "italic" }}>{item.notes}</div>
                              )}

                              {/* Adjust buttons */}
                              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                                <button onClick={() => { setAdjustModal(item); setAdjustType("add"); setAdjustQty(""); }}
                                  style={{ flex: 1, background: `${div.color}18`, border: `1px solid ${div.color}33`, color: div.color, borderRadius: 7, padding: "6px 0", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                                  + Stock In
                                </button>
                                <button onClick={() => { setAdjustModal(item); setAdjustType("use"); setAdjustQty(""); }}
                                  style={{ flex: 1, background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#888", borderRadius: 7, padding: "6px 0", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                                  − Used
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* ── Add Modal ── */}
      {addModal && (
        <div style={overlay} onClick={() => setAddModal(null)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <button onClick={() => setAddModal(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "#555", cursor: "pointer" }}>
              <X size={18} />
            </button>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: addModal.division.color, margin: "0 0 22px" }}>
              Add {addModal.category.label}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={label}>{addModal.category.trackColour ? "Colour Name / Number" : "Name"}</label>
                <input style={input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={addModal.category.trackColour ? "e.g. 304" : addModal.category.label} />
              </div>

              {addModal.category.trackColour && (
                <div>
                  <label style={label}>Colour Number (optional)</label>
                  <input style={input} value={form.colourNumber} onChange={e => setForm(p => ({ ...p, colourNumber: e.target.value }))} placeholder="e.g. 304" />
                </div>
              )}

              <div>
                <label style={label}>Quantity ({addModal.category.unit})</label>
                <input style={input} type="number" min="0" value={form.qty} onChange={e => setForm(p => ({ ...p, qty: e.target.value }))} placeholder="0" />
              </div>

              {addModal.category.trackMetres && (
                <div>
                  <label style={label}>Metres per roll / total metres</label>
                  <input style={input} type="number" min="0" value={form.metres} onChange={e => setForm(p => ({ ...p, metres: e.target.value }))} placeholder="0" />
                </div>
              )}

              {addModal.category.trackWeight && (
                <div>
                  <label style={label}>Weight (kg)</label>
                  <input style={input} type="number" min="0" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))} placeholder="0" />
                </div>
              )}

              <div>
                <label style={label}>Low Stock Alert Threshold</label>
                <input style={input} type="number" min="0" value={form.lowStockThreshold} onChange={e => setForm(p => ({ ...p, lowStockThreshold: e.target.value }))} placeholder="2" />
              </div>

              <div>
                <label style={label}>Notes (optional)</label>
                <input style={input} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any extra info..." />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button onClick={() => setAddModal(null)} style={btn("#222", "#888")}>Cancel</button>
              <button onClick={handleAdd} disabled={saving} style={btn(addModal.division.color)}>
                {saving ? "Saving..." : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editModal && (
        <div style={overlay} onClick={() => setEditModal(null)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <button onClick={() => setEditModal(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "#555", cursor: "pointer" }}>
              <X size={18} />
            </button>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#C9A84C", margin: "0 0 22px" }}>
              Edit Item
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={label}>Name</label>
                <input style={input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              {editModal.colourNumber !== undefined && (
                <div>
                  <label style={label}>Colour Number</label>
                  <input style={input} value={form.colourNumber} onChange={e => setForm(p => ({ ...p, colourNumber: e.target.value }))} />
                </div>
              )}
              {editModal.metres !== null && editModal.metres !== undefined && (
                <div>
                  <label style={label}>Metres</label>
                  <input style={input} type="number" min="0" value={form.metres} onChange={e => setForm(p => ({ ...p, metres: e.target.value }))} />
                </div>
              )}
              {editModal.weight !== null && editModal.weight !== undefined && (
                <div>
                  <label style={label}>Weight (kg)</label>
                  <input style={input} type="number" min="0" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))} />
                </div>
              )}
              <div>
                <label style={label}>Low Stock Threshold</label>
                <input style={input} type="number" min="0" value={form.lowStockThreshold} onChange={e => setForm(p => ({ ...p, lowStockThreshold: e.target.value }))} />
              </div>
              <div>
                <label style={label}>Notes</label>
                <input style={input} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button onClick={() => setEditModal(null)} style={btn("#222", "#888")}>Cancel</button>
              <button onClick={handleEdit} disabled={saving} style={btn("#C9A84C")}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Adjust Modal ── */}
      {adjustModal && (
        <div style={overlay} onClick={() => setAdjustModal(null)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <button onClick={() => setAdjustModal(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "#555", cursor: "pointer" }}>
              <X size={18} />
            </button>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: adjustType === "add" ? "#52C97A" : "#E07D52", margin: "0 0 6px" }}>
              {adjustType === "add" ? "Stock In" : "Mark as Used"}
            </h2>
            <p style={{ color: "#555", fontSize: 13, margin: "0 0 22px" }}>
              {adjustModal.name} — current stock: <strong style={{ color: "#F0F0F0" }}>{fmt(adjustModal.qty)}</strong>
            </p>

            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              <button onClick={() => setAdjustType("add")}
                style={{ flex: 1, padding: "10px 0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1px solid", borderColor: adjustType === "add" ? "#52C97A" : "#2a2a2a", background: adjustType === "add" ? "#52C97A18" : "#111", color: adjustType === "add" ? "#52C97A" : "#555" }}>
                + Stock In
              </button>
              <button onClick={() => setAdjustType("use")}
                style={{ flex: 1, padding: "10px 0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1px solid", borderColor: adjustType === "use" ? "#E07D52" : "#2a2a2a", background: adjustType === "use" ? "#E07D5218" : "#111", color: adjustType === "use" ? "#E07D52" : "#555" }}>
                − Used / Consumed
              </button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>Quantity</label>
              <input style={input} type="number" min="0.01" step="0.01" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} placeholder="Enter amount..." autoFocus />
            </div>

            {adjustQty && (
              <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13 }}>
                <span style={{ color: "#555" }}>New stock level: </span>
                <strong style={{ color: adjustType === "add" ? "#52C97A" : "#E07D52" }}>
                  {fmt(adjustType === "add"
                    ? (adjustModal.qty || 0) + parseFloat(adjustQty || 0)
                    : Math.max(0, (adjustModal.qty || 0) - parseFloat(adjustQty || 0))
                  )}
                </strong>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <button onClick={() => setAdjustModal(null)} style={btn("#222", "#888")}>Cancel</button>
              <button onClick={handleAdjust} disabled={saving || !adjustQty}
                style={btn(adjustType === "add" ? "#52C97A" : "#E07D52")}>
                {saving ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}