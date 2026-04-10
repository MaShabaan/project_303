import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { auth, db } from './firebaseConfig';
import './SubmitTicket.css';

function SubmitTicket({ onBack }) {
  const [formData, setFormData] = useState({
    category: '',
    subject: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const priorityMap = {
    'Harrasment or Bullying': 1,
    'Registration': 2,
    'Building issues': 3,
    'Other': 4
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await addDoc(collection(db, 'tickets'), {
        studentId: auth.currentUser.uid,
        studentEmail: auth.currentUser.email,
        category: formData.category,
        subject: formData.subject || 'N/A',
        description: formData.description,
        priorityScore: priorityMap[formData.category] || 4,
        status: 'open',
        createdAt: serverTimestamp()
      });

      alert("Ticket submitted successfully!");
      onBack();
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="submit-ticket-page">
      <div className="ticket-wide-container">
        <div className="ticket-header">
          <h1>Submit Support Ticket</h1>
          <button className="back-btn" onClick={onBack}>Cancel</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Category</label>
            <select name="category" className="ticket-input" value={formData.category} onChange={handleChange} required>
              <option value="">-- Select Category --</option>
              <option value="Harrasment or Bullying">Harrasment or Bullying</option>
              <option value="Building issues">Building issues</option>
              <option value="Registration">Registration</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {formData.category === 'Registration' && (
            <div className="form-group">
              <label>Subject</label>
              <input 
                name="subject" 
                type="text" 
                className="ticket-input" 
                value={formData.subject} 
                onChange={handleChange} 
                placeholder="Enter subject" 
                required 
              />
            </div>
          )}

          <div className="form-group">
            <label>Description</label>
            <textarea 
              name="description" 
              className="ticket-input" 
              value={formData.description} 
              onChange={handleChange} 
              placeholder="Describe your issue in detail..." 
              required 
            />
          </div>

          <button type="submit" className="btn-submit-ticket" disabled={submitting}>
            {submitting ? "Sending..." : "Submit Ticket"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default SubmitTicket;