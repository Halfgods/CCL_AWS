import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FilePlus2,
  FileText,
  Bell,
  User,
  LogOut,
  Menu,
  Search,
  GraduationCap,
} from "lucide-react";
import { getSession, clearSession } from "../helpers.js";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/submit", label: "Submit Complaint", icon: FilePlus2 },
  { to: "/complaints", label: "My Complaints", icon: FileText },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
];

export default function StudentLayout() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const session = getSession() || { name: "Student", email: "" };
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
            <GraduationCap size={22} />
          </span>
          <div>
            <div className="brand-name">CampusCare</div>
            <div className="brand-tag">Student Portal</div>
          </div>
        </div>
        <div className="sidebar-role">Student</div>
        <nav className="sidebar-nav">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
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
            <strong>Welcome back, {session.name.split(" ")[0]} 👋</strong>
            <span>Here's what's happening with your complaints</span>
          </div>
          <div className="search-box">
            <Search size={16} />
            <input
              type="search"
              placeholder="Search complaints by ID, category or status…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="topbar-actions">
            <button
              className="icon-btn"
              aria-label="Notifications"
              onClick={() => navigate("/notifications")}
            >
              <Bell size={18} />
              <span className="dot" />
            </button>
            <div className="topbar-user">
              <div className="avatar">{initials}</div>
              <div className="meta">
                <div className="name">{session.name}</div>
                <div className="role">Student</div>
              </div>
            </div>
          </div>
        </header>
        <Outlet context={{ query }} />
      </div>
    </div>
  );
}
