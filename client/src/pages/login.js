import { useState } from "react";

const API = process.env.REACT_APP_API || "";

const validateEmail = (email) => {
  if (!email.trim()) return "Email is required.";
  if (!/^[a-zA-Z0-9._%+-]+@au\.edu\.in$/.test(email.trim()))
    return "Email must be in the format: yourname@au.edu.in";
  return "";
};

const validatePassword = (password) => {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password))
    return "Password must contain at least one special character (!, @, #, $ etc.)";
  return "";
};

function Login({ onLogin, onNavigate }) {
  const [lampOn,   setLampOn]   = useState(false);
  const [pulling,  setPulling]  = useState(false);
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [passErr,  setPassErr]  = useState("");

  const pullCord = () => {
    if (pulling) return;
    setPulling(true);
    setTimeout(() => {
      setLampOn(prev => !prev);
      setPulling(false);
    }, 350);
  };

  const handleLogin = async () => {
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setEmailErr(eErr);
    setPassErr(pErr);
    if (eErr || pErr) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) throw new Error("Invalid credentials");
      const user = await res.json();
      onLogin(user);
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const errBox = (msg) =>
    msg ? <div className="lp-err-msg">⚠️ {msg}</div> : null;

  return (
    <div className={`lp-root ${lampOn ? "lp-root--on" : "lp-root--off"}`}>

      {/* Background glow orb */}
      <div className={`lp-bg-glow ${lampOn ? "lp-bg-glow--on" : ""}`} />

      {/* ══════════════ MAIN CARD ══════════════ */}
      <div className={`lp-card ${lampOn ? "lp-card--on" : ""}`}>

        {/* SIDE-BY-SIDE layout when lamp is ON */}
        <div className={`lp-inner ${lampOn ? "lp-inner--on" : ""}`}>

        {/* LEFT: Lamp + hint */}
        <div className="lp-lamp-section">

          <div className="lp-lamp-wrap" onClick={pullCord} title="Pull the cord!">
            <svg viewBox="0 0 160 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="lp-lamp-svg">

              {/* Inner glow when on */}
              {lampOn && (
                <ellipse cx="80" cy="88" rx="36" ry="14" fill="#fef08a" opacity="0.5">
                  <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2.5s" repeatCount="indefinite"/>
                </ellipse>
              )}

              {/* Shade */}
              <path d="M28 92 L50 28 L110 28 L132 92 Z"
                fill={lampOn ? "#4ade80" : "#2d3748"}
                stroke={lampOn ? "#16a34a" : "#4a5568"} strokeWidth="2.5"
                style={{transition:"fill 0.4s,stroke 0.4s"}}/>
              {/* Top rim */}
              <ellipse cx="80" cy="28" rx="30" ry="7"
                fill={lampOn ? "#22c55e" : "#2d3748"}
                stroke={lampOn ? "#15803d" : "#4a5568"} strokeWidth="2"
                style={{transition:"fill 0.4s"}}/>
              {/* Bottom rim */}
              <ellipse cx="80" cy="92" rx="52" ry="11"
                fill={lampOn ? "#15803d" : "#1a202c"}
                stroke={lampOn ? "#166534" : "#2d3748"} strokeWidth="2"
                style={{transition:"fill 0.4s"}}/>

              {/* Eyes */}
              <circle cx="64" cy="56" r="5.5" fill={lampOn ? "#14532d" : "#718096"}
                style={{transition:"fill 0.4s"}}/>
              <circle cx="96" cy="56" r="5.5" fill={lampOn ? "#14532d" : "#718096"}
                style={{transition:"fill 0.4s"}}/>
              {/* Eye shine */}
              <circle cx="66" cy="54" r="1.8" fill="white" opacity={lampOn ? 0.9 : 0.2}
                style={{transition:"opacity 0.4s"}}/>
              <circle cx="98" cy="54" r="1.8" fill="white" opacity={lampOn ? 0.9 : 0.2}
                style={{transition:"opacity 0.4s"}}/>

              {/* Mouth */}
              {lampOn
                ? <path d="M66 70 Q80 82 94 70" stroke="#14532d" strokeWidth="3" strokeLinecap="round" fill="none"/>
                : <line x1="66" y1="72" x2="94" y2="72" stroke="#718096" strokeWidth="3" strokeLinecap="round"/>
              }
              {/* Blush */}
              {lampOn && (
                <>
                  <ellipse cx="55" cy="67" rx="7" ry="4" fill="#fda4af" opacity="0.65"/>
                  <ellipse cx="105" cy="67" rx="7" ry="4" fill="#fda4af" opacity="0.65"/>
                </>
              )}

              {/* Pole */}
              <rect x="76" y="92" width="8" height="102" rx="4"
                fill={lampOn ? "#cbd5e1" : "#2d3748"}
                style={{transition:"fill 0.4s"}}/>

              {/* Base disk */}
              <ellipse cx="80" cy="198" rx="40" ry="11"
                fill={lampOn ? "#e2e8f0" : "#2d3748"}
                stroke={lampOn ? "#cbd5e1" : "#4a5568"} strokeWidth="1.5"
                style={{transition:"fill 0.4s"}}/>
              <ellipse cx="80" cy="193" rx="28" ry="7"
                fill={lampOn ? "#f1f5f9" : "#4a5568"}
                style={{transition:"fill 0.4s"}}/>

              {/* Cord */}
              <line x1="80" y1="92" x2="80" y2={pulling ? "136" : "122"}
                stroke={lampOn ? "#fde047" : "#a0aec0"} strokeWidth="2.5" strokeLinecap="round"
                style={{transition:"stroke 0.4s"}}/>
              {/* Cord handle */}
              <circle cx="80" cy={pulling ? "142" : "128"} r="6"
                fill={lampOn ? "#fde047" : "#a0aec0"}
                stroke={lampOn ? "#b45309" : "#718096"} strokeWidth="2"
                style={{transition:"fill 0.4s,stroke 0.4s,cy 0.25s ease"}}/>
            </svg>

            {/* Ripple click effect */}
            <div className={`lp-lamp-ripple ${pulling ? "lp-lamp-ripple--active" : ""}`}/>
          </div>

          <p className={`lp-hint ${lampOn ? "lp-hint--on" : ""}`}>
            {lampOn ? "" : "🪢 Pull the cord"}
          </p>

        </div>

        {/* RIGHT: FORM SECTION — hidden until lamp on */}
        <div className={`lp-form-section ${lampOn ? "lp-form-section--visible" : ""}`}>

          <div className="lp-form-header">
            <div className="lp-logo-row">
              <span className="lp-logo-icon">🎓</span>
              <span className="lp-logo-text">Event<span className="lp-logo-accent">Hub</span></span>
            </div>
            <h2 className="lp-form-title">Welcome Back 👋</h2>
            <p className="lp-form-sub">Sign in to access your dashboard and events.</p>
          </div>

          {error && <div className="lp-error-box">⚠️ {error}</div>}

          <div className="lp-fields">
            <div className="lp-field">
              <label className="lp-label">Email Address</label>
              <div className="lp-input-wrap">
                <span className="lp-input-icon">✉️</span>
                <input className="lp-input" type="text" placeholder="yourname@au.edu.in"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailErr(""); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  style={{ borderColor: emailErr ? "#ef4444" : "" }} />
              </div>
              {errBox(emailErr)}
            </div>

            <div className="lp-field">
              <div className="lp-label-row">
                <label className="lp-label">Password</label>
                <span className="lp-forgot">Forgot Password?</span>
              </div>
              <div className="lp-input-wrap">
                <span className="lp-input-icon">🔒</span>
                <input className="lp-input" type="password" placeholder="8+ chars with special character"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPassErr(""); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  style={{ borderColor: passErr ? "#ef4444" : "" }} />
              </div>
              {errBox(passErr)}
            </div>
          </div>

          <label className="lp-remember">
            <input type="checkbox" style={{ accentColor: "#4f46e5" }} />
            <span>Remember Me</span>
          </label>

          <button className="lp-signin-btn" onClick={handleLogin} disabled={loading}>
            {loading ? "Signing in…" : "Sign In →"}
          </button>

          <div className="lp-or-row">
            <div className="lp-or-line" />
            <span className="lp-or-text">Quick Login</span>
            <div className="lp-or-line" />
          </div>

          <div className="lp-role-row">
            {[
              { label: "👨‍💼 Admin",   email: "admin@au.edu.in",   cls: "lp-pill-admin" },
              { label: "👩‍🏫 Faculty", email: "faculty@au.edu.in", cls: "lp-pill-faculty" },
              { label: "🎓 Student", email: "student@au.edu.in", cls: "lp-pill-student" },
            ].map(r => (
              <button key={r.label}
                className={`lp-role-pill ${r.cls}`}
                onClick={() => { setEmail(r.email); setEmailErr(""); setError(""); }}>
                {r.label}
              </button>
            ))}
          </div>

          <p className="lp-register-text">
            Don't have an account?{" "}
            <span className="lp-register-link" onClick={() => onNavigate("register")}>
              Create Account
            </span>
          </p>

        </div>

        </div>{/* end lp-inner */}
      </div>

    </div>
  );
}

export default Login;