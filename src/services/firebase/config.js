import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// User's Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDLzgECvLJtEC7ZD0HZkKgruO1D8Tm9DeU",
  authDomain: "weighbridge-quality-process.firebaseapp.com",
  projectId: "weighbridge-quality-process",
  storageBucket: "weighbridge-quality-process.firebasestorage.app",
  messagingSenderId: "401265739015",
  appId: "1:401265739015:web:672261f3e4ba5bf05531a2",
  measurementId: "G-WM1TPB1FEH"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Check if Mock Mode override is active in LocalStorage
const localMockVal = localStorage.getItem("firebase_mock_override");
const isMockMode = localMockVal === "true";

export { app, auth, db, storage, isMockMode, firebaseConfig };

/**
 * Toggle Mock Mode utility for development demoing
 */
export function toggleMockMode(enable) {
  localStorage.setItem("firebase_mock_override", enable ? "true" : "false");
  window.location.reload();
}
