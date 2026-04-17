
import { useState, useEffect } from "react";
import "./Complaints.css";
import {
  collection,
  getDocs,
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

  const normalizePriority = (p) => {
    if (!p) return "low";
    const val = String(p).toLowerCase();

    if (val.includes("urgent")) return "high";
    if (val.includes("high")) return "high";
    if (val.includes("med")) return "medium";
    return "low";
  };

  // 🔥 تغيير الحالة
const handleStatusChange = async (id, newStatus) => {
  try {
    // 🔥 نحفظ في Firebase
    await updateDoc(doc(db, "tickets", id), {
      status: newStatus,
    });

    // 🔥 نحدث الشاشة
    setTickets((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: newStatus } : t
      )
    );

    // 🔥 نجيب النوتيفيكيشنز القديمة
    const oldNotifications =
      JSON.parse(localStorage.getItem("notifications")) || [];

    // 🔥 نضيف جديد
    const newNotification = {
      message: `Your ticket status is now: ${newStatus}`,
      createdAt: new Date().toLocaleString(),
      read: false,
    };

    const updated = [newNotification, ...oldNotifications];

    localStorage.setItem("notifications", JSON.stringify(updated));

  } catch (e) {
    console.error(e);
  }
};

  const loadTickets = async () => {
    try {
      const snapshot = await getDocs(collection(db, "tickets"));

      const list = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();

          let senderEmail = "Unknown";

          if (data.userEmail) {
            senderEmail = data.userEmail;
          } else if (data.email) {
            senderEmail = data.email;
          } else if (data.user?.email) {
            senderEmail = data.user.email;
          } else if (data.emailAddress) {
            senderEmail = data.emailAddress;
          } else if (data.userId) {
            try {
              const userDoc = await getDoc(doc(db, "users", data.userId));
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
      await loadTickets();
    } catch (e) {
      console.error(e);
    } finally {
      setReplyLoading(false);
    }
  };

  if (loading) return <div className="complaints-loading">Loading...</div>;

  return (
    <div className="complaints-page">
      <div className="complaints-topbar">
        <button
          className="complaints-backbtn"
          onClick={() => setView("dashboard")}
          type="button"
        >
          ←
        </button>
        <h2>Admin Dashboard</h2>
      </div>

      <div className="complaints-list">
        {tickets.length === 0 && (
          <p className="complaints-empty">No complaints yet</p>
        )}

        {tickets.map((item) => {
          const priorityClass = normalizePriority(item.priority);

          return (
            <div className="complaint-card" key={item.id}>
              {/* HEADER */}
              <div className="complaint-card-header">
                <div className="complaint-sender-block">
                  <span className="complaint-from-label">From:</span>
                  <p className="complaint-sender-email">
                    {item.senderEmail}
                  </p>
                </div>

                <span className={`complaint-priority ${priorityClass}`}>
                  {priorityClass}
                </span>
              </div>

              {/* DATE + STATUS */}
              <div className="complaint-meta-row">
                <span className="complaint-date">
                  {item.createdAt?.toDate?.().toLocaleString() || ""}
                </span>

                {/* 🔥 STATUS DROPDOWN */}
                <select
                  className={`complaint-status ${item.status || "open"}`}
                  value={item.status || "open"}
                  onChange={(e) =>
                    handleStatusChange(item.id, e.target.value )
                  }
                >
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              {/* CONTENT */}
              {item.title && (
                <p className="complaint-title">{item.title}</p>
              )}

              <p className="complaint-description">
                {item.description || ""}
              </p>

              {/* REPLY */}
              {replyingToId === item.id ? (
                <div className="complaint-reply-form">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                  />

                  <div className="complaint-reply-actions">
                    <button
                      type="button"
                      className="complaint-cancel-btn"
                      onClick={() => {
                        setReplyingToId(null);
                        setReplyText("");
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="complaint-send-btn"
                      onClick={() => handleReply(item.id)}
                    >
                      {replyLoading ? "Sending..." : "Send"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
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