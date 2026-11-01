import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Send,
  ImagePlus,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { createComplaint, uploadEvidence } from "../api.js";
import { CATEGORIES, displayId, getSession } from "../helpers.js";

const MAX_MB = 5;

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Submit a complaint.
 *
 * Workflow matching the current backend contract:
 *   1. POST /api/complaints with { studentName, category, description }
 *      (title & location are collected but NOT sent — the API does not store
 *      them yet; they can be enabled once the backend supports those fields)
 *   2. Read the returned complaintId
 *   3. POST /api/complaints/<complaintId>/evidence with the selected photo
 *   4. Show the complaint ID + success message
 */
export default function SubmitComplaint() {
  const session = getSession() || { name: "" };
  const navigate = useNavigate();

  const [form, setForm] = useState({
    studentName: session.name || "",
    category: "",
    title: "",
    description: "",
    location: "",
  });
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [progress, setProgress] = useState(null); // null | 0-100
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null); // { complaintId, uploaded }
  const inputRef = useRef(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const pickFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!["image/jpeg", "image/png"].includes(f.type)) {
      setError("Evidence must be a JPG or PNG image.");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`Image must be smaller than ${MAX_MB} MB.`);
      return;
    }
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    e.target.value = "";
  };

  const removeFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setProgress(null);
  };

  const reset = () => {
    removeFile();
    setForm({ studentName: session.name || "", category: "", title: "", description: "", location: "" });
    setError(null);
    setDone(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.studentName.trim()) return setError("Please enter the student name.");
    if (!form.category) return setError("Please select a category.");
    if (!form.description.trim()) return setError("Please describe the complaint.");

    setSubmitting(true);
    setError(null);
    setProgress(file ? 0 : null);

    try {
      // Step 1 — required fields only (backend contract)
      const { complaintId } = await createComplaint({
        studentName: form.studentName.trim(),
        category: form.category,
        description: form.description.trim(),
      });

      // Step 2 — evidence photo (optional)
      let uploaded = false;
      let evidenceKey = null;
      if (file) {
        const res = await uploadEvidence(complaintId, file, setProgress);
        uploaded = true;
        evidenceKey = res && (res.evidenceKey || (res.complaint && res.complaint.evidenceKey));
      }
      setProgress(100);
      setDone({ complaintId, uploaded, evidenceKey });
    } catch (err) {
      setError(err.message || "Submission failed. Please try again.");
      setProgress(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <main className="page">
        <div className="submit-wrap">
          <div className="card card-pad success-panel">
            <div className="success-icon">
              <CheckCircle2 size={32} />
            </div>
            <h2>Complaint submitted successfully!</h2>
            <p className="muted" style={{ marginTop: 8 }}>
              Your complaint has been saved
              {done.uploaded ? " and your evidence photo was uploaded to S3" : ""}. You can track
              its progress from your dashboard.
            </p>
            <div className="id-chip">{displayId(done.complaintId)}</div>
            <div className="muted" style={{ fontSize: 12.5, wordBreak: "break-all" }}>
              {done.complaintId}
            </div>
            {done.evidenceKey && (
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                Evidence saved to private S3:{" "}
                <span style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>{done.evidenceKey}</span>
              </div>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 22, flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={() => navigate(`/complaints/${done.complaintId}`)}>
                <Eye size={16} /> Track this complaint
              </button>
              <button className="btn btn-outline" onClick={reset}>
                <RefreshCw size={16} /> Submit another
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="submit-wrap">
        <div className="card card-pad">
          <h2 className="form-card-title">Submit a Complaint</h2>
          <p className="form-card-sub">
            Tell us what went wrong — include a photo of the issue if you can.
          </p>

          <form className="field-grid" onSubmit={submit} noValidate>
            {error && (
              <div className="alert alert-error">
                <AlertTriangle size={16} /> {error}
              </div>
            )}

            <div className="form-row">
              <div className="field">
                <label htmlFor="studentName">Student Name</label>
                <input
                  id="studentName"
                  className="input"
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={form.studentName}
                  onChange={set("studentName")}
                />
              </div>
              <div className="field">
                <label htmlFor="category">Category</label>
                <select id="category" className="select" value={form.category} onChange={set("category")}>
                  <option value="">Select a category…</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label htmlFor="title">
                Complaint Title <span className="optional-tag">Preview only</span>
              </label>
              <input
                id="title"
                className="input"
                type="text"
                placeholder="e.g. Lift not working in Block B"
                value={form.title}
                onChange={set("title")}
              />
              <span className="hint">
                The backend does not store a title yet — only category, description and name are
                sent. A one-line summary of your description is recommended.
              </span>
            </div>

            <div className="field">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                className="textarea"
                placeholder="Describe the problem: what is broken, where exactly it is, and since when…"
                value={form.description}
                onChange={set("description")}
              />
            </div>

            <div className="field">
              <label htmlFor="location">
                Location <span className="optional-tag">Preview only</span>
              </label>
              <input
                id="location"
                className="input"
                type="text"
                placeholder="e.g. Block B, 2nd floor, near the library"
                value={form.location}
                onChange={set("location")}
              />
              <span className="hint">
                Not sent to the backend yet — this field will be enabled once the API supports it.
                For now, mention the location in your description.
              </span>
            </div>

            <div className="field">
              <label>Evidence Photo</label>
              {!file ? (
                <div
                  className="upload-zone"
                  onClick={() => inputRef.current && inputRef.current.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && inputRef.current.click()}
                >
                  <ImagePlus size={24} style={{ marginBottom: 6 }} />
                  <div>
                    <strong>Click to select</strong> a JPG or PNG photo of the problem
                  </div>
                  <div className="hint" style={{ marginTop: 4 }}>
                    Optional · max {MAX_MB} MB · you can preview or replace it before submitting
                  </div>
                </div>
              ) : (
                <div className="preview">
                  <img src={previewUrl} alt="Evidence preview" />
                  <div className="meta">
                    <div className="fname">{file.name}</div>
                    <div className="fsize">{formatBytes(file.size)}</div>
                    {progress !== null && (
                      <>
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="fsize">
                          {progress < 100 ? `Uploading… ${progress}%` : "Uploaded ✓"}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="upload-actions">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => inputRef.current.click()}
                      disabled={submitting}
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={removeFile}
                      disabled={submitting}
                      aria-label="Remove image"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png"
                hidden
                onChange={pickFile}
              />
            </div>

            <button className="btn btn-accent btn-block" type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <RefreshCw size={16} className="spin" /> Submitting…
                </>
              ) : (
                <>
                  <Send size={16} /> Submit
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
