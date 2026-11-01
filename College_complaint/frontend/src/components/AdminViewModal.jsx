import { useEffect, useState } from "react";
import { X, RefreshCw } from "lucide-react";
import StatusBadge from "./StatusBadge.jsx";
import EvidenceBox from "./EvidenceBox.jsx";
import StatusTimeline from "./StatusTimeline.jsx";
import { updateComplaintStatus } from "../api.js";
import { STATUSES, displayId, formatDateTime, normalizeComplaint } from "../helpers.js";

/**
 * Admin "View" modal: description + evidence photo + status dropdown.
 * Calls PATCH /api/complaints/<id>/status with { status }.
 *
 * SECURITY: this endpoint does not yet verify administrator permissions.
 * Until Cognito + backend authorization are in place, this panel is a
 * demonstration interface, not a secure administrative system.
 */
export default function AdminViewModal({ complaint, onClose, onUpdated }) {
  const c = normalizeComplaint(complaint);
  const [status, setStatus] = useState(c.status);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    setStatus(c.status);
    setMsg(null);
  }, [c.id, c.status]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await updateComplaintStatus(c.id, status);
      setMsg({ type: "success", text: `Status updated to "${status}".` });
      onUpdated && onUpdated({ ...c, status });
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Failed to update status." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <div>
            <h3>Complaint {displayId(c.id)}</h3>
            <div className="muted" style={{ fontSize: 12.5 }}>
              {c.studentName || "Unknown student"} · {c.category}
            </div>
          </div>
          <button className="close-x" onClick={onClose} aria-label="Close">
            <X size={17} />
          </button>
        </div>

        <div className="modal-body">
          {msg && (
            <div className={`alert alert-${msg.type === "success" ? "success" : "error"}`}>
              {msg.text}
            </div>
          )}

          <div className="info-grid">
            <div className="info-item">
              <div className="label">Full complaint ID</div>
              <div className="value" style={{ fontSize: 12.5, fontFamily: "ui-monospace, Menlo, monospace" }}>
                {c.id || "—"}
              </div>
            </div>
            <div className="info-item">
              <div className="label">Submitted</div>
              <div className="value">{formatDateTime(c.createdAt)}</div>
            </div>
            <div className="info-item">
              <div className="label">Category</div>
              <div className="value">{c.category}</div>
            </div>
            <div className="info-item">
              <div className="label">Current status</div>
              <div className="value">
                <StatusBadge status={c.status} />
              </div>
            </div>
          </div>

          <div>
            <div className="label" style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.7, color: "var(--muted-2)", fontWeight: 700, marginBottom: 6 }}>
              Description
            </div>
            <div className="desc-box">{c.description || "No description provided."}</div>
          </div>

          <div>
            <div className="label" style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.7, color: "var(--muted-2)", fontWeight: 700, marginBottom: 6 }}>
              Evidence photo
            </div>
            <EvidenceBox complaint={c} />
          </div>

          <div>
            <div className="label" style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.7, color: "var(--muted-2)", fontWeight: 700, marginBottom: 6 }}>
              Status timeline
            </div>
            <StatusTimeline status={c.status} />
          </div>

          <div className="field">
            <label htmlFor="status-select">Update status</label>
            <select
              id="status-select"
              className="select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Close
          </button>
          <button
            className="btn btn-accent"
            onClick={save}
            disabled={saving || status === c.status}
          >
            {saving ? <RefreshCw size={15} className="spin" /> : null}
            {saving ? "Updating…" : "Update Status"}
          </button>
        </div>
      </div>
    </div>
  );
}
