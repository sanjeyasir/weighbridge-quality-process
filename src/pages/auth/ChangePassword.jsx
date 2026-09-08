import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { updateUserPassword } from "../../services/firebase/authService";
import { Form, Input, Button, Card, Typography, Alert, Spin } from "antd";
import { LockOutlined, SafetyCertificateOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function ChangePassword() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { logout, updateLocalProfile } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    const { password } = values;
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
        <Spin spinning={loading} size="large" tip="Updating Password...">
          <div style={{ marginBottom: 24, textAlign: "center" }}>
            <div style={{
              background: "rgba(245, 158, 11, 0.12)", 
              color: "#f59e0b",
              borderRadius: "16px",
              width: 52,
              height: 52,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              marginBottom: 12
            }}>
              <SafetyCertificateOutlined />
            </div>
            <Title level={3} style={{ margin: 0, fontWeight: 800, color: "#0f172a" }}>
              Set New Password
            </Title>
            <Text type="secondary" style={{ fontSize: "0.82rem", marginTop: 4, display: "block" }}>
              Your operator account requires establishing a secure personal password.
            </Text>
          </div>

          {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 18, borderRadius: 8 }} />}

          <Form
            name="change_pass_form"
            layout="vertical"
            requiredMark={false}
            onFinish={onFinish}
          >
            <Form.Item
              name="password"
              label={<span style={{ color: "#334155", fontWeight: 700 }}>New Password</span>}
              rules={[
                { required: true, message: "Please enter your new password." },
                { min: 6, message: "Password must be at least 6 characters." }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: "#94a3b8" }} />}
                placeholder="Enter minimum 6 characters"
                size="large"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label={<span style={{ color: "#334155", fontWeight: 700 }}>Confirm New Password</span>}
              dependencies={['password']}
              rules={[
                { required: true, message: "Please confirm your password." },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Passwords do not match!'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: "#94a3b8" }} />}
                placeholder="Re-enter password"
                size="large"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 12, marginTop: 24 }}>
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
                Update & Enter Dashboard
              </Button>
            </Form.Item>

            <Button type="link" block onClick={logout} style={{ color: "#64748b", fontWeight: 600 }}>
              Cancel & Sign Out
            </Button>
          </Form>
        </Spin>
      </Card>
    </div>
  );
}
