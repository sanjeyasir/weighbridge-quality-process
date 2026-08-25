import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Form, Input, Button, Card, Typography, Alert, Spin } from "antd";
import { MailOutlined, ArrowLeftOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const { resetPassword } = useAuth();

  const onFinish = async (values) => {
    const { email } = values;
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
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      background: "radial-gradient(circle at 10% 20%, rgba(16, 185, 129, 0.08) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(99, 102, 241, 0.05) 0%, transparent 50%), #f8fafc",
      padding: "24px"
    }}>
      <Card 
        bordered={true}
        style={{ 
          width: "100%", 
          maxWidth: 450, 
          borderRadius: 20, 
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)",
          background: "#ffffff",
          border: "1px solid #e2e8f0"
        }}
        styles={{ body: { padding: "40px 32px" } }}
      >
        <Spin spinning={loading} size="large" tip="Submitting Request...">
          <div style={{ marginBottom: 24 }}>
            <Link to="/login" style={{ color: "#64748b", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
              <ArrowLeftOutlined /> Back to Login
            </Link>
          </div>

          <div style={{ marginBottom: 28 }}>
            <Title level={3} style={{ margin: 0, fontWeight: 800, color: "#0f172a" }}>
              Reset Password
            </Title>
            <Text type="secondary">
              Enter your email and the administrator will reset your password to 'welcome123'.
            </Text>
          </div>

          {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 20 }} />}
          {success && (
            <Alert 
              message="Request Submitted" 
              description="Your password reset request has been logged. Please contact your Administrator to approve it." 
              type="success" 
              showIcon 
              style={{ marginBottom: 20 }} 
            />
          )}

          {!success && (
            <Form
              layout="vertical"
              requiredMark={false}
              onFinish={onFinish}
            >
              <Form.Item
                name="email"
                label={<span style={{ color: "#475569", fontWeight: 600 }}>Email Address</span>}
                rules={[
                  { required: true, message: "Please enter your email address." },
                  { type: "email", message: "Please enter a valid email address." }
                ]}
              >
                <Input 
                  prefix={<MailOutlined style={{ color: "rgba(0,0,0,0.4)" }} />} 
                  placeholder="user@example.com" 
                  size="large"
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  size="large" 
                  block
                  style={{ 
                    height: 48, 
                    borderRadius: 8, 
                    fontWeight: 700, 
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    border: "none",
                    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)"
                  }}
                >
                  Send Reset Request
                </Button>
              </Form.Item>
            </Form>
          )}
        </Spin>
      </Card>
    </div>
  );
}
