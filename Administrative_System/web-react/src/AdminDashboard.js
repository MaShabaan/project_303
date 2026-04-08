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
      <div className="background-overlay"></div>

      <div className="dashboard-container">
        <div className="welcome-header">
          <h1>
            Welcome Mr. <span>{adminData.name}</span>!
          </h1>
          <div className="user-role">{adminData.role}</div>
        </div>

        <div className="dashboard-cards">
          {/* 🔥 هذا المهم */}
          <div
            className="card"
            onClick={() => {
              console.log("CLICKED 🔥");
              setView("complaints");
            }}
          >
            <div className="card-icon">📋</div>
            <h3>Manage Complaints</h3>
            <p>View and resolve user complaints</p>
          </div>

          <div className="card">
            <div className="card-icon">📚</div>
            <h3>Manage Courses</h3>
            <p>Add, edit, and manage courses</p>
          </div>

          <div className="card">
            <div className="card-icon">👥</div>
            <h3>Manage Users</h3>
            <p>View and manage user accounts</p>
          </div>
        </div>

        <div className="user-info">
          <strong>Email:</strong> {adminData.email}
        </div>

        <button onClick={onLogout} className="logout-btn">
          LOGOUT
        </button>
      </div>
    </div>
  );
}

export default AdminDashboard;