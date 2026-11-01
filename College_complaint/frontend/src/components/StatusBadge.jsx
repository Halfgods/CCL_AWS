import { statusClass } from "../helpers.js";

export default function StatusBadge({ status }) {
  return <span className={statusClass(status)}>{status}</span>;
}
