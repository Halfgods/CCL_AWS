import { useState } from "react";
import { Save } from "lucide-react";
import { getSession, setSession } from "../helpers.js";

/** Student profile — name/email stored in the prototype session only. */
export default function Profile() {
  const session = getSession() || { name: "Student", email: "" };
  const [name, setName] = useState(session.name);
  const [email, setEmail] = useState(session.email || "");
  const [saved, setSaved] = useState(false);

  const save = (e) => {
    e.preventDefault();
    setSession({ ...session, name: name.trim() || session.name, email: email.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const initials = (name || "S")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h2>Profile</h2>
          <p className="sub">Your account details on this device.</p>
        </div>
      </div>

      <div className="card card-pad" style={{ maxWidth: 640 }}>
        <div className="profile-head" style={{ marginBottom: 24 }}>
          <div className="avatar avatar-lg">{initials}</div>
          <div>
            <h3 style={{ fontSize: 19 }}>{name}</h3>
            <div className="muted" style={{ fontSize: 13.5 }}>
              Student · CampusCare Portal
            </div>
          </div>
        </div>

        <form className="field-grid" onSubmit={save}>
          {saved && <div className="alert alert-success">Profile saved on this device.</div>}
          <div className="field">
            <label htmlFor="pname">Full name</label>
            <input id="pname" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pmail">Email address</label>
            <input
              id="pmail"
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" type="submit" style={{ alignSelf: "flex-start" }}>
            <Save size={16} /> Save changes
          </button>
        </form>

        <div className="proto-note" style={{ marginTop: 24 }}>
          Cognito authentication is not connected yet — these details are stored in sessionStorage
          for the prototype and are not synced to any backend or identity provider.
        </div>
      </div>
    </main>
  );
}
