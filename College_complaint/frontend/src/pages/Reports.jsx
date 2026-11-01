import { useEffect, useState } from "react";
import { FileText, Clock, LoaderCircle, CheckCircle2 } from "lucide-react";
import LoadState from "../components/LoadState.jsx";
import { listComplaints } from "../api.js";
import { CATEGORIES, STATUSES, normalizeComplaint } from "../helpers.js";

const STATUS_COLORS = {
  Pending: "#f59e0b",
  "In Progress": "#2563eb",
  Resolved: "#16a34a",
};

/** Simple report page: counts by category and by status, computed from the API. */
export default function Reports() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    listComplaints()
      .then((rows) => setItems(rows.map(normalizeComplaint).filter(Boolean)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const byCategory = CATEGORIES.map((c) => ({
    label: c,
    count: items.filter((x) => x.category === c).length,
  })).sort((a, b) => b.count - a.count);

  const byStatus = STATUSES.map((s) => ({
    label: s,
    count: items.filter((x) => x.status === s).length,
  }));

  const maxCat = Math.max(1, ...byCategory.map((c) => c.count));
  const total = items.length || 1;

  const cards = [
    { label: "Total Complaints", value: items.length, icon: FileText, cls: "navy" },
    { label: "Pending", value: byStatus[0].count, icon: Clock, cls: "orange" },
    { label: "In Progress", value: byStatus[1].count, icon: LoaderCircle, cls: "blue" },
    { label: "Resolved", value: byStatus[2].count, icon: CheckCircle2, cls: "green" },
  ];

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h2>Reports</h2>
          <p className="sub">Complaint statistics generated from live API data.</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={load}>
          Refresh
        </button>
      </div>

      <div className="stat-grid">
        {cards.map(({ label, value, icon: Icon, cls }) => (
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

      <LoadState loading={loading} error={error} onRetry={load} />

      {!loading && !error && (
        <div className="report-grid">
          <div className="card">
            <div className="card-header">
              <h3>Complaints by Category</h3>
            </div>
            <div className="card-body">
              {byCategory.map((c) => (
                <div className="bar-row" key={c.label}>
                  <div className="bar-label">{c.label}</div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(c.count / maxCat) * 100}%` }} />
                  </div>
                  <div className="bar-count">{c.count}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Complaints by Status</h3>
            </div>
            <div className="card-body donut-legend">
              {byStatus.map((s) => (
                <div className="legend-item" key={s.label}>
                  <span className="legend-dot" style={{ background: STATUS_COLORS[s.label] }} />
                  {s.label}
                  <span className="val">
                    {s.count} · {Math.round((s.count / total) * 100)}%
                  </span>
                </div>
              ))}
              <div style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                <div className="info-item">
                  <div className="label">Resolution rate</div>
                  <div className="value" style={{ fontSize: 24 }}>
                    {Math.round((byStatus[2].count / total) * 100)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
