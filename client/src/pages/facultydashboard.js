import { useEffect, useState } from "react";
const API = process.env.REACT_APP_API || "";

const get = (url) => fetch(API + url).then(r => r.json());

function FacultyDashboard({ onLogout }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [myEvents, setMyEvents]                     = useState([]);
  const [notifications, setNotifications]           = useState([]);
  const [unreadCount, setUnreadCount]               = useState(0);
  const [activeTab, setActiveTab]                   = useState("events");
  const [showNotifs, setShowNotifs]                 = useState(false);
  const [form, setForm]                             = useState({ title:"", description:"", date:"", venue:"", guestName:"", guestBio:"", expectedAttendees:"" });
  const [editingEventId, setEditingEventId]         = useState(null);
  const [bannerFile, setBannerFile]                 = useState(null);
  const [guestPhotoFile, setGuestPhotoFile]         = useState(null);
  const [bannerPreview, setBannerPreview]           = useState(null);
  const [guestPhotoPreview, setGuestPhotoPreview]   = useState(null);
  const [toast, setToast]                           = useState(null);
  const [submitting, setSubmitting]                 = useState(false);
  const [viewingEvent, setViewingEvent]             = useState(null);
  const [registeredStudents, setRegisteredStudents] = useState([]);
  const [loadingStudents, setLoadingStudents]       = useState(false);
  const [notifyMsg, setNotifyMsg]                   = useState("");
  const [sendingNotif, setSendingNotif]             = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchMyEvents = () => {
    if (!user.id) return;
    get(`/api/faculty-events/${user.id}`).then(setMyEvents);
  };

  const fetchNotifs = () => {
    if (!user.id) return;
    get(`/api/notifications/${user.id}`).then(setNotifications);
    get(`/api/notifications/unread-count/${user.id}`).then(d => setUnreadCount(d.total));
  };

  useEffect(() => { fetchMyEvents(); fetchNotifs(); }, []);

  const handleSubmitEvent = () => {
    if (!form.title || !form.date) return showToast("Title and Date are required!", "error");
    setSubmitting(true);
    const isEdit = !!editingEventId;
    const url    = isEdit ? `${API}/api/update-event/${editingEventId}` : `${API}/api/create-event`;
    const method = isEdit ? "PUT" : "POST";

    const fd = new FormData();
    fd.append("title",             form.title);
    fd.append("description",       form.description);
    fd.append("date",              form.date);
    fd.append("venue",             form.venue);
    fd.append("guestName",         form.guestName);
    fd.append("guestBio",          form.guestBio);
    fd.append("expectedAttendees", form.expectedAttendees);
    fd.append("facultyId",         user.id);
    if (bannerFile)     fd.append("bannerImage", bannerFile);
    if (guestPhotoFile) fd.append("guestPhoto",  guestPhotoFile);

    fetch(url, { method, body: fd })
      .then(r => r.text())
      .then(() => {
        showToast(isEdit ? "✏️ Event updated!" : "📤 Event submitted for Admin approval!");
        setForm({ title:"", description:"", date:"", venue:"", guestName:"", guestBio:"", expectedAttendees:"" });
        setBannerFile(null); setGuestPhotoFile(null);
        setBannerPreview(null); setGuestPhotoPreview(null);
        setEditingEventId(null);
        setActiveTab("events");
        fetchMyEvents();
      })
      .catch(() => showToast("Failed to save event", "error"))
      .finally(() => setSubmitting(false));
  };

  const handleEditEvent = (event) => {
    setEditingEventId(event.id);
    setForm({
      title:             event.title,
      description:       event.description || "",
      date:              event.date?.split("T")[0] || "",
      venue:             event.venue || "",
      guestName:         event.guestName || "",
      guestBio:          event.guestBio || "",
      expectedAttendees: event.expectedAttendees || "",
    });
    setBannerPreview(event.bannerImage ? `${API}/uploads/${event.bannerImage}` : null);
    setGuestPhotoPreview(event.guestPhoto ? `${API}/uploads/${event.guestPhoto}` : null);
    setActiveTab("create");
  };

  const handleDeleteEvent = (id) => {
    if (!window.confirm("Delete this event?")) return;
    fetch(`${API}/api/delete-event/${id}`, { method:"DELETE" })
      .then(() => { showToast("🗑️ Event deleted."); fetchMyEvents(); })
      .catch(() => showToast("Delete failed", "error"));
  };

  const viewRegisteredStudents = (event) => {
    setViewingEvent(event);
    setLoadingStudents(true);
    get(`/api/event-registrations/${event.id}`)
      .then(setRegisteredStudents)
      .catch(() => setRegisteredStudents([]))
      .finally(() => setLoadingStudents(false));
    setActiveTab("students");
  };

  const sendEventNotification = () => {
    if (!notifyMsg.trim()) return showToast("Message cannot be empty.", "error");
    if (!viewingEvent)     return showToast("No event selected.", "error");
    setSendingNotif(true);
    fetch(`${API}/api/faculty-event-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: viewingEvent.id, message: notifyMsg, facultyId: user.id }),
    })
      .then(r => r.ok ? r.text() : r.text().then(t => { throw new Error(t); }))
      .then(msg => { showToast("📣 " + msg); setNotifyMsg(""); })
      .catch(err => showToast(err.message || "Failed to send.", "error"))
      .finally(() => setSendingNotif(false));
  };

  const handleBell = () => {
    setShowNotifs(!showNotifs);
    if (!showNotifs && unreadCount > 0) {
      fetch(`${API}/api/notifications/read/${user.id}`, { method:"PUT" })
        .then(() => { setUnreadCount(0); fetchNotifs(); });
    }
  };

  const statusBadge = (s) => {
    const cls = { approved:"badge-status-approved", pending:"badge-status-pending", rejected:"badge-status-rejected" };
    return <span className={`badge-status ${cls[s] || ""}`}>{s?.charAt(0).toUpperCase()+s?.slice(1)}</span>;
  };

  const stats = {
    total:         myEvents.length,
    approved:      myEvents.filter(e => e.status === "approved").length,
    pending:       myEvents.filter(e => e.status === "pending").length,
    rejected:      myEvents.filter(e => e.status === "rejected").length,
    registrations: myEvents.reduce((acc,e) => acc+(parseInt(e.registrationCount)||0), 0),
  };

  const TH = ({children}) => <th className="dash-th-wide">{children}</th>;
  const TD = ({children, className=""}) => <td className={`dash-td-wide ${className}`}>{children}</td>;

  const tabs = [
    { id:"events",        label:"📅 My Events" },
    { id:"create",        label:"➕ Create Event" },
    { id:"students",      label:"👥 View Students" },
    { id:"notify",        label:"📣 Notify Students" },
    { id:"notifications", label:"🔔 Notifications" },
  ];

  const tabTitle = {
    events:        "My Events",
    create:        editingEventId ? "Edit Event" : "Create New Event",
    students:      viewingEvent ? `Students — ${viewingEvent.title}` : "View Students",
    notify:        viewingEvent ? `Notify Students — ${viewingEvent.title}` : "Notify Students",
    notifications: "Notifications",
  };

  const bMap = {
    admin:   { bg:"#ede9fe", c:"#5b21b6", l:"Admin" },
    faculty: { bg:"#dbeafe", c:"#1e40af", l:"Faculty" },
    student: { bg:"#d1fae5", c:"#065f46", l:"Student" },
    system:  { bg:"#f1f5f9", c:"#475569", l:"System" },
  };

  return (
    <div className="dash-root">

      {toast && (
        <div className={`dash-toast ${toast.type === "error" ? "dash-toast-error" : "dash-toast-success"}`}>
          {toast.msg}
        </div>
      )}

      {/* SIDEBAR */}
      <div className="dash-sidebar">
        <div className="dash-sidebar-header">
          <div className="dash-sidebar-logo">🎓 EventHub</div>
          <div className="dash-sidebar-subtitle">Faculty Panel</div>
        </div>

        {tabs.map(t => (
          <div key={t.id}
            onClick={() => {
              if (t.id === "students" || t.id === "notify") return;
              setActiveTab(t.id);
              if (t.id === "create") {
                setEditingEventId(null);
                setForm({title:"",description:"",date:"",venue:"",guestName:"",guestBio:"",expectedAttendees:""});
              }
            }}
            className={`dash-sidebar-tab ${activeTab === t.id ? "active" : ""} ${(t.id === "students" || t.id === "notify") ? "disabled" : ""}`}>
            {t.label}
            {t.id === "notifications" && unreadCount > 0 && (
              <span className="dash-sidebar-badge">{unreadCount}</span>
            )}
            {(t.id === "students" || t.id === "notify") && (
              <div className="dash-sidebar-tab-hint">via My Events →</div>
            )}
          </div>
        ))}

        <div className="dash-sidebar-footer">
          <div onClick={() => { localStorage.clear(); onLogout?.(); }} className="dash-sidebar-logout">🚪 Logout</div>
        </div>
      </div>

      {/* MAIN */}
      <div className="dash-main">

        {/* TOPBAR */}
        <div className="dash-topbar">
          <h2 className="dash-topbar-title">{tabTitle[activeTab]}</h2>
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
                        const b = bMap[n.senderRole] || bMap.system;
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
              <div className="dash-user-avatar dash-user-avatar-faculty">F</div>
              <div>
                <div className="dash-user-name">{user.name || "Faculty"}</div>
                <div className="dash-user-email">{user.email}</div>
              </div>
            </div>
          </div>
        </div>

        {/* PAGE BODY */}
        <div className="dash-body">

          {/* ── MY EVENTS ── */}
          {activeTab === "events" && (
            <div>
              <div className="dash-stat-grid-5">
                {[
                  {label:"Total",         value:stats.total,         colorClass:"c-blue"},
                  {label:"Approved",      value:stats.approved,      colorClass:"c-green"},
                  {label:"Pending",       value:stats.pending,       colorClass:"c-amber"},
                  {label:"Rejected",      value:stats.rejected,      colorClass:"c-red"},
                  {label:"Registrations", value:stats.registrations, colorClass:"c-purple"},
                ].map((s,i) => (
                  <div key={i} className="dash-stat-card-center">
                    <div className={`dash-stat-val-sm ${s.colorClass}`}>{s.value}</div>
                    <div className="dash-stat-lbl-sm">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="dash-table-card">
                <div className="dash-table-header">
                  <span className="dash-table-title">My Events</span>
                  <button onClick={() => {
                    setEditingEventId(null);
                    setForm({title:"",description:"",date:"",venue:"",guestName:"",guestBio:"",expectedAttendees:""});
                    setActiveTab("create");
                  }} className="dash-btn-add">
                    + Create Event
                  </button>
                </div>
                {myEvents.length === 0
                  ? <div className="dash-table-empty">
                      <div className="dash-table-empty-icon">📅</div>
                      <div className="dash-table-empty-text">No events yet. Create your first event!</div>
                    </div>
                  : <table style={{width:"100%",borderCollapse:"collapse"}}>
                      <thead><tr>{["Title","Date","Venue","Registrations","Status","Actions"].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
                      <tbody>
                        {myEvents.map(e => (
                          <tr key={e.id}>
                            <TD className="td-primary">{e.title}</TD>
                            <TD className="td-muted">{new Date(e.date).toLocaleDateString()}</TD>
                            <TD className="td-muted-sm">{e.venue || "TBD"}</TD>
                            <TD className="td-bold">{e.registrationCount}</TD>
                            <TD>{statusBadge(e.status)}</TD>
                            <TD>
                              <div className="dash-btn-row-wrap">
                                <button onClick={() => viewRegisteredStudents(e)} className="dash-btn-blue-sm">👥 Students</button>
                                <button onClick={() => { setViewingEvent(e); setNotifyMsg(""); setActiveTab("notify"); }} className="dash-btn-purple-sm">📣 Notify</button>
                                {e.status !== "approved" && <>
                                  <button onClick={() => handleEditEvent(e)} className="dash-btn-amber-sm">✏️ Edit</button>
                                  <button onClick={() => handleDeleteEvent(e.id)} className="dash-btn-red-sm">🗑️ Delete</button>
                                </>}
                              </div>
                            </TD>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                }
              </div>
            </div>
          )}

          {/* ── CREATE / EDIT EVENT ── */}
          {activeTab === "create" && (
            <div className="dash-form-panel">
              <div className="dash-form-card">
                <h3>{editingEventId ? "✏️ Edit Event" : "📋 Create New Event"}</h3>

                <div className="dash-section-bar">📋 Event Details</div>

                {[
                  {label:"Event Title *", key:"title",             type:"text",   placeholder:"e.g. AI Workshop 2025"},
                  {label:"Date *",        key:"date",              type:"date"},
                  {label:"Venue",         key:"venue",             type:"text",   placeholder:"e.g. Auditorium, Lab 1"},
                  {label:"Expected Attendees", key:"expectedAttendees", type:"number", placeholder:"e.g. 100"},
                ].map(f => (
                  <div key={f.key} className="dash-field">
                    <label className="dash-label">{f.label}</label>
                    <input type={f.type} value={form[f.key]} placeholder={f.placeholder || ""}
                      onChange={e => setForm({...form,[f.key]:e.target.value})}
                      className="dash-input" />
                  </div>
                ))}

                <div className="dash-field">
                  <label className="dash-label">Description</label>
                  <textarea value={form.description} rows={3} placeholder="Describe your event..."
                    onChange={e => setForm({...form,description:e.target.value})}
                    className="dash-textarea-field" />
                </div>

                {/* BANNER UPLOAD */}
                <div>
                  <label className="dash-label">🖼️ Event Banner / Poster</label>
                  <div className="dash-upload-zone"
                    onClick={() => document.getElementById("bannerInput").click()}
                    onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor="#3b82f6"; }}
                    onDragLeave={e => { e.currentTarget.style.borderColor="#d1d5db"; }}
                    onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor="#d1d5db"; const file=e.dataTransfer.files[0]; if(file){ setBannerFile(file); setBannerPreview(URL.createObjectURL(file)); }}}>
                    {bannerPreview
                      ? <img src={bannerPreview} alt="banner preview" className="dash-upload-preview" />
                      : <div>
                          <div className="dash-upload-icon">📁</div>
                          <div className="dash-upload-text">Click or drag & drop to upload banner</div>
                          <div className="dash-upload-sub">JPG, PNG, GIF up to 5MB</div>
                        </div>
                    }
                    <input id="bannerInput" type="file" accept="image/*" style={{display:"none"}}
                      onChange={e => { const f=e.target.files[0]; if(f){ setBannerFile(f); setBannerPreview(URL.createObjectURL(f)); }}} />
                  </div>
                  {bannerPreview && (
                    <button onClick={() => { setBannerFile(null); setBannerPreview(null); }} className="dash-remove-btn">
                      ✕ Remove banner
                    </button>
                  )}
                </div>

                <div className="dash-section-bar">🎤 Guest / Expert Details</div>

                <div className="dash-grid-2">
                  <div>
                    <label className="dash-label">Guest / Expert Name</label>
                    <input type="text" value={form.guestName} placeholder="e.g. Dr. Arun Kumar"
                      onChange={e => setForm({...form,guestName:e.target.value})}
                      className="dash-input" />
                  </div>
                  <div>
                    <label className="dash-label">📷 Guest / Expert Photo</label>
                    <div className="dash-guest-upload"
                      onClick={() => document.getElementById("guestPhotoInput").click()}>
                      {guestPhotoPreview
                        ? <div className="dash-guest-preview-row">
                            <img src={guestPhotoPreview} alt="guest" className="dash-guest-preview-img" />
                            <span className="dash-guest-preview-label">Click to change</span>
                          </div>
                        : <div className="dash-guest-placeholder">📷 Click to upload photo</div>
                      }
                      <input id="guestPhotoInput" type="file" accept="image/*" style={{display:"none"}}
                        onChange={e => { const f=e.target.files[0]; if(f){ setGuestPhotoFile(f); setGuestPhotoPreview(URL.createObjectURL(f)); }}} />
                    </div>
                    {guestPhotoPreview && (
                      <button onClick={() => { setGuestPhotoFile(null); setGuestPhotoPreview(null); }} className="dash-remove-btn">
                        ✕ Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="dash-field">
                  <label className="dash-label">Guest / Expert Bio</label>
                  <textarea value={form.guestBio} rows={3}
                    placeholder="e.g. Dr. Arun Kumar is a Senior AI Researcher at IIT Hyderabad with 15 years of experience..."
                    onChange={e => setForm({...form,guestBio:e.target.value})}
                    className="dash-textarea-field" />
                </div>

                {!editingEventId && (
                  <div className="dash-info-blue">
                    ℹ️ Your event will be reviewed by Admin. You'll be notified once approved or rejected.
                  </div>
                )}

                <div className="dash-btn-row-form">
                  <button onClick={handleSubmitEvent} disabled={submitting} className="dash-btn-primary-lg">
                    {submitting ? "Saving..." : editingEventId ? "💾 Update Event" : "📤 Submit for Approval"}
                  </button>
                  <button onClick={() => { setEditingEventId(null); setActiveTab("events"); }} className="dash-btn-cancel">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── VIEW REGISTERED STUDENTS ── */}
          {activeTab === "students" && (
            <div className="dash-table-card">
              <div className="dash-table-header">
                <span className="dash-table-title">
                  Registered Students {viewingEvent && `— ${viewingEvent.title}`}
                </span>
                <div className="dash-btn-row">
                  {viewingEvent && (
                    <button onClick={() => { setNotifyMsg(""); setActiveTab("notify"); }} className="dash-btn-notify">
                      📣 Send Notification
                    </button>
                  )}
                  <button onClick={() => setActiveTab("events")} className="dash-btn-back">← Back to Events</button>
                </div>
              </div>
              {loadingStudents
                ? <div className="dash-table-empty">Loading...</div>
                : registeredStudents.length === 0
                  ? <div className="dash-table-empty">
                      <div className="dash-table-empty-icon">👥</div>
                      <div className="dash-table-empty-text">No students registered yet.</div>
                    </div>
                  : <table style={{width:"100%",borderCollapse:"collapse"}}>
                      <thead><tr>{["#","Student Name","Email","Registered At"].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
                      <tbody>
                        {registeredStudents.map((s,i) => (
                          <tr key={s.id}>
                            <TD className="td-num">{i+1}</TD>
                            <TD className="td-primary">{s.studentName}</TD>
                            <TD className="td-muted">{s.email}</TD>
                            <TD className="td-muted-sm">{new Date(s.registeredAt).toLocaleString()}</TD>
                          </tr>
                        ))}
                      </tbody>
                    </table>
              }
            </div>
          )}

          {/* ── NOTIFY STUDENTS ── */}
          {activeTab === "notify" && (
            <div className="dash-form-panel-wide">
              <div className="dash-form-card">
                <h3 className="notify-h3">📣 Send Notification to Students</h3>

                {viewingEvent
                  ? <p className="dash-notify-desc">
                      Sending to all students registered for <strong>"{viewingEvent.title}"</strong>
                    </p>
                  : <div className="dash-info-yellow">
                      ⚠️ Please go to <strong>My Events</strong> and click <strong>📣 Notify</strong> on a specific event first.
                    </div>
                }

                <label className="dash-label">Message *</label>
                <textarea
                  value={notifyMsg}
                  rows={5}
                  placeholder="e.g. Please arrive 30 minutes early. Bring your student ID."
                  onChange={e => setNotifyMsg(e.target.value)}
                  className="dash-textarea"
                />

                <div className="dash-info-blue-sm">
                  ℹ️ This message will appear in all registered students' notification panel with your name shown as the sender.
                </div>

                <div className="dash-btn-row-form">
                  <button
                    onClick={sendEventNotification}
                    disabled={sendingNotif || !viewingEvent}
                    className={`${!viewingEvent ? "dash-btn-primary-lg" : "dash-btn-purple-lg"}`}
                    style={!viewingEvent ? {background:"#94a3b8",cursor:"not-allowed"} : {}}>
                    {sendingNotif ? "Sending..." : "📣 Send to All Registered Students"}
                  </button>
                  <button onClick={() => setActiveTab("events")} className="dash-btn-cancel">← Back</button>
                </div>
              </div>
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
                    const b = bMap[n.senderRole] || bMap.system;
                    const icons = {"✅":"✅","❌":"❌","🎉":"🎉","🎟":"🎟️","👤":"👤","📋":"📋","📤":"📤","📢":"📢","📣":"📣","🗑":"🗑️"};
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

export default FacultyDashboard;