import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { updateUserPassword } from "../../services/firebase/authService";
import { Form, Input, Button, Card, Typography, Alert, Spin } from "antd";
import { LockOutlined } from "@ant-design/icons";

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
      // Synchronously set local profile requirePasswordChange flag to false
      updateLocalProfile({ requirePasswordChange: false });
      // Redirect to password success screen
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
        <Spin spinning={loading} size="large" tip="Updating Password...">
          <div style={{ marginBottom: 28, textAlign: "center" }}>
            <div style={{
              backgroundColor: "#f59e0b", 
              color: "#fff",
              borderRadius: "50%",
              width: 50,
              height: 50,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              marginBottom: 16
            }}>
              <LockOutlined />
            </div>
            <Title level={3} style={{ margin: 0, fontWeight: 800, color: "#0f172a" }}>
              Update Password
            </Title>
            <Text type="secondary">
              Your account requires a password update before proceeding.
            </Text>
          </div>

          {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 20 }} />}

          <Form
            name="change_pass_form"
            layout="vertical"
            requiredMark={false}
            onFinish={onFinish}
          >
            <Form.Item
              name="password"
              label={<span style={{ color: "#475569", fontWeight: 600 }}>New Password</span>}
              rules={[
                { required: true, message: "Please enter your new password." },
                { min: 6, message: "Password must be at least 6 characters." }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: "rgba(0,0,0,0.4)" }} />}
                placeholder="New Password"
                size="large"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label={<span style={{ color: "#475569", fontWeight: 600 }}>Confirm New Password</span>}
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
                prefix={<LockOutlined style={{ color: "rgba(0,0,0,0.4)" }} />}
                placeholder="Confirm Password"
                size="large"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 12 }}>
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
                  border: "none"
                }}
              >
                Update and Log In
              </Button>
            </Form.Item>

            <Button type="link" block onClick={logout} style={{ color: "#64748b" }}>
              Cancel & Sign Out
            </Button>
          </Form>
        </Spin>
      </Card>
    </div>
  );
}
