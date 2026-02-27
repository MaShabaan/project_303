import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import your page components
import SignIn from './SignIn';
// import SignUp from './SignUp'; // Uncomment when you find/move this file
// import Home from './home';     // Uncomment when you find/move this file

function App() {
  return (
    <Router>
      <Routes>
        {/* This defines the main landing page (SignIn) */}
        <Route path="/" element={<SignIn />} />

        {/* As you find your other files, add them here like this:
          <Route path="/signup" element={<SignUp />} />
          <Route path="/home" element={<Home />} />
        */}
      </Routes>
    </Router>
  );
}

export default App;