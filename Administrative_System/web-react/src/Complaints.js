import { useState, useEffect } from "react";
import "./Complaints.css";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

export default function Complaints({ setView }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [sortByPriority, setSortByPriority] = useState(false);

  // ✅ priority logic (يدعم القديم + الجديد)
  const normalizePriority = (item) => {
    if (item.priorityScore === 1) return "high";
    if (item.priorityScore === 2) return "medium";
    if (item.priorityScore === 3) return "low";

    if (item.priority) {
      if (item.priority === "high") return "high";
      if (item.priority === "medium") return "medium";
      if (item.priority === "low") return "low";
    }

    if (item.category === "Harrasment or Bullying") return "high";
    if (item.category === "Registration") return "medium";
    if (item.category === "Building issues") return "low";

    return "low";
  };

  // ✅ تغيير الحالة
  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, "tickets", id), {
        status: newStatus,
      });

      setTickets((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, status: newStatus } : t
        )
      );

      const oldNotifications =
        JSON.parse(localStorage.getItem("notifications")) || [];

      const newNotification = {
        message: `Your ticket status is now: ${newStatus}`,
        createdAt: new Date().toLocaleString(),
        read: false,
      };

      localStorage.setItem(
        "notifications",
        JSON.stringify([newNotification, ...oldNotifications])
      );
    } catch (e) {
      console.error(e);
    }
  };

  // ✅ تحميل البيانات
  const loadTickets = async () => {
    setLoading(true);

    try {
      let snapshot;

      if (sortByPriority) {
        const q = query(
          collection(db, "tickets"),
          orderBy("priorityScore", "asc"),
          orderBy("createdAt", "asc")
        );
        snapshot = await getDocs(q);
      } else {
        snapshot = await getDocs(collection(db, "tickets"));
      }

      const list = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();

          let senderEmail = "Unknown";

          if (data.userEmail) senderEmail = data.userEmail;
          else if (data.email) senderEmail = data.email;
          else if (data.user?.email) senderEmail = data.user.email;
          else if (data.emailAddress) senderEmail = data.emailAddress;
          else if (data.userId) {
            try {
              const userDoc = await getDoc(
                doc(db, "users", data.userId)
              );
              if (userDoc.exists()) {
                const userData = userDoc.data();
                senderEmail =
                  userData.email ||
                  userData.userEmail ||
                  userData.universityEmail ||
                  "Unknown";
              }
            } catch (e) {
              console.error(e);
            }
          }

          return {
            id: docSnap.id,
            ...data,
            senderEmail,
          };
        })
      );

      setTickets(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [sortByPriority]);

  // ✅ رد
  const handleReply = async (id) => {
    if (!replyText.trim()) return;

    setReplyLoading(true);

    try {
      console.log("Reply sent:", id, replyText);

      setReplyingToId(null);
      setReplyText("");

      await loadTickets();
    } catch (e) {
      console.error(e);
    } finally {
      setReplyLoading(false);
    }
  };

  if (loading)
    return <div className="complaints-loading">Loading...</div>;

  return (
    <div className="complaints-page">
      <div className="complaints-topbar">
        <button
          className="complaints-backbtn"
          onClick={() => setView("dashboard")}
        >
          ←
        </button>

        <h2>Admin Dashboard</h2>

        {/* ✅ زر ترتيب priority */}
        <select
          className="complaint-status"
          value={sortByPriority ? "priority" : "default"}
          onChange={(e) =>
            setSortByPriority(e.target.value === "priority")
          }
          style={{ marginLeft: "auto" }}
        >
          <option value="default">Default</option>
          <option value="priority">Sort by Priority</option>
        </select>
      </div>

      <div className="complaints-list">
        {tickets.length === 0 && (
          <p className="complaints-empty">No complaints yet</p>
        )}

        {tickets.map((item) => {
          const priorityClass = normalizePriority(item);

          return (
            <div className="complaint-card" key={item.id}>
              <div className="complaint-card-header">
                <div className="complaint-sender-block">
                  <span className="complaint-from-label">From:</span>
                  <p className="complaint-sender-email">
                    {item.senderEmail}
                  </p>
                </div>

                <span
                  className={`complaint-priority ${priorityClass}`}
                >
                  {priorityClass}
                </span>
              </div>

              <div className="complaint-meta-row">
                <span className="complaint-date">
                  {item.createdAt?.toDate?.().toLocaleString() || ""}
                </span>

                {/* ✅ status dropdown فقط */}
                <select
                  className={`complaint-status ${
                    item.status || "open"
                  }`}
                  value={item.status || "open"}
                  onChange={(e) =>
                    handleStatusChange(item.id, e.target.value)
                  }
                >
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              {item.title && (
                <p className="complaint-title">{item.title}</p>
              )}

              <p className="complaint-description">
                {item.description || ""}
              </p>

              {replyingToId === item.id ? (
                <div className="complaint-reply-form">
                  <textarea
                    value={replyText}
                    onChange={(e) =>
                      setReplyText(e.target.value)
                    }
                    placeholder="Type your reply..."
                  />

                  <div className="complaint-reply-actions">
                    <button
                      className="complaint-cancel-btn"
                      onClick={() => {
                        setReplyingToId(null);
                        setReplyText("");
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      className="complaint-send-btn"
                      onClick={() => handleReply(item.id)}
                    >
                      {replyLoading ? "Sending..." : "Send"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="complaint-reply-btn"
                  onClick={() => setReplyingToId(item.id)}
                >
                  Reply to Complaint
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}