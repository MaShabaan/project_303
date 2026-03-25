import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { auth, db } from './firebaseConfig';
import './RateCourse.css';

function RateCourse({ user, onBack }) {
  const [formData, setFormData] = useState({
    courseName: '',
    instructorName: '',
    courseRating: '5',
    instructorRating: '5',
    comment: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
    
await addDoc(collection(db, 'course-ratings'), {
  studentId: auth.currentUser.uid,
  courseName: formData.courseName,
  instructorName: formData.instructorName,
  courseRating: formData.courseRating.toString(), // Convert to string
  instructorRating: formData.instructorRating.toString(), // Convert to string
  comment: formData.comment,
  createdAt: serverTimestamp()
});

      alert("✅ Thank you! Your rating has been submitted.");
      onBack(); // Return to dashboard
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("Error submitting rating. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  return (
    <div className="rate-course-page">
      <div className="background-overlay"></div>
      <div className="rate-course-container">
        <h1>Rate a Course</h1>
        <button className="back-link" onClick={onBack} style={{border: 'none', background: 'none', color: '#667eea', cursor: 'pointer', marginBottom: '15px'}}>
          &larr; Back to Dashboard
        </button>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="courseName">Course Name</label>
            <input type="text" id="courseName" placeholder="Enter course name" required onChange={handleChange} />
          </div>

          <div className="form-group">
            <label htmlFor="instructorName">Instructor Name</label>
            <input type="text" id="instructorName" placeholder="Enter instructor name" required onChange={handleChange} />
          </div>

          <div className="form-group">
            <label htmlFor="courseRating">Course Rating (1-5)</label>
            <select id="courseRating" onChange={handleChange}>
              <option value="5">5 - Excellent</option>
              <option value="4">4 - Very Good</option>
              <option value="3">3 - Average</option>
              <option value="2">2 - Poor</option>
              <option value="1">1 - Terrible</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="instructorRating">Instructor Rating (1-5)</label>
            <select id="instructorRating" onChange={handleChange}>
              <option value="5">5 - Excellent</option>
              <option value="4">4 - Very Good</option>
              <option value="3">3 - Average</option>
              <option value="2">2 - Poor</option>
              <option value="1">1 - Terrible</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="comment">Optional Comment</label>
            <textarea id="comment" placeholder="Share any additional feedback" onChange={handleChange}></textarea>
          </div>

          <button type="submit" className="action-button" disabled={submitting}>
            {submitting ? "SUBMITTING..." : "SUBMIT RATING"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default RateCourse;