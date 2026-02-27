// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {getAuth} from "firebase/auth";
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCk7xXTF4lRn3v5i6F_leQvK-hdnFW_zcU",
  authDomain: "myproject-68794.firebaseapp.com",
  projectId: "myproject-68794",
  storageBucket: "myproject-68794.firebasestorage.app",
  messagingSenderId: "252117852002",
  appId: "1:252117852002:web:39eb53c016abfac4fe963b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth =getAuth(app);
export{app,auth};
