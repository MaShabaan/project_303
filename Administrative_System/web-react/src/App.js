 masa--2
import { useState } from "react";
import AdminDashboard from "./AdminDashboard";
import Complaints from "./Complaints";
import Users from "./Users";
import MyRatings from "./MyRatings";

function App() {
  const [view, setView] = useState("dashboard");

  if (view === "complaints") {
    return <Complaints setView={setView} />;
  }

  if (view === "users") {return <Users setView={setView} />;}

  if (view === "ratings") {
    return <MyRatings setView={setView} />;
  } 
  

  return (
    <AdminDashboard
      user={{ name: "Admin", email: "admin@test.com" }}
      setView={setView}
      onLogout={() => alert("Logout")}
    />

import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import AdminDashboard from './AdminDashboard';
import './App.css';
import { auth, db } from './firebaseConfig';
import MyRatings from './MyRatings';
import MyTickets from './MyTickets';
import RateCourse from './RateCourse';
import SignUp from './SignUp';
import SubmitTicket from './SubmitTicket';

function App() {
  const [view, setView] = useState('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('student');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          name: userData.name || 'Student',
          major: userData.major,
          semester: userData.semester
        });
        
        setUserRole(userData.role || 'student');
        setIsLoggedIn(true);
        if (view === 'login' || view === 'signup') setView('dashboard');
      } else {
        setIsLoggedIn(false);
        if (view !== 'signup') setView('login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [view]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, e.target.email.value, e.target.password.value);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleForgotPassword = async () => {
    const email = prompt("Please enter your university email:");
    if (email) {
      try {
        await sendPasswordResetEmail(auth, email);
        alert("Reset link sent! Please check your email.");
      } catch (error) {
        alert(error.message);
      }
    }
  };

  if (loading) return <div>Loading...</div>;

  if (isLoggedIn) {
    if (userRole === 'admin') return <AdminDashboard onLogout={() => signOut(auth)} />;

    if (view === 'rate-course') return <RateCourse user={currentUser} onBack={() => setView('dashboard')} />;
    if (view === 'my-ratings') return <MyRatings user={currentUser} onBack={() => setView('dashboard')} />;
    if (view === 'submit-ticket') return <SubmitTicket user={currentUser} onBack={() => setView('dashboard')} />;
    if (view === 'my-tickets') return <MyTickets user={currentUser} onBack={() => setView('dashboard')} />;

    return (
      <div className="dashboard-wrapper">
        <header className="dashboard-header">
          <div className="header-brand">
           <img src="/assets/images/science-faculty-logo.jpg" alt="Logo" className="header-logo" />
            <span className="header-title">Faculty of Science Portal</span>
          </div>
          <div className="user-info-section">
            <span className="user-name">{currentUser?.name}</span>
            <span className="user-details">{currentUser?.major} | Semester {currentUser?.semester}</span>
          </div>
        </header>

        <main className="dashboard-content">
          <div className="welcome-message">
            <h2>Welcome Back</h2>
            <p>Student Academic Services</p>
          </div>

          <div className="cards-grid">
            <div className="dashboard-card" onClick={() => setView('rate-course')}>
              <span className="card-icon">⭐</span>
              <span className="card-title">Rate Courses</span>
              <span className="card-desc">Provide feedback on your current subjects</span>
            </div>
            <div className="dashboard-card" onClick={() => setView('my-ratings')}>
              <span className="card-icon">📊</span>
              <span className="card-title">My Ratings</span>
              <span className="card-desc">View your submitted evaluations</span>
            </div>
            <div className="dashboard-card" onClick={() => setView('submit-ticket')}>
              <span className="card-icon">🎫</span>
              <span className="card-title">Submit Ticket</span>
              <span className="card-desc">Report an issue or request support</span>
            </div>
            <div className="dashboard-card" onClick={() => setView('my-tickets')}>
              <span className="card-icon">📩</span>
              <span className="card-title">My Tickets</span>
              <span className="card-desc">Track the status of your requests</span>
            </div>
          </div>

          <div className="logout-container">
            <button className="btn-logout" onClick={() => signOut(auth)}>Log Out</button>
          </div>
        </main>
      </div>
    );
  }

  if (view === 'signup') return <SignUp onBack={() => setView('login')} />;

  return (
    <div className="signup-box">
     <img src="/assets/images/science-faculty-logo.jpg" alt="Logo" className="university-logo" />
      <h1 className="box-title">Portal Login</h1>
      <h3 className="box-sub-title">Faculty of Science</h3>
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label className="input-label">Email</label>
          <input name="email" type="email" className="signup-input" placeholder="name@email.com" required />
        </div>
        <div className="form-group">
          <label className="input-label">Password</label>
          <input name="password" type="password" className="signup-input" placeholder="••••••••" required />
        </div>

        <p style={{ textAlign: 'right', marginBottom: '20px' }}>
          <span className="login-link" style={{ fontSize: '14px' }} onClick={handleForgotPassword}>
            Forgot Password?
          </span>
        </p>

        <button type="submit" className="btn-register">Login</button>
        <p className="footer-text">
          Don't have an account? <span className="login-link" onClick={() => setView('signup')}>Sign Up</span>
        </p>
      </form>
    </div>
 main
  );
}

export default App;