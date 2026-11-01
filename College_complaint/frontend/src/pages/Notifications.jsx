import { useEffect, useMemo, useState } from "react";
import { Bell, Mail, CheckCircle2, UploadCloud } from "lucide-react";
import LoadState from "../components/LoadState.jsx";
import { listComplaints } from "../api.js";
import { displayId, formatDate, getSession, normalizeComplaint } from "../helpers.js";

/**
 * Notification feed derived from the student's complaints.
 * (Email alerts themselves are sent by SNS from the backend.)
 */
export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const session = getSession() || { name: "" };

  const load = () => {
    setLoading(true);
    setError(null);
    listComplaints()
      .then((rows) => setItems(rows.map(normalizeComplaint).filter(Boolean)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const feed = useMemo(() => {
    const mine = items.filter(
      (c) => !session.name || !c.studentName || c.studentName.toLowerCase() === session.name.toLowerCase()
    );
    const out = [];
    mine.forEach((c) => {
      out.push({
        id: `${c.id}-created`,
        icon: UploadCloud,
        text: `Complaint ${displayId(c.id)} (${c.category}) was submitted successfully.`,
        time: c.createdAt,
        unread: c.status !== "Resolved",
      });
      if (c.status !== "Pending") {
        out.push({
          id: `${c.id}-status`,
          icon: c.status === "Resolved" ? CheckCircle2 : Bell,
          text:
            c.status === "Resolved"
              ? `Complaint ${displayId(c.id)} has been resolved. Thank you for reporting!`
              : `Complaint ${displayId(c.id)} is now In Progress — our team is on it.`,
          time: c.createdAt,
          unread: c.status === "In Progress",
        });
      }
    });
    out.push({
      id: "sns",
      icon: Mail,
      text: "Email alerts for status changes are delivered through Amazon SNS.",
      time: null,
      unread: false,
    });
    return out.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
  }, [items, session.name]);

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h2>Notifications</h2>
          <p className="sub">Updates about your complaints and SNS email alerts.</p>
        </div>
      </div>

      <div className="card">
        <LoadState loading={loading} error={error} onRetry={load} message="Loading notifications…" />
        {!loading &&
          !error &&
          feed.map((n) => {
            const Icon = n.icon;
            return (
              <div className={`notif ${n.unread ? "unread" : ""}`} key={n.id}>
                <div className="notif-icon">
                  <Icon size={17} />
                </div>
                <div>
                  <div className="notif-text">{n.text}</div>
                  <div className="notif-time">{n.time ? formatDate(n.time) : "System"}</div>
                </div>
              </div>
            );
          })}
        {!loading && !error && !feed.length && (
          <div className="empty">
            <Bell size={30} />
            <div>No notifications yet.</div>
          </div>
        )}
      </div>
    </main>
  );
}
