import { useEffect, useState } from "react";

const API = process.env.REACT_APP_API || "";
const get = (url) => fetch(API + url).then(r => r.json());
const put = (url) => fetch(API + url, { method: "PUT" });

function AdminDashboard({ onLogout }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [stats, setStats]               = useState({ users: 0, events: 0, registrations: 0, pending: 0 });
  const [pendingEvents, setPendingEvents] = useState([]);
  const [allEvents, setAllEvents]         = useState([]);
  const [participants, setParticipants]   = useState([]);
  const [users, setUsers]                 = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [activeTab, setActiveTab]         = useState("dashboard");
  const [showNotifs, setShowNotifs]       = useState(false);
  const [toast, setToast]                 = useState(null);

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser]     = useState(null);
  const [userForm, setUserForm]           = useState({ name:"", email:"", password:"", role:"student" });

  const [viewingEvent, setViewingEvent]   = useState(null);
  const [globalMsg, setGlobalMsg]         = useState("");
  const [sendingNotif, setSendingNotif]   = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStats = () =>
    Promise.all([get("/api/user-count"), get("/api/event-count"), get("/api/registration-count"), get("/api/pending-count")])
      .then(([u, e, r, p]) => setStats({ users: u.total, events: e.total, registrations: r.total, pending: p.total }));

  const fetchPending      = () => get("/api/pending-events").then(setPendingEvents);
  const fetchAllEvents    = () => get("/api/all-events").then(setAllEvents);
  const fetchParticipants = () => get("/api/all-participants").then(setParticipants);
  const fetchUsers        = () => get("/api/users").then(setUsers);
  const fetchNotifs       = () => {
    if (!user.id) return;
    get(`/api/notifications/${user.id}`).then(setNotifications);
    get(`/api/notifications/unread-count/${user.id}`).then(d => setUnreadCount(d.total));
  };

  useEffect(() => {
    fetchStats(); fetchPending(); fetchAllEvents(); fetchParticipants(); fetchUsers(); fetchNotifs();
  }, []);

  const approveEvent = (id) =>
    put(`/api/approve-event/${id}`).then(() => {
      showToast("✅ Event Approved! Faculty & Students notified.");
      setViewingEvent(null);
      fetchStats(); fetchPending(); fetchAllEvents();
    });

  const rejectEvent = (id) =>
    put(`/api/reject-event/${id}`).then(() => {
      showToast("❌ Event Rejected. Faculty notified.", "error");
      setViewingEvent(null);
      fetchStats(); fetchPending(); fetchAllEvents();
    });

  const handleBell = () => {
    setShowNotifs(!showNotifs);
    if (!showNotifs && unreadCount > 0) {
      put(`/api/notifications/read/${user.id}`).then(() => { setUnreadCount(0); fetchNotifs(); });
    }
  };

  const openAddUser = () => {
    setEditingUser(null);
    setUserForm({ name:"", email:"", password:"", role:"student" });
    setShowUserModal(true);
  };

  const openEditUser = (u) => {
    setEditingUser(u);
    setUserForm({ name: u.name, email: u.email, password:"", role: u.role });
    setShowUserModal(true);
  };

  const saveUser = () => {
    if (!userForm.name || !userForm.email) return showToast("Name and Email are required.", "error");
    const url    = editingUser ? `${API}/api/update-user/${editingUser.id}` : `${API}/api/register-user`;
    const method = editingUser ? "PUT" : "POST";
    fetch(url, { method, headers:{ "Content-Type":"application/json" }, body: JSON.stringify(userForm) })
      .then(r => r.ok ? r.text() : r.text().then(t => { throw new Error(t); }))
      .then(() => {
        showToast(editingUser ? "✅ User updated!" : "✅ User added!");
        setShowUserModal(false);
        fetchUsers(); fetchStats();
      })
      .catch(err => showToast(err.message || "Failed", "error"));
  };

  const deleteUser = (id) => {
    if (!window.confirm("Delete this user?")) return;
    fetch(`${API}/api/delete-user/${id}`, { method:"DELETE" })
      .then(() => { showToast("🗑️ User deleted."); fetchUsers(); fetchStats(); })
      .catch(() => showToast("Delete failed", "error"));
  };

  const sendGlobalNotification = () => {
    if (!globalMsg.trim()) return showToast("Message cannot be empty.", "error");
    setSendingNotif(true);
    fetch(`${API}/api/global-notification`, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ message: globalMsg, senderName: user.name || "Admin", senderRole: "admin" }),
    })
      .then(r => r.ok ? r.text() : r.text().then(t => { throw new Error(t); }))
      .then(() => { showToast("📢 Global notification sent!"); setGlobalMsg(""); })
      .catch(err => showToast(err.message || "Failed", "error"))
      .finally(() => setSendingNotif(false));
  };

  const downloadReport = () => {
    const rows = [["Student","Email","Event","Event Date","Registered At"]];
    participants.forEach(p => rows.push([p.studentName, p.email, p.eventTitle,
      new Date(p.date).toLocaleDateString(), new Date(p.registeredAt).toLocaleString()]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type:"text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "event_report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const statusBadge = (s) => {
    const cls = { approved:"badge-status-approved", pending:"badge-status-pending", rejected:"badge-status-rejected" };
    return <span className={`badge-status ${cls[s] || ""}`}>{s?.charAt(0).toUpperCase()+s?.slice(1)}</span>;
  };

  const roleBadge = (r) => {
    const cls = { admin:"badge-role-admin", faculty:"badge-role-faculty", student:"badge-role-student" };
    return <span className={`badge-role ${cls[r] || ""}`}>{r?.charAt(0).toUpperCase()+r?.slice(1)}</span>;
  };

  const TH = ({children}) => <th className="dash-th">{children}</th>;
  const TD = ({children, className=""}) => <td className={`dash-td ${className}`}>{children}</td>;

  const tabs = [
    { id:"dashboard",    label:"📊 Dashboard" },
    { id:"pending",      label:"⏳ Pending Events" },
    { id:"events",       label:"📅 All Events" },
    { id:"users",        label:"👥 Users" },
    { id:"participants", label:"🎟️ Participants" },
    { id:"notify",       label:"📢 Global Notify" },
    { id:"reports",      label:"📋 Reports" },
  ];

  const tabTitles = {
    dashboard:"Dashboard Overview", pending:"Pending Approvals", events:"All Events",
    users:"User Management", participants:"All Participants",
    notify:"Send Global Notification", reports:"Reports"
  };

  const bMap = {
    admin:   { bg:"#ede9fe", c:"#5b21b6", l:"Admin" },
    faculty: { bg:"#dbeafe", c:"#1e40af", l:"Faculty" },
    student: { bg:"#d1fae5", c:"#065f46", l:"Student" },
    system:  { bg:"#f1f5f9", c:"#475569", l:"System" },
  };

  const EventDetailModal = ({ event, onClose }) => (
    <div className="edm-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="edm-box">
        <div className="edm-header">
          <div>
            <div className="edm-header-meta">Event Details</div>
            <h2 className="edm-header-title">{event.title}</h2>
          </div>
          <div className="edm-header-actions">
            {statusBadge(event.status)}
            <button onClick={onClose} className="edm-close-btn">✕</button>
          </div>
        </div>

        <div className="edm-body">
          {event.bannerImage && (
            <div className="edm-banner-section">
              <div className="edm-section-label">🖼️ Event Banner / Poster</div>
              <img src={`${API}/uploads/${event.bannerImage}`} alt="Event Banner" className="edm-banner-img" />
            </div>
          )}

          <div className="edm-info-grid">
            {[
              { icon:"👨‍🏫", label:"Faculty",              value: event.facultyName },
              { icon:"📅", label:"Date",                    value: new Date(event.date).toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"}) },
              { icon:"📍", label:"Venue",                   value: event.venue || "TBD" },
              { icon:"👥", label:"Expected Attendees",      value: event.expectedAttendees ? `${event.expectedAttendees} students` : "Not specified" },
              { icon:"🎟️", label:"Registrations So Far",   value: `${event.registrationCount || 0} registered` },
              { icon:"🕐", label:"Submitted On",            value: new Date(event.createdAt).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) },
            ].map((item, i) => (
              <div key={i} className="edm-info-cell">
                <div className="edm-info-cell-label">{item.icon} {item.label}</div>
                <div className="edm-info-cell-value">{item.value}</div>
              </div>
            ))}
          </div>

          {event.description && (
            <div className="edm-desc-section">
              <div className="edm-desc-label">📋 Description</div>
              <div className="edm-desc-box">{event.description}</div>
            </div>
          )}

          {(event.guestName || event.guestBio || event.guestPhoto) && (
            <div className="edm-guest-section">
              <div className="edm-guest-label">🎤 Guest / Expert</div>
              <div className="edm-guest-box">
                {event.guestPhoto && (
                  <img src={`${API}/uploads/${event.guestPhoto}`} alt="Guest" className="edm-guest-photo" />
                )}
                {!event.guestPhoto && event.guestName && (
                  <div className="edm-guest-avatar">{event.guestName.charAt(0).toUpperCase()}</div>
                )}
                <div className="edm-guest-info">
                  {event.guestName && <div className="edm-guest-name">{event.guestName}</div>}
                  {event.guestBio  && <div className="edm-guest-bio">{event.guestBio}</div>}
                </div>
              </div>
            </div>
          )}

          {event.status === "pending" && (
            <div className="edm-action-row">
              <button onClick={() => approveEvent(event.id)} className="dash-btn-green-lg">✅ Approve Event</button>
              <button onClick={() => rejectEvent(event.id)}  className="dash-btn-red-lg">❌ Reject Event</button>
            </div>
          )}

          {event.status !== "pending" && (
            <div className={event.status === "approved" ? "edm-status-box-approved" : "edm-status-box-rejected"}>
              {event.status === "approved" ? "✅ This event has been approved." : "❌ This event was rejected."}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="dash-root">

      {toast && (
        <div className={`dash-toast ${toast.type === "error" ? "dash-toast-error" : "dash-toast-success"}`}>
          {toast.msg}
        </div>
      )}

      {viewingEvent && <EventDetailModal event={viewingEvent} onClose={() => setViewingEvent(null)} />}

      {showUserModal && (
        <div className="um-overlay">
          <div className="um-box">
            <h3 className="um-title">{editingUser ? "✏️ Edit User" : "➕ Add New User"}</h3>
            {[
              {label:"Full Name *", key:"name",     type:"text",     placeholder:"e.g. John Doe"},
              {label:"Email *",     key:"email",    type:"email",    placeholder:"e.g. john@email.com"},
              {label:"Password",    key:"password", type:"password", placeholder:editingUser?"Leave blank to keep current":"Set password"},
            ].map(f => (
              <div key={f.key} className="dash-field-gap">
                <label className="dash-label-sm">{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={userForm[f.key]}
                  onChange={e => setUserForm({...userForm,[f.key]:e.target.value})}
                  className="dash-input-sm" />
              </div>
            ))}
            <div className="dash-field-gap">
              <label className="dash-label-sm">Role</label>
              <select value={userForm.role} onChange={e => setUserForm({...userForm,role:e.target.value})} className="dash-select">
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="um-btn-row">
              <button onClick={saveUser} className="um-btn-save">{editingUser ? "Update" : "Add User"}</button>
              <button onClick={() => setShowUserModal(false)} className="um-btn-cancel">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <div className="dash-sidebar">
        <div className="dash-sidebar-header">
          <div className="dash-sidebar-logo">🎓 EventHub</div>
          <div className="dash-sidebar-subtitle">Admin Control Panel</div>
        </div>
        {tabs.map(t => (
          <div key={t.id} onClick={() => setActiveTab(t.id)}
            className={`dash-sidebar-tab ${activeTab === t.id ? "active" : ""}`}>
            {t.label}
            {t.id === "pending" && stats.pending > 0 && (
              <span className="dash-sidebar-badge">{stats.pending}</span>
            )}
          </div>
        ))}
        <div className="dash-sidebar-footer">
          <div onClick={() => { localStorage.clear(); onLogout?.(); }} className="dash-sidebar-logout">🚪 Logout</div>
        </div>
      </div>

      {/* MAIN */}
      <div className="dash-main">
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
              <div className="dash-user-avatar dash-user-avatar-admin">A</div>
              <div>
                <div className="dash-user-name">{user.name || "Admin"}</div>
                <div className="dash-user-email">{user.email}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="dash-body">

          {activeTab === "dashboard" && (
            <div>
              <div className="dash-stat-grid-4">
                {[
                  {label:"Total Users",    value:stats.users,         icon:"👥", colorClass:"c-blue"},
                  {label:"Total Events",   value:stats.events,        icon:"📅", colorClass:"c-purple"},
                  {label:"Registrations",  value:stats.registrations, icon:"🎟️", colorClass:"c-green"},
                  {label:"Pending",        value:stats.pending,       icon:"⏳", colorClass:"c-amber"},
                ].map((c,i) => (
                  <div key={i} className="dash-stat-card">
                    <div className="dash-stat-icon">{c.icon}</div>
                    <div>
                      <div className={`dash-stat-val ${c.colorClass}`}>{c.value}</div>
                      <div className="dash-stat-lbl">{c.label}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="dash-table-card">
                <div className="dash-table-header">
                  <span className="dash-table-title">⏳ Pending Events ({pendingEvents.length})</span>
                </div>
                {pendingEvents.length === 0
                  ? <div className="dash-table-empty">🎉 No pending events!</div>
                  : <table style={{width:"100%",borderCollapse:"collapse"}}>
                      <thead><tr>{["Title","Faculty","Date","Actions"].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
                      <tbody>{pendingEvents.map(e => (
                        <tr key={e.id}>
                          <TD><span onClick={() => setViewingEvent(e)} className="td-link">{e.title}</span></TD>
                          <TD className="td-muted">{e.facultyName}</TD>
                          <TD className="td-muted">{new Date(e.date).toLocaleDateString()}</TD>
                          <TD><div className="dash-btn-row">
                            <button onClick={() => setViewingEvent(e)} className="dash-btn-view">👁️ View</button>
                            <button onClick={() => approveEvent(e.id)} className="dash-btn-approve">✅ Approve</button>
                            <button onClick={() => rejectEvent(e.id)}  className="dash-btn-reject">❌ Reject</button>
                          </div></TD>
                        </tr>
                      ))}</tbody>
                    </table>}
              </div>
            </div>
          )}

          {activeTab === "pending" && (
            <div className="dash-table-card">
              <div className="dash-table-header">
                <span className="dash-table-title">Pending Events ({pendingEvents.length})</span>
              </div>
              {pendingEvents.length === 0
                ? <div className="dash-table-empty">✅ All caught up!</div>
                : <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr>{["#","Title","Faculty","Date","Venue","Expected","Actions"].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
                    <tbody>{pendingEvents.map((e,i) => (
                      <tr key={e.id}>
                        <TD className="td-num">{i+1}</TD>
                        <TD>
                          <div className="td-primary">{e.title}</div>
                          {e.guestName   && <div className="td-guest">🎤 {e.guestName}</div>}
                          {e.bannerImage && <div className="td-banner">🖼️ Has banner</div>}
                        </TD>
                        <TD className="td-muted">{e.facultyName}</TD>
                        <TD className="td-muted">{new Date(e.date).toLocaleDateString()}</TD>
                        <TD className="td-muted-sm">{e.venue || "TBD"}</TD>
                        <TD className="td-muted-sm">{e.expectedAttendees || "—"}</TD>
                        <TD><div className="dash-btn-row-wrap">
                          <button onClick={() => setViewingEvent(e)} className="dash-btn-view">👁️ Full Details</button>
                          <button onClick={() => approveEvent(e.id)}  className="dash-btn-approve">✅ Approve</button>
                          <button onClick={() => rejectEvent(e.id)}   className="dash-btn-reject">❌ Reject</button>
                        </div></TD>
                      </tr>
                    ))}</tbody>
                  </table>}
            </div>
          )}

          {activeTab === "events" && (
            <div className="dash-table-card">
              <div className="dash-table-header">
                <span className="dash-table-title">All Events ({allEvents.length})</span>
              </div>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{["#","Title","Faculty","Date","Venue","Registrations","Status",""].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
                <tbody>{allEvents.map((e,i) => (
                  <tr key={e.id}>
                    <TD className="td-num">{i+1}</TD>
                    <TD>
                      <div className="td-primary">{e.title}</div>
                      {e.guestName && <div className="td-guest">🎤 {e.guestName}</div>}
                    </TD>
                    <TD className="td-muted">{e.facultyName}</TD>
                    <TD className="td-muted">{new Date(e.date).toLocaleDateString()}</TD>
                    <TD className="td-muted-sm">{e.venue || "TBD"}</TD>
                    <TD className="td-bold">{e.registrationCount}</TD>
                    <TD>{statusBadge(e.status)}</TD>
                    <TD><button onClick={() => setViewingEvent(e)} className="dash-btn-view-sm">👁️ Details</button></TD>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {activeTab === "users" && (
            <div className="dash-table-card">
              <div className="dash-table-header">
                <span className="dash-table-title">All Users ({users.length})</span>
                <button onClick={openAddUser} className="dash-btn-add">+ Add User</button>
              </div>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{["#","Name","Email","Role","Joined","Actions"].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
                <tbody>{users.map((u,i) => (
                  <tr key={u.id}>
                    <TD className="td-num">{i+1}</TD>
                    <TD className="td-primary">{u.name}</TD>
                    <TD className="td-muted">{u.email}</TD>
                    <TD>{roleBadge(u.role)}</TD>
                    <TD className="td-muted-sm">{new Date(u.createdAt).toLocaleDateString()}</TD>
                    <TD><div className="dash-btn-row">
                      <button onClick={() => openEditUser(u)} className="dash-btn-edit">✏️ Edit</button>
                      <button onClick={() => deleteUser(u.id)} className="dash-btn-delete">🗑️ Delete</button>
                    </div></TD>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {activeTab === "participants" && (
            <div className="dash-table-card">
              <div className="dash-table-header">
                <span className="dash-table-title">All Participants ({participants.length})</span>
              </div>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{["#","Student","Email","Event","Date","Registered At"].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
                <tbody>{participants.map((p,i) => (
                  <tr key={p.id}>
                    <TD className="td-num">{i+1}</TD>
                    <TD className="td-primary">{p.studentName}</TD>
                    <TD className="td-muted">{p.email}</TD>
                    <TD>{p.eventTitle}</TD>
                    <TD className="td-muted">{new Date(p.date).toLocaleDateString()}</TD>
                    <TD className="td-muted-sm">{new Date(p.registeredAt).toLocaleString()}</TD>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {activeTab === "notify" && (
            <div className="dash-notify-panel">
              <div className="dash-notify-card">
                <h3>📢 Send Global Notification</h3>
                <p className="dash-notify-sub">This message will be sent to ALL users (admin, faculty, students).</p>
                <label className="dash-label">Message *</label>
                <textarea value={globalMsg} rows={5} placeholder="Type your announcement here..."
                  onChange={e => setGlobalMsg(e.target.value)}
                  className="dash-textarea" />
                <button onClick={sendGlobalNotification} disabled={sendingNotif} className="dash-btn-primary-lg">
                  {sendingNotif ? "Sending..." : "📢 Send to Everyone"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "reports" && (
            <div>
              <div className="dash-reports-grid">
                {[
                  {label:"Total Users",    value:stats.users,         colorClass:"c-blue"},
                  {label:"Total Events",   value:stats.events,        colorClass:"c-purple"},
                  {label:"Registrations",  value:stats.registrations, colorClass:"c-green"},
                  {label:"Pending Events", value:stats.pending,       colorClass:"c-amber"},
                ].map((s,i) => (
                  <div key={i} className="dash-report-card">
                    <div className={`dash-report-val ${s.colorClass}`}>{s.value}</div>
                    <div className="dash-report-lbl">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="dash-report-box">
                <h3>📥 Export Reports</h3>
                <p>Download all participant registration data as a CSV file. Contains {participants.length} registration records.</p>
                <button onClick={downloadReport} className="dash-btn-green-download">📥 Download CSV Report</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;