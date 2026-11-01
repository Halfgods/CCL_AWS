import { FileText } from "lucide-react";
import StatusBadge from "./StatusBadge.jsx";
import { displayId, formatDate } from "../helpers.js";

/**
 * Complaint table shared by the student and admin dashboards.
 *  - student view: ID / Category / Description / Submitted / Status
 *  - admin view:   ID / Student / Category / Status / Action
 */
export default function ComplaintTable({ complaints, variant = "student", onView }) {
  if (!complaints.length) {
    return (
      <div className="empty">
        <FileText size={34} />
        <div>No complaints found.</div>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          {variant === "admin" ? (
            <tr>
              <th>Complaint ID</th>
              <th>Student</th>
              <th>Category</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          ) : (
            <tr>
              <th>Complaint ID</th>
              <th>Category</th>
              <th>Description</th>
              <th>Submitted</th>
              <th>Status</th>
            </tr>
          )}
        </thead>
        <tbody>
          {complaints.map((c) =>
            variant === "admin" ? (
              <tr key={c.id}>
                <td className="cell-id" title={c.id}>
                  {displayId(c.id)}
                </td>
                <td>{c.studentName || "—"}</td>
                <td>{c.category}</td>
                <td>
                  <StatusBadge status={c.status} />
                </td>
                <td>
                  <button className="btn btn-outline btn-sm" onClick={() => onView(c)}>
                    View
                  </button>
                </td>
              </tr>
            ) : (
              <tr key={c.id} className="clickable" onClick={() => onView(c)}>
                <td className="cell-id" title={c.id}>
                  {displayId(c.id)}
                </td>
                <td>{c.category}</td>
                <td className="cell-desc" title={c.description}>
                  {c.description}
                </td>
                <td className="muted">{formatDate(c.createdAt)}</td>
                <td>
                  <StatusBadge status={c.status} />
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
