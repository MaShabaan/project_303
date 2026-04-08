import { useState, useEffect } from "react";
import "./Complaints.css";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebaseConfig";

export default function Complaints({ setView }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);

  const loadTickets = async () => {
    try {
      const snapshot = await getDocs(collection(db, "tickets"));

      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      list.sort((a, b) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA;
      });

      setTickets(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleReply = async (id) => {
    if (!replyText.trim()) return;

    setReplyLoading(true);

    try {
      console.log("Reply sent:", id, replyText);

      setReplyingToId(null);
      setReplyText("");
      loadTickets();
    } catch (e) {
      console.error(e);
    } finally {
      setReplyLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="complaints-container">

      {/* 🔥 زر الرجوع */}
      <button className="back-btn" onClick={() => setView("dashboard")}>
        ← Back
      </button>

      {tickets.length === 0 && <p>No complaints yet</p>}

      {tickets.map(item => (
        <div className="card" key={item.id}>

          {/* 🔥 Header */}
          <div className="card-header">
            <h3>{item.title}</h3>

            {/* 🔥 PRIORITY (مظبوط 100%) */}
            <span className={`priority ${item.priority?.toLowerCase()}`}>
              {item.priority}
            </span>
          </div>

          {/* 🔥 USER (مظبوط 100%) */}
          <p className="email">
  From: {
    item.userName ||
    item.userEmail ||
    item.email ||
    item.user?.email ||
    "Unknown"
  }
</p>

<p className="date">
  {item.createdAt?.toDate?.().toLocaleString() || ""}
</p>

<p className="description">{item.description}</p>
<p className="status">Status: {item.status}</p>

          {/* 🔥 REPLY */}
          {item.adminReply ? (
            <div className="reply-block">
              <strong>Admin reply:</strong>
              <p>{item.adminReply}</p>

              <button
                onClick={() => {
                  setReplyingToId(item.id);
                  setReplyText(item.adminReply);
                }}
              >
                Edit Reply
              </button>
            </div>
          ) : replyingToId === item.id ? (
            <div className="reply-form">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type reply..."
              />

              <div className="actions">
                <button onClick={() => setReplyingToId(null)}>
                  Cancel
                </button>

                <button onClick={() => handleReply(item.id)}>
                  {replyLoading ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          ) : (
            <button
              className="reply-btn"
              onClick={() => setReplyingToId(item.id)}
            >
              Reply to Complaint
            </button>
          )}
        </div>
      ))}
    </div>
  );
}