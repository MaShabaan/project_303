// web-react/src/App.js

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './services/firebase';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SubmitTicket from './pages/SubmitTicket';
import './App.css';

function App() {
  const [view, setView] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const role = userDoc.exists() ? userDoc.data().role : 'user';
          setUserRole(role);
        } catch (error) {
          console.error(error);
          setUserRole('user');
        }
        setView('dashboard');
      } else {
        setCurrentUser(null);
        setView('login');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleNavigate = (route) => {
    console.log('Navigating to:', route); // ← للتأكد
    if (route === 'logout') {
      auth.signOut();
      setView('login');
    } else if (route === 'back') {
      setView('dashboard');
    } else {
      setView(route);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  // صفحات المصادقة
  if (view === 'login') return <Login onNavigate={handleNavigate} />;
  if (view === 'signup') return <SignUp onNavigate={handleNavigate} />;
  if (view === 'forgot') return <ForgotPassword onNavigate={handleNavigate} />;

  // صفحة تقديم الشكوى
  if (view === 'submit-ticket') {
    return <SubmitTicket user={currentUser} onBack={() => handleNavigate('back')} />;
  }

  // داشبورد حسب الدور
  if (view === 'dashboard' && currentUser) {
    if (userRole === 'admin' || userRole === 'super_admin') {
      return <AdminDashboard user={currentUser} onNavigate={handleNavigate} />;
    }
    return <UserDashboard user={currentUser} onNavigate={handleNavigate} />;
  }

  return <Login onNavigate={handleNavigate} />;
}

export default App;