import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import StatusBadge from "../components/StatusBadge.jsx";
import StatusTimeline from "../components/StatusTimeline.jsx";
import EvidenceBox from "../components/EvidenceBox.jsx";
import LoadState from "../components/LoadState.jsx";
import { getComplaint } from "../api.js";
import { displayId, formatDateTime, normalizeComplaint } from "../helpers.js";

/**
 * Complaint detail + tracking page (accessible to both student and admin).
 * Shows the full ID, category, description, submission date, current status,
 * evidence photo and the status timeline.
 */
export default function ComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    getComplaint(id)
      .then((c) => setComplaint(normalizeComplaint(c)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <button className="link" onClick={() => navigate(-1)} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <ArrowLeft size={15} /> Back
          </button>
          <h2>Complaint Details</h2>
          <p className="sub">Track this complaint through each stage of resolution.</p>
        </div>
        {complaint && <StatusBadge status={complaint.status} />}
      </div>

      <LoadState loading={loading} error={error} onRetry={load} message="Loading complaint…" />

      {!loading && !error && complaint && (
        <div className="detail-grid">
          <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="info-grid">
              <div className="info-item">
                <div className="label">Complaint ID</div>
                <div className="value">{displayId(complaint.id)}</div>
                <div className="muted" style={{ fontSize: 11.5, fontFamily: "ui-monospace, Menlo, monospace", wordBreak: "break-all", marginTop: 3 }}>
                  {complaint.id}
                </div>
              </div>
              <div className="info-item">
                <div className="label">Status</div>
                <div className="value">
                  <StatusBadge status={complaint.status} />
                </div>
              </div>
              <div className="info-item">
                <div className="label">Category</div>
                <div className="value">{complaint.category}</div>
              </div>
              <div className="info-item">
                <div className="label">Submitted</div>
                <div className="value">{formatDateTime(complaint.createdAt)}</div>
              </div>
              <div className="info-item">
                <div className="label">Student</div>
                <div className="value">{complaint.studentName || "—"}</div>
              </div>
              {complaint.location && (
                <div className="info-item">
                  <div className="label">Location</div>
                  <div className="value">{complaint.location}</div>
                </div>
              )}
            </div>

            <div>
              <div className="label" style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.7, color: "var(--muted-2)", fontWeight: 700, marginBottom: 6 }}>
                Description
              </div>
              <div className="desc-box">{complaint.description || "No description provided."}</div>
            </div>

            <div>
              <div className="label" style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.7, color: "var(--muted-2)", fontWeight: 700, marginBottom: 6 }}>
                Evidence Photo
              </div>
              <EvidenceBox complaint={complaint} />
            </div>
          </div>

          <div className="card card-pad">
            <h3 style={{ fontSize: 16, marginBottom: 18 }}>Status Timeline</h3>
            <StatusTimeline status={complaint.status} />
            <div className="alert alert-info" style={{ marginTop: 20, fontSize: 12.5 }}>
              Per-step timestamps will appear once the backend records a status-change history.
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
