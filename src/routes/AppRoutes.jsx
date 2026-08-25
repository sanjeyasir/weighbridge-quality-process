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
import CreateRequest from "../pages/weighbridge/CreateRequest";
import RequestDetails from "../pages/weighbridge/RequestDetails";
import Users from "../pages/admin/Users";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

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

      {/* Fallback Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
