import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { FileText, Clock, LoaderCircle, CheckCircle2, Plus, Inbox } from "lucide-react";
import ComplaintTable from "../components/ComplaintTable.jsx";
import LoadState from "../components/LoadState.jsx";
import { listComplaints } from "../api.js";
import { getSession, normalizeComplaint } from "../helpers.js";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { query } = useOutletContext() || { query: "" };
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const session = getSession() || { name: "Student" };

  const load = () => {
    setLoading(true);
    setError(null);
    listComplaints()
      .then((rows) => setItems(rows.map(normalizeComplaint).filter(Boolean)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  /* Show only this student's complaints when the backend data has matching
     names; otherwise fall back to everything so the demo still shows data. */
  const mine = useMemo(() => {
    const matching = items.filter(
      (c) => c.studentName && session.name && c.studentName.toLowerCase() === session.name.toLowerCase()
    );
    return matching.length ? matching : items;
  }, [items, session.name]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? mine.filter((c) =>
        [displaySafe(c.id), c.category, c.status, c.description]
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
    : mine;

  const count = (s) => mine.filter((c) => c.status === s).length;
  const stats = [
    { label: "Total Complaints", value: mine.length, icon: FileText, cls: "navy" },
    { label: "Pending", value: count("Pending"), icon: Clock, cls: "orange" },
    { label: "In Progress", value: count("In Progress"), icon: LoaderCircle, cls: "blue" },
    { label: "Resolved", value: count("Resolved"), icon: CheckCircle2, cls: "green" },
  ];

  const recent = [...filtered]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 6);

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h2>Student Dashboard</h2>
          <p className="sub">Track your complaints from submission to resolution.</p>
        </div>
        <button className="btn btn-accent" onClick={() => navigate("/submit")}>
          <Plus size={16} /> Submit Complaint
        </button>
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
          <button className="link" onClick={() => navigate("/complaints")}>
            View all
          </button>
        </div>
        <LoadState loading={loading} error={error} onRetry={load} />
        {!loading && !error && (
          <ComplaintTable
            complaints={recent}
            variant="student"
            onView={(c) => navigate(`/complaints/${c.id}`)}
          />
        )}
        {!loading && !error && !recent.length && (
          <div className="empty">
            <Inbox size={32} />
            <div style={{ marginBottom: 12 }}>No complaints yet — be the first to report an issue.</div>
            <button className="btn btn-accent btn-sm" onClick={() => navigate("/submit")}>
              <Plus size={15} /> Submit a Complaint
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function displaySafe(id) {
  if (!id) return "";
  return `CC-${String(id).replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}
