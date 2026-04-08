import { useState, useEffect, useRef } from "react";

const API = process.env.REACT_APP_API || "";;

const SLIDES = [
  {
    img: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&q=80",
    tag: "🎓 Aurora University",
    title: "Discover Amazing",
    accent: "Campus Events",
    sub: "Connect with peers, learn from industry experts, and build memories that last a lifetime.",
    cta: "Explore Events",
    color: "#ff3cac",
  },
  {
    img: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1600&q=80",
    tag: "🚀 Join the Community",
    title: "Register &",
    accent: "Participate Now",
    sub: "From hackathons to cultural fests — find your passion and make your mark.",
    cta: "Register Free",
    color: "#784ba0",
  },
  {
    img: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1600&q=80",
    tag: "🎤 Expert Sessions",
    title: "Learn from",
    accent: "Industry Leaders",
    sub: "Attend exclusive workshops led by top professionals from across the globe.",
    cta: "See Workshops",
    color: "#2b86c5",
  },
];

const FEATURES = [
  { icon: "🎯", title: "Easy Registration",  desc: "Register for events instantly with your university ID in just a few clicks." },
  { icon: "🔔", title: "Live Notifications", desc: "Get real-time alerts when events are approved, updated, or about to start." },
  { icon: "🏅", title: "Track Your Events",  desc: "View all your upcoming and past registrations in one personal dashboard." },
  { icon: "🎤", title: "Expert Speakers",    desc: "Attend sessions with industry leaders and faculty guest speakers." },
  { icon: "📊", title: "Event Analytics",    desc: "Admins get live registration stats and participant management tools." },
  { icon: "🤝", title: "Build Network",      desc: "Meet peers, collaborate on ideas, and grow your professional circle." },
];

function useCounter(target, duration = 1500) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!target) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return count;
}

