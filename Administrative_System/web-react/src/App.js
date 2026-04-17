import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';

import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import AdminDashboard from './AdminDashboard';
import Complaints from './Complaints';
import Users from './Users';
import Notifications from './Notifications';

import SignUp from './SignUp';
import './App.css';

import { auth, db } from './firebaseConfig';

function App() {

  const [view, setView] = useState('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  
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

  
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsLoggedIn(false);
      setCurrentUser(null);
      setView('login');
    } catch (error) {
      alert("Error logging out");
    }
  };

  
  const handleForgotPassword = async () => {
    const email = prompt("Enter your email:");
    if (!email) return;

    try {
      await sendPasswordResetEmail(auth, email);
      alert("Check your email!");
    } catch (error) {
      alert(error.message);
    }
  };

  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.exists() ? userDoc.data() : {};

          setCurrentUser({
            uid: user.uid,
            email: user.email,
            name: userData.fullName || user.email
          });

          setIsLoggedIn(true);
          setView('dashboard');

        } catch (error) {
          console.error(error);
        }
      } else {
        setIsLoggedIn(false);
        setView('login');
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;

  
  if (isLoggedIn) {

    if (view === 'complaints') {
      return <Complaints setView={setView} />;
    }

    if (view === 'users') {
      return <Users setView={setView} />;
    }
    if (view === "notifications") {
      return <Notifications setView={setView} />;
    }

    return (
      <AdminDashboard
        user={currentUser}
        setView={setView}
        onLogout={handleLogout}
      />
    );
  }

  
  if (view === 'signup') {
    return <SignUp onBack={() => setView('login')} />;
  }

  
  return (
  <div className="App">
  <div className="login-page">

    <div className="login-header">
      <img
        src="/assets/images/science-faculty-logo.jpg"
        alt="logo"
        className="login-logo"
      />
      <p>LETS SHARE FEEDBACK, RESOLVE ISSUES</p>
    </div>

    <form onSubmit={handleLogin} className="login-box">
      <h2>LOGIN</h2>

      <input name="email" type="email" placeholder="EMAIL" required />
      <input name="password" type="password" placeholder="PASSWORD" required />

      <button type="submit">LOGIN</button>

      <p onClick={handleForgotPassword}>Forgot Password?</p>
      <p onClick={() => setView('signup')}>Create New Account</p>
    </form>

  </div>
</div>
  );
}

export default App;