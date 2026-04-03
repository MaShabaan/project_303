import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { auth, db } from './firebaseConfig';
import './SubmitTicket.css';

function SubmitTicket({ user, onBack }) {
  const [formData, setFormData] = useState({
    category: '',
    subject: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);

const handleSubmit = async (e) => {
  e.preventDefault();
  if (formData.category === 'Registration' && !formData.subject) {
    alert("Please enter a subject.");
    return;
  }

  setSubmitting(true);
  try {
    const user = auth.currentUser;
    await addDoc(collection(db, 'tickets'), {
      studentId: user.uid,
      studentEmail: user.email,
      category: formData.category,
      subject: formData.subject || 'N/A',
      description: formData.description,
      status: 'open',
      createdAt: serverTimestamp()
    });

    alert("✅ Ticket submitted to Firestore!");
    setFormData({ category: '', subject: '', description: '' });
    onBack();
  } catch (error) {
    console.error("Error:", error);
    alert("Failed to submit. Check console.");
  } finally {
    setSubmitting(false);
  }
};

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  return (
    <div className="submit-ticket-page">
      <div className="background-overlay"></div>
      <div className="submit-ticket-container">
        <h1>Submit Support Ticket</h1>
        <div className="user-role-badge">USER</div>
        <br />
        <button className="back-link" onClick={onBack} style={{border: 'none', background: 'none', color: '#667eea', cursor: 'pointer', marginBottom: '15px'}}>
          &larr; Back to Dashboard
        </button>

        <div className="ticket-form-container">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select id="category" value={formData.category} onChange={handleChange} required>
                <option value="">Select a category</option>
                <option value="Harrasment or Bullying">Harrasment or Bullying</option>
                <option value="Building issues">Building issues</option>
                <option value="Registration">Registration</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Only show subject if category is Registration */}
            {formData.category === 'Registration' && (
              <div className="form-group">
                <label htmlFor="subject">Subject (Required for Registration)</label>
                <input type="text" id="subject" value={formData.subject} onChange={handleChange} placeholder="Enter ticket subject" required />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea id="description" value={formData.description} onChange={handleChange} placeholder="Describe your issue in detail" required />
            </div>

            <button type="submit" className="action-button" disabled={submitting}>
              {submitting ? "SUBMITTING..." : "SUBMIT TICKET"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SubmitTicket;