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
  message,
  Badge,
  Empty,
  Tooltip
} from "antd";
import { 
  SearchOutlined, 
  PlusOutlined, 
  EyeOutlined, 
  DeleteOutlined, 
  FileSearchOutlined,
  CalendarOutlined,
  CarOutlined,
  AppstoreOutlined,
  BarsOutlined
} from "@ant-design/icons";

export default function WeighbridgeRequests() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState("auto"); // "auto", "card", "table"

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
      message.success("Requisition record deleted.");
      loadRequests();
    } catch (err) {
      message.error("Failed to delete request.");
    }
  };

  const getFilteredRequests = () => {
    let filtered = [...requests];

    if (activeTab !== "all") {
      filtered = filtered.filter(r => r.status === activeTab);
    }

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

  const countAll = requests.length;
  const countQuality = requests.filter(r => r.status === "Pending Quality").length;
  const countFinance = requests.filter(r => r.status === "Pending Finance").length;
  const countCompleted = requests.filter(r => r.status === "Completed").length;

  const getStatusBadge = (status) => {
    let color = "#3b82f6";
    let bg = "rgba(59, 130, 246, 0.08)";
    if (status === "Pending Quality") {
      color = "#8b5cf6";
      bg = "rgba(139, 92, 246, 0.08)";
    } else if (status === "Pending Finance") {
      color = "#f59e0b";
      bg = "rgba(245, 158, 11, 0.08)";
    } else if (status === "Completed") {
      color = "#10b981";
      bg = "rgba(16, 185, 129, 0.08)";
    }
    return (
      <Tag 
        style={{ 
          color, 
          background: bg, 
          borderColor: "transparent",
          fontWeight: 700,
          borderRadius: 6,
          padding: "2px 8px",
          fontSize: "0.75rem",
          margin: 0
        }}
      >
        {status}
      </Tag>
    );
  };

  const columns = [
    {
      title: "Request No",
      dataIndex: "requestNo",
      key: "requestNo",
      render: (val, record) => (
        <Link to={`/requests/${record.id}`} style={{ fontWeight: 800, color: "#6366f1" }}>
          #{val}
        </Link>
      )
    },
    {
      title: "Vehicle Reg",
      dataIndex: "vehicleNo",
      key: "vehicleNo",
      render: (text) => (
        <span style={{ fontWeight: 700, color: "#0f172a", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <CarOutlined style={{ color: "#94a3b8" }} />
          {text}
        </span>
      )
    },
    {
      title: "Supplier & Mill",
      dataIndex: "supplier",
      key: "supplier",
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 600, color: "#334155" }}>{text}</div>
          {record.mill && <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{record.mill}</div>}
        </div>
      )
    },
    {
      title: "Commodity",
      dataIndex: "commodity",
      key: "commodity",
      render: (text) => <Tag color="default" style={{ fontWeight: 600 }}>{text}</Tag>
    },
    {
      title: "Net Weight",
      dataIndex: "netWeight",
      key: "netWeight",
      render: val => val ? <span style={{ fontWeight: 700, color: "#10b981" }}>{val.toLocaleString()} kg</span> : "-"
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => getStatusBadge(status)
    },
    {
      title: "Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (val, record) => (
        <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
          {record.date || (val ? new Date(val).toLocaleDateString() : "-")}
        </span>
      )
    },
    {
      title: "Actions",
      key: "action",
      align: "right",
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="text" 
            icon={<EyeOutlined />} 
            onClick={() => navigate(`/requests/${record.id}`)}
            style={{ color: "#6366f1", fontWeight: 600 }}
          >
            View
          </Button>
          {currentUser?.role === "admin" && (
            <Popconfirm
              title="Delete Requisition"
              description="Are you sure you want to permanently delete this record?"
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

  const canCreate = currentUser?.role === "requester" || currentUser?.role === "admin";
  const filteredData = getFilteredRequests();
  const showCards = viewMode === "card" || (viewMode === "auto" && isMobile);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header Bar */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontWeight: 800, fontSize: isMobile ? "1.4rem" : "1.75rem", color: "#0f172a", letterSpacing: "-0.02em" }}>
            Weighbridge Quality Records
          </h1>
          <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: isMobile ? "0.82rem" : "0.9rem" }}>
            Track raw material weighing tickets, sample parameters, and payout invoices.
          </p>
        </div>

        {canCreate && !isMobile && (
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => navigate("/requests/create")}
            size="large"
            style={{ 
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              border: "none",
              fontWeight: 700,
              borderRadius: 10,
              boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)"
            }}
          >
            New Ticket
          </Button>
        )}
      </div>

      {/* Filter and Card/Table Container */}
      <Card 
        bordered={true} 
        style={{ borderRadius: 16, background: "#ffffff" }}
        styles={{ body: { padding: isMobile ? 12 : 20 } }}
      >
        {/* Search & Layout toggle Row */}
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 12, marginBottom: 16, justifyContent: "space-between" }}>
          <Input
            placeholder="Search vehicle reg, supplier, commodity, or request #..."
            prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            allowClear
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="large"
            style={{ borderRadius: 10, maxWidth: isMobile ? "100%" : 420 }}
          />

          {!isMobile && (
            <Space>
              <Button
                type={viewMode === "table" || viewMode === "auto" ? "primary" : "default"}
                icon={<BarsOutlined />}
                onClick={() => setViewMode("table")}
              >
                Table
              </Button>
              <Button
                type={viewMode === "card" ? "primary" : "default"}
                icon={<AppstoreOutlined />}
                onClick={() => setViewMode("card")}
              >
                Cards
              </Button>
            </Space>
          )}
        </div>

        {/* Status Tabs */}
        <Tabs 
          activeKey={activeTab} 
          onChange={(key) => setActiveTab(key)}
          style={{ margin: 0 }}
          items={[
            {
              key: "all",
              label: (
                <span>
                  All <Badge count={countAll} overflowCount={999} style={{ backgroundColor: activeTab === "all" ? "#10b981" : "#e2e8f0", color: activeTab === "all" ? "#fff" : "#475569" }} />
                </span>
              )
            },
            {
              key: "Pending Quality",
              label: (
                <span>
                  Pending QC <Badge count={countQuality} style={{ backgroundColor: activeTab === "Pending Quality" ? "#8b5cf6" : "#e2e8f0", color: activeTab === "Pending Quality" ? "#fff" : "#475569" }} />
                </span>
              )
            },
            {
              key: "Pending Finance",
              label: (
                <span>
                  Pending Finance <Badge count={countFinance} style={{ backgroundColor: activeTab === "Pending Finance" ? "#f59e0b" : "#e2e8f0", color: activeTab === "Pending Finance" ? "#fff" : "#475569" }} />
                </span>
              )
            },
            {
              key: "Completed",
              label: (
                <span>
                  Completed <Badge count={countCompleted} style={{ backgroundColor: activeTab === "Completed" ? "#10b981" : "#e2e8f0", color: activeTab === "Completed" ? "#fff" : "#475569" }} />
                </span>
              )
            }
          ]}
        />

        {/* Content View */}
        {showCards ? (
          /* Mobile / Card Grid View */
          <div style={{ marginTop: 16 }}>
            {filteredData.length === 0 && !loading ? (
              <Empty description="No matching weighbridge records found." style={{ padding: "32px 0" }} />
            ) : (
              <Row gutter={[12, 12]}>
                {filteredData.map((req) => (
                  <Col xs={24} sm={12} lg={8} key={req.id}>
                    <div 
                      className="mobile-record-card touch-press"
                      onClick={() => navigate(`/requests/${req.id}`)}
                      style={{ 
                        margin: 0,
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        border: "1px solid #e2e8f0",
                        borderRadius: 14,
                        padding: "16px",
                        background: "#ffffff"
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <span style={{ fontWeight: 800, color: "#6366f1", fontSize: "0.95rem" }}>
                            #{req.requestNo}
                          </span>
                          {getStatusBadge(req.status)}
                        </div>

                        <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <CarOutlined style={{ color: "#94a3b8", fontSize: 15 }} />
                          {req.vehicleNo}
                        </div>

                        <div style={{ color: "#475569", fontSize: "0.82rem", fontWeight: 600, marginBottom: 4 }}>
                          {req.supplier}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                          <Tag color="default" style={{ margin: 0, fontSize: "0.72rem", fontWeight: 600 }}>{req.commodity}</Tag>
                          {req.mill && <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>{req.mill}</span>}
                        </div>
                      </div>

                      <div style={{ 
                        borderTop: "1px solid #f1f5f9", 
                        paddingTop: 10, 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center" 
                      }}>
                        <div>
                          <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>Net Weight</div>
                          <div style={{ fontWeight: 800, color: "#10b981", fontSize: "1rem" }}>
                            {req.netWeight ? `${req.netWeight.toLocaleString()} kg` : "-"}
                          </div>
                        </div>

                        <Button 
                          type="primary" 
                          size="small" 
                          icon={<EyeOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/requests/${req.id}`);
                          }}
                          style={{ 
                            background: "rgba(99, 102, 241, 0.1)", 
                            color: "#6366f1", 
                            border: "none", 
                            fontWeight: 700,
                            borderRadius: 6
                          }}
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            )}
          </div>
        ) : (
          /* Desktop Table View */
          <div style={{ marginTop: 12 }}>
            <Table 
              columns={columns} 
              dataSource={filteredData} 
              rowKey="id" 
              loading={loading}
              pagination={{ pageSize: 10, showSizeChanger: true }}
              scroll={{ x: 800 }}
            />
          </div>
        )}
      </Card>

      {/* Floating Action Button for Mobile */}
      {canCreate && isMobile && (
        <button
          type="button"
          className="mobile-fab"
          onClick={() => navigate("/requests/create")}
          aria-label="Create New Ticket"
        >
          <PlusOutlined />
        </button>
      )}
    </div>
  );
}
