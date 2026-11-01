import { useEffect, useState } from "react";
import { ImageOff, LoaderCircle } from "lucide-react";
import { fetchEvidenceImage } from "../api.js";

/**
 * Evidence photo viewer.
 *
 * The S3 bucket is private, so we never build a public S3 URL. We try the
 * backend first (an authenticated endpoint / presigned URL can be added later);
 * while that endpoint doesn't exist we show a placeholder with the stored
 * object key so the flow is still demonstrable.
 */
export default function EvidenceBox({ complaint }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    let objectUrl = null;
    setLoading(true);
    fetchEvidenceImage(complaint.id).then((u) => {
      if (!alive) {
        if (u) URL.revokeObjectURL(u);
        return;
      }
      objectUrl = u;
      setUrl(u);
      setLoading(false);
    });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [complaint.id]);

  if (loading) {
    return (
      <div className="evidence-frame">
        <LoaderCircle size={22} className="spin" />
        <div>Loading evidence…</div>
      </div>
    );
  }

  if (url) {
    return (
      <div className="evidence-frame has-img">
        <img src={url} alt="Complaint evidence" />
      </div>
    );
  }

  return (
    <div className="evidence-frame">
      <ImageOff size={26} />
      <div>
        <strong>Evidence photo is stored in a private S3 bucket.</strong>
        <br />
        An authenticated evidence-viewing endpoint (or presigned URL) is not
        implemented yet — no public S3 link is generated.
      </div>
      {complaint.evidenceKey && (
        <div className="key" title={complaint.evidenceKey}>
          {String(complaint.evidenceKey)}
        </div>
      )}
      {!complaint.evidenceKey && (
        <div className="key">No evidence uploaded for this complaint</div>
      )}
    </div>
  );
}
