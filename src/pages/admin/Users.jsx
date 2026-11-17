import React, { useEffect, useState } from "react";
import { 
  getAllUsers, 
  updateUserStatus, 
  createUser,
  updateUserAccount,
  ROLE_CONFIG_MAP,
  ROLE_PROFILES,
  getRoleViews
} from "../../services/firebase/userService";
import { 
  getPendingPasswordResets, 
  approvePasswordReset 
} from "../../services/firebase/authService";
import { subscribeToPlants } from "../../services/firebase/plantService";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "../../utils/toast";
import { Card, Table, Nav, Badge, Button, Modal, Form, Alert, Spinner } from "react-bootstrap";

export const ROLE_CONFIG_OPTIONS = [
  { value: "admin", label: "Admin", configKey: "ALL", badgeVariant: "danger" },
  { value: "requester", label: "Requester", configKey: "REQUESTER", badgeVariant: "primary" },
  { value: "quality", label: "Quality", configKey: "QUALITY", badgeVariant: "purple" },
  { value: "finance_officer", label: "Finance Officer", configKey: "FINANCE_OFFICER", badgeVariant: "info" },
  { value: "finance_manager", label: "Finance Manager", configKey: "FINANCE_MANAGER", badgeVariant: "success" }
];

export default function Users() {
  const { currentUser } = useAuth() || {};
  const [users, setUsers] = useState([]);
  const [resets, setResets] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("operators");
  const [openUserModal, setOpenUserModal] = useState(false);

  // Edit User & Role Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [editRole, setEditRole] = useState("requester");
  const [editPlantId, setEditPlantId] = useState("HES-1");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [updating, setUpdating] = useState(false);

  // New User Form State
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("requester");
  const [plantId, setPlantId] = useState("HES-1");
  const [password, setPassword] = useState("welcome123");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const userList = await getAllUsers();
      const resetList = await getPendingPasswordResets();
      setUsers(userList);
      setResets(resetList);
    } catch (err) {
      toast.error("Failed to load user management details.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubPlants = subscribeToPlants((list) => {
      setPlants(list);
      if (list.length > 0 && !plantId) {
        setPlantId((list[0].plant_code || list[0].id).toUpperCase());
      }
    });
    return () => {
      if (typeof unsubPlants === "function") unsubPlants();
    };
  }, []);

  const handleStatusChange = async (uid, currentStatus) => {
    const nextStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      await updateUserStatus(uid, nextStatus);
      toast.success(`User marked as ${nextStatus}.`);
      loadData();
    } catch (err) {
      toast.error("Failed to update status.");
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!displayName || !email || !password || !role || !plantId) {
      setErrorMsg("Please fill in all user fields including assigned plant and role configuration.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");
      const matchedPlant = plants.find(p => (p.plant_code || p.id).toUpperCase() === plantId.toUpperCase());
      const plantName = matchedPlant?.plant_name || `Plant ${plantId.toUpperCase()}`;
      const roleConfig = ROLE_CONFIG_MAP[role] || "ALL";

      await createUser({
        displayName,
        email,
        password,
        role,
        roleConfig,
        plantId: plantId.toUpperCase(),
        plantName
      });
      toast.success("Employee registered successfully with assigned role configuration and plant!");
      setOpenUserModal(false);
      setDisplayName("");
      setEmail("");
      setPassword("welcome123");
      setRole("requester");
      setPlantId(plants.length > 0 ? (plants[0].plant_code || plants[0].id).toUpperCase() : "HES-1");
      loadData();
    } catch (err) {
      setErrorMsg(err.message || "Failed to register user account.");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setEditDisplayName(u.displayName || "");
    setEditRole(u.role || "requester");
    setEditPlantId(u.plantId || "HES-1");
    setEditStatus(u.status || "active");
  };

  const handleSaveUserEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setUpdating(true);
      const isTargetSuperAdmin = editingUser.email?.toLowerCase() === "admin@gmail.com";
      const finalRole = isTargetSuperAdmin ? "admin" : editRole;
      const finalRoleConfig = isTargetSuperAdmin ? "ALL" : (ROLE_CONFIG_MAP[finalRole] || "ALL");
      const enabledViews = getRoleViews(finalRole);
      const finalStatus = isTargetSuperAdmin ? "active" : editStatus;

      const matchedPlant = plants.find(p => (p.plant_code || p.id).toUpperCase() === editPlantId.toUpperCase());
      const plantName = matchedPlant?.plant_name || `Plant ${editPlantId.toUpperCase()}`;

      await updateUserAccount(editingUser.uid, {
        displayName: editDisplayName.trim(),
        role: finalRole,
        roleConfig: finalRoleConfig,
        enabledViews,
        plantId: editPlantId.toUpperCase(),
        plantName,
        status: finalStatus
      });

      // If updating the currently logged-in user, immediately update local view config
      if (currentUser?.uid === editingUser.uid) {
        localStorage.setItem("user_view_config", JSON.stringify({
          uid: editingUser.uid,
          activeProfile: finalRoleConfig,
          enabledViews,
          defaultPlant: editPlantId.toUpperCase()
        }));
        window.dispatchEvent(new Event("user_view_config_changed"));
      }

      toast.success(`Account details and role configuration for ${editDisplayName} updated successfully!`);
      setEditingUser(null);
      loadData();
    } catch (err) {
      toast.error("Failed to update user account.");
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  // Quick inline role change handler
  const handleQuickRoleChange = async (uid, newRole) => {
    try {
      const targetUser = users.find(u => u.uid === uid);
      if (targetUser?.email?.toLowerCase() === "admin@gmail.com") {
        toast.error("admin@gmail.com must always have the Admin role and cannot be changed.");
        return;
      }

      const roleConfig = ROLE_CONFIG_MAP[newRole] || "ALL";
      const enabledViews = getRoleViews(newRole);
      await updateUserAccount(uid, { role: newRole, roleConfig, enabledViews });

      // If updating the currently logged-in user, immediately update local view config
      if (currentUser?.uid === uid) {
        localStorage.setItem("user_view_config", JSON.stringify({
          uid,
          activeProfile: roleConfig,
          enabledViews,
          defaultPlant: currentUser.plantId || "HES-1"
        }));
        window.dispatchEvent(new Event("user_view_config_changed"));
      }

      toast.success(`Role configuration updated to ${newRole}. Navigation views updated!`);
      loadData();
    } catch (err) {
      toast.error("Failed to update role configuration.");
    }
  };

  const handleApproveReset = async (requestId) => {
    try {
      await approvePasswordReset(requestId);
      toast.success("Password reset approved. Temporary password set to 'welcome123'.");
      loadData();
    } catch (err) {
      toast.error("Failed to approve password reset.");
    }
  };

  const getRoleBadgeVariant = (r) => {
    switch (r) {
      case "admin": return "danger";
      case "requester": return "primary";
      case "quality": return "purple";
      case "finance_officer": return "info";
      case "finance": return "info";
      case "finance_manager": return "success";
      default: return "secondary";
    }
  };

  const getRoleLabel = (r) => {
    const found = ROLE_CONFIG_OPTIONS.find(o => o.value === r);
    if (found) return found.label.split("(")[0].trim();
    if (r === "finance") return "Finance Officer";
    return r || "Operator";
  };

  return (
    <div className="d-flex flex-column gap-4">
      {/* Header */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
        <div>
          <h3 className="fw-bold text-dark mb-1">User Account & Role-Based Configuration</h3>
          <p className="text-muted small mb-0">
            Configure employee roles, plant assignments, and system privilege profiles with real-time editing.
          </p>
        </div>

        <Button 
          variant="primary" 
          className="d-flex align-items-center gap-2 fw-bold px-3 py-2 rounded-3 shadow-sm"
          style={{ backgroundColor: "#0d6efd", borderColor: "#0d6efd" }}
          onClick={() => setOpenUserModal(true)}
        >
          <i className="bi bi-person-plus-fill fs-6"></i>
          <span>Register Employee</span>
        </Button>
      </div>

      <Card className="border-0 shadow-sm rounded-4 bg-white overflow-hidden">
        <Card.Body className="p-3 p-md-4">
          {/* Nav Tabs */}
          <Nav variant="pills" className="gap-2 mb-3 border-bottom pb-3">
            <Nav.Item>
              <Nav.Link 
                active={activeTab === "operators"} 
                onClick={() => setActiveTab("operators")}
                className="py-1 px-3 small fw-semibold cursor-pointer rounded-pill"
              >
                Registered Accounts <span className="badge bg-light text-dark ms-1">{users.length}</span>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link 
                active={activeTab === "resets"} 
                onClick={() => setActiveTab("resets")}
                className="py-1 px-3 small fw-semibold cursor-pointer rounded-pill"
              >
                Pending Resets <span className={`badge ms-1 ${resets.length > 0 ? "bg-danger" : "bg-light text-dark"}`}>{resets.length}</span>
              </Nav.Link>
            </Nav.Item>
          </Nav>

          {activeTab === "operators" ? (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0 text-nowrap" style={{ fontSize: "0.875rem" }}>
                <thead className="table-light text-muted text-uppercase fs-8 fw-bold">
                  <tr>
                    <th className="ps-3">Employee Name</th>
                    <th>Email Address</th>
                    <th>Role-Based Configuration (Editable)</th>
                    <th>Assigned Plant</th>
                    <th>Access Status</th>
                    <th className="text-end pe-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="text-center py-4 text-muted">
                        <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                        Loading employee accounts...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-4 text-muted">
                        No employees registered yet.
                      </td>
                    </tr>
                  ) : (
                    users.map(u => (
                      <tr key={u.uid}>
                        <td className="ps-3">
                          <div className="d-flex align-items-center gap-2">
                            <div 
                              className="rounded-circle bg-primary text-white fw-bold d-flex align-items-center justify-content-center flex-shrink-0"
                              style={{ width: 34, height: 34, fontSize: "0.85rem" }}
                            >
                              {u.displayName ? u.displayName[0].toUpperCase() : "U"}
                            </div>
                            <div>
                              <div className="fw-bold text-dark">{u.displayName}</div>
                              <span className="text-muted fs-8">{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="text-secondary font-monospace small">{u.email}</span>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            {u.email?.toLowerCase() === "admin@gmail.com" ? (
                              <span className="badge bg-danger px-2.5 py-1.5 font-monospace fw-bold">
                                <i className="bi bi-shield-lock-fill me-1"></i> Admin (Permanent)
                              </span>
                            ) : (
                              <Form.Select
                                size="sm"
                                value={u.role || "requester"}
                                onChange={(e) => handleQuickRoleChange(u.uid, e.target.value)}
                                className={`form-select-sm fw-bold border-${getRoleBadgeVariant(u.role)} shadow-none`}
                                style={{ width: 225, fontSize: "0.8rem" }}
                              >
                                {ROLE_CONFIG_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </Form.Select>
                            )}
                          </div>
                        </td>
                        <td>
                          {u.email === "admin@gmail.com" ? (
                            <span className="badge bg-primary text-white font-monospace">🌐 All Plants (Global)</span>
                          ) : (
                            <span className="badge bg-secondary-subtle text-dark font-monospace fw-bold">
                              Plant {u.plantId || "HES-1"}
                            </span>
                          )}
                        </td>
                        <td>
                          {u.status === "active" ? (
                            <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1">
                              Active
                            </span>
                          ) : (
                            <span className="badge bg-secondary bg-opacity-10 text-secondary border px-2 py-1">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="text-end pe-3">
                          <div className="d-flex align-items-center justify-content-end gap-1.5">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="py-1 px-2.5 fs-8 fw-semibold"
                              onClick={() => openEditModal(u)}
                            >
                              <i className="bi bi-pencil-square me-1"></i> Edit
                            </Button>
                            {u.email !== "admin@gmail.com" && (
                              <Button 
                                variant={u.status === "active" ? "outline-danger" : "outline-success"} 
                                size="sm" 
                                className="py-1 px-2 fs-8"
                                onClick={() => handleStatusChange(u.uid, u.status)}
                              >
                                {u.status === "active" ? "Deactivate" : "Activate"}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0 text-nowrap" style={{ fontSize: "0.875rem" }}>
                <thead className="table-light text-muted text-uppercase fs-8 fw-bold">
                  <tr>
                    <th className="ps-3">User & Email</th>
                    <th>Request Timestamp</th>
                    <th className="text-end pe-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="3" className="text-center py-4 text-muted">
                        <div className="spinner-border spinner-border-sm text-success me-2" role="status"></div>
                        Loading reset requests...
                      </td>
                    </tr>
                  ) : resets.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="text-center py-4 text-muted">
                        No pending password reset requests.
                      </td>
                    </tr>
                  ) : (
                    resets.map(r => (
                      <tr key={r.id}>
                        <td className="ps-3">
                          <div className="fw-bold text-dark">{r.name}</div>
                          <div className="text-muted small">{r.email}</div>
                        </td>
                        <td>
                          <span className="text-muted small">
                            {r.requestedAt ? new Date(r.requestedAt).toLocaleString() : "-"}
                          </span>
                        </td>
                        <td className="text-end pe-3">
                          <Button 
                            variant="primary" 
                            size="sm" 
                            className="fw-bold"
                            style={{ backgroundColor: "#0d6efd", borderColor: "#0d6efd" }}
                            onClick={() => handleApproveReset(r.id)}
                          >
                            <i className="bi bi-check-circle me-1"></i> Approve (Reset to welcome123)
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Modal: Register Employee Account with Role Select & Plant Select */}
      <Modal show={openUserModal} onHide={() => setOpenUserModal(false)} centered size="lg">
        <Modal.Header closeButton className="border-bottom py-3">
          <Modal.Title className="fw-bold fs-6 d-flex align-items-center gap-2">
            <i className="bi bi-person-plus text-primary fs-5"></i> Register Employee & Role Configuration
          </Modal.Title>
        </Modal.Header>

        <Form onSubmit={handleCreateUser}>
          <Modal.Body className="p-4">
            {errorMsg && (
              <Alert variant="danger" className="py-2 px-3 small rounded-3 mb-3">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>{errorMsg}
              </Alert>
            )}

            <div className="row g-3 mb-3">
              <div className="col-12 col-md-6">
                <Form.Group>
                  <Form.Label className="small fw-bold text-secondary">Full Name *</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="e.g. Ruwan Perera" 
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)} 
                    required 
                    className="py-2 fs-7"
                  />
                </Form.Group>
              </div>

              <div className="col-12 col-md-6">
                <Form.Group>
                  <Form.Label className="small fw-bold text-secondary">Email Address *</Form.Label>
                  <Form.Control 
                    type="email" 
                    placeholder="ruwan@hayleys.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    className="py-2 fs-7"
                  />
                </Form.Group>
              </div>
            </div>

            {/* Role Select Option */}
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold text-secondary">
                <i className="bi bi-shield-lock me-1 text-primary"></i> Role *
              </Form.Label>
              <Form.Select 
                value={role} 
                onChange={(e) => setRole(e.target.value)} 
                required 
                className="py-2 fs-7 fw-semibold border-primary"
              >
                {ROLE_CONFIG_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <div className="row g-3 mb-3">
              {/* Single Select Plant Dropdown */}
              <div className="col-12 col-md-6">
                <Form.Group>
                  <Form.Label className="small fw-bold text-secondary">
                    <i className="bi bi-buildings me-1 text-primary"></i> Assigned Plant (Single Select) *
                  </Form.Label>
                  <Form.Select 
                    value={plantId} 
                    onChange={(e) => setPlantId(e.target.value)} 
                    required 
                    className="py-2 fs-7 fw-semibold"
                  >
                    {plants.length === 0 ? (
                      <>
                        <option value="HES-1">Plant HES-1 — Hayleys Eco Solutions Plant 1</option>
                        <option value="HES-2">Plant HES-2 — Hayleys Eco Solutions Plant 2</option>
                      </>
                    ) : (
                      plants.map(p => {
                        const code = (p.plant_code || p.id).toUpperCase();
                        return (
                          <option key={code} value={code}>
                            Plant {code} — {p.plant_name || `Plant ${code}`}
                          </option>
                        );
                      })
                    )}
                  </Form.Select>
                </Form.Group>
              </div>

              {/* Temporary Password */}
              <div className="col-12 col-md-6">
                <Form.Group>
                  <Form.Label className="small fw-bold text-secondary">Temporary Password *</Form.Label>
                  <Form.Control 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    minLength={6}
                    className="py-2 fs-7"
                  />
                  <Form.Text className="text-muted fs-8">
                    Operator must reset on first login.
                  </Form.Text>
                </Form.Group>
              </div>
            </div>
          </Modal.Body>

          <Modal.Footer className="border-top py-2.5">
            <Button variant="light" size="sm" onClick={() => setOpenUserModal(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              size="sm" 
              disabled={submitting}
              className="fw-bold px-3 shadow-sm"
              style={{ backgroundColor: "#0d6efd", borderColor: "#0d6efd" }}
            >
              {submitting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Registering...
                </>
              ) : (
                "Register Employee Account"
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal: Edit User Role & Account Configuration */}
      {editingUser && (
        <Modal show={true} onHide={() => setEditingUser(null)} centered size="lg">
          <Modal.Header closeButton className="py-3 border-bottom">
            <Modal.Title className="fw-bold fs-6 d-flex align-items-center gap-2">
              <i className="bi bi-pencil-square text-primary"></i> Edit Account & Role-Based Configuration
            </Modal.Title>
          </Modal.Header>

          <Form onSubmit={handleSaveUserEdit}>
            <Modal.Body className="p-4">
              <div className="p-3 bg-light rounded-3 border mb-3">
                <div className="d-flex align-items-center gap-2">
                  <div 
                    className="rounded-circle bg-primary text-white fw-bold d-flex align-items-center justify-content-center"
                    style={{ width: 36, height: 36, fontSize: "0.9rem" }}
                  >
                    {editingUser.displayName ? editingUser.displayName[0].toUpperCase() : "U"}
                  </div>
                  <div>
                    <div className="fw-bold text-dark">{editingUser.displayName}</div>
                    <div className="text-muted small">{editingUser.email}</div>
                  </div>
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-12 col-md-6">
                  <Form.Group>
                    <Form.Label className="small fw-bold text-secondary">Full Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      required
                      className="py-2 fs-7"
                    />
                  </Form.Group>
                </div>

                <div className="col-12 col-md-6">
                  <Form.Group>
                    <Form.Label className="small fw-bold text-secondary">Account Access Status</Form.Label>
                    {editingUser?.email?.toLowerCase() === "admin@gmail.com" ? (
                      <Form.Control
                        type="text"
                        value="Active (Permanent Super Admin)"
                        disabled
                        className="py-2 fs-7 fw-bold text-success bg-light"
                      />
                    ) : (
                      <Form.Select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="py-2 fs-7"
                      >
                        <option value="active">Active (Access Allowed)</option>
                        <option value="inactive">Inactive (Access Suspended)</option>
                      </Form.Select>
                    )}
                  </Form.Group>
                </div>
              </div>

              {/* Role Select Option */}
              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold text-secondary">
                  <i className="bi bi-shield-lock me-1 text-primary"></i> Role *
                </Form.Label>
                {editingUser?.email?.toLowerCase() === "admin@gmail.com" ? (
                  <div>
                    <Form.Control
                      type="text"
                      value="Admin (Permanent Super Administrator)"
                      disabled
                      className="py-2 fs-7 fw-bold text-danger bg-light border-danger"
                    />
                    <Form.Text className="text-danger small">
                      <i className="bi bi-shield-lock-fill me-1"></i>
                      admin@gmail.com must always have the Admin role and cannot be changed.
                    </Form.Text>
                  </div>
                ) : (
                  <Form.Select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="py-2 fs-7 fw-bold border-primary"
                  >
                    {ROLE_CONFIG_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Form.Select>
                )}
              </Form.Group>

              {/* Assigned Plant (Single Select) */}
              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold text-secondary">
                  <i className="bi bi-buildings me-1 text-primary"></i> Assigned Plant (Single Select) *
                </Form.Label>
                <Form.Select
                  value={editPlantId}
                  onChange={(e) => setEditPlantId(e.target.value)}
                  className="py-2 fs-7 fw-semibold"
                >
                  {plants.length === 0 ? (
                    <>
                      <option value="HES-1">Plant HES-1</option>
                      <option value="HES-2">Plant HES-2</option>
                    </>
                  ) : (
                    plants.map(p => {
                      const code = (p.plant_code || p.id).toUpperCase();
                      return (
                        <option key={code} value={code}>
                          Plant {code} — {p.plant_name || `Plant ${code}`}
                        </option>
                      );
                    })
                  )}
                </Form.Select>
                <Form.Text className="text-muted fs-8">
                  User will strictly be restricted to view records for this plant (multi-plant dropdown remains exclusive to admin@gmail.com).
                </Form.Text>
              </Form.Group>
            </Modal.Body>

            <Modal.Footer className="py-2.5 border-top">
              <Button variant="light" size="sm" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="primary" 
                size="sm" 
                disabled={updating}
                className="fw-bold px-3 shadow-sm"
              >
                {updating ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-1.5" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg me-1"></i> Save Changes
                  </>
                )}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      )}
    </div>
  );
}
