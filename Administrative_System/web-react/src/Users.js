import { useEffect, useState } from "react";
import "./Users.css";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebaseConfig";

export default function Users({ setView }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

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

  // 🔍 فلترة + بحث
  const filtered = users.filter((user) => {
    const name = user.displayName || "";
    const email = user.email || "";

    const matchesSearch =
      name.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase());

    if (filter === "admins") return matchesSearch && user.role === "admin";
    if (filter === "users") return matchesSearch && user.role === "user";

    return matchesSearch;
  });

  // 🎯 badge logic 
  const getBadge = (user) => {
    if (user.role === "admin") {
      if (user.isApproved === false) {
        return <span className="badge pending">Pending</span>;
      }
      return <span className="badge admin">Admin</span>;
    }

    return <span className="badge user">User</span>;
  };

  return (
    <div className="users-page">

      {/* 🔙 Header */}
      <div className="top-bar">
        <button onClick={() => setView("dashboard")} className="back-btn">
          ←
        </button>
        <h2>Admin Dashboard</h2>
      </div>

      {/* 🔥 Purple header */}
      <div className="users-header">
        <h1>Manage Users</h1>
        <p>Total Users: {users.length}</p>
      </div>

      {/* 🔍 Search */}
      <div className="search-box">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* 🎯 Filters */}
      <div className="filters">
        <button onClick={() => setFilter("all")} className={filter==="all"?"active":""}>All</button>
        <button onClick={() => setFilter("admins")} className={filter==="admins"?"active":""}>Admins</button>
        <button onClick={() => setFilter("users")} className={filter==="users"?"active":""}>Users</button>
      </div>

      {/* 👥 List */}
      <div className="users-list">
        {filtered.map((user) => (
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

            {getBadge(user)}
          </div>
        ))}
      </div>

    </div>
  );
}