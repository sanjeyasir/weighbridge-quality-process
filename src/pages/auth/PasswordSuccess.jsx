import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button, Typography, Result } from "antd";

const { Title, Paragraph } = Typography;

export default function PasswordSuccess() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "radial-gradient(circle at 10% 20%, rgba(16, 185, 129, 0.08) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(99, 102, 241, 0.05) 0%, transparent 50%), #f8fafc",
      padding: "20px"
    }}>
      <Card 
        bordered={true} 
        style={{
          width: "100%",
          maxWidth: 440,
          borderRadius: 20,
          boxShadow: "0 12px 35px rgba(0, 0, 0, 0.06)",
          textAlign: "center",
          background: "#ffffff",
          border: "1px solid #e2e8f0"
        }}
        styles={{ body: { padding: "32px 26px" } }}
      >
        <Result
          status="success"
          title={
            <Title level={3} style={{ margin: 0, color: "#0f172a", fontWeight: 800 }}>
              Password Updated Successfully
            </Title>
          }
          subTitle={
            <Paragraph style={{ color: "#64748b", marginTop: 8, fontSize: "0.85rem" }}>
              Your account security has been verified. You can now access your operator dashboard workspace.
            </Paragraph>
          }
          extra={[
            <Button 
              type="primary" 
              key="dashboard"
              size="large"
              onClick={() => navigate("/dashboard")}
              style={{
                width: "100%",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                border: "none",
                fontWeight: 700,
                height: 46,
                borderRadius: 10,
                boxShadow: "0 6px 16px rgba(16, 185, 129, 0.28)"
              }}
            >
              Enter Dashboard Workspace
            </Button>
          ]}
        />
      </Card>
    </div>
  );
}
