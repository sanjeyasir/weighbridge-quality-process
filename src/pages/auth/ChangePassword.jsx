import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { updateUserPassword } from "../../services/firebase/authService";
import { Card, Form, Button, Alert, Spinner } from "react-bootstrap";

export default function ChangePassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { logout, updateLocalProfile } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError("Please fill in both password fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await updateUserPassword(password);
      updateLocalProfile({ requirePasswordChange: false });
      navigate("/password-success");
    } catch (err) {
      setError(err.message || "Failed to update password. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div 
      className="d-flex align-items-center justify-content-center min-vh-100 p-3"
      style={{
        backgroundColor: "#f8fafc",
        background: "radial-gradient(circle at 10% 20%, rgba(16, 185, 129, 0.08) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(99, 102, 241, 0.05) 0%, transparent 50%), #f8fafc"
      }}
    >
      <Card className="border-0 shadow-lg rounded-4 p-4 p-md-5" style={{ width: "100%", maxWidth: 440 }}>
        <div className="text-center mb-4">
          <div 
            className="d-inline-flex align-items-center justify-content-center text-warning bg-warning bg-opacity-10 rounded-3 mb-3"
            style={{ width: 52, height: 52, fontSize: "1.5rem" }}
          >
            <i className="bi bi-shield-lock-fill"></i>
          </div>
          <h4 className="fw-bold text-dark mb-1">Set New Password</h4>
          <p className="text-muted small mb-0">
            Your operator account requires establishing a secure personal password.
          </p>
        </div>

        {error && (
          <Alert variant="danger" className="py-2 px-3 small rounded-3 mb-3">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label className="small fw-bold text-secondary">New Password</Form.Label>
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0 text-muted">
                <i className="bi bi-lock"></i>
              </span>
              <Form.Control
                type="password"
                placeholder="Enter minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-light border-start-0 py-2 fs-7"
                required
              />
            </div>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="small fw-bold text-secondary">Confirm New Password</Form.Label>
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0 text-muted">
                <i className="bi bi-lock-fill"></i>
              </span>
              <Form.Control
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-light border-start-0 py-2 fs-7"
                required
              />
            </div>
          </Form.Group>

          <Button 
            type="submit" 
            variant="primary" 
            className="w-100 py-2 fw-bold rounded-3 shadow-sm mb-2"
            style={{ backgroundColor: "#0d6efd", borderColor: "#0d6efd", height: 46 }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Updating Password...
              </>
            ) : (
              "Update & Enter Dashboard"
            )}
          </Button>

          <Button 
            variant="link" 
            className="w-100 text-muted text-decoration-none small fw-semibold"
            onClick={logout}
          >
            Cancel & Sign Out
          </Button>
        </Form>
      </Card>
    </div>
  );
}
