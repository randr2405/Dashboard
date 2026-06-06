import { useEffect, useState } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { Plus, X, Printer, Download, Pencil } from "lucide-react";

const DIVISIONS = [
  { value: "print",    label: "Print / DTF / Vinyl" },
  { value: "it",       label: "IT Company" },
  { value: "clothing", label: "Clothing Brand" },
];

const CONTRACT_TYPES = [
  { value: "permanent",  label: "Permanent Employment" },
  { value: "fixedterm",  label: "Fixed-Term Contract" },
  { value: "parttime",   label: "Part-Time Employment" },
  { value: "freelance",  label: "Freelance / Independent Contractor" },
];

const empty = {
  employeeId: "", employeeName: "", idNumber: "", address: "",
  role: "", division: "print", contractType: "permanent",
  startDate: "", endDate: "", payType: "monthly",
  salary: "", hourlyRate: "", hoursPerWeek: "40",
  leaveDays: "15", noticePeriod: "1 month", probation: "3 months",
  duties: "", specialClauses: "", bankName: "", bankAccount: "", bankBranch: "",
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

function buildContractHTML(c, forDownload = false) {
  const divLabel      = DIVISIONS.find(d => d.value === c.division)?.label || c.division;
  const contractLabel = CONTRACT_TYPES.find(t => t.value === c.contractType)?.label || c.contractType;
  const today         = new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
  const isHourly      = c.payType === "hourly";
  const payDisplay    = isHourly
    ? `R ${parseFloat(c.hourlyRate || 0).toFixed(2)} per hour`
    : `R ${parseFloat(c.salary || 0).toFixed(2)} per month`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Employment Contract — ${c.employeeName}</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@400;600&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'DM Sans',sans-serif;background:#F4F3EF;padding:40px 20px;color:#1C1917;line-height:1.75;font-size:14px}
    .wrap{background:#fff;max-width:800px;margin:0 auto;box-shadow:0 4px 32px rgba(0,0,0,0.12)}
    /* Header */
    .header{background:#1B1B1B;padding:40px 48px;color:#fff;display:flex;justify-content:space-between;align-items:flex-start}
    .header-left h1{font-family:'Playfair Display',serif;font-size:26px;color:#C9A84C;margin-bottom:4px;letter-spacing:.5px}
    .header-left p{font-size:12px;color:#666;margin-bottom:2px}
    .header-left .reg{font-size:11px;color:#444;margin-top:6px}
    .header-right{text-align:right}
    .header-right .doc-title{font-size:13px;color:#888;text-transform:uppercase;letter-spacing:2px}
    .header-right .doc-date{font-size:13px;color:#C9A84C;font-weight:600;margin-top:6px}
    .badge{display:inline-block;background:#C9A84C22;border:1px solid #C9A84C55;color:#C9A84C;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.08em;margin-top:10px}
    /* Body */
    .body{padding:44px 48px}
    .doc-heading{font-family:'Playfair Display',serif;font-size:24px;color:#1B1B1B;margin-bottom:6px}
    .doc-intro{font-size:13px;color:#888;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #F0EDE6}
    /* Parties box */
    .parties-box{background:#F7F6F2;border:1px solid #E8E5DF;border-radius:10px;padding:24px 28px;margin-bottom:32px}
    .parties-box h3{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#A8A29E;margin-bottom:16px}
    .parties-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .party-item label{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#A8A29E;display:block;margin-bottom:3px}
    .party-item span{font-size:14px;color:#1C1917;font-weight:500}
    /* Sections */
    .section{margin-bottom:28px}
    .section-title{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#fff;background:#1B1B1B;padding:8px 16px;border-radius:4px;margin-bottom:16px;display:inline-block}
    .section p{color:#44403C;margin-bottom:10px;text-align:justify}
    .section ul{padding-left:20px;color:#44403C;margin-bottom:10px}
    .section ul li{margin-bottom:6px}
    /* Terms grid */
    .terms-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
    .term-box{background:#F7F6F2;border:1px solid #E8E5DF;border-radius:8px;padding:12px 16px}
    .term-box label{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#A8A29E;display:block;margin-bottom:3px}
    .term-box span{font-size:14px;color:#1C1917;font-weight:600}
    /* Highlight box */
    .highlight{background:#1B1B1B;border-radius:10px;padding:18px 24px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between}
    .highlight .pay-label{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px}
    .highlight .pay-value{font-size:22px;font-weight:700;color:#C9A84C;margin-top:2px}
    .highlight .pay-type{font-size:12px;color:#555;margin-top:4px}
    /* Numbered clauses */
    .clause{margin-bottom:18px;padding-left:0}
    .clause-num{font-weight:700;color:#1B1B1B;margin-right:8px}
    /* Signatures */
    .sig-section{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:48px;padding-top:32px;border-top:2px solid #F0EDE6}
    .sig-box .sig-label{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#A8A29E;margin-bottom:40px;display:block}
    .sig-line{border-top:1.5px solid #1C1917;padding-top:8px}
    .sig-line .sig-name{font-size:13px;color:#1C1917;font-weight:600}
    .sig-line .sig-sub{font-size:11px;color:#A8A29E;margin-top:2px}
    .sig-date{margin-top:20px}
    .sig-date .sig-label2{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#A8A29E;display:block;margin-bottom:6px}
    .sig-date .date-line{border-top:1px solid #ccc;width:160px;padding-top:6px;font-size:11px;color:#A8A29E}
    /* Footer */
    .footer{background:#F7F6F2;border-top:1px solid #E8E5DF;padding:16px 48px;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#A8A29E}
    /* Buttons */
    .btn-bar{display:flex;gap:12px;margin:28px auto 0;max-width:800px;justify-content:center}
    .btn{padding:11px 28px;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:600;display:flex;align-items:center;gap:8px}
    .btn-print{background:#1B1B1B;color:#C9A84C}
    .btn-dl{background:#C9A84C;color:#1B1B1B}
    @media print{
      body{padding:0;background:#fff}
      .wrap{box-shadow:none}
      .btn-bar{display:none}
    }
  </style>
</head>
<body>
<div class="wrap">
  <!-- HEADER -->
  <div class="header">
    <div class="header-left">
      <h1>R&amp;R Agencies</h1>
      <p>${divLabel}</p>
      <p class="reg">R AND R Agencies (Pty) Ltd</p>
      <div class="badge">${contractLabel}</div>
    </div>
    <div class="header-right">
      <div class="doc-title">Employment Contract</div>
      <div class="doc-date">${today}</div>
    </div>
  </div>

  <!-- BODY -->
  <div class="body">
    <div class="doc-heading">Contract of Employment</div>
    <p class="doc-intro">
      This Contract of Employment ("Agreement") is entered into between <strong>R AND R Agencies (Pty) Ltd</strong>
      ("the Employer") and the employee identified below ("the Employee"), and sets out the terms and conditions
      of employment agreed upon by both parties.
    </p>

    <!-- PARTIES -->
    <div class="parties-box">
      <h3>Parties to this Agreement</h3>
      <div class="parties-grid">
        <div class="party-item"><label>Employer</label><span>R AND R Agencies (Pty) Ltd</span></div>
        <div class="party-item"><label>Division</label><span>${divLabel}</span></div>
        <div class="party-item"><label>Employee Full Name</label><span>${c.employeeName || "—"}</span></div>
        <div class="party-item"><label>Identity Number</label><span>${c.idNumber || "—"}</span></div>
        <div class="party-item" style="grid-column:1/-1"><label>Residential Address</label><span>${c.address || "—"}</span></div>
      </div>
    </div>

    <!-- REMUNERATION HIGHLIGHT -->
    <div class="highlight">
      <div>
        <div class="pay-label">Agreed Remuneration</div>
        <div class="pay-value">${payDisplay}</div>
        <div class="pay-type">${isHourly ? `${c.hoursPerWeek || 40} hours per week · Paid monthly based on hours worked` : "Fixed monthly salary · Paid by last working day of each month"}</div>
      </div>
      <div style="text-align:right">
        <div class="pay-label">Contract Type</div>
        <div style="font-size:15px;font-weight:700;color:#fff;margin-top:4px">${contractLabel}</div>
      </div>
    </div>

    <!-- SECTION 1: APPOINTMENT -->
    <div class="section">
      <div class="section-title">1. Appointment &amp; Commencement</div>
      <div class="terms-grid">
        <div class="term-box"><label>Job Title</label><span>${c.role || "—"}</span></div>
        <div class="term-box"><label>Contract Type</label><span>${contractLabel}</span></div>
        <div class="term-box"><label>Commencement Date</label><span>${c.startDate || "—"}</span></div>
        <div class="term-box"><label>End Date</label><span>${c.endDate || (c.contractType === "permanent" ? "Indefinite" : "—")}</span></div>
        <div class="term-box"><label>Hours per Week</label><span>${c.hoursPerWeek || 40} hours</span></div>
        <div class="term-box"><label>Probation Period</label><span>${c.probation || "N/A"}</span></div>
      </div>
      <p>The Employee is appointed to the position of <strong>${c.role || "[Position]"}</strong> within the <strong>${divLabel}</strong> division, reporting to the relevant line manager or director as designated from time to time.</p>
      ${c.contractType === "fixedterm" ? `<p>This is a fixed-term contract commencing on <strong>${c.startDate || "[start date]"}</strong> and terminating on <strong>${c.endDate || "[end date]"}</strong>, unless terminated earlier in accordance with the provisions of this Agreement.</p>` : ""}
      ${c.probation ? `<p>The Employee will serve a probationary period of <strong>${c.probation}</strong> from the commencement date, during which performance and suitability for the role will be assessed. Either party may terminate this Agreement during probation with one (1) week's written notice.</p>` : ""}
    </div>

    <!-- SECTION 2: REMUNERATION -->
    <div class="section">
      <div class="section-title">2. Remuneration &amp; Benefits</div>
      ${isHourly ? `
      <p>The Employee will be remunerated at a rate of <strong>R ${parseFloat(c.hourlyRate || 0).toFixed(2)} per hour</strong>, calculated based on actual hours worked. Payment will be made monthly by the last working day of each month via electronic funds transfer to the Employee's nominated bank account.</p>
      <p>Overtime worked beyond the agreed <strong>${c.hoursPerWeek || 40} hours per week</strong> will be compensated at a rate of <strong>1.5× the standard hourly rate</strong>, subject to prior written authorisation from management.</p>
      ` : `
      <p>The Employee will receive a gross monthly salary of <strong>R ${parseFloat(c.salary || 0).toFixed(2)}</strong>, payable by the last working day of each calendar month via electronic funds transfer to the Employee's nominated bank account.</p>
      <p>The salary is inclusive of all statutory deductions. Any overtime must be pre-approved in writing and will be compensated as agreed between the parties.</p>
      `}
      ${(c.bankName || c.bankAccount) ? `
      <div class="terms-grid">
        ${c.bankName ? `<div class="term-box"><label>Bank Name</label><span>${c.bankName}</span></div>` : ""}
        ${c.bankAccount ? `<div class="term-box"><label>Account Number</label><span>${c.bankAccount}</span></div>` : ""}
        ${c.bankBranch ? `<div class="term-box"><label>Branch Code</label><span>${c.bankBranch}</span></div>` : ""}
      </div>` : ""}
      <p>The Employer reserves the right to review remuneration annually, with any adjustments communicated in writing. No adjustment shall be made unilaterally to the Employee's detriment without mutual written agreement.</p>
    </div>

    <!-- SECTION 3: LEAVE -->
    <div class="section">
      <div class="section-title">3. Leave Entitlement</div>
      <div class="terms-grid">
        <div class="term-box"><label>Annual Leave</label><span>${c.leaveDays || 15} days per year</span></div>
        <div class="term-box"><label>Sick Leave</label><span>As per company policy</span></div>
        <div class="term-box"><label>Family Responsibility</label><span>3 days per year</span></div>
        <div class="term-box"><label>Public Holidays</label><span>All gazetted public holidays</span></div>
      </div>
      <p>Annual leave must be taken at a time mutually agreed upon between the Employer and Employee. Leave may not be accumulated indefinitely and must be taken within the relevant leave cycle. The Employer reserves the right to direct the Employee to take leave during operational shutdowns.</p>
      <p>Sick leave will be granted in accordance with company policy. A medical certificate may be required for absences exceeding two (2) consecutive days.</p>
    </div>

    <!-- SECTION 4: DUTIES -->
    ${c.duties ? `
    <div class="section">
      <div class="section-title">4. Duties &amp; Responsibilities</div>
      <p>The Employee is required to perform the following duties and responsibilities, as well as any other reasonable tasks assigned by management from time to time:</p>
      <ul>${c.duties.split("\n").filter(Boolean).map(d => `<li>${d.trim()}</li>`).join("")}</ul>
    </div>` : `
    <div class="section">
      <div class="section-title">4. Duties &amp; Responsibilities</div>
      <p>The Employee shall perform all duties associated with the role of <strong>${c.role || "[Position]"}</strong> and such other reasonable duties as may be assigned by the Employer from time to time. The Employee is expected to carry out all duties diligently, professionally, and to the best of their ability.</p>
    </div>`}

    <!-- SECTION 5: NOTICE & TERMINATION -->
    <div class="section">
      <div class="section-title">5. Notice Period &amp; Termination</div>
      <div class="terms-grid" style="margin-bottom:16px">
        <div class="term-box"><label>Notice Period</label><span>${c.noticePeriod || "1 month"}</span></div>
        <div class="term-box"><label>Notice Format</label><span>Written notice required</span></div>
      </div>
      <p>Either party may terminate this Agreement by giving the other party <strong>${c.noticePeriod || "1 month"}</strong> written notice. Notice must be delivered in person or via email to the relevant party's last known address or email.</p>
      <p>The Employer reserves the right to terminate this Agreement without notice in the event of serious misconduct, gross negligence, dishonesty, or any other act that renders continuation of the employment relationship intolerable.</p>
      <p>Upon termination, the Employee shall return all company property, equipment, access cards, and confidential materials immediately. The Employee's final remuneration will be calculated up to the last working day.</p>
    </div>

    <!-- SECTION 6: CONFIDENTIALITY -->
    <div class="section">
      <div class="section-title">6. Confidentiality &amp; Intellectual Property</div>
      <p>The Employee acknowledges that during the course of employment they may have access to confidential information, including but not limited to: client lists, pricing structures, business strategies, proprietary processes, and financial information belonging to R AND R Agencies (Pty) Ltd.</p>
      <p>The Employee agrees not to disclose, share, or use any such confidential information for personal gain or to the benefit of any third party, both during and after the term of this employment. This obligation survives the termination of this Agreement.</p>
      <p>Any work, inventions, designs, or intellectual property created by the Employee in the course of their duties shall remain the sole property of R AND R Agencies (Pty) Ltd.</p>
    </div>

    <!-- SECTION 7: CONDUCT -->
    <div class="section">
      <div class="section-title">7. Conduct &amp; Disciplinary</div>
      <p>The Employee agrees to abide by the Employer's workplace policies, code of conduct, and any reasonable rules or instructions issued from time to time. The Employee is expected to maintain professional conduct at all times, including in interactions with clients, suppliers, and colleagues.</p>
      <p>Disciplinary matters will be handled in accordance with the company's disciplinary procedure, which affords the Employee the right to be heard before any disciplinary action is taken, except in cases of summary dismissal for gross misconduct.</p>
    </div>

    <!-- SECTION 8: GENERAL -->
    <div class="section">
      <div class="section-title">8. General Provisions</div>
      <p>This Agreement constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior agreements, representations, or understandings, whether written or oral.</p>
      <p>No amendment or variation of this Agreement shall be of any force or effect unless it is in writing and signed by both parties.</p>
      <p>Should any provision of this Agreement be found to be invalid, unlawful, or unenforceable, such provision shall be severable from the remaining provisions which shall continue to be valid and enforceable.</p>
      <p>This Agreement shall be governed by and construed in accordance with the laws of the Republic of South Africa.</p>
    </div>

    <!-- SPECIAL CLAUSES -->
    ${c.specialClauses ? `
    <div class="section">
      <div class="section-title">9. Special Conditions</div>
      ${c.specialClauses.split("\n").filter(Boolean).map(cl => `<p>${cl.trim()}</p>`).join("")}
    </div>` : ""}

    <!-- SIGNATURES -->
    <div class="sig-section">
      <div class="sig-box">
        <span class="sig-label">For and on behalf of the Employer</span>
        <div class="sig-line">
          <div class="sig-name">R AND R Agencies (Pty) Ltd</div>
          <div class="sig-sub">Authorised Signatory</div>
        </div>
        <div class="sig-date">
          <span class="sig-label2">Date</span>
          <div class="date-line">____________________</div>
        </div>
      </div>
      <div class="sig-box">
        <span class="sig-label">Employee Acceptance</span>
        <div class="sig-line">
          <div class="sig-name">${c.employeeName || "Employee"}</div>
          <div class="sig-sub">${c.role || "Position"} · ${divLabel}</div>
        </div>
        <div class="sig-date">
          <span class="sig-label2">Date</span>
          <div class="date-line">____________________</div>
        </div>
      </div>
    </div>

    <p style="margin-top:32px;font-size:12px;color:#A8A29E;text-align:center">
      By signing above, both parties confirm they have read, understood, and agreed to the terms of this Employment Contract.
    </p>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <span>R AND R Agencies (Pty) Ltd · Employment Contract</span>
    <span>${c.employeeName} · ${c.role}</span>
    <span>Generated ${today} · Confidential</span>
  </div>
</div>

${forDownload ? "" : `
<div class="btn-bar">
  <button class="btn btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
  <button class="btn btn-dl" onclick="downloadContract()">⬇️ Download HTML</button>
</div>
<script>
function downloadContract() {
  const html = document.documentElement.outerHTML;
  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'Contract_${(c.employeeName || "Employee").replace(/\s+/g, "_")}_${today.replace(/\s+/g, "_")}.html';
  a.click();
  URL.revokeObjectURL(url);
}
<\/script>`}
</body>
</html>`;
}

function openContract(c) {
  const win = window.open("", "_blank");
  win.document.write(buildContractHTML(c, false));
  win.document.close();
}

function downloadContract(c) {
  const html  = buildContractHTML(c, true);
  const blob  = new Blob([html], { type: "text/html" });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement("a");
  const today = new Date().toISOString().slice(0, 10);
  a.href      = url;
  a.download  = `Contract_${(c.employeeName || "Employee").replace(/\s+/g, "_")}_${today}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving]       = useState(false);

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
    try {
      if (editingId) {
        await updateDoc(doc(db, "contracts", editingId), { ...form });
      } else {
        await addDoc(collection(db, "contracts"), { ...form, createdAt: serverTimestamp() });
      }
      setShowForm(false);
      setForm(empty);
      setEditingId(null);
    } catch (err) {
      alert("Failed to save: " + err.message);
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm("Delete this contract record?")) return;
    await deleteDoc(doc(db, "contracts", id));
  }

  function openEdit(c) {
    setForm({ ...empty, ...c });
    setEditingId(c.id);
    setShowForm(true);
  }

  const divColor = { print: "#C9A84C", it: "#52A9E0", clothing: "#9B7DE8" };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, color: "#C9A84C", margin: 0 }}>
            Contracts
          </h1>
          <p style={{ color: "#555", marginTop: 6, fontSize: 14 }}>
            {contracts.length} employment contract{contracts.length !== 1 ? "s" : ""} on record
          </p>
        </div>
        <button onClick={() => { setForm(empty); setEditingId(null); setShowForm(true); }} style={{
          background: "#C9A84C", color: "#0D0D0D", border: "none", borderRadius: 10,
          padding: "12px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8, fontFamily: "'DM Sans', sans-serif"
        }}><Plus size={16} /> New Contract</button>
      </div>

      {/* Contract Cards */}
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
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => openEdit(c)} style={{
                    background: "transparent", border: "none", color: "#555", cursor: "pointer"
                  }}><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(c.id)} style={{
                    background: "transparent", border: "none", color: "#444", cursor: "pointer"
                  }}><X size={16} /></button>
                </div>
              </div>

              <div style={{ fontSize: 11, color: divColor[c.division] || "#C9A84C", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, fontWeight: 700 }}>
                {DIVISIONS.find(d => d.value === c.division)?.label}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                <span style={{
                  background: "#C9A84C18", border: "1px solid #C9A84C33",
                  color: "#C9A84C", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600
                }}>
                  {CONTRACT_TYPES.find(t => t.value === c.contractType)?.label}
                </span>
                <span style={{
                  background: c.payType === "hourly" ? "#52A9E022" : "#52C97A22",
                  border: "1px solid " + (c.payType === "hourly" ? "#52A9E044" : "#52C97A44"),
                  color: c.payType === "hourly" ? "#52A9E0" : "#52C97A",
                  borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600
                }}>
                  {c.payType === "hourly" ? "Hourly" : "Monthly"}
                </span>
              </div>

              <div style={{ fontSize: 15, color: "#52C97A", fontWeight: 700, marginBottom: 16 }}>
                {c.payType === "hourly"
                  ? `R ${parseFloat(c.hourlyRate || 0).toFixed(2)}/hr`
                  : `R ${parseFloat(c.salary || 0).toFixed(2)}/mo`}
              </div>

              {c.startDate && (
                <div style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>
                  From {c.startDate}{c.endDate ? ` → ${c.endDate}` : ""}
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => openContract(c)} style={{
                  flex: 1, background: "transparent", border: "1px solid #333",
                  borderRadius: 8, color: "#888", cursor: "pointer", padding: "9px",
                  fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 6, fontFamily: "'DM Sans', sans-serif"
                }}><Printer size={13} /> View / Print</button>
                <button onClick={() => downloadContract(c)} style={{
                  flex: 1, background: "#C9A84C18", border: "1px solid #C9A84C44",
                  borderRadius: 8, color: "#C9A84C", cursor: "pointer", padding: "9px",
                  fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 6, fontFamily: "'DM Sans', sans-serif", fontWeight: 600
                }}><Download size={13} /> Download</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New / Edit Contract Modal */}
      {showForm && (
        <div onClick={() => setShowForm(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
          zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#1A1A1A", border: "1px solid #333", borderRadius: 16,
            width: "100%", maxWidth: 700, maxHeight: "92vh", overflowY: "auto",
            padding: 32, position: "relative"
          }}>
            <button onClick={() => setShowForm(false)} style={{
              position: "absolute", top: 16, right: 16, background: "transparent",
              border: "none", color: "#666", cursor: "pointer"
            }}><X size={20} /></button>

            <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#C9A84C", marginBottom: 24 }}>
              {editingId ? "Edit Contract" : "New Employment Contract"}
            </h2>

            {/* Auto-fill from employee */}
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Auto-fill from existing employee (optional)</label>
              <select onChange={e => {
                const emp = employees.find(em => em.id === e.target.value);
                if (emp) setForm(f => ({
                  ...f,
                  employeeId: emp.id,
                  employeeName: emp.name || "",
                  role: emp.role || "",
                  division: emp.division || "print",
                  salary: emp.salary || emp.payType === "monthly" ? (emp.salary || "") : "",
                  hourlyRate: emp.hourlyRate || "",
                  payType: emp.payType || "monthly",
                  idNumber: emp.idNumber || "",
                  address: emp.address || "",
                }));
              }} style={{ ...inp, background: "#111" }}>
                <option value="">— Select employee to auto-fill —</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} — {e.role}</option>)}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

              {/* Basic info */}
              {[
                ["employeeName", "Employee Full Name", "text"],
                ["idNumber",     "ID Number",          "text"],
                ["role",         "Job Title",          "text"],
                ["startDate",    "Start Date",         "date"],
                ["endDate",      "End Date (fixed-term)", "date"],
                ["hoursPerWeek", "Hours per Week",     "number"],
                ["leaveDays",    "Annual Leave Days",  "number"],
                ["noticePeriod", "Notice Period",      "text"],
                ["probation",    "Probation Period",   "text"],
              ].map(([k, l, t]) => (
                <div key={k}>
                  <label style={lbl}>{l}</label>
                  <input type={t} value={form[k] || ""} onChange={e => setField(k, e.target.value)} style={inp} />
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

              {/* Pay type */}
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Pay Type</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {["monthly", "hourly"].map(pt => (
                    <button key={pt} onClick={() => setField("payType", pt)} style={{
                      flex: 1, background: form.payType === pt ? "#C9A84C22" : "#111",
                      border: "1px solid " + (form.payType === pt ? "#C9A84C" : "#333"),
                      color: form.payType === pt ? "#C9A84C" : "#666",
                      borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 600,
                      cursor: "pointer", textTransform: "capitalize", fontFamily: "'DM Sans', sans-serif"
                    }}>{pt === "monthly" ? "💰 Monthly Salary" : "⏱ Hourly Rate"}</button>
                  ))}
                </div>
              </div>

              {form.payType === "monthly" ? (
                <div>
                  <label style={lbl}>Monthly Salary (R)</label>
                  <input type="number" value={form.salary || ""} onChange={e => setField("salary", e.target.value)} style={inp} />
                </div>
              ) : (
                <div>
                  <label style={lbl}>Hourly Rate (R)</label>
                  <input type="number" value={form.hourlyRate || ""} onChange={e => setField("hourlyRate", e.target.value)} style={inp} />
                </div>
              )}

              {/* Address */}
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Residential Address</label>
                <textarea value={form.address || ""} onChange={e => setField("address", e.target.value)}
                  rows={2} style={{ ...inp, resize: "vertical" }} />
              </div>

              {/* Banking details */}
              <div style={{ gridColumn: "1/-1", paddingTop: 8, borderTop: "1px solid #222" }}>
                <label style={{ ...lbl, marginBottom: 12 }}>Banking Details (optional)</label>
              </div>
              {[
                ["bankName",    "Bank Name",      "text"],
                ["bankAccount", "Account Number", "text"],
                ["bankBranch",  "Branch Code",    "text"],
              ].map(([k, l, t]) => (
                <div key={k}>
                  <label style={lbl}>{l}</label>
                  <input type={t} value={form[k] || ""} onChange={e => setField(k, e.target.value)} style={inp} />
                </div>
              ))}

              {/* Duties */}
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Key Duties &amp; Responsibilities</label>
                <textarea value={form.duties || ""} onChange={e => setField("duties", e.target.value)}
                  rows={4} placeholder="One duty per line..." style={{ ...inp, resize: "vertical" }} />
              </div>

              {/* Special clauses */}
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Special Conditions / Clauses</label>
                <textarea value={form.specialClauses || ""} onChange={e => setField("specialClauses", e.target.value)}
                  rows={3} placeholder="Any additional terms..." style={{ ...inp, resize: "vertical" }} />
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button onClick={handleSave} disabled={saving} style={{
                flex: 1, background: "#C9A84C", color: "#0D0D0D", border: "none",
                borderRadius: 8, padding: "13px", fontSize: 15, fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif"
              }}>{saving ? "Saving..." : editingId ? "Update Contract" : "Save Contract"}</button>

              <button onClick={async () => { await handleSave(); openContract(form); }} style={{
                background: "transparent", color: "#888", border: "1px solid #333",
                borderRadius: 8, padding: "13px 18px", fontSize: 14,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                display: "flex", alignItems: "center", gap: 8
              }}><Printer size={14} /> Preview</button>

              <button onClick={async () => { await handleSave(); downloadContract(form); }} style={{
                background: "transparent", color: "#C9A84C", border: "1px solid #C9A84C",
                borderRadius: 8, padding: "13px 18px", fontSize: 14, fontWeight: 700,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                display: "flex", alignItems: "center", gap: 8
              }}><Download size={14} /> Save &amp; Download</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}