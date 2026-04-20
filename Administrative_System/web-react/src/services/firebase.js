

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCk7xXTF4lRn3v5i6F_leQvK-hdnFW_zcU",
  authDomain: "myproject-68794.firebaseapp.com",
  databaseURL: "https://myproject-68794-default-rtdb.firebaseio.com",
  projectId: "myproject-68794",
  storageBucket: "myproject-68794.firebasestorage.app",
  messagingSenderId: "252117852002",
  appId: "1:252117852002:web:39eb53c016abfac4fe963b"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;