import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { auth, db } from './firebaseConfig';

function SignUp({ onBack }) {
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    const confirmPassword = e.target.confirmPassword.value;
    const fullName = e.target.fullName.value;

    // Strict check: Passwords must match
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        userId: user.uid,
        email: user.email,
        fullName: fullName,
        role: 'user', 
        createdAt: serverTimestamp()
      });

      alert("Account created successfully!");
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <div className="background-overlay"></div>
      <div className="content-wrapper">
        <div className="fieldcontainer">
          <form onSubmit={handleSignUp}>
            <h2 className="form-title">SIGN UP</h2>
            
            <label className="labels">FULL NAME</label>
            <input name="fullName" type="text" className="inputs" placeholder="ENTER NAME" required />
            
            <label className="labels">EMAIL</label>
            <input name="email" type="email" className="inputs" placeholder="ENTER EMAIL" required />
            
            <label className="labels">PASSWORD</label>
            <input name="password" type="password" className="inputs" placeholder="ENTER PASSWORD" required />
            
            <label className="labels">CONFIRM PASSWORD</label>
            <input name="confirmPassword" type="password" className="inputs" placeholder="RE-ENTER PASSWORD" required />
            
            <button type="submit" className="action-button" disabled={loading}>
              {loading ? "PROCESSING..." : "REGISTER"}
            </button>
            
            <p onClick={onBack} style={{cursor: 'pointer', marginTop: '15px', color: '#667eea', textAlign: 'center'}}>
              Return to Login
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SignUp;