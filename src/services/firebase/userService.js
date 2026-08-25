import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  setDoc, 
  query, 
  orderBy, 
  Timestamp 
} from "firebase/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { db, isMockMode, firebaseConfig } from "./config";

/**
 * Fetch all registered users in the system
 */
export async function getAllUsers() {
  if (isMockMode) {
    return JSON.parse(localStorage.getItem("mock_users") || "[]");
  } else {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
  }
}

/**
 * Toggle user status between active and inactive
 */
export async function updateUserStatus(uid, status) {
  if (isMockMode) {
    const users = JSON.parse(localStorage.getItem("mock_users") || "[]");
    const index = users.findIndex(u => u.uid === uid);
    if (index !== -1) {
      users[index].status = status;
      localStorage.setItem("mock_users", JSON.stringify(users));
      window.dispatchEvent(new Event("storage"));
    }
    return true;
  } else {
    const docRef = doc(db, "users", uid);
    await updateDoc(docRef, { status });
    return true;
  }
}

/**
 * Creates a new user account.
 * Uses a secondary app instance to register Auth credentials client-side.
 */
export async function createUser(userData) {
  const { email, password, displayName, role } = userData;
  const emailLower = email.toLowerCase();

  if (isMockMode) {
    const users = JSON.parse(localStorage.getItem("mock_users") || "[]");
    if (users.some(u => u.email.toLowerCase() === emailLower)) {
      throw new Error("This email address is already registered.");
    }
    const newUid = `mock-user-${Date.now()}`;
    const newUser = {
      uid: newUid,
      email: emailLower,
      displayName,
      role,
      status: "active",
      requirePasswordChange: true,
      password,
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    localStorage.setItem("mock_users", JSON.stringify(users));
    window.dispatchEvent(new Event("storage"));
    return { success: true, uid: newUid };
  } else {
    // Check if user already exists in Auth or Firestore
    // To register client-side without logging out the current admin session,
    // we initialize a temporary Firebase app instance.
    const tempAppName = `temp-register-${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);
    
    try {
      // 1. Create the user credentials in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(tempAuth, emailLower, password);
      const uid = userCredential.user.uid;
      
      // 2. Set user document profile in Firestore
      const userDocRef = doc(db, "users", uid);
      await setDoc(userDocRef, {
        displayName,
        email: emailLower,
        role,
        status: "active",
        requirePasswordChange: true,
        createdAt: Timestamp.now()
      });
      
      // 3. Clean up temporary app instance
      await deleteApp(tempApp);
      return { success: true, uid };
    } catch (error) {
      // Ensure temp app is deleted in case of failure
      try {
        await deleteApp(tempApp);
      } catch (e) {
        console.error("Temp app deletion error:", e);
      }
      throw error;
    }
  }
}
