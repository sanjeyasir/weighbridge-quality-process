import React, { useState, useEffect } from "react";
import { Card, Row, Col, Alert, Button, Form, Spinner } from "react-bootstrap";
import PlantSelector from "../../components/common/PlantSelector";
import { useAuth } from "../../contexts/AuthContext";
import { 
  updateUserAccount, 
  DEFAULT_ROLE_VIEWS, 
  getRoleViewConfigurations, 
  saveRoleViewConfigurations 
} from "../../services/firebase/userService";

export const ALL_VIEW_KEYS = [
  { key: "/dashboard", label: "Dashboard Overview", category: "General", icon: "bi-speedometer2" },
  { key: "/weighbridge-transactions", label: "Weighbridge Scale Records", category: "Scale Operations", icon: "bi-journal-text" },
  { key: "/requests/new", label: "Create Process Request", category: "Process Requests", icon: "bi-plus-circle" },
  { key: "/requests/created", label: "Created Requests (Requester)", category: "Process Requests", icon: "bi-inbox" },
  { key: "/requests/quality", label: "Quality Parameters Update", category: "Process Requests", icon: "bi-clipboard-check" },
  { key: "/requests/finance-costing", label: "Finance Officer Costing", category: "Process Requests", icon: "bi-calculator" },
  { key: "/requests/finance-approval", label: "Finance Manager Approval", category: "Process Requests", icon: "bi-check2-circle" },
  { key: "/requests/completed", label: "Completed Requests", category: "Reporting", icon: "bi-patch-check-fill" },
  { key: "/requests/rejected", label: "Rejected Requests", category: "Reporting", icon: "bi-x-circle-fill" },
  { key: "/plants", label: "Plant Master", category: "Administration", icon: "bi-buildings" },
  { key: "/admin/users", label: "User Accounts & Roles", category: "Administration", icon: "bi-people" },
  { key: "/api-docs", label: "Swagger API Docs", category: "Administration", icon: "bi-file-earmark-code" },
  { key: "/view-config", label: "View Configuration", category: "Administration", icon: "bi-toggles" }
];

export const SIMPLE_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "requester", label: "Requester" },
  { value: "quality", label: "Quality" },
  { value: "finance_officer", label: "Finance Officer" },
  { value: "finance_manager", label: "Finance Manager" }
];

