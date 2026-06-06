import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import {
  Package, Clock, CheckCircle, AlertCircle, TrendingUp,
  TrendingDown, FileText, FileSignature, AlertTriangle, DollarSign
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line, CartesianGrid, Legend
} from "recharts";
import { useNavigate } from "react-router-dom";

function StatCard({ icon: Icon, label, value, color, sub, subColor }) {
  return (
    <div style={{
      background: "#1A1A1A", border: "1px solid #2a2a2a", borderRadius: 14,
      padding: "22px", display: "flex", alignItems: "center", gap: 16
    }}>
      <div style={{
        background: color + "18", borderRadius: 12, padding: 12,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
      }}>
        <Icon size={22} color={color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: "#F0F0F0", fontFamily: "'Playfair Display', serif", lineHeight: 1.1 }}>
          {value}
        </div>
        <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1, marginTop: 3 }}>
          {label}
        </div>
        {sub && (
          <div style={{ fontSize: 11, color: subColor || "#555", marginTop: 3, fontWeight: 600 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "#1A1A1A", border: "1px solid #333", borderRadius: 10,
        padding: "12px 16px", fontSize: 13
      }}>
        <div style={{ color: "#888", marginBottom: 6 }}>{label}</div>
        {payload.map(p => (
          <div key={p.name} style={{ color: p.color, fontWeight: 600 }}>
            {p.name}: R {Number(p.value || 0).toFixed(2)}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const divisionLabels = { print: "Print / DTF / Vinyl", it: "IT Company", clothing: "Clothing Brand" };

const statusColor = (j) => {
  if (j.balanceCollected) return "#52C97A";
  if (j.delivered) return "#52A9E0";
  if (j.inProduction) return "#C9A84C";
  return "#E05252";
};

const statusLabel = (j) => {
  if (j.balanceCollected) return "Complete";
  if (j.delivered) return "Delivered";
  if (j.productionDone) return "Done";
  if (j.inProduction) return "In Production";
  if (j.artworkApproved) return "Artwork Approved";
  if (j.depositPaid) return "Deposit Paid";
  return "New";
};

function monthKey(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleString("default", { month: "short", year: "2-digit" });
}

function currentMonthKey() {
  return new Date().toLocaleString("default", { month: "short", year: "2-digit" });
}

function lastMonthKey() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toLocaleString("default", { month: "short", year: "2-digit" });
}

export default function Dashboard() {
  const [orders, setOrders]     = useState([]);
  const [payroll, setPayroll]   = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [quotes, setQuotes]     = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const u1 = onSnapshot(collection(db, "orders"),   snap => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(collection(db, "payroll"),  snap => setPayroll(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u3 = onSnapshot(collection(db, "invoices"), snap => setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u4 = onSnapshot(collection(db, "quotes"),   snap => setQuotes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  // ── Order stats ──────────────────────────────────────────────────────────────
  const totalBalance       = orders.reduce((s, j) => s + (!j.balanceCollected ? (j.balance || 0) : 0), 0);
  const inProductionOrders = orders.filter(j => j.inProduction && !j.delivered);
  const delivered          = orders.filter(j => j.delivered).length;
  const noDeposit          = orders.filter(j => !j.depositPaid).length;
  const outstandingOrders  = orders.filter(j => !j.balanceCollected && (j.balance || 0) > 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueOrders = orders.filter(j => {
    if (!j.due || j.balanceCollected || j.delivered) return false;
    return new Date(j.due + "T00:00:00") < today;
  });

  // ── Revenue this month vs last ───────────────────────────────────────────────
  const thisMK = currentMonthKey();
  const lastMK = lastMonthKey();

  const revenueThisMonth = orders
    .filter(o => monthKey(o.date) === thisMK)
    .reduce((s, o) => s + (o.value || 0), 0);
  const revenueLastMonth = orders
    .filter(o => monthKey(o.date) === lastMK)
    .reduce((s, o) => s + (o.value || 0), 0);
  const revChange = revenueLastMonth > 0
    ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth * 100).toFixed(1)
    : null;

  // ── Invoice stats ────────────────────────────────────────────────────────────
  const calcInvTotal = inv => {
    const sub = (inv.lines || []).reduce((s, l) => s + (parseFloat(l.qty || 0) * parseFloat(l.unitPrice || 0)), 0);
    return inv.includeVat ? sub * 1.15 : sub;
  };
  const invoiceOutstanding = invoices
    .filter(inv => inv.status === "unpaid" || inv.status === "overdue" || inv.status === "partial")
    .reduce((s, inv) => s + calcInvTotal(inv), 0);
  const overdueInvoices = invoices.filter(inv => {
    if (inv.status === "paid") return false;
    if (!inv.dueDate) return false;
    return new Date(inv.dueDate + "T00:00:00") < today;
  });

  // ── Quote stats ──────────────────────────────────────────────────────────────
  const acceptedQuotes  = quotes.filter(q => q.status === "accepted").length;
  const pendingQuotes   = quotes.filter(q => q.status === "draft" || q.status === "sent").length;

  // ── Division counts ──────────────────────────────────────────────────────────
  const divisionCounts = {
    print:    orders.filter(j => j.division === "print").length,
    it:       orders.filter(j => j.division === "it").length,
    clothing: orders.filter(j => j.division === "clothing").length,
  };

  // ── Monthly revenue chart (by order date) ────────────────────────────────────
  const monthlyMap = {};
  orders.forEach(o => {
    const key = monthKey(o.date);
    if (!key) return;
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, Print: 0, IT: 0, Clothing: 0, _ts: new Date(o.date + "T00:00:00").getTime() };
    if (o.division === "print")    monthlyMap[key].Print    += o.value || 0;
    if (o.division === "it")       monthlyMap[key].IT       += o.value || 0;
    if (o.division === "clothing") monthlyMap[key].Clothing += o.value || 0;
  });
  const revenueData = Object.values(monthlyMap).sort((a, b) => a._ts - b._ts).slice(-6);

  // ── Payroll chart ────────────────────────────────────────────────────────────
  const payrollMap = {};
  payroll.forEach(p => {
    if (!p.createdAt) return;
    const date = p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
    const key = date.toLocaleString("default", { month: "short", year: "2-digit" });
    if (!payrollMap[key]) payrollMap[key] = { month: key, "Net Payroll": 0, _ts: date.getTime() };
    payrollMap[key]["Net Payroll"] += p.net || 0;
  });
  const payrollData = Object.values(payrollMap).sort((a, b) => a._ts - b._ts).slice(-6);

  // ── Top clients ──────────────────────────────────────────────────────────────
  const clientMap = {};
  orders.forEach(o => {
    if (!o.client) return;
    if (!clientMap[o.client]) clientMap[o.client] = { name: o.client, total: 0, count: 0 };
    clientMap[o.client].total += o.value || 0;
    clientMap[o.client].count += 1;
  });
  const topClients = Object.values(clientMap).sort((a, b) => b.total - a.total).slice(0, 5);
  const maxClientTotal = topClients[0]?.total || 1;

  // ── Recent orders ────────────────────────────────────────────────────────────
  const recentOrders = [...orders]
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    .slice(0, 5);

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, color: "#C9A84C", margin: 0 }}>
          Dashboard
        </h1>
        <p style={{ color: "#555", marginTop: 6, fontSize: 14 }}>R&R Agencies — All Divisions Overview</p>
      </div>

      {/* ── Stat Cards Row 1 ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
        gap: 14, marginBottom: 14
      }}>
        <StatCard icon={Package}       label="Total Orders"      value={orders.length}                         color="#C9A84C" />
        <StatCard icon={Clock}         label="In Production"     value={inProductionOrders.length}             color="#52A9E0" />
        <StatCard icon={CheckCircle}   label="Delivered"         value={delivered}                             color="#52C97A" />
        <StatCard icon={AlertTriangle} label="Overdue Orders"    value={overdueOrders.length}                  color="#E07D52"
          sub={overdueOrders.length > 0 ? `${overdueOrders.length} past due date` : null} subColor="#E07D52" />
        <StatCard icon={AlertCircle}   label="No Deposit"        value={noDeposit}                             color="#E05252" />
      </div>

      {/* ── Stat Cards Row 2 ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
        gap: 14, marginBottom: 24
      }}>
        <StatCard
          icon={TrendingUp}
          label="Revenue This Month"
          value={"R " + revenueThisMonth.toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          color="#52C97A"
          sub={revChange !== null ? (revChange >= 0 ? `▲ ${revChange}% vs last month` : `▼ ${Math.abs(revChange)}% vs last month`) : null}
          subColor={revChange >= 0 ? "#52C97A" : "#E05252"}
        />
        <StatCard icon={TrendingUp}    label="Order Balance Owing"   value={"R " + totalBalance.toFixed(0)}          color="#9B7DE8" />
        <StatCard icon={DollarSign}    label="Invoice Outstanding"   value={"R " + invoiceOutstanding.toFixed(0)}    color="#E07D52"
          sub={overdueInvoices.length > 0 ? `${overdueInvoices.length} overdue invoices` : null} subColor="#E05252" />
        <StatCard icon={FileText}      label="Unpaid Invoices"       value={invoices.filter(i => i.status !== "paid").length} color="#52A9E0" />
        <StatCard icon={FileSignature} label="Quotes Pending"        value={pendingQuotes}                            color="#C9A84C"
          sub={acceptedQuotes > 0 ? `${acceptedQuotes} accepted` : null} subColor="#52C97A" />
      </div>

      {/* ── Outstanding Balances + In Production ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

        <div style={{ background: "#1A1A1A", border: "1px solid #2a2a2a", borderRadius: 14, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <h3 style={{ fontSize: 11, color: "#9B7DE8", textTransform: "uppercase", letterSpacing: 2, fontWeight: 700, margin: 0 }}>
              Outstanding Balances
            </h3>
            <span style={{ background: "#9B7DE822", border: "1px solid #9B7DE844", color: "#9B7DE8", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
              {outstandingOrders.length}
            </span>
          </div>
          {outstandingOrders.length === 0 ? (
            <div style={{ color: "#444", textAlign: "center", padding: "30px 0", fontSize: 13 }}>No outstanding balances 🎉</div>
          ) : outstandingOrders.sort((a, b) => (b.balance || 0) - (a.balance || 0)).slice(0, 8).map(j => (
            <div key={j.id} onClick={() => navigate("/orders")}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1f1f1f", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "#222"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div>
                <div style={{ fontSize: 13, color: "#ddd", fontWeight: 500 }}>{j.client}</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{j.ref || "—"} · {divisionLabels[j.division] || j.division}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#9B7DE8" }}>R {(j.balance || 0).toFixed(2)}</div>
                {j.due && <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>Due {j.due}</div>}
              </div>
            </div>
          ))}
          {outstandingOrders.length > 8 && (
            <div style={{ fontSize: 12, color: "#555", textAlign: "center", paddingTop: 10 }}>+{outstandingOrders.length - 8} more</div>
          )}
        </div>

        <div style={{ background: "#1A1A1A", border: "1px solid #2a2a2a", borderRadius: 14, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <h3 style={{ fontSize: 11, color: "#52A9E0", textTransform: "uppercase", letterSpacing: 2, fontWeight: 700, margin: 0 }}>
              In Production
            </h3>
            <span style={{ background: "#52A9E022", border: "1px solid #52A9E044", color: "#52A9E0", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
              {inProductionOrders.length}
            </span>
          </div>
          {inProductionOrders.length === 0 ? (
            <div style={{ color: "#444", textAlign: "center", padding: "30px 0", fontSize: 13 }}>Nothing in production right now</div>
          ) : inProductionOrders.sort((a, b) => {
            if (!a.due && !b.due) return 0;
            if (!a.due) return 1;
            if (!b.due) return -1;
            return new Date(a.due) - new Date(b.due);
          }).slice(0, 8).map(j => {
            const isOverdue = j.due && new Date(j.due + "T00:00:00") < today;
            return (
              <div key={j.id} onClick={() => navigate("/orders")}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1f1f1f", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "#222"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div>
                  <div style={{ fontSize: 13, color: "#ddd", fontWeight: 500 }}>{j.client}</div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{j.ref || "—"} · {divisionLabels[j.division] || j.division}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>{j.description?.slice(0, 22)}{j.description?.length > 22 ? "…" : ""}</div>
                  {j.due && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: isOverdue ? "#E05252" : "#52A9E0" }}>
                      {isOverdue ? "⚠ Overdue" : "Due"} {j.due}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {inProductionOrders.length > 8 && (
            <div style={{ fontSize: 12, color: "#555", textAlign: "center", paddingTop: 10 }}>+{inProductionOrders.length - 8} more</div>
          )}
        </div>
      </div>

      {/* ── Overdue Orders + Overdue Invoices ── */}
      {(overdueOrders.length > 0 || overdueInvoices.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          {overdueOrders.length > 0 && (
            <div style={{ background: "#1A1A1A", border: "1px solid #E07D5233", borderRadius: 14, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <h3 style={{ fontSize: 11, color: "#E07D52", textTransform: "uppercase", letterSpacing: 2, fontWeight: 700, margin: 0 }}>
                  ⚠ Overdue Orders
                </h3>
                <span style={{ background: "#E07D5222", border: "1px solid #E07D5244", color: "#E07D52", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
                  {overdueOrders.length}
                </span>
              </div>
              {overdueOrders.sort((a, b) => new Date(a.due) - new Date(b.due)).slice(0, 6).map(j => (
                <div key={j.id} onClick={() => navigate("/orders")}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #1f1f1f", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#222"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div>
                    <div style={{ fontSize: 13, color: "#ddd", fontWeight: 500 }}>{j.client}</div>
                    <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{j.ref || "—"}</div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#E05252" }}>Due {j.due}</div>
                </div>
              ))}
            </div>
          )}

          {overdueInvoices.length > 0 && (
            <div style={{ background: "#1A1A1A", border: "1px solid #E0525233", borderRadius: 14, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <h3 style={{ fontSize: 11, color: "#E05252", textTransform: "uppercase", letterSpacing: 2, fontWeight: 700, margin: 0 }}>
                  ⚠ Overdue Invoices
                </h3>
                <span style={{ background: "#E0525222", border: "1px solid #E0525244", color: "#E05252", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
                  {overdueInvoices.length}
                </span>
              </div>
              {overdueInvoices.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 6).map(inv => (
                <div key={inv.id} onClick={() => navigate("/invoices")}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #1f1f1f", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#222"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div>
                    <div style={{ fontSize: 13, color: "#ddd", fontWeight: 500 }}>{inv.client}</div>
                    <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{inv.invoiceNumber || "—"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#E05252" }}>R {calcInvTotal(inv).toFixed(2)}</div>
                    <div style={{ fontSize: 11, color: "#555" }}>Due {inv.dueDate}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Revenue Chart ── */}
      <div style={{ background: "#1A1A1A", border: "1px solid #2a2a2a", borderRadius: 14, padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 11, color: "#C9A84C", textTransform: "uppercase", letterSpacing: 2, marginBottom: 24, fontWeight: 700 }}>
          Revenue by Division (Monthly)
        </h3>
        {revenueData.length === 0 ? (
          <div style={{ color: "#444", textAlign: "center", padding: "40px 0", fontSize: 14 }}>
            No data yet — revenue chart will appear as you add orders
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenueData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#555", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#555", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => "R" + v.toLocaleString()} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#ffffff08" }} />
              <Legend wrapperStyle={{ color: "#666", fontSize: 12, paddingTop: 16 }} />
              <Bar dataKey="Print"    fill="#C9A84C" radius={[4, 4, 0, 0]} />
              <Bar dataKey="IT"       fill="#52A9E0" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Clothing" fill="#9B7DE8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Payroll + Division Breakdown ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "#1A1A1A", border: "1px solid #2a2a2a", borderRadius: 14, padding: 24 }}>
          <h3 style={{ fontSize: 11, color: "#C9A84C", textTransform: "uppercase", letterSpacing: 2, marginBottom: 24, fontWeight: 700 }}>
            Net Payroll (Monthly)
          </h3>
          {payrollData.length === 0 ? (
            <div style={{ color: "#444", textAlign: "center", padding: "40px 0", fontSize: 14 }}>No payroll data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={payrollData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#555", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#555", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => "R" + v.toLocaleString()} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#C9A84C44" }} />
                <Line type="monotone" dataKey="Net Payroll" stroke="#52C97A" strokeWidth={2} dot={{ fill: "#52C97A", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ background: "#1A1A1A", border: "1px solid #2a2a2a", borderRadius: 14, padding: 24 }}>
          <h3 style={{ fontSize: 11, color: "#C9A84C", textTransform: "uppercase", letterSpacing: 2, marginBottom: 20, fontWeight: 700 }}>
            Orders by Division
          </h3>
          {[
            { key: "print",    label: "Print / DTF / Vinyl", color: "#C9A84C" },
            { key: "it",       label: "IT Company",          color: "#52A9E0" },
            { key: "clothing", label: "Clothing Brand",      color: "#9B7DE8" },
          ].map(d => (
            <div key={d.key} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "#aaa" }}>{d.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#F0F0F0" }}>{divisionCounts[d.key]}</span>
              </div>
              <div style={{ background: "#111", borderRadius: 4, height: 6 }}>
                <div style={{
                  background: d.color, borderRadius: 4, height: 6,
                  width: orders.length ? (divisionCounts[d.key] / orders.length * 100) + "%" : "0%",
                  transition: "width 0.5s"
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Top Clients ── */}
      {topClients.length > 0 && (
        <div style={{ background: "#1A1A1A", border: "1px solid #2a2a2a", borderRadius: 14, padding: 24, marginBottom: 16 }}>
          <h3 style={{ fontSize: 11, color: "#C9A84C", textTransform: "uppercase", letterSpacing: 2, marginBottom: 20, fontWeight: 700 }}>
            Top Clients by Revenue
          </h3>
          {topClients.map((c, i) => (
            <div key={c.name} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, color: "#444", fontWeight: 700, minWidth: 16 }}>#{i + 1}</span>
                  <span style={{ fontSize: 13, color: "#ddd", fontWeight: 500 }}>{c.name}</span>
                  <span style={{ fontSize: 11, color: "#555" }}>{c.count} order{c.count !== 1 ? "s" : ""}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#C9A84C" }}>R {c.total.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div style={{ background: "#111", borderRadius: 4, height: 5 }}>
                <div style={{
                  background: "#C9A84C", borderRadius: 4, height: 5,
                  width: (c.total / maxClientTotal * 100) + "%",
                  transition: "width 0.5s"
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Recent Orders ── */}
      <div style={{ background: "#1A1A1A", border: "1px solid #2a2a2a", borderRadius: 14, padding: 24 }}>
        <h3 style={{ fontSize: 11, color: "#C9A84C", textTransform: "uppercase", letterSpacing: 2, marginBottom: 20, fontWeight: 700 }}>
          Recent Orders
        </h3>
        {recentOrders.length === 0 ? (
          <div style={{ color: "#444", textAlign: "center", padding: "40px 0", fontSize: 14 }}>
            No orders yet — add one in the Order Tracker
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                {["Ref", "Client", "Division", "Value", "Status"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "0 0 12px", color: "#555", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(j => (
                <tr key={j.id} onClick={() => navigate("/orders")}
                  style={{ borderBottom: "1px solid #1f1f1f", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#222"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "12px 0", color: "#C9A84C", fontWeight: 600 }}>{j.ref}</td>
                  <td style={{ padding: "12px 0", color: "#ddd" }}>{j.client}</td>
                  <td style={{ padding: "12px 0", color: "#888" }}>{divisionLabels[j.division] || j.division}</td>
                  <td style={{ padding: "12px 0", color: "#ddd" }}>R {(j.value || 0).toFixed(2)}</td>
                  <td style={{ padding: "12px 0" }}>
                    <span style={{
                      background: statusColor(j) + "22", color: statusColor(j),
                      border: "1px solid " + statusColor(j) + "44",
                      borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600
                    }}>{statusLabel(j)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}