import { useState } from "react";
import "./styles.css";

import Home         from "./pages/home";
import Login        from "./pages/login";
import Register     from "./pages/register";
import AdminDashboard   from "./pages/admindashboard";
import FacultyDashboard from "./pages/facultydashboard";
import StudentDashboard from "./pages/studentdashboard";

function App() {
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")) || null; }
    catch { return null; }
  });

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    if (userData.role === "admin")   setPage("admin");
    else if (userData.role === "faculty") setPage("faculty");
    else setPage("student");
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setPage("home");
  };

  // If already logged in and still on "home", redirect to dashboard
  if (user && page === "home") {
    if (user.role === "admin")   return <AdminDashboard   onLogout={handleLogout} />;
    if (user.role === "faculty") return <FacultyDashboard onLogout={handleLogout} />;
    if (user.role === "student") return <StudentDashboard onLogout={handleLogout} />;
  }

  if (page === "admin"   && user?.role === "admin")   return <AdminDashboard   onLogout={handleLogout} />;
  if (page === "faculty" && user?.role === "faculty") return <FacultyDashboard onLogout={handleLogout} />;
  if (page === "student" && user?.role === "student") return <StudentDashboard onLogout={handleLogout} />;
  if (page === "login")    return <Login    onLogin={handleLogin} onNavigate={setPage} />;
  if (page === "register") return <Register onNavigate={setPage} />;

  return <Home onNavigate={setPage} user={user} onLogout={handleLogout} />;
}

export default App;