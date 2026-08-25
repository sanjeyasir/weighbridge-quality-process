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
      background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
      padding: "20px"
    }}>
      <Card 
        bordered={false} 
        style={{
          width: "100%",
          maxWidth: 440,
          borderRadius: 16,
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
          textAlign: "center",
          background: "#ffffff"
        }}
      >
        <Result
          status="success"
          title={
            <Title level={3} style={{ margin: 0, color: "#0f172a", fontWeight: 800 }}>
              Password Changed Successfully!
            </Title>
          }
          subTitle={
            <Paragraph style={{ color: "#64748b", marginTop: 8, fontSize: "14px" }}>
              Your account security has been updated. Your temporary password is no longer active. You can now access your dashboard workspace.
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
                height: 48,
                borderRadius: 8
              }}
            >
              Go to Dashboard
            </Button>
          ]}
        />
      </Card>
    </div>
  );
}
