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

    // 1. Reference the 'course-ratings' collection
    const ratingsRef = collection(db, 'course-ratings');
    
    // 2. Query for ratings by this student (match the field name used in your Submit function)
    const q = query(
      ratingsRef, 
      where('studentId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ratingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRatings(ratingsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching ratings:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="my-ratings-page">
      <div className="background-overlay"></div>
      <div className="dashboard-container" style={{maxWidth: '1000px'}}>
        <h1>My Course Ratings</h1>
        <button className="back-link" onClick={onBack} style={{border: 'none', background: 'none', color: '#667eea', cursor: 'pointer', marginBottom: '20px'}}>
          &larr; Back to Dashboard
        </button>

        {loading ? (
          <div className="loading-text">Loading your feedback...</div>
        ) : ratings.length === 0 ? (
          <div className="no-data">No ratings found. Start by rating a course!</div>
        ) : (
          <div className="ratings-list">
            <table className="ratings-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Instructor</th>
                  <th>Course ⭐</th>
                  <th>Inst. ⭐</th>
                  <th>Comment</th>
                </tr>
              </thead>
              <tbody>
                {ratings.map(item => (
                  <tr key={item.id}>
                    <td><strong>{item.courseName}</strong></td>
                    <td>{item.instructorName}</td>
                    <td>{item.courseRating}/5</td>
                    <td>{item.instructorRating}/5</td>
                    <td className="comment-cell">{item.comment || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default MyRatings;