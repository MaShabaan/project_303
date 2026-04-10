import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { auth, db } from './firebaseConfig';
import './SignUp.css';

function SignUp({ onBack }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    major: '',
    semester: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        userId: user.uid,
        email: user.email,
        name: user.email.split('@')[0],
        major: formData.major,
        semester: Number(formData.semester),
        role: 'student',
        createdAt: serverTimestamp()
      });

      alert("Account created!");
      onBack();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-box">
      <img src="/assets/images/science-faculty-logo.jpg" alt="Logo" className="university-logo" />
      <h1 className="box-title">Create Account</h1>
      <h3 className="box-sub-title">Faculty of Science</h3>

      <form onSubmit={handleSignUp}>
        <div className="form-group">
          <label className="input-label">University Email</label>
          <input name="email" type="email" className="signup-input" placeholder="name@email.com" required onChange={handleChange} />
        </div>

        <div className="form-group">
          <label className="input-label">Department</label>
          <select name="major" className="signup-input" value={formData.major} onChange={handleChange} required>
            <option value="">-- Select Dept --</option>
            <option value="CS">Computer Science</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Physics">Physics</option>
          </select>
        </div>

        <div className="form-group">
          <label className="input-label">Semester</label>
          <select name="semester" className="signup-input" value={formData.semester} onChange={handleChange} required>
            <option value="">-- Select Semester --</option>
            {[3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>Semester {n}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="input-label">Password</label>
          <input name="password" type="password" className="signup-input" required onChange={handleChange} />
        </div>

        <div className="form-group">
          <label className="input-label">Confirm Password</label>
          <input name="confirmPassword" type="password" className="signup-input" required onChange={handleChange} />
        </div>

        <button type="submit" className="btn-register" disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>

        <p className="footer-text">
          Already have an account? <span className="login-link" onClick={onBack}>Sign In</span>
        </p>
      </form>
    </div>
  );
}

export default SignUp;