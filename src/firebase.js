import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAEaoJ3Uqh4mrM-Ivk923DlE-ETsYir12M",
  authDomain: "rr-agencies-dashboard.firebaseapp.com",
  projectId: "rr-agencies-dashboard",
  storageBucket: "rr-agencies-dashboard.firebasestorage.app",
  messagingSenderId: "159509625827",
  appId: "1:159509625827:web:1753a47be851dbc62d3ed6",
  measurementId: "G-JSF9L5NM87"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;