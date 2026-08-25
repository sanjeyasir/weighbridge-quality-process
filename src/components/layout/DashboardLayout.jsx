import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import { toggleMockMode } from "../../services/firebase/config";
import { 
  Layout, 
  Menu, 
  Button, 
  Avatar, 
  Tag, 
  Space, 
  Tooltip, 
  Badge, 
  Popover, 
  List, 
  Typography, 
  Drawer,
  Alert
} from "antd";
import { 
  MenuOutlined, 
  DashboardOutlined, 
  TableOutlined, 
  PlusCircleOutlined, 
  UserOutlined, 
  LogoutOutlined, 
  BellOutlined, 
  CloudOutlined, 
  CloudSyncOutlined,
  CheckCircleOutlined,
  BuildOutlined
} from "@ant-design/icons";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function DashboardLayout({ children }) {
  const { currentUser, logout, isMockMode } = useAuth();
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleMenuClick = ({ key }) => {
    navigate(key);
    setMobileOpen(false);
  };

  const getSelectedKey = () => {
    return location.pathname;
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case "admin": return "Administrator";
      case "requester": return "Requester Team";
      case "quality": return "Quality Team";
      case "finance": return "Finance Team";
      default: return role;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "admin": return "red";
      case "requester": return "blue";
      case "quality": return "purple";
      case "finance": return "success";
      default: return "default";
    }
  };

  // Build menu items based on role
  const menuItems = [
    {
      key: "/dashboard",
      icon: <DashboardOutlined />,
      label: "Dashboard"
    },
    {
      key: "/requests",
      icon: <TableOutlined />,
      label: "Weighbridge Records"
    }
  ];

  // Show "Create Request" only for Requester or Admin
  if (currentUser?.role === "requester" || currentUser?.role === "admin") {
    menuItems.push({
      key: "/requests/create",
      icon: <PlusCircleOutlined />,
      label: "New Request"
    });
  }

  // Show "User Accounts" only for Admin
  if (currentUser?.role === "admin") {
    menuItems.push({
      key: "/admin/users",
      icon: <UserOutlined />,
      label: "User Accounts"
    });
  }

  const notificationContent = (
    <div style={{ width: 320 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, borderBottom: "1px solid #f1f5f9" }}>
        <Text bold>In-App Notifications</Text>
        {notifications.length > 0 && (
          <Button type="link" size="small" onClick={markAllAsRead} style={{ padding: 0 }}>
            Mark all read
          </Button>
        )}
      </div>
      <List
        size="small"
        dataSource={notifications}
        locale={{ emptyText: "No unread alerts" }}
        renderItem={item => (
          <List.Item 
            actions={[
              <Button type="link" size="small" onClick={() => markAsRead(item.id)}>Read</Button>
            ]}
            style={{ padding: "8px 0" }}
          >
            <List.Item.Meta
              title={
                <Link to={`/requests/${item.requestId}`} onClick={() => markAsRead(item.id)} style={{ fontSize: "0.85rem", color: "#6366f1", fontWeight: 600 }}>
                  Ticket Alert
                </Link>
              }
              description={<span style={{ fontSize: "0.75rem", color: "#64748b" }}>{item.message}</span>}
            />
          </List.Item>
        )}
      />
    </div>
  );

  const sidebarContent = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Branding Header */}
      <div style={{ 
        height: 64, 
        display: "flex", 
        alignItems: "center", 
        padding: "0 24px", 
        gap: 12,
        background: "#ffffff"
      }}>
        <BuildOutlined style={{ fontSize: 24, color: "#10b981" }} />
        {!collapsed && (
          <div>
            <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.95rem", lineHeight: 1.1 }}>
              Weighbridge Hub
            </div>
            <div style={{ color: "#64748b", fontSize: "0.7rem", letterSpacing: "0.05em", marginTop: 2, textTransform: "uppercase" }}>
              Quality & Billing
            </div>
          </div>
        )}
      </div>
      
      <hr style={{ border: 0, borderTop: "1px solid #f1f5f9", margin: 0 }} />
      
      {/* Menu Options */}
      <div style={{ flexGrow: 1, overflowY: "auto", padding: "12px 8px" }}>
        <Menu
          mode="inline"
          theme="light"
          inlineCollapsed={collapsed}
          selectedKeys={[getSelectedKey()]}
          onClick={handleMenuClick}
          items={menuItems}
          style={{ background: "transparent", border: "none" }}
        />
      </div>

      <hr style={{ border: 0, borderTop: "1px solid #f1f5f9", margin: 0 }} />

      {/* User Footer Profile */}
      <div style={{ padding: collapsed ? "12px" : "20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {!collapsed ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar style={{ backgroundColor: "#10b981", fontWeight: 700 }}>
              {currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : "U"}
            </Avatar>
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.85rem" }}>
                {currentUser?.displayName || "User"}
              </div>
              <div style={{ color: "#64748b", fontSize: "0.75rem" }}>
                {currentUser?.email}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Avatar style={{ backgroundColor: "#10b981", fontWeight: 700 }}>
              {currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : "U"}
            </Avatar>
          </div>
        )}
        <Button 
          type="default" 
          danger 
          icon={<LogoutOutlined />} 
          onClick={logout} 
          style={{ background: "rgba(239, 68, 68, 0.04)", borderColor: "rgba(239, 68, 68, 0.15)", width: "100%", padding: collapsed ? 0 : "4px 15px" }}
        >
          {!collapsed && "Sign Out"}
        </Button>
      </div>
    </div>
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sider
          width={260}
          collapsedWidth={80}
          collapsible
          collapsed={collapsed}
          trigger={null}
          style={{
            position: "fixed",
            height: "100vh",
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
            background: "#ffffff",
            borderRight: "1px solid #e2e8f0"
          }}
        >
          {sidebarContent}
        </Sider>
      )}

      {/* Mobile Drawer */}
      <Drawer
        placement="left"
        closable={false}
        onClose={() => setMobileOpen(false)}
        open={mobileOpen}
        styles={{ body: { padding: 0, background: "#ffffff" } }}
        width={260}
      >
        {sidebarContent}
      </Drawer>

      <Layout style={{ 
        marginLeft: isMobile ? 0 : (collapsed ? 80 : 260), 
        minHeight: "100vh", 
        display: "flex", 
        flexDirection: "column",
        transition: "all 0.2s"
      }}>
        {/* Top Header */}
        <Header
          style={{
            padding: "0 24px",
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid #e2e8f0",
            position: "fixed",
            top: 0,
            right: 0,
            left: isMobile ? 0 : (collapsed ? 80 : 260),
            zIndex: 90,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 64,
            transition: "all 0.2s"
          }}
        >
          <Space size="middle">
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => isMobile ? setMobileOpen(!mobileOpen) : setCollapsed(!collapsed)}
              style={{ fontSize: "16px", width: 40, height: 40, color: "#0f172a" }}
            />
            <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
              Raw Material Processing
            </span>
          </Space>

          <Space size="middle">
            {/* Mock Mode Status Toggle */}
            <Tooltip title={isMockMode ? "Click to use Firebase" : "Click to use Offline Mock Mode"}>
              <Tag
                icon={isMockMode ? <CloudSyncOutlined /> : <CloudOutlined />}
                color={isMockMode ? "warning" : "success"}
                onClick={() => toggleMockMode(!isMockMode)}
                style={{ cursor: "pointer", fontWeight: 700, padding: "4px 10px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6 }}
              >
                {isMockMode ? "Mock Mode" : "Firebase Connected"}
              </Tag>
            </Tooltip>

            {/* Notification Bell */}
            <Popover 
              content={notificationContent} 
              title="Notifications" 
              trigger="click"
              placement="bottomRight"
            >
              <Badge count={notifications.length} size="small" style={{ cursor: "pointer" }}>
                <Button 
                  type="text" 
                  shape="circle" 
                  icon={<BellOutlined style={{ fontSize: 18 }} />} 
                />
              </Badge>
            </Popover>

            {/* Role Badge */}
            {currentUser && (
              <Tag color={getRoleColor(currentUser.role)} style={{ fontWeight: 700, textTransform: "uppercase", fontSize: "0.65rem", padding: "2px 8px" }}>
                {getRoleLabel(currentUser.role)}
              </Tag>
            )}
          </Space>
        </Header>

        {/* Content area */}
        <Content
          style={{
            margin: "88px 24px 24px 24px",
            flexGrow: 1,
            display: "flex",
            flexDirection: "column"
          }}
        >
          {isMockMode && (
            <Alert
              message="Running in Local Mock Mode. Active collections persist only in your browser storage. You can log in using requester@gmail.com, quality@gmail.com, or finance@gmail.com with password 'password', or admin@gmail.com with password 'admin'."
              type="warning"
              showIcon
              style={{ marginBottom: 24, borderRadius: 10 }}
            />
          )}
          
          <div style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
