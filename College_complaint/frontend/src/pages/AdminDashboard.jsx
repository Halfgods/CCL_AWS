import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { FileText, Clock, LoaderCircle, CheckCircle2, Plus, Inbox } from "lucide-react";
import ComplaintTable from "../components/ComplaintTable.jsx";
import LoadState from "../components/LoadState.jsx";
import AdminViewModal from "../components/AdminViewModal.jsx";
import { listComplaints } from "../api.js";
import { CATEGORIES, STATUSES, normalizeComplaint } from "../helpers.js";

/**
 * Administrator dashboard: summary cards + filterable table.
 *
 * SECURITY NOTICE: PATCH /api/complaints/<id>/status does not yet verify admin
 * permissions. Until Cognito + backend authorization exist, this is a
 * demonstration interface — not a secure administrative system.
 */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { query } = useOutletContext() || { query: "" };
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [fromDate, setFromDate] = useState("");

  const load = () => {
    setLoading(true);
    setError(null);
    listComplaints()
      .then((rows) => setItems(rows.map(normalizeComplaint).filter(Boolean)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const rows = useMemo(() => {
    let list = items;
    if (category) list = list.filter((c) => c.category === category);
    if (status) list = list.filter((c) => c.status === status);
    if (fromDate) {
      const start = new Date(fromDate).setHours(0, 0, 0, 0);
      list = list.filter((c) => c.createdAt && new Date(c.createdAt).getTime() >= start);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((c) =>
        [c.id, c.studentName, c.category, c.status, c.description].join(" ").toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [items, category, status, fromDate, query]);

  const count = (s) => items.filter((c) => c.status === s).length;
  const stats = [
    { label: "Total Complaints", value: items.length, icon: FileText, cls: "navy" },
    { label: "Pending Complaints", value: count("Pending"), icon: Clock, cls: "orange" },
    { label: "In Progress", value: count("In Progress"), icon: LoaderCircle, cls: "blue" },
    { label: "Resolved Complaints", value: count("Resolved"), icon: CheckCircle2, cls: "green" },
  ];

  const onUpdated = (updated) => {
    setItems((prev) => prev.map((c) => (c.id === updated.id ? { ...c, status: updated.status } : c)));
    setSelected((prev) => (prev && prev.id === updated.id ? { ...prev, status: updated.status } : prev));
  };

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h2>Administrator Dashboard</h2>
          <p className="sub">Review, inspect evidence and resolve complaints across campus.</p>
        </div>
        <div className="filters">
          <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            id="admin-date-filter"
            name="admin-date-filter"
            className="input"
            type="date"
            title="Submitted from"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
      </div>

      <div className="alert alert-warn" style={{ marginBottom: 18, fontSize: 12.5 }}>
        Demonstration interface: the status endpoint does not verify administrator permissions
        yet. Backend authorization (Cognito) is still required.
      </div>

      <div className="stat-grid">
        {stats.map(({ label, value, icon: Icon, cls }) => (
          <div className="stat-card" key={label}>
            <div className={`stat-icon ${cls}`}>
              <Icon size={22} />
            </div>
            <div>
              <div className="stat-value">{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Recent Complaints</h3>
          <span className="muted" style={{ fontSize: 13 }}>
            {rows.length} shown
          </span>
        </div>
        <LoadState loading={loading} error={error} onRetry={load} />
        {!loading && !error && (
          <ComplaintTable complaints={rows} variant="admin" onView={setSelected} />
        )}
        {!loading && !error && !rows.length && (
          <div className="empty">
            <Inbox size={32} />
            <div style={{ marginBottom: 12 }}>No complaints match these filters.</div>
            <button className="btn btn-outline btn-sm" onClick={() => navigate("/admin/reports")}>
              View reports
            </button>
          </div>
        )}
      </div>

      {selected && (
        <AdminViewModal
          complaint={selected}
          onClose={() => setSelected(null)}
          onUpdated={onUpdated}
        />
      )}
    </main>
  );
}