export default function Home({ onNavigate, user, onLogout }) {
  const [approvedEvents, setApprovedEvents] = useState([]);
  const [myEventIds, setMyEventIds]         = useState([]);
  const [registering, setRegistering]       = useState(null);
  const [slide, setSlide]                   = useState(0);
  const [animating, setAnimating]           = useState(false);
  const [stats, setStats]                   = useState({ events:0, users:0, registrations:0 });
  const [menuOpen, setMenuOpen]             = useState(false);
  const slideTimer = useRef(null);

  useEffect(() => {
    fetch(`${API}/api/events`).then(r=>r.json()).then(d=>setApprovedEvents(Array.isArray(d)?d:[])).catch(()=>setApprovedEvents([]));
    fetch(`${API}/api/event-count`).then(r=>r.json()).then(d=>setStats(p=>({...p,events:d.total}))).catch(()=>{});
    fetch(`${API}/api/user-count`).then(r=>r.json()).then(d=>setStats(p=>({...p,users:d.total}))).catch(()=>{});
    fetch(`${API}/api/registration-count`).then(r=>r.json()).then(d=>setStats(p=>({...p,registrations:d.total}))).catch(()=>{});
    if (user?.role === "student") {
      fetch(`${API}/api/my-events/${user.id}`).then(r=>r.json()).then(d=>setMyEventIds(Array.isArray(d)?d.map(e=>e.id):[])).catch(()=>setMyEventIds([]));
    }
  }, [user]);

  const goToSlide = (idx) => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => { setSlide(idx); setAnimating(false); }, 400);
  };
  useEffect(() => {
    slideTimer.current = setInterval(() => {
      setSlide(prev => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(slideTimer.current);
  }, []);

  const nextSlide = () => { clearInterval(slideTimer.current); goToSlide((slide + 1) % SLIDES.length); };
  const prevSlide = () => { clearInterval(slideTimer.current); goToSlide((slide - 1 + SLIDES.length) % SLIDES.length); };

  const handleRegister = (eventId) => {
    if (!user) return onNavigate("login");
    if (user.role !== "student") return alert("Only students can register for events.");
    setRegistering(eventId);
    fetch(`${API}/api/register-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, studentId: user.id }),
    })
      .then(r => r.ok ? r.text() : r.text().then(t => { throw new Error(t); }))
      .then(() => setMyEventIds(prev => [...prev, eventId]))
      .catch(err => alert(err.message || "Registration failed"))
      .finally(() => setRegistering(null));
  };

  const evCount   = useCounter(stats.events);
  const usrCount  = useCounter(stats.users);
  const regCount  = useCounter(stats.registrations);
  const liveCount = useCounter(approvedEvents.length);

  const s = SLIDES[slide];

  /* Stat band data — colors are data-driven so kept as style props */
  const statItems = [
    { val: evCount,   label: "Total Events",   icon: "📅", c: "#7c3aed" },
    { val: usrCount,  label: "Members",         icon: "👥", c: "#db2777" },
    { val: regCount,  label: "Registrations",   icon: "🎟️", c: "#0891b2" },
    { val: liveCount, label: "Active Events",   icon: "✅", c: "#059669" },
  ];

  return (
    <div className="hp-root">

      {/* TOPBAR */}
      <header className="hp-header">
        <div className="hp-logo">
          <span className="hp-logo-icon">🎓</span>
          <span>Event<b>Hub</b></span>
        </div>

        <nav className={`hp-nav ${menuOpen ? "open" : ""}`}>
          <a href="#events"   onClick={()=>setMenuOpen(false)}>Events</a>
          <a href="#features" onClick={()=>setMenuOpen(false)}>Features</a>
          <a href="#about"    onClick={()=>setMenuOpen(false)}>About</a>
          {!user ? (
            <>
              <button className="hp-btn-ghost" onClick={()=>{setMenuOpen(false);onNavigate("login");}}>Login</button>
              <button className="hp-btn-pink"  onClick={()=>{setMenuOpen(false);onNavigate("register");}}>Get Started</button>
            </>
          ) : (
            <>
              <span className="hp-welcome">👋 {user.name}</span>
              <button className="hp-btn-ghost" onClick={()=>{setMenuOpen(false);onNavigate(user.role);}}>Dashboard</button>
              <button className="hp-btn-pink"  onClick={onLogout}>Logout</button>
            </>
          )}
        </nav>

        <button className="hp-hamburger" onClick={()=>setMenuOpen(!menuOpen)}>
          {menuOpen ? "✕" : "☰"}
        </button>
      </header>

      {/* HERO SLIDER */}
      <section className="hp-hero">
        <div className={`hp-hero-bg ${animating ? "fade-out" : "fade-in"}`}
          style={{ backgroundImage: `url(${s.img})` }} />

        {/* dynamic gradient overlay per slide — must stay as style prop */}
        <div className="hp-hero-overlay"
          style={{ background: `linear-gradient(120deg, ${s.color}cc 0%, #1a0a2e99 60%, transparent 100%)` }} />

        <div className={`hp-hero-content ${animating ? "slide-out" : "slide-in"}`}>
          <div className="hp-hero-badge">{s.tag}</div>
          <h1 className="hp-hero-h1">
            {s.title}<br/>
            {/* accent colour is data-driven */}
            <span className="hp-hero-accent" style={{ color: s.color === "#2b86c5" ? "#7dd3fc" : "#ffd6e7" }}>
              {s.accent}
            </span>
          </h1>
          <p className="hp-hero-sub">{s.sub}</p>
          <div className="hp-hero-btns">
            {/* CTA gradient is data-driven */}
            <button className="hp-hero-cta"
              style={{ background: `linear-gradient(135deg, ${s.color}, #784ba0)` }}
              onClick={() => document.getElementById("events").scrollIntoView({ behavior:"smooth" })}>
              {s.cta} →
            </button>
            {!user && (
              <button className="hp-hero-outline" onClick={() => onNavigate("register")}>
                Join Free
              </button>
            )}
          </div>
        </div>

        <button className="hp-arrow hp-arrow-left"  onClick={prevSlide}>‹</button>
        <button className="hp-arrow hp-arrow-right" onClick={nextSlide}>›</button>

        <div className="hp-dots">
          {SLIDES.map((_,i) => (
            <button key={i} className={`hp-dot ${i===slide?"active":""}`}
              style={i===slide ? {background:s.color} : {}}
              onClick={() => { clearInterval(slideTimer.current); goToSlide(i); }} />
          ))}
        </div>

        <svg className="hp-wave" viewBox="0 0 1440 90" preserveAspectRatio="none">
          <path d="M0,60 C480,100 960,20 1440,60 L1440,90 L0,90 Z" fill="#f7f4ff"/>
        </svg>
      </section>

      {/* STATS BAND */}
      <section className="hp-stats" id="about">
        {statItems.map((st,i) => (
          <div className="hp-stat-card" key={i}>
            {/* icon bg/color are data-driven */}
            <div className="hp-stat-icon" style={{ background: st.c+"18", color: st.c }}>{st.icon}</div>
            <div>
              <div className="hp-stat-num" style={{ color: st.c }}>{st.val}+</div>
              <div className="hp-stat-lbl">{st.label}</div>
            </div>
          </div>
        ))}
      </section>

      {/* EVENTS SECTION */}
      <section className="hp-section hp-events-section" id="events">
        <div className="hp-sec-header">
          {/* tag bg/color are data-driven per section */}
          <span className="hp-sec-tag" style={{ color:"#db2777", background:"#fce7f3" }}>📅 What's Happening</span>
          <h2 className="hp-sec-title">Upcoming <span style={{ color:"#7c3aed" }}>Approved Events</span></h2>
          <p className="hp-sec-sub">Explore events submitted by faculty and approved for registration</p>
        </div>

        {approvedEvents.length === 0 ? (
          <div className="hp-empty">
            <div className="hp-empty-icon">📭</div>
            <h3>No events yet</h3>
            <p>New events will appear here once approved by admin.</p>
          </div>
        ) : (
          <div className="hp-ev-grid">
            {(Array.isArray(approvedEvents)?approvedEvents:[]).map(ev => {
              const isReg = myEventIds.includes(ev.id);
              return (
                <div className="hp-ev-card" key={ev.id}>
                  {ev.bannerImage
                    ? <div className="hp-ev-img">
                        <img src={`${API}/uploads/${ev.bannerImage}`} alt={ev.title}/>
                        {isReg && <span className="hp-ev-reg-badge">✅ Registered</span>}
                      </div>
                    : <div className="hp-ev-img-grad">
                        <span className="hp-ev-img-emoji">🎓</span>
                        {isReg && <span className="hp-ev-reg-badge">✅ Registered</span>}
                      </div>
                  }
                  <div className="hp-ev-body">
                    <span className="hp-ev-cat">University Event</span>
                    <h3 className="hp-ev-title">{ev.title}</h3>
                    {ev.description && (
                      <p className="hp-ev-desc">
                        {ev.description.length > 80 ? ev.description.substring(0,80)+"…" : ev.description}
                      </p>
                    )}
                    <div className="hp-ev-meta">
                      <span>📅 {new Date(ev.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</span>
                      {ev.venue && <span>📍 {ev.venue}</span>}
                      <span>👤 {ev.facultyName}</span>
                      {ev.guestName && <span>🎤 {ev.guestName}</span>}
                    </div>
                    <div className="hp-ev-footer">
                      <span className="hp-ev-count">👥 {ev.registrationCount} registered</span>
                      {isReg
                        ? <button className="hp-ev-done-btn">✅ Registered</button>
                        : <button className="hp-ev-reg-btn"
                            onClick={() => handleRegister(ev.id)}
                            disabled={registering === ev.id}>
                            {registering === ev.id ? "…" : "Register →"}
                          </button>
                      }
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* FEATURES SECTION */}
      <section className="hp-features-section" id="features">
        <div className="hp-feat-top-cut" />
        <div className="hp-section">
          <div className="hp-sec-header">
            <span className="hp-sec-tag" style={{ color:"#7c3aed", background:"#ede9fe" }}>⚡ Why EventHub</span>
            <h2 className="hp-sec-title" style={{ color:"#fff" }}>
              Everything You <span style={{ color:"#f9a8d4" }}>Need</span>
            </h2>
            <p className="hp-sec-sub" style={{ color:"rgba(255,255,255,0.7)" }}>
              A complete platform for managing and discovering university events
            </p>
          </div>
          <div className="hp-feat-grid">
            {FEATURES.map((f,i) => (
              <div className="hp-feat-card" key={i}>
                <div className="hp-feat-icon">{f.icon}</div>
                <h4 className="hp-feat-title">{f.title}</h4>
                <p className="hp-feat-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ FOOTER ════════════ */}
      <footer className="hpf-root">
        <div className="hpf-main">
          <div className="hpf-grid">

            {/* Brand */}
            <div className="hpf-brand-col">
              <div className="hpf-brand-logo">🎓 EventHub</div>
              <p className="hpf-brand-desc">
                Aurora University's official event portal. Discover, register, and manage campus events seamlessly.
              </p>
              <div className="hpf-contact-list">
                <div className="hpf-contact-item">
                  <span className="hpf-contact-icon">✉️</span>
                  <span>events@au.edu.in</span>
                </div>
                <div className="hpf-contact-item">
                  <span className="hpf-contact-icon">📞</span>
                  <span>+91 40 6730 1000</span>
                </div>
                <div className="hpf-contact-item">
                  <span className="hpf-contact-icon">📍</span>
                  <span>Hyderabad, Telangana, India</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="hpf-link-col">
              <h4 className="hpf-col-heading">Quick Links</h4>
              <ul className="hpf-link-list">
                <li><a href="#events"   className="hpf-link">Browse Events</a></li>
                <li><a href="#features" className="hpf-link">Features</a></li>
                <li><a href="#about"    className="hpf-link">About</a></li>
                <li><span className="hpf-link" onClick={() => onNavigate("login")}>Login</span></li>
                <li><span className="hpf-link" onClick={() => onNavigate("register")}>Register</span></li>
              </ul>
            </div>

            {/* Support */}
            <div className="hpf-link-col">
              <h4 className="hpf-col-heading">Support</h4>
              <ul className="hpf-link-list">
                <li><span className="hpf-link">Help Center</span></li>
                <li><span className="hpf-link">Contact Us</span></li>
                <li><span className="hpf-link">Privacy Policy</span></li>
                <li><span className="hpf-link">Terms of Use</span></li>
              </ul>
            </div>

          </div>
        </div>

        {/* Bottom bar */}
        <div className="hpf-bottom">
          <div className="hpf-bottom-inner">
            <span className="hpf-bottom-copy">© {new Date().getFullYear()} EventHub · Aurora University · All rights reserved.</span>
            <div className="hpf-social-row">
              <a href="#" className="hpf-social-btn">𝕏</a>
              <a href="#" className="hpf-social-btn">in</a>
              <a href="#" className="hpf-social-btn">▶</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}