import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updatePassword
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  getDocs,
  collection, 
  query, 
  where, 
  Timestamp 
} from "firebase/firestore";
import { auth, db, isMockMode } from "./config";

// Default seed users for Mock Mode
const DEFAULT_MOCK_USERS = [
  {
    uid: "mock-admin",
    email: "admin@gmail.com",
    displayName: "System Admin",
    role: "admin",
    status: "active",
    requirePasswordChange: false,
    password: "admin" // For simplicity in mock login
  },
  {
    uid: "mock-requester",
    email: "requester@gmail.com",
    displayName: "John Requester",
    role: "requester",
    status: "active",
    requirePasswordChange: false,
    password: "password"
  },
  {
    uid: "mock-quality",
    email: "quality@gmail.com",
    displayName: "Sarah Quality",
    role: "quality",
    status: "active",
    requirePasswordChange: false,
    password: "password"
  },
  {
    uid: "mock-finance",
    email: "finance@gmail.com",
    displayName: "David Finance",
    role: "finance",
    status: "active",
    requirePasswordChange: false,
    password: "password"
  }
];

// Initialize mock storage if empty
if (isMockMode && !localStorage.getItem("mock_users")) {
  localStorage.setItem("mock_users", JSON.stringify(DEFAULT_MOCK_USERS));
  localStorage.setItem("mock_password_resets", JSON.stringify([]));
}

/**
 * Signs in a user using email and password.
 */
export async function login(email, password) {
  const emailLower = email.toLowerCase();
  
  if (isMockMode) {
    const users = JSON.parse(localStorage.getItem("mock_users") || "[]");
    const found = users.find(u => u.email.toLowerCase() === emailLower);
    if (!found) {
      throw new Error("No account found with this email address.");
    }
    // Simple password validation for mock
    if (password !== found.password && password !== "welcome123") {
      throw new Error("Incorrect password. Please try again.");
    }
    if (found.status === "inactive") {
      throw new Error("This user account has been deactivated by an Administrator.");
    }
    
    // Set active mock session
    localStorage.setItem("mock_session_uid", found.uid);
    window.dispatchEvent(new Event("storage"));
    
    return {
      user: { uid: found.uid, email: found.email },
      profile: found
    };
  } else {
    // Real Firebase Sign In
    const userCredential = await signInWithEmailAndPassword(auth, emailLower, password);
    const user = userCredential.user;
    
    // Fetch Firestore Profile
    const userDocRef = doc(db, "users", user.uid);
    let userDoc = await getDoc(userDocRef);
    let profile = null;
    
    if (userDoc.exists()) {
      profile = { id: userDoc.id, ...userDoc.data() };
    } else if (emailLower === "admin@gmail.com") {
      // Auto seed admin profile document in firestore if missing
      profile = {
        email: "admin@gmail.com",
        displayName: "Super Admin",
        role: "admin",
        status: "active",
        requirePasswordChange: false,
        createdAt: Timestamp.now()
      };
      await setDoc(userDocRef, profile);
      profile.id = user.uid;
    } else {
      await signOut(auth);
      throw new Error("No user profile found in database.");
    }
    
    if (profile.status === "inactive") {
      await signOut(auth);
      throw new Error("This user account has been deactivated by an Administrator.");
    }
    
    return { user, profile };
  }
}

/**
 * Terminate current user session
 */
export async function logout() {
  if (isMockMode) {
    localStorage.removeItem("mock_session_uid");
    window.dispatchEvent(new Event("storage"));
    return true;
  } else {
    return await signOut(auth);
  }
}

/**
 * Creates a password reset request
 */
export async function resetPassword(email) {
  const emailLower = email.toLowerCase();
  
  if (isMockMode) {
    const resets = JSON.parse(localStorage.getItem("mock_password_resets") || "[]");
    const newReset = {
      id: `reset-${Date.now()}`,
      email: emailLower,
      status: "PENDING",
      requestedAt: new Date().toISOString()
    };
    resets.push(newReset);
    localStorage.setItem("mock_password_resets", JSON.stringify(resets));
    window.dispatchEvent(new Event("storage"));
    return true;
  } else {
    await addDoc(collection(db, "password_resets"), {
      email: emailLower,
      status: "PENDING",
      requestedAt: Timestamp.now()
    });
    return true;
  }
}

/**
 * Subscribe to authentication state changes
 */
