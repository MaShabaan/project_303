import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import './Auth.css';

export default function Login({ onNavigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
     
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      if (userData?.isBlocked === true) {
        await auth.signOut();
        
        let message = '⛔ Your account has been blocked.';
        
        if (userData.blockDetails?.reason) {
          message = `⛔ Account Blocked\n\nReason: ${userData.blockDetails.reason}`;
        }
        
        if (userData.blockDetails?.expiresAt) {
          const expiryDate = userData.blockDetails.expiresAt.toDate();
          if (expiryDate > new Date()) {
            message += `\n\nUnblock Date: ${expiryDate.toLocaleDateString()}`;
          }
        } else if (userData.blockDetails?.duration === 'permanent') {
          message += `\n\nThis is a permanent block.`;
        }
        
        alert(message);
        setError(message);
        return;
      }
      
      if (!userData) {
        await auth.signOut();
        alert('❌ Account not found. Please contact support.');
        setError('Account not found');
        return;
      }
      
      onNavigate('dashboard');
      
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.code === 'auth/invalid-credential') {
        setError('Invalid email or password');
        alert('Invalid email or password');
      } else if (error.code === 'auth/user-not-found') {
        setError('Account not found');
        alert('Account not found');
      } else if (error.code === 'auth/wrong-password') {
        setError('Wrong password');
        alert('Wrong password');
      } else {
        setError(error.message);
        alert(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-image">
        <img src="/assets/images/logo.jpg" alt="Logo" />
        <p>LETS SHARE FEEDBACK, RESOLVE ISSUES</p>
      </div>
      <div className="auth-form">
        <form onSubmit={handleSubmit}>
          <h2>LOGIN</h2>
          {error && <div className="error-message">{error}</div>}
          <input 
            type="email" 
            placeholder="EMAIL" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
          <input 
            type="password" 
            placeholder="PASSWORD" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Loading...' : 'LOGIN'}
          </button>
          <p onClick={() => onNavigate('forgot')}>Forgot Password?</p>
          <p onClick={() => onNavigate('signup')}>Sign Up</p>
        </form>
      </div>
    </div>
  );
}