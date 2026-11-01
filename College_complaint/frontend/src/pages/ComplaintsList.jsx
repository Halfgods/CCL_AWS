import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { Filter } from "lucide-react";
import ComplaintTable from "../components/ComplaintTable.jsx";
import LoadState from "../components/LoadState.jsx";
import AdminViewModal from "../components/AdminViewModal.jsx";
import { listComplaints } from "../api.js";
import { CATEGORIES, STATUSES, getSession, normalizeComplaint } from "../helpers.js";

/**
 * Student "My Complaints" and Admin "All Complaints".
 * Admin variant adds category / status / date filters and the View modal.
 */
export default function ComplaintsList({ variant = "student" }) {
  const isAdmin = variant === "admin";
  const navigate = useNavigate();
  const { query } = useOutletContext() || { query: "" };
  const [params, setParams] = useSearchParams();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  const [category, setCategory] = useState("");
  const [status, setStatus] = useState(params.get("status") || "");
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

  // Sidebar links like /admin/complaints?status=Pending drive the filter.
  useEffect(() => {
    setStatus(params.get("status") || "");
  }, [params]);

  const session = getSession() || { name: "" };

  const rows = useMemo(() => {
    let list = items;
    if (!isAdmin) {
      const mine = list.filter(
        (c) => c.studentName && session.name && c.studentName.toLowerCase() === session.name.toLowerCase()
      );
      if (mine.length) list = mine;
    }
    if (category) list = list.filter((c) => c.category === category);
    if (status) list = list.filter((c) => c.status === status);
    if (fromDate) {
      const start = new Date(fromDate).setHours(0, 0, 0, 0);
      list = list.filter((c) => c.createdAt && new Date(c.createdAt).getTime() >= start);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((c) =>
        [c.id, `CC-${String(c.id).replace(/-/g, "").slice(0, 6).toUpperCase()}`, c.studentName, c.category, c.status, c.description]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    return [...list].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [items, isAdmin, category, status, fromDate, query, session.name]);

  const onFilterStatus = (v) => {
    setStatus(v);
    if (v) setParams({ status: v });
    else setParams({});
  };

  const open = (c) => (isAdmin ? setSelected(c) : navigate(`/complaints/${c.id}`));

  const onUpdated = (updated) => {
    setItems((prev) => prev.map((c) => (c.id === updated.id ? { ...c, status: updated.status } : c)));
    setSelected((prev) => (prev && prev.id === updated.id ? { ...prev, status: updated.status } : prev));
  };

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h2>{isAdmin ? "All Complaints" : "My Complaints"}</h2>
          <p className="sub">
            {rows.length} of {items.length} complaint{items.length === 1 ? "" : "s"} shown
          </p>
        </div>
        {isAdmin && (
          <div className="filters">
            <Filter size={16} className="muted" />
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select className="select" value={status} onChange={(e) => onFilterStatus(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              id="list-date-filter"
              name="list-date-filter"
              className="input"
              type="date"
              title="Submitted from"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="card">
        <LoadState loading={loading} error={error} onRetry={load} />
        {!loading && !error && (
          <ComplaintTable complaints={rows} variant={variant} onView={open} />
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
