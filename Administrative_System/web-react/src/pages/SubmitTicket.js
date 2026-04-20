// web-react/src/pages/SubmitTicket.jsx

import React, { useState } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import './SubmitTicket.css';

const TICKET_TYPES = [
  { value: "harassment", label: "Harassment", priority: "urgent" },
  { value: "complaint", label: "Complaint", priority: "high" },
  { value: "technical_issue", label: "Technical Issue", priority: "medium" },
  { value: "request", label: "Request", priority: "low" },
];

export default function SubmitTicket({ user, onBack }) {
  const [ticketType, setTicketType] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user?.uid) {
      alert('You must be signed in to submit a complaint.');
      return;
    }
    if (!ticketType) {
      alert('Please select a complaint type.');
      return;
    }
    if (!title.trim()) {
      alert('Please enter a title.');
      return;
    }
    if (!description.trim()) {
      alert('Please enter a description.');
      return;
    }

    setLoading(true);
    try {
      let priority = "medium";
      if (ticketType === "harassment") priority = "urgent";
      if (ticketType === "complaint") priority = "high";
      if (ticketType === "request") priority = "low";

      await addDoc(collection(db, 'tickets'), {
        userId: user.uid,
        userEmail: user.email,
        isAnonymous: isAnonymous,
        type: ticketType,
        title: title.trim(),
        description: description.trim(),
        priority: priority,
        status: "open",
        adminReply: null,
        repliedAt: null,
        repliedBy: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      
      alert(isAnonymous 
        ? 'Your anonymous complaint has been recorded. Admin will see it as "Anonymous".'
        : 'Your complaint has been recorded. We will review it and get back to you within 24 hours.');
      
      onBack();
    } catch (error) {
      console.error(error);
      alert('Failed to submit complaint. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    onBack();
  };

  return (
    <div className="submit-container">
      <div className="submit-header">
        <button className="back-button" onClick={handleBack}>
          ← Back
        </button>
        <div className="header-center">
          <h1 className="header-title">Submit Complaint</h1>
          <p className="header-sub">We'll review and get back to you</p>
        </div>
        <div style={{ width: 60 }} />
      </div>

      <div className="submit-content">
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <label className="section-label">COMPLAINT TYPE</label>
            <div className="types-grid">
              {TICKET_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`type-btn ${ticketType === value ? 'active' : ''}`}
                  onClick={() => setTicketType(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-section">
            <label className="section-label">TITLE</label>
            <input
              type="text"
              className="form-input"
              placeholder="Short title for your complaint"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-section">
            <label className="section-label">DESCRIPTION</label>
            <textarea
              className="form-textarea"
              placeholder="Describe the issue in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              required
            />
          </div>

          <div className="form-section">
            <label className="section-label">ANONYMOUS</label>
            <div className={`anonymous-option ${isAnonymous ? 'checked' : ''}`} onClick={() => setIsAnonymous(!isAnonymous)}>
              <div className={`checkbox ${isAnonymous ? 'checked' : ''}`}>
                {isAnonymous && <span className="check-icon">✓</span>}
              </div>
              <div className="anonymous-text">
                <div className="anonymous-title">Submit anonymously</div>
                <div className="anonymous-subtext">
                  Admin will see this as "Anonymous", but super admin can see your identity
                </div>
              </div>
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Complaint'}
          </button>
        </form>
      </div>
    </div>
  );
}