import React, { useEffect, useState } from "react";
import { 
  getAllUsers, 
  updateUserStatus, 
  createUser 
} from "../../services/firebase/userService";
import { 
  getPendingPasswordResets, 
  approvePasswordReset 
} from "../../services/firebase/authService";
import { 
  Table, 
  Card, 
  Tabs, 
  Button, 
  Tag, 
  Modal, 
  Form, 
  Input, 
  Select, 
  Space, 
  Alert, 
  message,
  Switch,
  Typography,
  Badge,
  Avatar,
  Row,
  Col,
  Empty
} from "antd";
import { 
  PlusOutlined, 
  UserAddOutlined, 
  LockOutlined, 
  KeyOutlined, 
  MailOutlined, 
  CheckCircleOutlined, 
  UserOutlined, 
  SafetyCertificateOutlined, 
  ClockCircleOutlined 
} from "@ant-design/icons";

const { Option } = Select;
const { Title, Text } = Typography;

export default function Users() {
  const [users, setUsers] = useState([]);
  const [resets, setResets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openUserModal, setOpenUserModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [form] = Form.useForm();
  
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const userList = await getAllUsers();
      const resetList = await getPendingPasswordResets();
      setUsers(userList);
      setResets(resetList);
    } catch (err) {
      message.error("Failed to load user management details.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (uid, currentStatus) => {
    const nextStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      await updateUserStatus(uid, nextStatus);
      message.success(`User is now marked as ${nextStatus}.`);
      loadData();
    } catch (err) {
      message.error("Failed to update status.");
    }
  };

  const handleCreateUser = async (values) => {
    try {
      setSubmitting(true);
      setErrorMsg("");
      await createUser({
        displayName: values.displayName,
        email: values.email,
        password: values.password,
        role: values.role
      });
      message.success("User registered successfully!");
      setOpenUserModal(false);
      form.resetFields();
      loadData();
    } catch (err) {
      setErrorMsg(err.message || "Failed to register user account.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveReset = async (requestId) => {
    try {
      await approvePasswordReset(requestId);
      message.success("Password reset request approved. Password set to 'welcome123'.");
      loadData();
    } catch (err) {
      message.error("Failed to approve password reset.");
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case "admin": return "Administrator";
      case "requester": return "Requester Team";
      case "quality": return "Quality Team";
      case "finance": return "Finance Team";
      default: return role;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "admin": return "red";
      case "requester": return "blue";
      case "quality": return "purple";
      case "finance": return "success";
      default: return "default";
    }
  };

  const userColumns = [
    {
      title: "User",
      dataIndex: "displayName",
      key: "displayName",
      render: (text, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar style={{ backgroundColor: "#10b981", fontWeight: 700 }}>
            {text ? text[0].toUpperCase() : "U"}
          </Avatar>
          <div>
            <div style={{ fontWeight: 700, color: "#0f172a" }}>{text}</div>
            <div style={{ color: "#64748b", fontSize: "0.75rem" }}>{record.email}</div>
          </div>
        </div>
      )
    },
    {
      title: "Assigned Role",
      dataIndex: "role",
      key: "role",
      render: (role) => (
        <Tag color={getRoleColor(role)} style={{ fontWeight: 700 }}>
          {getRoleLabel(role)}
        </Tag>
      )
    },
    {
      title: "Access Status",
      key: "status",
      render: (_, record) => {
        if (record.email === "admin@gmail.com") {
          return <Tag color="green" style={{ fontWeight: 700 }}>SYSTEM ADMIN</Tag>;
        }
        return (
          <Switch 
            checked={record.status === "active"} 
            onChange={() => handleStatusChange(record.uid, record.status)} 
            checkedChildren="Active"
            unCheckedChildren="Inactive"
          />
        );
      }
    }
  ];

  const resetColumns = [
    {
      title: "User & Email",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0f172a" }}>{text}</div>
          <div style={{ color: "#64748b", fontSize: "0.75rem" }}>{record.email}</div>
        </div>
      )
    },
    {
      title: "Request Time",
      dataIndex: "requestedAt",
      key: "requestedAt",
      render: (val) => val ? new Date(val).toLocaleString() : "-"
    },
    {
      title: "Action",
      key: "action",
      align: "right",
      render: (_, record) => (
        <Button 
          type="primary" 
          size="small" 
          icon={<CheckCircleOutlined />} 
          onClick={() => handleApproveReset(record.id)}
          style={{ background: "#10b981", border: "none", fontWeight: 700, borderRadius: 6 }}
        >
          Approve (Set welcome123)
        </Button>
      )
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontWeight: 800, fontSize: isMobile ? "1.4rem" : "1.75rem", color: "#0f172a", letterSpacing: "-0.02em" }}>
            User Account Management
          </h1>
          <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: isMobile ? "0.82rem" : "0.9rem" }}>
            Manage operators, assign system privileges, and authorize password reset requests.
          </p>
        </div>

        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => setOpenUserModal(true)}
          size="large"
          style={{ 
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            border: "none",
            fontWeight: 700,
            borderRadius: 10,
            boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)",
            width: isMobile ? "100%" : "auto"
          }}
        >
          Register New Operator
        </Button>
      </div>

      <Card 
        bordered={true} 
        style={{ borderRadius: 16, background: "#ffffff" }}
        styles={{ body: { padding: isMobile ? 12 : 20 } }}
      >
        <Tabs 
          defaultActiveKey="1" 
          style={{ margin: "0" }}
          items={[
            {
              key: "1",
              label: (
                <span>
                  Active Operators <Badge count={users.length} overflowCount={99} style={{ backgroundColor: "#10b981", color: "#fff" }} />
                </span>
              ),
              children: isMobile ? (
                /* Mobile Users Card Grid */
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  {users.map(u => (
                    <div 
                      key={u.uid} 
                      style={{ 
                        border: "1px solid #e2e8f0", 
                        borderRadius: 12, 
                        padding: "14px",
                        background: "#ffffff",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Avatar style={{ backgroundColor: "#10b981", fontWeight: 800 }}>
                            {u.displayName ? u.displayName[0].toUpperCase() : "U"}
                          </Avatar>
                          <div>
                            <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.9rem" }}>{u.displayName}</div>
                            <div style={{ color: "#64748b", fontSize: "0.75rem" }}>{u.email}</div>
                          </div>
                        </div>
                        <Tag color={getRoleColor(u.role)} style={{ fontWeight: 700 }}>
                          {getRoleLabel(u.role)}
                        </Tag>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: 8 }}>
                        <span style={{ fontSize: "0.78rem", color: "#64748b" }}>Status</span>
                        {u.email === "admin@gmail.com" ? (
                          <Tag color="green">SYSTEM ADMIN</Tag>
                        ) : (
                          <Switch 
                            checked={u.status === "active"} 
                            onChange={() => handleStatusChange(u.uid, u.status)} 
                            checkedChildren="Active"
                            unCheckedChildren="Inactive"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: 12 }}>
                  <Table 
                    columns={userColumns} 
                    dataSource={users} 
                    rowKey="uid" 
                    loading={loading}
                    pagination={{ pageSize: 8 }}
                  />
                </div>
              )
            },
            {
              key: "2",
              label: (
                <span>
                  Pending Resets <Badge count={resets.length} style={{ backgroundColor: resets.length > 0 ? "#ef4444" : "#e2e8f0", color: resets.length > 0 ? "#fff" : "#475569" }} />
                </span>
              ),
              children: isMobile ? (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  {resets.map(r => (
                    <div 
                      key={r.id} 
                      style={{ 
                        border: "1px solid #e2e8f0", 
                        borderRadius: 12, 
                        padding: "14px",
                        background: "#ffffff",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, color: "#0f172a" }}>{r.name}</div>
                        <div style={{ color: "#64748b", fontSize: "0.75rem" }}>{r.email}</div>
                        <div style={{ color: "#94a3b8", fontSize: "0.72rem", marginTop: 2 }}>
                          {r.requestedAt ? new Date(r.requestedAt).toLocaleString() : "-"}
                        </div>
                      </div>

                      <Button 
                        type="primary" 
                        icon={<CheckCircleOutlined />} 
                        onClick={() => handleApproveReset(r.id)}
                        style={{ background: "#10b981", border: "none", fontWeight: 700, borderRadius: 8 }}
                        block
                      >
                        Approve (Reset to welcome123)
                      </Button>
                    </div>
                  ))}
                  {resets.length === 0 && (
                    <Empty description="No pending password reset requests." style={{ padding: "32px 0" }} />
                  )}
                </div>
              ) : (
                <div style={{ marginTop: 12 }}>
                  <Table 
                    columns={resetColumns} 
                    dataSource={resets} 
                    rowKey="id" 
                    loading={loading}
                    locale={{ emptyText: "No pending password reset requests." }}
                  />
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* Register User Modal */}
      <Modal
        title={
          <span style={{ fontWeight: 800, fontSize: "1.15rem", display: "flex", alignItems: "center", gap: 8, color: "#0f172a" }}>
            <UserAddOutlined style={{ color: "#10b981" }} /> Register Operator Account
          </span>
        }
        open={openUserModal}
        onCancel={() => setOpenUserModal(false)}
        footer={null}
        width={460}
        centered
        styles={{ content: { borderRadius: 16 } }}
      >
        {errorMsg && <Alert message={errorMsg} type="error" showIcon style={{ marginBottom: 16, borderRadius: 8 }} />}
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateUser}
          requiredMark={true}
          style={{ marginTop: 14 }}
        >
          <Form.Item
            name="displayName"
            label={<span style={{ color: "#334155", fontWeight: 700 }}>Full Name</span>}
            rules={[{ required: true, message: "Full Name is required." }]}
          >
            <Input placeholder="John Doe" size="large" style={{ borderRadius: 8 }} />
          </Form.Item>

          <Form.Item
            name="email"
            label={<span style={{ color: "#334155", fontWeight: 700 }}>Email Address</span>}
            rules={[
              { required: true, message: "Email is required." },
              { type: "email", message: "Please enter a valid email." }
            ]}
          >
            <Input prefix={<MailOutlined style={{ color: "#94a3b8" }} />} placeholder="operator@hayleys.com" size="large" style={{ borderRadius: 8 }} />
          </Form.Item>

          <Form.Item
            name="role"
            label={<span style={{ color: "#334155", fontWeight: 700 }}>System Privileges (Role)</span>}
            rules={[{ required: true, message: "Please select a role." }]}
          >
            <Select placeholder="Select role privileges" size="large" style={{ borderRadius: 8 }}>
              <Option value="requester">Requester Team (Create & View Requisitions)</Option>
              <Option value="quality">Quality Team (Lab Sample Evaluation & Entry)</Option>
              <Option value="finance">Finance Team (Billing Deductions & Disbursement)</Option>
              <Option value="admin">Administrator (Full Access & User Accounts)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="password"
            label={<span style={{ color: "#334155", fontWeight: 700 }}>Temporary Password</span>}
            rules={[
              { required: true, message: "Temporary password is required." },
              { min: 6, message: "Must be at least 6 characters." }
            ]}
            help="Operator will be required to change password on first login."
          >
            <Input.Password prefix={<LockOutlined style={{ color: "#94a3b8" }} />} placeholder="••••••" size="large" style={{ borderRadius: 8 }} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right", marginTop: 20 }}>
            <Space>
              <Button onClick={() => setOpenUserModal(false)} style={{ borderRadius: 8 }}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                style={{ 
                  borderRadius: 8, 
                  fontWeight: 700, 
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  border: "none",
                  padding: "0 24px"
                }}
              >
                Register
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
