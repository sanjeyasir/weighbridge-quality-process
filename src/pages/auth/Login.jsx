import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Form, Input, Button, Card, Typography, Alert, Spin } from "antd";
import { MailOutlined, LockOutlined, BuildOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function Login() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  useEffect(() => {
    // Clear stale session
    logout().catch(err => console.error("Session clear error:", err));
  }, []);

  const onFinish = async (values) => {
    const { email, password } = values;
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
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      background: "radial-gradient(circle at 10% 20%, rgba(16, 185, 129, 0.09) 0%, transparent 45%), radial-gradient(circle at 90% 80%, rgba(99, 102, 241, 0.07) 0%, transparent 50%), #f8fafc",
      padding: "20px",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Ambient background glows */}
      <div style={{
        position: "absolute",
        width: 320,
        height: 320,
        borderRadius: "50%",
        filter: "blur(90px)",
        background: "rgba(16, 185, 129, 0.12)",
        top: "-8%",
        left: "4%",
        zIndex: 0
      }} />
      <div style={{
        position: "absolute",
        width: 380,
        height: 380,
        borderRadius: "50%",
        filter: "blur(110px)",
        background: "rgba(99, 102, 241, 0.08)",
        bottom: "-10%",
        right: "4%",
        zIndex: 0
      }} />

      <Card 
        bordered={true}
        style={{ 
          width: "100%", 
          maxWidth: 440, 
          borderRadius: 20, 
          boxShadow: "0 12px 35px rgba(0, 0, 0, 0.06)",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          zIndex: 1
        }}
        styles={{ body: { padding: "36px 28px" } }}
      >
        <Spin spinning={loading} size="large" tip="Authenticating Session...">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 28 }}>
            <div style={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", 
              borderRadius: "16px",
              width: 54,
              height: 54,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 16px rgba(16, 185, 129, 0.28)",
              marginBottom: 12
            }}>
              <BuildOutlined style={{ color: "#fff", fontSize: 26 }} />
            </div>
            <Title level={3} style={{ margin: 0, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>
              Weighbridge Hub
            </Title>
            <Text type="secondary" style={{ marginTop: 2, fontSize: "0.85rem" }}>
              Quality Assurance & Raw Material Billing Control
            </Text>
          </div>

          {error && (
            <Alert 
              message={error} 
              type="error" 
              showIcon 
              style={{ marginBottom: 20, borderRadius: 10, fontSize: "0.82rem" }} 
            />
          )}

          <Form
            form={form}
            name="login_form"
            layout="vertical"
            requiredMark={false}
            onFinish={onFinish}
          >
            <Form.Item
              name="email"
              label={<span style={{ color: "#334155", fontWeight: 700, fontSize: "0.85rem" }}>Email Address</span>}
              rules={[
                { required: true, message: "Please enter your email address." },
                { type: "email", message: "Please enter a valid email address." }
              ]}
              style={{ marginBottom: 18 }}
            >
              <Input 
                prefix={<MailOutlined style={{ color: "#94a3b8" }} />} 
                placeholder="operator@example.com" 
                size="large"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span style={{ color: "#334155", fontWeight: 700, fontSize: "0.85rem" }}>Password</span>}
              rules={[{ required: true, message: "Please enter your password." }]}
              style={{ marginBottom: 6 }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: "#94a3b8" }} />}
                placeholder="••••••••"
                size="large"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            {/* Forgot Password Link Below Password Input on Right */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24, marginTop: 4 }}>
              <Link to="/forgot-password" style={{ color: "#10b981", fontWeight: 700, fontSize: "0.82rem" }}>
                Forgot Password?
              </Link>
            </div>

            <Form.Item style={{ marginBottom: 0 }}>
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
                  boxShadow: "0 6px 16px rgba(16, 185, 129, 0.28)",
                  fontSize: "0.95rem"
                }}
              >
                Sign In to Workspace
              </Button>
            </Form.Item>
          </Form>
        </Spin>
      </Card>
    </div>
  );
}
