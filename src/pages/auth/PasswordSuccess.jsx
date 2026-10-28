import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button } from "react-bootstrap";

export default function PasswordSuccess() {
  const navigate = useNavigate();

  return (
    <div 
      className="d-flex align-items-center justify-content-center min-vh-100 p-3"
      style={{
        backgroundColor: "#f8fafc",
        background: "radial-gradient(circle at 10% 20%, rgba(13, 110, 253, 0.08) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(99, 102, 241, 0.05) 0%, transparent 50%), #f8fafc"
      }}
    >
      <Card className="border-0 shadow-lg rounded-4 p-4 p-md-5 text-center" style={{ width: "100%", maxWidth: 440 }}>
        <div 
          className="d-inline-flex align-items-center justify-content-center text-primary bg-primary bg-opacity-10 rounded-circle mb-3 mx-auto"
          style={{ width: 64, height: 64, fontSize: "2rem" }}
        >
          <i className="bi bi-check-lg"></i>
        </div>

        <h3 className="fw-bold text-dark mb-2">Password Updated Successfully</h3>
        <p className="text-muted small mb-4">
          Your account security has been verified. You can now access your operator dashboard workspace.
        </p>

        <Button 
          variant="primary" 
          className="w-100 py-2 fw-bold rounded-3 shadow-sm"
          style={{ backgroundColor: "#0d6efd", borderColor: "#0d6efd", height: 46 }}
          onClick={() => navigate("/dashboard")}
        >
          Enter Dashboard Workspace
        </Button>
      </Card>
    </div>
  );
}
