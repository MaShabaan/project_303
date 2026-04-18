import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import "./ManageRatings.css";

function ManageRatings({ onBack }) {
  const [ratings, setRatings] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [loading, setLoading] = useState(true);

  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // ratings
        const ratingsQuery = query(
          collection(db, "course-ratings"),
          orderBy("createdAt", "desc")
        );
        const ratingsSnapshot = await getDocs(ratingsQuery);

        const ratingsData = ratingsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // users
        const usersSnapshot = await getDocs(collection(db, "users"));
        const usersData = {};
        usersSnapshot.docs.forEach((doc) => {
          usersData[doc.id] = doc.data().fullName || "Unknown User";
        });

        setUsersMap(usersData);
        setRatings(ratingsData);

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  
  const renderStars = (num) => "⭐".repeat(parseInt(num || 0));

 
  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    return timestamp.toDate().toLocaleString();
  };

  
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Delete this rating?");
    if (!confirmDelete) return;

    await deleteDoc(doc(db, "course-ratings", id));

    setRatings(ratings.filter((r) => r.id !== id));
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="ratings-page">

      <div className="header">
        <h1>⭐ Manage Ratings</h1>
        <button className="back-btn" onClick={onBack}>⬅ Back</button>
      </div>

      {ratings.length === 0 ? (
        <p className="empty">No ratings yet.</p>
      ) : (
        <div className="ratings-container">

          {ratings.map((r) => (
            <div key={r.id} className="rating-card">

              <div className="top">
                <h3>{r.courseName}</h3>
                <span className="date">{formatDate(r.createdAt)}</span>
              </div>

              <p className="user">
  👤 {r.studentEmail}
</p>

              <p className="instructor">
                👨‍🏫 {r.instructorName}
              </p>

              <div className="stars">
                <span>Course:</span> {renderStars(r.courseRating)}
              </div>

              <div className="stars">
                <span>Instructor:</span> {renderStars(r.instructorRating)}
              </div>

              {r.comment && (
                <p className="comment">"{r.comment}"</p>
              )}

              <button
                className="delete-btn"
                onClick={() => handleDelete(r.id)}
              >
                🗑 Delete
              </button>

            </div>
          ))}

        </div>
      )}
    </div>
  );
}

export default ManageRatings;