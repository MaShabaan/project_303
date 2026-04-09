import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { universitySubjects } from './academicData';
import { auth, db } from './firebaseConfig';
import './RateCourse.css';

function RateCourse({ user, onBack }) {
  const availableSubjects = universitySubjects[user?.major]?.[user?.semester] || [];

  const [formData, setFormData] = useState({
    courseName: '',
    courseRating: '5',
    comment: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await addDoc(collection(db, 'course-ratings'), {
        studentId: auth.currentUser.uid,
        email: auth.currentUser.email,
        major: user?.major,
        semester: user?.semester,
        courseName: formData.courseName,
        courseRating: formData.courseRating,
        comment: formData.comment,
        createdAt: serverTimestamp()
      });

      alert("Rating submitted!");
      onBack(); 
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rate-course-page">
      <div className="rate-course-container">
        <div className="rate-header">
          <h1>Course Evaluation</h1>
          <button className="back-btn" onClick={onBack}>Exit</button>
        </div>

        <div className="user-badge">
          {user?.major} — Semester {user?.semester}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Course Name</label>
            <select name="courseName" className="rate-input" required onChange={handleChange} value={formData.courseName}>
              <option value="">-- Select --</option>
              {availableSubjects.map((subject, index) => (
                <option key={index} value={subject}>{subject}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Rating</label>
            <select name="courseRating" className="rate-input" onChange={handleChange} value={formData.courseRating}>
              <option value="5">5 - Excellent</option>
              <option value="4">4 - Very Good</option>
              <option value="3">3 - Average</option>
              <option value="2">2 - Poor</option>
              <option value="1">1 - Terrible</option>
            </select>
          </div>

          <div className="form-group">
            <label>Feedback</label>
            <textarea name="comment" className="rate-input" placeholder="Your thoughts..." onChange={handleChange} value={formData.comment}></textarea>
          </div>

          <button type="submit" className="btn-submit-rate" disabled={submitting}>
            {submitting ? "Submitting..." : "Send Rating"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default RateCourse;