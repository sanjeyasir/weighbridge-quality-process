import React, { useEffect, useState } from "react";
import { 
  getAllUsers, 
  updateUserStatus, 
  createUser 
} from "../../services/firebase/userService";
import { 
  getPendingPasswordResets, 
  approvePasswordReset 
} from "../../services/firebase/authService";
import { toast } from "../../utils/toast";
import { Card, Table, Nav, Badge, Button, Modal, Form, Alert, Spinner } from "react-bootstrap";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [resets, setResets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("operators");
  const [openUserModal, setOpenUserModal] = useState(false);

  // New User Form State
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("requester");
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
    if (!displayName || !email || !password || !role) {
      setErrorMsg("Please fill in all user fields.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");
      await createUser({
        displayName,
        email,
        password,
        role
      });
      toast.success("User registered successfully!");
      setOpenUserModal(false);
      setDisplayName("");
      setEmail("");
      setPassword("welcome123");
      setRole("requester");
      loadData();
    } catch (err) {
      setErrorMsg(err.message || "Failed to register user account.");
    } finally {
      setSubmitting(false);
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
      case "requester": return "Requester Team";
      case "quality": return "Quality Team";
      case "finance": return "Finance Team";
      default: return role;
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      {/* Header */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
        <div>
          <h3 className="fw-bold text-dark mb-1">User Account Management</h3>
          <p className="text-muted small mb-0">
            Manage operators, assign system privileges, and authorize password reset requests.
          </p>
        </div>

        <Button 
          variant="primary" 
          className="d-flex align-items-center gap-2 fw-bold px-3 py-2 rounded-3 shadow-sm"
          style={{ backgroundColor: "#0d6efd", borderColor: "#0d6efd" }}
          onClick={() => setOpenUserModal(true)}
        >
          <i className="bi bi-person-plus-fill fs-6"></i>
          <span>Register Operator</span>
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
                Active Operators <span className="badge bg-light text-dark ms-1">{users.length}</span>
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
                    <th className="ps-3">Operator</th>
                    <th>Email Address</th>
                    <th>Assigned Role</th>
                    <th>Access Status</th>
                    <th className="text-end pe-3">Toggle Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">
                        <div className="spinner-border spinner-border-sm text-success me-2" role="status"></div>
                        Loading operators...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">
                        No operators registered yet.
                      </td>
                    </tr>
                  ) : (
                    users.map(u => (
                      <tr key={u.uid}>
                        <td className="ps-3">
                          <div className="d-flex align-items-center gap-2">
                            <div 
                              className="rounded-circle bg-success text-white fw-bold d-flex align-items-center justify-content-center flex-shrink-0"
                              style={{ width: 34, height: 34, fontSize: "0.85rem" }}
                            >
                              {u.displayName ? u.displayName[0].toUpperCase() : "U"}
                            </div>
                            <span className="fw-bold text-dark">{u.displayName}</span>
                          </div>
                        </td>
                        <td>
                          <span className="text-secondary">{u.email}</span>
                        </td>
                        <td>
                          <span className={`badge bg-${getRoleBadgeVariant(u.role)} text-uppercase fw-bold fs-8`}>
                            {getRoleLabel(u.role)}
                          </span>
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
                          {u.email === "admin@gmail.com" ? (
                            <span className="badge bg-light text-muted border">System Admin</span>
                          ) : (
                            <Button 
                              variant={u.status === "active" ? "outline-danger" : "outline-success"} 
                              size="sm" 
                              className="py-1 px-2 fs-8"
                              onClick={() => handleStatusChange(u.uid, u.status)}
                            >
                              {u.status === "active" ? "Deactivate" : "Activate"}
                            </Button>
                          )}
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

      {/* Modal: Register Operator Account */}
      <Modal show={openUserModal} onHide={() => setOpenUserModal(false)} centered>
        <Modal.Header closeButton className="border-bottom py-3">
          <Modal.Title className="fw-bold fs-6 d-flex align-items-center gap-2">
            <i className="bi bi-person-plus text-success fs-5"></i> Register Operator Account
          </Modal.Title>
        </Modal.Header>

        <Form onSubmit={handleCreateUser}>
          <Modal.Body className="p-4">
            {errorMsg && (
              <Alert variant="danger" className="py-2 px-3 small rounded-3 mb-3">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>{errorMsg}
              </Alert>
            )}

            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold text-secondary">Full Name *</Form.Label>
              <Form.Control 
                type="text" 
                placeholder="e.g. John Requester" 
                value={displayName} 
                onChange={(e) => setDisplayName(e.target.value)} 
                required 
                className="py-2 fs-7"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold text-secondary">Email Address *</Form.Label>
              <Form.Control 
                type="email" 
                placeholder="operator@hayleys.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="py-2 fs-7"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold text-secondary">System Privileges (Role) *</Form.Label>
              <Form.Select 
                value={role} 
                onChange={(e) => setRole(e.target.value)} 
                required 
                className="py-2 fs-7"
              >
                <option value="requester">Requester Team (Create & View Requisitions)</option>
                <option value="quality">Quality Team (Lab Sample Evaluation & Entry)</option>
                <option value="finance">Finance Team (Billing Deductions & Disbursement)</option>
                <option value="admin">Administrator (Full Access & User Accounts)</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-2">
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
                Operator will be required to change password on first login.
              </Form.Text>
            </Form.Group>
          </Modal.Body>

          <Modal.Footer className="border-top py-2">
            <Button variant="light" size="sm" onClick={() => setOpenUserModal(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              size="sm" 
              disabled={submitting}
              className="fw-bold px-3"
              style={{ backgroundColor: "#0d6efd", borderColor: "#0d6efd" }}
            >
              {submitting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Registering...
                </>
              ) : (
                "Register Operator"
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
