import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useParams } from "react-router-dom";
import { Package, Users, TrendingUp, AlertCircle } from "lucide-react";

const DIVISION_INFO = {
  print: {
    label: "Print / DTF / Vinyl",
    description: "DTF Printing, Embroidery & Vinyl division",
    color: "#C9A84C",
  },
  it: {
    label: "IT Company",
    description: "Information Technology services division",
    color: "#52A9E0",
  },
  clothing: {
    label: "Clothing Brand",
    description: "R&R own clothing brand division",
    color: "#9B7DE8",
  },
};

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div style={{
      background: "#1A1A1A", border: "1px solid #2a2a2a", borderRadius: 14,
      padding: "24px", display: "flex", alignItems: "center", gap: 16
    }}>
      <div style={{
        background: color + "18", borderRadius: 12, padding: 12,
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <div style={{
          fontSize: 28, fontWeight: 700, color: "#F0F0F0",
          fontFamily: "'Playfair Display', serif"
        }}>{value}</div>
        <div style={{
          fontSize: 12, color: "#666", textTransform: "uppercase",
          letterSpacing: 1, marginTop: 2
        }}>{label}</div>
      </div>
    </div>
  );
}

export default function Division() {
  const { slug } = useParams();
  const [orders, setOrders] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [payroll, setPayroll] = useState([]);

  const info = DIVISION_INFO[slug] || {
    label: slug, description: "", color: "#C9A84C"
  };

  useEffect(() => {
    const u1 = onSnapshot(collection(db, "orders"), snap =>
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(o => o.division === slug)));
    const u2 = onSnapshot(collection(db, "employees"), snap =>
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(e => e.division === slug)));
    const u3 = onSnapshot(collection(db, "payroll"), snap =>
      setPayroll(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.division === slug)));
    return () => { u1(); u2(); u3(); };
  }, [slug]);

  const totalRevenue = orders.reduce((s, o) => s + (o.value || 0), 0);
  const outstanding = orders.reduce((s, o) => s + (!o.balanceCollected ? (o.balance || 0) : 0), 0);
  const inProduction = orders.filter(o => o.inProduction && !o.delivered).length;
  const totalPayroll = payroll.reduce((s, p) => s + (p.net || 0), 0);

  const statusColor = (j) => {
    if (j.delivered) return "#52C97A";
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

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{
          display: "inline-block", background: info.color + "18",
          border: "1px solid " + info.color + "44",
          borderRadius: 20, padding: "4px 14px", marginBottom: 12
        }}>
          <span style={{ color: info.color, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
            DIVISION
          </span>
        </div>
        <h1 style={{
          fontFamily: "'Playfair Display', serif", fontSize: 32,
          color: info.color, margin: 0
        }}>{info.label}</h1>
        <p style={{ color: "#555", marginTop: 6, fontSize: 14 }}>{info.description}</p>
      </div>

      {/* Stat Cards */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: 16, marginBottom: 32
      }}>
        <StatCard icon={Package} label="Total Orders" value={orders.length} color={info.color} />
        <StatCard icon={TrendingUp} label="In Production" value={inProduction} color="#52A9E0" />
        <StatCard icon={AlertCircle} label="Outstanding (R)" value={"R " + outstanding.toFixed(0)} color="#E05252" />
        <StatCard icon={Users} label="Staff" value={employees.length} color="#52C97A" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Orders */}
        <div style={{
          background: "#1A1A1A", border: "1px solid #2a2a2a",
          borderRadius: 14, padding: 24
        }}>
          <h3 style={{
            fontSize: 12, color: info.color, textTransform: "uppercase",
            letterSpacing: 2, marginBottom: 20, fontWeight: 700
          }}>Orders</h3>

          {orders.length === 0 ? (
            <div style={{ color: "#444", textAlign: "center", padding: "40px 0", fontSize: 14 }}>
              No orders for this division yet
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {orders.slice(0, 8).map(o => (
                <div key={o.id} style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", padding: "10px 0",
                  borderBottom: "1px solid #222"
                }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "#F0F0F0", fontSize: 14 }}>
                      {o.client}
                    </div>
                    <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                      {o.ref} {o.due ? "· Due: " + o.due : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{
                      background: statusColor(o) + "22", color: statusColor(o),
                      border: "1px solid " + statusColor(o) + "44",
                      borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600
                    }}>{statusLabel(o)}</span>
                    <div style={{ fontSize: 13, color: "#C9A84C", fontWeight: 700, marginTop: 4 }}>
                      R {(o.value || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
              {orders.length > 8 && (
                <div style={{ color: "#555", fontSize: 13, textAlign: "center", paddingTop: 8 }}>
                  +{orders.length - 8} more — see Order Tracker
                </div>
              )}
            </div>
          )}
        </div>

        {/* Staff + Payroll */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Staff */}
          <div style={{
            background: "#1A1A1A", border: "1px solid #2a2a2a",
            borderRadius: 14, padding: 24
          }}>
            <h3 style={{
              fontSize: 12, color: info.color, textTransform: "uppercase",
              letterSpacing: 2, marginBottom: 20, fontWeight: 700
            }}>Staff</h3>

            {employees.length === 0 ? (
              <div style={{ color: "#444", textAlign: "center", padding: "20px 0", fontSize: 14 }}>
                No staff in this division
              </div>
            ) : employees.map(e => (
              <div key={e.id} style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", padding: "10px 0", borderBottom: "1px solid #222"
              }}>
                <div>
                  <div style={{ fontWeight: 600, color: "#F0F0F0", fontSize: 14 }}>{e.name}</div>
                  <div style={{ fontSize: 12, color: "#555" }}>{e.role}</div>
                </div>
                {e.salary && (
                  <div style={{ color: info.color, fontWeight: 700, fontSize: 13 }}>
                    R {parseFloat(e.salary).toFixed(2)}/mo
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Payroll Summary */}
          <div style={{
            background: "#1A1A1A", border: "1px solid #2a2a2a",
            borderRadius: 14, padding: 24
          }}>
            <h3 style={{
              fontSize: 12, color: info.color, textTransform: "uppercase",
              letterSpacing: 2, marginBottom: 20, fontWeight: 700
            }}>Payroll Summary</h3>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ color: "#666", fontSize: 13 }}>Payslips Issued</span>
              <span style={{ color: "#F0F0F0", fontWeight: 700 }}>{payroll.length}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ color: "#666", fontSize: 13 }}>Total Gross Paid</span>
              <span style={{ color: "#F0F0F0", fontWeight: 700 }}>
                R {payroll.reduce((s, p) => s + (p.gross || 0), 0).toFixed(2)}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid #2a2a2a" }}>
              <span style={{ color: "#666", fontSize: 13 }}>Total Net Paid</span>
              <span style={{ color: "#52C97A", fontWeight: 700, fontSize: 16 }}>
                R {totalPayroll.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}