import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { ROLE_CONFIG_MAP, ROLE_PROFILES, DEFAULT_ROLE_VIEWS } from "../../services/firebase/userService";
import { Offcanvas, Dropdown } from "react-bootstrap";

export const MASTER_NAVIGATION_ITEMS = [
  {
    key: "/dashboard",
    icon: "bi-speedometer2",
    label: "Dashboard Overview",
    group: "Overview"
  },
  {
    key: "/weighbridge-transactions",
    icon: "bi-journal-text",
    label: "Weighbridge Transactions",
    group: "Scale Records"
  },
  {
    key: "/requests/new",
    icon: "bi-plus-circle",
    label: "Create Process Request",
    group: "Process Workflow"
  },
  {
    key: "/requests/created",
    icon: "bi-inbox",
    label: "Created Requests (Requester)",
    group: "Process Workflow"
  },
  {
    key: "/requests/quality",
    icon: "bi-clipboard-check",
    label: "Quality Parameters Update",
    group: "Process Workflow"
  },
  {
    key: "/requests/finance-costing",
    icon: "bi-calculator",
    label: "Finance Officer Costing",
    group: "Process Workflow"
  },
  {
    key: "/requests/finance-approval",
    icon: "bi-check2-circle",
    label: "Finance Manager Approval",
    group: "Process Workflow"
  },
  {
    key: "/requests/completed",
    icon: "bi-patch-check-fill",
    label: "Completed Requests",
    group: "Reporting & Archive"
  },
  {
    key: "/requests/rejected",
    icon: "bi-x-circle-fill",
    label: "Rejected Requests",
    group: "Reporting & Archive"
  },
  {
    key: "/view-config",
    icon: "bi-toggles",
    label: "View Configuration",
    group: "Preferences"
  },
  {
    key: "/admin/users",
    icon: "bi-people",
    label: "User Accounts & Roles",
    group: "Administration"
  },
  {
    key: "/plants",
    icon: "bi-buildings",
    label: "Plant Master",
    group: "Administration"
  },
  {
    key: "/api-docs",
    icon: "bi-file-earmark-code",
    label: "Swagger API Docs",
    group: "Administration"
  }
];

