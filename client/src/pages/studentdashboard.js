import { useEffect, useState } from "react";

const API = process.env.REACT_APP_API || "";
const get = (url) => fetch(API + url).then(r => r.json());

const SCHOOLS  = ["School of Engineering", "School of Informatics"];
const PROGRAMS = ["B.Tech", "MCA", "MBA", "M.Tech", "BCA", "BBA"];
const YEARS    = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const DEPTS    = ["Computer Science", "Information Technology", "Electronics", "Mechanical", "Civil", "Electrical", "Management"];
const SECTIONS = ["A", "B", "C", "D"];

const emptyForm = { phone:"", studentRoll:"", school:"", program:"", year:"", department:"", section:"" };

function StudentDashboard({ onLogout }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [events, setEvents]               = useState([]);
  const [myEvents, setMyEvents]           = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [activeTab, setActiveTab]         = useState("browse");
  const [showNotifs, setShowNotifs]       = useState(false);
  const [cancelling, setCancelling]       = useState(null);
  const [toast, setToast]                 = useState(null);

  const [regEvent, setRegEvent]     = useState(null);
  const [regForm, setRegForm]       = useState(emptyForm);
  const [regErrors, setRegErrors]   = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [viewEvent, setViewEvent]   = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchEvents   = () => get("/api/events").then(setEvents);
  const fetchMyEvents = () => { if (user.id) get(`/api/my-events/${user.id}`).then(setMyEvents); };
  const fetchNotifs   = () => {
    if (!user.id) return;
    get(`/api/notifications/${user.id}`).then(setNotifications);
    get(`/api/notifications/unread-count/${user.id}`).then(d => setUnreadCount(d.total));
  };

  useEffect(() => { fetchEvents(); fetchMyEvents(); fetchNotifs(); }, []);

  const isRegistered = (id) => myEvents.some(e => e.id === id);

  const openRegForm = (event) => {
    setRegEvent(event);
    setRegForm(emptyForm);
    setRegErrors({});
  };

  const setField = (key, val) => {
    setRegForm(prev => ({ ...prev, [key]: val }));
    setRegErrors(prev => ({ ...prev, [key]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!regForm.phone.trim())       errs.phone = "Phone number is required";
    else if (!/^\d{10}$/.test(regForm.phone.trim())) errs.phone = "Enter valid 10-digit phone number";
    if (!regForm.studentRoll.trim()) errs.studentRoll = "Student Roll No. is required";
    if (!regForm.school)             errs.school = "Select your school";
    if (!regForm.program)            errs.program = "Select your program";
    if (!regForm.year)               errs.year = "Select your year";
    if (!regForm.department)         errs.department = "Select your department";
    if (!regForm.section)            errs.section = "Select your section";
    return errs;
  };

  const handleRegisterSubmit = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setRegErrors(errs); return; }
    setSubmitting(true);
    fetch(`${API}/api/register-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: regEvent.id, studentId: user.id, ...regForm }),
    })
      .then(r => r.ok ? r.text() : r.text().then(t => { throw new Error(t); }))
      .then(() => {
        showToast("🎟️ Successfully registered for " + regEvent.title + "!");
        setRegEvent(null);
        fetchMyEvents(); fetchEvents();
      })
      .catch(err => showToast(err.message || "Registration failed", "error"))
      .finally(() => setSubmitting(false));
  };

  const handleCancel = (eventId) => {
    if (!window.confirm("Cancel your registration for this event?")) return;
    setCancelling(eventId);
    fetch(`${API}/api/cancel-registration`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, studentId: user.id }),
    })
      .then(r => r.ok ? r.text() : r.text().then(t => { throw new Error(t); }))
      .then(() => { showToast("🗑️ Registration cancelled."); fetchMyEvents(); fetchEvents(); })
      .catch(err => showToast(err.message || "Cancel failed", "error"))
      .finally(() => setCancelling(null));
  };

  const handleBell = () => {
    setShowNotifs(v => !v);
    if (!showNotifs && unreadCount > 0) {
      fetch(`${API}/api/notifications/read/${user.id}`, { method:"PUT" })
        .then(() => { setUnreadCount(0); fetchNotifs(); });
    }
  };

  /* iStyle is data-driven (border color changes on error) — keep as function but minimal */
  const iStyle = (key) => ({
    borderColor: regErrors[key] ? "#ef4444" : "#e2e8f0",
  });

  const errMsg = (key) => regErrors[key]
    ? <div className="rf-err-msg">{regErrors[key]}</div>
    : null;

  const tabs = [
    { id:"browse",        label:"🔍 Browse Events" },
    { id:"myevents",      label:"🎟️ My Registrations" },
    { id:"notifications", label:"🔔 Notifications" },
  ];

  const notifBadge = (role) => {
    const m = { admin:{bg:"#ede9fe",c:"#5b21b6",l:"Admin"}, faculty:{bg:"#dbeafe",c:"#1e40af",l:"Faculty"}, student:{bg:"#d1fae5",c:"#065f46",l:"Student"}, system:{bg:"#f1f5f9",c:"#475569",l:"System"} };
    return m[role] || m.system;
  };

  const tabTitles = { browse:"Browse Events", myevents:"My Registrations", notifications:"Notifications" };

  return (
    <div className="dash-root">

      {/* TOAST */}
      {toast && (
        <div className={`dash-toast ${toast.type === "error" ? "dash-toast-error" : "dash-toast-success"}`}>
          {toast.msg}
        </div>
      )}

      {/* ── REGISTRATION FORM MODAL ── */}
      {regEvent && (
        <div className="rf-overlay"
          onClick={e => { if (e.target === e.currentTarget) setRegEvent(null); }}>
          <div className="rf-box">

            {/* header */}
            <div className="rf-header">
              <div>
                <div className="rf-header-meta">Event Registration Form</div>
                <h2 className="rf-header-title">{regEvent.title}</h2>
                <div className="rf-header-sub">
                  📅 {new Date(regEvent.date).toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"})}
                  &nbsp;|&nbsp;📍 {regEvent.venue || "TBD"}
                </div>
              </div>
              <button onClick={() => setRegEvent(null)} className="rf-close-btn">✕</button>
            </div>

            <div className="rf-body">

              {/* pre-filled info */}
              <div className="rf-prefilled">
                <div className="rf-prefilled-label">👤 Student Account Details</div>
                <div className="rf-prefilled-grid">
                  <div className="rf-prefilled-item"><b>Name:</b> {user.name}</div>
                  <div className="rf-prefilled-item"><b>Email:</b> {user.email}</div>
                </div>
              </div>

              <div className="rf-section-label">📋 Fill Registration Details</div>

              {/* Phone + Roll No */}
              <div className="rf-grid-2">
                <div>
                  <label className="rf-label">Phone Number *</label>
                  <input type="tel" placeholder="10-digit mobile no." value={regForm.phone} maxLength={10}
                    onChange={e => setField("phone", e.target.value)}
                    className="rf-input" style={iStyle("phone")} />
                  {errMsg("phone")}
                </div>
                <div>
                  <label className="rf-label">Student Roll No. *</label>
                  <input type="text" placeholder="e.g. 21CSE1001" value={regForm.studentRoll}
                    onChange={e => setField("studentRoll", e.target.value)}
                    className="rf-input" style={iStyle("studentRoll")} />
                  {errMsg("studentRoll")}
                </div>
              </div>

              {/* School + Program */}
              <div className="rf-grid-2">
                <div>
                  <label className="rf-label">School *</label>
                  <select value={regForm.school} onChange={e => setField("school", e.target.value)}
                    className="rf-input rf-select" style={iStyle("school")}>
                    <option value="">Select School</option>
                    {SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {errMsg("school")}
                </div>
                <div>
                  <label className="rf-label">Program *</label>
                  <select value={regForm.program} onChange={e => setField("program", e.target.value)}
                    className="rf-input rf-select" style={iStyle("program")}>
                    <option value="">Select Program</option>
                    {PROGRAMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {errMsg("program")}
                </div>
              </div>

              {/* Year + Dept + Section */}
              <div className="rf-grid-3">
                <div>
                  <label className="rf-label">Year *</label>
                  <select value={regForm.year} onChange={e => setField("year", e.target.value)}
                    className="rf-input rf-select" style={iStyle("year")}>
                    <option value="">Year</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  {errMsg("year")}
                </div>
                <div>
                  <label className="rf-label">Department *</label>
                  <select value={regForm.department} onChange={e => setField("department", e.target.value)}
                    className="rf-input rf-select" style={iStyle("department")}>
                    <option value="">Dept.</option>
                    {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  {errMsg("department")}
                </div>
                <div>
                  <label className="rf-label">Section *</label>
                  <select value={regForm.section} onChange={e => setField("section", e.target.value)}
                    className="rf-input rf-select" style={iStyle("section")}>
                    <option value="">Sec</option>
                    {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {errMsg("section")}
                </div>
              </div>

              <button onClick={handleRegisterSubmit} disabled={submitting}
                className={`rf-submit-btn ${submitting ? "rf-submit-btn--disabled" : ""}`}>
                {submitting ? "Submitting..." : "🎟️ Confirm Registration"}
              </button>
              <button onClick={() => setRegEvent(null)} className="rf-cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── EVENT DETAIL MODAL ── */}
      {viewEvent && (
        <div className="edm-overlay"
          onClick={e => { if (e.target === e.currentTarget) setViewEvent(null); }}>
          <div className="edm-box">

            {viewEvent.bannerImage
              ? <img src={`${API}/uploads/${viewEvent.bannerImage}`} alt="Banner" className="ved-banner-img" />
              : <div className="ved-banner-placeholder" />
            }

            <div className="ved-body">
              <div className="ved-title-row">
                <div>
                  <h2 className="ved-title">{viewEvent.title}</h2>
                  <div className="ved-faculty">by {viewEvent.facultyName}</div>
                </div>
                <button onClick={() => setViewEvent(null)} className="rf-close-btn">✕</button>
              </div>

              <div className="ved-info-grid">
                {[
                  {icon:"📅", label:"Date",       value: new Date(viewEvent.date).toLocaleDateString("en-IN",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})},
                  {icon:"📍", label:"Venue",      value: viewEvent.venue || "TBD"},
                  {icon:"👥", label:"Registered", value: `${viewEvent.registrationCount} students`},
                  viewEvent.expectedAttendees && {icon:"🎯", label:"Expected", value: `${viewEvent.expectedAttendees} attendees`},
                ].filter(Boolean).map((item,i) => (
                  <div key={i} className="ved-info-cell">
                    <div className="ved-info-label">{item.icon} {item.label}</div>
                    <div className="ved-info-value">{item.value}</div>
                  </div>
                ))}
              </div>

              {viewEvent.description && (
                <div className="ved-section">
                  <div className="ved-section-label">📋 About</div>
                  <div className="ved-desc-box">{viewEvent.description}</div>
                </div>
              )}

              {(viewEvent.guestName || viewEvent.guestBio) && (
                <div className="ved-section">
                  <div className="ved-section-label">🎤 Guest / Expert</div>
                  <div className="ved-guest-box">
                    {viewEvent.guestPhoto
                      ? <img src={`${API}/uploads/${viewEvent.guestPhoto}`} alt="Guest" className="ved-guest-photo" />
                      : <div className="ved-guest-avatar">{(viewEvent.guestName || "G").charAt(0)}</div>
                    }
                    <div>
                      {viewEvent.guestName && <div className="ved-guest-name">{viewEvent.guestName}</div>}
                      {viewEvent.guestBio  && <div className="ved-guest-bio">{viewEvent.guestBio}</div>}
                    </div>
                  </div>
                </div>
              )}

              {isRegistered(viewEvent.id)
                ? <div className="ved-registered-badge">✅ You are already registered for this event!</div>
                : <button onClick={() => { setViewEvent(null); openRegForm(viewEvent); }}
                    className="ved-register-btn">
                    🎟️ Register for this Event
                  </button>
              }
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <div className="dash-sidebar">
        <div className="dash-sidebar-header">
          <div className="dash-sidebar-logo">🎓 EventHub</div>
          <div className="dash-sidebar-subtitle">Student Portal</div>
        </div>

        {tabs.map(t => (
          <div key={t.id} onClick={() => setActiveTab(t.id)}
            className={`dash-sidebar-tab ${activeTab === t.id ? "active" : ""}`}>
            {t.label}
            {t.id === "notifications" && unreadCount > 0 && (
              <span className="dash-sidebar-badge">{unreadCount}</span>
            )}
          </div>
        ))}

        {/* Quick Stats box */}
        <div className="stu-stats-box">
          <div className="stu-stats-title">Quick Stats</div>
          <div className="stu-stats-row">
            <span className="stu-stats-label">Available</span>
            <span className="stu-stats-val-blue">{events.length}</span>
          </div>
          <div className="stu-stats-row">
            <span className="stu-stats-label">Registered</span>
            <span className="stu-stats-val-green">{myEvents.length}</span>
          </div>
        </div>

        <div className="dash-sidebar-footer">
          <div onClick={() => { localStorage.clear(); onLogout?.(); }} className="dash-sidebar-logout">🚪 Logout</div>
        </div>
      </div>

      {/* MAIN */}
      <div className="dash-main">

        {/* TOPBAR */}
        <div className="dash-topbar">
          <h2 className="dash-topbar-title">{tabTitles[activeTab]}</h2>
          <div className="dash-topbar-right">

            <div className="dash-bell-wrap">
              <div onClick={handleBell} className="dash-bell">
                🔔
                {unreadCount > 0 && <span className="dash-bell-badge">{unreadCount}</span>}
              </div>
              {showNotifs && (
                <div className="dash-notif-dropdown">
                  <div className="dash-notif-header">Notifications</div>
                  {notifications.length === 0
                    ? <div className="dash-notif-empty">No notifications</div>
                    : notifications.map(n => {
                        const b = notifBadge(n.senderRole);
                        return (
                          <div key={n.id} className={`dash-notif-item ${n.isRead ? "" : "unread"}`}>
                            <div className="dash-notif-row">
                              <div className="dash-notif-avatar" style={{background: b.c}}>
                                {(n.senderName || "S").charAt(0).toUpperCase()}
                              </div>
                              <span className="dash-notif-sender">{n.senderName || "System"}</span>
                              <span className="dash-notif-role-pill" style={{background: b.bg, color: b.c}}>{b.l}</span>
                            </div>
                            <div className="dash-notif-msg">{n.message}</div>
                            <div className="dash-notif-time">{new Date(n.createdAt).toLocaleString()}</div>
                          </div>
                        );
                      })}
                </div>
              )}
            </div>

            <div className="dash-user-chip">
              <div className="dash-user-avatar dash-user-avatar-student">S</div>
              <div>
                <div className="dash-user-name">{user.name || "Student"}</div>
                <div className="dash-user-email">{user.email}</div>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="dash-body">

          {/* ── BROWSE EVENTS ── */}
          {activeTab === "browse" && (
            events.length === 0
              ? <div className="stu-empty-card">
                  <div className="stu-empty-icon">📅</div>
                  <div className="stu-empty-text">No approved events yet. Check back later!</div>
                </div>
              : <div className="stu-ev-grid">
                  {events.map(event => {
                    const registered = isRegistered(event.id);
                    return (
                      <div key={event.id} className="stu-ev-card" onClick={() => setViewEvent(event)}>

                        {event.bannerImage
                          ? <div className="stu-ev-banner-wrap">
                              <img src={`${API}/uploads/${event.bannerImage}`} alt="Banner" className="stu-ev-banner-img" />
                              {registered && <div className="stu-ev-reg-badge">✅ Registered</div>}
                            </div>
                          : <div className="stu-ev-banner-grad">
                              <div className="stu-ev-banner-title">{event.title}</div>
                              <div className="stu-ev-banner-faculty">by {event.facultyName}</div>
                              {registered && <div className="stu-ev-reg-badge-alt">✅</div>}
                            </div>
                        }

                        <div className="stu-ev-body">
                          {event.bannerImage && (
                            <div className="stu-ev-title-block">
                              <div className="stu-ev-title">{event.title}</div>
                              <div className="stu-ev-faculty">by {event.facultyName}</div>
                            </div>
                          )}
                          {event.description && (
                            <p className="stu-ev-desc">
                              {event.description.substring(0,90)}{event.description.length > 90 ? "..." : ""}
                            </p>
                          )}
                          <div className="stu-ev-meta">
                            <div className="stu-ev-meta-item">📅 {new Date(event.date).toLocaleDateString("en-IN",{weekday:"short",year:"numeric",month:"long",day:"numeric"})}</div>
                            {event.venue     && <div className="stu-ev-meta-item">📍 {event.venue}</div>}
                            {event.guestName && <div className="stu-ev-meta-item stu-ev-meta-guest">🎤 {event.guestName}</div>}
                            <div className="stu-ev-meta-item">👥 {event.registrationCount} registered</div>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); if (!registered) openRegForm(event); }}
                            disabled={registered}
                            className={registered ? "stu-ev-btn-registered" : "stu-ev-btn-register"}>
                            {registered ? "✅ Registered" : "🎟️ Register Now"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
          )}

          {/* ── MY REGISTRATIONS ── */}
          {activeTab === "myevents" && (
            myEvents.length === 0
              ? <div className="stu-empty-card">
                  <div className="stu-empty-icon">🎟️</div>
                  <div className="stu-empty-text">No registrations yet!</div>
                </div>
              : <div className="stu-my-grid">
                  {myEvents.map(event => (
                    <div key={event.id} className="stu-my-card">
                      {event.bannerImage
                        ? <img src={`${API}/uploads/${event.bannerImage}`} alt="Banner" className="stu-my-banner-img" />
                        : <div className="stu-my-banner-grad">
                            <div className="stu-my-banner-title">{event.title}</div>
                            <div className="stu-my-banner-faculty">by {event.facultyName}</div>
                          </div>
                      }
                      <div className="stu-my-body">
                        {event.bannerImage && <div className="stu-my-title">{event.title}</div>}
                        <div className="stu-my-meta">📅 {new Date(event.date).toLocaleDateString("en-IN",{weekday:"short",year:"numeric",month:"long",day:"numeric"})}</div>
                        {event.venue && <div className="stu-my-meta">📍 {event.venue}</div>}
                        <div className="stu-my-reg-badge">✅ You're Registered!</div>
                        <button onClick={() => handleCancel(event.id)} disabled={cancelling === event.id}
                          className="stu-my-cancel-btn"
                          style={{opacity: cancelling === event.id ? 0.6 : 1}}>
                          {cancelling === event.id ? "Cancelling..." : "🗑️ Cancel Registration"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === "notifications" && (
            <div className="dash-table-card">
              <div className="dash-table-header">
                <span className="dash-table-title">All Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={() =>
                    fetch(`${API}/api/notifications/read/${user.id}`,{method:"PUT"})
                      .then(() => { setUnreadCount(0); fetchNotifs(); })}
                    className="dash-btn-mark-read">
                    Mark all as read
                  </button>
                )}
              </div>
              {notifications.length === 0
                ? <div className="dash-table-empty">
                    <div className="dash-table-empty-icon">🔔</div>
                    <div className="dash-table-empty-text">No notifications yet.</div>
                  </div>
                : notifications.map(n => {
                    const b = notifBadge(n.senderRole);
                    const icons = {"✅":"✅","❌":"❌","🎉":"🎉","🎟":"🎟️","👤":"👤","📋":"📋","📤":"📤","📢":"📢","🗑":"🗑️"};
                    const icon  = Object.keys(icons).find(k => n.message.startsWith(k));
                    return (
                      <div key={n.id} className={`fac-notif-item ${n.isRead ? "" : "unread"}`}>
                        <div className="fac-notif-icon">{icon ? icons[icon] : "🔔"}</div>
                        <div className="fac-notif-body">
                          <div className="fac-notif-sender-row">
                            <div className="fac-notif-avatar" style={{background: b.c}}>
                              {(n.senderName || "S").charAt(0).toUpperCase()}
                            </div>
                            <span className="fac-notif-sender-name">{n.senderName || "System"}</span>
                            <span className="fac-notif-role-pill" style={{background: b.bg, color: b.c}}>{b.l}</span>
                          </div>
                          <div className="fac-notif-msg">{n.message}</div>
                          <div className="fac-notif-time">
                            {new Date(n.createdAt).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}
                          </div>
                        </div>
                        {!n.isRead && <div className="fac-notif-dot" />}
                      </div>
                    );
                  })
              }
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;