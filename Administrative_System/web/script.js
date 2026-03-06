import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    query, 
    where, 
    getDocs,
    doc,
    setDoc,
    getDoc,
    Timestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase configuration 
const firebaseConfig = {
    apiKey: "AIzaSyCk7xXTF4lRn3v5i6F_leQvK-hdnFW_zcU",
    authDomain: "myproject-68794.firebaseapp.com",
    databaseURL: "https://myproject-68794-default-rtdb.firebaseio.com",
    projectId: "myproject-68794",
    storageBucket: "myproject-68794.firebasestorage.app",
    messagingSenderId: "252117852002",
    appId: "1:252117852002:web:39eb53c016abfac4fe963b"
};

// Initialize Firebase 
function getFirebaseApp() {
    if (getApps().length > 0) return getApp();
    if (!firebaseConfig?.apiKey) throw new Error('Firebase config is missing (apiKey).');
    return initializeApp(firebaseConfig);
}
const app = getFirebaseApp();
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const loginContainer = document.getElementById('loginContainer');
const signupContainer = document.getElementById('signupContainer');
const forgotContainer = document.getElementById('forgotContainer');

const showSignup = document.getElementById('showSignup');
const showForgotPassword = document.getElementById('showForgotPassword');
const showLoginFromSignup = document.getElementById('showLoginFromSignup');
const showLoginFromForgot = document.getElementById('showLoginFromForgot');

// Forms
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const forgotForm = document.getElementById('forgotForm');

// Login Inputs
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');

// Signup Inputs
const signupName = document.getElementById('signupName');
const signupEmail = document.getElementById('signupEmail');
const signupPassword = document.getElementById('signupPassword');
const confirmPassword = document.getElementById('confirmPassword');
const roleRadios = document.getElementsByName('role');

// Forgot Password Input
const forgotEmail = document.getElementById('forgotEmail');

// Buttons
const loginButton = document.getElementById('loginButton');
const signupButton = document.getElementById('signupButton');
const forgotButton = document.getElementById('forgotButton');

// Check auth state and redirect based on role
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log('✅ User is logged in:', user.email);
        
        // Get user role from Firestore
        const userRole = await getUserRole(user.uid);
        
        // Redirect based on role
        setTimeout(() => {
            if (userRole === 'admin') {
                window.location.href = 'admin-dashboard.html';
            } else {
                window.location.href = 'user-dashboard.html';
            }
        }, 1500);
    }
});


showSignup.addEventListener('click', (e) => {
    e.preventDefault();
    loginContainer.style.display = 'none';
    signupContainer.style.display = 'block';
    forgotContainer.style.display = 'none';
});

showForgotPassword.addEventListener('click', (e) => {
    e.preventDefault();
    loginContainer.style.display = 'none';
    signupContainer.style.display = 'none';
    forgotContainer.style.display = 'block';
});

showLoginFromSignup.addEventListener('click', (e) => {
    e.preventDefault();
    loginContainer.style.display = 'block';
    signupContainer.style.display = 'none';
    forgotContainer.style.display = 'none';
});

showLoginFromForgot.addEventListener('click', (e) => {
    e.preventDefault();
    loginContainer.style.display = 'block';
    signupContainer.style.display = 'none';
    forgotContainer.style.display = 'none';
});

// Remove error class on input
loginEmail.addEventListener('input', () => loginEmail.classList.remove('error'));
loginPassword.addEventListener('input', () => loginPassword.classList.remove('error'));
signupName.addEventListener('input', () => signupName.classList.remove('error'));
signupEmail.addEventListener('input', () => signupEmail.classList.remove('error'));
signupPassword.addEventListener('input', () => signupPassword.classList.remove('error'));
confirmPassword.addEventListener('input', () => confirmPassword.classList.remove('error'));
forgotEmail.addEventListener('input', () => forgotEmail.classList.remove('error'));

