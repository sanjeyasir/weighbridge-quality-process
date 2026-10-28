import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Offcanvas, Dropdown } from "react-bootstrap";

export default function DashboardLayout({ children }) {
  const { currentUser, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 992);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getSelectedKey = () => {
    if (location.pathname.startsWith("/api-stream")) return "/api-stream";
    if (location.pathname.startsWith("/plants")) return "/plants";
    if (location.pathname.startsWith("/api-docs")) return "/api-docs";
    if (location.pathname.startsWith("/admin/users")) return "/admin/users";
    return "/dashboard";
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case "admin": return "danger";
      case "requester": return "primary";
      case "quality": return "purple";
      case "finance": return "success";
      default: return "secondary";
    }
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

  const isAdmin = currentUser?.role === "admin";

  // Menu items: Dashboard Overview, Weighbridge Transactions, Plant Master, Swagger API Docs, User Accounts
  const menuItems = [
    {
      key: "/dashboard",
      icon: "bi-speedometer2",
      label: "Dashboard Overview"
    },
    {
      key: "/api-stream",
      icon: "bi-journal-text",
      label: "Weighbridge Transactions"
    },
    {
      key: "/plants",
      icon: "bi-buildings",
      label: "Plant Master"
    },
    {
      key: "/api-docs",
      icon: "bi-file-earmark-code",
      label: "Swagger API Docs"
    }
  ];

  if (isAdmin) {
    menuItems.push({
      key: "/admin/users",
      icon: "bi-people",
      label: "User Accounts"
    });
  }

  // Sidebar navigation content
  const renderNavContent = (isDrawer = false) => {
    const isExpanded = isDrawer || !collapsed;

    return (
      <div className="d-flex flex-column h-100 bg-white">
        {/* Brand header */}
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
              <i className="bi bi-journal-text"></i>
            </div>
            {isExpanded && (
              <div className="text-truncate">
                <div className="fw-bold text-dark lh-sm" style={{ fontSize: "0.95rem" }}>
                  Weighbridge Hub
                </div>
                <div className="text-primary text-uppercase fw-bold" style={{ fontSize: "0.68rem", letterSpacing: "0.05em" }}>
                  Scale Operations
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
        <div className="flex-grow-1 overflow-auto py-3 px-2">
          <ul className="nav nav-pills flex-column gap-1">
            {menuItems.map((item) => {
              const active = getSelectedKey() === item.key;
              return (
                <li key={item.key} className="nav-item">
                  <button
                    type="button"
                    className={`nav-link w-100 text-start d-flex align-items-center gap-3 py-2 px-3 rounded-2 fw-semibold border-0 ${
                      active 
                        ? "bg-primary text-white shadow-sm" 
                        : "text-secondary bg-transparent hover-bg-light"
                    }`}
                    style={{ fontSize: "0.9rem", transition: "all 0.15s ease-in-out" }}
                    onClick={() => {
                      navigate(item.key);
                      if (isDrawer) setMobileDrawerOpen(false);
                    }}
                    title={!isExpanded ? item.label : undefined}
                  >
                    <i className={`bi ${item.icon} fs-5`}></i>
                    {isExpanded && <span className="text-truncate">{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* User profile footer */}
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
              <span className={`badge bg-${getRoleBadgeVariant(currentUser?.role)} text-uppercase fw-bold fs-8`}>
                {getRoleLabel(currentUser?.role)}
              </span>
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

  const siderWidth = collapsed ? 76 : 260;

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

            <span className="fw-bold text-dark fs-6 d-flex align-items-center gap-2">
              <i className="bi bi-journal-check text-primary d-none d-sm-inline"></i>
              <span>Weighbridge Operations</span>
            </span>
          </div>

          {/* Right Header: User Profile Dropdown (Firebase Live and Notifications removed) */}
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
                <Dropdown.Item onClick={() => navigate("/change-password")} className="small py-2">
                  <i className="bi bi-key me-2 text-muted"></i> Change Password
                </Dropdown.Item>
                {isAdmin && (
                  <Dropdown.Item onClick={() => navigate("/admin/users")} className="small py-2">
                    <i className="bi bi-people me-2 text-muted"></i> User Accounts
                  </Dropdown.Item>
                )}
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
                getSelectedKey() === "/api-stream" ? "text-primary fw-bold" : "text-secondary"
              }`}
              style={{ fontSize: "0.72rem" }}
              onClick={() => navigate("/api-stream")}
            >
              <i className="bi bi-journal-text fs-5 lh-1"></i>
              <span>Transactions</span>
            </button>

            <button 
              type="button" 
              className={`btn btn-link text-decoration-none d-flex flex-column align-items-center py-1 px-2 border-0 ${
                getSelectedKey() === "/plants" ? "text-primary fw-bold" : "text-secondary"
              }`}
              style={{ fontSize: "0.72rem" }}
              onClick={() => navigate("/plants")}
            >
              <i className="bi bi-buildings fs-5 lh-1"></i>
              <span>Plants</span>
            </button>

            {isAdmin && (
              <button 
                type="button" 
                className={`btn btn-link text-decoration-none d-flex flex-column align-items-center py-1 px-2 border-0 ${
                  getSelectedKey() === "/admin/users" ? "text-primary fw-bold" : "text-secondary"
                }`}
                style={{ fontSize: "0.72rem" }}
                onClick={() => navigate("/admin/users")}
              >
                <i className="bi bi-people fs-5 lh-1"></i>
                <span>Users</span>
              </button>
            )}

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
