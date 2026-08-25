import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  writeBatch,
  arrayUnion,
  Timestamp 
} from "firebase/firestore";
import { db, isMockMode } from "./config";

/**
 * Subscribe to real-time notification feeds.
 * Filters notifications by targeting specific user UID or matching user role.
 */
export function subscribeNotifications(currentUser, onNotificationsChanged) {
  if (!currentUser) {
    onNotificationsChanged([]);
    return () => {};
  }

  const { uid, role } = currentUser;

  if (isMockMode) {
    const checkNotifications = () => {
      const all = JSON.parse(localStorage.getItem("mock_notifications") || "[]");
      
      const filtered = all.filter(n => {
        // Targeted specifically to this user
        if (n.userId === uid) return !n.read;
        
        // System admin gets all notifications
        if (role === "admin") {
          return !(n.readBy && n.readBy.includes(uid));
        }

        // Target to user's specific role
        if (n.role && n.role === role) {
          return !(n.readBy && n.readBy.includes(uid));
        }
        
        return false;
      });

      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      onNotificationsChanged(filtered);
    };

    checkNotifications();

    const listener = (e) => {
      if (e.key === "mock_notifications") {
        checkNotifications();
      }
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  } else {
    // Real Firestore Listener
    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
    
    return onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
        };
      });

      const filtered = all.filter(n => {
        if (n.userId === uid) {
          return !n.read;
        }
        if (role === "admin") {
          return !(n.readBy && n.readBy.includes(uid));
        }
        if (n.role && n.role === role) {
          return !(n.readBy && n.readBy.includes(uid));
        }
        return false;
      });

      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      onNotificationsChanged(filtered);
    }, (err) => {
      console.error("Error listening to notifications:", err);
    });
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(notificationId, currentUser) {
  const { uid } = currentUser;
  
  if (isMockMode) {
    const list = JSON.parse(localStorage.getItem("mock_notifications") || "[]");
    const idx = list.findIndex(n => n.id === notificationId);
    if (idx !== -1) {
      const n = list[idx];
      if (n.role) {
        if (!n.readBy) n.readBy = [];
        if (!n.readBy.includes(uid)) n.readBy.push(uid);
      } else {
        n.read = true;
      }
      list[idx] = n;
      localStorage.setItem("mock_notifications", JSON.stringify(list));
      window.dispatchEvent(new Event("storage"));
    }
  } else {
    const docRef = doc(db, "notifications", notificationId);
    const snap = await getDocs(query(collection(db, "notifications")));
    const foundDoc = snap.docs.find(d => d.id === notificationId);
    
    if (foundDoc) {
      const data = foundDoc.data();
      if (data.role) {
        await updateDoc(docRef, {
          readBy: arrayUnion(uid)
        });
      } else {
        await updateDoc(docRef, {
          read: true
        });
      }
    }
  }
}

/**
 * Mark all active notifications as read
 */
export async function markAllNotificationsAsRead(currentUser, activeNotifications) {
  const { uid } = currentUser;
  
  if (isMockMode) {
    const list = JSON.parse(localStorage.getItem("mock_notifications") || "[]");
    activeNotifications.forEach(activeN => {
      const idx = list.findIndex(n => n.id === activeN.id);
      if (idx !== -1) {
        const n = list[idx];
        if (n.userId === uid) {
          n.read = true;
        } else if (n.role) {
          if (!n.readBy) n.readBy = [];
          if (!n.readBy.includes(uid)) n.readBy.push(uid);
        }
        list[idx] = n;
      }
    });
    localStorage.setItem("mock_notifications", JSON.stringify(list));
    window.dispatchEvent(new Event("storage"));
  } else {
    const batch = writeBatch(db);
    activeNotifications.forEach(n => {
      const docRef = doc(db, "notifications", n.id);
      if (n.userId === uid) {
        batch.update(docRef, { read: true });
      } else if (n.role) {
        batch.update(docRef, { readBy: arrayUnion(uid) });
      }
    });
    await batch.commit();
  }
}

/**
 * Creates a notification
 */
export async function createNotification(notificationData) {
  const now = new Date();
  const payload = {
    userId: notificationData.userId || null,
    role: notificationData.role || null,
    requestNo: notificationData.requestNo || null,
    requestId: notificationData.requestId || null,
    message: notificationData.message,
    read: false,
    readBy: [],
    createdAt: isMockMode ? now.toISOString() : Timestamp.fromDate(now)
  };

  if (isMockMode) {
    const list = JSON.parse(localStorage.getItem("mock_notifications") || "[]");
    payload.id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    list.push(payload);
    localStorage.setItem("mock_notifications", JSON.stringify(list));
    window.dispatchEvent(new Event("storage"));
  } else {
    await addDoc(collection(db, "notifications"), payload);
  }
}