export function subscribeAuthState(onStateChanged) {
  if (isMockMode) {
    const checkSession = () => {
      const activeUid = localStorage.getItem("mock_session_uid");
      if (activeUid) {
        const users = JSON.parse(localStorage.getItem("mock_users") || "[]");
        const found = users.find(u => u.uid === activeUid);
        if (found && found.status === "active") {
          onStateChanged({ uid: found.uid, email: found.email }, found);
          return;
        }
      }
      onStateChanged(null, null);
    };

    checkSession();

    const listener = (e) => {
      if (e.key === "mock_session_uid" || e.key === "mock_users") {
        checkSession();
      }
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  } else {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const profile = { id: userDoc.id, ...userDoc.data() };
            if (profile.status === "active") {
              onStateChanged(user, profile);
              return;
            }
          } else if (user.email && user.email.toLowerCase() === "admin@gmail.com") {
            // Seed if not exists
            const profile = {
              email: "admin@gmail.com",
              displayName: "Super Admin",
              role: "admin",
              status: "active",
              requirePasswordChange: false,
              createdAt: Timestamp.now()
            };
            await setDoc(userDocRef, profile);
            onStateChanged(user, { id: user.uid, ...profile });
            return;
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
        }
      }
      onStateChanged(null, null);
    });
  }
}

/**
 * Updates password of the currently logged-in user
 */
export async function updateUserPassword(newPassword) {
  if (isMockMode) {
    const uid = localStorage.getItem("mock_session_uid");
    const users = JSON.parse(localStorage.getItem("mock_users") || "[]");
    const index = users.findIndex(u => u.uid === uid);
    if (index !== -1) {
      users[index].password = newPassword;
      users[index].requirePasswordChange = false;
      localStorage.setItem("mock_users", JSON.stringify(users));
      window.dispatchEvent(new Event("storage"));
    }
    return true;
  } else {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated session found.");
    
    // Update password in Firebase Auth SDK
    await updatePassword(user, newPassword);
    
    // Clear flag in Firestore doc
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, { requirePasswordChange: false });
    return true;
  }
}

/**
 * Fetch all pending password reset requests
 */
export async function getPendingPasswordResets() {
  if (isMockMode) {
    const resets = JSON.parse(localStorage.getItem("mock_password_resets") || "[]");
    return resets.filter(r => r.status === "PENDING");
  } else {
    const q = query(
      collection(db, "password_resets"),
      where("status", "==", "PENDING")
    );
    const snapshot = await getDocs(q);
    const results = [];
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      let displayName = "Unknown User";
      
      // Look up user document by email
      try {
        const uQ = query(collection(db, "users"), where("email", "==", data.email));
        const uSnap = await getDocs(uQ);
        if (!uSnap.empty) {
          displayName = uSnap.docs[0].data().displayName || "User";
        }
      } catch (err) {
        console.error(err);
      }
      
      results.push({
        id: docSnap.id,
        ...data,
        name: displayName,
        requestedAt: data.requestedAt ? data.requestedAt.toDate().toISOString() : null
      });
    }
    return results;
  }
}

/**
 * Approve password reset (reset to welcome123 and force password change)
 */
export async function approvePasswordReset(requestId) {
  if (isMockMode) {
    const resets = JSON.parse(localStorage.getItem("mock_password_resets") || "[]");
    const index = resets.findIndex(r => r.id === requestId);
    if (index === -1) throw new Error("Reset request not found.");
    
    const email = resets[index].email;
    const users = JSON.parse(localStorage.getItem("mock_users") || "[]");
    const uIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (uIndex !== -1) {
      users[uIndex].password = "welcome123";
      users[uIndex].requirePasswordChange = true;
      localStorage.setItem("mock_users", JSON.stringify(users));
    }
    
    resets[index].status = "APPROVED";
    resets[index].approvedAt = new Date().toISOString();
    localStorage.setItem("mock_password_resets", JSON.stringify(resets));
    window.dispatchEvent(new Event("storage"));
    return true;
  } else {
    // In real mode, since we don't have Admin SDK Cloud Functions deployed, we write to an approved field
    // and let the client update on next auth attempt, OR we let the admin perform it if they have credentials.
    // To match serverless, we'll mark the request as approved, and we can also update their Firestore profile 
    // so they are flagged as needing reset. The admin will instruct them to log in with welcome123.
    // Let's locate the user doc.
    const docRef = doc(db, "password_resets", requestId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const uQ = query(collection(db, "users"), where("email", "==", data.email));
      const uSnap = await getDocs(uQ);
      if (!uSnap.empty) {
        const uDoc = uSnap.docs[0];
        await updateDoc(doc(db, "users", uDoc.id), {
          requirePasswordChange: true
        });
      }
      await updateDoc(docRef, {
        status: "APPROVED",
        approvedAt: Timestamp.now()
      });
    }
    return true;
  }
}
