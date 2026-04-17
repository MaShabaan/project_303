import { useEffect, useState } from "react";
import "./Notifications.css";

export default function Notifications({ setView }) {
  const [notifications, setNotifications] = useState([]);

  
  const loadNotifications = () => {
    const data = JSON.parse(localStorage.getItem("notifications")) || [];
    setNotifications(data);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

 
  const markAsRead = (index) => {
    const updated = [...notifications];
    updated[index].read = true;

    setNotifications(updated);
    localStorage.setItem("notifications", JSON.stringify(updated));
  };

  return (
    <div className="notifications-page">
      <div className="top-bar">
        <button onClick={() => setView("dashboard")} className="back-btn">
          ←
        </button>
        <h2>Notifications</h2>
      </div>

      
      <button onClick={loadNotifications} className="refresh-btn">
  Refresh
</button>

      <div className="notifications-list">
        {notifications.length === 0 && <p>No notifications yet</p>}

        {notifications.map((item, i) => (
          <div
            key={i}
            className={`notification-card ${
              item.read ? "read" : "unread"
            }`}
            onClick={() => markAsRead(i)}
          >
            <p>{item.message}</p>
            <span>{item.createdAt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}