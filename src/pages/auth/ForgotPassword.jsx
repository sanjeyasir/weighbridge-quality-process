import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Card, Form, Button, Alert, Spinner } from "react-bootstrap";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const { resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    try {
      setLoading(true);
      setError("");
      await resetPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to submit reset request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="d-flex align-items-center justify-content-center min-vh-100 p-3"
      style={{
        backgroundColor: "#f8fafc",
        background: "radial-gradient(circle at 10% 20%, rgba(13, 110, 253, 0.08) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(99, 102, 241, 0.05) 0%, transparent 50%), #f8fafc"
      }}
    >
      <Card className="border-0 shadow-lg rounded-4 p-4 p-md-5" style={{ width: "100%", maxWidth: 440 }}>
        <div className="mb-3">
          <Link to="/login" className="text-secondary small fw-bold text-decoration-none d-inline-flex align-items-center gap-1">
            <i className="bi bi-arrow-left"></i> Back to Sign In
          </Link>
        </div>

        <div className="text-center mb-4">
          <div 
            className="d-inline-flex align-items-center justify-content-center text-primary bg-primary bg-opacity-10 rounded-3 mb-3"
            style={{ width: 50, height: 50, fontSize: "1.4rem" }}
          >
            <i className="bi bi-key-fill"></i>
          </div>
          <h4 className="fw-bold text-dark mb-1">Reset Password</h4>
          <p className="text-muted small mb-0">
            Enter your registered email. Your Administrator will approve and reset your password to <code>welcome123</code>.
          </p>
        </div>

        {error && (
          <Alert variant="danger" className="py-2 px-3 small rounded-3 mb-3">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
          </Alert>
        )}

        {success ? (
          <Alert variant="success" className="py-3 px-3 rounded-3 mb-3">
            <div className="fw-bold mb-1">Request Registered Successfully</div>
            <div className="small">Your password reset request has been logged. Please notify your Administrator to approve it from the User Management console.</div>
          </Alert>
        ) : (
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-4">
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
                  Submitting Request...
                </>
              ) : (
                "Send Reset Request"
              )}
            </Button>
          </Form>
        )}
      </Card>
    </div>
  );
}
