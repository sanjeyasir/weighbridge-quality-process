import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../components/common/ProtectedRoute";
import DashboardLayout from "../components/layout/DashboardLayout";

// Import Auth Pages
import Login from "../pages/auth/Login";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ChangePassword from "../pages/auth/ChangePassword";
import PasswordSuccess from "../pages/auth/PasswordSuccess";

// Import Main Views
import Dashboard from "../pages/dashboard/Dashboard";
import WeighbridgeTransactionsView from "../pages/weighbridge/WeighbridgeTransactionsView";
import CreateProcessRequestView from "../pages/weighbridge/CreateProcessRequestView";
import CreatedRequestsView from "../pages/weighbridge/CreatedRequestsView";
import QualityParametersView from "../pages/weighbridge/QualityParametersView";
import FinanceCostingView from "../pages/weighbridge/FinanceCostingView";
import FinanceApprovalView from "../pages/weighbridge/FinanceApprovalView";
import CompletedRequestsView from "../pages/weighbridge/CompletedRequestsView";
import RejectedRequestsView from "../pages/weighbridge/RejectedRequestsView";

// Import Admin & Config Pages
import ViewConfiguration from "../pages/admin/ViewConfiguration";
import PlantMaster from "../pages/admin/PlantMaster";
import Users from "../pages/admin/Users";
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

      {/* Dashboard Overview */}
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

      {/* View 1: All Weighbridge Scale Transactions (Plant Wise) */}
      <Route
        path="/weighbridge-transactions"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <WeighbridgeTransactionsView />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route path="/api-stream" element={<Navigate to="/weighbridge-transactions" replace />} />

      {/* View 2: Create New Process Request (Plant Wise Filter) */}
      <Route
        path="/requests/new"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <CreateProcessRequestView />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route path="/requests/create" element={<Navigate to="/requests/new" replace />} />

      {/* View 3: Created Requests by Requester (Plant Wise Filter) */}
      <Route
        path="/requests/created"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <CreatedRequestsView />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route path="/requests" element={<Navigate to="/requests/created" replace />} />

      {/* View 4: Quality & Costing Parameters Update (Plant Wise Filter) */}
      <Route
        path="/requests/quality"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <QualityParametersView />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* View 5: Finance Officer Costing (Plant Wise Filter) */}
      <Route
        path="/requests/finance-costing"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <FinanceCostingView />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* View 6: Finance Manager Approval (Plant Wise Filter) */}
      <Route
        path="/requests/finance-approval"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <FinanceApprovalView />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* View 7: Completed Requests (Plant Wise Filter) */}
      <Route
        path="/requests/completed"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <CompletedRequestsView />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* View 8: Rejected Requests (Plant Wise Filter) */}
      <Route
        path="/requests/rejected"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <RejectedRequestsView />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* View 9: User View Configuration */}
      <Route
        path="/view-config"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ViewConfiguration />
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

      {/* User Accounts & Role Management (Accessible to all user roles to edit role selection) */}
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
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
