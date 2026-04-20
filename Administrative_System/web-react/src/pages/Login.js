// web-react/src/pages/Login.jsx

import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
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
      await signInWithEmailAndPassword(auth, email, password);
      onNavigate('dashboard');
    } catch (error) {
      if (error.code === 'auth/invalid-credential') {
        setError('Invalid email or password');
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