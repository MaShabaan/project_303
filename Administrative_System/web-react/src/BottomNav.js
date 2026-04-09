import "./BottomNav.css";

export default function BottomNav({ setView, current }) {
  return (
    <div className="bottom-nav">

      <div onClick={() => setView("dashboard")} className={current === "dashboard" ? "active" : ""}>
        🏠
        <span>Dashboard</span>
      </div>

      <div onClick={() => setView("complaints")} className={current === "complaints" ? "active" : ""}>
        💬
        <span>Complaints</span>
      </div>

      <div onClick={() => setView("ratings")} className={current === "ratings" ? "active" : ""}>
        ⭐
        <span>Ratings</span>
      </div>

      <div onClick={() => setView("users")} className={current === "users" ? "active" : ""}>
        👥
        <span>Users</span>
      </div>

      <div onClick={() => setView("courses")}>
        📚
        <span>Courses</span>
      </div>

    </div>
  );
}