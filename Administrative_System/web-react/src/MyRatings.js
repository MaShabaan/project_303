import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from './firebaseConfig';
import './MyRatings.css';

function MyRatings({ setView }) {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
 masa--2
    const ratingsRef = collection(db, 'course-ratings');

    const q = query(
      ratingsRef,

    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'course-ratings'), 
      where('studentId', '==', user.uid),
 main
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRatings(data);
      setLoading(false);
 masa--2

    }, (error) => {
      setLoading(false);
 main
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="my-ratings-page">
 masa--2
      <div className="dashboard-container">
        
        <button onClick={() => setView("dashboard")}>
          ← Back
        </button>

      <div className="ratings-wide-container">
        <div className="ratings-header">
          <h1>My Evaluations</h1>
          <button className="back-btn" onClick={onBack}>Back to Dashboard</button>
        </div>
 main

        <h1>Course Ratings</h1>

        {loading ? (
 masa--2
          <p>Loading...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Course</th>
                <th>Instructor</th>
                <th>Course ⭐</th>
                <th>Inst ⭐</th>
                <th>Comment</th>
              </tr>
            </thead>

            <tbody>
              {ratings.map(item => (
                <tr key={item.id}>
                  <td>{item.courseName}</td>
                  <td>{item.instructorName}</td>
                  <td>{item.courseRating}</td>
                  <td>{item.instructorRating}</td>
                  <td>{item.comment || "-"}</td>

          <div className="empty-msg">Loading records...</div>
        ) : ratings.length === 0 ? (
          <div className="empty-msg">You haven't rated any courses yet.</div>
        ) : (
          <table className="ratings-table">
            <thead>
              <tr>
                <th>Course Name</th>
                <th>Major/Semester</th>
                <th>Score</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              {ratings.map(item => (
                <tr key={item.id}>
                  <td><strong>{item.courseName}</strong></td>
                  <td>{item.major} - Sem {item.semester}</td>
                  <td className="rating-score">{item.courseRating} / 5</td>
                  <td className="comment-text">{item.comment || "No comment provided"}</td>
 main
                </tr>
              ))}
            </tbody>
          </table>
        )}

      </div>
    </div>
  );
}

export default MyRatings;