// Login Form Submit
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    
    if (!email || !password) {
        showMessage('Please fill in all fields', 'error');
        return;
    }
    
    setLoadingState(loginButton, true);
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Get user role
        const userRole = await getUserRole(user.uid);
        
        showMessage(`✅ Login successful! Redirecting to ${userRole} dashboard...`, 'success');
        
        // Log login attempt
        await logUserActivity(user.uid, email, 'login_success', userRole);
        
        // Redirect will happen via onAuthStateChanged
        
    } catch (error) {
        console.error('Login error:', error);
        handleAuthError(error);
        
        if (error.code === 'auth/wrong-password') {
            loginPassword.classList.add('error');
        } else if (error.code === 'auth/user-not-found') {
            loginEmail.classList.add('error');
        }
        
        setLoadingState(loginButton, false);
    }
});

// Signup Form Submit
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = signupName.value.trim();
    const email = signupEmail.value.trim();
    const password = signupPassword.value;
    const confirm = confirmPassword.value;
    
    // Get selected role
    let selectedRole = 'user'; // default
    for (const radio of roleRadios) {
        if (radio.checked) {
            selectedRole = radio.value;
            break;
        }
    }
    
    // Validation
    if (!name || !email || !password || !confirm) {
        showMessage('Please fill in all fields', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('Password must be at least 6 characters', 'error');
        signupPassword.classList.add('error');
        return;
    }
    
    if (password !== confirm) {
        showMessage('Passwords do not match', 'error');
        confirmPassword.classList.add('error');
        return;
    }
    
    setLoadingState(signupButton, true);
    
    try {
        // Create user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update profile with name
        await updateProfile(user, {
            displayName: name
        });
        
        // Save user data with role to Firestore
        await saveUserToFirestore(user.uid, name, email, selectedRole);
        
        // Log signup
        try {
            await logUserActivity(user.uid, email, 'signup_success', selectedRole);
        } catch (logErr) {
            console.warn('Activity log failed:', logErr);
        }
        
        // Sign out so user stays on page and can log in
        await signOut(auth);
        
        showMessage('Registration successful. Please log in.', 'success');
        setLoadingState(signupButton, false);
        
        // Switch back to login form
        loginContainer.style.display = 'block';
        signupContainer.style.display = 'none';
        forgotContainer.style.display = 'none';
        
    } catch (error) {
        console.error('Signup error:', error);
        handleAuthError(error);
        setLoadingState(signupButton, false);
    }
});

// Forgot Password Form Submit
forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = forgotEmail.value.trim();
    
    if (!email) {
        showMessage('Please enter your email', 'error');
        return;
    }
    
    setLoadingState(forgotButton, true);
    
    try {
        await sendPasswordResetEmail(auth, email);
        showMessage('✅ Password reset email sent! Check your inbox.', 'success');
        forgotEmail.value = '';
        
        // Return to login after 3 seconds
        setTimeout(() => {
            loginContainer.style.display = 'block';
            signupContainer.style.display = 'none';
            forgotContainer.style.display = 'none';
        }, 3000);
        
    } catch (error) {
        console.error('Forgot password error:', error);
        handleAuthError(error);
        setLoadingState(forgotButton, false);
    }
});

// Save user to Firestore with role
async function saveUserToFirestore(userId, name, email, role) {
    try {
        // Create user document with custom ID
        await setDoc(doc(db, 'users', userId), {
            userId: userId,
            name: name,
            email: email,
            role: role,
            createdAt: Timestamp.now(),
            lastLogin: Timestamp.now(),
            isActive: true,
            accountType: role === 'admin' ? 'administrator' : 'regular'
        });
        
        console.log(`✅ User saved with role: ${role}`);
        
        // Create role-specific collection entry
        if (role === 'admin') {
            await setDoc(doc(db, 'admins', userId), {
                userId: userId,
                email: email,
                name: name,
                createdAt: Timestamp.now(),
                permissions: ['all']
            });
        }
        
    } catch (error) {
        console.error('Error saving user:', error);
        throw error;
    }
}

