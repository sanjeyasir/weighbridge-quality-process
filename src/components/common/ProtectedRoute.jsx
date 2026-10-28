import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center min-vh-100 bg-light">
        <div className="spinner-border text-success mb-2" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <div className="text-muted small fw-semibold">Verifying session...</div>
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
