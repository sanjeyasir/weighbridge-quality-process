import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getWeighbridgeRequests, deleteRequest } from "../../services/firebase/weighbridgeService";
import { useAuth } from "../../contexts/AuthContext";
import { 
  Table, 
  Card, 
  Tabs, 
  Input, 
  Space, 
  Button, 
  Tag, 
  Row, 
  Col, 
  Popconfirm, 
  message 
} from "antd";
import { 
  SearchOutlined, 
  PlusOutlined, 
  EyeOutlined, 
  DeleteOutlined, 
  FileSearchOutlined 
} from "@ant-design/icons";

export default function WeighbridgeRequests() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const loadRequests = async () => {
    try {
      setLoading(true);
      const list = await getWeighbridgeRequests();
      setRequests(list);
    } catch (err) {
      message.error("Failed to load requests.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleDelete = async (id) => {
    try {
      await deleteRequest(id);
      message.success("Requisition deleted successfully.");
      loadRequests();
    } catch (err) {
      message.error("Failed to delete request.");
    }
  };

  const getFilteredRequests = () => {
    let filtered = [...requests];

    // Status filter
    if (activeTab !== "all") {
      filtered = filtered.filter(r => r.status === activeTab);
    }

    // Search filter (Vehicle No, Supplier, Commodity, or Ticket No)
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.vehicleNo?.toLowerCase().includes(q) ||
        r.supplier?.toLowerCase().includes(q) ||
        r.commodity?.toLowerCase().includes(q) ||
        String(r.requestNo).includes(q) ||
        r.ticketNo?.toLowerCase().includes(q)
      );
    }

    return filtered;
  };

  const columns = [
    {
      title: "Request No",
      dataIndex: "requestNo",
      key: "requestNo",
      render: (val, record) => (
        <Link to={`/requests/${record.id}`} style={{ fontWeight: 700, color: "#6366f1" }}>
          #{val}
        </Link>
      )
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
      title: "Commodity",
      dataIndex: "commodity",
      key: "commodity"
    },
    {
      title: "Net Weight",
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
      title: "Submitted Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (val) => val ? new Date(val).toLocaleDateString() : "-"
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<EyeOutlined />} 
            onClick={() => navigate(`/requests/${record.id}`)}
            style={{ color: "#6366f1" }}
          >
            View
          </Button>
          {currentUser?.role === "admin" && (
            <Popconfirm
              title="Delete Requisition"
              description="Are you sure you want to delete this record permanently?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 800, fontSize: "1.75rem", color: "#0f172a" }}>
            Weighbridge Quality Records
          </h2>
          <p style={{ margin: 0, color: "#64748b", marginTop: 4 }}>
            Monitor and trace raw material weighing parameters, sample parameters, and payout invoices.
          </p>
        </div>
        {(currentUser?.role === "requester" || currentUser?.role === "admin") && (
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => navigate("/requests/create")}
            style={{ 
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              border: "none",
              fontWeight: 700
            }}
          >
            New Ticket
          </Button>
        )}
      </div>

      <Card bordered={true} style={{ borderRadius: 16 }}>
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={24} sm={12}>
            <Input
              placeholder="Search by vehicle, supplier, commodity, or request number..."
              prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="large"
              style={{ borderRadius: 8 }}
            />
          </Col>
        </Row>

        <Tabs 
          activeKey={activeTab} 
          onChange={(key) => setActiveTab(key)}
          style={{ margin: 0 }}
        >
          <Tabs.TabPane tab="All Requisitions" key="all">
            <Table 
              columns={columns} 
              dataSource={getFilteredRequests()} 
              rowKey="id" 
              loading={loading} 
            />
          </Tabs.TabPane>
          <Tabs.TabPane tab="Pending Quality Parameters" key="Pending Quality">
            <Table 
              columns={columns} 
              dataSource={getFilteredRequests()} 
              rowKey="id" 
              loading={loading} 
            />
          </Tabs.TabPane>
          <Tabs.TabPane tab="Pending Finance Outcomes" key="Pending Finance">
            <Table 
              columns={columns} 
              dataSource={getFilteredRequests()} 
              rowKey="id" 
              loading={loading} 
            />
          </Tabs.TabPane>
          <Tabs.TabPane tab="Completed Operations" key="Completed">
            <Table 
              columns={columns} 
              dataSource={getFilteredRequests()} 
              rowKey="id" 
              loading={loading} 
            />
          </Tabs.TabPane>
        </Tabs>
      </Card>
    </div>
  );
}
