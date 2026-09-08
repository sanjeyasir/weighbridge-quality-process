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
          colorPrimaryHover: "#059669",
          colorSuccess: "#10b981", 
          colorWarning: "#f59e0b", 
          colorError: "#ef4444",   
          colorInfo: "#6366f1",    // Indigo for secondary highlights
          colorBgBase: "#f8fafc",  
          colorBgContainer: "#ffffff",
          colorTextBase: "#0f172a",
          colorTextSecondary: "#64748b",
          colorBorder: "#e2e8f0",
          borderRadius: 10,
          borderRadiusLG: 16,
          borderRadiusSM: 6,
          fontFamily: '"Outfit", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          controlHeightLG: 46,
          controlHeight: 38,
          fontSize: 14,
          fontSizeHeading2: 22,
          fontSizeHeading3: 18,
          boxShadowSecondary: "0 10px 25px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)",
        },
        components: {
          Card: {
            headerBg: "transparent",
            headerFontSize: 16,
            headerFontSizeSM: 14,
            paddingLG: 20,
          },
          Button: {
            controlHeight: 38,
            controlHeightLG: 46,
            borderRadius: 8,
            fontWeight: 600,
          },
          Table: {
            headerBg: "#f8fafc",
            headerColor: "#475569",
            rowHoverBg: "#f1f5f9",
            borderRadiusLG: 12,
          },
          Tabs: {
            itemSelectedColor: "#10b981",
            inkBarColor: "#10b981",
            itemHoverColor: "#059669",
            titleFontSize: 14,
          },
          Input: {
            paddingInline: 12,
            paddingBlock: 8,
            activeBorderColor: "#10b981",
            hoverBorderColor: "#34d399",
          },
          InputNumber: {
            activeBorderColor: "#10b981",
            hoverBorderColor: "#34d399",
          },
          Tag: {
            borderRadiusSM: 6,
          }
        }
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
