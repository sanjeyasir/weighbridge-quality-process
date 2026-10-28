import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Card, Form, Button, Alert, Spinner } from "react-bootstrap";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    logout().catch(err => console.error("Session clear error:", err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in both your email address and password.");
      return;
    }

    try {
      setError("");
      setLoading(true);
      const userProfile = await login(email, password);
      if (userProfile && userProfile.requirePasswordChange) {
        navigate("/change-password");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      let errMsg = err.message || "";
      if (errMsg.includes("user-not-found") || errMsg.includes("User not found")) {
        errMsg = "No account found with this email address.";
      } else if (errMsg.includes("wrong-password") || errMsg.includes("password you entered is incorrect") || errMsg.includes("Incorrect password")) {
        errMsg = "Incorrect password. Please check your credentials.";
      } else if (errMsg.includes("user-disabled") || errMsg.includes("deactivated")) {
        errMsg = "This user account has been deactivated by an Administrator.";
      } else {
        errMsg = errMsg.replace(/^Error:\s*/, "") || "Login failed. Please check your credentials and try again.";
      }
      setError(errMsg);
      setLoading(false);
    }
  };

  return (
    <div 
      className="d-flex align-items-center justify-content-center min-vh-100 p-3 position-relative"
      style={{
        backgroundColor: "#f8fafc",
        background: "radial-gradient(circle at 10% 20%, rgba(13, 110, 253, 0.09) 0%, transparent 45%), radial-gradient(circle at 90% 80%, rgba(99, 102, 241, 0.07) 0%, transparent 50%), #f8fafc",
        overflow: "hidden"
      }}
    >
      <Card 
        className="border-0 shadow-lg rounded-4 p-4 p-md-5"
        style={{ width: "100%", maxWidth: 440, zIndex: 1, backgroundColor: "#ffffff" }}
      >
        <div className="text-center mb-4">
          <div 
            className="d-inline-flex align-items-center justify-content-center text-white rounded-3 shadow-sm mb-3"
            style={{
              width: 54,
              height: 54,
              background: "linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)",
              fontSize: "1.6rem"
            }}
          >
            <i className="bi bi-buildings-fill"></i>
          </div>
          <h3 className="fw-bold text-dark mb-1">Weighbridge Hub</h3>
          <p className="text-muted small mb-0">Quality Assurance & Raw Material Billing Control</p>
        </div>

        {error && (
          <Alert variant="danger" className="d-flex align-items-center gap-2 py-2 px-3 small rounded-3 mb-3">
            <i className="bi bi-exclamation-triangle-fill fs-6 text-danger"></i>
            <div>{error}</div>
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label className="small fw-bold text-secondary">Email Address</Form.Label>
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0 text-muted">
                <i className="bi bi-envelope"></i>
              </span>
              <Form.Control
                type="email"
                placeholder="operator@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-light border-start-0 py-2 fs-7"
                required
              />
            </div>
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label className="small fw-bold text-secondary">Password</Form.Label>
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0 text-muted">
                <i className="bi bi-lock"></i>
              </span>
              <Form.Control
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-light border-start-0 py-2 fs-7"
                required
              />
            </div>
          </Form.Group>

          <div className="d-flex justify-content-end mb-4">
            <Link to="/forgot-password" className="text-primary small fw-bold text-decoration-none">
              Forgot Password?
            </Link>
          </div>

          <Button 
            type="submit" 
            variant="primary" 
            className="w-100 py-2 fw-bold rounded-3 shadow-sm"
            style={{ backgroundColor: "#0d6efd", borderColor: "#0d6efd", height: 46 }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Authenticating...
              </>
            ) : (
              "Sign In to Workspace"
            )}
          </Button>
        </Form>

        <div className="text-center mt-3 pt-3 border-top">
          <Link 
            to="/api-docs" 
            className="text-muted small fw-semibold text-decoration-none d-inline-flex align-items-center gap-1"
          >
            <i className="bi bi-file-earmark-code text-primary"></i>
            <span>Weighbridge REST API Docs</span>
          </Link>
        </div>
      </Card>
    </div>
  );
}
