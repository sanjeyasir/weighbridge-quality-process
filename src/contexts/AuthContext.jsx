import React, { createContext, useContext, useEffect } from "react";
import * as authService from "../services/firebase/authService";
import { isMockMode } from "../services/firebase/config";
import { useAuthStore } from "../store/authStore";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const { user, profile, loading, setAuth, clearAuth } = useAuthStore();

  useEffect(() => {
    const unsubscribe = authService.subscribeAuthState((usr, prof) => {
      if (usr) {
        setAuth(usr, prof);
      } else {
        clearAuth();
      }
    });

    return () => unsubscribe();
  }, [setAuth, clearAuth]);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    setAuth(res.user, res.profile);
    return res.profile;
  };

  const logout = async () => {
    try {
      await authService.logout();
      clearAuth();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const resetPassword = async (email) => {
    return await authService.resetPassword(email);
  };

  const updateLocalProfile = (newFields) => {
    if (profile) {
      setAuth(user, { ...profile, ...newFields });
    }
  };

  const currentUser = profile ? {
    uid: user?.uid || profile.uid || profile.id,
    email: user?.email || profile.email || "",
    displayName: profile.displayName || "User",
    role: profile.role,
    status: profile.status,
    requirePasswordChange: profile.requirePasswordChange || false
  } : null;

  const value = {
    currentUser,
    loading,
    login,
    logout,
    resetPassword,
    updateLocalProfile,
    isMockMode
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="d-flex flex-column justify-content-center align-items-center min-vh-100 bg-light">
          <div className="spinner-border text-success mb-3" style={{ width: "2.5rem", height: "2.5rem" }} role="status">
            <span className="visually-hidden">Loading session...</span>
          </div>
          <div className="text-muted fw-semibold fs-7">Verifying session...</div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
