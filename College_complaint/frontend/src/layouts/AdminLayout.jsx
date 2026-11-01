import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Clock,
  LoaderCircle,
  CheckCircle2,
  BarChart3,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
} from "lucide-react";
import { getSession, clearSession } from "../helpers.js";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/complaints", label: "All Complaints", icon: FileText },
  { to: "/admin/complaints?status=Pending", label: "Pending Complaints", icon: Clock },
  { to: "/admin/complaints?status=In%20Progress", label: "In Progress", icon: LoaderCircle },
  { to: "/admin/complaints?status=Resolved", label: "Resolved", icon: CheckCircle2 },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
];

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const session = getSession() || { name: "Administrator", email: "" };
  const initials = session.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const logout = () => {
    clearSession();
    navigate("/login");
  };

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-brand">
          <span className="brand-mark">
            <ShieldCheck size={22} />
          </span>
          <div>
            <div className="brand-name">CampusCare</div>
            <div className="brand-tag">Admin Console</div>
          </div>
        </div>
        <div className="sidebar-role">Administrator</div>
        <nav className="sidebar-nav">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={label}
              to={to}
              end={end}
              className={({ isActive }) =>
                `nav-item ${isActive && !to.includes("?") ? "active" : ""}`
              }
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="nav-item" onClick={logout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <div className={`backdrop ${open ? "show" : ""}`} onClick={() => setOpen(false)} />

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={19} />
          </button>
          <div className="topbar-welcome">
            <strong>Hello, {session.name.split(" ")[0]}</strong>
            <span>Review and resolve campus complaints</span>
          </div>
          <div className="search-box">
            <Search size={16} />
            <input
              type="search"
              placeholder="Search by ID, student or category…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="topbar-actions">
            <div className="topbar-user">
              <div className="avatar">{initials}</div>
              <div className="meta">
                <div className="name">{session.name}</div>
                <div className="role">Administrator</div>
              </div>
            </div>
          </div>
        </header>
        <Outlet context={{ query }} />
      </div>
    </div>
  );
}