export default function DashboardLayout({ children }) {
  const { currentUser, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const [viewConfig, setViewConfig] = useState(() => {
    try {
      const saved = localStorage.getItem("user_view_config");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 992);
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    const handleConfigChange = () => {
      try {
        const saved = localStorage.getItem("user_view_config");
        setViewConfig(saved ? JSON.parse(saved) : null);
      } catch (e) {
        console.error(e);
      }
    };

    window.addEventListener("user_view_config_changed", handleConfigChange);
    window.addEventListener("app_role_views_changed", handleConfigChange);
    window.addEventListener("storage", handleConfigChange);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("user_view_config_changed", handleConfigChange);
      window.removeEventListener("app_role_views_changed", handleConfigChange);
      window.removeEventListener("storage", handleConfigChange);
    };
  }, []);

  const isSuperAdmin = (currentUser?.email || "").toLowerCase() === "admin@gmail.com";
  const isAdmin = currentUser?.role === "admin" || isSuperAdmin;

  // Filtered menu items dynamically driven by user role-based configuration
  const menuItems = useMemo(() => {
    let allMasterItems = [...MASTER_NAVIGATION_ITEMS];

    const userRole = isSuperAdmin ? "admin" : (currentUser?.role || "requester").toLowerCase();

    // 1. Check if we have role-specific configured views from viewConfig or localStorage
    let savedRoleConfigs = null;
    try {
      const stored = localStorage.getItem("app_role_view_configs");
      if (stored) savedRoleConfigs = JSON.parse(stored);
    } catch (e) {}

    let allowedViews = null;

    if (viewConfig?.roleConfigs && viewConfig.roleConfigs[userRole]) {
      allowedViews = viewConfig.roleConfigs[userRole];
    } else if (savedRoleConfigs && savedRoleConfigs[userRole]) {
      allowedViews = savedRoleConfigs[userRole];
    } else if (viewConfig?.enabledViews && viewConfig.role === userRole) {
      allowedViews = viewConfig.enabledViews;
    } else if (currentUser?.enabledViews && Array.isArray(currentUser.enabledViews) && currentUser.enabledViews.length > 0 && !isSuperAdmin) {
      allowedViews = currentUser.enabledViews;
    } else {
      allowedViews = DEFAULT_ROLE_VIEWS[userRole] || DEFAULT_ROLE_VIEWS.admin;
    }

    // Filter master items strictly according to allowedViews.
    // View configuration is not default in non-admin roles and strictly hidden when disabled.
    const filtered = allMasterItems.filter(item => {
      if (isSuperAdmin && item.key === "/view-config") return true;
      return allowedViews.includes(item.key);
    });

    return filtered;
  }, [viewConfig, isAdmin, isSuperAdmin, currentUser]);

  const getSelectedKey = () => {
    const current = location.pathname;
    const match = menuItems.find(item => item.key === current);
    if (match) return match.key;
    if (current.startsWith("/requests/")) {
      const subMatch = menuItems.find(item => current.startsWith(item.key));
      if (subMatch) return subMatch.key;
    }
    return current;
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case "admin": return "danger";
      case "requester": return "primary";
      case "quality": return "purple";
      case "finance_officer": return "info";
      case "finance": return "info";
      case "finance_manager": return "success";
      default: return "secondary";
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case "admin": return "Admin";
      case "requester": return "Requester";
      case "quality": return "Quality";
      case "finance_officer": return "Finance Officer";
      case "finance": return "Finance Officer";
      case "finance_manager": return "Finance Manager";
      default: return role || "Operator";
    }
  };

  const renderNavContent = (isDrawer = false) => {
    const isExpanded = isDrawer || !collapsed;

    return (
      <div className="d-flex flex-column h-100 bg-white">
        {/* Brand Header */}
        <div 
          className="d-flex align-items-center justify-content-between px-3 border-bottom" 
          style={{ height: 68 }}
        >
          <div className="d-flex align-items-center gap-2 overflow-hidden">
            <div 
              className="d-flex align-items-center justify-content-center text-white rounded-3 shadow-sm flex-shrink-0"
              style={{
                width: 38,
                height: 38,
                background: "linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%)",
                fontSize: "1.2rem"
              }}
            >
              <i className="bi bi-truck"></i>
            </div>
            {isExpanded && (
              <div className="text-truncate">
                <div className="fw-bold text-dark lh-sm" style={{ fontSize: "0.95rem" }}>
                  Weighbridge Hub
                </div>
                <div className="text-primary text-uppercase fw-bold" style={{ fontSize: "0.68rem", letterSpacing: "0.05em" }}>
                  Quality & Costing
                </div>
              </div>
            )}
          </div>

          {isDrawer && (
            <button 
              type="button" 
              className="btn-close text-reset shadow-none" 
              onClick={() => setMobileDrawerOpen(false)}
            ></button>
          )}
        </div>

        {/* Menu Items */}
        <div className="flex-grow-1 overflow-auto py-2 px-2">
          <ul className="nav nav-pills flex-column gap-1">
            {menuItems.map((item, idx) => {
              const active = getSelectedKey() === item.key;
              const prevItem = menuItems[idx - 1];
              const showSectionHeader = isExpanded && (!prevItem || prevItem.group !== item.group);

              return (
                <React.Fragment key={item.key}>
                  {showSectionHeader && (
                    <li className="px-3 pt-2 pb-1 text-uppercase fw-bold text-muted" style={{ fontSize: "0.65rem", letterSpacing: "0.06em" }}>
                      {item.group}
                    </li>
                  )}
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link w-100 text-start d-flex align-items-center gap-2.5 py-2 px-2.5 rounded-2 fw-semibold border-0 ${
                        active 
                          ? "bg-primary text-white shadow-sm" 
                          : "text-secondary bg-transparent hover-bg-light"
                      }`}
                      style={{ fontSize: "0.85rem", transition: "all 0.15s ease-in-out" }}
                      onClick={() => {
                        navigate(item.key);
                        if (isDrawer) setMobileDrawerOpen(false);
                      }}
                      title={!isExpanded ? item.label : undefined}
                    >
                      <i className={`bi ${item.icon} fs-5 flex-shrink-0`} style={{ width: 22, textAlign: "center" }}></i>
                      {isExpanded && <span className="text-truncate">{item.label}</span>}
                    </button>
                  </li>
                </React.Fragment>
              );
            })}
          </ul>
        </div>

        {/* User Profile Footer */}
        <div className="p-3 border-top bg-light">
          {isExpanded ? (
            <div className="mb-2">
              <div className="d-flex align-items-center gap-2 mb-2">
                <div 
                  className="rounded-circle bg-primary text-white fw-bold d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 34, height: 34, fontSize: "0.85rem" }}
                >
                  {currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : "U"}
                </div>
                <div className="text-truncate" style={{ maxWidth: 160 }}>
                  <div className="fw-bold text-dark small text-truncate">
                    {currentUser?.displayName || "Operator"}
                  </div>
                  <div className="text-muted fs-8 text-truncate">
                    {currentUser?.email}
                  </div>
                </div>
              </div>
              <div className="d-flex align-items-center gap-1.5 flex-wrap">
                <span className={`badge bg-${getRoleBadgeVariant(currentUser?.role)} text-uppercase fw-bold fs-8`}>
                  {getRoleLabel(currentUser?.role)}
                </span>
                <span className="badge bg-secondary-subtle text-dark font-monospace fw-semibold fs-8">
                  {currentUser?.plantId || "HES-1"}
                </span>
              </div>
            </div>
          ) : (
            <div className="d-flex justify-content-center mb-2">
              <div 
                className="rounded-circle bg-primary text-white fw-bold d-flex align-items-center justify-content-center"
                style={{ width: 34, height: 34, fontSize: "0.85rem" }}
              >
                {currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : "U"}
              </div>
            </div>
          )}

          <button
            type="button"
            className="btn btn-outline-danger btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
            onClick={logout}
          >
            <i className="bi bi-box-arrow-right"></i>
            {isExpanded && <span>Sign Out</span>}
          </button>
        </div>
      </div>
    );
  };

  const siderWidth = collapsed ? 76 : 270;

  return (
    <div className="d-flex" style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      {/* Desktop Persistent Sidebar */}
      {!isMobile && (
        <aside 
          className="border-end bg-white position-fixed top-0 bottom-0 start-0 z-3"
          style={{ 
            width: siderWidth, 
            transition: "width 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: "2px 0 8px rgba(0,0,0,0.02)"
          }}
        >
          {renderNavContent(false)}
        </aside>
      )}

      {/* Mobile Offcanvas Drawer */}
      <Offcanvas 
        show={mobileDrawerOpen} 
        onHide={() => setMobileDrawerOpen(false)}
        placement="start"
        style={{ width: 280 }}
      >
        <Offcanvas.Body className="p-0">
          {renderNavContent(true)}
        </Offcanvas.Body>
      </Offcanvas>

      {/* Main Content Layout */}
      <div 
        className="d-flex flex-column flex-grow-1"
        style={{ 
          marginLeft: isMobile ? 0 : siderWidth,
          transition: "margin-left 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          minWidth: 0
        }}
      >
        {/* Top Header Navbar */}
        <header 
          className="position-fixed top-0 end-0 bg-white bg-opacity-75 border-bottom z-2 d-flex align-items-center justify-content-between px-3 px-md-4"
          style={{ 
            height: 64,
            left: isMobile ? 0 : siderWidth,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            transition: "left 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-light btn-sm text-dark p-2 border shadow-none"
              onClick={() => isMobile ? setMobileDrawerOpen(!mobileDrawerOpen) : setCollapsed(!collapsed)}
              title="Toggle Navigation"
            >
              <i className="bi bi-list fs-5 lh-1"></i>
            </button>

            <span className="fw-bold text-dark fs-6">
              Weighbridge Hub & Process Automation
            </span>
          </div>

          {/* Right Header: User Profile Dropdown */}
          <div className="d-flex align-items-center gap-2">
            <Dropdown align="end">
              <Dropdown.Toggle 
                as="div" 
                className="d-flex align-items-center gap-2 p-1 rounded-2 cursor-pointer"
                style={{ cursor: "pointer" }}
              >
                <div 
                  className="rounded-circle bg-primary text-white fw-bold d-flex align-items-center justify-content-center shadow-sm"
                  style={{ width: 34, height: 34, fontSize: "0.85rem" }}
                >
                  {currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : "U"}
                </div>
                <div className="d-none d-md-block text-start lh-sm">
                  <div className="fw-bold text-dark small">{currentUser?.displayName || "Operator"}</div>
                  <span className={`badge bg-${getRoleBadgeVariant(currentUser?.role)} py-0 px-1`} style={{ fontSize: "0.65rem" }}>
                    {getRoleLabel(currentUser?.role)}
                  </span>
                </div>
              </Dropdown.Toggle>

              <Dropdown.Menu className="shadow-lg border-0 rounded-3 py-2" style={{ minWidth: 200 }}>
                <div className="px-3 py-2 border-bottom mb-1">
                  <div className="fw-bold small text-dark">{currentUser?.displayName}</div>
                  <div className="text-muted fs-8 text-truncate">{currentUser?.email}</div>
                </div>
                <Dropdown.Item onClick={() => navigate("/view-config")} className="small py-2">
                  <i className="bi bi-toggles me-2 text-muted"></i> View Configuration
                </Dropdown.Item>
                <Dropdown.Item onClick={() => navigate("/change-password")} className="small py-2">
                  <i className="bi bi-key me-2 text-muted"></i> Change Password
                </Dropdown.Item>
                <Dropdown.Item onClick={() => navigate("/admin/users")} className="small py-2">
                  <i className="bi bi-people me-2 text-muted"></i> User Accounts & Roles
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={logout} className="small py-2 text-danger">
                  <i className="bi bi-box-arrow-right me-2 text-danger"></i> Sign Out
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </header>

        {/* Content Wrapper */}
        <main 
          className="flex-grow-1 p-3 p-md-4" 
          style={{ 
            marginTop: 64,
            marginBottom: isMobile ? 64 : 0
          }}
        >
          {children}
        </main>

        {/* Mobile Bottom Navigation Dock */}
        {isMobile && (
          <nav 
            className="position-fixed bottom-0 start-0 end-0 bg-white border-top z-3 d-flex justify-content-around align-items-center"
            style={{ height: 60, boxShadow: "0 -2px 10px rgba(0,0,0,0.05)" }}
          >
            <button 
              type="button" 
              className={`btn btn-link text-decoration-none d-flex flex-column align-items-center py-1 px-2 border-0 ${
                getSelectedKey() === "/dashboard" ? "text-primary fw-bold" : "text-secondary"
              }`}
              style={{ fontSize: "0.72rem" }}
              onClick={() => navigate("/dashboard")}
            >
              <i className="bi bi-speedometer2 fs-5 lh-1"></i>
              <span>Overview</span>
            </button>

            <button 
              type="button" 
              className={`btn btn-link text-decoration-none d-flex flex-column align-items-center py-1 px-2 border-0 ${
                getSelectedKey() === "/weighbridge-transactions" ? "text-primary fw-bold" : "text-secondary"
              }`}
              style={{ fontSize: "0.72rem" }}
              onClick={() => navigate("/weighbridge-transactions")}
            >
              <i className="bi bi-journal-text fs-5 lh-1"></i>
              <span>Scale Wt</span>
            </button>

            <button 
              type="button" 
              className={`btn btn-link text-decoration-none d-flex flex-column align-items-center py-1 px-2 border-0 ${
                getSelectedKey() === "/requests/created" ? "text-primary fw-bold" : "text-secondary"
              }`}
              style={{ fontSize: "0.72rem" }}
              onClick={() => navigate("/requests/created")}
            >
              <i className="bi bi-inbox fs-5 lh-1"></i>
              <span>Requests</span>
            </button>

            <button 
              type="button" 
              className="btn btn-link text-decoration-none d-flex flex-column align-items-center py-1 px-2 border-0 text-secondary"
              style={{ fontSize: "0.72rem" }}
              onClick={() => setMobileDrawerOpen(true)}
            >
              <i className="bi bi-grid-fill fs-5 lh-1"></i>
              <span>More</span>
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
