import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { auth, db } from './firebaseConfig';
import './MyRatings.css';

function MyRatings({ onBack }) {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'course-ratings'), 
      where('studentId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRatings(data);
      setLoading(false);
    }, (error) => {
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="my-ratings-page">
      <div className="ratings-wide-container">
        <div className="ratings-header">
          <h1>My Evaluations</h1>
          <button className="back-btn" onClick={onBack}>Back to Dashboard</button>
        </div>

        {loading ? (
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