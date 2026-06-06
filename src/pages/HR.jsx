import { useEffect, useState } from "react";
import {
  collection, addDoc, deleteDoc,
  doc, onSnapshot, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import { Plus, X, Printer, Download } from "lucide-react";

const DIVISIONS = [
  { value: "print",    label: "Print / DTF / Vinyl" },
  { value: "it",       label: "IT Company" },
  { value: "clothing", label: "Clothing Brand" },
];

const ROLE_RATE_SUGGESTIONS = {
  "Screen Printer": 45, "DTF Operator": 50, "Vinyl Cutter": 40, "Production Manager": 80,
  "Designer": 75, "Driver / Delivery": 35, "IT Technician": 120, "Developer": 200,
  "Sales Rep": 60, "Admin": 50, "Seamstress": 38, "Cutter": 35, "Quality Control": 45,
};

const PAY_TYPES = [
  { value: "monthly", label: "Monthly Salary" },
  { value: "hourly",  label: "Hourly Rate" },
];

const emptyEmp = {
  name: "", role: "", division: "print", email: "", phone: "",
  startDate: "", payType: "monthly", salary: "", hourlyRate: "",
  idNumber: "", address: ""
};

const emptySlip = {
  employeeId: "", period: "", basicSalary: "", hoursWorked: "",
  overtime: "", overtimeHours: "", bonus: "",
  taxRate: "25", uif: "1", otherDed: "", otherDedLabel: ""
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

function buildPayslipHTML(record, taxRate, uifRate) {
  const divLabel = DIVISIONS.find(d => d.value === record.division)?.label || record.division;
  const isHourly = record.payType === "hourly";
  return `<!DOCTYPE html><html><head><title>Payslip — ${record.employeeName}</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;background:#F7F6F2;padding:40px;color:#1C1917}.wrap{background:#fff;border-radius:16px;max-width:680px;margin:0 auto;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1)}.header{background:#1B6B4A;padding:32px 36px;color:#fff}.header h1{font-family:'DM Serif Display',serif;font-size:26px;margin-bottom:4px}.header p{font-size:13px;opacity:0.75}.body{padding:32px 36px}.emp-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px;padding-bottom:24px;border-bottom:1px solid #E8E5DF}.emp-field label{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#A8A29E;display:block;margin-bottom:3px}.emp-field span{font-size:14px;color:#1C1917;font-weight:500}.section-title{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#A8A29E;margin-bottom:12px}table{width:100%;border-collapse:collapse;margin-bottom:24px}td{padding:9px 0;border-bottom:1px solid #F0EDE8;font-size:14px;color:#6B6560}td:last-child{text-align:right;color:#1C1917;font-weight:500}.deduction td{color:#B91C1C}.deduction td:last-child{color:#B91C1C}.gross-row td{font-weight:700;color:#1C1917;font-size:15px;border-bottom:2px solid #E8E5DF;padding-bottom:14px}.net-row{background:#1B6B4A;border-radius:10px;padding:20px 24px;display:flex;justify-content:space-between;align-items:center;margin-top:8px}.net-row .net-label{color:rgba(255,255,255,0.8);font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase}.net-row .net-val{color:#fff;font-size:26px;font-weight:700;font-family:'DM Serif Display',serif}.footer{padding:20px 36px;background:#F7F6F2;border-top:1px solid #E8E5DF;font-size:11px;color:#A8A29E;text-align:center}.action-btns{display:flex;gap:12px;justify-content:center;margin:24px auto 0}.action-btn{padding:10px 28px;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:600}.btn-print{background:#1B6B4A;color:#fff}.btn-download{background:#C9A84C;color:#1C1917}@media print{body{padding:0;background:#fff}.wrap{box-shadow:none;border-radius:0}.action-btns{display:none}}</style></head><body>
  <div class="wrap"><div class="header"><h1>R&amp;R Agencies</h1><p>Payslip · ${divLabel}</p></div>
  <div class="body"><div class="emp-row">
    <div class="emp-field"><label>Employee</label><span>${record.employeeName}</span></div>
    <div class="emp-field"><label>Job Title</label><span>${record.role || "—"}</span></div>
    <div class="emp-field"><label>Division</label><span>${divLabel}</span></div>
    <div class="emp-field"><label>Pay Period</label><span>${record.period}</span></div>
    <div class="emp-field"><label>Pay Type</label><span>${isHourly ? "Hourly" : "Monthly"}</span></div>
    ${isHourly ? `<div class="emp-field"><label>Hours Worked</label><span>${record.hoursWorked || "—"} hrs</span></div>` : ""}
  </div>
  <div class="section-title">Earnings</div>
  <table>${isHourly ? `<tr><td>Hourly Rate</td><td>R ${(record.hourlyRate || 0).toFixed(2)} / hr</td></tr><tr><td>Regular Hours (${record.hoursWorked || 0} hrs)</td><td>R ${record.basic.toFixed(2)}</td></tr>` : `<tr><td>Basic Salary</td><td>R ${record.basic.toFixed(2)}</td></tr>`}
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
  <div class="net-row"><span class="net-label">Net Pay</span><span class="net-val">R ${record.net.toFixed(2)}</span></div>
  </div><div class="footer">Generated by R&amp;R Agencies Admin Dashboard · ${new Date().toLocaleDateString("en-ZA")}</div></div>
  <div class="action-btns"><button class="action-btn btn-print" onclick="window.print()">🖨 Print</button></div>
  </body></html>`;
}

function printPayslip(record)    { const win = window.open("", "_blank"); win.document.write(buildPayslipHTML(record, record.taxRate, record.uifRate)); win.document.close(); }
function downloadPayslip(record) {
  const html = buildPayslipHTML(record, record.taxRate, record.uifRate);
  const blob = new Blob([html], { type: "text/html" }); const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `Payslip_${record.employeeName.replace(/\s+/g, "_")}_${record.period.replace(/\s+/g, "_")}.html`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

export default function HR() {
  const [tab, setTab]           = useState("employees");
  const [employees, setEmployees] = useState([]);
  const [payroll, setPayroll]   = useState([]);
  const [showEmpForm, setShowEmpForm]   = useState(false);
  const [showSlipForm, setShowSlipForm] = useState(false);
  const [empForm, setEmpForm]   = useState(emptyEmp);
  const [slipForm, setSlipForm] = useState(emptySlip);
  const [divFilter, setDivFilter] = useState("all");
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, "employees"), snap => setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(collection(db, "payroll"),   snap => setPayroll(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); };
  }, []);

  const selectedEmp = employees.find(e => e.id === slipForm.employeeId);
  const isHourly    = selectedEmp?.payType === "hourly";
  const hourlyRate  = parseFloat(selectedEmp?.hourlyRate) || 0;
  const hoursWorked = parseFloat(slipForm.hoursWorked) || 0;
  const overtimeHours = parseFloat(slipForm.overtimeHours) || 0;
  const basic    = isHourly ? hoursWorked * hourlyRate : (parseFloat(slipForm.basicSalary) || 0);
  const overtime = isHourly ? overtimeHours * hourlyRate * 1.5 : (parseFloat(slipForm.overtime) || 0);
  const bonus    = parseFloat(slipForm.bonus) || 0;
  const gross    = basic + overtime + bonus;
  const tax      = gross * ((parseFloat(slipForm.taxRate) || 0) / 100);
  const uif      = gross * ((parseFloat(slipForm.uif) || 0) / 100);
  const otherDed = parseFloat(slipForm.otherDed) || 0;
  const totalDed = tax + uif + otherDed;
  const net      = gross - totalDed;

  function handleEmployeeSelect(empId) {
    const emp = employees.find(e => e.id === empId);
    if (!emp) { setSlipForm(f => ({ ...f, employeeId: empId })); return; }
    setSlipForm(f => ({ ...f, employeeId: empId, basicSalary: emp.payType === "monthly" ? (emp.salary || "") : "", hoursWorked: "", overtimeHours: "" }));
  }

  function handleRoleChange(role) {
    const suggested = ROLE_RATE_SUGGESTIONS[role];
    setEmpForm(f => ({ ...f, role, hourlyRate: suggested && f.payType === "hourly" ? String(suggested) : f.hourlyRate }));
  }

  async function saveEmployee() {
    if (!empForm.name) return alert("Name is required.");
    if (empForm.payType === "monthly" && !empForm.salary) return alert("Monthly salary is required.");
    if (empForm.payType === "hourly" && !empForm.hourlyRate) return alert("Hourly rate is required.");
    setSaving(true);
    await addDoc(collection(db, "employees"), { ...empForm, createdAt: serverTimestamp() });
    setSaving(false); setShowEmpForm(false); setEmpForm(emptyEmp);
  }

  async function deleteEmployee(id) { if (!confirm("Remove this employee?")) return; await deleteDoc(doc(db, "employees", id)); }

  async function savePayslip() {
    if (!selectedEmp) return alert("Select an employee.");
    if (!slipForm.period) return alert("Pay period is required.");
    setSaving(true);
    await addDoc(collection(db, "payroll"), {
      employeeId: slipForm.employeeId, employeeName: selectedEmp.name, role: selectedEmp.role,
      division: selectedEmp.division, payType: selectedEmp.payType || "monthly",
      hourlyRate: selectedEmp.payType === "hourly" ? hourlyRate : null,
      hoursWorked: isHourly ? hoursWorked : null, overtimeHours: isHourly ? overtimeHours : null,
      period: slipForm.period, basic, overtime, bonus, gross, tax, uif, otherDed,
      otherDedLabel: slipForm.otherDedLabel, taxRate: slipForm.taxRate, uifRate: slipForm.uif,
      totalDed, net, createdAt: serverTimestamp()
    });
    setSaving(false); setShowSlipForm(false); setSlipForm(emptySlip);
  }

  async function deletePayslip(id) { if (!confirm("Delete this payslip record?")) return; await deleteDoc(doc(db, "payroll", id)); }

  const divColor = { print: "#C9A84C", it: "#52A9E0", clothing: "#9B7DE8" };
  const filteredPayroll = divFilter === "all" ? payroll : payroll.filter(p => p.division === divFilter);

  return (
    <div>
      <style>{`
        @media (max-width: 768px) {
          .hr-modal-inner { padding: 18px 14px !important; max-height: 95vh !important; }
          .hr-form-grid { grid-template-columns: 1fr !important; }
          .hr-payroll-table-wrap { overflow-x: auto; }
          .hr-payroll-table { min-width: 600px; }
          .hr-emp-grid { grid-template-columns: 1fr !important; }
          .hr-payroll-header { flex-direction: column !important; gap: 10px !important; }
          .hr-payroll-filters { flex-wrap: wrap !important; }
        }
      `}</style>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: "#C9A84C", margin: 0 }}>HR & Payroll</h1>
        <p style={{ color: "#555", marginTop: 4, fontSize: 13 }}>{employees.length} employees · {payroll.length} payslips issued</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#1A1A1A", borderRadius: 10, padding: 4, width: "fit-content", border: "1px solid #2a2a2a" }}>
        {["employees", "payslips"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "9px 20px", borderRadius: 7, border: "none", background: tab === t ? "#C9A84C" : "transparent", color: tab === t ? "#0D0D0D" : "#666", fontWeight: tab === t ? 700 : 400, fontSize: 14, cursor: "pointer", textTransform: "capitalize", fontFamily: "'DM Sans', sans-serif" }}>{t}</button>
        ))}
      </div>

      {/* EMPLOYEES TAB */}
      {tab === "employees" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
            <button onClick={() => setShowEmpForm(true)} style={{ background: "#C9A84C", color: "#0D0D0D", border: "none", borderRadius: 10, padding: "11px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, fontFamily: "'DM Sans', sans-serif" }}><Plus size={14} /> Add Employee</button>
          </div>
          <div className="hr-emp-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {employees.length === 0 ? (
              <div style={{ color: "#444", textAlign: "center", padding: "60px 0", fontSize: 14 }}>No employees yet</div>
            ) : employees.map(e => (
              <div key={e.id} style={{ background: "#1A1A1A", border: "1px solid #2a2a2a", borderRadius: 14, padding: 18, borderLeft: "3px solid " + (divColor[e.division] || "#C9A84C") }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#F0F0F0" }}>{e.name}</div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{e.role}</div>
                    <div style={{ fontSize: 11, color: divColor[e.division], marginTop: 5, textTransform: "uppercase", letterSpacing: 1 }}>{DIVISIONS.find(d => d.value === e.division)?.label}</div>
                  </div>
                  <button onClick={() => deleteEmployee(e.id)} style={{ background: "transparent", border: "none", color: "#444", cursor: "pointer" }}><X size={15} /></button>
                </div>
                {e.email   && <div style={{ fontSize: 12, color: "#555", marginTop: 8 }}>📧 {e.email}</div>}
                {e.phone   && <div style={{ fontSize: 12, color: "#555", marginTop: 3 }}>📞 {e.phone}</div>}
                {e.idNumber && <div style={{ fontSize: 12, color: "#555", marginTop: 3 }}>🪪 {e.idNumber}</div>}
                <div style={{ marginTop: 8 }}>
                  {e.payType === "hourly"
                    ? <><span style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 1 }}>Hourly Rate</span><div style={{ fontSize: 14, color: "#C9A84C", fontWeight: 700 }}>R {parseFloat(e.hourlyRate || 0).toFixed(2)} / hr</div></>
                    : <><span style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 1 }}>Monthly Salary</span><div style={{ fontSize: 14, color: "#C9A84C", fontWeight: 700 }}>R {parseFloat(e.salary || 0).toFixed(2)} / month</div></>
                  }
                </div>
                <div style={{ marginTop: 6, display: "inline-block", background: e.payType === "hourly" ? "rgba(82,169,224,0.15)" : "rgba(201,168,76,0.15)", color: e.payType === "hourly" ? "#52A9E0" : "#C9A84C", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, textTransform: "uppercase", letterSpacing: 1 }}>
                  {e.payType === "hourly" ? "⏱ Hourly" : "📅 Monthly"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PAYSLIPS TAB */}
      {tab === "payslips" && (
        <div>
          <div className="hr-payroll-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 12 }}>
            <div className="hr-payroll-filters" style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {["all", "print", "it", "clothing"].map(f => (
                <button key={f} onClick={() => setDivFilter(f)} style={{ background: divFilter === f ? "#C9A84C" : "#1A1A1A", color: divFilter === f ? "#0D0D0D" : "#666", border: "1px solid " + (divFilter === f ? "#C9A84C" : "#333"), borderRadius: 20, padding: "7px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>
                  {f === "all" ? "All Divisions" : DIVISIONS.find(d => d.value === f)?.label}
                </button>
              ))}
            </div>
            <button onClick={() => setShowSlipForm(true)} style={{ background: "#C9A84C", color: "#0D0D0D", border: "none", borderRadius: 10, padding: "11px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}><Plus size={14} /> Generate Payslip</button>
          </div>

          {filteredPayroll.length === 0 ? (
            <div style={{ color: "#444", textAlign: "center", padding: "60px 0", fontSize: 14 }}>No payslips yet</div>
          ) : (
            <div style={{ background: "#1A1A1A", border: "1px solid #2a2a2a", borderRadius: 14, overflow: "hidden" }}>
              <div className="hr-payroll-table-wrap">
                <table className="hr-payroll-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                      {["Employee", "Pay Type", "Division", "Period", "Gross", "Deductions", "Net Pay", ""].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "12px 14px", color: "#555", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayroll.map(r => (
                      <tr key={r.id} style={{ borderBottom: "1px solid #1f1f1f" }}>
                        <td style={{ padding: "11px 14px" }}><div style={{ fontWeight: 600, color: "#F0F0F0" }}>{r.employeeName}</div><div style={{ fontSize: 11, color: "#666" }}>{r.role}</div></td>
                        <td style={{ padding: "11px 14px" }}><span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: r.payType === "hourly" ? "rgba(82,169,224,0.15)" : "rgba(201,168,76,0.15)", color: r.payType === "hourly" ? "#52A9E0" : "#C9A84C", textTransform: "uppercase", letterSpacing: 1 }}>{r.payType === "hourly" ? `⏱ ${r.hoursWorked}h` : "📅 Monthly"}</span></td>
                        <td style={{ padding: "11px 14px" }}><span style={{ color: divColor[r.division], fontSize: 12, fontWeight: 600 }}>{DIVISIONS.find(d => d.value === r.division)?.label}</span></td>
                        <td style={{ padding: "11px 14px", color: "#ddd" }}>{r.period}</td>
                        <td style={{ padding: "11px 14px", color: "#ddd" }}>R {r.gross.toFixed(2)}</td>
                        <td style={{ padding: "11px 14px", color: "#E05252" }}>− R {r.totalDed.toFixed(2)}</td>
                        <td style={{ padding: "11px 14px", color: "#52C97A", fontWeight: 700 }}>R {r.net.toFixed(2)}</td>
                        <td style={{ padding: "11px 14px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => printPayslip(r)} style={{ background: "transparent", border: "1px solid #333", borderRadius: 6, color: "#888", cursor: "pointer", padding: "5px 9px", fontSize: 12, display: "flex", alignItems: "center", gap: 4, fontFamily: "'DM Sans', sans-serif" }}><Printer size={11} /> Print</button>
                            <button onClick={() => downloadPayslip(r)} style={{ background: "transparent", border: "1px solid #C9A84C", borderRadius: 6, color: "#C9A84C", cursor: "pointer", padding: "5px 9px", fontSize: 12, display: "flex", alignItems: "center", gap: 4, fontFamily: "'DM Sans', sans-serif" }}><Download size={11} /></button>
                            <button onClick={() => deletePayslip(r.id)} style={{ background: "transparent", border: "1px solid #E05252", borderRadius: 6, color: "#E05252", cursor: "pointer", padding: "5px 8px", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>Del</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Employee Modal */}
      {showEmpForm && (
        <div onClick={() => setShowEmpForm(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
          <div className="hr-modal-inner" onClick={e => e.stopPropagation()} style={{ background: "#1A1A1A", border: "1px solid #333", borderRadius: 16, width: "100%", maxWidth: 580, maxHeight: "90vh", overflowY: "auto", padding: 28, position: "relative" }}>
            <button onClick={() => setShowEmpForm(false)} style={{ position: "absolute", top: 14, right: 14, background: "transparent", border: "none", color: "#666", cursor: "pointer" }}><X size={20} /></button>
            <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#C9A84C", marginBottom: 20 }}>Add Employee</h2>

            <div className="hr-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Pay Type</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {PAY_TYPES.map(pt => (
                    <button key={pt.value} onClick={() => setEmpForm(f => ({ ...f, payType: pt.value }))} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid", borderColor: empForm.payType === pt.value ? "#C9A84C" : "#333", background: empForm.payType === pt.value ? "rgba(201,168,76,0.12)" : "transparent", color: empForm.payType === pt.value ? "#C9A84C" : "#555", fontWeight: empForm.payType === pt.value ? 700 : 400, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{pt.label}</button>
                  ))}
                </div>
              </div>
              <div><label style={lbl}>Full Name</label><input value={empForm.name} onChange={e => setEmpForm(f => ({ ...f, name: e.target.value }))} style={inp} /></div>
              <div>
                <label style={lbl}>Job Title</label>
                <input value={empForm.role} onChange={e => handleRoleChange(e.target.value)} list="role-suggestions" style={inp} placeholder="e.g. DTF Operator" />
                <datalist id="role-suggestions">{Object.keys(ROLE_RATE_SUGGESTIONS).map(r => <option key={r} value={r} />)}</datalist>
                {empForm.payType === "hourly" && ROLE_RATE_SUGGESTIONS[empForm.role] && <div style={{ fontSize: 11, color: "#52A9E0", marginTop: 3 }}>💡 Suggested: R {ROLE_RATE_SUGGESTIONS[empForm.role]}/hr</div>}
              </div>
              {empForm.payType === "monthly"
                ? <div><label style={lbl}>Monthly Salary (R)</label><input type="number" value={empForm.salary} onChange={e => setEmpForm(f => ({ ...f, salary: e.target.value }))} style={inp} /></div>
                : <div><label style={lbl}>Hourly Rate (R)</label><input type="number" value={empForm.hourlyRate} onChange={e => setEmpForm(f => ({ ...f, hourlyRate: e.target.value }))} style={inp} /></div>
              }
              <div><label style={lbl}>Division</label><select value={empForm.division} onChange={e => setEmpForm(f => ({ ...f, division: e.target.value }))} style={{ ...inp, background: "#111" }}>{DIVISIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}</select></div>
              {[["email","Email","email"],["phone","Phone","text"],["idNumber","ID Number","text"],["startDate","Start Date","date"]].map(([k, l, t]) => <div key={k}><label style={lbl}>{l}</label><input value={empForm[k]} onChange={e => setEmpForm(f => ({ ...f, [k]: e.target.value }))} type={t} style={inp} /></div>)}
              <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Address</label><textarea value={empForm.address} onChange={e => setEmpForm(f => ({ ...f, address: e.target.value }))} rows={2} style={{ ...inp, resize: "vertical" }} /></div>
            </div>
            <button onClick={saveEmployee} disabled={saving} style={{ marginTop: 20, width: "100%", background: "#C9A84C", color: "#0D0D0D", border: "none", borderRadius: 8, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{saving ? "Saving..." : "Add Employee"}</button>
          </div>
        </div>
      )}

      {/* Generate Payslip Modal */}
      {showSlipForm && (
        <div onClick={() => setShowSlipForm(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
          <div className="hr-modal-inner" onClick={e => e.stopPropagation()} style={{ background: "#1A1A1A", border: "1px solid #333", borderRadius: 16, width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", padding: 28, position: "relative" }}>
            <button onClick={() => setShowSlipForm(false)} style={{ position: "absolute", top: 14, right: 14, background: "transparent", border: "none", color: "#666", cursor: "pointer" }}><X size={20} /></button>
            <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#C9A84C", marginBottom: 20 }}>Generate Payslip</h2>

            <div className="hr-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Employee</label>
                <select value={slipForm.employeeId} onChange={e => handleEmployeeSelect(e.target.value)} style={{ ...inp, background: "#111" }}>
                  <option value="">— Select Employee —</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name} — {e.payType === "hourly" ? `R${e.hourlyRate}/hr` : `R${e.salary}/month`} ({DIVISIONS.find(d => d.value === e.division)?.label})</option>)}
                </select>
              </div>
              {selectedEmp && (
                <div style={{ gridColumn: "1/-1", background: isHourly ? "rgba(82,169,224,0.08)" : "rgba(201,168,76,0.08)", border: `1px solid ${isHourly ? "rgba(82,169,224,0.25)" : "rgba(201,168,76,0.25)"}`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: isHourly ? "#52A9E0" : "#C9A84C" }}>
                  {isHourly ? `⏱ Hourly employee — Rate: R ${hourlyRate}/hr. Enter hours worked below.` : `📅 Monthly employee — Base salary: R ${selectedEmp.salary}.`}
                </div>
              )}
              <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Pay Period (e.g. June 2025)</label><input value={slipForm.period} onChange={e => setSlipForm(f => ({ ...f, period: e.target.value }))} style={inp} placeholder="e.g. June 2025" /></div>
              {isHourly ? (
                <>
                  <div><label style={lbl}>Regular Hours Worked</label><input type="number" value={slipForm.hoursWorked} onChange={e => setSlipForm(f => ({ ...f, hoursWorked: e.target.value }))} style={inp} />{hoursWorked > 0 && <div style={{ fontSize: 11, color: "#52A9E0", marginTop: 3 }}>= R {(hoursWorked * hourlyRate).toFixed(2)} basic</div>}</div>
                  <div><label style={lbl}>Overtime Hours (1.5×)</label><input type="number" value={slipForm.overtimeHours} onChange={e => setSlipForm(f => ({ ...f, overtimeHours: e.target.value }))} style={inp} /></div>
                </>
              ) : (
                <>
                  <div><label style={lbl}>Basic Salary (R)</label><input type="number" value={slipForm.basicSalary} onChange={e => setSlipForm(f => ({ ...f, basicSalary: e.target.value }))} style={inp} /></div>
                  <div><label style={lbl}>Overtime (R)</label><input type="number" value={slipForm.overtime} onChange={e => setSlipForm(f => ({ ...f, overtime: e.target.value }))} style={inp} /></div>
                </>
              )}
              {[["bonus","Bonus / Commission (R)"],["taxRate","PAYE Tax %"],["uif","UIF %"],["otherDed","Other Deduction (R)"]].map(([k, l]) => <div key={k}><label style={lbl}>{l}</label><input type="number" value={slipForm[k]} onChange={e => setSlipForm(f => ({ ...f, [k]: e.target.value }))} style={inp} /></div>)}
              <div><label style={lbl}>Other Deduction Label</label><input value={slipForm.otherDedLabel} onChange={e => setSlipForm(f => ({ ...f, otherDedLabel: e.target.value }))} style={inp} placeholder="e.g. Medical Aid" /></div>
            </div>

            <div style={{ background: "#111", borderRadius: 10, padding: 18, marginTop: 18, border: "1px solid #2a2a2a" }}>
              <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Live Preview</div>
              {[["Basic Pay", basic, "#ddd"], ["Overtime", overtime, "#ddd"], ["Bonus", bonus, "#ddd"], ["Gross Pay", gross, "#F0F0F0"], ["PAYE Tax", tax, "#E05252"], ["UIF", uif, "#E05252"], ["Other Deductions", otherDed, "#E05252"], ["Total Deductions", totalDed, "#E05252"]].filter(([, v]) => v > 0).map(([l, v, c]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1a1a1a" }}>
                  <span style={{ color: "#666", fontSize: 13 }}>{l}</span>
                  <span style={{ color: c, fontWeight: 500, fontSize: 13 }}>R {v.toFixed(2)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", marginTop: 4 }}>
                <span style={{ color: "#aaa", fontSize: 14, fontWeight: 700 }}>NET PAY</span>
                <span style={{ color: "#52C97A", fontWeight: 700, fontSize: 20 }}>R {net.toFixed(2)}</span>
              </div>
            </div>

            <button onClick={savePayslip} disabled={saving} style={{ marginTop: 20, width: "100%", background: "#C9A84C", color: "#0D0D0D", border: "none", borderRadius: 8, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{saving ? "Saving..." : "Save Payslip"}</button>
          </div>
        </div>
      )}
    </div>
  );
}