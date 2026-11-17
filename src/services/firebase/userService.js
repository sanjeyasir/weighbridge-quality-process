import { 
  collection, 
  getDocs, 
  getDoc,
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
 * Standard Role to Configuration Profile mapping
 */
export const ROLE_CONFIG_MAP = {
  admin: "ALL",
  ALL: "ALL",
  requester: "REQUESTER",
  REQUESTER: "REQUESTER",
  quality: "QUALITY",
  QUALITY: "QUALITY",
  finance_officer: "FINANCE_OFFICER",
  FINANCE_OFFICER: "FINANCE_OFFICER",
  finance: "FINANCE_OFFICER",
  finance_manager: "FINANCE_MANAGER",
  FINANCE_MANAGER: "FINANCE_MANAGER"
};

/**
 * Default clean Role Views (Permitted sidebar routes per role - precise, no mock data)
 */
export const DEFAULT_ROLE_VIEWS = {
  admin: [
    "/dashboard",
    "/weighbridge-transactions",
    "/requests/new",
    "/requests/created",
    "/requests/quality",
    "/requests/finance-costing",
    "/requests/finance-approval",
    "/requests/completed",
    "/requests/rejected",
    "/plants",
    "/admin/users",
    "/api-docs",
    "/view-config"
  ],
  requester: [
    "/dashboard",
    "/weighbridge-transactions",
    "/requests/new",
    "/requests/created",
    "/requests/completed"
  ],
  quality: [
    "/dashboard",
    "/weighbridge-transactions",
    "/requests/quality",
    "/requests/created",
    "/requests/completed"
  ],
  finance_officer: [
    "/dashboard",
    "/weighbridge-transactions",
    "/requests/finance-costing",
    "/requests/completed"
  ],
  finance_manager: [
    "/dashboard",
    "/weighbridge-transactions",
    "/requests/finance-approval",
    "/requests/completed",
    "/requests/rejected"
  ]
};

/**
 * Role-Based View Configurations (Permitted sidebar routes per role)
 */
export const ROLE_PROFILES = {
  ...DEFAULT_ROLE_VIEWS,
  ALL: DEFAULT_ROLE_VIEWS.admin,
  REQUESTER: DEFAULT_ROLE_VIEWS.requester,
  QUALITY: DEFAULT_ROLE_VIEWS.quality,
  FINANCE_OFFICER: DEFAULT_ROLE_VIEWS.finance_officer,
  finance: DEFAULT_ROLE_VIEWS.finance_officer,
  FINANCE_MANAGER: DEFAULT_ROLE_VIEWS.finance_manager
};

/**
 * Fetch customized role view configurations from Firestore or localStorage
 */
export async function getRoleViewConfigurations() {
  let configs = null;

  if (isMockMode) {
    try {
      const saved = localStorage.getItem("app_role_view_configs");
      if (saved) configs = JSON.parse(saved);
    } catch (e) {}
  } else {
    try {
      const snap = await getDoc(doc(db, "app_settings", "role_views"));
      if (snap.exists() && snap.data()?.configs) {
        configs = snap.data().configs;
      }
    } catch (err) {
      console.warn("Could not fetch remote role view configurations:", err);
    }

    if (!configs) {
      try {
        const saved = localStorage.getItem("app_role_view_configs");
        if (saved) configs = JSON.parse(saved);
      } catch (e) {}
    }
  }

  // Sanitize legacy cached configurations so /view-config is not in non-admin roles by default
  const legacyCleaned = localStorage.getItem("role_views_clean_v3");
  if (!legacyCleaned && configs) {
    ["requester", "quality", "finance_officer", "finance_manager"].forEach(r => {
      if (configs[r]) {
        configs[r] = configs[r].filter(k => k !== "/view-config");
      }
    });
    localStorage.setItem("app_role_view_configs", JSON.stringify(configs));
    localStorage.setItem("role_views_clean_v3", "true");
    if (!isMockMode) {
      saveRoleViewConfigurations(configs).catch(console.warn);
    }
  } else if (!legacyCleaned) {
    localStorage.setItem("role_views_clean_v3", "true");
  }

  const result = {
    admin: configs?.admin || DEFAULT_ROLE_VIEWS.admin,
    requester: configs?.requester || DEFAULT_ROLE_VIEWS.requester,
    quality: configs?.quality || DEFAULT_ROLE_VIEWS.quality,
    finance_officer: configs?.finance_officer || DEFAULT_ROLE_VIEWS.finance_officer,
    finance_manager: configs?.finance_manager || DEFAULT_ROLE_VIEWS.finance_manager
  };

  localStorage.setItem("app_role_view_configs", JSON.stringify(result));
  return result;
}

/**
 * Persist customized role view configurations to Firestore and localStorage
 */
export async function saveRoleViewConfigurations(configs) {
  localStorage.setItem("app_role_view_configs", JSON.stringify(configs));
  if (!isMockMode) {
    try {
      await setDoc(doc(db, "app_settings", "role_views"), {
        configs,
        updatedAt: Timestamp.now()
      }, { merge: true });
    } catch (err) {
      console.warn("Could not save remote role view configurations:", err);
    }
  }
  window.dispatchEvent(new Event("app_role_views_changed"));
  return true;
}

/**
 * Get configured views for a given role (checking saved configs first)
 */
export function getRoleViews(role) {
  const normalized = (role || "requester").toLowerCase();
  try {
    const saved = localStorage.getItem("app_role_view_configs");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed[normalized] && Array.isArray(parsed[normalized])) {
        return parsed[normalized];
      }
    }
  } catch (e) {}
  return DEFAULT_ROLE_VIEWS[normalized] || DEFAULT_ROLE_VIEWS.admin;
}

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
 * Update an employee's assigned plant
 */
