import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from './firebaseConfig';
import './MyRatings.css';

function MyRatings({ setView }) {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ratingsRef = collection(db, 'course-ratings');

    const q = query(
      ratingsRef,
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ratingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRatings(ratingsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="my-ratings-page">
      <div className="dashboard-container">
        
        <button onClick={() => setView("dashboard")}>
          ← Back
        </button>

        <h1>Course Ratings</h1>

        {loading ? (
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