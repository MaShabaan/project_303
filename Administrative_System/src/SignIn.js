import React, { useState } from "react";
import { auth, db } from './firebase/firebase';
import { useNavigate } from "react-router-dom"; // Use this for CRA
import facultyLogo from '../src/assets/images/science-faculty-logo.jpg';

// 1. Define styles BEFORE the component
const styles = {
    page: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f4f4', fontFamily: 'Arial, sans-serif' },
    loginBox: { backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px', borderTop: '5px solid #FFD700' },
    logo: { width: '100px', height: 'auto', marginBottom: '10px' },
    divider: { height: '3px', width: '60px', backgroundColor: '#FFD700', margin: '10px auto' },
    form: { display: 'flex', flexDirection: 'column' },
    label: { fontSize: '14px', fontWeight: 'bold', color: '#333', marginBottom: '5px' },
    input: { padding: '12px', margin: '0 0 20px 0', borderRadius: '6px', border: '1px solid #ddd', fontSize: '16px' },
    button: { padding: '12px', backgroundColor: '#228B22', color: 'white', border: 'none', borderRadius: '6px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }
};

export default function SignIn() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    // 2. Initialize useNavigate
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        
        // This is where you'll eventually add your fetch() to Node/Express
        console.log("Form submitted:", email);
        
        // 3. Redirect to home
        navigate('/home'); 
    };

    return (
        <div style={styles.page}>
            <div style={styles.loginBox}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <img src={facultyLogo} alt="Faculty Logo" style={styles.logo} />
                    <h1 style={{ color: '#228B22', fontSize: '24px', margin: '10px 0 0 0' }}>Faculty of Science</h1>
                    <p style={{ color: '#B22222', fontWeight: 'bold', margin: '5px 0' }}>Cairo University</p>
                    <div style={styles.divider} />
                </div>
                <form onSubmit={handleLogin} style={styles.form}>
                    <label style={styles.label}>University Email</label>
                    <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)}
                        style={styles.input}
                        placeholder="name@cu.edu.eg"
                        required
                    />
                    <label style={styles.label}>Password</label>
                    <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)}
                        style={styles.input}
                        placeholder="••••••••"
                        required
                    />
                    <button type="submit" style={styles.button}>Sign In</button>
                </form>
                <p style={{ textAlign: 'center', marginTop: '15px', color: '#666' }}>
                    Don't have an account? <span style={{ color: '#B22222', cursor: 'pointer', fontWeight: 'bold' }}>Register</span>
                </p>
            </div>
        </div>
    );
}