export async function updateUserPlant(uid, plantId, plantName) {
  const plantCode = (plantId || "HES-1").toUpperCase();
  const name = plantName || `Plant ${plantCode}`;

  if (isMockMode) {
    const users = JSON.parse(localStorage.getItem("mock_users") || "[]");
    const index = users.findIndex(u => u.uid === uid);
    if (index !== -1) {
      users[index].plantId = plantCode;
      users[index].plantName = name;
      localStorage.setItem("mock_users", JSON.stringify(users));
      window.dispatchEvent(new Event("storage"));
    }
    return true;
  } else {
    const docRef = doc(db, "users", uid);
    await updateDoc(docRef, {
      plantId: plantCode,
      plantName: name
    });
    return true;
  }
}

/**
 * Update a user account's role, role-based configuration, plant, and details
 */
export async function updateUserAccount(uid, updates) {
  // admin@gmail.com must always have admin role and cannot be changed
  let isTargetAdmin = false;
  if (isMockMode) {
    const users = JSON.parse(localStorage.getItem("mock_users") || "[]");
    const found = users.find(u => u.uid === uid || u.email?.toLowerCase() === "admin@gmail.com");
    if (found?.email?.toLowerCase() === "admin@gmail.com") isTargetAdmin = true;
  } else {
    try {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists() && snap.data()?.email?.toLowerCase() === "admin@gmail.com") {
        isTargetAdmin = true;
      }
    } catch (e) {
      console.warn("Could not check admin status for update:", e);
    }
  }

  const allowedFields = {};
  if (isTargetAdmin) {
    allowedFields.role = "admin";
    allowedFields.roleConfig = "ALL";
    allowedFields.status = "active";
  } else {
    if (updates.role) {
      allowedFields.role = updates.role;
      allowedFields.roleConfig = updates.roleConfig || ROLE_CONFIG_MAP[updates.role] || "ALL";
      allowedFields.enabledViews = updates.enabledViews || getRoleViews(updates.role);
    }
    if (updates.roleConfig && !allowedFields.enabledViews) {
      allowedFields.roleConfig = updates.roleConfig;
      allowedFields.enabledViews = updates.enabledViews || getRoleViews(updates.roleConfig);
    }
    if (updates.status) {
      allowedFields.status = updates.status;
    }
  }

  if (updates.enabledViews) {
    allowedFields.enabledViews = updates.enabledViews;
  }
  if (updates.plantId) {
    allowedFields.plantId = updates.plantId.toUpperCase();
    allowedFields.plantName = updates.plantName || `Plant ${allowedFields.plantId}`;
  }
  if (updates.displayName) {
    allowedFields.displayName = updates.displayName;
  }

  if (isMockMode) {
    const users = JSON.parse(localStorage.getItem("mock_users") || "[]");
    const index = users.findIndex(u => u.uid === uid);
    if (index !== -1) {
      users[index] = { ...users[index], ...allowedFields };
      localStorage.setItem("mock_users", JSON.stringify(users));
      window.dispatchEvent(new Event("storage"));
    }
    return true;
  } else {
    const docRef = doc(db, "users", uid);
    await updateDoc(docRef, allowedFields);
    return true;
  }
}

/**
 * Creates a new user account with role, role-based configuration, and assigned plant.
 * Uses a secondary app instance to register Auth credentials client-side.
 */
export async function createUser(userData) {
  const { email, password, displayName, role, roleConfig, plantId, plantName, enabledViews: customViews } = userData;
  const emailLower = email.toLowerCase();
  const assignedPlantId = (plantId || "HES-1").toUpperCase();
  const assignedPlantName = plantName || `Plant ${assignedPlantId}`;
  const assignedRoleConfig = roleConfig || ROLE_CONFIG_MAP[role] || "ALL";
  const enabledViews = customViews || getRoleViews(role);

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
      roleConfig: assignedRoleConfig,
      enabledViews,
      plantId: assignedPlantId,
      plantName: assignedPlantName,
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
        roleConfig: assignedRoleConfig,
        enabledViews,
        plantId: assignedPlantId,
        plantName: assignedPlantName,
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
