import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { userManager } from "../auth.js";
import { setSession } from "../helpers.js";

export default function AuthCallback() {
  const navigate = useNavigate();
  const started = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Prevent React StrictMode from processing the same
    // authorization callback twice.
    if (started.current) return;
    started.current = true;

    async function completeLogin() {
      try {
        const user = await userManager.signinRedirectCallback();

        if (!user || !user.access_token) {
          throw new Error("Cognito did not return an access token.");
        }

        const groups = user.profile["cognito:groups"] || [];
        const role = groups.includes("Admins") ? "admin" : "student";

        setSession({
          name:
            user.profile.name ||
            user.profile.email?.split("@")[0] ||
            "User",
          email: user.profile.email || "",
          role,
        });

        // Remove the authorization code from the browser URL.
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        navigate(role === "admin" ? "/admin" : "/", {
          replace: true,
        });
      } catch (err) {
        console.error("Cognito callback failed:", err);
        setError(
          err.message || "Sign-in failed. Return to login and try again."
        );
      }
    }

    completeLogin();
  }, [navigate]);

  if (error) {
    return (
      <main style={{ padding: 32 }}>
        <h2>Sign-in failed</h2>
        <p>{error}</p>
        <a href="/login">Return to login</a>
      </main>
    );
  }

  return <main style={{ padding: 32 }}>Completing sign-in…</main>;
}
