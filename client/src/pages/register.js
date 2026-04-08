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

function Register({ onNavigate }) {
  const [form,    setFormState] = useState({ name: "", email: "", password: "", confirmPassword: "", role: "student" });
  const [loading, setLoading]   = useState(false);
  const [errors,  setErrors]    = useState({});

  const setField = (key, val) => {
    setFormState(prev => ({ ...prev, [key]: val }));
    setErrors(prev => ({ ...prev, [key]: "" }));
  };

  const handleRegister = async () => {
    const errs = {};
    if (!form.name.trim())           errs.name = "Full name is required.";
    const eErr = validateEmail(form.email);
    if (eErr)                         errs.email = eErr;
    const pErr = validatePassword(form.password);
    if (pErr)                         errs.password = pErr;
    if (!form.confirmPassword)        errs.confirmPassword = "Please confirm your password.";
    else if (form.password !== form.confirmPassword)
                                      errs.confirmPassword = "Passwords do not match.";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    setErrors({});
    try {
      const res = await fetch("http://localhost:5000/api/register-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role }),
      });
      if (!res.ok) throw new Error("Registration failed");
      alert("✅ Registered successfully! Please login.");
      onNavigate("login");
    } catch {
      setErrors({ general: "Registration failed. Email may already be in use." });
    } finally {
      setLoading(false);
    }
  };

  const errMsg = (key) =>
    errors[key] ? <div className="reg-err-msg">⚠️ {errors[key]}</div> : null;

  const passwordStrength = () => {
    if (!form.password) return null;
    return validatePassword(form.password)
      ? <div className="reg-pw-weak">⚠️ Add a special character (!, @, #…)</div>
      : <div className="reg-pw-strong">✅ Strong password!</div>;
  };

  return (
    <div className="rp-root">

      {/* ══════════════════════════════
          LEFT PANEL
      ══════════════════════════════ */}
      <div className="rp-left">

        {/* Brand top-left */}
        <div className="rp-brand">🎓 EventHub · Aurora University</div>

        {/* Centered content */}
        <div className="rp-left-body">

          <div className="rp-hero">
            <h1 className="rp-hero-title">Create<br/>Account</h1>
            <p className="rp-hero-sub">
              Join thousands of students and faculty. Discover, register, and manage campus events — all in one place.
            </p>
          </div>

          <ul className="rp-features">
            {[
              "Browse approved campus events",
              "Register with one click",
              "Get real-time notifications",
              "Track your event history",
            ].map(f => (
              <li key={f} className="rp-feature-item">
                <span className="rp-feature-check">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>

        </div>

        {/* Decorative blobs */}
        <div className="rp-blob rp-blob-1" />
        <div className="rp-blob rp-blob-2" />
      </div>

      {/* ══════════════════════════════
          RIGHT FORM PANEL
      ══════════════════════════════ */}
      <div className="rp-right">
        <div className="rp-card">

          {/* Logo */}
          <div className="rp-logo-row">
            <span className="rp-logo-icon">🎓</span>
            <span className="rp-logo-text">Event<span className="rp-logo-accent">Hub</span></span>
          </div>

          <h2 className="rp-card-title">Register Now</h2>
          <p className="rp-card-sub">
            Use your <span className="rp-email-accent">@au.edu.in</span> university email to get started.
          </p>

          {errors.general && (
            <div className="rp-alert">⚠️ {errors.general}</div>
          )}

          {/* ── Full Name ── */}
          <div className="rp-field">
            <label className="rp-label">Full Name <span className="rp-required">*</span></label>
            <div className="rp-input-wrap">
              <span className="rp-input-icon">👤</span>
              <input
                type="text"
                placeholder="e.g. Arjun Kumar"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                className={`rp-input ${errors.name ? "rp-input--err" : ""}`}
              />
            </div>
            {errMsg("name")}
          </div>

          {/* ── University Email ── */}
          <div className="rp-field">
            <label className="rp-label">University Email <span className="rp-required">*</span></label>
            <div className="rp-input-wrap">
              <span className="rp-input-icon">✉️</span>
              <input
                type="text"
                placeholder="yourname@au.edu.in"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                className={`rp-input ${errors.email ? "rp-input--err" : ""}`}
              />
            </div>
            {errMsg("email")}
          </div>

          {/* ── Password + Confirm (2-col) ── */}
          <div className="rp-grid-2">
            <div className="rp-field">
              <label className="rp-label">Password <span className="rp-required">*</span></label>
              <div className="rp-input-wrap">
                <span className="rp-input-icon">🔒</span>
                <input
                  type="password"
                  placeholder="8+ chars, include ! @ # $"
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  className={`rp-input ${errors.password ? "rp-input--err" : ""}`}
                />
              </div>
              {errors.password ? errMsg("password") : passwordStrength()}
            </div>

            <div className="rp-field">
              <label className="rp-label">Confirm Password <span className="rp-required">*</span></label>
              <div className="rp-input-wrap">
                <span className="rp-input-icon">🔒</span>
                <input
                  type="password"
                  placeholder="Re-enter password"
                  value={form.confirmPassword}
                  onChange={(e) => setField("confirmPassword", e.target.value)}
                  className={`rp-input ${errors.confirmPassword ? "rp-input--err" : ""}`}
                />
              </div>
              {form.confirmPassword && !errors.confirmPassword && form.password === form.confirmPassword
                ? <div className="reg-pw-strong">✅ Passwords match!</div>
                : errMsg("confirmPassword")}
            </div>
          </div>

          {/* ── Role Selector ── */}
          <div className="rp-field" style={{ marginTop: "4px" }}>
            <label className="rp-label">I am a… <span className="rp-required">*</span></label>
            <div className="rp-role-row">
              <button
                onClick={() => setField("role", "student")}
                className={`rp-role-btn ${form.role === "student" ? "rp-role-btn--active" : ""}`}>
                <span style={{ fontSize: "24px" }}>🎓</span>
                <span className="rp-role-label">Student</span>

              </button>
              <button
                onClick={() => setField("role", "faculty")}
                className={`rp-role-btn ${form.role === "faculty" ? "rp-role-btn--active" : ""}`}>
                <span style={{ fontSize: "24px" }}>👩‍🏫</span>
                <span className="rp-role-label">Faculty</span>

              </button>
            </div>
          </div>

          {/* ── Submit ── */}
          <button className="rp-submit" onClick={handleRegister} disabled={loading}>
            {loading ? "Creating your account…" : "Create Account →"}
          </button>

          <p className="rp-signin-row">
            Already have an account?{" "}
            <span className="rp-signin-link" onClick={() => onNavigate("login")}>Sign In</span>
          </p>

        </div>
      </div>
    </div>
  );
}

export default Register;