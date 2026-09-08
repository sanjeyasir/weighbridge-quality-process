import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getWeighbridgeRequests } from "../../services/firebase/weighbridgeService";
import { 
  Card, 
  Col, 
  Row, 
  Statistic, 
  Table, 
  Tag, 
  Typography, 
  Button, 
  Space, 
  Steps,
  Progress,
  Badge
} from "antd";
import { 
  PlusOutlined, 
  EyeOutlined,
  ContainerOutlined,
  HourglassOutlined,
  DollarCircleOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  FileDoneOutlined,
  ExperimentOutlined,
  SafetyCertificateOutlined,
  RightOutlined
} from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

export default function Dashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
  
  // Calculate total tonnage
  const totalKg = requests.reduce((acc, curr) => acc + (Number(curr.netWeight) || 0), 0);
  const totalTonnage = (totalKg / 1000).toFixed(1);

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
          fontSize: "0.75rem"
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
        <Link to={`/requests/${record.id}`} style={{ fontWeight: 700, color: "#6366f1" }}>
          #{val}
        </Link>
      )
    },
    {
      title: "Vehicle Reg",
      dataIndex: "vehicleNo",
      key: "vehicleNo",
      render: (text) => <span style={{ fontWeight: 600, color: "#0f172a" }}>{text}</span>
    },
    {
      title: "Supplier",
      dataIndex: "supplier",
      key: "supplier",
      render: (text) => <span style={{ color: "#475569" }}>{text}</span>
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
      render: val => val ? <span style={{ fontWeight: 700, color: "#0f172a" }}>{val.toLocaleString()} kg</span> : "-"
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => getStatusBadge(status)
    },
    {
      title: "Action",
      key: "action",
      align: "right",
      render: (_, record) => (
        <Button 
          type="text" 
          icon={<EyeOutlined />} 
          onClick={() => navigate(`/requests/${record.id}`)}
          style={{ color: "#6366f1", fontWeight: 600 }}
        >
          View
        </Button>
      )
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Welcome Hero Banner */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        borderRadius: 18,
        padding: isMobile ? "20px 16px" : "28px 32px",
        color: "#ffffff",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.2)"
      }}>
        {/* Ambient background decoration */}
        <div style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%)",
          filter: "blur(20px)"
        }} />

        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: 16 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 10px", borderRadius: 20, background: "rgba(255, 255, 255, 0.1)", fontSize: "0.75rem", fontWeight: 600, color: "#34d399", marginBottom: 10 }}>
              <span className="pulse-dot" style={{ backgroundColor: "#34d399" }} />
              Operational Live Console
            </div>
            <h1 style={{ margin: 0, fontSize: isMobile ? "1.4rem" : "1.85rem", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em" }}>
              Welcome Back, {currentUser?.displayName || "Operator"}!
            </h1>
            <p style={{ margin: "6px 0 0 0", color: "#94a3b8", fontSize: isMobile ? "0.82rem" : "0.92rem", maxWidth: 600 }}>
              Real-time monitoring of raw material weighbridge operations, quality sample tests, and invoice settlements.
            </p>
          </div>

          {(currentUser?.role === "requester" || currentUser?.role === "admin") && (
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
                boxShadow: "0 6px 16px rgba(16, 185, 129, 0.35)",
                width: isMobile ? "100%" : "auto"
              }}
            >
              New Ticket Requisition
            </Button>
          )}
        </div>
      </div>

      {/* Analytics Metric Cards */}
      <Row gutter={[14, 14]}>
        <Col xs={12} sm={12} md={6}>
          <div className="modern-card hover-lift" style={{ padding: "18px 16px", borderRadius: 16, height: "100%", background: "#ffffff", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ color: "#64748b", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Total Tickets
              </span>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                <ContainerOutlined />
              </div>
            </div>
            <div style={{ fontSize: isMobile ? "1.5rem" : "1.9rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
              {loading ? "..." : totalCount}
            </div>
            <div style={{ marginTop: 6, fontSize: "0.74rem", color: "#64748b" }}>
              <strong>{totalTonnage} MT</strong> Total Net Weight
            </div>
          </div>
        </Col>

        <Col xs={12} sm={12} md={6}>
          <div className="modern-card hover-lift" style={{ padding: "18px 16px", borderRadius: 16, height: "100%", background: "#ffffff", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ color: "#64748b", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Awaiting QC
              </span>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                <ExperimentOutlined />
              </div>
            </div>
            <div style={{ fontSize: isMobile ? "1.5rem" : "1.9rem", fontWeight: 800, color: "#8b5cf6", lineHeight: 1.1 }}>
              {loading ? "..." : pendingQuality}
            </div>
            <div style={{ marginTop: 6, fontSize: "0.74rem", color: "#64748b" }}>
              Pending Lab Parameters
            </div>
          </div>
        </Col>

        <Col xs={12} sm={12} md={6}>
          <div className="modern-card hover-lift" style={{ padding: "18px 16px", borderRadius: 16, height: "100%", background: "#ffffff", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ color: "#64748b", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Awaiting Finance
              </span>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                <DollarCircleOutlined />
              </div>
            </div>
            <div style={{ fontSize: isMobile ? "1.5rem" : "1.9rem", fontWeight: 800, color: "#f59e0b", lineHeight: 1.1 }}>
              {loading ? "..." : pendingFinance}
            </div>
            <div style={{ marginTop: 6, fontSize: "0.74rem", color: "#64748b" }}>
              Pending Payout Rates
            </div>
          </div>
        </Col>

        <Col xs={12} sm={12} md={6}>
          <div className="modern-card hover-lift" style={{ padding: "18px 16px", borderRadius: 16, height: "100%", background: "#ffffff", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ color: "#64748b", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Completed
              </span>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(16, 185, 129, 0.1)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                <SafetyCertificateOutlined />
              </div>
            </div>
            <div style={{ fontSize: isMobile ? "1.5rem" : "1.9rem", fontWeight: 800, color: "#10b981", lineHeight: 1.1 }}>
              {loading ? "..." : completed}
            </div>
            <div style={{ marginTop: 6, fontSize: "0.74rem", color: "#64748b" }}>
              Verified & Settled
            </div>
          </div>
        </Col>
      </Row>

      {/* Workflow Stage Tracker */}
      <Card 
        bordered={true} 
        style={{ borderRadius: 16, background: "#ffffff" }}
        styles={{ body: { padding: isMobile ? "16px 12px" : "20px 24px" } }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.95rem" }}>
              Raw Material Processing Pipeline
            </div>
            <div style={{ color: "#64748b", fontSize: "0.75rem" }}>
              Standard operational stages from weighbridge arrival to final voucher disbursement
            </div>
          </div>
        </div>

        <Steps
          size="small"
          current={1}
          responsive={true}
          items={[
            {
              title: 'Weighbridge Requisition',
              description: 'OCR & Tare Data',
              icon: <FileDoneOutlined style={{ color: "#3b82f6" }} />
            },
            {
              title: 'QC Sample Evaluation',
              description: 'Sand%, Sieve, pH & BD',
              icon: <ExperimentOutlined style={{ color: "#8b5cf6" }} />
            },
            {
              title: 'Commercial Billing',
              description: 'Deductions & Rate PMT',
              icon: <DollarCircleOutlined style={{ color: "#f59e0b" }} />
            },
            {
              title: 'Disbursement & Print',
              description: 'Pith Receipt Voucher',
              icon: <CheckCircleOutlined style={{ color: "#10b981" }} />
            }
          ]}
        />
      </Card>

      {/* Recent Activity Section */}
      <Card 
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 800, color: "#0f172a", fontSize: "1rem" }}>Recent Requisition Activity</span>
            <Badge count={requests.length} style={{ backgroundColor: "#f1f5f9", color: "#475569", fontWeight: 700 }} />
          </div>
        }
        extra={
          <Button 
            type="link" 
            onClick={() => navigate("/requests")} 
            style={{ fontWeight: 700, color: "#10b981", padding: 0 }}
          >
            View All Records <ArrowRightOutlined />
          </Button>
        }
        bordered={true}
        style={{ borderRadius: 16, background: "#ffffff" }}
        styles={{ body: { padding: isMobile ? 12 : 20 } }}
      >
        {isMobile ? (
          /* Mobile Card List View */
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {requests.slice(0, 5).map((req) => (
              <div
                key={req.id}
                onClick={() => navigate(`/requests/${req.id}`)}
                className="mobile-record-card touch-press"
                style={{
                  background: "#ffffff",
                  borderRadius: 12,
                  padding: "14px",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 800, color: "#6366f1", fontSize: "0.9rem" }}>
                    #{req.requestNo}
                  </span>
                  {getStatusBadge(req.status)}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.85rem" }}>
                      {req.vehicleNo}
                    </div>
                    <div style={{ color: "#64748b", fontSize: "0.75rem" }}>
                      {req.supplier} • <Tag style={{ margin: 0, fontSize: "0.7rem" }}>{req.commodity}</Tag>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800, color: "#10b981", fontSize: "0.95rem" }}>
                      {req.netWeight ? `${req.netWeight.toLocaleString()} kg` : "-"}
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: "0.7rem" }}>
                      Net Weight
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {requests.length === 0 && !loading && (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8" }}>
                No requisitions recorded yet.
              </div>
            )}
          </div>
        ) : (
          /* Desktop Table View */
          <Table 
            columns={columns} 
            dataSource={requests.slice(0, 5)} 
            rowKey="id" 
            pagination={false}
            loading={loading}
            scroll={{ x: 700 }}
          />
        )}
      </Card>
    </div>
  );
}