export default function ViewConfiguration() {
  const { currentUser } = useAuth() || {};

  const currentRole = (currentUser?.role || "requester").toLowerCase();

  const [selectedRole, setSelectedRole] = useState(currentRole);
  
  // Track per-role view configurations in state
  const [roleConfigs, setRoleConfigs] = useState(() => {
    try {
      const saved = localStorage.getItem("app_role_view_configs");
      if (saved) {
        return { ...DEFAULT_ROLE_VIEWS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error(e);
    }
    return { ...DEFAULT_ROLE_VIEWS };
  });

  const [enabledViews, setEnabledViews] = useState(() => {
    try {
      const saved = localStorage.getItem("app_role_view_configs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed[currentRole] && Array.isArray(parsed[currentRole])) {
          return parsed[currentRole];
        }
      }
    } catch (e) {}
    return currentUser?.enabledViews || DEFAULT_ROLE_VIEWS[currentRole] || DEFAULT_ROLE_VIEWS.admin;
  });

  const [defaultPlant, setDefaultPlant] = useState(currentUser?.plantId || "ALL");
  const [savedAlert, setSavedAlert] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load latest role configurations from Firestore on mount
  useEffect(() => {
    let isMounted = true;
    async function initConfigs() {
      try {
        const fetched = await getRoleViewConfigurations();
        if (isMounted && fetched) {
          setRoleConfigs(prev => {
            const merged = { ...DEFAULT_ROLE_VIEWS, ...prev, ...fetched };
            // Also sync active role's enabled views if not yet modified
            if (merged[selectedRole]) {
              setEnabledViews(merged[selectedRole]);
            }
            return merged;
          });
        }
      } catch (err) {
        console.error("Error loading role view configurations:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initConfigs();
    return () => { isMounted = false; };
  }, []);

  // Sync user's default plant when currentUser is loaded
  useEffect(() => {
    if (currentUser?.plantId && defaultPlant === "ALL") {
      setDefaultPlant(currentUser.plantId);
    }
  }, [currentUser]);

  // When a role is selected from dropdown:
  // 1. Immediately preserve any modifications made to current role into roleConfigs
  // 2. Load the specific saved views for the newly selected role
  const handleRoleChange = (newRole) => {
    setRoleConfigs(prev => {
      const updated = {
        ...prev,
        [selectedRole]: enabledViews
      };
      const nextViews = updated[newRole] || DEFAULT_ROLE_VIEWS[newRole] || [];
      setEnabledViews([...nextViews]);
      return updated;
    });
    setSelectedRole(newRole);
  };

  // Toggle specific view switch and keep roleConfigs immediately synchronized
  const handleToggleView = (vKey) => {
    let updatedViews;
    if (enabledViews.includes(vKey)) {
      updatedViews = enabledViews.filter(k => k !== vKey);
    } else {
      updatedViews = [...enabledViews, vKey];
    }
    setEnabledViews(updatedViews);
    setRoleConfigs(prev => ({
      ...prev,
      [selectedRole]: updatedViews
    }));
  };

  // When button is pressed, save permanently to Firestore and localStorage and update navigation
  const handleSave = async () => {
    try {
      setSaving(true);
      const allConfigs = {
        ...roleConfigs,
        [selectedRole]: enabledViews
      };

      // 1. Persist system-wide role view configurations
      await saveRoleViewConfigurations(allConfigs);

      const isSuperAdmin = currentUser?.email?.toLowerCase() === "admin@gmail.com";

      // 2. Persist active user view config into localStorage
      const userConfig = {
        uid: currentUser?.uid,
        role: isSuperAdmin ? "admin" : selectedRole,
        enabledViews: isSuperAdmin ? (allConfigs["admin"] || DEFAULT_ROLE_VIEWS.admin) : enabledViews,
        roleConfigs: allConfigs,
        defaultPlant
      };
      localStorage.setItem("user_view_config", JSON.stringify(userConfig));

      // 3. Persist to current user document in Firestore so role and views remain permanent
      if (currentUser?.uid) {
        if (isSuperAdmin) {
          // admin@gmail.com must always have admin role and cannot be changed
          await updateUserAccount(currentUser.uid, {
            role: "admin",
            roleConfig: "ALL",
            enabledViews: allConfigs["admin"] || DEFAULT_ROLE_VIEWS.admin,
            plantId: defaultPlant !== "ALL" ? defaultPlant : (currentUser.plantId || "HES-1")
          });
        } else {
          await updateUserAccount(currentUser.uid, {
            role: selectedRole,
            roleConfig: selectedRole.toUpperCase(),
            enabledViews,
            plantId: defaultPlant !== "ALL" ? defaultPlant : (currentUser.plantId || "HES-1")
          });
        }
      }

      // 4. Dispatch events to immediately refresh DashboardLayout navigation
      window.dispatchEvent(new Event("user_view_config_changed"));
      window.dispatchEvent(new Event("storage"));

      setSavedAlert(true);
      setTimeout(() => setSavedAlert(false), 3500);
    } catch (err) {
      console.error("Save view configuration error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="d-flex flex-column gap-3">
      {/* Header */}
      <div className="card border shadow-sm rounded-3 bg-white p-3">
        <h4 className="fw-bold mb-0 text-dark">Role & View Configuration</h4>
        <p className="text-secondary small mb-0 mt-1">
          Select a role to view and configure its permitted sidebar navigation views
        </p>
      </div>

      {savedAlert && (
        <Alert variant="success" dismissible onClose={() => setSavedAlert(false)} className="shadow-sm">
          <i className="bi bi-check-circle-fill me-2"></i>
          Role & view configuration saved successfully! Sidebar is updated and configuration remains active.
        </Alert>
      )}

      {/* Main Settings Card */}
      <div className="card border shadow-sm rounded-3 bg-white p-4">
        {/* Role Selection Dropdown & Plant Selection */}
        <div className="p-3 rounded-3 border bg-light mb-4">
          <Row className="g-3 align-items-center">
            <Col xs={12} md={6}>
              <label className="form-label small fw-bold text-dark mb-1">
                <i className="bi bi-person-badge text-primary me-1.5"></i> Select Role:
              </label>
              <Form.Select
                value={selectedRole}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="form-select fw-bold border-primary shadow-sm"
                style={{ fontSize: "0.95rem" }}
              >
                {SIMPLE_ROLES.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Form.Select>
              <span className="text-muted small mt-1 d-block" style={{ fontSize: "0.75rem" }}>
                Switching role updates the specific views below for that role.
              </span>
            </Col>

            <Col xs={12} md={6}>
              <label className="form-label small fw-bold text-dark mb-1">
                <i className="bi bi-buildings text-primary me-1.5"></i> Default Plant:
              </label>
              <PlantSelector
                selectedPlant={defaultPlant}
                onSelectPlant={setDefaultPlant}
                showAllOption={currentUser?.email?.toLowerCase() === "admin@gmail.com"}
                label=""
              />
            </Col>
          </Row>
        </div>

        {/* Specific Views for this Role */}
        <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
          <div>
            <h6 className="fw-bold text-dark mb-0 text-uppercase" style={{ letterSpacing: "0.03em" }}>
              Specific Views for Role: <span className="text-primary">{SIMPLE_ROLES.find(r => r.value === selectedRole)?.label || selectedRole}</span>
            </h6>
            <span className="text-muted small">
              Enable or disable specific navigation views for this role.
            </span>
          </div>
          <span className="badge bg-primary px-3 py-1.5 font-monospace">
            {enabledViews.length} Views Active
          </span>
        </div>

        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" size="sm" className="me-2" />
            <span className="text-muted small">Loading role views...</span>
          </div>
        ) : (
          <Row className="g-2 mb-4">
            {ALL_VIEW_KEYS.map((view) => {
              const isChecked = enabledViews.includes(view.key);
              return (
                <Col xs={12} sm={6} md={4} key={view.key}>
                  <div 
                    className={`p-2.5 rounded-2 border d-flex align-items-center justify-content-between ${
                      isChecked ? "bg-white border-primary border-opacity-50 shadow-sm" : "bg-light border-light"
                    }`}
                    style={{ transition: "all 0.15s ease-in-out" }}
                  >
                    <div className="d-flex align-items-center gap-2 text-truncate pe-2">
                      <i className={`bi ${view.icon} ${isChecked ? "text-primary" : "text-muted"} fs-6`}></i>
                      <span className={`small fw-semibold ${isChecked ? "text-dark" : "text-muted"}`}>
                        {view.label}
                      </span>
                    </div>
                    <Form.Check
                      type="switch"
                      id={`switch-${view.key.replace(/\//g, "-")}`}
                      checked={isChecked}
                      onChange={() => handleToggleView(view.key)}
                    />
                  </div>
                </Col>
              );
            })}
          </Row>
        )}

        {/* Save Button */}
        <div className="d-flex justify-content-end pt-3 border-top">
          <Button 
            variant="primary" 
            className="px-4 fw-semibold shadow-sm d-flex align-items-center gap-2" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status"></span>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <i className="bi bi-save"></i>
                <span>Save & Apply View Configuration</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
