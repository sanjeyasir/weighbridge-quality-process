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
  Typography
} from "antd";
import { 
  PlusOutlined, 
  UserAddOutlined, 
  LockOutlined, 
  KeyOutlined, 
  MailOutlined,
  CheckCircleOutlined
} from "@ant-design/icons";

const { Option } = Select;
const { Title, Text } = Typography;

export default function Users() {
  const [users, setUsers] = useState([]);
  const [resets, setResets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openUserModal, setOpenUserModal] = useState(false);
  const [form] = Form.useForm();
  
  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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

  const userColumns = [
    {
      title: "Name",
      dataIndex: "displayName",
      key: "displayName",
      render: (text) => <span style={{ fontWeight: 600, color: "#0f172a" }}>{text}</span>
    },
    {
      title: "Email Address",
      dataIndex: "email",
      key: "email"
    },
    {
      title: "System Role",
      dataIndex: "role",
      key: "role",
      render: (role) => {
        let color = "blue";
        if (role === "admin") color = "red";
        if (role === "quality") color = "purple";
        if (role === "finance") color = "success";
        return <Tag color={color} style={{ fontWeight: 600 }}>{getRoleLabel(role)}</Tag>;
      }
    },
    {
      title: "Active Status",
      key: "status",
      render: (_, record) => {
        if (record.email === "admin@gmail.com") return <Tag color="green">SYSTEM BYPASS</Tag>;
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
      title: "User Name",
      dataIndex: "name",
      key: "name",
      render: (text) => <span style={{ fontWeight: 600, color: "#0f172a" }}>{text}</span>
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email"
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
      render: (_, record) => (
        <Button 
          type="primary" 
          size="small" 
          icon={<CheckCircleOutlined />} 
          onClick={() => handleApproveReset(record.id)}
          style={{ background: "#10b981", border: "none" }}
        >
          Approve (Set to welcome123)
        </Button>
      )
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 800, color: "#0f172a" }}>
            User Account Management
          </Title>
          <Text type="secondary">
            Manage system operators, assign access privileges, and authorize security modifications.
          </Text>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => setOpenUserModal(true)}
          style={{ 
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            border: "none",
            fontWeight: 700,
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)"
          }}
        >
          Register New Account
        </Button>
      </div>

      <Card bordered={true} style={{ borderRadius: 16 }}>
        <Tabs defaultActiveKey="1" style={{ margin: "0" }}>
          <Tabs.TabPane tab="Active Operators" key="1">
            <Table 
              columns={userColumns} 
              dataSource={users} 
              rowKey="uid" 
              loading={loading}
            />
          </Tabs.TabPane>
          <Tabs.TabPane tab={`Pending Resets (${resets.length})`} key="2">
            <Table 
              columns={resetColumns} 
              dataSource={resets} 
              rowKey="id" 
              loading={loading}
              locale={{ emptyText: "No pending password resets." }}
            />
          </Tabs.TabPane>
        </Tabs>
      </Card>

      {/* Register User Modal */}
      <Modal
        title={
          <span style={{ fontWeight: 800, fontSize: "1.2rem", display: "flex", alignItems: "center", gap: 8 }}>
            <UserAddOutlined style={{ color: "#10b981" }} /> Register User Account
          </span>
        }
        open={openUserModal}
        onCancel={() => setOpenUserModal(false)}
        footer={null}
        width={450}
        centered
        styles={{ content: { borderRadius: 16 } }}
      >
        {errorMsg && <Alert message={errorMsg} type="error" showIcon style={{ marginBottom: 20 }} />}
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateUser}
          requiredMark={true}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="displayName"
            label={<span style={{ color: "#475569", fontWeight: 600 }}>Full Name</span>}
            rules={[{ required: true, message: "Full Name is required." }]}
          >
            <Input placeholder="John Doe" size="large" style={{ borderRadius: 8 }} />
          </Form.Item>

          <Form.Item
            name="email"
            label={<span style={{ color: "#475569", fontWeight: 600 }}>Email Address</span>}
            rules={[
              { required: true, message: "Email is required." },
              { type: "email", message: "Please enter a valid email." }
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="john@example.com" size="large" style={{ borderRadius: 8 }} />
          </Form.Item>

          <Form.Item
            name="role"
            label={<span style={{ color: "#475569", fontWeight: 600 }}>System Privileges (Role)</span>}
            rules={[{ required: true, message: "Please select a role." }]}
          >
            <Select placeholder="Select a team role" size="large" style={{ borderRadius: 8 }}>
              <Option value="requester">Requester Team</Option>
              <Option value="quality">Quality Team</Option>
              <Option value="finance">Finance Team</Option>
              <Option value="admin">Administrator (Full Access)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="password"
            label={<span style={{ color: "#475569", fontWeight: 600 }}>Temporary Password</span>}
            rules={[
              { required: true, message: "Temporary password is required." },
              { min: 6, message: "Must be at least 6 characters." }
            ]}
            help="User will be forced to change this password on first login."
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••" size="large" style={{ borderRadius: 8 }} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right", marginTop: 24 }}>
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
                  border: "none"
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


