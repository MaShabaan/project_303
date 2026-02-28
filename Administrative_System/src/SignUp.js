import React, { useState } from "react";
import { auth, db } from './firebase/firebase';
import { useNavigate } from "react-router-dom"; 
import facultyLogo from '../src/assets/images/science-faculty-logo.jpg';
const theme = {
    page: { display: 'flex', justifyContent: 'center', 
            alignItems: 'center', height: '100vh', 
            backgroundColor: '#eeeeee', 
            fontFamily: 'sans-serif' },
    loginBox: { backgroundColor: 'white', padding: '40px', 
                borderRadius: '12px', 
                width: '100%', maxWidth: '400px', borderTop: '5px solid #FFD700' 
                },
    logo: { width: '150px', height: 'auto', marginBottom: '10px' },
    divider: { height: '3px', width: '60px', backgroundColor: '#FFD700', 
               margin: '10px auto' },
    form: { display: 'flex', flexDirection: 'column' },
    label: { fontSize: '14px', fontWeight: 'bold', color: '#333', 
             marginBottom: '5px' },
    input: { padding: '12px', margin: '0 0 20px 0', borderRadius: '6px', 
             border: '1px solid #ddd', fontSize: '16px' },
    button: { padding: '12px', backgroundColor: '#228B22', 
              color: 'white', border: 'none', borderRadius: '6px', 
              fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }
};

export default function SignUp() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState(''); 
    const navigate = useNavigate();
    const checkUser = (e) => {
        e.preventDefault();
        if(password !== confirmPassword) {
            alert("Passwords do not match :(");
            return;
        }
        navigate('/home'); 
    };

    return (
        <div style={theme.page}>
            <div style={theme.loginBox}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <img src={facultyLogo} alt="Faculty Logo" style={theme.logo} />
                    <h1 style={{ color: '#228B22', fontSize: '24px', margin: '10px 0 0 0' }}>Create Account</h1>
                    <p style={{ color: '#B22222', fontWeight: 'bold', margin: '5px 0' }}>Faculty of Science</p>
                    <div style={theme.divider} />
                </div>
                <form onSubmit={checkUser} style={theme.form}>
                    <label style={theme.label}>Email</label>
                    <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)}
                        style={theme.input}
                        placeholder="name@aaa.com"
                        required
                    />
                    <label style={theme.label}>Password</label>
                    <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)}
                        style={theme.input}
                        placeholder="••••••••"
                        required
                    />
                    <label style={theme.label}>Confirm Password</label>
                    <input 
                        type="password" 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        style={theme.input}
                        placeholder="••••••••"
                        required
                    />
                    <button type="submit" style={theme.button}>Register</button>
                </form>
                <p style={{ textAlign: 'center', marginTop: '15px', color: '#666' }}>
                    Already have an account? <span onClick={() => navigate('/')} style={{ color: '#B22222', cursor: 'pointer', fontWeight: 'bold' }}>Sign In</span>
                </p>
            </div>
        </div>
    );
}