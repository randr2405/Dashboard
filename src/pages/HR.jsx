import { useEffect, useState } from "react";
import {
  collection, addDoc, deleteDoc,
  doc, onSnapshot, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import { Plus, X, Printer } from "lucide-react";

const DIVISIONS = [
  { value: "print", label: "Print / DTF / Vinyl" },
  { value: "it", label: "IT Company" },
  { value: "clothing", label: "Clothing Brand" },
];

const emptyEmp = { name: "", role: "", division: "print", email: "", phone: "", startDate: "", salary: "", idNumber: "", address: "" };
const emptySlip = { employeeId: "", period: "", basicSalary: "", overtime: "", bonus: "", taxRate: "25", uif: "1", otherDed: "", otherDedLabel: "" };

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

function printPayslip(record, taxRate, uifRate) {
  const divLabel = DIVISIONS.find(d => d.value === record.division)?.label || record.division;
  const win = window.open("", "_blank");
  win.document.write(`<!DOCTYPE html><html><head><title>Payslip — ${record.employeeName}</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'DM Sans',sans-serif;background:#F7F6F2;padding:40px;color:#1C1917}
    .wrap{background:#fff;border-radius:16px;max-width:680px;margin:0 auto;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1)}
    .header{background:#1B6B4A;padding:32px 36px;color:#fff}
    .header h1{font-family:'DM Serif Display',serif;font-size:26px;margin-bottom:4px}
    .header p{font-size:13px;opacity:0.75}
    .body{padding:32px 36px}
    .emp-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px;padding-bottom:24px;border-bottom:1px solid #E8E5DF}
    .emp-field label{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#A8A29E;display:block;margin-bottom:3px}
    .emp-field span{font-size:14px;color:#1C1917;font-weight:500}
    .section-title{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#A8A29E;margin-bottom:12px}
    table{width:100%;border-collapse:collapse;margin-bottom:24px}
    td{padding:9px 0;border-bottom:1px solid #F0EDE8;font-size:14px;color:#6B6560}
    td:last-child{text-align:right;color:#1C1917;font-weight:500}
    .deduction td{color:#B91C1C}
    .deduction td:last-child{color:#B91C1C}
    .gross-row td{font-weight:700;color:#1C1917;font-size:15px;border-bottom:2px solid #E8E5DF;padding-bottom:14px}
    .net-row{background:#1B6B4A;border-radius:10px;padding:20px 24px;display:flex;justify-content:space-between;align-items:center;margin-top:8px}
    .net-row .net-label{color:rgba(255,255,255,0.8);font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase}
    .net-row .net-val{color:#fff;font-size:26px;font-weight:700;font-family:'DM Serif Display',serif}
    .footer{padding:20px 36px;background:#F7F6F2;border-top:1px solid #E8E5DF;font-size:11px;color:#A8A29E;text-align:center}
    .print-btn{display:block;margin:24px auto 0;padding:10px 28px;background:#1B6B4A;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-family:'DM Sans',sans-serif}
    @media print{body{padding:0;background:#fff}.wrap{box-shadow:none;border-radius:0}.print-btn{display:none}}
  </style></head><body>
  <div class="wrap">
    <div class="header">
      <h1>R&R Agencies</h1>
      <p>Payslip · ${divLabel}</p>
    </div>
    <div class="body">
      <div class="emp-row">
        <div class="emp-field"><label>Employee</label><span>${record.employeeName}</span></div>
        <div class="emp-field"><label>Job Title</label><span>${record.role || "—"}</span></div>
        <div class="emp-field"><label>Division</label><span>${divLabel}</span></div>
        <div class="emp-field"><label>Pay Period</label><span>${record.period}</span></div>
      </div>

      <div class="section-title">Earnings</div>
      <table>
        <tr><td>Basic Salary</td><td>R ${record.basic.toFixed(2)}</td></tr>
        ${record.overtime > 0 ? `<tr><td>Overtime</td><td>R ${record.overtime.toFixed(2)}</td></tr>` : ""}
        ${record.bonus > 0 ? `<tr><td>Bonus / Commission</td><td>R ${record.bonus.toFixed(2)}</td></tr>` : ""}
        <tr class="gross-row"><td>Gross Pay</td><td>R ${record.gross.toFixed(2)}</td></tr>
      </table>

      <div class="section-title">Deductions</div>
      <table>
        <tr class="deduction"><td>PAYE Tax (${taxRate || 25}%)</td><td>− R ${record.tax.toFixed(2)}</td></tr>
        <tr class="deduction"><td>UIF (${uifRate || 1}%)</td><td>− R ${record.uif.toFixed(2)}</td></tr>
        ${record.otherDed > 0 ? `<tr class="deduction"><td>${record.otherDedLabel || "Other Deduction"}</td><td>− R ${record.otherDed.toFixed(2)}</td></tr>` : ""}
        <tr class="deduction"><td><strong>Total Deductions</strong></td><td><strong>− R ${record.totalDed.toFixed(2)}</strong></td></tr>
      </table>

      <div class="net-row">
        <span class="net-label">Net Pay</span>
        <span class="net-val">R ${record.net.toFixed(2)}</span>
      </div>
    </div>
    <div class="footer">
      This payslip was generated by R&R Agencies Admin Dashboard · ${new Date().toLocaleDateString("en-ZA")}
    </div>
  </div>
  <button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>
  </body></html>`);
  win.document.close();
}

export default function HR() {
  const [tab, setTab] = useState("employees");
  const [employees, setEmployees] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [showEmpForm, setShowEmpForm] = useState(false);
  const [showSlipForm, setShowSlipForm] = useState(false);
  const [empForm, setEmpForm] = useState(emptyEmp);
  const [slipForm, setSlipForm] = useState(emptySlip);
  const [divFilter, setDivFilter] = useState("all");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, "employees"), snap =>
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(collection(db, "payroll"), snap =>
      setPayroll(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); };
  }, []);

  const basic = parseFloat(slipForm.basicSalary) || 0;
  const overtime = parseFloat(slipForm.overtime) || 0;
  const bonus = parseFloat(slipForm.bonus) || 0;
  const gross = basic + overtime + bonus;
  const tax = gross * ((parseFloat(slipForm.taxRate) || 0) / 100);
  const uif = gross * ((parseFloat(slipForm.uif) || 0) / 100);
  const otherDed = parseFloat(slipForm.otherDed) || 0;
  const totalDed = tax + uif + otherDed;
  const net = gross - totalDed;

  async function saveEmployee() {
    if (!empForm.name) return alert("Name is required.");
    setSaving(true);
    await addDoc(collection(db, "employees"), { ...empForm, createdAt: serverTimestamp() });
    setSaving(false);
    setShowEmpForm(false);
    setEmpForm(emptyEmp);
  }

  async function deleteEmployee(id) {
    if (!confirm("Remove this employee?")) return;
    await deleteDoc(doc(db, "employees", id));
  }

  async function savePayslip() {
    const emp = employees.find(e => e.id === slipForm.employeeId);
    if (!emp) return alert("Select an employee.");
    if (!slipForm.period) return alert("Pay period is required.");
    setSaving(true);
    await addDoc(collection(db, "payroll"), {
      employeeId: slipForm.employeeId,
      employeeName: emp.name,
      role: emp.role,
      division: emp.division,
      period: slipForm.period,
      basic, overtime, bonus, gross,
      tax, uif, otherDed,
      otherDedLabel: slipForm.otherDedLabel,
      taxRate: slipForm.taxRate,
      uifRate: slipForm.uif,
      totalDed, net,
      createdAt: serverTimestamp()
    });
    setSaving(false);
    setShowSlipForm(false);
    setSlipForm(emptySlip);
  }

  async function deletePayslip(id) {
    if (!confirm("Delete this payslip record?")) return;
    await deleteDoc(doc(db, "payroll", id));
  }

  const divColor = { print: "#C9A84C", it: "#52A9E0", clothing: "#9B7DE8" };

  const filteredPayroll = divFilter === "all"
    ? payroll
    : payroll.filter(p => p.division === divFilter);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, color: "#C9A84C", margin: 0 }}>
          HR & Payroll
        </h1>
        <p style={{ color: "#555", marginTop: 6, fontSize: 14 }}>
          {employees.length} employees · {payroll.length} payslips issued
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 28, background: "#1A1A1A", borderRadius: 10, padding: 4, width: "fit-content", border: "1px solid #2a2a2a" }}>
        {["employees", "payslips"].map(t => (
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

      {/* EMPLOYEES TAB */}
      {tab === "employees" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
            <button onClick={() => setShowEmpForm(true)} style={{
              background: "#C9A84C", color: "#0D0D0D", border: "none", borderRadius: 10,
              padding: "11px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8, fontFamily: "'DM Sans', sans-serif"
            }}><Plus size={15} /> Add Employee</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {employees.length === 0 ? (
              <div style={{ color: "#444", textAlign: "center", padding: "60px 0", fontSize: 14 }}>
                No employees yet
              </div>
            ) : employees.map(e => (
              <div key={e.id} style={{
                background: "#1A1A1A", border: "1px solid #2a2a2a", borderRadius: 14, padding: 20,
                borderLeft: "3px solid " + (divColor[e.division] || "#C9A84C")
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: "#F0F0F0" }}>{e.name}</div>
                    <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{e.role}</div>
                    <div style={{ fontSize: 11, color: divColor[e.division], marginTop: 6, textTransform: "uppercase", letterSpacing: 1 }}>
                      {DIVISIONS.find(d => d.value === e.division)?.label}
                    </div>
                  </div>
                  <button onClick={() => deleteEmployee(e.id)} style={{
                    background: "transparent", border: "none", color: "#444", cursor: "pointer"
                  }}><X size={16} /></button>
                </div>
                {e.email && <div style={{ fontSize: 12, color: "#555", marginTop: 10 }}>📧 {e.email}</div>}
                {e.phone && <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>📞 {e.phone}</div>}
                {e.idNumber && <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>🪪 {e.idNumber}</div>}
                {e.address && <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>📍 {e.address}</div>}
                {e.salary && <div style={{ fontSize: 14, color: "#C9A84C", marginTop: 10, fontWeight: 700 }}>
                  R {parseFloat(e.salary).toFixed(2)} / month
                </div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PAYSLIPS TAB */}
      {tab === "payslips" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            {/* Division filter */}
            <div style={{ display: "flex", gap: 8 }}>
              {["all", "print", "it", "clothing"].map(f => (
                <button key={f} onClick={() => setDivFilter(f)} style={{
                  background: divFilter === f ? "#C9A84C" : "#1A1A1A",
                  color: divFilter === f ? "#0D0D0D" : "#666",
                  border: "1px solid " + (divFilter === f ? "#C9A84C" : "#333"),
                  borderRadius: 20, padding: "7px 16px", fontSize: 12, fontWeight: 600,
                  cursor: "pointer", textTransform: "capitalize", fontFamily: "'DM Sans', sans-serif"
                }}>
                  {f === "all" ? "All Divisions" : DIVISIONS.find(d => d.value === f)?.label}
                </button>
              ))}
            </div>
            <button onClick={() => setShowSlipForm(true)} style={{
              background: "#C9A84C", color: "#0D0D0D", border: "none", borderRadius: 10,
              padding: "11px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8, fontFamily: "'DM Sans', sans-serif"
            }}><Plus size={15} /> Generate Payslip</button>
          </div>

          {filteredPayroll.length === 0 ? (
            <div style={{ color: "#444", textAlign: "center", padding: "60px 0", fontSize: 14 }}>
              No payslips yet
            </div>
          ) : (
            <div style={{ background: "#1A1A1A", border: "1px solid #2a2a2a", borderRadius: 14, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                    {["Employee", "Division", "Period", "Gross", "Deductions", "Net Pay", ""].map(h => (
                      <th key={h} style={{
                        textAlign: "left", padding: "14px 16px", color: "#555",
                        fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 1
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPayroll.map(r => (
                    <tr key={r.id} style={{ borderBottom: "1px solid #1f1f1f" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 600, color: "#F0F0F0" }}>{r.employeeName}</div>
                        <div style={{ fontSize: 11, color: "#666" }}>{r.role}</div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ color: divColor[r.division], fontSize: 12, fontWeight: 600 }}>
                          {DIVISIONS.find(d => d.value === r.division)?.label}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#ddd" }}>{r.period}</td>
                      <td style={{ padding: "12px 16px", color: "#ddd" }}>R {r.gross.toFixed(2)}</td>
                      <td style={{ padding: "12px 16px", color: "#E05252" }}>− R {r.totalDed.toFixed(2)}</td>
                      <td style={{ padding: "12px 16px", color: "#52C97A", fontWeight: 700 }}>R {r.net.toFixed(2)}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => printPayslip(r, r.taxRate, r.uifRate)} style={{
                            background: "transparent", border: "1px solid #333", borderRadius: 6,
                            color: "#888", cursor: "pointer", padding: "5px 10px", fontSize: 12,
                            display: "flex", alignItems: "center", gap: 4, fontFamily: "'DM Sans', sans-serif"
                          }}><Printer size={12} /> Print</button>
                          <button onClick={() => deletePayslip(r.id)} style={{
                            background: "transparent", border: "1px solid #E05252", borderRadius: 6,
                            color: "#E05252", cursor: "pointer", padding: "5px 10px", fontSize: 12,
                            fontFamily: "'DM Sans', sans-serif"
                          }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Employee Modal */}
      {showEmpForm && (
        <div onClick={() => setShowEmpForm(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#1A1A1A", border: "1px solid #333", borderRadius: 16,
            width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto",
            padding: 32, position: "relative"
          }}>
            <button onClick={() => setShowEmpForm(false)} style={{
              position: "absolute", top: 16, right: 16, background: "transparent",
              border: "none", color: "#666", cursor: "pointer"
            }}><X size={20} /></button>
            <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#C9A84C", marginBottom: 24 }}>Add Employee</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                ["name", "Full Name", "text"],
                ["role", "Job Title", "text"],
                ["email", "Email", "email"],
                ["phone", "Phone", "text"],
                ["idNumber", "ID Number", "text"],
                ["startDate", "Start Date", "date"],
                ["salary", "Monthly Salary (R)", "number"],
              ].map(([k, l, t]) => (
                <div key={k}>
                  <label style={lbl}>{l}</label>
                  <input value={empForm[k]} onChange={e => setEmpForm(f => ({ ...f, [k]: e.target.value }))}
                    type={t} style={inp} />
                </div>
              ))}

              <div>
                <label style={lbl}>Division</label>
                <select value={empForm.division} onChange={e => setEmpForm(f => ({ ...f, division: e.target.value }))}
                  style={{ ...inp, background: "#111" }}>
                  {DIVISIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>

              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Address</label>
                <textarea value={empForm.address} onChange={e => setEmpForm(f => ({ ...f, address: e.target.value }))}
                  rows={2} style={{ ...inp, resize: "vertical" }} />
              </div>
            </div>

            <button onClick={saveEmployee} disabled={saving} style={{
              marginTop: 24, width: "100%", background: "#C9A84C", color: "#0D0D0D",
              border: "none", borderRadius: 8, padding: "13px", fontSize: 15,
              fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif"
            }}>{saving ? "Saving..." : "Add Employee"}</button>
          </div>
        </div>
      )}

      {/* Generate Payslip Modal */}
      {showSlipForm && (
        <div onClick={() => setShowSlipForm(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#1A1A1A", border: "1px solid #333", borderRadius: 16,
            width: "100%", maxWidth: 580, maxHeight: "90vh", overflowY: "auto",
            padding: 32, position: "relative"
          }}>
            <button onClick={() => setShowSlipForm(false)} style={{
              position: "absolute", top: 16, right: 16, background: "transparent",
              border: "none", color: "#666", cursor: "pointer"
            }}><X size={20} /></button>
            <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#C9A84C", marginBottom: 24 }}>Generate Payslip</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Employee</label>
                <select value={slipForm.employeeId}
                  onChange={e => {
                    const emp = employees.find(em => em.id === e.target.value);
                    setSlipForm(f => ({
                      ...f,
                      employeeId: e.target.value,
                      basicSalary: emp?.salary || ""
                    }));
                  }}
                  style={{ ...inp, background: "#111" }}>
                  <option value="">— Select Employee —</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({DIVISIONS.find(d => d.value === e.division)?.label})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Pay Period (e.g. June 2025)</label>
                <input value={slipForm.period}
                  onChange={e => setSlipForm(f => ({ ...f, period: e.target.value }))}
                  style={inp} placeholder="e.g. June 2025" />
              </div>

              {[
                ["basicSalary", "Basic Salary (R)"],
                ["overtime", "Overtime (R)"],
                ["bonus", "Bonus / Commission (R)"],
                ["taxRate", "PAYE Tax %"],
                ["uif", "UIF %"],
                ["otherDed", "Other Deduction (R)"],
              ].map(([k, l]) => (
                <div key={k}>
                  <label style={lbl}>{l}</label>
                  <input type="number" value={slipForm[k]}
                    onChange={e => setSlipForm(f => ({ ...f, [k]: e.target.value }))}
                    style={inp} />
                </div>
              ))}

              <div>
                <label style={lbl}>Other Deduction Label</label>
                <input value={slipForm.otherDedLabel}
                  onChange={e => setSlipForm(f => ({ ...f, otherDedLabel: e.target.value }))}
                  style={inp} placeholder="e.g. Medical Aid" />
              </div>
            </div>

            {/* Live Preview */}
            <div style={{
              background: "#111", borderRadius: 10, padding: 20,
              marginTop: 20, border: "1px solid #2a2a2a"
            }}>
              <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                Live Preview
              </div>
              {[
                ["Basic Salary", basic, "#ddd"],
                ["Overtime", overtime, "#ddd"],
                ["Bonus", bonus, "#ddd"],
                ["Gross Pay", gross, "#F0F0F0"],
                ["PAYE Tax", tax, "#E05252"],
                ["UIF", uif, "#E05252"],
                ["Other Deductions", otherDed, "#E05252"],
                ["Total Deductions", totalDed, "#E05252"],
              ].filter(([, v]) => v > 0).map(([l, v, c]) => (
                <div key={l} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "7px 0", borderBottom: "1px solid #1a1a1a"
                }}>
                  <span style={{ color: "#666", fontSize: 13 }}>{l}</span>
                  <span style={{ color: c, fontWeight: 500, fontSize: 13 }}>R {v.toFixed(2)}</span>
                </div>
              ))}
              <div style={{
                display: "flex", justifyContent: "space-between",
                padding: "12px 0 0", marginTop: 4
              }}>
                <span style={{ color: "#aaa", fontSize: 14, fontWeight: 700 }}>NET PAY</span>
                <span style={{ color: "#52C97A", fontWeight: 700, fontSize: 20 }}>R {net.toFixed(2)}</span>
              </div>
            </div>

            <button onClick={savePayslip} disabled={saving} style={{
              marginTop: 24, width: "100%", background: "#C9A84C", color: "#0D0D0D",
              border: "none", borderRadius: 8, padding: "13px", fontSize: 15,
              fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif"
            }}>{saving ? "Saving..." : "Save Payslip"}</button>
          </div>
        </div>
      )}
    </div>
  );
}