import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getWeighbridgeRequests } from "../../services/firebase/weighbridgeService";
import { Card, Col, Row, Statistic, Table, Tag, Typography, Button, Space, Card as AntCard } from "antd";
import { 
  PlusOutlined, 
  EyeOutlined,
  ContainerOutlined,
  HourglassOutlined,
  DollarCircleOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined
} from "@ant-design/icons";

const { Title, Paragraph } = Typography;

export default function Dashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const list = await getWeighbridgeRequests();
        setRequests(list);
      } catch (err) {
        console.error("Dashboard data load failed:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalCount = requests.length;
  const pendingQuality = requests.filter(r => r.status === "Pending Quality").length;
  const pendingFinance = requests.filter(r => r.status === "Pending Finance").length;
  const completed = requests.filter(r => r.status === "Completed").length;

  const columns = [
    {
      title: "Request No",
      dataIndex: "requestNo",
      key: "requestNo",
      render: (val, record) => <Link to={`/requests/${record.id}`} style={{ fontWeight: 600, color: "#6366f1" }}>#{val}</Link>
    },
    {
      title: "Vehicle No",
      dataIndex: "vehicleNo",
      key: "vehicleNo"
    },
    {
      title: "Supplier",
      dataIndex: "supplier",
      key: "supplier"
    },
    {
      title: "Net Weight (Kg)",
      dataIndex: "netWeight",
      key: "netWeight",
      render: val => val ? `${val} kg` : "-"
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        let color = "blue";
        if (status === "Pending Quality") color = "purple";
        if (status === "Pending Finance") color = "warning";
        if (status === "Completed") color = "success";
        return <Tag color={color} style={{ fontWeight: 600 }}>{status}</Tag>;
      }
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Button 
          type="text" 
          icon={<EyeOutlined />} 
          onClick={() => navigate(`/requests/${record.id}`)}
          style={{ color: "#6366f1" }}
        >
          View
        </Button>
      )
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Welcome Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 800, color: "#0f172a" }}>
            Welcome Back, {currentUser?.displayName}!
          </Title>
          <Paragraph type="secondary" style={{ margin: 0, marginTop: 4 }}>
            Monitor and manage raw material weighbridge tickets and quality assurance billing.
          </Paragraph>
        </div>
        {(currentUser?.role === "requester" || currentUser?.role === "admin") && (
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => navigate("/requests/create")}
            style={{ 
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              border: "none",
              fontWeight: 700,
              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)"
            }}
          >
            New Ticket Requisition
          </Button>
        )}
      </div>

      {/* Analytics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={true} className="hover-card">
            <Statistic 
              title={<span style={{ color: "#64748b", fontWeight: 600 }}>Total Requisitions</span>} 
              value={totalCount} 
              prefix={<ContainerOutlined style={{ color: "#3b82f6", marginRight: 8 }} />}
              valueStyle={{ fontWeight: 800, color: "#0f172a" }}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={true} className="hover-card">
            <Statistic 
              title={<span style={{ color: "#64748b", fontWeight: 600 }}>Awaiting Quality</span>} 
              value={pendingQuality} 
              prefix={<HourglassOutlined style={{ color: "#a855f7", marginRight: 8 }} />}
              valueStyle={{ fontWeight: 800, color: "#0f172a" }}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={true} className="hover-card">
            <Statistic 
              title={<span style={{ color: "#64748b", fontWeight: 600 }}>Awaiting Finance</span>} 
              value={pendingFinance} 
              prefix={<DollarCircleOutlined style={{ color: "#eab308", marginRight: 8 }} />}
              valueStyle={{ fontWeight: 800, color: "#0f172a" }}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={true} className="hover-card">
            <Statistic 
              title={<span style={{ color: "#64748b", fontWeight: 600 }}>Completed Operations</span>} 
              value={completed} 
              prefix={<CheckCircleOutlined style={{ color: "#10b981", marginRight: 8 }} />}
              valueStyle={{ fontWeight: 800, color: "#0f172a" }}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      {/* Recent Activity Table */}
      <Card 
        title={<span style={{ fontWeight: 800, color: "#0f172a" }}>Recent Requisitions Activity</span>}
        extra={<Button type="link" onClick={() => navigate("/requests")} style={{ fontWeight: 600 }}>View All <ArrowRightOutlined /></Button>}
        bordered={true}
        style={{ borderRadius: 16 }}
      >
        <Table 
          columns={columns} 
          dataSource={requests.slice(0, 5)} 
          rowKey="id" 
          pagination={false}
          loading={loading}
        />
      </Card>
    </div>
  );
}
