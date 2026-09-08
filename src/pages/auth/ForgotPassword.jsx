import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Form, Input, Button, Card, Typography, Alert, Spin } from "antd";
import { MailOutlined, ArrowLeftOutlined, KeyOutlined } from "@ant-design/icons";

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
      padding: "20px"
    }}>
      <Card 
        bordered={true}
        style={{ 
          width: "100%", 
          maxWidth: 440, 
          borderRadius: 20, 
          boxShadow: "0 12px 35px rgba(0, 0, 0, 0.06)",
          background: "#ffffff",
          border: "1px solid #e2e8f0"
        }}
        styles={{ body: { padding: "32px 26px" } }}
      >
        <Spin spinning={loading} size="large" tip="Submitting Request...">
          <div style={{ marginBottom: 20 }}>
            <Link to="/login" style={{ color: "#64748b", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: "0.85rem" }}>
              <ArrowLeftOutlined /> Back to Sign In
            </Link>
          </div>

          <div style={{ marginBottom: 24, textAlign: "center" }}>
            <div style={{
              background: "rgba(16, 185, 129, 0.1)",
              color: "#10b981",
              borderRadius: "14px",
              width: 50,
              height: 50,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              marginBottom: 10
            }}>
              <KeyOutlined />
            </div>
            <Title level={3} style={{ margin: 0, fontWeight: 800, color: "#0f172a" }}>
              Reset Password
            </Title>
            <Text type="secondary" style={{ fontSize: "0.82rem", marginTop: 4, display: "block" }}>
              Enter your registered email. Your Administrator will approve and reset your password to <code>welcome123</code>.
            </Text>
          </div>

          {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 18, borderRadius: 8 }} />}
          {success && (
            <Alert 
              message="Request Registered Successfully" 
              description="Your password reset request has been logged. Please notify your Administrator to approve it from the User Management console." 
              type="success" 
              showIcon 
              style={{ marginBottom: 18, borderRadius: 10 }} 
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
                label={<span style={{ color: "#334155", fontWeight: 700 }}>Email Address</span>}
                rules={[
                  { required: true, message: "Please enter your email address." },
                  { type: "email", message: "Please enter a valid email address." }
                ]}
              >
                <Input 
                  prefix={<MailOutlined style={{ color: "#94a3b8" }} />} 
                  placeholder="operator@example.com" 
                  size="large"
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, marginTop: 20 }}>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  size="large" 
                  block
                  style={{ 
                    height: 46, 
                    borderRadius: 10, 
                    fontWeight: 700, 
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    border: "none",
                    boxShadow: "0 6px 16px rgba(16, 185, 129, 0.28)"
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
