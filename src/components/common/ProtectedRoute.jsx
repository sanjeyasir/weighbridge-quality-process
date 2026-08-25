import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Spin } from "antd";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <Spin size="large" tip="Verifying session..." />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Force first-time login users to update their password
  if (currentUser.requirePasswordChange && location.pathname !== "/change-password" && location.pathname !== "/password-success") {
    return <Navigate to="/change-password" replace />;
  }

  // Admin has absolute bypass access
  if (currentUser.role === "admin") {
    return children;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    // If not authorized, redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
