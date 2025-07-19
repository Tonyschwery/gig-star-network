import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCQv2q_eWLfutQnJdGur4ZFXEwpCdd2hco",
  authDomain: "gcc-talents-cc95b.firebaseapp.com",
  projectId: "gcc-talents-cc95b",
  storageBucket: "gcc-talents-cc95b.firebasestorage.app",
  messagingSenderId: "950587788653",
  appId: "1:950587788653:web:33da24a287291076265e64",
  measurementId: "G-JE66PYZ5QW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Cloud Storage and get a reference to the service
export const storage = getStorage(app);

export default app;