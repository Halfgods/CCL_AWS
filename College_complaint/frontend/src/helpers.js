/** Shared helpers: status constants, ID labels, formatting, session. */

export const STATUSES = ["Pending", "In Progress", "Resolved"];

export const CATEGORIES = [
  "Infrastructure",
  "Electrical",
  "Plumbing",
  "Cleanliness",
  "IT and Wi-Fi",
  "Classroom Equipment",
  "Other",
];

export const STATUS_CLASS = {
  Pending: "badge badge-pending",
  "In Progress": "badge badge-progress",
  Resolved: "badge badge-resolved",
};

export function statusClass(status) {
  return STATUS_CLASS[status] || "badge badge-pending";
}

/**
 * The backend stores UUID complaint IDs. We keep the UUID as the real ID and
 * derive a short human-friendly display label (e.g. CC-1A2B3C) for tables —
 * the database ID is never changed.
 */
export function displayId(id) {
  if (!id) return "—";
  const compact = String(id).replace(/-/g, "").slice(0, 6).toUpperCase();
  return `CC-${compact}`;
}

/** Normalize the many possible backend field spellings to one shape. */
export function normalizeComplaint(c) {
  if (!c) return null;
  return {
    ...c,
    id: c.complaintId || c.id || c.complaint_id || "",
    studentName: c.studentName || c.student_name || c.name || "",
    category: c.category || "Other",
    description: c.description || c.title || "",
    title: c.title || "",
    location: c.location || "",
    status: STATUSES.includes(c.status) ? c.status : "Pending",
    createdAt:
      c.createdAt ||
      c.created_at ||
      c.submittedAt ||
      c.submitted_at ||
      c.date ||
      c.timestamp ||
      null,
    evidenceKey:
      c.evidenceKey || c.evidence_key || c.s3Key || c.s3_key || c.evidence || null,
  };
}

export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ---------------- Prototype session (NOT real authentication) ----------------
 * Amazon Cognito is not wired up yet. This only stores a name/role in
 * sessionStorage so the two demo layouts can be shown. The backend must verify
 * identity and permissions itself — this is NOT access control.
 */
const KEY = "campuscare.session";

export function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY)) || null;
  } catch {
    return null;
  }
}

export function setSession(session) {
  sessionStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession() {
  sessionStorage.removeItem(KEY);
}
