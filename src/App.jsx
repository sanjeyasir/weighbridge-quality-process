import React from "react";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider, theme } from "antd";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import AppRoutes from "./routes/AppRoutes";

export default function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#10b981", // Emerald green brand color
          colorSuccess: "#10b981", 
          colorWarning: "#f59e0b", 
          colorError: "#ef4444",   
          colorInfo: "#6366f1",    // Indigo for secondary highlights
          colorBgBase: "#f8fafc",  
          colorBgContainer: "#ffffff", 
          borderRadius: 10,
          fontFamily: '"Outfit", "Inter", sans-serif',
        },
      }}
    >
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <AppRoutes />
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  );
}
