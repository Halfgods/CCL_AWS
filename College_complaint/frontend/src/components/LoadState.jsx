import { LoaderCircle, AlertTriangle } from "lucide-react";

/** Shared loading / error block so every page behaves consistently. */
export default function LoadState({ loading, error, onRetry, message = "Loading complaints…" }) {
  if (loading) {
    return (
      <div className="empty">
        <LoaderCircle size={26} className="spin" />
        <div>{message}</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="empty">
        <AlertTriangle size={30} />
        <div style={{ marginBottom: 10 }}>Could not reach the API: {error}</div>
        <button className="btn btn-outline btn-sm" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }
  return null;
}
