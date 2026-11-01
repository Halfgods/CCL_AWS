import { useState } from "react";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { login } from "../auth.js";

export default function Login() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    try {
      setLoading(true);
      setError("");
      await login();
    } catch (err) {
      console.error(err);
      setError("Unable to open the sign-in page. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="login">
      <div className="login-left">
        <div className="login-brand">
          <span className="brand-mark">
            <GraduationCap size={22} />
          </span>
          <div>
            <div className="brand-name">CampusCare</div>
            <div className="brand-tag">College Complaint Portal</div>
          </div>
        </div>

        <div className="login-copy">
          <h1>CampusCare</h1>
          <div className="tagline">
            A better campus begins with being heard.
          </div>
          <p className="blurb">
            Submit campus complaints, upload evidence, and track each
            complaint until it is resolved.
          </p>
        </div>
      </div>

      <div className="login-right">
        <div className="login-form">
          <ShieldCheck size={32} />
          <h2>Welcome back</h2>
          <p className="sub">
            Sign in securely using your CampusCare account.
          </p>

          {error && <div className="alert alert-error">{error}</div>}

          <button
            className="btn btn-primary btn-block"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? "Opening sign-in…" : "Sign in with Cognito"}
          </button>

          <p className="sub" style={{ marginTop: 20 }}>
            Your account permissions determine which portal you can access.
          </p>
        </div>
      </div>
    </div>
  );
}
