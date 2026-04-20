// web-react/src/pages/SignUp.jsx

import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import './Auth.css';

const DIVISIONS = [
  { value: "computer_science", label: "Computer Science", icon: "💻" },
  { value: "special_mathematics", label: "Special Mathematics", icon: "📐" },
];

export default function SignUp({ onNavigate }) {
  const [fullName, setFullName] = useState('');
  const [academicCode, setAcademicCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [division, setDivision] = useState(null);
  const [academicYear, setAcademicYear] = useState(2);
  const [currentTerm, setCurrentTerm] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!academicCode.trim()) {
      setError('Please enter your academic code');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!division) {
      setError('Please select your division');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email,
        fullName: fullName.trim(),
        academicCode: academicCode.trim(),
        division,
        academicYear,
        currentTerm,
        department: "Mathematics Department",
        role: "user",
        createdAt: new Date(),
      });
      
      onNavigate('login');
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setError('Email already in use');
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
        <p>CREATE ACCOUNT</p>
      </div>
      <div className="auth-form signup-form">
        <form onSubmit={handleSubmit}>
          <h2>SIGN UP</h2>
          {error && <div className="error-message">{error}</div>}
          
          <div className="input-group">
            <label className={focusedField === 'name' ? 'label-focused' : ''}>FULL NAME</label>
            <input 
              type="text" 
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
              required 
            />
          </div>

          <div className="input-group">
            <label className={focusedField === 'academic' ? 'label-focused' : ''}>ACADEMIC CODE</label>
            <input 
              type="text" 
              placeholder="7 digits (format: xx27xxx)"
              value={academicCode}
              onChange={(e) => setAcademicCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 7))}
              onFocus={() => setFocusedField('academic')}
              onBlur={() => setFocusedField(null)}
              maxLength={7}
              required 
            />
          </div>

          <div className="input-group">
            <label className={focusedField === 'email' ? 'label-focused' : ''}>EMAIL</label>
            <input 
              type="email" 
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              required 
            />
          </div>

          <div className="input-group">
            <label className={focusedField === 'pass' ? 'label-focused' : ''}>PASSWORD</label>
            <input 
              type="password" 
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField('pass')}
              onBlur={() => setFocusedField(null)}
              required 
            />
          </div>

          <div className="input-group">
            <label className={focusedField === 'confirm' ? 'label-focused' : ''}>CONFIRM PASSWORD</label>
            <input 
              type="password" 
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onFocus={() => setFocusedField('confirm')}
              onBlur={() => setFocusedField(null)}
              required 
            />
          </div>

          <div className="department-banner">
            <div className="department-icon">🎓</div>
            <div>
              <div className="department-label">DEPARTMENT</div>
              <div className="department-name">Mathematics Department</div>
            </div>
            <div className="department-check">✓</div>
          </div>

          <div className="input-group">
            <label>SELECT DIVISION</label>
            <div className="division-row">
              {DIVISIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  className={`division-btn ${division === d.value ? 'active' : ''}`}
                  onClick={() => setDivision(d.value)}
                >
                  <span>{d.icon}</span>
                  <span>{d.label}</span>
                  {division === d.value && <span className="division-dot" />}
                </button>
              ))}
            </div>
          </div>

          <div className="input-group">
            <label>ACADEMIC YEAR</label>
            <div className="division-row">
              {[2, 3, 4].map((y) => (
                <button
                  key={y}
                  type="button"
                  className={`division-btn ${academicYear === y ? 'active' : ''}`}
                  onClick={() => setAcademicYear(y)}
                >
                  Year {y}
                  {academicYear === y && <span className="division-dot" />}
                </button>
              ))}
            </div>
          </div>

          <div className="input-group">
            <label>CURRENT SEMESTER</label>
            <div className="division-row">
              {[1, 2].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`division-btn ${currentTerm === t ? 'active' : ''}`}
                  onClick={() => setCurrentTerm(t)}
                >
                  Term {t}
                  {currentTerm === t && <span className="division-dot" />}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'SIGN UP'}
          </button>
          
          <p onClick={() => onNavigate('login')}>Already have an account? Login</p>
        </form>
      </div>
    </div>
  );
}