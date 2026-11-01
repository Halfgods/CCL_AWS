import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { getSession } from "./helpers.js";
import StudentLayout from "./layouts/StudentLayout.jsx";
import AdminLayout from "./layouts/AdminLayout.jsx";
import Login from "./pages/Login.jsx";
import AuthCallback from "./pages/AuthCallback.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";
import SubmitComplaint from "./pages/SubmitComplaint.jsx";
import ComplaintsList from "./pages/ComplaintsList.jsx";
import ComplaintDetail from "./pages/ComplaintDetail.jsx";
import Notifications from "./pages/Notifications.jsx";
import Profile from "./pages/Profile.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import Reports from "./pages/Reports.jsx";

/** Prototype route guard — sessionStorage only. NOT real access control. */
function RequireRole({ role, children }) {
  const session = getSession();
  const location = useLocation();
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  if (session.role !== role) {
    return <Navigate to={session.role === "admin" ? "/admin" : "/"} replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route
        path="/"
        element={
          <RequireRole role="student">
            <StudentLayout />
          </RequireRole>
        }
      >
        <Route index element={<StudentDashboard />} />
        <Route path="submit" element={<SubmitComplaint />} />
        <Route path="complaints" element={<ComplaintsList />} />
        <Route path="complaints/:id" element={<ComplaintDetail />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route
        path="/admin"
        element={
          <RequireRole role="admin">
            <AdminLayout />
          </RequireRole>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="complaints" element={<ComplaintsList variant="admin" />} />
        <Route path="complaints/:id" element={<ComplaintDetail />} />
        <Route path="reports" element={<Reports />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
