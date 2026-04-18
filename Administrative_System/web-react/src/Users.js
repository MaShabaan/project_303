import { useEffect, useState } from "react";
import "./Users.css";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebaseConfig";

export default function Users({ setView }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | admins | users
  const [mainTab, setMainTab] = useState("all-users"); // all-users | blocked
  const [blockedUsers, setBlockedUsers] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("blockedUsers")) || [];
    setBlockedUsers(stored);
  }, []);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, "users"));

      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setUsers(list);
    } catch (e) {
      console.error(e);
    }
  };

  const isAdmin = (user) => user.role === "admin";

  const isBlockedUser = (userId) => {
    return blockedUsers.some((u) => u.id === userId);
  };

  const toggleBlockUser = (user) => {
    // ✅ لا يعمل بلوك للأدمن
    if (isAdmin(user)) return;

    const alreadyBlocked = isBlockedUser(user.id);

    let updated;
    if (alreadyBlocked) {
      updated = blockedUsers.filter((u) => u.id !== user.id);
    } else {
      updated = [...blockedUsers, user];
    }

    setBlockedUsers(updated);
    localStorage.setItem("blockedUsers", JSON.stringify(updated));
  };

  const getBadge = (user) => {
    if (user.role === "admin") {
      if (user.isApproved === false) {
        return <span className="badge pending">Pending</span>;
      }
      return <span className="badge admin">Admin</span>;
    }

    return <span className="badge user">User</span>;
  };

  const matchesSearch = (user) => {
    const name = user.displayName || "";
    const email = user.email || "";

    return (
      name.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase())
    );
  };

  const displayedUsers =
    mainTab === "blocked"
      ? blockedUsers.filter((user) => matchesSearch(user))
      : users.filter((user) => {
          if (!matchesSearch(user)) return false;

          if (filter === "admins") return user.role === "admin";
          if (filter === "users") return user.role === "user";

          return true;
        });

  return (
    <div className="users-page">
      <div className="top-bar">
        <button onClick={() => setView("dashboard")} className="back-btn">
          ←
        </button>
        <h2>Admin Dashboard</h2>
      </div>

      <div className="users-header">
        <h1>Manage Users</h1>
        <p>
          {mainTab === "blocked"
            ? `${blockedUsers.length} blocked users`
            : `${users.length} users`}
        </p>
      </div>

      <div className="search-box">
        <input
          type="text"
          placeholder="Search name, email or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ✅ التابات الرئيسية */}
      <div className="main-tabs">
        <button
          className={mainTab === "all-users" ? "active" : ""}
          onClick={() => setMainTab("all-users")}
        >
          All Users
        </button>

        <button
          className={mainTab === "blocked" ? "active" : ""}
          onClick={() => setMainTab("blocked")}
        >
          🔒 Blocked ({blockedUsers.length})
        </button>
      </div>

      {/* ✅ التابات الفرعية تظهر فقط مع All Users */}
      {mainTab === "all-users" && (
        <div className="filters">
          <button
            onClick={() => setFilter("all")}
            className={filter === "all" ? "active" : ""}
          >
            All
          </button>

          <button
            onClick={() => setFilter("admins")}
            className={filter === "admins" ? "active" : ""}
          >
            Admins
          </button>

          <button
            onClick={() => setFilter("users")}
            className={filter === "users" ? "active" : ""}
          >
            Users
          </button>
        </div>
      )}

      <div className="section-label">
        {mainTab === "blocked" ? "🔒 Blocked users" : "👥 View only"}
      </div>

      <div className="users-list">
        {displayedUsers.length === 0 ? (
          <p className="no-users">
            {mainTab === "blocked" ? "No blocked users" : "No users found"}
          </p>
        ) : (
          displayedUsers.map((user) => {
            const blocked = isBlockedUser(user.id);

            return (
              <div key={user.id} className="user-card">
                <div className="user-left">
                  <div className="avatar">
                    {(user.displayName || user.email || "U")[0].toUpperCase()}
                  </div>

                  <div>
                    <h3>{user.displayName || "No Name"}</h3>
                    <p>{user.email}</p>
                  </div>
                </div>

                <div className="user-actions">
                  {getBadge(user)}

                  {/* ✅ زر البلوك فقط لليوزر */}
                  {user.role !== "admin" && (
                    <button
                      className={blocked ? "unblock-btn" : "block-btn"}
                      onClick={() => toggleBlockUser(user)}
                    >
                      {blocked ? "Unblock" : "Block"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}