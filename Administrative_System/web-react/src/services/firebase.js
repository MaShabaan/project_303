
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  query,
  Timestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

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

export const getGroupsByCourse = async (courseId) => {
  try {
    const q = query(collection(db, 'groups'), where('courseId', '==', courseId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting groups:', error);
    return [];
  }
};
export const createInAppNotification = async (data) => {
  try {
    const ref = collection(db, 'notifications');
    await addDoc(ref, {
      userId: data.userId,
      type: data.type,
      title: data.title,
      body: data.body,
      read: data.read || false,
      createdAt: Timestamp.now(),
      ...(data.meta ? { meta: data.meta } : {}),
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

export const addGroup = async (data) => {
  try {
    const docRef = await addDoc(collection(db, 'groups'), {
      ...data,
      currentStudents: 0,
      createdAt: new Date()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding group:', error);
    throw error;
  }
};

export const updateGroup = async (groupId, data) => {
  try {
    await updateDoc(doc(db, 'groups', groupId), {
      ...data,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error updating group:', error);
    throw error;
  }
};

export const deleteGroup = async (groupId) => {
  try {
    await deleteDoc(doc(db, 'groups', groupId));
  } catch (error) {
    console.error('Error deleting group:', error);
    throw error;
  }
};

export default app;