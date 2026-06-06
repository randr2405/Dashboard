import { useEffect, useState } from "react";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import { Plus, X, Download, Printer, Trash2, Search, CheckCircle, Clock } from "lucide-react";

const ENTITIES = {
  print: {
    name:      "R&R Agencies",
    tradingAs: null,
    address:   "SBDC Building, 2 Columbus Rd, Verulam, Unit 13",
    phone:     "0813365266",
    bank:      "FNB/RMB",
    accHolder: "R And R Agencies (Pty) Ltd",
    accType:   "Gold Business Account",
    accNumber: "63066121351",
    branch:    "220229",
  },
  it: {
    name:      "R&R Agencies",
    tradingAs: "Trading as R&R Site Solutions",
    address:   "SBDC Building, 2 Columbus Rd, Verulam, Unit 13",
    phone:     "0813365266",
    bank:      "FNB/RMB",
    accHolder: "R And R Agencies (Pty) Ltd",
    accType:   "Gold Business Account",
    accNumber: "63187338413",
    branch:    "210835",
  },
};

const DIVISIONS = [
  { value: "print",    label: "Print / DTF / Vinyl / Embroidery" },
  { value: "it",       label: "IT / Site Solutions" },
  { value: "clothing", label: "Clothing Brand" },
];

function getEntity(division) {
  return ENTITIES[division] || ENTITIES.print;
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

const STATUS_COLORS = {
  unpaid:    "#E05252",
  paid:      "#52C97A",
  partial:   "#C9A84C",
  overdue:   "#E07D52",
};

function emptyLine() {
  return { desc: "", qty: "1", unitPrice: "" };
}

function makeEmpty() {
  return {
    invoiceNumber: "", date: new Date().toISOString().slice(0, 10),
    dueDate: "", division: "print",
    client: "", contact: "", phone: "", email: "", address: "",
    lines: [emptyLine()],
    includeVat: false, notes: "", status: "unpaid",
    fromQuoteId: null, fromQuoteNumber: null,
  };
}

function calcTotals(lines, includeVat) {
  const subtotal = lines.reduce((s, l) => s + (parseFloat(l.qty || 0) * parseFloat(l.unitPrice || 0)), 0);
  const vat      = includeVat ? subtotal * 0.15 : 0;
  return { subtotal, vat, total: subtotal + vat };
}

function buildInvoiceHTML(invoice, totals) {
  const entity     = getEntity(invoice.division);
  const isPaid     = invoice.status === "paid";
  const isOverdue  = invoice.status === "overdue";

  return `<!DOCTYPE html><html><head><title>Invoice ${invoice.invoiceNumber}</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'DM Sans',sans-serif;background:#fff;color:#1C1917;font-size:13px}
    .page{max-width:720px;margin:0 auto;padding:0;position:relative}
    .wave-top{width:100%;height:90px;background:linear-gradient(135deg,#1a56a0 0%,#3b82f6 50%,#93c5fd 100%);border-radius:0 0 60% 0;position:relative;overflow:hidden}
    .wave-top::after{content:'';position:absolute;bottom:-20px;right:0;width:60%;height:60px;background:#e0eeff;border-radius:50% 0 0 0}
    .header{padding:32px 40px 20px;display:flex;justify-content:space-between;align-items:flex-start}
    .company-name{font-size:20px;font-weight:700;color:#1a56a0}
    .trading-as{font-size:12px;color:#666;margin-top:2px}
    .address{font-size:12px;color:#555;margin-top:8px;line-height:1.6}
    .doc-title{font-size:40px;font-weight:700;color:#1a56a0;text-align:right}
    .meta{padding:0 40px 20px;display:grid;grid-template-columns:1fr 1fr;gap:4px}
    .meta-row{display:flex;gap:8px;font-size:12px;margin-bottom:3px}
    .meta-label{color:#1a56a0;font-weight:700;min-width:110px}
    .meta-val{color:#333}
    .bill-section{padding:0 40px 20px}
    .bill-title{font-size:11px;font-weight:700;color:#1a56a0;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px}
    .bill-name{font-size:14px;font-weight:600;color:#1C1917}
    .bill-detail{font-size:12px;color:#555;margin-top:2px}
    table{width:calc(100% - 80px);margin:0 40px 24px;border-collapse:collapse}
    thead tr{background:#1a56a0;color:#fff}
    thead th{padding:10px 14px;text-align:left;font-size:12px;font-weight:600}
    thead th:last-child,thead th:nth-child(3){text-align:right}
    tbody tr:nth-child(even){background:#f0f6ff}
    tbody td{padding:9px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#374151}
    tbody td:last-child,tbody td:nth-child(3){text-align:right}
    .totals{padding:0 40px;display:flex;justify-content:flex-end}
    .totals-box{width:260px}
    .total-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #e5e7eb;font-size:13px}
    .total-row.grand{font-weight:700;font-size:15px;color:#1a56a0;border-bottom:2px solid #1a56a0;padding-bottom:10px}
    .stamp{position:absolute;top:170px;right:50px;border:4px solid ${isPaid ? "#16a34a" : isOverdue ? "#b91c1c" : "transparent"};color:${isPaid ? "#16a34a" : isOverdue ? "#b91c1c" : "transparent"};padding:8px 20px;font-size:22px;font-weight:700;border-radius:4px;transform:rotate(-15deg);opacity:0.85;letter-spacing:3px}
    .notes{padding:20px 40px 0;font-size:12px;color:#555}
    .bank{padding:20px 40px 0;font-size:12px;color:#555;line-height:1.8}
    .bank strong{color:#1C1917}
    .wave-bot{width:100%;height:70px;background:linear-gradient(135deg,#93c5fd 0%,#3b82f6 50%,#1a56a0 100%);margin-top:40px;border-radius:60% 0 0 0}
    .print-btns{display:flex;gap:12px;justify-content:center;margin:24px auto 0}
    .print-btn{padding:10px 28px;background:#1a56a0;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:600}
    @media print{.print-btns{display:none}body{background:#fff}}
  </style></head><body>
  <div class="page">
    <div class="wave-top"></div>
    <div class="stamp">${isPaid ? "PAID" : isOverdue ? "OVERDUE" : ""}</div>
    <div class="header">
      <div>
        <div class="company-name">${entity.name}</div>
        ${entity.tradingAs ? `<div class="trading-as">${entity.tradingAs}</div>` : ""}
        <div class="address">${entity.address}<br>${entity.phone}</div>
      </div>
      <div class="doc-title">Invoice</div>
    </div>
    <div class="meta">
      <div class="meta-row"><span class="meta-label">Invoice No.:</span><span class="meta-val">${invoice.invoiceNumber}</span></div>
      <div class="meta-row"><span class="meta-label">Date:</span><span class="meta-val">${invoice.date}</span></div>
      ${invoice.dueDate ? `<div class="meta-row"><span class="meta-label">Due Date:</span><span class="meta-val">${invoice.dueDate}</span></div>` : ""}
      ${invoice.fromQuoteNumber ? `<div class="meta-row"><span class="meta-label">Quote Ref.:</span><span class="meta-val">${invoice.fromQuoteNumber}</span></div>` : ""}
    </div>
    <div class="bill-section">
      <div class="bill-title">Bill To</div>
      <div class="bill-name">${invoice.client}</div>
      ${invoice.contact ? `<div class="bill-detail">${invoice.contact}</div>` : ""}
      ${invoice.address ? `<div class="bill-detail">${invoice.address}</div>` : ""}
      ${invoice.phone ? `<div class="bill-detail">${invoice.phone}</div>` : ""}
      ${invoice.email ? `<div class="bill-detail">${invoice.email}</div>` : ""}
    </div>
    <table>
      <thead><tr>
        <th>Qty</th><th>Description</th><th>Unit Price</th><th>Total</th>
      </tr></thead>
      <tbody>
        ${invoice.lines.map(l => `<tr>
          <td>${l.qty}</td>
          <td>${l.desc}</td>
          <td>R ${parseFloat(l.unitPrice || 0).toFixed(2)}</td>
          <td>R ${(parseFloat(l.qty || 0) * parseFloat(l.unitPrice || 0)).toFixed(2)}</td>
        </tr>`).join("")}
      </tbody>
    </table>
    <div class="totals">
      <div class="totals-box">
        <div class="total-row"><span>Subtotal</span><span>R ${totals.subtotal.toFixed(2)}</span></div>
        ${invoice.includeVat ? `<div class="total-row"><span>VAT (15%)</span><span>R ${totals.vat.toFixed(2)}</span></div>` : ""}
        <div class="total-row grand"><span>TOTAL</span><span>R ${totals.total.toFixed(2)}</span></div>
      </div>
    </div>
    ${invoice.notes ? `<div class="notes"><strong>Notes:</strong> ${invoice.notes}</div>` : ""}
    <div class="bank">
      <strong>Bank:</strong> ${entity.bank}<br>
      <strong>Account Holder:</strong> ${entity.accHolder}<br>
      <strong>Account Type:</strong> ${entity.accType}<br>
      <strong>Account Number:</strong> ${entity.accNumber}<br>
      <strong>Branch Code:</strong> ${entity.branch}
    </div>
    <div class="wave-bot"></div>
  </div>
  <div class="print-btns">
    <button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>
  </div>
  </body></html>`;
}

export default function Invoices({ prefillFromQuote, onPrefillConsumed }) {
  const [invoices, setInvoices]     = useState([]);
  const [customers, setCustomers]   = useState([]);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(makeEmpty());
  const [editingId, setEditingId]   = useState(null);
  const [selected, setSelected]     = useState(null);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [saving, setSaving]         = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDrop, setShowClientDrop] = useState(false);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, "invoices"), snap =>
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(collection(db, "customers"), snap =>
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); };
  }, []);

  // Handle prefill from quote conversion
  useEffect(() => {
    if (prefillFromQuote) {
      const q = prefillFromQuote;
      setForm({
        ...makeEmpty(),
        client:          q.client || "",
        contact:         q.contact || "",
        phone:           q.phone || "",
        email:           q.email || "",
        address:         q.address || "",
        division:        q.division || "print",
        lines:           q.lines?.length ? q.lines : [emptyLine()],
        includeVat:      q.includeVat || false,
        notes:           q.notes || "",
        date:            new Date().toISOString().slice(0, 10),
        fromQuoteId:     q.id || null,
        fromQuoteNumber: q.quoteNumber || null,
      });
      setClientSearch(q.client || "");
      setEditingId(null);
      setShowForm(true);
      if (onPrefillConsumed) onPrefillConsumed();
    }
  }, [prefillFromQuote]);

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function setLine(i, k, v) {
    setForm(f => {
      const lines = [...f.lines];
      lines[i] = { ...lines[i], [k]: v };
      return { ...f, lines };
    });
  }

  function addLine()     { setForm(f => ({ ...f, lines: [...f.lines, emptyLine()] })); }
  function removeLine(i) { setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) })); }

  function selectCustomer(c) {
    setForm(f => ({ ...f, client: c.name, contact: c.contact || "", phone: c.phone || "", email: c.email || "" }));
    setClientSearch(c.name);
    setShowClientDrop(false);
  }

  async function handleSave() {
    if (!form.client)        return alert("Client name is required.");
    if (!form.invoiceNumber) return alert("Invoice number is required.");
    setSaving(true);
    try {
      const data = { ...form };
      if (editingId) {
        await updateDoc(doc(db, "invoices", editingId), data);
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, "invoices"), data);
      }
      setShowForm(false);
      setForm(makeEmpty());
      setEditingId(null);
      setClientSearch("");
    } catch (err) {
      alert("Failed to save: " + err.message);
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm("Delete this invoice?")) return;
    await deleteDoc(doc(db, "invoices", id));
    setSelected(null);
  }

  async function updateStatus(id, status) {
    await updateDoc(doc(db, "invoices", id), { status });
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status } : inv));
  }

  function openEdit(inv) {
    setForm({ ...makeEmpty(), ...inv });
    setClientSearch(inv.client || "");
    setEditingId(inv.id);
    setSelected(null);
    setShowForm(true);
  }

  function handlePrint(inv) {
    const totals = calcTotals(inv.lines || [], inv.includeVat);
    const win = window.open("", "_blank");
    win.document.write(buildInvoiceHTML(inv, totals));
    win.document.close();
  }

  function handleDownload(inv) {
    const totals = calcTotals(inv.lines || [], inv.includeVat);
    const html   = buildInvoiceHTML(inv, totals);
    const blob   = new Blob([html], { type: "text/html" });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement("a");
    a.href       = url;
    a.download   = `Invoice_${inv.invoiceNumber}_${inv.client?.replace(/\s+/g, "_")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = invoices.filter(inv => {
    const matchStatus = statusFilter === "all" || inv.status === statusFilter;
    const matchSearch = !search ||
      inv.client?.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const selectedInvoice = selected ? invoices.find(inv => inv.id === selected) : null;

  const totalOutstanding = invoices
    .filter(inv => inv.status === "unpaid" || inv.status === "overdue")
    .reduce((s, inv) => s + calcTotals(inv.lines || [], inv.includeVat).total, 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, color: "#C9A84C", margin: 0 }}>
            Invoices
          </h1>
          <p style={{ color: "#555", marginTop: 6, fontSize: 14 }}>
            {invoices.length} invoices ·{" "}
            <span style={{ color: "#E05252" }}>R {totalOutstanding.toFixed(2)} outstanding</span>
          </p>
        </div>
        <button onClick={() => { setForm(makeEmpty()); setEditingId(null); setClientSearch(""); setShowForm(true); }} style={{
          background: "#C9A84C", color: "#0D0D0D", border: "none", borderRadius: 10,
          padding: "11px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8, fontFamily: "'DM Sans', sans-serif",
        }}><Plus size={16} /> New Invoice</button>
      </div>

      {/* Search + Status filter */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#555" }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search client or invoice number..."
            style={{ ...inp, paddingLeft: 36 }} />
        </div>
        {["all", "unpaid", "paid", "partial", "overdue"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            background: statusFilter === s ? "#C9A84C" : "#1A1A1A",
            color:      statusFilter === s ? "#0D0D0D" : "#888",
            border:     "1px solid " + (statusFilter === s ? "#C9A84C" : "#333"),
            borderRadius: 20, padding: "8px 16px", fontSize: 12, fontWeight: 600,
            cursor: "pointer", textTransform: "capitalize", fontFamily: "'DM Sans', sans-serif",
          }}>{s === "all" ? "All" : s}</button>
        ))}
      </div>

      {/* Invoice list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#444" }}>No invoices found</div>
        ) : filtered.map(inv => {
          const totals = calcTotals(inv.lines || [], inv.includeVat);
          const sc     = STATUS_COLORS[inv.status] || "#666";
          return (
            <div key={inv.id} onClick={() => setSelected(inv.id)} style={{
              background: "#1A1A1A", border: "1px solid #2a2a2a", borderRadius: 14,
              padding: "18px 22px", cursor: "pointer", display: "flex",
              alignItems: "center", gap: 16, flexWrap: "wrap",
              borderLeft: "3px solid " + sc,
            }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ color: "#C9A84C", fontWeight: 700, fontSize: 13 }}>{inv.invoiceNumber}</span>
                  <span style={{ fontSize: 11, color: "#555" }}>{inv.date}</span>
                  <span style={{
                    background: sc + "22", color: sc, border: "1px solid " + sc + "44",
                    borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600,
                    textTransform: "capitalize",
                  }}>{inv.status}</span>
                  {inv.fromQuoteNumber && (
                    <span style={{ fontSize: 11, color: "#555" }}>from {inv.fromQuoteNumber}</span>
                  )}
                </div>
                <div style={{ fontWeight: 600, fontSize: 15, color: "#F0F0F0" }}>{inv.client}</div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                  {DIVISIONS.find(d => d.value === inv.division)?.label}
                  {inv.dueDate ? " · Due: " + inv.dueDate : ""}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#F0F0F0" }}>R {totals.total.toFixed(2)}</div>
                {inv.includeVat && <div style={{ fontSize: 11, color: "#555" }}>incl. VAT</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Detail Modal ── */}
      {selectedInvoice && (() => {
        const totals = calcTotals(selectedInvoice.lines || [], selectedInvoice.includeVat);
        const sc     = STATUS_COLORS[selectedInvoice.status] || "#666";
        return (
          <div onClick={() => setSelected(null)} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
            zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              background: "#1A1A1A", border: "1px solid #333", borderRadius: 16,
              width: "100%", maxWidth: 620, maxHeight: "90vh", overflowY: "auto",
              padding: 32, position: "relative",
            }}>
              <button onClick={() => setSelected(null)} style={{
                position: "absolute", top: 16, right: 16, background: "transparent",
                border: "none", color: "#666", cursor: "pointer",
              }}><X size={20} /></button>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#C9A84C", margin: 0 }}>
                  {selectedInvoice.invoiceNumber}
                </h2>
                <span style={{
                  background: sc + "22", color: sc, border: "1px solid " + sc + "44",
                  borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 600,
                  textTransform: "capitalize",
                }}>{selectedInvoice.status}</span>
              </div>
              <p style={{ color: "#555", fontSize: 13, marginBottom: 4 }}>
                {selectedInvoice.client} · {DIVISIONS.find(d => d.value === selectedInvoice.division)?.label}
              </p>
              {selectedInvoice.fromQuoteNumber && (
                <p style={{ color: "#444", fontSize: 12, marginBottom: 20 }}>
                  Converted from quote {selectedInvoice.fromQuoteNumber}
                </p>
              )}

              {/* Quick status toggle */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Update Status</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {[
                    { s: "unpaid",  icon: <Clock size={12} /> },
                    { s: "paid",    icon: <CheckCircle size={12} /> },
                    { s: "partial", icon: null },
                    { s: "overdue", icon: null },
                  ].map(({ s, icon }) => {
                    const c = STATUS_COLORS[s];
                    const active = selectedInvoice.status === s;
                    return (
                      <button key={s} onClick={() => updateStatus(selectedInvoice.id, s)} style={{
                        background: active ? c + "22" : "#111",
                        border: "1px solid " + (active ? c : "#333"),
                        color: active ? c : "#666",
                        borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600,
                        cursor: "pointer", textTransform: "capitalize",
                        fontFamily: "'DM Sans', sans-serif",
                        display: "flex", alignItems: "center", gap: 5,
                      }}>{icon}{s}</button>
                    );
                  })}
                </div>
              </div>

              {/* Line items */}
              <div style={{ background: "#111", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                      {["Qty", "Description", "Unit Price", "Total"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: h === "Unit Price" || h === "Total" ? "right" : "left", color: "#555", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedInvoice.lines || []).map((l, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #1a1a1a" }}>
                        <td style={{ padding: "10px 14px", color: "#ddd" }}>{l.qty}</td>
                        <td style={{ padding: "10px 14px", color: "#ddd" }}>{l.desc}</td>
                        <td style={{ padding: "10px 14px", color: "#ddd", textAlign: "right" }}>R {parseFloat(l.unitPrice || 0).toFixed(2)}</td>
                        <td style={{ padding: "10px 14px", color: "#C9A84C", fontWeight: 600, textAlign: "right" }}>R {(parseFloat(l.qty || 0) * parseFloat(l.unitPrice || 0)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
                <div style={{ width: 240 }}>
                  {[
                    ["Subtotal", totals.subtotal],
                    ...(selectedInvoice.includeVat ? [["VAT (15%)", totals.vat]] : []),
                  ].map(([l, v]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #222", fontSize: 13 }}>
                      <span style={{ color: "#666" }}>{l}</span>
                      <span style={{ color: "#ddd" }}>R {v.toFixed(2)}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: 15, fontWeight: 700 }}>
                    <span style={{ color: "#aaa" }}>Total</span>
                    <span style={{ color: "#C9A84C" }}>R {totals.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => openEdit(selectedInvoice)} style={{
                  flex: 1, background: "#C9A84C", color: "#0D0D0D", border: "none",
                  borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                }}>✏️ Edit</button>
                <button onClick={() => handlePrint(selectedInvoice)} style={{
                  background: "transparent", border: "1px solid #333", borderRadius: 8,
                  color: "#888", cursor: "pointer", padding: "10px 14px", fontSize: 13,
                  display: "flex", alignItems: "center", gap: 6, fontFamily: "'DM Sans', sans-serif",
                }}><Printer size={13} /> Print</button>
                <button onClick={() => handleDownload(selectedInvoice)} style={{
                  background: "transparent", border: "1px solid #C9A84C", borderRadius: 8,
                  color: "#C9A84C", cursor: "pointer", padding: "10px 14px", fontSize: 13,
                  display: "flex", alignItems: "center", gap: 6, fontFamily: "'DM Sans', sans-serif",
                }}><Download size={13} /> Download</button>
                <button onClick={() => handleDelete(selectedInvoice.id)} style={{
                  background: "transparent", border: "1px solid #E05252", borderRadius: 8,
                  color: "#E05252", cursor: "pointer", padding: "10px 14px", fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif",
                }}><Trash2 size={13} /></button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── New / Edit Form Modal ── */}
      {showForm && (
        <div onClick={() => setShowForm(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
          zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#1A1A1A", border: "1px solid #333", borderRadius: 16,
            width: "100%", maxWidth: 680, maxHeight: "92vh", overflowY: "auto",
            padding: 32, position: "relative",
          }}>
            <button onClick={() => setShowForm(false)} style={{
              position: "absolute", top: 16, right: 16, background: "transparent",
              border: "none", color: "#666", cursor: "pointer",
            }}><X size={20} /></button>
            <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#C9A84C", marginBottom: 6 }}>
              {editingId ? "Edit Invoice" : "New Invoice"}
            </h2>
            {form.fromQuoteNumber && (
              <p style={{ color: "#555", fontSize: 13, marginBottom: 20 }}>
                Converted from quote {form.fromQuoteNumber}
              </p>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 0 }}>
              <div>
                <label style={lbl}>Invoice Number</label>
                <input value={form.invoiceNumber} onChange={e => setField("invoiceNumber", e.target.value)}
                  placeholder="e.g. INV-001" style={inp} />
              </div>
              <div>
                <label style={lbl}>Division</label>
                <select value={form.division} onChange={e => setField("division", e.target.value)}
                  style={{ ...inp, background: "#111" }}>
                  {DIVISIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Invoice Date</label>
                <input type="date" value={form.date} onChange={e => setField("date", e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Due Date</label>
                <input type="date" value={form.dueDate} onChange={e => setField("dueDate", e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Status</label>
                <select value={form.status} onChange={e => setField("status", e.target.value)}
                  style={{ ...inp, background: "#111" }}>
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>

              {/* Client autocomplete */}
              <div style={{ gridColumn: "1/-1", position: "relative" }}>
                <label style={lbl}>Client Name</label>
                <input
                  value={clientSearch || form.client}
                  onChange={e => { setClientSearch(e.target.value); setField("client", e.target.value); setShowClientDrop(true); }}
                  onFocus={() => setShowClientDrop(true)}
                  onBlur={() => setTimeout(() => setShowClientDrop(false), 150)}
                  placeholder="Type or search client..."
                  style={inp}
                />
                {showClientDrop && customers.filter(c => c.name?.toLowerCase().includes((clientSearch || "").toLowerCase())).length > 0 && (
                  <div style={{
                    position: "absolute", top: "100%", left: 0, right: 0, zIndex: 999,
                    background: "#1a1a1a", border: "1px solid #333", borderRadius: 8,
                    maxHeight: 160, overflowY: "auto", marginTop: 4,
                  }}>
                    {customers.filter(c => c.name?.toLowerCase().includes((clientSearch || "").toLowerCase())).map(c => (
                      <div key={c.id} onMouseDown={() => selectCustomer(c)} style={{
                        padding: "10px 14px", cursor: "pointer", fontSize: 13,
                        borderBottom: "1px solid #222",
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = "#252525"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <span style={{ color: "#F0F0F0", fontWeight: 600 }}>{c.name}</span>
                        {c.phone && <span style={{ color: "#555", fontSize: 11, marginLeft: 8 }}>{c.phone}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {[["contact", "Contact Person", "text"], ["phone", "Phone", "text"], ["email", "Email", "email"], ["address", "Client Address", "text"]].map(([k, l, t]) => (
                <div key={k}>
                  <label style={lbl}>{l}</label>
                  <input type={t} value={form[k] || ""} onChange={e => setField(k, e.target.value)} style={inp} />
                </div>
              ))}
            </div>

            {/* Line items */}
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Line Items</div>
              <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 120px 40px", gap: 8, marginBottom: 8 }}>
                {["Qty", "Description", "Unit Price (R)", ""].map(h => (
                  <div key={h} style={{ fontSize: 11, color: "#444", textTransform: "uppercase", letterSpacing: 1 }}>{h}</div>
                ))}
              </div>
              {form.lines.map((l, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 1fr 120px 40px", gap: 8, marginBottom: 8, alignItems: "center" }}>
                  <input type="number" value={l.qty} onChange={e => setLine(i, "qty", e.target.value)} style={inp} />
                  <input value={l.desc} onChange={e => setLine(i, "desc", e.target.value)} placeholder="Description" style={inp} />
                  <input type="number" value={l.unitPrice} onChange={e => setLine(i, "unitPrice", e.target.value)} placeholder="0.00" style={inp} />
                  <button onClick={() => removeLine(i)} disabled={form.lines.length === 1} style={{
                    background: "transparent", border: "1px solid #333", borderRadius: 6,
                    color: "#E05252", cursor: "pointer", padding: "9px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}><X size={13} /></button>
                </div>
              ))}
              <button onClick={addLine} style={{
                background: "transparent", border: "1px dashed #333", borderRadius: 8,
                color: "#555", cursor: "pointer", padding: "8px 16px", fontSize: 13,
                width: "100%", marginTop: 4, fontFamily: "'DM Sans', sans-serif",
              }}>+ Add Line</button>
            </div>

            {/* VAT + totals preview */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 20, gap: 16, flexWrap: "wrap" }}>
              <div>
                <label style={lbl}>VAT</label>
                <button onClick={() => setField("includeVat", !form.includeVat)} style={{
                  background: form.includeVat ? "rgba(82,201,122,0.12)" : "#111",
                  border: "1px solid " + (form.includeVat ? "#52C97A" : "#333"),
                  color: form.includeVat ? "#52C97A" : "#555",
                  borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                }}>{form.includeVat ? "✓ VAT Included (15%)" : "Add VAT (15%)"}</button>
              </div>
              <div style={{ textAlign: "right" }}>
                {(() => {
                  const t = calcTotals(form.lines, form.includeVat);
                  return (
                    <>
                      <div style={{ fontSize: 12, color: "#555" }}>Subtotal: R {t.subtotal.toFixed(2)}</div>
                      {form.includeVat && <div style={{ fontSize: 12, color: "#555" }}>VAT: R {t.vat.toFixed(2)}</div>}
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#C9A84C", marginTop: 4 }}>Total: R {t.total.toFixed(2)}</div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={lbl}>Notes</label>
              <textarea value={form.notes} onChange={e => setField("notes", e.target.value)}
                rows={2} style={{ ...inp, resize: "vertical" }} />
            </div>

            <button onClick={handleSave} disabled={saving} style={{
              marginTop: 24, width: "100%", background: "#C9A84C", color: "#0D0D0D",
              border: "none", borderRadius: 8, padding: "13px", fontSize: 15,
              fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}>{saving ? "Saving..." : editingId ? "Update Invoice" : "Save Invoice"}</button>
          </div>
        </div>
      )}
    </div>
  );
}