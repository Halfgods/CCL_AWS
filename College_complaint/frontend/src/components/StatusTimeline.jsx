import { Check } from "lucide-react";

/**
 * Vertical status timeline: Submitted → Pending → In Progress → Resolved.
 * The current status returned by the API is highlighted. Per-step timestamps
 * need extra backend fields, so steps before the current one are shown as
 * completed without dates.
 */
export default function StatusTimeline({ status }) {
  const order = ["Pending", "In Progress", "Resolved"];
  const currentIdx = order.indexOf(status);
  const steps = [{ label: "Complaint Submitted" }, ...order.map((s) => ({ label: s, status: s }))];

  return (
    <div className="timeline">
      {steps.map((step, i) => {
        if (i === 0) {
          return (
            <div key="submitted" className="tl-step done">
              <span className="tl-dot">
                <Check size={15} />
              </span>
              <div>
                <div className="tl-title">Complaint Submitted</div>
                <div className="tl-sub">Recorded in DynamoDB</div>
              </div>
            </div>
          );
        }
        const idx = i - 1;
        const done = currentIdx >= idx && currentIdx !== -1;
        const current = currentIdx === idx;
        return (
          <div key={step.status} className={`tl-step ${done ? "done" : ""} ${current ? "current" : ""}`}>
            <span className="tl-dot">
              {done ? <Check size={15} /> : <span style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor" }} />}
            </span>
            <div>
              <div className="tl-title">{step.label}</div>
              {current && <div className="tl-sub">Current status</div>}
              {!done && !current && <div className="tl-sub">Awaiting</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
