import { useEffect, useState } from "react";
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { Plus, X, Printer } from "lucide-react";

const DIVISIONS = [
  { value: "print", label: "Print / DTF / Vinyl" },
  { value: "it", label: "IT Company" },
  { value: "clothing", label: "Clothing Brand" },
];

const CONTRACT_TYPES = [
  { value: "permanent", label: "Permanent Employment" },
  { value: "fixedterm", label: "Fixed-Term Contract" },
  { value: "parttime", label: "Part-Time Employment" },
  { value: "freelance", label: "Freelance / Independent Contractor" },
];

const empty = {
  employeeId: "", employeeName: "", idNumber: "", address: "",
  role: "", division: "print", contractType: "permanent",
  startDate: "", endDate: "", salary: "", hoursPerWeek: "40",
  leaveDays: "15", noticePeriod: "1 month", probation: "3 months",
  duties: "", specialClauses: "",
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

function printContract(c) {
  const divLabel = DIVISIONS.find(d => d.value === c.division)?.label || c.division;
  const contractLabel = CONTRACT_TYPES.find(t => t.value === c.contractType)?.label || c.contractType;
  const today = new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });

  const win = window.open("", "_blank");
  win.document.write(`<!DOCTYPE html><html><head><title>Employment Contract — ${c.employeeName}</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'DM Sans',sans-serif;background:#F7F6F2;padding:40px;color:#1C1917;line-height:1.7}
    .wrap{background:#fff;border-radius:16px;max-width:760px;margin:0 auto;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1)}
    .header{background:#1B1B1B;padding:36px 44px;color:#fff;display:flex;justify-content:space-between;align-items:flex-start}
    .header h1{font-family:'DM Serif Display',serif;font-size:28px;color:#C9A84C;margin-bottom:4px}
    .header p{font-size:13px;color:#888}
    .header-right{text-align:right;font-size:12px;color:#666}
    .badge{display:inline-block;background:#C9A84C22;border:1px solid #C9A84C44;color:#C9A84C;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.05em;margin-top:8px}
    .body{padding:40px 44px}
    h2{font-family:'DM Serif Display',serif;font-size:22px;color:#1B1B1B;margin-bottom:8px}
    .subtitle{font-size:13px;color:#888;margin-bottom:32px}
    .parties{background:#F7F6F2;border-radius:12px;padding:20px 24px;margin-bottom:28px;display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .party label{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#A8A29E;display:block;margin-bottom:3px}
    .party span{font-size:14px;color:#1C1917;font-weight:500}
    .section{margin-bottom:24px}
    .section h3{font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#1B6B4A;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #E8E5DF}
    .section p{font-size:14px;color:#44403C;margin-bottom:8px}
    .terms-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px}
    .term{background:#F7F6F2;border-radius:8px;padding:12px 14px}
    .term label{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#A8A29E;display:block;margin-bottom:2px}
    .term span{font-size:14px;color:#1C1917;font-weight:600}
    .sig-section{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:40px;padding-top:28px;border-top:1px solid #E8E5DF}
    .sig-box label{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#A8A29E;display:block;margin-bottom:48px}
    .sig-line{border-top:1px solid #1C1917;padding-top:8px;font-size:12px;color:#888}
    .footer{padding:18px 44px;background:#F7F6F2;border-top:1px solid #E8E5DF;font-size:11px;color:#A8A29E;text-align:center}
    .print-btn{display:block;margin:24px auto 0;padding:10px 28px;background:#1B6B4A;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-family:'DM Sans',sans-serif}
    @media print{body{padding:0;background:#fff}.wrap{box-shadow:none;border-radius:0}.print-btn{display:none}}
  </style></head><body>
  <div class="wrap">
    <div class="header">
      <div>
        <h1>R&R Agencies</h1>
        <p>${divLabel}</p>
        <div class="badge">${contractLabel}</div>
      </div>
      <div class="header-right">
        <div>Employment Contract</div>
        <div style="margin-top:4px;color:#C9A84C;font-weight:600">${today}</div>
      </div>
    </div>

    <div class="body">
      <h2>Employment Agreement</h2>
      <p class="subtitle">This agreement is entered into between R&R Agencies and the employee named below.</p>

      <div class="parties">
        <div class="party"><label>Employer</label><span>R&R Agencies</span></div>
        <div class="party"><label>Division</label><span>${divLabel}</span></div>
        <div class="party"><label>Employee Name</label><span>${c.employeeName}</span></div>
        <div class="party"><label>ID Number</label><span>${c.idNumber || "—"}</span></div>
        <div class="party" style="grid-column:1/-1"><label>Address</label><span>${c.address || "—"}</span></div>
      </div>

      <div class="section">
        <h3>Position & Terms</h3>
        <div class="terms-grid">
          <div class="term"><label>Job Title</label><span>${c.role}</span></div>
          <div class="term"><label>Contract Type</label><span>${contractLabel}</span></div>
          <div class="term"><label>Start Date</label><span>${c.startDate || "—"}</span></div>
          <div class="term"><label>End Date</label><span>${c.endDate || (c.contractType === "permanent" ? "Indefinite" : "—")}</span></div>
          <div class="term"><label>Monthly Salary</label><span>R ${parseFloat(c.salary || 0).toFixed(2)}</span></div>
          <div class="term"><label>Hours per Week</label><span>${c.hoursPerWeek} hours</span></div>
          <div class="term"><label>Annual Leave</label><span>${c.leaveDays} days</span></div>
          <div class="term"><label>Notice Period</label><span>${c.noticePeriod}</span></div>
          ${c.probation ? `<div class="term"><label>Probation Period</label><span>${c.probation}</span></div>` : ""}
        </div>
      </div>

      ${c.duties ? `<div class="section">
        <h3>Key Duties & Responsibilities</h3>
        <p>${c.duties.replace(/\n/g, "<br/>")}</p>
      </div>` : ""}

      <div class="section">
        <h3>General Terms</h3>
        <p>The employee agrees to perform their duties diligently and in accordance with the company's policies and procedures. The employee shall maintain confidentiality of all company information during and after employment.</p>
        <p>Remuneration will be paid monthly by the last working day of each month. The employer reserves the right to amend duties and responsibilities with reasonable notice.</p>
        ${c.contractType === "fixedterm" ? "<p>This is a fixed-term contract and will expire on the end date specified unless renewed in writing by both parties.</p>" : ""}
        ${c.probation ? `<p>The first ${c.probation} of employment constitutes a probationary period, during which either party may terminate this agreement with one week's written notice.</p>` : ""}
      </div>

      ${c.specialClauses ? `<div class="section">
        <h3>Special Conditions</h3>
        <p>${c.specialClauses.replace(/\n/g, "<br/>")}</p>
      </div>` : ""}

      <div class="sig-section">
        <div class="sig-box">
          <label>Employer Signature</label>
          <div class="sig-line">R&R Agencies · Date: _____________</div>
        </div>
        <div class="sig-box">
          <label>Employee Signature</label>
          <div class="sig-line">${c.employeeName} · Date: _____________</div>
        </div>
      </div>
    </div>

    <div class="footer">
      Generated by R&R Agencies Admin Dashboard · ${today} · This document is confidential.
    </div>
  </div>
  <button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>
  </body></html>`);
  win.document.close();
}

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, "contracts"), snap =>
      setContracts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(collection(db, "employees"), snap =>
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); };
  }, []);

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    if (!form.employeeName || !form.role) return alert("Employee name and role are required.");
    setSaving(true);
    await addDoc(collection(db, "contracts"), { ...form, createdAt: serverTimestamp() });
    setSaving(false);
    setShowForm(false);
    setForm(empty);
  }

  async function handleDelete(id) {
    if (!confirm("Delete this contract record?")) return;
    await deleteDoc(doc(db, "contracts", id));
  }

  const divColor = { print: "#C9A84C", it: "#52A9E0", clothing: "#9B7DE8" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, color: "#C9A84C", margin: 0 }}>
            Contracts
          </h1>
          <p style={{ color: "#555", marginTop: 6, fontSize: 14 }}>
            {contracts.length} employment contract{contracts.length !== 1 ? "s" : ""} on record
          </p>
        </div>
        <button onClick={() => { setForm(empty); setShowForm(true); }} style={{
          background: "#C9A84C", color: "#0D0D0D", border: "none", borderRadius: 10,
          padding: "12px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8, fontFamily: "'DM Sans', sans-serif"
        }}><Plus size={16} /> New Contract</button>
      </div>

      {contracts.length === 0 ? (
        <div style={{
          background: "#1A1A1A", border: "1px solid #2a2a2a", borderRadius: 14,
          padding: "80px 0", textAlign: "center", color: "#444", fontSize: 14
        }}>
          No contracts yet — generate your first employment contract
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {contracts.map(c => (
            <div key={c.id} style={{
              background: "#1A1A1A", border: "1px solid #2a2a2a", borderRadius: 14,
              padding: 22, borderLeft: "3px solid " + (divColor[c.division] || "#C9A84C")
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#F0F0F0" }}>{c.employeeName}</div>
                  <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{c.role}</div>
                </div>
                <button onClick={() => handleDelete(c.id)} style={{
                  background: "transparent", border: "none", color: "#444", cursor: "pointer"
                }}><X size={16} /></button>
              </div>

              <div style={{ fontSize: 11, color: divColor[c.division], textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, fontWeight: 700 }}>
                {DIVISIONS.find(d => d.value === c.division)?.label}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                <span style={{
                  background: "#C9A84C18", border: "1px solid #C9A84C33",
                  color: "#C9A84C", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600
                }}>
                  {CONTRACT_TYPES.find(t => t.value === c.contractType)?.label}
                </span>
                {c.startDate && (
                  <span style={{ color: "#555", fontSize: 12 }}>From {c.startDate}</span>
                )}
              </div>

              {c.salary && (
                <div style={{ fontSize: 14, color: "#52C97A", fontWeight: 700, marginBottom: 14 }}>
                  R {parseFloat(c.salary).toFixed(2)} / month
                </div>
              )}

              <button onClick={() => printContract(c)} style={{
                width: "100%", background: "transparent", border: "1px solid #333",
                borderRadius: 8, color: "#888", cursor: "pointer", padding: "9px",
                fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center",
                gap: 8, fontFamily: "'DM Sans', sans-serif"
              }}><Printer size={14} /> Print / Export Contract</button>
            </div>
          ))}
        </div>
      )}

      {/* New Contract Modal */}
      {showForm && (
        <div onClick={() => setShowForm(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
          zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#1A1A1A", border: "1px solid #333", borderRadius: 16,
            width: "100%", maxWidth: 680, maxHeight: "92vh", overflowY: "auto",
            padding: 32, position: "relative"
          }}>
            <button onClick={() => setShowForm(false)} style={{
              position: "absolute", top: 16, right: 16, background: "transparent",
              border: "none", color: "#666", cursor: "pointer"
            }}><X size={20} /></button>

            <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#C9A84C", marginBottom: 24 }}>
              New Employment Contract
            </h2>

            {/* Auto-fill from employee */}
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Auto-fill from existing employee (optional)</label>
              <select
                onChange={e => {
                  const emp = employees.find(em => em.id === e.target.value);
                  if (emp) setForm(f => ({
                    ...f, employeeId: emp.id, employeeName: emp.name,
                    role: emp.role, division: emp.division,
                    salary: emp.salary || "", idNumber: emp.idNumber || "",
                    address: emp.address || ""
                  }));
                }}
                style={{ ...inp, background: "#111" }}>
                <option value="">— Select to auto-fill —</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} — {e.role}</option>)}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                ["employeeName", "Employee Full Name", "text"],
                ["idNumber", "ID Number", "text"],
                ["role", "Job Title", "text"],
                ["salary", "Monthly Salary (R)", "number"],
                ["startDate", "Start Date", "date"],
                ["endDate", "End Date (if fixed-term)", "date"],
                ["hoursPerWeek", "Hours per Week", "number"],
                ["leaveDays", "Annual Leave Days", "number"],
                ["noticePeriod", "Notice Period", "text"],
                ["probation", "Probation Period", "text"],
              ].map(([k, l, t]) => (
                <div key={k}>
                  <label style={lbl}>{l}</label>
                  <input type={t} value={form[k]} onChange={e => setField(k, e.target.value)} style={inp} />
                </div>
              ))}

              <div>
                <label style={lbl}>Division</label>
                <select value={form.division} onChange={e => setField("division", e.target.value)} style={{ ...inp, background: "#111" }}>
                  {DIVISIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>

              <div>
                <label style={lbl}>Contract Type</label>
                <select value={form.contractType} onChange={e => setField("contractType", e.target.value)} style={{ ...inp, background: "#111" }}>
                  {CONTRACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Address</label>
                <textarea value={form.address} onChange={e => setField("address", e.target.value)}
                  rows={2} style={{ ...inp, resize: "vertical" }} />
              </div>

              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Key Duties & Responsibilities</label>
                <textarea value={form.duties} onChange={e => setField("duties", e.target.value)}
                  rows={4} placeholder="List main duties, one per line..." style={{ ...inp, resize: "vertical" }} />
              </div>

              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Special Conditions / Clauses</label>
                <textarea value={form.specialClauses} onChange={e => setField("specialClauses", e.target.value)}
                  rows={3} placeholder="Any additional terms or conditions..." style={{ ...inp, resize: "vertical" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button onClick={handleSave} disabled={saving} style={{
                flex: 1, background: "#C9A84C", color: "#0D0D0D", border: "none",
                borderRadius: 8, padding: "13px", fontSize: 15, fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif"
              }}>{saving ? "Saving..." : "Save Contract"}</button>

              <button onClick={() => { handleSave().then(() => printContract(form)); }} style={{
                background: "transparent", color: "#C9A84C", border: "1px solid #C9A84C",
                borderRadius: 8, padding: "13px 20px", fontSize: 14, fontWeight: 700,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap"
              }}>Save & Print</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}