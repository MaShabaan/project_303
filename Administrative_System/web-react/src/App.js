import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';

import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import AdminDashboard from './AdminDashboard';
import ManageCourses from "./ManageCourses";
import ManageRatings from "./ManageRatings";

import './App.css';

import MyRatings from './MyRatings';
import MyTickets from './MyTickets';
import RateCourse from './RateCourse';
import SignUp from './SignUp';
import SubmitTicket from './SubmitTicket';

import { auth, db } from './firebaseConfig';

function App() {
  const [view, setView] = useState('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('student');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ================= LOGIN =================
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(
        auth,
        e.target.email.value,
        e.target.password.value
      );
    } catch (error) {
      alert(error.message);
    }
  };

  // ================= LOGOUT =================
  const handleLogout = async () => {
    await signOut(auth);
    setIsLoggedIn(false);
    setCurrentUser(null);
    setView('login');
  };

  // ================= FORGOT PASSWORD =================
  const handleForgotPassword = async () => {
    const email = prompt("Please enter your email address to reset password:");
    if (!email) return;

    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent!");
    } catch (error) {
      alert(error.message);
    }
  };

  // ================= AUTH LISTENER =================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const role = userDoc.exists() ? userDoc.data().role : 'user';
          const userData = userDoc.exists() ? userDoc.data() : {};

          setCurrentUser({
            uid: user.uid,
            email: user.email,
            name: userData.fullName || user.email.split('@')[0],
            lastLogin:
              userData.lastLogin?.toDate().toLocaleString() ||
              new Date().toLocaleString()
          });

          setUserRole(role);
          setIsLoggedIn(true);

          if (view === 'login' || view === 'signup') {
            setView('dashboard');
          }
        } catch (error) {
          console.error(error);
        }
      } else {
        setIsLoggedIn(false);
        if (view !== 'signup') setView('login');
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [view]);

  if (loading) return <div>Loading...</div>;

  // ================= SIGNUP =================
  if (view === 'signup') {
    return <SignUp onBack={() => setView('login')} />;
  }

  // ================= LOGGED IN =================
  if (isLoggedIn) {

    // ================= ADMIN =================
    if (userRole === 'admin') {

      if (view === 'manage-courses') {
        return <ManageCourses onBack={() => setView('dashboard')} />;
      }

      if (view === 'manage-ratings') {
        return (
          <ManageRatings
            user={currentUser}
            onBack={() => setView('dashboard')}
          />
        );
      }

      return (
        <AdminDashboard
          user={currentUser}
          onLogout={handleLogout}
          setView={setView}
        />
      );
    }

    // ================= USER =================
    switch (view) {
      case 'my-ratings':
        return <MyRatings user={currentUser} onBack={() => setView('dashboard')} />;

      case 'my-tickets':
        return <MyTickets user={currentUser} onBack={() => setView('dashboard')} />;

      case 'rate-course':
        return <RateCourse user={currentUser} onBack={() => setView('dashboard')} />;

      case 'submit-ticket':
        return <SubmitTicket user={currentUser} onBack={() => setView('dashboard')} />;

      case 'manage-courses':
        return <ManageCourses onBack={() => setView('dashboard')} />;

      default:
        return (
          <div className="App">
            <div className="background-overlay"></div>

            <div className="dashboard-container">
              <div className="welcome-header">
                <h1>Welcome, {currentUser?.name}!</h1>
                <div className="user-role-badge">
                  {userRole.toUpperCase()}
                </div>
              </div>

              <div className="dashboard-cards">

                <div className="card" onClick={() => setView('rate-course')}>
                  ⭐ Rate Courses
                </div>

                <div className="card" onClick={() => setView('my-ratings')}>
                  📊 My Ratings
                </div>

                <div className="card" onClick={() => setView('submit-ticket')}>
                  🎫 Submit Ticket
                </div>

                <div className="card" onClick={() => setView('my-tickets')}>
                  📩 My Tickets
                </div>

                <div className="card" onClick={() => setView('manage-courses')}>
                  📚 Manage Courses
                </div>

              </div>

              <button onClick={handleLogout} className="action-button logout-btn">
                LOGOUT
              </button>
            </div>
          </div>
        );
    }
  }

  // ================= LOGIN PAGE =================
  return (
    <div className="App">
      <div className="background-overlay"></div>

      <div className="content-wrapper">
        <div className="image-container">
          <img
            src="/assets/images/science-faculty-logo.jpg"
            alt="Logo"
            className="center-image"
          />
          <p className="feedback-text">
            LET'S SHARE FEEDBACK, RESOLVE ISSUES
          </p>
        </div>

        <div className="fieldcontainer">
          <form onSubmit={handleLogin}>
            <h2 className="form-title">LOGIN</h2>

            <input name="email" type="email" placeholder="EMAIL" required />
            <input name="password" type="password" placeholder="PASSWORD" required />

            <button type="submit">LOGIN</button>

            <p onClick={handleForgotPassword} style={{ cursor: "pointer" }}>
              Forgot Password?
            </p>

            <p onClick={() => setView('signup')} style={{ cursor: "pointer" }}>
              Sign Up
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;