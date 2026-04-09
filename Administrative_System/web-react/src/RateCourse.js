import { addDoc, collection, serverTimestamp, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { auth, db } from './firebaseConfig';
import './RateCourse.css';

function RateCourse({ user, onBack }) {

  const [courses, setCourses] = useState([]);

  const [formData, setFormData] = useState({
    courseName: '',
    instructorName: '',
    courseRating: '5',
    instructorRating: '5',
    comment: ''
  });

  const [submitting, setSubmitting] = useState(false);

  // ================= FETCH COURSES =================
  useEffect(() => {
    const fetchCourses = async () => {
      const snapshot = await getDocs(collection(db, "courses"));
      const data = snapshot.docs.map(doc => doc.data());
      setCourses(data);
    };

    fetchCourses();
  }, []);

  // ================= HANDLE CHANGE =================
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
  };

  // ================= SUBMIT =================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.courseName) {
      return alert("Please select a course");
    }

    setSubmitting(true);

    try {
      await addDoc(collection(db, 'course-ratings'), {
        studentId: auth.currentUser.uid,
        studentEmail: auth.currentUser.email,
        courseName: formData.courseName,
        instructorName: formData.instructorName,
        courseRating: formData.courseRating,
        instructorRating: formData.instructorRating,
        comment: formData.comment,
        createdAt: serverTimestamp()
      });

      alert("✅ Rating submitted successfully!");
      onBack();

    } catch (error) {
      console.error(error);
      alert("Error submitting rating");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rate-course-page">
      <div className="background-overlay"></div>

      <div className="rate-course-container">
        <h1>Rate a Course</h1>

        <button className="back-link" onClick={onBack}>
          ← Back
        </button>

        <form onSubmit={handleSubmit}>

          {/* COURSE */}
          <div className="form-group">
            <label>Course</label>
            <select
              id="courseName"
              value={formData.courseName}
              onChange={handleChange}
            >
              <option value="">-- Select Course --</option>
              {courses.map((course, index) => (
                <option key={index} value={course.courseName}>
                  {course.courseName}
                </option>
              ))}
            </select>
          </div>

          {/* INSTRUCTOR NAME */}
          <div className="form-group">
            <label>Instructor Name</label>
            <input
              type="text"
              id="instructorName"
              placeholder="Enter instructor name"
              value={formData.instructorName}
              onChange={handleChange}
            />
          </div>

          {/* COURSE RATING */}
          <div className="form-group">
            <label>Course Rating</label>
            <select
              id="courseRating"
              value={formData.courseRating}
              onChange={handleChange}
            >
              <option value="5">5 - Excellent</option>
              <option value="4">4 - Very Good</option>
              <option value="3">3 - Average</option>
              <option value="2">2 - Poor</option>
              <option value="1">1 - Terrible</option>
            </select>
          </div>

          {/* INSTRUCTOR RATING */}
          <div className="form-group">
            <label>Instructor Rating</label>
            <select
              id="instructorRating"
              value={formData.instructorRating}
              onChange={handleChange}
            >
              <option value="5">5 - Excellent</option>
              <option value="4">4 - Very Good</option>
              <option value="3">3 - Average</option>
              <option value="2">2 - Poor</option>
              <option value="1">1 - Terrible</option>
            </select>
          </div>

          {/* COMMENT */}
          <div className="form-group">
            <label>Comment</label>
            <textarea
              id="comment"
              placeholder="Write your feedback"
              value={formData.comment}
              onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            className="action-button"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Rating"}
          </button>

        </form>
      </div>
    </div>
  );
}

export default RateCourse;