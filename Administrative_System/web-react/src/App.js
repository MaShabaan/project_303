import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import './App.css';
import AdminDashboard from './pages/AdminDashboard';
import Complaints from './pages/Complaints';
import Feedback from './pages/Feedback';
import ForgotPassword from './pages/ForgotPassword';
import Login from './pages/Login';
import ManageCourses from './pages/ManageCourses';
import ProfileSettings from './pages/ProfileSettings';
import SignUp from './pages/SignUp';
import Statistics from './pages/Statistics';
import SubmitTicket from './pages/SubmitTicket';
import { ThemeProvider } from './pages/ThemeContext';
import UserDashboard from './pages/UserDashboard';
import Users from './pages/Users';
import RateCourse from './pages/RateCourse';
import Enrollments from './pages/Enrollments';
import MyRatings from './pages/MyRatings';

import { auth, db } from './services/firebase';


function AppContent() {
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
if (view === 'manage-courses') {
  return <ManageCourses user={currentUser} onBack={() => handleNavigate('back')} />;
}
  if (view === 'login') return <Login onNavigate={handleNavigate} />;
  if (view === 'signup') return <SignUp onNavigate={handleNavigate} />;
  if (view === 'forgot') return <ForgotPassword onNavigate={handleNavigate} />;
  if (view === 'submit-ticket') {
    return <SubmitTicket user={currentUser} onBack={() => handleNavigate('back')} />;
  }
  if (view === 'feedback') {
  return <Feedback user={currentUser} onBack={() => handleNavigate('back')} />;
}
if (view === 'statistics') {
  return <Statistics user={currentUser} onBack={() => handleNavigate('back')} />;
}
  if (view === 'complaints') {
    return <Complaints user={currentUser} onBack={() => handleNavigate('back')} />;
  }
  if (view === 'users') {
    return <Users user={currentUser} onBack={() => handleNavigate('back')} />;
  }
  if (view === 'profile') {
    return <ProfileSettings user={currentUser} onBack={() => handleNavigate('back')} />;
  }
  if (view === 'enrollments') {
  return <Enrollments user={currentUser} onBack={() => handleNavigate('back')} />;
  
}

 if (view === 'rate-course') {
  return <RateCourse onBack={() => handleNavigate('back')} />; // ← من غير user
}
if (view === 'my-ratings') {
  return <MyRatings onBack={() => handleNavigate('back')} />;
}
  if (view === 'dashboard' && currentUser) {
    if (userRole === 'admin' || userRole === 'super_admin') {
      return <AdminDashboard user={currentUser} onNavigate={handleNavigate} />;
    }
    return <UserDashboard user={currentUser} onNavigate={handleNavigate} />;
  }
  

  return <Login onNavigate={handleNavigate} />;
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;