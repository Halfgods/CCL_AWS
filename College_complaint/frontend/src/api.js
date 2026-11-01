/**
 * CampusCare API helper.
 * Sends the Cognito access token with every protected API request.
 *
 * All calls use RELATIVE paths (e.g. fetch("/api/complaints")) so the app works
 * behind Nginx on EC2 without hardcoding the instance IP. In local dev, Vite
 * proxies /api/ to the Flask server.
 */

import { getAccessToken } from "./auth.js";

const jsonHeaders = { "Content-Type": "application/json" };

async function authHeaders(extraHeaders = {}) {
  const token = await getAccessToken();

  if (!token) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  return {
    ...extraHeaders,
    Authorization: `Bearer ${token}`,
  };
}

async function parseBody(res) {
  if (res.status === 204) return null;

  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function handle(res) {
  const body = await parseBody(res);

  if (!res.ok) {
    const msg =
      (body && (body.error || body.message)) ||
      `Request failed with status ${res.status}`;

    const err = new Error(
      typeof msg === "string" ? msg : `Request failed (${res.status})`
    );

    err.status = res.status;
    err.body = body;
    throw err;
  }

  return body;
}

/** GET /api/complaints */
export async function listComplaints() {
  const headers = await authHeaders();

  const body = await handle(
    await fetch("/api/complaints", { headers })
  );

  return Array.isArray(body)
    ? body
    : (body && (body.complaints || body.items || body.data)) || [];
}

/** GET a complaint; fall back to searching the complaint list. */
export async function getComplaint(id) {
  const headers = await authHeaders();

  try {
    const body = await handle(
      await fetch(`/api/complaints/${encodeURIComponent(id)}`, {
        headers,
      })
    );

    const complaint = body && (body.complaint || body.data || body);

    if (complaint && (complaint.complaintId || complaint.id)) {
      return complaint;
    }
  } catch (err) {
    if (err.status && err.status !== 404) throw err;
  }

  const all = await listComplaints();

  const found = all.find(
    (complaint) => (complaint.complaintId || complaint.id) === id
  );

  if (!found) throw new Error("Complaint not found");

  return found;
}

/** POST /api/complaints */
export async function createComplaint(payload) {
  const headers = await authHeaders(jsonHeaders);

  const body = await handle(
    await fetch("/api/complaints", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    })
  );

  const complaint = body && (body.complaint || body.data || body);

  const id = complaint && (complaint.complaintId || complaint.id);

  if (!id) {
    throw new Error("Backend did not return a complaintId");
  }

  return { complaintId: id, complaint };
}

/** Upload evidence with progress reporting. */
export async function uploadEvidence(complaintId, file, onProgress) {
  const headers = await authHeaders();

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open(
      "POST",
      `/api/complaints/${encodeURIComponent(complaintId)}/evidence`
    );

    xhr.setRequestHeader("Authorization", headers.Authorization);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let body;

      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = xhr.responseText;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body);
      } else {
        const error = new Error(
          (body && (body.error || body.message)) ||
            `Upload failed (${xhr.status})`
        );

        error.status = xhr.status;
        reject(error);
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error during upload"));
    };

    xhr.onabort = () => {
      reject(new Error("Evidence upload was cancelled"));
    };

    const form = new FormData();
    form.append("photo", file);

    // Browser automatically sets the Content-Type and multipart boundary
    xhr.send(form);
  });
}

/** PATCH /api/complaints/<id>/status — administrator only. */
export async function updateComplaintStatus(complaintId, status) {
  const headers = await authHeaders(jsonHeaders);

  return handle(
    await fetch(
      `/api/complaints/${encodeURIComponent(complaintId)}/status`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status }),
      }
    )
  );
}

/** Retrieve evidence through the authenticated backend endpoint. */
export async function fetchEvidenceImage(complaintId) {
  try {
    const headers = await authHeaders();

    const response = await fetch(
      `/api/complaints/${encodeURIComponent(complaintId)}/evidence`,
      { headers }
    );

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "";

    // The backend redirects to a temporary, private S3 presigned URL
    if (!contentType.startsWith("image/")) return null;

    return URL.createObjectURL(await response.blob());
  } catch (error) {
    console.error("Evidence retrieval failed:", error);
    return null;
  }
}
