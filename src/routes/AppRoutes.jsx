import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../components/common/ProtectedRoute";
import DashboardLayout from "../components/layout/DashboardLayout";

// Import Pages
import Login from "../pages/auth/Login";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ChangePassword from "../pages/auth/ChangePassword";
import PasswordSuccess from "../pages/auth/PasswordSuccess";
import Dashboard from "../pages/dashboard/Dashboard";
import WeighbridgeRequests from "../pages/weighbridge/WeighbridgeRequests";
import WeighbridgeApiStream from "../pages/weighbridge/WeighbridgeApiStream";
import CreateRequest from "../pages/weighbridge/CreateRequest";
import RequestDetails from "../pages/weighbridge/RequestDetails";
import Users from "../pages/admin/Users";
import PlantMaster from "../pages/admin/PlantMaster";
import ApiDocs from "../pages/admin/ApiDocs";

import { useAuth } from "../contexts/AuthContext";

function ApiDocsRoute() {
  const { currentUser } = useAuth() || {};

  if (currentUser) {
    return (
      <DashboardLayout>
        <ApiDocs isPublic={false} />
      </DashboardLayout>
    );
  }

  return <ApiDocs isPublic={true} />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      
      {/* Public Swagger API Docs (No login required) */}
      <Route path="/api-docs" element={<ApiDocsRoute />} />
      <Route path="/docs" element={<Navigate to="/api-docs" replace />} />
      <Route path="/swagger" element={<Navigate to="/api-docs" replace />} />

      {/* Force Change Password Route */}
      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePassword />
          </ProtectedRoute>
        }
      />

      {/* Password Changed Success Route */}
      <Route
        path="/password-success"
        element={
          <ProtectedRoute>
            <PasswordSuccess />
          </ProtectedRoute>
        }
      />

      {/* Protected Routes in Dashboard Layout */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/requests"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <WeighbridgeRequests />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Separate View: REST API Transactions Live Stream in Bootstrap */}
      <Route
        path="/api-stream"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <WeighbridgeApiStream />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/requests/create"
        element={
          <ProtectedRoute allowedRoles={["requester", "admin"]}>
            <DashboardLayout>
              <CreateRequest />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/requests/:id"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <RequestDetails />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Admin User Management */}
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardLayout>
              <Users />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Plant Master Management */}
      <Route
        path="/plants"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <PlantMaster />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Fallback Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
