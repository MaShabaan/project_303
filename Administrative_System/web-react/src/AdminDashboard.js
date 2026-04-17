import { useEffect, useState } from "react";
import "./AdminDashboard.css";

function AdminDashboard({ user, onLogout, setView }) {
  const [adminData, setAdminData] = useState(null);

  useEffect(() => {
    if (user) {
      setAdminData({
        name: user.name || "Admin",
        email: user.email,
        role: "ADMIN",
        createdAt: "March 20, 2026",
        lastLogin: new Date().toLocaleString(),
      });
    }
  }, [user]);

  if (!adminData) return <div>Loading...</div>;

  return (
    <div className="admin-page">
      <div className="dashboard-wrapper">

        <h1 className="title">
          Welcome, {adminData.name}!
        </h1>

        <div className="role-badge">ADMIN</div>

        <div className="cards-grid">

          {/* Complaints */}
          <div className="card" onClick={() => setView("complaints")}>
            📋
            <h3>Manage Complaints</h3>
            <p>View and resolve complaints</p>
          </div>

          {/* Users */}
          <div className="card" onClick={() => setView("users")}>
            👥
            <h3>Manage Users</h3>
            <p>View and manage user accounts</p>
          </div>

          {/* Ratings */}
          <div className="card" onClick={() => setView("ratings")}>
            ⭐
            <h3>Manage Ratings</h3>
            <p>View course ratings</p>
          </div>

          {/* Courses */}
          <div className="card" onClick={() => setView("courses")}>
            📚
            <h3>Manage Courses</h3>
            <p>Manage courses data</p>
          </div>

          {/* Notifications 🔥 */}
          <div
  className="card"
  onClick={() => setView("notifications")}
  style={{ cursor: "pointer" }}
>🔔
  <h3>Notifications</h3>
  <p>Send and manage notifications</p>
</div>

        </div>

        <button onClick={onLogout} className="logout-btn">
          Logout
        </button>

      </div>
    </div>
  );
}

export default AdminDashboard;