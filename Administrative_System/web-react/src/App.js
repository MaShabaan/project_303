import { useState } from "react";
import AdminDashboard from "./AdminDashboard";
import Complaints from "./Complaints";

function App() {
  const [view, setView] = useState("dashboard");

  return (
    <>
      {view === "dashboard" && (
        <AdminDashboard
          user={{ name: "Admin", email: "admin@test.com" }}
          setView={setView}
          onLogout={() => alert("Logout")}
        />
      )}

      {view === "complaints" && (
        <Complaints setView={setView} />
      )}
    </>
  );
}

export default App;