// Get user role from Firestore (uses doc id = userId)
async function getUserRole(userId) {
    try {
        const userDocRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userDocRef);
        
        if (userSnap.exists()) {
            return userSnap.data().role || 'user';
        }
        
        return 'user';
    } catch (error) {
        console.error('Error getting user role:', error);
        return 'user';
    }
}

async function logUserActivity(userId, email, action, role = null) {
    try {
        const logsRef = collection(db, 'userActivity');
        await addDoc(logsRef, {
            userId: userId,
            email: email,
            action: action,
            role: role,
            timestamp: Timestamp.now(),
            userAgent: navigator.userAgent
        });
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// Handle auth errors
function handleAuthError(error) {
    let message = 'An error occurred. Please try again.';
    
    switch (error.code) {
        case 'auth/email-already-in-use':
            message = 'This email is already registered. Please login.';
            signupEmail.classList.add('error');
            break;
        case 'auth/invalid-email':
            message = 'Invalid email address.';
            if (signupEmail) signupEmail.classList.add('error');
            if (loginEmail) loginEmail.classList.add('error');
            if (forgotEmail) forgotEmail.classList.add('error');
            break;
        case 'auth/user-not-found':
            message = 'No account found with this email.';
            if (loginEmail) loginEmail.classList.add('error');
            if (forgotEmail) forgotEmail.classList.add('error');
            break;
        case 'auth/wrong-password':
            message = 'Incorrect password.';
            if (loginPassword) loginPassword.classList.add('error');
            break;
        case 'auth/weak-password':
            message = 'Password should be at least 6 characters.';
            if (signupPassword) signupPassword.classList.add('error');
            break;
        case 'auth/too-many-requests':
            message = 'Too many failed attempts. Please try again later.';
            break;
        case 'auth/network-request-failed':
            message = 'Network error. Check your internet connection.';
            break;
    }
    
    showMessage('❌ ' + message, 'error');
}

// Show message function
function showMessage(message, type) {
    // Remove existing message
    const existingMessage = document.querySelector('.alert-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert-message ${type}-message`;
    messageDiv.textContent = message;
    
    // Style based on type
    const colors = {
        error: { bg: '#ff4444', text: 'white' },
        success: { bg: '#00C851', text: 'white' },
        warning: { bg: '#ffbb33', text: 'black' },
        info: { bg: '#33b5e5', text: 'white' }
    };
    
    messageDiv.style.backgroundColor = colors[type]?.bg || colors.info.bg;
    messageDiv.style.color = colors[type]?.text || colors.info.text;
    
    // Find which container is visible
    let container;
    if (loginContainer.style.display !== 'none') {
        container = loginContainer;
    } else if (signupContainer.style.display !== 'none') {
        container = signupContainer;
    } else {
        container = forgotContainer;
    }
    
    container.insertBefore(messageDiv, container.firstChild);
    
  
    setTimeout(() => {
        if (messageDiv && messageDiv.parentNode) {
            messageDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (messageDiv && messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 300);
        }
    }, 5000);
}


function setLoadingState(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = '<span class="spinner"></span> LOADING...';
        
        // Add spinner style if not exists
        if (!document.querySelector('#spinner-style')) {
            const style = document.createElement('style');
            style.id = 'spinner-style';
            style.textContent = `
                .spinner {
                    display: inline-block;
                    width: 20px;
                    height: 20px;
                    border: 3px solid rgba(255,255,255,0.3);
                    border-radius: 50%;
                    border-top-color: white;
                    animation: spin 1s ease-in-out infinite;
                    margin-right: 10px;
                    vertical-align: middle;
                }
                
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
    } else {
        button.disabled = false;
        button.innerHTML = button.id === 'loginButton' ? 'LOGIN' : 
                          button.id === 'signupButton' ? 'SIGN UP' : 
                          'SEND RESET LINK';
    }
}

// Logout function
async function logout() {
    try {
        await signOut(auth);
        showMessage('👋 Logged out successfully', 'success');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        showMessage('Error logging out', 'error');
    }
}


export { logout, getUserRole };