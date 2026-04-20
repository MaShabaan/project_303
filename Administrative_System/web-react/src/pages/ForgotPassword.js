// web-react/src/pages/ForgotPassword.jsx

import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';
import './Auth.css';

export default function ForgotPassword({ onNavigate }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('Reset link sent! Please check your email.');
      setTimeout(() => onNavigate('login'), 3000);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        setError('No account found with this email');
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-image">
        <img src="/assets/images/science-faculty-logo.jpg" alt="Logo" />
        <p>RESET PASSWORD</p>
      </div>
      <div className="auth-form">
        <form onSubmit={handleSubmit}>
          <h2>FORGOT PASSWORD</h2>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          <input 
            type="email" 
            placeholder="EMAIL" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'SEND RESET LINK'}
          </button>
          <p onClick={() => onNavigate('login')}>Back to Login</p>
        </form>
      </div>
    </div>
  );
}