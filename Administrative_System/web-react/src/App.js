import { useState } from "react";
import AdminDashboard from "./AdminDashboard";
import Complaints from "./Complaints";
import Users from "./Users";

function App() {
  const [view, setView] = useState("dashboard");

  if (view === "complaints") {
    return <Complaints setView={setView} />;
  }

  if (view === "users") {
    return <Users setView={setView} />;
  }

  return (
    <AdminDashboard
      user={{ name: "Admin", email: "admin@test.com" }}
      setView={setView}
      onLogout={() => alert("Logout")}
    />
  );
}

export default App;