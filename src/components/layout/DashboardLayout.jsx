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
  Alert,
  Dropdown
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
  BuildOutlined,
  AppstoreOutlined,
  CloseOutlined
} from "@ant-design/icons";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function DashboardLayout({ children }) {
  const { currentUser, logout, isMockMode } = useAuth();
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleMenuClick = ({ key }) => {
    navigate(key);
    setMobileDrawerOpen(false);
  };

  const getSelectedKey = () => {
    if (location.pathname.startsWith("/requests/create")) return "/requests/create";
    if (location.pathname.startsWith("/requests/")) return "/requests";
    return location.pathname;
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case "admin": return "Administrator";
      case "requester": return "Requester";
      case "quality": return "Quality Team";
      case "finance": return "Finance Team";
      default: return role || "Operator";
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "admin": return "#ef4444";
      case "requester": return "#3b82f6";
      case "quality": return "#8b5cf6";
      case "finance": return "#10b981";
      default: return "#64748b";
    }
  };

  const canCreateRequest = currentUser?.role === "requester" || currentUser?.role === "admin";
  const isAdmin = currentUser?.role === "admin";

  // Build menu items based on role
  const menuItems = [
    {
      key: "/dashboard",
      icon: <DashboardOutlined style={{ fontSize: 18 }} />,
      label: "Dashboard Overview"
    },
    {
      key: "/requests",
      icon: <TableOutlined style={{ fontSize: 18 }} />,
      label: "Weighbridge Records"
    }
  ];

  if (canCreateRequest) {
    menuItems.push({
      key: "/requests/create",
      icon: <PlusCircleOutlined style={{ fontSize: 18 }} />,
      label: "New Requisition"
    });
  }

  if (isAdmin) {
    menuItems.push({
      key: "/admin/users",
      icon: <UserOutlined style={{ fontSize: 18 }} />,
      label: "User Accounts"
    });
  }

  const notificationContent = (
    <div style={{ width: isMobile ? 280 : 340 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: "1px solid #f1f5f9" }}>
        <Text strong style={{ fontSize: "0.9rem", color: "#0f172a" }}>Alerts & Notifications</Text>
        {notifications.length > 0 && (
          <Button type="link" size="small" onClick={markAllAsRead} style={{ padding: 0, fontSize: "0.75rem", color: "#10b981" }}>
            Mark all read
          </Button>
        )}
      </div>
      <List
        size="small"
        dataSource={notifications}
        locale={{ emptyText: <span style={{ color: "#94a3b8", fontSize: "0.8rem", padding: "16px 0", display: "block" }}>No unread alerts</span> }}
        renderItem={item => (
          <List.Item 
            actions={[
              <Button type="link" size="small" onClick={() => markAsRead(item.id)} style={{ fontSize: "0.75rem", padding: 0 }}>
                Dismiss
              </Button>
            ]}
            style={{ padding: "10px 0", borderBottom: "1px solid #f8fafc" }}
          >
            <List.Item.Meta
              title={
                <Link 
                  to={`/requests/${item.requestId}`} 
                  onClick={() => markAsRead(item.id)} 
                  style={{ fontSize: "0.82rem", color: "#6366f1", fontWeight: 700 }}
                >
                  Ticket Notification
                </Link>
              }
              description={<span style={{ fontSize: "0.75rem", color: "#64748b", lineHeight: 1.3, display: "block" }}>{item.message}</span>}
            />
          </List.Item>
        )}
      />
    </div>
  );

  const userDropdownItems = {
    items: [
      {
        key: "role-info",
        label: (
          <div style={{ padding: "4px 0" }}>
            <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.85rem" }}>{currentUser?.displayName || "Operator"}</div>
            <div style={{ color: "#64748b", fontSize: "0.75rem" }}>{currentUser?.email}</div>
            <div style={{ marginTop: 4 }}>
              <Tag color={getRoleColor(currentUser?.role)} style={{ fontSize: "0.68rem", fontWeight: 700 }}>
                {getRoleLabel(currentUser?.role)}
              </Tag>
            </div>
          </div>
        ),
        disabled: true,
      },
      { type: "divider" },
      {
        key: "change-password",
        label: "Change Password",
        onClick: () => navigate("/change-password"),
      },
      {
        key: "logout",
        danger: true,
        icon: <LogoutOutlined />,
        label: "Sign Out",
        onClick: logout,
      },
    ],
  };

  // Render navigation sidebar (Desktop or Mobile Drawer)
  const renderNavContent = (isDrawer = false) => {
    const isExpanded = isDrawer || !collapsed;

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#ffffff" }}>
        {/* Branding Header */}
        <div style={{ 
          height: 68, 
          display: "flex", 
          alignItems: "center", 
          justifyContent: isExpanded ? "space-between" : "center",
          padding: isExpanded ? "0 20px" : "0", 
          gap: 12,
          background: "#ffffff",
          borderBottom: "1px solid #f1f5f9"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: 20,
              boxShadow: "0 4px 10px rgba(16, 185, 129, 0.25)",
              flexShrink: 0
            }}>
              <BuildOutlined />
            </div>
            {isExpanded && (
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.98rem", lineHeight: 1.2, letterSpacing: "-0.01em" }}>
                  Weighbridge Hub
                </div>
                <div style={{ color: "#10b981", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Quality & Billing
                </div>
              </div>
            )}
          </div>

          {isDrawer && (
            <Button 
              type="text" 
              icon={<CloseOutlined />} 
              onClick={() => setMobileDrawerOpen(false)}
              style={{ color: "#64748b" }}
            />
          )}
        </div>
        
        {/* Menu Options with clear text wording */}
        <div style={{ flexGrow: 1, overflowY: "auto", padding: "16px 12px" }}>
          <Menu
            mode="inline"
            theme="light"
            inlineCollapsed={!isExpanded}
            selectedKeys={[getSelectedKey()]}
            onClick={handleMenuClick}
            items={menuItems}
            style={{ 
              background: "transparent", 
              border: "none",
              fontWeight: 600,
              fontSize: "0.92rem"
            }}
          />
        </div>

        {/* User Footer Profile & Sign out with full wording */}
        <div style={{ 
          padding: isExpanded ? "18px 16px" : "12px", 
          borderTop: "1px solid #f1f5f9",
          background: "#fafbfc",
          display: "flex", 
          flexDirection: "column", 
          gap: 12 
        }}>
          {isExpanded ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <Avatar style={{ backgroundColor: "#10b981", fontWeight: 800, color: "#ffffff", width: 36, height: 36 }}>
                  {currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : "U"}
                </Avatar>
                <div style={{ overflow: "hidden", flex: 1 }}>
                  <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {currentUser?.displayName || "Operator"}
                  </div>
                  <div style={{ color: "#64748b", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {currentUser?.email}
                  </div>
                </div>
              </div>
              <Tag color={getRoleColor(currentUser?.role)} style={{ fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase" }}>
                {getRoleLabel(currentUser?.role)}
              </Tag>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Avatar style={{ backgroundColor: "#10b981", fontWeight: 800 }}>
                {currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : "U"}
              </Avatar>
            </div>
          )}

          <Button 
            type="text" 
            danger 
            icon={<LogoutOutlined />} 
            onClick={logout} 
            style={{ 
              background: "rgba(239, 68, 68, 0.05)", 
              color: "#ef4444", 
              fontWeight: 700, 
              width: "100%", 
              borderRadius: 8,
              fontSize: "0.85rem",
              height: 38,
              padding: isExpanded ? "4px 14px" : "0"
            }}
          >
            {isExpanded && "Sign Out"}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Layout style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Desktop Floating Sider */}
      {!isMobile && (
        <Sider
          width={260}
          collapsedWidth={76}
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
            borderRight: "1px solid #e2e8f0",
            boxShadow: "2px 0 8px rgba(0, 0, 0, 0.02)"
          }}
        >
          {renderNavContent(false)}
        </Sider>
      )}

      {/* Mobile Drawer (Always expanded with full wording) */}
      <Drawer
        placement="left"
        closable={false}
        onClose={() => setMobileDrawerOpen(false)}
        open={mobileDrawerOpen}
        styles={{ body: { padding: 0, background: "#ffffff" } }}
        width={290}
      >
        {renderNavContent(true)}
      </Drawer>

      <Layout style={{ 
        marginLeft: isMobile ? 0 : (collapsed ? 76 : 260), 
        minHeight: "100vh", 
        display: "flex", 
        flexDirection: "column",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        background: "#f8fafc"
      }}>
        {/* Top Header */}
        <Header
          style={{
            padding: isMobile ? "0 14px" : "0 28px",
            background: "rgba(255, 255, 255, 0.88)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderBottom: "1px solid #e2e8f0",
            position: "fixed",
            top: 0,
            right: 0,
            left: isMobile ? 0 : (collapsed ? 76 : 260),
            zIndex: 90,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 64,
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
          }}
        >
          <Space size={isMobile ? "small" : "middle"}>
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => isMobile ? setMobileDrawerOpen(!mobileDrawerOpen) : setCollapsed(!collapsed)}
              style={{ fontSize: "16px", width: 38, height: 38, color: "#0f172a", borderRadius: 8 }}
            />
            
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {isMobile && (
                <div style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontSize: 14,
                }}>
                  <BuildOutlined />
                </div>
              )}
              <span style={{ 
                fontWeight: 800, 
                fontSize: isMobile ? "0.95rem" : "1.05rem", 
                color: "#0f172a", 
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap"
              }}>
                {isMobile ? "Weighbridge Hub" : "Raw Material Processing"}
              </span>
            </div>
          </Space>

          <Space size={isMobile ? 6 : "middle"}>
            {/* Mock Mode Status Toggle */}
            <Tooltip title={isMockMode ? "Click to connect Live Firebase" : "Click to switch to Offline Mock Mode"}>
              <Tag
                icon={isMockMode ? <CloudSyncOutlined /> : <CloudOutlined />}
                color={isMockMode ? "warning" : "success"}
                onClick={() => toggleMockMode(!isMockMode)}
                style={{ 
                  cursor: "pointer", 
                  fontWeight: 700, 
                  padding: isMobile ? "2px 6px" : "3px 10px", 
                  borderRadius: 8, 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 4,
                  fontSize: isMobile ? "0.7rem" : "0.78rem",
                  margin: 0
                }}
              >
                {isMobile ? (isMockMode ? "Mock" : "Live") : (isMockMode ? "Offline Mock Mode" : "Firebase Live")}
              </Tag>
            </Tooltip>

            {/* Notification Bell */}
            <Popover 
              content={notificationContent} 
              title="Alerts" 
              trigger="click"
              placement="bottomRight"
            >
              <Badge count={notifications.length} size="small" offset={[-2, 2]}>
                <Button 
                  type="text" 
                  shape="circle" 
                  icon={<BellOutlined style={{ fontSize: 17, color: "#334155" }} />} 
                  style={{ width: 36, height: 36 }}
                />
              </Badge>
            </Popover>

            {/* Role / User Avatar dropdown */}
            <Dropdown menu={userDropdownItems} placement="bottomRight" trigger={["click"]}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 8, 
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: 8,
                transition: "background 0.2s"
              }}>
                <Avatar style={{ backgroundColor: "#10b981", fontWeight: 800, width: 32, height: 32, fontSize: 13 }}>
                  {currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : "U"}
                </Avatar>
                {!isMobile && (
                  <Tag 
                    style={{ 
                      fontWeight: 700, 
                      textTransform: "uppercase", 
                      fontSize: "0.68rem", 
                      padding: "2px 8px", 
                      margin: 0,
                      borderColor: getRoleColor(currentUser?.role),
                      color: getRoleColor(currentUser?.role),
                      background: "transparent"
                    }}
                  >
                    {getRoleLabel(currentUser?.role)}
                  </Tag>
                )}
              </div>
            </Dropdown>
          </Space>
        </Header>

        {/* Content area */}
        <Content
          style={{
            margin: isMobile ? "74px 12px 76px 12px" : "84px 28px 28px 28px",
            flexGrow: 1,
            display: "flex",
            flexDirection: "column"
          }}
        >
          {isMockMode && (
            <Alert
              message={
                <span style={{ fontSize: "0.82rem" }}>
                  <strong>Offline Mock Mode Active:</strong> Data is saved locally in browser storage. Test accounts: <code>requester@gmail.com</code>, <code>quality@gmail.com</code>, <code>finance@gmail.com</code> (pw: <code>password</code>), or <code>admin@gmail.com</code> (pw: <code>admin</code>).
                </span>
              }
              type="warning"
              showIcon
              closable
              style={{ marginBottom: 16, borderRadius: 10 }}
            />
          )}
          
          <div style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
            {children}
          </div>
        </Content>

        {/* Mobile Bottom Dock */}
        {isMobile && (
          <nav className="mobile-bottom-dock" aria-label="Mobile Navigation">
            <button 
              type="button" 
              className={`dock-item ${getSelectedKey() === "/dashboard" ? "active" : ""}`}
              onClick={() => navigate("/dashboard")}
            >
              <DashboardOutlined className="dock-icon" />
              <span>Overview</span>
            </button>

            <button 
              type="button" 
              className={`dock-item ${getSelectedKey() === "/requests" ? "active" : ""}`}
              onClick={() => navigate("/requests")}
            >
              <TableOutlined className="dock-icon" />
              <span>Records</span>
            </button>

            {canCreateRequest && (
              <button 
                type="button" 
                className={`dock-item ${getSelectedKey() === "/requests/create" ? "active" : ""}`}
                onClick={() => navigate("/requests/create")}
              >
                <PlusCircleOutlined className="dock-icon" style={{ color: "#10b981", fontSize: 22 }} />
                <span style={{ color: "#10b981", fontWeight: 700 }}>New Ticket</span>
              </button>
            )}

            {isAdmin && (
              <button 
                type="button" 
                className={`dock-item ${getSelectedKey() === "/admin/users" ? "active" : ""}`}
                onClick={() => navigate("/admin/users")}
              >
                <UserOutlined className="dock-icon" />
                <span>Users</span>
              </button>
            )}

            <button 
              type="button" 
              className="dock-item"
              onClick={() => setMobileDrawerOpen(true)}
            >
              <AppstoreOutlined className="dock-icon" />
              <span>More</span>
            </button>
          </nav>
        )}
      </Layout>
    </Layout>
  );
}
